"""Import AmarPet.com product catalog into Kedi Smart Pet & Animal shop."""

import json
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from api.utils import slugify
from shop.models import (
    Product,
    ProductApprovalStatus,
    ProductCatalog,
    ProductCategory,
    ProductImage,
    ProductSourceType,
    ProductStatus,
    ProductVariant,
)
from shop.services.amarpet_scraper import (
    extract_brand,
    extract_category_name,
    extract_category_slug,
    extract_image_urls,
    extract_prices,
    extract_stock,
    fetch_catalog,
)

CACHE_PATH = Path(__file__).resolve().parents[3] / "data" / "amarpet_products.json"


class Command(BaseCommand):
    help = "Import real AmarPet catalog into the Pet & Animal shop (replaces generic demo products)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--replace",
            action="store_true",
            help="Delete existing platform pet_animal products before importing.",
        )
        parser.add_argument(
            "--fetch-only",
            action="store_true",
            help="Only fetch from amarpet.com and save JSON cache.",
        )
        parser.add_argument(
            "--from-cache",
            action="store_true",
            help="Import from cached JSON instead of fetching live.",
        )

    def handle(self, *args, **options):
        if options["from_cache"]:
            if not CACHE_PATH.exists():
                self.stderr.write(self.style.ERROR(f"Cache not found: {CACHE_PATH}"))
                return
            with CACHE_PATH.open(encoding="utf-8") as f:
                raw = json.load(f)
            products = raw.get("products") or raw
            self.stdout.write(self.style.WARNING(f"Loaded {len(products)} products from cache"))
        else:
            products = fetch_catalog(progress=self.stdout.write)
            CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
            with CACHE_PATH.open("w", encoding="utf-8") as f:
                json.dump({"products": products}, f, ensure_ascii=False, indent=2)
            self.stdout.write(self.style.SUCCESS(f"Saved cache to {CACHE_PATH}"))

        if options["fetch_only"]:
            return

        if options["replace"]:
            deleted = self._clear_platform_pet_products()
            self.stdout.write(self.style.WARNING(f"Removed {deleted} existing platform pet products"))

        created, updated = self._import_products(products)
        self.stdout.write(
            self.style.SUCCESS(
                f"Import complete: {created} created, {updated} updated "
                f"({created + updated} total in pet catalog)"
            )
        )

    def _clear_platform_pet_products(self) -> int:
        qs = Product.objects.filter(
            catalog=ProductCatalog.PET_ANIMAL,
            source_type__in=(
                ProductSourceType.PLATFORM_OWN,
                ProductSourceType.PLATFORM_BRAND,
            ),
        )
        count = qs.count()
        qs.delete()
        return count

    def _get_or_create_category(self, product_data: dict) -> ProductCategory:
        cat_slug = slugify(extract_category_slug(product_data)) or "pet-supplies"
        cat_name = extract_category_name(product_data).strip() or "Pet Supplies"
        category, _ = ProductCategory.objects.get_or_create(
            slug=cat_slug,
            defaults={
                "name": cat_name,
                "description": f"Imported from AmarPet category: {cat_name}",
                "catalog": ProductCatalog.PET_ANIMAL,
            },
        )
        if category.catalog != ProductCatalog.PET_ANIMAL:
            category.catalog = ProductCatalog.PET_ANIMAL
            category.save(update_fields=["catalog"])
        return category

    @transaction.atomic
    def _import_products(self, products: dict) -> tuple[int, int]:
        created = 0
        updated = 0

        for slug, data in products.items():
            category = self._get_or_create_category(data)
            sale_price, compare_price = extract_prices(data)
            if sale_price <= 0:
                continue

            brand = extract_brand(data)
            title = (data.get("name") or slug).strip()[:255]
            description = (data.get("long_desc") or data.get("desc") or "").strip()
            if not description:
                description = f"{title} — available on Kedi Smart Pet & Animal marketplace."
            if len(description) > 8000:
                description = description[:8000]

            product, is_new = Product.objects.update_or_create(
                slug=slug,
                defaults={
                    "title": title,
                    "description_md": description,
                    "brand": brand[:255] if brand else None,
                    "category": category,
                    "catalog": ProductCatalog.PET_ANIMAL,
                    "source_type": ProductSourceType.PLATFORM_BRAND,
                    "approval_status": ProductApprovalStatus.NOT_REQUIRED,
                    "status": ProductStatus.PUBLISHED,
                },
            )
            if is_new:
                created += 1
            else:
                updated += 1

            amarpet_id = data.get("product_id") or slug
            sku = f"AP-{amarpet_id}"
            stock = extract_stock(data)

            attrs = data.get("attributes") or []
            size = None
            if attrs and isinstance(attrs[0], dict):
                values = attrs[0].get("values") or []
                if values and isinstance(values[0], dict):
                    size = values[0].get("value")

            variant, _ = ProductVariant.objects.update_or_create(
                sku=sku,
                defaults={
                    "product": product,
                    "price": Decimal(str(sale_price)),
                    "compare_at_price": Decimal(str(compare_price)) if compare_price else None,
                    "currency": "BDT",
                    "stock_qty": stock,
                    "size": size,
                    "is_active": True,
                },
            )

            ProductImage.objects.filter(product=product).delete()
            for idx, url in enumerate(extract_image_urls(data)):
                ProductImage.objects.create(product=product, url=url[:500], sort_order=idx)

        return created, updated
