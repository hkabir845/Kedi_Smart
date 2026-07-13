"""Optimize product images — re-exports shared processor."""

from config.media_images import (  # noqa: F401
    CONTAIN_MAX,
    SQUARE_SIZE,
    fit_contain,
    fit_to_square,
    process_image,
    process_product_image,
)

PRODUCT_IMAGE_SIZE = SQUARE_SIZE
PRODUCT_IMAGE_SUBDIR = "products"
