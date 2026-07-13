"""Seed sample data for Live Animals, Vets, Knowledge Hub, and Blog."""
from datetime import time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User, UserProfile, UserRole
from api.security import get_password_hash
from api.utils import slugify
from blog.models import BlogComment, BlogPost, BlogStatus
from content.models import AnimalCategory, ContentStatus, ContentTopic, FAQItem
from marketplace.models import ListingPhoto, ListingStatus, ListingType, PetListing
from vets.models import AppointmentMode, VetAvailability, VetProfile


def _get_or_create_user(
    email, password, role, full_name, city="Dhaka", country="Bangladesh", avatar_url=None
):
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            "password_hash": get_password_hash(password),
            "role": role,
            "is_active": True,
            "is_verified": True,
        },
    )
    if created:
        UserProfile.objects.create(
            user=user, full_name=full_name, city=city, country=country, avatar_url=avatar_url
        )
    elif avatar_url:
        UserProfile.objects.filter(user=user).update(
            full_name=full_name, city=city, country=country, avatar_url=avatar_url
        )
    return user, created


class Command(BaseCommand):
    help = "Seed sample data for Live Animals, Vets, Knowledge Hub, and Blog pages."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Re-create sample rows even if they already exist (matched by slug/email).",
        )

    def handle(self, *args, **options):
        force = options["force"]
        created_counts = {"knowledge": 0, "blog": 0, "vets": 0, "listings": 0}

        admin, _ = _get_or_create_user(
            "admin@kedismart.com", "admin123", UserRole.SUPER_ADMIN, "Admin User"
        )
        vet_user, _ = _get_or_create_user(
            "vet@kedismart.com", "vet123", UserRole.VET, "Dr. Sarah Johnson"
        )
        owner, _ = _get_or_create_user(
            "owner@kedismart.com", "owner123", UserRole.OWNER, "Pet Owner"
        )
        breeder, _ = _get_or_create_user(
            "breeder@kedismart.com", "breeder123", UserRole.BREEDER, "Rahim Khan"
        )
        shelter_user, _ = _get_or_create_user(
            "shelter@kedismart.com", "shelter123", UserRole.SHELTER, "Dhaka Animal Rescue"
        )
        trader, _ = _get_or_create_user(
            "trader@kedismart.com", "trader123", UserRole.TRADER, "Pet World BD"
        )

        created_counts["knowledge"] += self._seed_knowledge(vet_user, admin, force)
        created_counts["blog"] += self._seed_blog(admin, vet_user, owner, force)
        created_counts["vets"] += self._seed_vets(force)
        created_counts["listings"] += self._seed_listings(breeder, shelter_user, trader, owner, force)

        self.stdout.write(
            self.style.SUCCESS(
                "Sample sections seeded — "
                f"Knowledge: {created_counts['knowledge']}, "
                f"Blog: {created_counts['blog']}, "
                f"Vets: {created_counts['vets']}, "
                f"Live Animals: {created_counts['listings']}"
            )
        )

    def _seed_knowledge(self, vet_user, admin, force):
        created = 0
        categories_data = [
            ("cats", "Cats"),
            ("dogs", "Dogs"),
            ("birds", "Birds"),
            ("rabbits", "Rabbits"),
            ("fish", "Fish & Aquatics"),
        ]
        categories = {}
        for slug, name in categories_data:
            cat, was_created = AnimalCategory.objects.get_or_create(slug=slug, defaults={"name": name})
            categories[slug] = cat
            if was_created:
                created += 1

        topics_data = [
            {
                "slug": "cat-nutrition-guide",
                "category": "cats",
                "title": "Cat Nutrition Guide",
                "excerpt": "Learn how to choose the right food and feeding schedule for your cat.",
                "body_md": (
                    "# Cat Nutrition\n\n"
                    "Cats are obligate carnivores — protein should make up most of their diet.\n\n"
                    "## Daily feeding\n"
                    "- Adult cats: 2 meals per day\n"
                    "- Kittens: 3–4 smaller meals\n"
                    "- Always provide fresh water\n\n"
                    "## Foods to avoid\n"
                    "Onions, garlic, chocolate, and excessive tuna can harm cats."
                ),
                "cover_image_url": "/samples/cat-domestic.jpg",
                "vet_verified": True,
                "author": vet_user,
                "faqs": [
                    ("How often should I feed my cat?", "Most adult cats do well with two measured meals per day."),
                    ("Is dry or wet food better?", "A mix of both supports hydration and dental health."),
                ],
            },
            {
                "slug": "understanding-cat-behavior",
                "category": "cats",
                "title": "Understanding Cat Behavior",
                "excerpt": "Decode common feline behaviors from purring to scratching.",
                "body_md": (
                    "# Cat Behavior\n\n"
                    "Scratching marks territory and keeps claws healthy — provide a scratching post.\n\n"
                    "Slow blinking is a sign of trust. Respect hiding spots when your cat needs space."
                ),
                "cover_image_url": "/samples/cat-persian.jpg",
                "vet_verified": True,
                "author": vet_user,
                "faqs": [
                    ("Why does my cat knead?", "Kneading is a comfort behavior from kittenhood."),
                ],
            },
            {
                "slug": "puppy-training-basics",
                "category": "dogs",
                "title": "Puppy Training Basics",
                "excerpt": "House training, socialization, and basic commands for new puppy parents.",
                "body_md": (
                    "# Puppy Training\n\n"
                    "## House training\n"
                    "Take your puppy out after meals, naps, and play sessions.\n\n"
                    "## Socialization\n"
                    "Expose puppies to new people, sounds, and dogs between 8–16 weeks safely."
                ),
                "cover_image_url": "/samples/dog-golden.jpg",
                "vet_verified": True,
                "author": vet_user,
                "faqs": [
                    ("When should training start?", "Basic routines can begin as soon as you bring your puppy home."),
                ],
            },
            {
                "slug": "dog-vaccination-schedule",
                "category": "dogs",
                "title": "Dog Vaccination Schedule",
                "excerpt": "Core vaccines every dog needs and when to get boosters.",
                "body_md": (
                    "# Dog Vaccinations\n\n"
                    "Core vaccines include rabies, distemper, parvovirus, and adenovirus.\n\n"
                    "Puppies typically start vaccines at 6–8 weeks with boosters every 3–4 weeks until 16 weeks."
                ),
                "cover_image_url": "/samples/dog-lab.jpg",
                "vet_verified": True,
                "author": vet_user,
                "faqs": [
                    ("Does my indoor dog need vaccines?", "Yes — core vaccines protect against diseases that can spread indoors too."),
                ],
            },
            {
                "slug": "bird-cage-setup",
                "category": "birds",
                "title": "Bird Cage Setup & Enrichment",
                "excerpt": "Create a safe, stimulating home for parrots, finches, and budgies.",
                "body_md": (
                    "# Bird Cage Setup\n\n"
                    "Choose the largest cage you can fit. Bar spacing must suit your bird's size.\n\n"
                    "Add perches of different diameters, foraging toys, and rotate enrichment weekly."
                ),
                "cover_image_url": "/samples/bird-budgie.jpg",
                "vet_verified": False,
                "author": admin,
                "faqs": [],
            },
            {
                "slug": "rabbit-diet-essentials",
                "category": "rabbits",
                "title": "Rabbit Diet Essentials",
                "excerpt": "Hay, greens, and pellets — building a balanced diet for pet rabbits.",
                "body_md": (
                    "# Rabbit Diet\n\n"
                    "Unlimited timothy hay should be available at all times.\n\n"
                    "Introduce leafy greens gradually and limit fruit as occasional treats."
                ),
                "cover_image_url": "/samples/rabbit.jpg",
                "vet_verified": True,
                "author": vet_user,
                "faqs": [
                    ("Can rabbits eat carrots daily?", "Carrots are high in sugar — offer small pieces a few times per week."),
                ],
            },
            {
                "slug": "aquarium-water-quality",
                "category": "fish",
                "title": "Aquarium Water Quality 101",
                "excerpt": "Cycle your tank, test parameters, and keep fish healthy.",
                "body_md": (
                    "# Aquarium Water Quality\n\n"
                    "Cycle a new tank before adding fish — ammonia and nitrite should read zero.\n\n"
                    "Test pH, ammonia, nitrite, and nitrate weekly; partial water changes stabilize the system."
                ),
                "cover_image_url": "/samples/dog-indie.jpg",
                "vet_verified": False,
                "author": admin,
                "faqs": [],
            },
        ]

        now = timezone.now()
        for item in topics_data:
            exists = ContentTopic.objects.filter(slug=item["slug"]).exists()
            if exists and not force:
                continue
            if exists and force:
                ContentTopic.objects.filter(slug=item["slug"]).delete()

            topic = ContentTopic.objects.create(
                category=categories[item["category"]],
                slug=item["slug"],
                title=item["title"],
                excerpt=item["excerpt"],
                body_md=item["body_md"],
                cover_image_url=item["cover_image_url"],
                author=item["author"],
                vet_verified=item["vet_verified"],
                status=ContentStatus.PUBLISHED,
                published_at=now - timedelta(days=topics_data.index(item) + 1),
            )
            for question, answer in item["faqs"]:
                FAQItem.objects.create(topic=topic, question=question, answer=answer)
            created += 1

        return created

    def _seed_blog(self, admin, vet_user, owner, force):
        created = 0
        posts_data = [
            {
                "slug": "welcome-to-kedismart-community",
                "title": "Welcome to the KediSmart Community",
                "excerpt": "Meet Bangladesh's growing pet-care platform — shops, vets, and adopters in one place.",
                "body_md": (
                    "# Welcome!\n\n"
                    "KediSmart connects pet owners, veterinarians, breeders, and shelters.\n\n"
                    "Browse the shop, book a vet, adopt a pet, or share your story on this blog."
                ),
                "cover_image_url": "/samples/dog-golden.jpg",
                "author": admin,
                "days_ago": 14,
            },
            {
                "slug": "5-signs-your-cat-needs-a-vet",
                "title": "5 Signs Your Cat Needs a Vet",
                "excerpt": "Subtle changes in appetite, litter-box habits, or energy can signal illness.",
                "body_md": (
                    "# When to Call the Vet\n\n"
                    "1. Not eating for 24+ hours\n"
                    "2. Repeated vomiting\n"
                    "3. Litter-box changes\n"
                    "4. Hiding more than usual\n"
                    "5. Labored breathing\n\n"
                    "When in doubt, book a consultation on KediSmart."
                ),
                "cover_image_url": "/samples/cat-persian.jpg",
                "author": vet_user,
                "days_ago": 10,
            },
            {
                "slug": "monsoon-pet-care-tips-bangladesh",
                "title": "Monsoon Pet Care Tips for Bangladesh",
                "excerpt": "Keep paws dry, prevent skin infections, and plan walks around heavy rain.",
                "body_md": (
                    "# Monsoon Care\n\n"
                    "Dry your pet's paws after every walk. Check ears for moisture buildup.\n\n"
                    "Store dry food in airtight containers — humidity causes mold quickly."
                ),
                "cover_image_url": "/samples/dog-lab.jpg",
                "author": vet_user,
                "days_ago": 7,
            },
            {
                "slug": "how-we-found-whiskers-a-home",
                "title": "How We Found Whiskers a Loving Home",
                "excerpt": "One family's adoption story through the KediSmart marketplace.",
                "body_md": (
                    "# Whiskers' Story\n\n"
                    "We listed Whiskers for adoption on KediSmart and matched with a family in Gulshan within a week.\n\n"
                    "Shelters and owners can list pets for adoption, sale, or giveaway responsibly."
                ),
                "cover_image_url": "/samples/cat-siamese.jpg",
                "author": owner,
                "days_ago": 5,
            },
            {
                "slug": "choosing-the-right-dog-food",
                "title": "Choosing the Right Dog Food in Bangladesh",
                "excerpt": "Compare local and imported brands, portion sizes, and allergy-friendly options.",
                "body_md": (
                    "# Dog Food Guide\n\n"
                    "Look for AAFCO-complete labels and match kibble size to your dog's breed.\n\n"
                    "Transition foods over 7–10 days to avoid upset stomachs."
                ),
                "cover_image_url": "/samples/dog-shepherd.jpg",
                "author": admin,
                "days_ago": 3,
            },
            {
                "slug": "nfc-tags-and-lost-pets",
                "title": "NFC Tags and Lost Pets: How KediSmart Helps",
                "excerpt": "Activate a tag on your pet's collar so finders can reach you without exposing your phone number.",
                "body_md": (
                    "# NFC Tags\n\n"
                    "Scanning a KediSmart tag opens a safe profile with optional contact options.\n\n"
                    "Report lost pets from your dashboard and receive masked messages from finders."
                ),
                "cover_image_url": "/samples/dog-indie.jpg",
                "author": admin,
                "days_ago": 1,
            },
        ]

        now = timezone.now()
        for item in posts_data:
            exists = BlogPost.objects.filter(slug=item["slug"]).exists()
            if exists and not force:
                continue
            if exists and force:
                BlogPost.objects.filter(slug=item["slug"]).delete()

            post = BlogPost.objects.create(
                author=item["author"],
                slug=item["slug"],
                title=item["title"],
                excerpt=item["excerpt"],
                body_md=item["body_md"],
                cover_image_url=item["cover_image_url"],
                status=BlogStatus.PUBLISHED,
                published_at=now - timedelta(days=item["days_ago"]),
            )
            if item["slug"] == "welcome-to-kedismart-community":
                BlogComment.objects.get_or_create(
                    post=post,
                    user=owner,
                    defaults={"body": "Excited to be part of this community! 🐾"},
                )
            created += 1

        return created

    def _seed_vets(self, force):
        created = 0
        vets_data = [
            {
                "email": "vet@kedismart.com",
                "password": "vet123",
                "full_name": "Dr. Sarah Johnson",
                "clinic_name": "Paws & Claws Veterinary Clinic",
                "specialties": ["General Practice", "Surgery"],
                "years_experience": 10,
                "license_no": "VET-BD-001",
                "address": "123 Pet Care Road, Gulshan",
                "city": "Dhaka",
                "online": True,
                "avatar_url": "/samples/vet-avatar-1.jpg",
                "clinic_image_url": "/samples/vet-clinic-1.jpg",
            },
            {
                "email": "vet2@kedismart.com",
                "password": "vet123",
                "full_name": "Dr. Abdul Rahman",
                "clinic_name": "Dhaka Pet Hospital",
                "specialties": ["Dermatology", "General Practice"],
                "years_experience": 14,
                "license_no": "VET-BD-002",
                "address": "45 Mirpur Road, Dhanmondi",
                "city": "Dhaka",
                "online": True,
                "avatar_url": "/samples/vet-avatar-2.jpg",
                "clinic_image_url": "/samples/vet-clinic-2.jpg",
            },
            {
                "email": "vet3@kedismart.com",
                "password": "vet123",
                "full_name": "Dr. Fatima Akter",
                "clinic_name": "Happy Tails Veterinary Center",
                "specialties": ["Exotic Pets", "Avian Medicine"],
                "years_experience": 8,
                "license_no": "VET-BD-003",
                "address": "78 Bashundhara R/A, Block C",
                "city": "Dhaka",
                "online": True,
                "avatar_url": "/samples/vet-avatar-3.jpg",
                "clinic_image_url": "/samples/vet-clinic-3.jpg",
            },
            {
                "email": "vet4@kedismart.com",
                "password": "vet123",
                "full_name": "Dr. Karim Hassan",
                "clinic_name": "Chittagong Animal Care",
                "specialties": ["Emergency Care", "Orthopedics"],
                "years_experience": 12,
                "license_no": "VET-BD-004",
                "address": "12 Agrabad Commercial Area",
                "city": "Chittagong",
                "online": False,
                "avatar_url": "/samples/vet-avatar-4.jpg",
                "clinic_image_url": "/samples/vet-clinic-4.jpg",
            },
            {
                "email": "vet5@kedismart.com",
                "password": "vet123",
                "full_name": "Dr. Nusrat Jahan",
                "clinic_name": "Sylhet Vet Clinic",
                "specialties": ["General Practice", "Nutrition"],
                "years_experience": 6,
                "license_no": "VET-BD-005",
                "address": "Zindabazar Main Road",
                "city": "Sylhet",
                "online": True,
                "avatar_url": "/samples/vet-avatar-5.jpg",
                "clinic_image_url": "/samples/vet-clinic-5.jpg",
            },
        ]

        availability_template = [
            (0, time(9, 0), time(13, 0), AppointmentMode.CLINIC),
            (2, time(14, 0), time(18, 0), AppointmentMode.CLINIC),
            (4, time(10, 0), time(16, 0), AppointmentMode.ONLINE),
        ]

        for item in vets_data:
            user, user_created = _get_or_create_user(
                item["email"],
                item["password"],
                UserRole.VET,
                item["full_name"],
                city=item["city"],
                avatar_url=item["avatar_url"],
            )
            if user_created:
                created += 1

            profile, profile_created = VetProfile.objects.get_or_create(
                user_id=user.id,
                defaults={
                    "clinic_name": item["clinic_name"],
                    "specialties": item["specialties"],
                    "years_experience": item["years_experience"],
                    "license_no": item["license_no"],
                    "address": item["address"],
                    "city": item["city"],
                    "country": "Bangladesh",
                    "online_consultation_enabled": item["online"],
                    "clinic_image_url": item["clinic_image_url"],
                    "verification_status": "approved",
                },
            )
            if not profile_created and force:
                profile.clinic_name = item["clinic_name"]
                profile.specialties = item["specialties"]
                profile.years_experience = item["years_experience"]
                profile.verification_status = "approved"
                profile.online_consultation_enabled = item["online"]
                profile.clinic_image_url = item["clinic_image_url"]
                profile.save()
            elif profile_created:
                created += 1
            elif profile.verification_status != "approved":
                profile.verification_status = "approved"
                profile.clinic_image_url = item["clinic_image_url"]
                profile.save()
            elif not profile.clinic_image_url:
                profile.clinic_image_url = item["clinic_image_url"]
                profile.save()

            if profile_created or force:
                VetAvailability.objects.filter(vet_id=user.id).delete()
                for day, start, end, mode in availability_template:
                    VetAvailability.objects.create(
                        vet_id=user.id,
                        day_of_week=day,
                        start_time=start,
                        end_time=end,
                        mode=mode,
                    )

        return created

    def _seed_listings(self, breeder, shelter_user, trader, owner, force):
        created = 0
        listings_data = [
            {
                "key": "persian-kitten-sale",
                "seller": breeder,
                "species": "Cat",
                "breed": "Persian",
                "age_text": "3 months",
                "gender": "Female",
                "location_text": "Banani, Dhaka",
                "price": Decimal("25000.00"),
                "type": ListingType.SALE,
                "vaccination_status_text": "First round complete",
                "description_md": "Fluffy Persian kitten, litter trained, dewormed. Pedigree papers available.",
                "photo": "/samples/cat-persian.jpg",
            },
            {
                "key": "golden-retriever-puppies",
                "seller": breeder,
                "species": "Dog",
                "breed": "Golden Retriever",
                "age_text": "8 weeks",
                "gender": "Male",
                "location_text": "Uttara, Dhaka",
                "price": Decimal("35000.00"),
                "type": ListingType.CUBS,
                "vaccination_status_text": "DHPP first dose given",
                "description_md": "Healthy golden retriever puppies from registered parents. Home-raised with children.",
                "photo": "/samples/dog-golden.jpg",
            },
            {
                "key": "budgie-pair",
                "seller": trader,
                "species": "Bird",
                "breed": "Budgerigar",
                "age_text": "6 months",
                "gender": "Pair",
                "location_text": "New Market, Dhaka",
                "price": Decimal("1200.00"),
                "type": ListingType.SALE,
                "vaccination_status_text": "N/A",
                "description_md": "Colorful budgie pair with cage optional. Hand-tamed and friendly.",
                "photo": "/samples/bird-budgie.jpg",
            },
            {
                "key": "labrador-adoption",
                "seller": shelter_user,
                "species": "Dog",
                "breed": "Labrador Mix",
                "age_text": "2 years",
                "gender": "Female",
                "location_text": "Mohammadpur, Dhaka",
                "price": None,
                "type": ListingType.ADOPTION,
                "vaccination_status_text": "Fully vaccinated, spayed",
                "description_md": "Sweet lab mix rescued from the street. Great with kids, needs a fenced yard.",
                "photo": "/samples/dog-lab.jpg",
            },
            {
                "key": "community-cat-giveaway",
                "seller": owner,
                "species": "Cat",
                "breed": "Domestic Shorthair",
                "age_text": "1 year",
                "gender": "Male",
                "location_text": "Gulshan, Dhaka",
                "price": None,
                "type": ListingType.GIVEAWAY,
                "vaccination_status_text": "Vaccinated",
                "description_md": "Moving abroad — looking for a caring home for our friendly indoor cat.",
                "photo": "/samples/cat-domestic.jpg",
            },
            {
                "key": "siamese-kitten",
                "seller": breeder,
                "species": "Cat",
                "breed": "Siamese",
                "age_text": "4 months",
                "gender": "Male",
                "location_text": "Dhanmondi, Dhaka",
                "price": Decimal("18000.00"),
                "type": ListingType.SALE,
                "vaccination_status_text": "Vaccinated and dewormed",
                "description_md": "Classic seal-point Siamese kitten. Very vocal and affectionate.",
                "photo": "/samples/cat-siamese.jpg",
            },
            {
                "key": "german-shepherd-cubs",
                "seller": breeder,
                "species": "Dog",
                "breed": "German Shepherd",
                "age_text": "10 weeks",
                "gender": "Female",
                "location_text": "Chittagong",
                "price": Decimal("40000.00"),
                "type": ListingType.CUBS,
                "vaccination_status_text": "First vaccination done",
                "description_md": "Working-line GSD puppies. Early socialization started.",
                "photo": "/samples/dog-shepherd.jpg",
            },
            {
                "key": "rabbit-dutch",
                "seller": trader,
                "species": "Rabbit",
                "breed": "Dutch",
                "age_text": "5 months",
                "gender": "Female",
                "location_text": "Mirpur, Dhaka",
                "price": Decimal("3500.00"),
                "type": ListingType.SALE,
                "vaccination_status_text": "Vet checked",
                "description_md": "Calm Dutch rabbit, litter trained. Includes starter hay bundle.",
                "photo": "/samples/rabbit.jpg",
            },
            {
                "key": "shelter-indie-dogs",
                "seller": shelter_user,
                "species": "Dog",
                "breed": "Indie / Mixed",
                "age_text": "6 months – 3 years",
                "gender": "Mixed",
                "location_text": "Dhaka Animal Rescue, Keraniganj",
                "price": None,
                "type": ListingType.ADOPTION,
                "vaccination_status_text": "Vaccinated before adoption",
                "description_md": "Several indie dogs ready for adoption. Home visit required.",
                "photo": "/samples/dog-indie.jpg",
            },
        ]

        for item in listings_data:
            slug_marker = item["key"]
            existing = PetListing.objects.filter(
                seller_id=item["seller"].id,
                species=item["species"],
                breed=item["breed"],
                type=item["type"],
            ).first()
            if existing and not force:
                photo = ListingPhoto.objects.filter(listing_id=existing.id).first()
                if photo:
                    photo.url = item["photo"]
                    photo.save(update_fields=["url"])
                else:
                    ListingPhoto.objects.create(listing_id=existing.id, url=item["photo"])
                continue
            if existing and force:
                ListingPhoto.objects.filter(listing_id=existing.id).delete()
                existing.delete()

            listing = PetListing.objects.create(
                seller_id=item["seller"].id,
                species=item["species"],
                breed=item["breed"],
                age_text=item["age_text"],
                gender=item["gender"],
                location_text=item["location_text"],
                price=item["price"],
                currency="BDT",
                type=item["type"],
                vaccination_status_text=item["vaccination_status_text"],
                description_md=item["description_md"],
                status=ListingStatus.PUBLISHED,
            )
            ListingPhoto.objects.create(listing_id=listing.id, url=item["photo"])
            created += 1
            _ = slug_marker  # stable key for future migrations/fixtures

        return created
