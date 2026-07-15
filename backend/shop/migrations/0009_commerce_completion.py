# Generated manually for commerce completion features

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("shop", "0008_inventory_tracking"),
    ]

    operations = [
        migrations.AddField(
            model_name="productvariant",
            name="reserved_qty",
            field=models.PositiveIntegerField(
                default=0,
                help_text="Units held by active carts (Shopify-style soft reservation).",
            ),
        ),
        migrations.AddField(
            model_name="cartitem",
            name="reserved_until",
            field=models.DateTimeField(
                blank=True,
                help_text="Soft hold expires; reserved stock is released after this time.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="coupon_code",
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name="coupon",
            name="times_used",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="payment",
            name="gateway_session_key",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="payment",
            name="gateway_tran_id",
            field=models.CharField(blank=True, max_length=120, null=True),
        ),
        migrations.AlterField(
            model_name="payment",
            name="method",
            field=models.CharField(
                choices=[
                    ("COD", "Cash on Delivery"),
                    ("BKASH", "bKash"),
                    ("NAGAD", "Nagad"),
                    ("STORE_PICKUP", "Pay at Store Pickup"),
                    ("SSLCOMMERZ", "Card / Mobile Banking (SSLCommerz)"),
                    ("Manual", "Manual (legacy)"),
                ],
                max_length=20,
            ),
        ),
    ]
