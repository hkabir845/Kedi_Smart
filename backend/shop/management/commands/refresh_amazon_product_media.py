"""Import Amazon product videos (HLS) + refresh weak/missing still images."""

from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone
from PIL import Image

from shop.models import (
    Product,
    ProductCatalog,
    ProductImage,
    ProductSourceType,
    ProductVideo,
)
from shop.services.amazon_scraper import (
    asin_cdn_image_urls,
    download_image,
    enrich_product,
)

IMAGE_DIR = Path(settings.MEDIA_ROOT) / "products" / "amazon"
MIN_PIXELS = 80_000
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
    help = "Fetch Amazon product videos and repair product photos for amz-* catalog items."

    def add_arguments(self, parser):
        parser.add_argument("--asin", type=str, help="Single ASIN, e.g. B0C2Z4L3S6")
        parser.add_argument("--limit", type=int, default=0, help="Max products (0=all)")
        parser.add_argument(
            "--videos-only",
            action="store_true",
            help="Only import videos; skip image refresh",
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

        limit = int(options["limit"] or 0)
        videos_only = bool(options["videos_only"])
        done = 0
        video_count = 0

        for product in qs.iterator():
            asin = _asin_from_slug(product.slug or "")
            if not asin:
                continue
            self.stdout.write(f"Media refresh {asin}…")
            try:
                enriched = enrich_product(
                    {
                        "asin": asin,
                        "title": product.title,
                        "category": product.category.name if product.category_id else "Home & Living",
                    }
                )
            except Exception as exc:  # noqa: BLE001
                self.stderr.write(self.style.ERROR(f"  enrich failed: {exc}"))
                continue

            videos = enriched.get("videos") or []
            ProductVideo.objects.filter(product_id=product.id).delete()
            for idx, vid in enumerate(videos):
                url = (vid.get("video_url") or "").strip()
                if not url:
                    continue
                ProductVideo.objects.create(
                    product=product,
                    video_url=url[:800],
                    poster_url=(vid.get("poster_url") or "")[:500],
                    title=(vid.get("title") or "Product video")[:255],
                    duration_seconds=vid.get("duration_seconds"),
                    sort_order=idx,
                )
                video_count += 1
            self.stdout.write(self.style.SUCCESS(f"  videos={len(videos)}"))

            if not videos_only:
                existing = list(IMAGE_DIR.glob(f"{asin}.*"))
                needs_images = (not existing) or any(_is_tiny_file(p) for p in existing)
                if needs_images or not ProductImage.objects.filter(product_id=product.id).exists():
                    urls = list(enriched.get("images") or [])
                    if enriched.get("image") and enriched["image"] not in urls:
                        urls.insert(0, enriched["image"])
                    for cdn in asin_cdn_image_urls(asin, count=4):
                        if cdn not in urls:
                            urls.append(cdn)
                    saved: list[str] = []
                    seen_sizes: set[int] = set()
                    for remote in urls:
                        if len(saved) >= 4:
                            break
                        ext = ".jpg"
                        lower = remote.lower()
                        if ".png" in lower:
                            ext = ".png"
                        dest = IMAGE_DIR / (f"{asin}{ext}" if not saved else f"{asin}_{len(saved)}{ext}")
                        if dest.exists():
                            dest.unlink(missing_ok=True)
                        if not download_image(remote, dest) or _is_tiny_file(dest):
                            if dest.exists():
                                dest.unlink(missing_ok=True)
                            continue
                        size = dest.stat().st_size
                        if size in seen_sizes and saved:
                            dest.unlink(missing_ok=True)
                            continue
                        seen_sizes.add(size)
                        saved.append(f"/uploads/products/amazon/{dest.name}")
                    if saved:
                        ProductImage.objects.filter(product_id=product.id).delete()
                        for i, url in enumerate(saved):
                            ProductImage.objects.create(product=product, url=url, sort_order=i)
                        self.stdout.write(self.style.SUCCESS(f"  images={len(saved)}"))

            product.updated_at = timezone.now()
            product.save(update_fields=["updated_at"])
            done += 1
            if limit and done >= limit:
                break

        self.stdout.write(self.style.SUCCESS(f"Done. products={done} video_rows={video_count}"))
