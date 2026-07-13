"""Fetch product catalog data from amarpet.com (Next.js __NEXT_DATA__)."""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from collections import deque
from typing import Any

BASE_URL = "https://amarpet.com"
USER_AGENT = "Mozilla/5.0 (compatible; KediSmartCatalogImporter/1.0)"

# AmarPet SSR pagination is broken (every page returns page 1), so we gather
# products from distinct category and brand URLs instead.
CATEGORY_SLUGS = [
    "dry-food",
    "kitten-food",
    "wet-food",
    "cat-litter",
    "cat-accessories",
    "cat-care-health",
    "cat-food",
    "clothing-beds-carrier",
    "catnip",
    "cat-house",
    "cat-bed",
    "cat-tick-flea-controls",
    "pet-supplements",
    "milk-replacer",
    "litter-essentials",
    "litter-box",
    "dog",
    "dog-food",
    "dog-adult-food",
    "puppy-food",
    "dog-care-health",
    "dog-accessories",
    "dog-toy",
    "dog-collar",
    "dog-harness",
    "dog-care-accessories",
    "bird",
    "bird-food",
    "rabbit",
    "rabbit-food",
    "rabbit-care-accessories",
    "offers",
]


def fetch_page_props(path: str, retries: int = 3) -> dict[str, Any]:
    url = path if path.startswith("http") else f"{BASE_URL}{path}"
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=60) as resp:
                html = resp.read().decode("utf-8", "replace")
            match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
            if not match:
                raise RuntimeError(f"No __NEXT_DATA__ in {path}")
            return json.loads(match.group(1))["props"]["pageProps"]
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Failed to fetch {path}: {last_error}")


def _add_product(store: dict[str, dict], product: dict | None) -> None:
    if not product or not product.get("slug"):
        return
    slug = product["slug"]
    if slug not in store:
        store[slug] = product
        return
    # Prefer records with images / richer variation data
    existing = store[slug]
    if not existing.get("main_picture") and product.get("main_picture"):
        store[slug] = product


def _products_from_page_props(page_props: dict) -> list[dict]:
    for key in ("categoryData", "offerData", "brandData"):
        block = page_props.get(key)
        if isinstance(block, dict) and block.get("products"):
            return block["products"]
    product = page_props.get("product")
    return [product] if product else []


def _discover_child_category_slugs(page_props: dict) -> list[str]:
    cd = page_props.get("categoryData") or {}
    cat = cd.get("category") or {}
    slugs = []
    for menu in cat.get("menus") or []:
        slug = menu.get("slug")
        if slug:
            slugs.append(slug)
    return slugs


def extract_prices(product: dict) -> tuple[float, float | None]:
    variation = product.get("default_variation") or product
    price = float(variation.get("price") or product.get("price") or 0)
    discount = float(variation.get("discount_amount") or product.get("discount_amount") or 0)
    offer_price = float(variation.get("offer_price") or product.get("offer_price") or 0)

    if offer_price > 0 and offer_price < price:
        return offer_price, price
    if discount > 0:
        return price, price + discount
    return price, None


def extract_stock(product: dict) -> int:
    stock = product.get("total_stock")
    if stock is None:
        variation = product.get("default_variation") or {}
        stock = variation.get("inventory")
    try:
        return max(0, int(stock or 0))
    except (TypeError, ValueError):
        return 0


def extract_brand(product: dict) -> str:
    brand = product.get("brand") or {}
    if isinstance(brand, dict):
        return (brand.get("name") or "").strip()
    return str(brand or "").strip()


def extract_category_slug(product: dict) -> str:
    categories = product.get("categories") or []
    if not categories:
        return "pet-supplies"
    first = categories[0]
    if isinstance(first, dict):
        return first.get("slug") or "pet-supplies"
    return "pet-supplies"


def extract_category_name(product: dict) -> str:
    categories = product.get("categories") or []
    if not categories:
        return "Pet Supplies"
    first = categories[0]
    if isinstance(first, dict):
        return (first.get("name") or "Pet Supplies").strip()
    return "Pet Supplies"


def extract_image_urls(product: dict) -> list[str]:
    urls: list[str] = []
    main = product.get("main_picture")
    if main:
        urls.append(main)
    for pic in product.get("pictures") or []:
        path = pic.get("path") if isinstance(pic, dict) else pic
        if path and path not in urls:
            urls.append(path)
    variation = product.get("default_variation") or {}
    for pic in variation.get("pictures") or []:
        path = pic.get("path") if isinstance(pic, dict) else pic
        if path and path not in urls:
            urls.append(path)
    return urls


def fetch_catalog(
    *,
    related_crawl_limit: int = 200,
    sleep_seconds: float = 0.15,
    progress=None,
) -> dict[str, dict]:
    """Return unique AmarPet products keyed by slug."""
    products: dict[str, dict] = {}

    def log(msg: str) -> None:
        if progress:
            progress(msg)

    log("Fetching homepage…")
    home = fetch_page_props("/")
    home_data = home.get("data") or {}

    for key in ("popular_products", "deal_products"):
        for item in home_data.get(key) or []:
            _add_product(products, item)

    for section in home_data.get("category_products") or []:
        for item in section.get("products") or []:
            _add_product(products, item)

    brand_slugs = [b.get("slug") for b in home_data.get("brand_sliders") or [] if b.get("slug")]
    log(f"Homepage sections: {len(products)} products, {len(brand_slugs)} brands")

    category_slugs: set[str] = set(CATEGORY_SLUGS)
    queue = deque(CATEGORY_SLUGS)
    seen_categories: set[str] = set()

    while queue:
        slug = queue.popleft()
        if slug in seen_categories:
            continue
        seen_categories.add(slug)
        category_slugs.add(slug)
        try:
            pp = fetch_page_props(f"/category/{slug}")
        except Exception as exc:  # noqa: BLE001
            log(f"  skip category {slug}: {exc}")
            continue

        batch = _products_from_page_props(pp)
        for item in batch:
            _add_product(products, item)

        for child in _discover_child_category_slugs(pp):
            if child not in seen_categories:
                queue.append(child)

        log(f"  category {slug}: +{len(batch)} (total {len(products)})")
        time.sleep(sleep_seconds)

    for slug in brand_slugs:
        try:
            pp = fetch_page_props(f"/brands/{slug}")
            batch = _products_from_page_props(pp)
            for item in batch:
                _add_product(products, item)
            log(f"  brand {slug}: +{len(batch)} (total {len(products)})")
        except Exception as exc:  # noqa: BLE001
            log(f"  skip brand {slug}: {exc}")
        time.sleep(sleep_seconds)

    log(f"Crawling related products (up to {related_crawl_limit} pages)…")
    visit_queue = deque(list(products.keys()))
    visited: set[str] = set()
    while visit_queue and len(visited) < related_crawl_limit:
        slug = visit_queue.popleft()
        if slug in visited:
            continue
        visited.add(slug)
        try:
            pp = fetch_page_props(f"/product/{slug}")
        except Exception:
            continue
        detail = pp.get("product")
        if detail:
            _add_product(products, detail)
        for related in pp.get("relatedProducts") or []:
            _add_product(products, related)
            rel_slug = related.get("slug")
            if rel_slug and rel_slug not in visited:
                visit_queue.append(rel_slug)
        time.sleep(sleep_seconds)

    log(f"Collected {len(products)} unique products from {len(category_slugs)} categories")
    return products
