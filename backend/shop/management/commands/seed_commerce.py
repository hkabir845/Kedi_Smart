from django.core.management.base import BaseCommand

from shop.services.commission import seed_default_commission_plans


class Command(BaseCommand):
    help = "Seed default marketplace commission plans (Standard, Pro, Enterprise)."

    def handle(self, *args, **options):
        seed_default_commission_plans()
        self.stdout.write(self.style.SUCCESS("Commission plans seeded."))
