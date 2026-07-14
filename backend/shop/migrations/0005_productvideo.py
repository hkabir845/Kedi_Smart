from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("shop", "0004_productimage_url_blank"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProductVideo",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("video_url", models.CharField(help_text="mp4 or HLS (.m3u8) URL", max_length=800)),
                ("poster_url", models.CharField(blank=True, default="", max_length=500)),
                ("title", models.CharField(blank=True, default="", max_length=255)),
                ("duration_seconds", models.PositiveIntegerField(blank=True, null=True)),
                ("sort_order", models.IntegerField(default=0)),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="videos",
                        to="shop.product",
                    ),
                ),
            ],
            options={
                "db_table": "product_videos",
                "ordering": ["sort_order", "id"],
            },
        ),
    ]
