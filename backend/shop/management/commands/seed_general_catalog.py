"""Add general-product categories and sample SKUs with real product photos."""
from decimal import Decimal

from django.core.management.base import BaseCommand

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

GENERAL_CATEGORIES = [
    ("Home & Living", "Home essentials and décor"),
    ("Electronics", "Gadgets, accessories, and tech"),
    ("Fashion", "Clothing, bags, and accessories"),
    ("Health & Beauty", "Personal care and wellness"),
    ("Sports & Outdoors", "Fitness and outdoor gear"),
    ("Books & Stationery", "Books, office, and school supplies"),
]

GENERAL_PRODUCTS = [
    {
        "title": "Wireless Bluetooth Earbuds",
        "description": "True wireless earbuds with active noise cancellation and 24-hour battery case.",
        "brand": "SoundMax",
        "category": "Electronics",
        "price": "2499.00",
        "compare": "2999.00",
        "image": "/samples/earbuds.jpg",
    },
    {
        "title": "Organic Cotton T-Shirt",
        "description": "Soft unisex everyday tee made from 100% organic cotton.",
        "brand": "Kedi Life",
        "category": "Fashion",
        "price": "899.00",
        "compare": None,
        "image": "/samples/tshirt.jpg",
    },
    {
        "title": "Stainless Steel Water Bottle",
        "description": "1L double-wall insulated bottle — keeps drinks cold 24h or hot 12h.",
        "brand": "HydroGo",
        "category": "Sports & Outdoors",
        "price": "650.00",
        "compare": None,
        "image": "/samples/bottle.jpg",
    },
    {
        "title": "LED Desk Lamp",
        "description": "Adjustable warm/cool light with USB charging port and touch dimmer.",
        "brand": "BrightHome",
        "category": "Home & Living",
        "price": "1200.00",
        "compare": "1500.00",
        "image": "/samples/lamp.jpg",
    },
    {
        "title": "Vitamin C Serum",
        "description": "Brightening daily skincare serum with 15% vitamin C — 30ml bottle.",
        "brand": "GlowCare",
        "category": "Health & Beauty",
        "price": "750.00",
        "compare": None,
        "image": "/samples/serum.jpg",
    },
    {
        "title": "Wireless Computer Mouse",
        "description": "Ergonomic silent-click mouse with 2.4GHz receiver and long battery life.",
        "brand": "TechPro",
        "category": "Electronics",
        "price": "1199.00",
        "compare": "1499.00",
        "image": "/samples/mouse.jpg",
    },
    {
        "title": "Canvas Travel Backpack",
        "description": "20L water-resistant daypack with laptop sleeve and multiple pockets.",
        "brand": "UrbanPack",
        "category": "Fashion",
        "price": "1899.00",
        "compare": "2299.00",
        "image": "/samples/backpack.jpg",
    },
    {
        "title": "Running Shoes",
        "description": "Lightweight breathable trainers for daily runs and gym workouts.",
        "brand": "StrideFit",
        "category": "Sports & Outdoors",
        "price": "3200.00",
        "compare": "3999.00",
        "image": "/samples/shoes.jpg",
    },
    {
        "title": "Ceramic Coffee Mug Set",
        "description": "Set of 4 matte-finish mugs — microwave and dishwasher safe.",
        "brand": "HomeNest",
        "category": "Home & Living",
        "price": "980.00",
        "compare": None,
        "image": "/samples/mugs.jpg",
    },
    {
        "title": "Hardcover Notebook Pack",
        "description": "Pack of 3 A5 ruled notebooks with premium 120gsm paper.",
        "brand": "PaperCraft",
        "category": "Books & Stationery",
        "price": "450.00",
        "compare": None,
        "image": "/samples/notebook.jpg",
    },
    {
        "title": "Yoga Mat Premium",
        "description": "6mm non-slip TPE mat with carry strap — ideal for home workouts.",
        "brand": "FlexZone",
        "category": "Sports & Outdoors",
        "price": "1350.00",
        "compare": "1699.00",
        "image": "/samples/yoga.jpg",
    },
    {
        "title": "Moisturizing Face Cream",
        "description": "Daily hydrating cream with hyaluronic acid for all skin types — 50ml.",
        "brand": "GlowCare",
        "category": "Health & Beauty",
        "price": "890.00",
        "compare": "1100.00",
        "image": "/samples/cream.jpg",
    },
    {
        "title": "Minimalist Wall Clock",
        "description": "Silent quartz wall clock with clean Scandinavian design — 30cm diameter.",
        "brand": "BrightHome",
        "category": "Home & Living",
        "price": "799.00",
        "compare": None,
        "image": "/samples/clock.jpg",
    },
    {
        "title": "Classic Denim Jacket",
        "description": "Medium-wash denim jacket with button closure — unisex fit.",
        "brand": "Kedi Life",
        "category": "Fashion",
        "price": "2499.00",
        "compare": "2999.00",
        "image": "/samples/denim.jpg",
    },
    {
        "title": "Portable Bluetooth Speaker",
        "description": "Compact waterproof speaker with 360° sound and 12-hour playtime.",
        "brand": "SoundMax",
        "category": "Electronics",
        "price": "1799.00",
        "compare": "2199.00",
        "image": "/samples/speaker.jpg",
    },
    {
        "title": "Ballpoint Pen Set",
        "description": "Smooth-writing gel pens in assorted colors — pack of 10.",
        "brand": "PaperCraft",
        "category": "Books & Stationery",
        "price": "299.00",
        "compare": None,
        "image": "/samples/pens.jpg",
    },
]


class Command(BaseCommand):
    help = "Seed general-product catalog with categories, SKUs, and real product photos."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Replace product images even when products already exist.",
        )

    def handle(self, *args, **options):
        force = options["force"]
        created_products = 0
        updated_images = 0

        cats = {}
        for name, desc in GENERAL_CATEGORIES:
            slug = slugify(f"general-{name}")
            cat, _ = ProductCategory.objects.get_or_create(
                slug=slug,
                defaults={"name": name, "description": desc, "catalog": ProductCatalog.GENERAL},
            )
            if cat.catalog != ProductCatalog.GENERAL:
                cat.catalog = ProductCatalog.GENERAL
                cat.save(update_fields=["catalog"])
            cats[name] = cat

        for item in GENERAL_PRODUCTS:
            slug = slugify(item["title"])
            product, created = Product.objects.get_or_create(
                slug=slug,
                defaults={
                    "category": cats[item["category"]],
                    "title": item["title"],
                    "description_md": item["description"],
                    "brand": item["brand"],
                    "catalog": ProductCatalog.GENERAL,
                    "source_type": ProductSourceType.PLATFORM_OWN,
                    "approval_status": ProductApprovalStatus.NOT_REQUIRED,
                    "status": ProductStatus.PUBLISHED,
                },
            )
            if created:
                created_products += 1
                ProductVariant.objects.create(
                    product=product,
                    sku=f"GEN-{product.id:04d}",
                    price=Decimal(item["price"]),
                    compare_at_price=Decimal(item["compare"]) if item["compare"] else None,
                    currency="BDT",
                    stock_qty=100,
                    is_active=True,
                )
            elif product.catalog != ProductCatalog.GENERAL:
                product.catalog = ProductCatalog.GENERAL
                product.status = ProductStatus.PUBLISHED
                product.save(update_fields=["catalog", "status"])

            has_image = ProductImage.objects.filter(product=product).exists()
            if force or not has_image:
                ProductImage.objects.filter(product=product).delete()
                ProductImage.objects.create(product=product, url=item["image"], sort_order=0)
                updated_images += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"General catalog ready — {created_products} new products, "
                f"{updated_images} with photos "
                f"({Product.objects.filter(catalog=ProductCatalog.GENERAL).count()} total)."
            )
        )
