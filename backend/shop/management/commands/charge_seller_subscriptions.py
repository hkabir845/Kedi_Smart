"""Charge monthly seller subscription fees that are due."""

from django.core.management.base import BaseCommand

from shop.services.finance import charge_all_due_subscriptions


class Command(BaseCommand):
    help = "Debit monthly subscription fees for approved marketplace sellers."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Charge again even if already charged this calendar month.",
        )

    def handle(self, *args, **options):
        result = charge_all_due_subscriptions(force=bool(options.get("force")))
        self.stdout.write(
            self.style.SUCCESS(
                f"Subscriptions: charged={result['charged']} skipped={result['skipped']} "
                f"sellers={result['sellers']}"
            )
        )
