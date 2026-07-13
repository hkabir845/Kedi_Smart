"""
Comprehensive Product Seed Script
Populates database with extensive product catalog in BDT
Run from backend directory: python ../scripts/seed_comprehensive_products.py
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.db.session import SessionLocal
from app.models.ecommerce import ProductCategory, Product, ProductVariant, ProductStatus
from app.utils.slug import slugify
from decimal import Decimal
import random

db = SessionLocal()

def seed_comprehensive_products():
    print("Seeding comprehensive product catalog in BDT...")
    
    # Get or create categories
    categories_data = [
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
    
    categories = {}
    for name, desc in categories_data:
        cat = db.query(ProductCategory).filter(ProductCategory.slug == slugify(name)).first()
        if not cat:
            cat = ProductCategory(slug=slugify(name), name=name, description=desc)
            db.add(cat)
            db.flush()
        categories[name] = cat
    
    # Comprehensive Products Database
    products_catalog = [
        # ========== PET FOOD ==========
        ("Premium Dry Cat Food - Chicken", "High-quality dry cat food with real chicken, 2kg", "PetDelight", "Pet Food", Decimal("1200.00"), Decimal("1500.00"), "2kg"),
        ("Premium Dry Cat Food - Fish", "Nutritious dry cat food with fish, 2kg", "PetDelight", "Pet Food", Decimal("1200.00"), Decimal("1500.00"), "2kg"),
        ("Premium Dry Cat Food - Lamb", "Gourmet dry cat food with lamb, 2kg", "PetDelight", "Pet Food", Decimal("1350.00"), Decimal("1600.00"), "2kg"),
        ("Premium Dry Cat Food - 5kg", "Large pack premium cat food, 5kg", "PetDelight", "Pet Food", Decimal("2800.00"), Decimal("3500.00"), "5kg"),
        ("Grain-Free Cat Food", "Natural grain-free formula for sensitive cats, 1.5kg", "NaturePet", "Pet Food", Decimal("1800.00"), Decimal("2200.00"), "1.5kg"),
        ("Kitten Food - Premium", "Complete nutrition for growing kittens, 2kg", "PetDelight", "Pet Food", Decimal("1400.00"), Decimal("1700.00"), "2kg"),
        ("Senior Cat Food", "Specially formulated for senior cats, 2kg", "VetCare", "Pet Food", Decimal("1300.00"), Decimal("1600.00"), "2kg"),
        ("Indoor Cat Formula", "Low-calorie formula for indoor cats, 2kg", "PetDelight", "Pet Food", Decimal("1250.00"), Decimal("1500.00"), "2kg"),
        ("Weight Management Cat Food", "Helps maintain healthy weight, 2kg", "VetCare", "Pet Food", Decimal("1400.00"), Decimal("1700.00"), "2kg"),
        ("Hairball Control Cat Food", "Reduces hairball formation, 2kg", "PetDelight", "Pet Food", Decimal("1350.00"), Decimal("1650.00"), "2kg"),
        
        ("Premium Dry Dog Food - Chicken", "Complete nutrition for adult dogs, 3kg", "PetDelight", "Pet Food", Decimal("1800.00"), Decimal("2200.00"), "3kg"),
        ("Premium Dry Dog Food - Beef", "High-protein beef formula, 3kg", "PetDelight", "Pet Food", Decimal("1900.00"), Decimal("2300.00"), "3kg"),
        ("Premium Dry Dog Food - Lamb & Rice", "Gentle formula with lamb and rice, 3kg", "PetDelight", "Pet Food", Decimal("1850.00"), Decimal("2250.00"), "3kg"),
        ("Large Breed Dog Food", "Nutritionally balanced for large breeds, 5kg", "PetDelight", "Pet Food", Decimal("2800.00"), Decimal("3500.00"), "5kg"),
        ("Small Breed Dog Food", "Specially sized kibble for small breeds, 2kg", "PetDelight", "Pet Food", Decimal("1600.00"), Decimal("2000.00"), "2kg"),
        ("Puppy Food - Premium", "Complete nutrition for growing puppies, 3kg", "PetDelight", "Pet Food", Decimal("2000.00"), Decimal("2400.00"), "3kg"),
        ("Senior Dog Food", "Easy to digest formula for seniors, 3kg", "VetCare", "Pet Food", Decimal("1750.00"), Decimal("2150.00"), "3kg"),
        ("Active Dog Formula", "High-energy formula for active dogs, 3kg", "PetDelight", "Pet Food", Decimal("1900.00"), Decimal("2300.00"), "3kg"),
        ("Grain-Free Dog Food", "Natural grain-free formula, 3kg", "NaturePet", "Pet Food", Decimal("2200.00"), Decimal("2700.00"), "3kg"),
        ("Weight Management Dog Food", "Low-calorie weight control formula, 3kg", "VetCare", "Pet Food", Decimal("1800.00"), Decimal("2200.00"), "3kg"),
        ("Dental Care Dog Food", "Promotes dental health, 3kg", "VetCare", "Pet Food", Decimal("1850.00"), Decimal("2250.00"), "3kg"),
        ("Sensitive Stomach Dog Food", "Easy to digest formula, 3kg", "VetCare", "Pet Food", Decimal("1950.00"), Decimal("2350.00"), "3kg"),
        ("Premium Dog Food - 10kg", "Economy large pack, 10kg", "PetDelight", "Pet Food", Decimal("5200.00"), Decimal("6500.00"), "10kg"),
        ("Puppy Wet Food Cans", "Premium wet food for puppies, 12 cans", "PetDelight", "Pet Food", Decimal("1200.00"), Decimal("1500.00"), "12x400g"),
        ("Adult Dog Wet Food Cans", "Premium wet food for adult dogs, 12 cans", "PetDelight", "Pet Food", Decimal("1400.00"), Decimal("1700.00"), "12x400g"),
        
        ("Bird Seed Mix - Premium", "Premium seed mix for all bird species, 1kg", "FeatherFriends", "Pet Food", Decimal("450.00"), Decimal("550.00"), "1kg"),
        ("Canary Seed Mix", "Specialized mix for canaries, 500g", "FeatherFriends", "Pet Food", Decimal("300.00"), Decimal("400.00"), "500g"),
        ("Parrot Food Pellets", "Complete nutrition pellets for parrots, 1kg", "FeatherFriends", "Pet Food", Decimal("600.00"), Decimal("750.00"), "1kg"),
        ("Bird Treats", "Delicious treats for birds, 200g", "FeatherFriends", "Pet Food", Decimal("250.00"), None, "200g"),
        
        ("Fish Food Flakes", "Complete nutrition for tropical fish, 100g", "AquaLife", "Pet Food", Decimal("200.00"), Decimal("250.00"), "100g"),
        ("Fish Food Pellets", "Premium pellets for larger fish, 200g", "AquaLife", "Pet Food", Decimal("350.00"), Decimal("450.00"), "200g"),
        ("Betta Fish Food", "Specialized food for betta fish, 50g", "AquaLife", "Pet Food", Decimal("180.00"), Decimal("220.00"), "50g"),
        ("Goldfish Food", "Complete nutrition for goldfish, 100g", "AquaLife", "Pet Food", Decimal("220.00"), Decimal("280.00"), "100g"),
        
        ("Rabbit Pellets", "High-fiber pellets for rabbits, 2kg", "BunnyBest", "Pet Food", Decimal("550.00"), Decimal("700.00"), "2kg"),
        ("Rabbit Hay", "Premium timothy hay for rabbits, 1kg", "BunnyBest", "Pet Food", Decimal("400.00"), Decimal("500.00"), "1kg"),
        ("Guinea Pig Food", "Complete nutrition for guinea pigs, 1kg", "BunnyBest", "Pet Food", Decimal("450.00"), Decimal("550.00"), "1kg"),
        ("Hamster Food Mix", "Nutritional mix for hamsters, 500g", "BunnyBest", "Pet Food", Decimal("300.00"), Decimal("380.00"), "500g"),
        
        # ========== TOYS & PLAY ==========
        ("Interactive Cat Toy Ball", "Self-rolling ball with catnip", "PlayPaws", "Toys & Play", Decimal("350.00"), Decimal("450.00"), None),
        ("Feather Wand Cat Toy", "Interactive wand with colorful feathers", "PlayPaws", "Toys & Play", Decimal("250.00"), Decimal("320.00"), None),
        ("Cat Laser Pointer", "Red laser pointer for interactive play", "PlayPaws", "Toys & Play", Decimal("450.00"), Decimal("550.00"), None),
        ("Catnip Toys Set", "Set of 3 catnip-filled toys", "PlayPaws", "Toys & Play", Decimal("550.00"), Decimal("700.00"), "Set of 3"),
        ("Cat Scratching Post", "Multi-level scratching post with toys", "ComfortPets", "Toys & Play", Decimal("2800.00"), Decimal("3500.00"), "Multi-level"),
        ("Cat Tree - Large", "Large cat tree with multiple levels", "ComfortPets", "Toys & Play", Decimal("4500.00"), Decimal("5500.00"), "Large"),
        ("Cat Tunnel", "Collapsible play tunnel for cats", "PlayPaws", "Toys & Play", Decimal("1200.00"), Decimal("1500.00"), None),
        ("Puzzle Feeder Cat Toy", "Mental stimulation puzzle feeder", "SmartPet", "Toys & Play", Decimal("850.00"), Decimal("1100.00"), None),
        ("Cat Fishing Rod Toy", "Interactive fishing rod with feather", "PlayPaws", "Toys & Play", Decimal("380.00"), Decimal("480.00"), None),
        
        ("Dog Rope Toy", "Durable rope toy for tug-of-war", "PlayPaws", "Toys & Play", Decimal("450.00"), Decimal("580.00"), None),
        ("Squeaky Dog Toys Set", "Set of 3 squeaky toys", "PlayPaws", "Toys & Play", Decimal("600.00"), Decimal("750.00"), "Set of 3"),
        ("Puzzle Feeder Dog Toy", "Mental stimulation puzzle for dogs", "SmartPet", "Toys & Play", Decimal("1200.00"), Decimal("1500.00"), None),
        ("Tennis Ball Set", "Set of 3 professional tennis balls", "PlayPaws", "Toys & Play", Decimal("350.00"), Decimal("450.00"), "Set of 3"),
        ("Frisbee for Dogs", "Durable flying disc for dogs", "PlayPaws", "Toys & Play", Decimal("550.00"), Decimal("700.00"), None),
        ("Kong Classic Dog Toy", "Durable rubber toy for chewing", "PlayPaws", "Toys & Play", Decimal("850.00"), Decimal("1100.00"), "Large"),
        ("Dog Tug Toy", "Strong tug toy for interactive play", "PlayPaws", "Toys & Play", Decimal("650.00"), Decimal("800.00"), None),
        ("Interactive Dog Puzzle", "Treat-dispensing puzzle toy", "SmartPet", "Toys & Play", Decimal("1400.00"), Decimal("1800.00"), None),
        ("Fetch Ball Launcher", "Automatic ball launcher for dogs", "PlayPaws", "Toys & Play", Decimal("3200.00"), Decimal("4000.00"), None),
        
        ("Bird Play Gym", "Multi-level play gym for birds", "FeatherFriends", "Toys & Play", Decimal("1800.00"), Decimal("2200.00"), None),
        ("Bird Mirror Toy", "Safe mirror toy for birds", "FeatherFriends", "Toys & Play", Decimal("350.00"), Decimal("450.00"), None),
        ("Bird Swing", "Colorful swing for bird cages", "FeatherFriends", "Toys & Play", Decimal("450.00"), Decimal("550.00"), None),
        
        # ========== ACCESSORIES ==========
        ("Leather Dog Collar", "Genuine leather adjustable collar", "StylePet", "Accessories", Decimal("800.00"), Decimal("1000.00"), "Adjustable"),
        ("Nylon Dog Collar", "Durable nylon collar, various colors", "StylePet", "Accessories", Decimal("450.00"), Decimal("580.00"), "Adjustable"),
        ("Dog Collar with Pattern", "Fashionable patterned collar", "StylePet", "Accessories", Decimal("550.00"), Decimal("700.00"), "Adjustable"),
        ("Retractable Dog Leash", "5-meter retractable leash with brake", "StylePet", "Accessories", Decimal("950.00"), Decimal("1200.00"), "5m"),
        ("Nylon Dog Leash", "Durable nylon leash, 1.5m", "StylePet", "Accessories", Decimal("400.00"), Decimal("500.00"), "1.5m"),
        ("Chain Dog Leash", "Strong chain leash for large dogs", "StylePet", "Accessories", Decimal("650.00"), Decimal("800.00"), "1.2m"),
        ("Dog Harness - Medium", "Comfortable harness for medium dogs", "StylePet", "Accessories", Decimal("1200.00"), Decimal("1500.00"), "Medium"),
        ("Dog Harness - Large", "Comfortable harness for large dogs", "StylePet", "Accessories", Decimal("1350.00"), Decimal("1700.00"), "Large"),
        ("Dog ID Tag - Engraved", "Custom engraved ID tag", "StylePet", "Accessories", Decimal("250.00"), Decimal("320.00"), "Engraved"),
        ("Reflective Dog Collar", "High-visibility reflective collar", "StylePet", "Accessories", Decimal("550.00"), Decimal("700.00"), None),
        
        ("Cat Collar with Bell", "Adjustable collar with safety bell", "StylePet", "Accessories", Decimal("300.00"), Decimal("380.00"), "Adjustable"),
        ("Breakaway Cat Collar", "Safety breakaway collar for cats", "StylePet", "Accessories", Decimal("350.00"), Decimal("450.00"), None),
        ("Cat Harness & Leash Set", "Complete harness and leash set", "StylePet", "Accessories", Decimal("950.00"), Decimal("1200.00"), "Set"),
        ("Cat ID Tag", "Small ID tag for cat collar", "StylePet", "Accessories", Decimal("200.00"), Decimal("250.00"), None),
        
        ("Pet Bandana", "Fashionable bandana for pets", "StylePet", "Accessories", Decimal("350.00"), Decimal("450.00"), "One size"),
        ("Pet Bow Tie", "Elegant bow tie for special occasions", "StylePet", "Accessories", Decimal("450.00"), Decimal("580.00"), None),
        ("Pet Raincoat", "Waterproof raincoat for dogs", "StylePet", "Accessories", Decimal("1200.00"), Decimal("1500.00"), "Various sizes"),
        ("Pet Winter Jacket", "Warm winter jacket for small dogs", "StylePet", "Accessories", Decimal("1400.00"), Decimal("1800.00"), "Small"),
        
        # ========== GROOMING ==========
        ("Pet Shampoo - Hypoallergenic", "Gentle formula for sensitive skin, 500ml", "GroomPro", "Grooming", Decimal("450.00"), Decimal("580.00"), "500ml"),
        ("Pet Shampoo - Oatmeal", "Soothing oatmeal formula, 500ml", "GroomPro", "Grooming", Decimal("420.00"), Decimal("550.00"), "500ml"),
        ("Pet Shampoo - Deodorizing", "Fresh scent deodorizing shampoo, 500ml", "GroomPro", "Grooming", Decimal("430.00"), Decimal("560.00"), "500ml"),
        ("Flea & Tick Shampoo", "Medicated flea and tick shampoo, 500ml", "GroomPro", "Grooming", Decimal("550.00"), Decimal("700.00"), "500ml"),
        ("Whitening Pet Shampoo", "Brightens white coats, 500ml", "GroomPro", "Grooming", Decimal("480.00"), Decimal("620.00"), "500ml"),
        ("Conditioner for Pets", "Moisturizing conditioner, 500ml", "GroomPro", "Grooming", Decimal("450.00"), Decimal("580.00"), "500ml"),
        ("Dog Brush Set", "Complete grooming brush set", "GroomPro", "Grooming", Decimal("600.00"), Decimal("750.00"), "Set"),
        ("Slicker Brush", "Professional slicker brush", "GroomPro", "Grooming", Decimal("450.00"), Decimal("580.00"), None),
        ("Undercoat Rake", "Removes loose undercoat", "GroomPro", "Grooming", Decimal("550.00"), Decimal("700.00"), None),
        ("Nail Clippers for Dogs", "Professional-grade nail clippers", "GroomPro", "Grooming", Decimal("350.00"), Decimal("450.00"), None),
        ("Nail Clippers for Cats", "Safe nail clippers for cats", "GroomPro", "Grooming", Decimal("320.00"), Decimal("400.00"), None),
        ("Pet Grooming Wipes", "Convenient cleaning wipes, 80 count", "GroomPro", "Grooming", Decimal("400.00"), Decimal("500.00"), "80 count"),
        ("Ear Cleaning Solution", "Gentle ear cleaning solution, 120ml", "GroomPro", "Grooming", Decimal("380.00"), Decimal("480.00"), "120ml"),
        ("Toothbrush & Paste Set", "Pet dental care set", "GroomPro", "Grooming", Decimal("450.00"), Decimal("580.00"), "Set"),
        ("Deodorizing Spray", "Fresh scent spray for pets, 250ml", "GroomPro", "Grooming", Decimal("380.00"), Decimal("480.00"), "250ml"),
        ("Pet Grooming Gloves", "Massage and grooming gloves", "GroomPro", "Grooming", Decimal("550.00"), Decimal("700.00"), "Pair"),
        ("Deshedding Tool", "Reduces shedding, removes loose hair", "GroomPro", "Grooming", Decimal("650.00"), Decimal("800.00"), None),
        ("Pet Hair Trimmer", "Professional pet hair trimmer", "GroomPro", "Grooming", Decimal("2800.00"), Decimal("3500.00"), None),
        
        # ========== HEALTH & MEDICINE ==========
        ("Multivitamin for Dogs", "Daily multivitamin supplement, 120 tablets", "VetCare", "Health & Medicine", Decimal("850.00"), Decimal("1100.00"), "120 tablets"),
        ("Multivitamin for Cats", "Daily multivitamin supplement, 60 tablets", "VetCare", "Health & Medicine", Decimal("750.00"), Decimal("950.00"), "60 tablets"),
        ("Flea & Tick Treatment", "Monthly flea and tick prevention, 3 doses", "VetCare", "Health & Medicine", Decimal("1200.00"), Decimal("1500.00"), "3 doses"),
        ("Flea Collar for Dogs", "8-month flea and tick protection", "VetCare", "Health & Medicine", Decimal("850.00"), Decimal("1100.00"), "8 months"),
        ("Flea Collar for Cats", "8-month flea and tick protection", "VetCare", "Health & Medicine", Decimal("750.00"), Decimal("950.00"), "8 months"),
        ("Dental Chews for Dogs", "Promotes dental health, 28 pieces", "VetCare", "Health & Medicine", Decimal("550.00"), Decimal("700.00"), "28 pieces"),
        ("Dental Water Additive", "Freshens breath, reduces plaque, 500ml", "VetCare", "Health & Medicine", Decimal("650.00"), Decimal("800.00"), "500ml"),
        ("Probiotic Supplement", "Digestive health support, 60 capsules", "VetCare", "Health & Medicine", Decimal("950.00"), Decimal("1200.00"), "60 capsules"),
        ("Joint Support Tablets", "For senior pets with joint issues, 60 tablets", "VetCare", "Health & Medicine", Decimal("1400.00"), Decimal("1800.00"), "60 tablets"),
        ("Omega-3 Supplement", "Skin and coat health, 120 capsules", "VetCare", "Health & Medicine", Decimal("1100.00"), Decimal("1400.00"), "120 capsules"),
        ("Calming Supplement", "Reduces anxiety and stress, 60 tablets", "VetCare", "Health & Medicine", Decimal("850.00"), Decimal("1100.00"), "60 tablets"),
        ("Eye Care Drops", "Lubricating eye drops for pets, 15ml", "VetCare", "Health & Medicine", Decimal("550.00"), Decimal("700.00"), "15ml"),
        ("Ear Mite Treatment", "Effective ear mite treatment, 15ml", "VetCare", "Health & Medicine", Decimal("650.00"), Decimal("800.00"), "15ml"),
        ("Wound Care Spray", "Antiseptic wound care spray, 100ml", "VetCare", "Health & Medicine", Decimal("450.00"), Decimal("580.00"), "100ml"),
        ("First Aid Kit for Pets", "Comprehensive first aid kit", "VetCare", "Health & Medicine", Decimal("1800.00"), Decimal("2200.00"), "Kit"),
        ("Thermometer for Pets", "Digital pet thermometer", "VetCare", "Health & Medicine", Decimal("650.00"), Decimal("800.00"), None),
        
        # ========== BEDS & COMFORT ==========
        ("Orthopedic Dog Bed", "Memory foam bed for comfort, Medium", "ComfortPets", "Beds & Comfort", Decimal("3500.00"), Decimal("4500.00"), "Medium"),
        ("Orthopedic Dog Bed - Large", "Memory foam bed, Large", "ComfortPets", "Beds & Comfort", Decimal("4500.00"), Decimal("5500.00"), "Large"),
        ("Cat Bed - Plush", "Soft plush bed for cats", "ComfortPets", "Beds & Comfort", Decimal("1800.00"), Decimal("2200.00"), None),
        ("Cat Bed - Donut Style", "Cozy donut-shaped cat bed", "ComfortPets", "Beds & Comfort", Decimal("1600.00"), Decimal("2000.00"), None),
        ("Pet Blanket", "Warm and cozy blanket, Large", "ComfortPets", "Beds & Comfort", Decimal("1200.00"), Decimal("1500.00"), "Large"),
        ("Cooling Mat for Pets", "Self-cooling mat for hot days", "ComfortPets", "Beds & Comfort", Decimal("1500.00"), Decimal("1800.00"), "Medium"),
        ("Heated Pet Bed", "Electric heated bed for winter", "ComfortPets", "Beds & Comfort", Decimal("3200.00"), Decimal("4000.00"), "Small"),
        ("Dog Crate Mat", "Comfortable mat for dog crates", "ComfortPets", "Beds & Comfort", Decimal("850.00"), Decimal("1100.00"), "Medium"),
        ("Pet Pillow", "Soft pillow for pets", "ComfortPets", "Beds & Comfort", Decimal("950.00"), Decimal("1200.00"), None),
        ("Hammock Cat Bed", "Window-mounted hammock bed", "ComfortPets", "Beds & Comfort", Decimal("1400.00"), Decimal("1800.00"), None),
        
        # ========== LITTER & WASTE ==========
        ("Clumping Cat Litter", "Premium clumping litter, 10kg", "CleanPet", "Litter & Waste", Decimal("900.00"), Decimal("1100.00"), "10kg"),
        ("Crystal Cat Litter", "Odor-control crystal litter, 8kg", "CleanPet", "Litter & Waste", Decimal("1100.00"), Decimal("1400.00"), "8kg"),
        ("Natural Cat Litter", "Eco-friendly natural litter, 10kg", "CleanPet", "Litter & Waste", Decimal("1200.00"), Decimal("1500.00"), "10kg"),
        ("Litter Box - Large", "Spacious litter box with lid", "CleanPet", "Litter & Waste", Decimal("1800.00"), Decimal("2200.00"), "Large"),
        ("Litter Box - Standard", "Standard open litter box", "CleanPet", "Litter & Waste", Decimal("650.00"), Decimal("800.00"), "Standard"),
        ("Self-Cleaning Litter Box", "Automatic self-cleaning litter box", "CleanPet", "Litter & Waste", Decimal("12000.00"), Decimal("15000.00"), None),
        ("Litter Scoop", "Durable metal litter scoop", "CleanPet", "Litter & Waste", Decimal("250.00"), Decimal("320.00"), None),
        ("Litter Mat", "Trap litter tracking mat", "CleanPet", "Litter & Waste", Decimal("550.00"), Decimal("700.00"), None),
        ("Dog Waste Bags - 100 Pack", "Biodegradable waste bags", "CleanPet", "Litter & Waste", Decimal("400.00"), Decimal("500.00"), "100 count"),
        ("Dispenser for Waste Bags", "Convenient leash-mounted dispenser", "CleanPet", "Litter & Waste", Decimal("350.00"), Decimal("450.00"), None),
        ("Odor Neutralizer Spray", "Eliminates pet odors, 500ml", "CleanPet", "Litter & Waste", Decimal("450.00"), Decimal("580.00"), "500ml"),
        
        # ========== TRAINING ==========
        ("Training Clicker", "Professional training clicker", "TrainRight", "Training", Decimal("200.00"), Decimal("250.00"), None),
        ("Treat Pouch", "Waist-worn treat pouch", "TrainRight", "Training", Decimal("500.00"), Decimal("650.00"), None),
        ("Training Treats", "High-value training treats, 200g", "TrainRight", "Training", Decimal("450.00"), Decimal("580.00"), "200g"),
        ("Puppy Training Pads", "Absorbent training pads, 50 count", "TrainRight", "Training", Decimal("650.00"), Decimal("800.00"), "50 count"),
        ("Dog Whistle", "Professional training whistle", "TrainRight", "Training", Decimal("350.00"), Decimal("450.00"), None),
        ("Bark Control Device", "Ultrasonic bark control", "TrainRight", "Training", Decimal("1800.00"), Decimal("2200.00"), None),
        ("Training Lead", "Long training lead, 10m", "TrainRight", "Training", Decimal("550.00"), Decimal("700.00"), "10m"),
        ("Agility Tunnel", "Collapsible agility tunnel", "TrainRight", "Training", Decimal("2500.00"), Decimal("3000.00"), None),
        
        # ========== TRAVEL & CARRIERS ==========
        ("Pet Carrier - Soft", "Soft-sided carrier for small pets", "TravelPet", "Travel & Carriers", Decimal("2200.00"), Decimal("2800.00"), "Small"),
        ("Pet Carrier - Hard", "Hard-sided airline-approved carrier", "TravelPet", "Travel & Carriers", Decimal("3500.00"), Decimal("4500.00"), "Medium"),
        ("Pet Backpack Carrier", "Hands-free backpack carrier", "TravelPet", "Travel & Carriers", Decimal("2800.00"), Decimal("3500.00"), None),
        ("Travel Water Bowl", "Collapsible travel water bowl", "TravelPet", "Travel & Carriers", Decimal("350.00"), Decimal("450.00"), None),
        ("Travel Food Container", "Portable food container", "TravelPet", "Travel & Carriers", Decimal("450.00"), Decimal("580.00"), None),
        ("Car Seat Cover", "Protective car seat cover", "TravelPet", "Travel & Carriers", Decimal("1800.00"), Decimal("2200.00"), "Standard"),
        ("Pet Travel Crate", "Airline-approved travel crate", "TravelPet", "Travel & Carriers", Decimal("4500.00"), Decimal("5500.00"), "Large"),
        ("Car Safety Harness", "Car safety harness for dogs", "TravelPet", "Travel & Carriers", Decimal("1400.00"), Decimal("1800.00"), None),
        ("Pet Seat Belt", "Adjustable pet seat belt", "TravelPet", "Travel & Carriers", Decimal("650.00"), Decimal("800.00"), None),
        
        # ========== FEEDING ==========
        ("Stainless Steel Bowl Set", "Set of 2 stainless steel bowls", "FeedWell", "Feeding", Decimal("600.00"), Decimal("750.00"), "Set of 2"),
        ("Ceramic Pet Bowl", "Heavy-duty ceramic bowl", "FeedWell", "Feeding", Decimal("550.00"), Decimal("700.00"), "Large"),
        ("Elevated Feeder Stand", "Raised feeding station", "FeedWell", "Feeding", Decimal("1800.00"), Decimal("2200.00"), "Adjustable"),
        ("Slow Feeder Bowl", "Prevents fast eating", "FeedWell", "Feeding", Decimal("850.00"), Decimal("1100.00"), None),
        ("Automatic Pet Feeder", "Programmable automatic feeder", "FeedWell", "Feeding", Decimal("5500.00"), Decimal("7000.00"), "Digital"),
        ("Water Fountain for Pets", "Circulating water fountain", "FeedWell", "Feeding", Decimal("3200.00"), Decimal("4000.00"), "2L"),
        ("Pet Food Storage Container", "Airtight food storage, 15kg", "FeedWell", "Feeding", Decimal("1800.00"), Decimal("2200.00"), "15kg"),
        ("Pet Food Scoop", "Measuring scoop for pet food", "FeedWell", "Feeding", Decimal("200.00"), Decimal("250.00"), "1 cup"),
        ("Portable Pet Bowl", "Collapsible travel bowl set", "FeedWell", "Feeding", Decimal("450.00"), Decimal("580.00"), "Set"),
        ("Pet Water Bottle", "Drip-free water bottle for travel", "FeedWell", "Feeding", Decimal("550.00"), Decimal("700.00"), "500ml"),
    ]
    
    print(f"Creating {len(products_catalog)} products...")
    
    created_count = 0
    for title, desc, brand, cat_name, price, compare_price, size in products_catalog:
        # Check if product already exists
        slug = slugify(title)
        existing = db.query(Product).filter(Product.slug == slug).first()
        if existing:
            continue
        
        cat = categories.get(cat_name, categories["Pet Food"])
        product = Product(
            category_id=cat.id,
            slug=slug,
            title=title,
            description_md=desc,
            brand=brand,
            status=ProductStatus.PUBLISHED
        )
        db.add(product)
        db.flush()
        
        # Create variant with size if provided
        variant = ProductVariant(
            product_id=product.id,
            sku=f"SKU-{product.id:05d}",
            price=price,
            compare_at_price=compare_price,
            currency="BDT",
            size=size,
            stock_qty=random.randint(50, 500),
            is_active=True
        )
        db.add(variant)
        created_count += 1
        
        if created_count % 20 == 0:
            db.flush()
            print(f"  Created {created_count} products...")
    
    try:
        db.commit()
        print(f"✅ Successfully created {created_count} products in BDT!")
        print(f"💰 All prices are in Bangladeshi Taka (BDT)")
        print(f"📊 Products distributed across {len(categories)} categories")
    except Exception as e:
        db.rollback()
        print(f"Error seeding products: {e}")
        raise

if __name__ == "__main__":
    seed_comprehensive_products()
    db.close()
