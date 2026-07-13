"""Add pet & animal catalog categories and sample products."""
from decimal import Decimal

from django.core.management.base import BaseCommand

from api.utils import slugify
from shop.models import (
    Product,
    ProductApprovalStatus,
    ProductCatalog,
    ProductCategory,
    ProductSourceType,
    ProductStatus,
    ProductVariant,
)


class Command(BaseCommand):
    help = "Ensure pet & animal catalog categories and demo products exist."

    def handle(self, *args, **options):
        if Product.objects.filter(catalog=ProductCatalog.PET_ANIMAL).exists():
            self.stdout.write(self.style.WARNING("Pet catalog products already exist. Skipping."))
            return

        pet_categories = [
            ("Pet Food", "Dry, wet, and specialty nutrition"),
            ("Toys & Play", "Interactive toys and enrichment"),
            ("Accessories", "Collars, leashes, and gear"),
            ("Grooming", "Shampoos, brushes, and care"),
            ("Health & Wellness", "Supplements and health products"),
        ]

        cats = {}
        for name, desc in pet_categories:
            slug = slugify(name)
            cat, _ = ProductCategory.objects.get_or_create(
                slug=slug,
                defaults={"name": name, "description": desc, "catalog": ProductCatalog.PET_ANIMAL},
            )
            if cat.catalog != ProductCatalog.PET_ANIMAL:
                cat.catalog = ProductCatalog.PET_ANIMAL
                cat.save(update_fields=["catalog"])
            cats[name] = cat

        samples = [
            ("Premium Cat Food - Dry", "High-quality dry cat food with real meat", "PetDelight", "Pet Food", "1500.00", "1800.00"),
            ("Premium Dog Food - Large Breed", "Nutritionally balanced for large dogs", "PetDelight", "Pet Food", "2500.00", "3000.00"),
            ("Interactive Cat Toy Ball", "Self-rolling ball with catnip", "PlayPaws", "Toys & Play", "350.00", None),
            ("Leather Dog Collar", "Genuine leather adjustable collar", "StylePet", "Accessories", "800.00", "1000.00"),
            ("Pet Shampoo - Hypoallergenic", "Gentle formula for sensitive skin", "GroomPro", "Grooming", "450.00", None),
            ("Royal Canin Adult Cat Food", "Authorized world brand stocked by Kedi Smart", "Royal Canin", "Pet Food", "2200.00", "2500.00"),
            ("NFC Smart Pet Tag", "QR + NFC tag links to your pet profile", "Kedi Smart", "Accessories", "599.00", None),
            ("Cat Scratching Post Tower", "Multi-level sisal scratching post", "PlayPaws", "Toys & Play", "1899.00", "2200.00"),
        ]

        for title, desc, brand, cat_name, price, compare in samples:
            product = Product.objects.create(
                category=cats[cat_name],
                slug=slugify(title),
                title=title,
                description_md=desc,
                brand=brand,
                catalog=ProductCatalog.PET_ANIMAL,
                source_type=ProductSourceType.PLATFORM_OWN,
                approval_status=ProductApprovalStatus.NOT_REQUIRED,
                status=ProductStatus.PUBLISHED,
            )
            ProductVariant.objects.create(
                product=product,
                sku=f"PET-{product.id:04d}",
                price=Decimal(price),
                compare_at_price=Decimal(compare) if compare else None,
                currency="BDT",
                stock_qty=100,
                is_active=True,
            )

        self.stdout.write(self.style.SUCCESS(f"Pet catalog seeded with {len(samples)} products."))
