from django.core.management.base import BaseCommand

from shop.models import Product, ProductStatus


class Command(BaseCommand):
    help = "Normalize legacy uppercase product status values to lowercase."

    def handle(self, *args, **options):
        updated = Product.objects.filter(status="PUBLISHED").update(status=ProductStatus.PUBLISHED)
        self.stdout.write(self.style.SUCCESS(f"Updated {updated} product(s) to published status."))
