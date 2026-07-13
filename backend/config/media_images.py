"""Shared image processing for admin URL fields (logo, avatar, cover, product, etc.)."""

from __future__ import annotations

import io
import re
import uuid
from pathlib import Path

from django.conf import settings
from django.core.files.uploadedfile import InMemoryUploadedFile, UploadedFile
from PIL import Image, ImageOps

IMAGE_BG = (248, 250, 252)  # gray-50
IMAGE_QUALITY = 85
SQUARE_SIZE = 1200
CONTAIN_MAX = 1600
SAFE_SUBDIR = re.compile(r"^[a-z0-9_-]{1,40}$")


def _open_image(source) -> Image.Image:
    if hasattr(source, "read"):
        source.seek(0)
        img = Image.open(source)
    else:
        img = Image.open(source)
    img = ImageOps.exif_transpose(img)
    if img.mode in ("RGBA", "LA"):
        background = Image.new("RGB", img.size, IMAGE_BG)
        alpha = img.split()[-1]
        background.paste(img.convert("RGBA"), mask=alpha)
        return background
    if img.mode == "P":
        img = img.convert("RGBA")
        background = Image.new("RGB", img.size, IMAGE_BG)
        background.paste(img, mask=img.split()[-1] if "A" in img.getbands() else None)
        return background
    return img.convert("RGB")


def fit_to_square(img: Image.Image, size: int = SQUARE_SIZE) -> Image.Image:
    canvas = Image.new("RGB", (size, size), IMAGE_BG)
    fitted = ImageOps.contain(img, (size, size), method=Image.Resampling.LANCZOS)
    offset = ((size - fitted.width) // 2, (size - fitted.height) // 2)
    canvas.paste(fitted, offset)
    return canvas


def fit_contain(img: Image.Image, max_side: int = CONTAIN_MAX) -> Image.Image:
    if max(img.size) <= max_side:
        return img
    return ImageOps.contain(img, (max_side, max_side), method=Image.Resampling.LANCZOS)


def process_image(
    uploaded: UploadedFile | bytes | Path,
    *,
    subdir: str = "images",
    mode: str = "contain",
) -> tuple[InMemoryUploadedFile, str]:
    """
    Optimize an uploaded image and return (file, public media URL).
    mode: "square" (product cards) or "contain" (logos, covers, photos).
    """
    if not SAFE_SUBDIR.match(subdir or ""):
        subdir = "images"
    mode = (mode or "contain").lower()
    if mode not in ("square", "contain"):
        mode = "contain"

    img = _open_image(uploaded)
    processed = fit_to_square(img) if mode == "square" else fit_contain(img)

    buffer = io.BytesIO()
    processed.save(buffer, format="JPEG", quality=IMAGE_QUALITY, optimize=True)
    buffer.seek(0)

    filename = f"{uuid.uuid4().hex}.jpg"
    dest_dir = Path(settings.MEDIA_ROOT) / subdir
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / filename
    dest_path.write_bytes(buffer.getvalue())

    buffer.seek(0)
    django_file = InMemoryUploadedFile(
        buffer,
        field_name="image",
        name=filename,
        content_type="image/jpeg",
        size=buffer.getbuffer().nbytes,
        charset=None,
    )
    media_url = f"{settings.MEDIA_URL.rstrip('/')}/{subdir}/{filename}"
    return django_file, media_url


def process_product_image(uploaded: UploadedFile | bytes | Path) -> tuple[InMemoryUploadedFile, str]:
    """Back-compat wrapper for product square images."""
    return process_image(uploaded, subdir="products", mode="square")
