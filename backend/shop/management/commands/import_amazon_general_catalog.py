"""Import Amazon.com bestseller general products (details + images) into General Products."""

from __future__ import annotations

import json
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

from django.conf import settings
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
from shop.services.amazon_scraper import download_image, fetch_catalog

CACHE_PATH = Path(settings.BASE_DIR) / "data" / "amazon_general_products.json"
IMAGE_DIR = Path(settings.MEDIA_ROOT) / "products" / "amazon"

CATEGORY_META = {
    "Electronics": "Gadgets, accessories, and tech bestsellers",
    "Home & Living": "Home essentials and kitchen bestsellers",
    "Health & Beauty": "Personal care and wellness bestsellers",
    "Fashion": "Clothing, shoes, and accessory bestsellers",
    "Sports & Outdoors": "Fitness and outdoor bestsellers",
    "Books & Stationery": "Office and stationery bestsellers",
}


def usd_to_bdt(amount_usd: float | Decimal | None, rate: Decimal) -> Decimal | None:
    if amount_usd is None:
        return None
    bdt = (Decimal(str(amount_usd)) * rate).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    # Round to a shopper-friendly nearest 10 BDT
    return (bdt / Decimal("10")).quantize(Decimal("1"), rounding=ROUND_HALF_UP) * Decimal("10")


class Command(BaseCommand):
    help = (
        "Import ~100 most-moving Amazon.com general products into the General Products "
        "catalog with details, images, and BDT prices."
    )

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=100, help="Max products to import (default 100).")
        parser.add_argument(
            "--usd-to-bdt",
            type=Decimal,
            default=Decimal("122"),
            help="USD→BDT conversion rate (default 122).",
        )
        parser.add_argument(
            "--replace",
            action="store_true",
            help="Delete existing platform general products before importing.",
        )
        parser.add_argument(
            "--fetch-only",
            action="store_true",
            help="Only fetch Amazon data and save JSON cache.",
        )
        parser.add_argument(
            "--from-cache",
            action="store_true",
            help="Import from cached JSON instead of fetching live.",
        )
        parser.add_argument(
            "--skip-images",
            action="store_true",
            help="Keep remote Amazon image URLs instead of downloading locally.",
        )

    def handle(self, *args, **options):
        limit = max(1, min(int(options["limit"]), 200))
        rate: Decimal = options["usd_to_bdt"]

        if options["from_cache"]:
            if not CACHE_PATH.exists():
                self.stderr.write(self.style.ERROR(f"Cache not found: {CACHE_PATH}"))
                return
            products = json.loads(CACHE_PATH.read_text(encoding="utf-8")).get("products") or []
            self.stdout.write(self.style.WARNING(f"Loaded {len(products)} products from cache"))
        else:
            products = fetch_catalog(limit=limit, progress=self.stdout.write)
            CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
            CACHE_PATH.write_text(
                json.dumps(
                    {"usd_to_bdt": str(rate), "count": len(products), "products": products},
                    ensure_ascii=False,
                    indent=2,
                ),
                encoding="utf-8",
            )
            self.stdout.write(self.style.SUCCESS(f"Saved cache -> {CACHE_PATH}"))

        products = products[:limit]
        if options["fetch_only"]:
            with_price = sum(1 for p in products if p.get("price_usd"))
            self.stdout.write(self.style.SUCCESS(f"Fetched {len(products)} products ({with_price} with USD price)"))
            return

        if options["replace"]:
            deleted = self._clear_platform_general_products()
            self.stdout.write(self.style.WARNING(f"Removed {deleted} existing platform general products"))

        created, updated, skipped = self._import_products(
            products,
            rate=rate,
            download_images=not options["skip_images"],
        )
        total = Product.objects.filter(catalog=ProductCatalog.GENERAL).count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Import complete: {created} created, {updated} updated, {skipped} skipped "
                f"({total} general products total). USD→BDT rate={rate}"
            )
        )

    def _clear_platform_general_products(self) -> int:
        qs = Product.objects.filter(
            catalog=ProductCatalog.GENERAL,
            source_type__in=(
                ProductSourceType.PLATFORM_OWN,
                ProductSourceType.PLATFORM_BRAND,
            ),
        )
        count = qs.count()
        qs.delete()
        return count

    def _get_or_create_category(self, name: str) -> ProductCategory:
        cat_name = name if name in CATEGORY_META else "Home & Living"
        slug = slugify(f"general-{cat_name}")
        category, _ = ProductCategory.objects.get_or_create(
            slug=slug,
            defaults={
                "name": cat_name,
                "description": CATEGORY_META.get(cat_name, "Imported from Amazon bestsellers"),
                "catalog": ProductCatalog.GENERAL,
            },
        )
        if category.catalog != ProductCatalog.GENERAL:
            category.catalog = ProductCatalog.GENERAL
            category.save(update_fields=["catalog"])
        return category

    def _resolve_image_url(self, asin: str, remote_url: str | None, download: bool) -> str | None:
        if not remote_url:
            return None
        if not download:
            return remote_url[:500]

        ext = ".jpg"
        lower = remote_url.lower()
        if ".png" in lower:
            ext = ".png"
        elif ".webp" in lower:
            ext = ".webp"
        dest = IMAGE_DIR / f"{asin}{ext}"
        if dest.exists() or download_image(remote_url, dest):
            return f"/uploads/products/amazon/{asin}{ext}"
        return remote_url[:500]

    @transaction.atomic
    def _import_products(
        self,
        products: list[dict],
        *,
        rate: Decimal,
        download_images: bool,
    ) -> tuple[int, int, int]:
        created = 0
        updated = 0
        skipped = 0

        for data in products:
            asin = (data.get("asin") or "").strip().upper()
            title = (data.get("title") or "").strip()
            if not asin or not title:
                skipped += 1
                continue

            price_bdt = usd_to_bdt(data.get("price_usd"), rate)
            if not price_bdt or price_bdt <= 0:
                skipped += 1
                continue

            category = self._get_or_create_category(data.get("category") or "Home & Living")
            slug = f"amz-{asin.lower()}"
            description = (data.get("description") or title).strip()
            if len(description) > 8000:
                description = description[:8000]
            brand = (data.get("brand") or "Amazon")[:255]

            compare_usd = data.get("price_usd")
            compare_bdt = None
            if compare_usd:
                # Soft list price ~15% above sale, Amazon-style strike-through
                compare_bdt = usd_to_bdt(Decimal(str(compare_usd)) * Decimal("1.15"), rate)
                if compare_bdt and compare_bdt <= price_bdt:
                    compare_bdt = None

            # Prefer ASIN slug; migrate older title-based slugs if present.
            product = Product.objects.filter(slug=slug).first()
            if product is None:
                product = (
                    Product.objects.filter(
                        catalog=ProductCatalog.GENERAL,
                        slug__startswith=f"amz-{asin.lower()}-",
                    )
                    .order_by("id")
                    .first()
                )
            is_new = product is None
            if is_new:
                product = Product(slug=slug)
            else:
                product.slug = slug
            product.title = title[:255]
            product.description_md = description
            product.brand = brand
            product.category = category
            product.catalog = ProductCatalog.GENERAL
            product.source_type = ProductSourceType.PLATFORM_BRAND
            product.approval_status = ProductApprovalStatus.NOT_REQUIRED
            product.status = ProductStatus.PUBLISHED
            product.is_featured = False
            product.save()
            if is_new:
                created += 1
            else:
                updated += 1

            ProductVariant.objects.update_or_create(
                sku=f"AMZ-{asin}",
                defaults={
                    "product": product,
                    "price": price_bdt,
                    "compare_at_price": compare_bdt,
                    "currency": "BDT",
                    "stock_qty": 50,
                    "is_active": True,
                },
            )

            image_url = self._resolve_image_url(asin, data.get("image"), download_images)
            ProductImage.objects.filter(product=product).delete()
            if image_url:
                ProductImage.objects.create(product=product, url=image_url, sort_order=0)

            self.stdout.write(f"  {'NEW' if is_new else 'UPD'} {asin} — {title[:60]} — BDT {price_bdt}")

        return created, updated, skipped
