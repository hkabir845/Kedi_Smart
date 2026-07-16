from django.urls import reverse
from rest_framework.test import APITestCase

from accounts.models import User
from blog.models import BlogPost, BlogStatus
from content.models import AnimalCategory, ContentStatus, ContentTopic
from marketplace.models import ListingStatus, ListingType, PetListing
from shop.models import Product, ProductStatus
from vets.models import VetProfile


class PublicContentVisibilityTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create(
            email="owner@example.com",
            password_hash="not-used",
        )
        cls.category = AnimalCategory.objects.create(slug="dogs", name="Dogs")

    def test_draft_blog_post_is_not_public(self):
        BlogPost.objects.create(
            author=self.user,
            slug="draft-post",
            title="Draft",
            status=BlogStatus.DRAFT,
        )

        response = self.client.get(reverse("blog-post-detail", args=["draft-post"]))

        self.assertEqual(response.status_code, 404)

    def test_draft_content_topic_is_not_public(self):
        ContentTopic.objects.create(
            category=self.category,
            slug="draft-topic",
            title="Draft",
            status=ContentStatus.DRAFT,
        )

        response = self.client.get(reverse("content-topic", args=["draft-topic"]))

        self.assertEqual(response.status_code, 404)

    def test_draft_product_is_not_public(self):
        Product.objects.create(
            slug="draft-product",
            title="Draft",
            status=ProductStatus.DRAFT,
        )

        response = self.client.get(reverse("shop-product", args=["draft-product"]))

        self.assertEqual(response.status_code, 404)

    def test_pending_listing_is_not_public(self):
        listing = PetListing.objects.create(
            seller=self.user,
            species="Dog",
            location_text="Dhaka",
            type=ListingType.ADOPTION,
            status=ListingStatus.PENDING,
        )

        response = self.client.get(reverse("marketplace-listing", args=[listing.id]))

        self.assertEqual(response.status_code, 404)

    def test_unverified_vet_is_not_public(self):
        VetProfile.objects.create(
            user=self.user,
            clinic_name="Pending Clinic",
            address="Dhaka",
            city="Dhaka",
            country="Bangladesh",
            verification_status="pending",
        )

        response = self.client.get(reverse("vets-detail", args=[self.user.id]))

        self.assertEqual(response.status_code, 404)


class PublicPaginationTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create(
            email="author@example.com",
            password_hash="not-used",
        )
        cls.category = AnimalCategory.objects.create(slug="cats", name="Cats")
        for index in range(3):
            BlogPost.objects.create(
                author=cls.user,
                slug=f"post-{index}",
                title=f"Post {index}",
                status=BlogStatus.PUBLISHED,
            )
            ContentTopic.objects.create(
                category=cls.category,
                slug=f"topic-{index}",
                title=f"Topic {index}",
                status=ContentStatus.PUBLISHED,
            )

    def test_blog_skip_is_an_offset(self):
        response = self.client.get(reverse("blog-posts"), {"skip": 2, "limit": 1})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["page"], 3)
        self.assertEqual(len(response.data["items"]), 1)

    def test_topic_skip_is_an_offset(self):
        response = self.client.get(reverse("content-topics"), {"skip": 2, "limit": 1})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["page"], 3)
        self.assertEqual(len(response.data["items"]), 1)
