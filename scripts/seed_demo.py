"""
Seed script for demo data
Run from backend directory: python ../scripts/seed_demo.py
"""
import os
import sys
from datetime import date, datetime
from decimal import Decimal

backend_dir = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, backend_dir)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from accounts.models import User, UserProfile, UserRole, VendorProfile, VendorTier
from api.security import get_password_hash
from api.utils import slugify
from content.models import AnimalCategory, ContentStatus, ContentTopic
from marketplace.models import ListingStatus, ListingType, PetListing
from nfc.models import NFCTag, TagStatus
from pets.models import Pet, PetGender, PetPrivacySetting, PetSpecies
from shop.models import (
    Product,
    ProductApprovalStatus,
    ProductCatalog,
    ProductCategory,
    ProductSourceType,
    ProductStatus,
    ProductVariant,
)
from shop.services.commission import seed_default_commission_plans
from vets.models import VetProfile


def seed():
    if User.objects.filter(email="admin@kedismart.com").exists():
        print("Demo data already exists. Skipping seed.")
        return

    print("Seeding demo data...")
    seed_default_commission_plans()
    from shop.models import CommissionPlan

    default_plan = CommissionPlan.objects.filter(is_default=True).first()

    admin = User.objects.create(
        email="admin@kedismart.com",
        password_hash=get_password_hash("admin123"),
        role=UserRole.SUPER_ADMIN,
        is_active=True,
        is_verified=True,
        is_staff=True,
        is_superuser=True,
    )
    UserProfile.objects.create(user=admin, full_name="Admin User")

    vet = User.objects.create(
        email="vet@kedismart.com",
        password_hash=get_password_hash("vet123"),
        role=UserRole.VET,
        is_active=True,
        is_verified=True,
    )
    UserProfile.objects.create(user=vet, full_name="Dr. Sarah Johnson", city="Dhaka", country="Bangladesh")
    VetProfile.objects.create(
        user=vet,
        clinic_name="Paws & Claws Veterinary Clinic",
        specialties=["General Practice", "Surgery"],
        years_experience=10,
        address="123 Pet Care Road",
        city="Dhaka",
        country="Bangladesh",
        online_consultation_enabled=True,
        verification_status="approved",
    )

    vendor = User.objects.create(
        email="vendor@kedismart.com",
        password_hash=get_password_hash("vendor123"),
        role=UserRole.VENDOR,
        is_active=True,
        is_verified=True,
    )
    UserProfile.objects.create(user=vendor, full_name="Vendor User", city="Dhaka", country="Bangladesh")
    VendorProfile.objects.create(
        user=vendor,
        shop_name="Paws & Supplies BD",
        shop_slug="paws-supplies-bd",
        description="Trusted pet supplies vendor on Kedi Smart",
        tier=VendorTier.FREE,
        commission_plan=default_plan,
        is_active=True,
        is_approved=True,
    )

    owner = User.objects.create(
        email="owner@kedismart.com",
        password_hash=get_password_hash("owner123"),
        role=UserRole.OWNER,
        is_active=True,
        is_verified=True,
    )
    UserProfile.objects.create(user=owner, full_name="Pet Owner", city="Dhaka", country="Bangladesh")

    pet = Pet.objects.create(
        owner=owner,
        name="Whiskers",
        species=PetSpecies.CAT,
        breed="Persian",
        color_markings="White with orange patches",
        dob=date(2020, 5, 15),
        gender=PetGender.MALE,
        weight_kg=4.5,
        spayed_neutered=True,
        temperament="Friendly and playful",
    )
    PetPrivacySetting.objects.create(
        pet=pet,
        public_fields={"name": True, "species": True, "breed": True},
        allow_call=False,
        allow_whatsapp=True,
        allow_chat=True,
        show_city_only=True,
    )

    NFCTag.objects.create(
        tag_uid="DEMO-TAG-001",
        nfc_url="https://kedismart.com/scan/DEMO-TAG-001",
        qr_url="https://kedismart.com/scan/DEMO-TAG-001",
        status=TagStatus.AVAILABLE,
    )

    cat_category = AnimalCategory.objects.create(slug=slugify("Cats"), name="Cats")
    AnimalCategory.objects.create(slug=slugify("Dogs"), name="Dogs")
    ContentTopic.objects.create(
        category=cat_category,
        slug=slugify("Cat Nutrition Guide"),
        title="Cat Nutrition Guide",
        excerpt="Learn about proper nutrition for your feline friend",
        body_md="# Cat Nutrition\n\nProper nutrition is essential for your cat's health...",
        vet_verified=True,
        status=ContentStatus.PUBLISHED,
        published_at=datetime.utcnow(),
    )

    pet_categories_data = [
        ("Pet Food", "Premium and nutritious food for all pets"),
        ("Toys & Play", "Interactive toys and playtime essentials"),
        ("Accessories", "Collars, leashes, and pet accessories"),
        ("Grooming", "Shampoos, brushes, and grooming supplies"),
        ("Health & Medicine", "Vitamins, supplements, and medications"),
        ("Beds & Comfort", "Beds, blankets, and comfort items"),
        ("Litter & Waste", "Litter boxes, waste bags, and cleanup"),
        ("Training", "Training aids and behavioral products"),
        ("Travel & Carriers", "Carriers, travel bowls, and travel accessories"),
        ("Feeding", "Bowls, feeders, and feeding accessories"),
    ]

    general_categories_data = [
        ("Home & Living", "Home essentials and décor"),
        ("Electronics", "Gadgets, accessories, and tech"),
        ("Fashion", "Clothing, bags, and accessories"),
        ("Health & Beauty", "Personal care and wellness"),
        ("Sports & Outdoors", "Fitness and outdoor gear"),
        ("Books & Stationery", "Books, office, and school supplies"),
    ]

    categories = {}
    for name, desc in pet_categories_data:
        categories[name] = ProductCategory.objects.create(
            slug=slugify(name),
            name=name,
            description=desc,
            catalog=ProductCatalog.PET_ANIMAL,
        )

    for name, desc in general_categories_data:
        key = f"general:{name}"
        categories[key] = ProductCategory.objects.create(
            slug=slugify(f"general-{name}"),
            name=name,
            description=desc,
            catalog=ProductCatalog.GENERAL,
        )

    pet_products_data = [
        ("Premium Cat Food - Dry", "High-quality dry cat food with real meat", "PetDelight", "Pet Food", Decimal("1500.00"), Decimal("1800.00")),
        ("Premium Dog Food - Large Breed", "Nutritionally balanced for large dogs", "PetDelight", "Pet Food", Decimal("2500.00"), Decimal("3000.00")),
        ("Interactive Cat Toy Ball", "Self-rolling ball with catnip", "PlayPaws", "Toys & Play", Decimal("350.00"), None),
        ("Leather Dog Collar", "Genuine leather adjustable collar", "StylePet", "Accessories", Decimal("800.00"), Decimal("1000.00")),
        ("Pet Shampoo - Hypoallergenic", "Gentle formula for sensitive skin", "GroomPro", "Grooming", Decimal("450.00"), None),
    ]

    general_products_data = [
        ("Wireless Bluetooth Earbuds", "Noise-cancelling earbuds for everyday use", "SoundMax", "general:Electronics", Decimal("2499.00"), Decimal("2999.00")),
        ("Organic Cotton T-Shirt", "Soft unisex everyday tee", "Kedi Life", "general:Fashion", Decimal("899.00"), None),
        ("Stainless Steel Water Bottle", "1L insulated bottle", "HydroGo", "general:Sports & Outdoors", Decimal("650.00"), None),
        ("LED Desk Lamp", "Adjustable warm/cool light", "BrightHome", "general:Home & Living", Decimal("1200.00"), Decimal("1500.00")),
        ("Vitamin C Serum", "Daily skincare serum 30ml", "GlowCare", "general:Health & Beauty", Decimal("750.00"), None),
    ]

    for title, desc, brand, cat_name, price, compare_price in pet_products_data:
        cat = categories.get(cat_name, categories["Pet Food"])
        product = Product.objects.create(
            category=cat,
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
            sku=f"SKU-{product.id:04d}",
            price=price,
            compare_at_price=compare_price,
            currency="BDT",
            stock_qty=100,
            is_active=True,
        )

    for title, desc, brand, cat_name, price, compare_price in general_products_data:
        cat = categories[cat_name]
        product = Product.objects.create(
            category=cat,
            slug=slugify(title),
            title=title,
            description_md=desc,
            brand=brand,
            catalog=ProductCatalog.GENERAL,
            source_type=ProductSourceType.PLATFORM_OWN,
            approval_status=ProductApprovalStatus.NOT_REQUIRED,
            status=ProductStatus.PUBLISHED,
        )
        ProductVariant.objects.create(
            product=product,
            sku=f"GEN-{product.id:04d}",
            price=price,
            compare_at_price=compare_price,
            currency="BDT",
            stock_qty=100,
            is_active=True,
        )

    vendor_product = Product.objects.create(
        vendor=vendor,
        category=categories["Accessories"],
        slug=slugify("Vendor Handmade Pet Bandana"),
        title="Vendor Handmade Pet Bandana",
        description_md="Handcrafted bandana from marketplace vendor Paws & Supplies BD",
        brand="Paws & Supplies",
        catalog=ProductCatalog.PET_ANIMAL,
        source_type=ProductSourceType.VENDOR,
        approval_status=ProductApprovalStatus.APPROVED,
        status=ProductStatus.PUBLISHED,
    )
    ProductVariant.objects.create(
        product=vendor_product,
        sku="VND-0001",
        price=Decimal("299.00"),
        currency="BDT",
        stock_qty=50,
        is_active=True,
    )

    royal = Product.objects.create(
        category=categories["Pet Food"],
        slug=slugify("Royal Canin Adult Cat Food"),
        title="Royal Canin Adult Cat Food",
        description_md="Authorized world brand stocked by Kedi Smart",
        brand="Royal Canin",
        catalog=ProductCatalog.PET_ANIMAL,
        source_type=ProductSourceType.PLATFORM_BRAND,
        approval_status=ProductApprovalStatus.NOT_REQUIRED,
        status=ProductStatus.PUBLISHED,
    )
    ProductVariant.objects.create(
        product=royal,
        sku="RC-0001",
        price=Decimal("2200.00"),
        compare_at_price=Decimal("2500.00"),
        currency="BDT",
        stock_qty=80,
        is_active=True,
    )

    general_vendor_product = Product.objects.create(
        vendor=vendor,
        category=categories["general:Electronics"],
        slug=slugify("Vendor USB-C Charging Cable 2m"),
        title="Vendor USB-C Charging Cable 2m",
        description_md="Fast-charge cable from marketplace vendor",
        brand="Paws & Supplies",
        catalog=ProductCatalog.GENERAL,
        source_type=ProductSourceType.VENDOR,
        approval_status=ProductApprovalStatus.APPROVED,
        status=ProductStatus.PUBLISHED,
    )
    ProductVariant.objects.create(
        product=general_vendor_product,
        sku="VND-GEN-001",
        price=Decimal("399.00"),
        currency="BDT",
        stock_qty=120,
        is_active=True,
    )

    PetListing.objects.create(
        seller=owner,
        species="Cat",
        breed="Persian",
        age_text="2 years",
        gender="Male",
        location_text="Dhaka, Bangladesh",
        price=Decimal("5000.00"),
        currency="BDT",
        type=ListingType.ADOPTION,
        description_md="Looking for a loving home for this beautiful cat",
        status=ListingStatus.PUBLISHED,
    )

    print("Demo data seeded successfully!")
    print("\nDemo credentials:")
    print("  Admin: admin@kedismart.com / admin123")
    print("  Vet: vet@kedismart.com / vet123")
    print("  Vendor: vendor@kedismart.com / vendor123")
    print("  Owner: owner@kedismart.com / owner123")
    print("\nNFC Tag UID: DEMO-TAG-001")


if __name__ == "__main__":
    seed()
