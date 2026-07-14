"""Re-download proper Amazon product photos for tiny/broken local images."""

from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from PIL import Image

from shop.models import Product, ProductCatalog, ProductImage, ProductSourceType
from shop.services.amazon_scraper import asin_cdn_image_urls, download_image, enrich_product

IMAGE_DIR = Path(settings.MEDIA_ROOT) / "products" / "amazon"
MIN_PIXELS = 80_000  # ~283x283
MIN_EDGE = 160


def _asin_from_slug(slug: str) -> str | None:
    if slug.startswith("amz-"):
        return slug[4:].upper()
    return None


def _is_tiny_file(path: Path) -> bool:
    if not path.exists() or path.stat().st_size < 800:
        return True
    try:
        with Image.open(path) as im:
            w, h = im.size
        return (w * h) < MIN_PIXELS or min(w, h) < MIN_EDGE
    except Exception:  # noqa: BLE001
        return True


class Command(BaseCommand):
    help = "Refresh Amazon product images that are missing, tiny logos, or broken."

    def add_arguments(self, parser):
        parser.add_argument("--asin", type=str, help="Refresh a single ASIN (e.g. B0060OUV5Y).")
        parser.add_argument("--limit", type=int, default=0, help="Max products to refresh (0=all).")
        parser.add_argument(
            "--force-all",
            action="store_true",
            help="Re-fetch every amazon product image, not only tiny ones.",
        )
        parser.add_argument(
            "--max-images",
            type=int,
            default=4,
            help="Gallery images to keep per product (default 4).",
        )

    def handle(self, *args, **options):
        IMAGE_DIR.mkdir(parents=True, exist_ok=True)
        qs = Product.objects.filter(
            catalog=ProductCatalog.GENERAL,
            source_type=ProductSourceType.PLATFORM_BRAND,
            slug__startswith="amz-",
        ).order_by("id")

        if options.get("asin"):
            asin = options["asin"].strip().upper()
            qs = qs.filter(slug=f"amz-{asin.lower()}")

        force_all = bool(options["force_all"])
        limit = int(options["limit"] or 0)
        max_images = max(1, min(int(options["max_images"]), 8))

        refreshed = 0
        skipped = 0
        failed = 0

        for product in qs.iterator():
            asin = _asin_from_slug(product.slug or "")
            if not asin:
                skipped += 1
                continue

            existing_paths = list(IMAGE_DIR.glob(f"{asin}.*"))
            needs = force_all or not existing_paths or any(_is_tiny_file(p) for p in existing_paths)
            if not needs:
                # Also refresh if DB image points at missing file
                for img in ProductImage.objects.filter(product_id=product.id):
                    rel = (img.url or "").lstrip("/")
                    if rel.startswith("uploads/"):
                        disk = Path(settings.MEDIA_ROOT) / rel[len("uploads/") :]
                        if _is_tiny_file(disk):
                            needs = True
                            break
                if not needs:
                    skipped += 1
                    continue

            self.stdout.write(f"Refreshing {asin} ({product.title[:60]})…")
            try:
                enriched = enrich_product(
                    {"asin": asin, "title": product.title, "category": product.category.name if product.category_id else "Home & Living"}
                )
            except Exception as exc:  # noqa: BLE001
                self.stderr.write(self.style.ERROR(f"  enrich failed: {exc}"))
                failed += 1
                continue

            urls = list(enriched.get("images") or [])
            if enriched.get("image") and enriched["image"] not in urls:
                urls.insert(0, enriched["image"])
            # Always try ASIN CDN fallbacks (reliable when PDP scrape is empty/captcha).
            for cdn in asin_cdn_image_urls(asin, count=max_images):
                if cdn not in urls:
                    urls.append(cdn)
            if not urls:
                failed += 1
                self.stderr.write(self.style.WARNING("  no photos found"))
                continue

            saved_local: list[str] = []
            seen_bytes: set[int] = set()
            for idx, remote in enumerate(urls):
                if len(saved_local) >= max_images:
                    break
                ext = ".jpg"
                lower = remote.lower()
                if ".png" in lower:
                    ext = ".png"
                elif ".webp" in lower:
                    ext = ".webp"
                dest = IMAGE_DIR / (f"{asin}{ext}" if not saved_local else f"{asin}_{len(saved_local)}{ext}")
                # Always overwrite for refresh targets
                if dest.exists():
                    dest.unlink(missing_ok=True)
                if not download_image(remote, dest):
                    continue
                if _is_tiny_file(dest):
                    dest.unlink(missing_ok=True)
                    continue
                # Skip duplicate/redirected identical payloads
                size = dest.stat().st_size
                if size in seen_bytes and len(saved_local) > 0:
                    dest.unlink(missing_ok=True)
                    continue
                seen_bytes.add(size)
                saved_local.append(f"/uploads/products/amazon/{dest.name}")

            if not saved_local:
                failed += 1
                self.stderr.write(self.style.WARNING("  no usable photos after download"))
                continue

            ProductImage.objects.filter(product_id=product.id).delete()
            for sort_order, url in enumerate(saved_local):
                ProductImage.objects.create(product=product, url=url, sort_order=sort_order)

            refreshed += 1
            self.stdout.write(self.style.SUCCESS(f"  saved {len(saved_local)} image(s)"))

            if limit and refreshed >= limit:
                break

        self.stdout.write(
            self.style.SUCCESS(f"Done. refreshed={refreshed} skipped={skipped} failed={failed}")
        )
