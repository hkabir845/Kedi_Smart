# Generated manually for Shipment + VendorStatement

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("shop", "0009_commerce_completion"),
    ]

    operations = [
        migrations.CreateModel(
            name="Shipment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("processing", "Processing"),
                            ("ready", "Ready"),
                            ("shipped", "Shipped"),
                            ("delivered", "Delivered"),
                            ("cancelled", "Cancelled"),
                            ("returned", "Returned"),
                        ],
                        db_index=True,
                        default="pending",
                        max_length=20,
                    ),
                ),
                (
                    "courier",
                    models.CharField(
                        choices=[
                            ("manual", "Manual / own courier"),
                            ("pathao", "Pathao"),
                            ("steadfast", "Steadfast"),
                            ("redx", "RedX"),
                        ],
                        default="manual",
                        max_length=20,
                    ),
                ),
                ("consignment_id", models.CharField(blank=True, max_length=120, null=True)),
                ("tracking_number", models.CharField(blank=True, max_length=120, null=True)),
                ("tracking_url", models.CharField(blank=True, max_length=500, null=True)),
                ("carrier_note", models.CharField(blank=True, max_length=255, null=True)),
                ("shipped_at", models.DateTimeField(blank=True, null=True)),
                ("delivered_at", models.DateTimeField(blank=True, null=True)),
                (
                    "order",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="shipments",
                        to="shop.order",
                    ),
                ),
                (
                    "vendor",
                    models.ForeignKey(
                        blank=True,
                        db_column="vendor_user_id",
                        help_text="Null = platform-fulfilled stock.",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="shipments",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "shipments",
                "ordering": ["id"],
            },
        ),
        migrations.CreateModel(
            name="VendorStatement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("period_start", models.DateField()),
                ("period_end", models.DateField()),
                ("gross_sales", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("platform_fees", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("processing_fees", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("listing_fees", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("refunds", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("payouts", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("net", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("status", models.CharField(default="finalized", max_length=20)),
                (
                    "vendor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="statements",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "vendor_statements",
                "ordering": ["-period_end"],
                "unique_together": {("vendor", "period_start", "period_end")},
            },
        ),
        migrations.AddIndex(
            model_name="shipment",
            index=models.Index(fields=["order", "vendor"], name="shipments_order_i_idx"),
        ),
    ]
