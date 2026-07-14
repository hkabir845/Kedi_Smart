"""Fetch Amazon.com most-moving (bestseller) product data for General catalog import."""

from __future__ import annotations

import html as html_lib
import re
import time
import urllib.error
import urllib.request
from typing import Any, Callable
from urllib.parse import unquote

DESKTOP_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)
MOBILE_UA = (
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
)
# Soft session cookies reduce Amazon soft-block / empty PDP responses
_AMAZON_COOKIE = "i18n-prefs=USD; lc-main=en_US"

# Non-pet Amazon bestseller departments → KediSmart general categories
BESTSELLER_SOURCES: list[tuple[str, str, str]] = [
    ("Electronics", "electronics", "https://www.amazon.com/Best-Sellers-Electronics/zgbs/electronics/"),
    ("Home & Living", "home-garden", "https://www.amazon.com/Best-Sellers-Home-Kitchen/zgbs/home-garden/"),
    ("Health & Beauty", "beauty", "https://www.amazon.com/Best-Sellers-Beauty-Personal-Care/zgbs/beauty/"),
    ("Fashion", "fashion", "https://www.amazon.com/Best-Sellers-Clothing-Shoes-Jewelry/zgbs/fashion/"),
    ("Sports & Outdoors", "sports", "https://www.amazon.com/Best-Sellers-Sports-Outdoors/zgbs/sporting-goods/"),
    ("Books & Stationery", "office", "https://www.amazon.com/Best-Sellers-Office-Products/zgbs/office-products/"),
]


def _fetch(url: str, *, mobile: bool = False, retries: int = 3) -> str:
    headers = {
        "User-Agent": MOBILE_UA if mobile else DESKTOP_UA,
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Encoding": "identity",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Referer": "https://www.amazon.com/",
        "Cookie": _AMAZON_COOKIE,
    }
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=45) as resp:
                html = resp.read().decode("utf-8", "replace")
            # Soft-block / captcha pages are tiny; retry once more as desktop
            if len(html) < 20000 and attempt + 1 < retries and not mobile:
                time.sleep(1.5 * (attempt + 1))
                continue
            return html
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            time.sleep(1.2 * (attempt + 1))
    raise RuntimeError(f"Failed to fetch {url}: {last_error}")


def _clean(text: str | None) -> str:
    if not text:
        return ""
    text = html_lib.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def upgrade_image_url(url: str | None) -> str | None:
    if not url:
        return None
    url = html_lib.unescape(url.strip())
    # Prefer a large catalog image (`._AC_SL1500_.`)
    if re.search(r"\._AC_[^.]+\.", url):
        return re.sub(r"\._AC_[^.]+\.", "._AC_SL1500_.", url)
    # Bare /images/I/XYZ.jpg → /images/I/XYZ._AC_SL1500_.jpg
    return re.sub(r"(\.(?:jpe?g|png|webp))(?:\?.*)?$", r"._AC_SL1500_\1", url, flags=re.I)


def _is_weak_amazon_image(url: str) -> bool:
    """True for sprites, logos, or tiny thumbs that make poor product photos."""
    u = url.lower()
    if "_sp100" in u or "sprite" in u or "play-icon" in u:
        return True
    # Amazon brand/logo assets often use short image IDs starting with digits like 21/31/41…
    m = re.search(r"/images/I/([A-Za-z0-9+\-_]+)", url)
    if m and len(m.group(1)) <= 12 and m.group(1)[0].isdigit():
        return True
    return False


def extract_product_images(html: str, *, limit: int = 6) -> list[str]:
    """Pick the best product photo URLs from an Amazon PDP HTML body."""
    candidates: list[str] = []

    # Landing/dynamic image JSON (best quality)
    for key in ("hiRes", "large", "mainUrl", "url"):
        for match in re.finditer(rf'"{key}"\s*:\s*"(https:[^"]+/images/I/[^"]+)"', html):
            candidates.append(html_lib.unescape(match.group(1)))

    # Generic media URLs in page
    candidates.extend(
        html_lib.unescape(u)
        for u in re.findall(
            r'(https://(?:m\.media-amazon\.com|images-na\.ssl-images-amazon\.com)/images/I/[A-Za-z0-9+\-_%.]+?\.(?:jpg|jpeg|png|webp))',
            html,
            re.I,
        )
    )

    # og:image
    og = re.search(r'<meta\s+property="og:image"\s+content="([^"]+)"', html, re.I)
    if og:
        candidates.insert(0, html_lib.unescape(og.group(1)))

    seen: set[str] = set()
    picked: list[str] = []
    for raw in candidates:
        upgraded = upgrade_image_url(raw)
        if not upgraded or _is_weak_amazon_image(upgraded):
            continue
        # Deduplicate by image id (strip size tokens)
        key = re.sub(r"\._AC_[^.]+\.", ".", upgraded)
        if key in seen:
            continue
        seen.add(key)
        picked.append(upgraded)
        if len(picked) >= limit:
            break
    return picked


def parse_bestsellers_page(html: str, category: str) -> list[dict[str, Any]]:
    products: list[dict[str, Any]] = []
    seen: set[str] = set()

    for match in re.finditer(
        r'<div id="([A-Z0-9]{10})" class="p13n-sc-uncoverable-faceout">(.*?)</div></div></div></span></div>',
        html,
        re.S,
    ):
        asin = match.group(1)
        if asin in seen:
            continue
        block = match.group(2)

        title = re.search(r'p13n-sc-css-line-clamp[^"]*"[^>]*>\s*([^<]+)', block)
        if not title:
            title = re.search(r'alt="([^"]{8,300})"', block)
        title_text = _clean(title.group(1) if title else "")
        if not title_text:
            href = re.search(rf'href="(/[^"]+/dp/{asin}[^"]*)"', block)
            if href:
                slug = unquote(href.group(1).split("/dp/")[0].rstrip("/").split("/")[-1])
                title_text = slug.replace("-", " ").strip()
        if not title_text:
            continue

        img = re.search(r'src="(https://images[^"]+\.(?:jpg|jpeg|png|webp))"', block, re.I)
        image = upgrade_image_url(img.group(1) if img else None)

        products.append(
            {
                "asin": asin,
                "title": title_text[:255],
                "category": category,
                "image": image,
                "source": "amazon_bestsellers",
            }
        )
        seen.add(asin)

    return products


_DEPARTMENT_TITLES = {
    "electronics",
    "home & kitchen",
    "home and kitchen",
    "beauty & personal care",
    "amazon devices & accessories",
    "amazon devices and accessories",
    "clothing, shoes & jewelry",
    "sports & outdoors",
    "office products",
    "pet supplies",
    "books",
}


def _looks_like_department(title: str) -> bool:
    t = title.strip().lower()
    return t in _DEPARTMENT_TITLES or (len(t) < 28 and " & " in t and " with " not in t)


def _is_pet_listing(title: str, category: str) -> bool:
    blob = f"{title} {category}".lower()
    return any(
        word in blob
        for word in (
            "pet supplies",
            "dog food",
            "cat litter",
            "dog toy",
            "cat toy",
            "puppy",
            "kitten",
        )
    )


def collect_bestsellers(
    *,
    limit: int = 100,
    progress: Callable[[str], None] | None = None,
) -> list[dict[str, Any]]:
    """Collect unique bestseller listings across general departments (balanced)."""
    log = progress or (lambda _msg: None)
    # Over-fetch so enrich can drop unpriced / low-quality items later.
    target = max(limit * 3, limit + 80)
    by_source: dict[str, list[dict[str, Any]]] = {cat: [] for cat, _, _ in BESTSELLER_SOURCES}
    seen: set[str] = set()

    for page in (1, 2):
        for category, _slug, url in BESTSELLER_SOURCES:
            total = sum(len(v) for v in by_source.values())
            if total >= target:
                break
            page_url = url if page == 1 else f"{url.rstrip('/')}/ref=zg_bs_pg_{page}?_encoding=UTF8&pg={page}"
            log(f"Fetching bestsellers: {category} page {page}")
            try:
                html = _fetch(page_url)
            except Exception as exc:  # noqa: BLE001
                log(f"  skip {category} p{page}: {exc}")
                continue
            batch = parse_bestsellers_page(html, category)
            added = 0
            for item in batch:
                if item["asin"] in seen:
                    continue
                if _is_pet_listing(item["title"], item["category"]):
                    continue
                if _looks_like_department(item["title"]):
                    continue
                seen.add(item["asin"])
                by_source[category].append(item)
                added += 1
            log(f"  +{added} (source total {len(by_source[category])})")
            time.sleep(0.8)

    # Round-robin merge for department diversity
    collected: list[dict[str, Any]] = []
    queues = [list(items) for items in by_source.values() if items]
    while queues and len(collected) < target:
        next_queues = []
        for q in queues:
            if not q:
                continue
            collected.append(q.pop(0))
            if q:
                next_queues.append(q)
            if len(collected) >= target:
                break
        queues = next_queues

    log(f"Collected {len(collected)} candidate listings")
    return collected


def enrich_product(item: dict[str, Any]) -> dict[str, Any]:
    """Fetch Amazon PDP for USD price, brand, bullets, images, and videos."""
    asin = item["asin"]
    listing_title = item.get("title") or ""
    # Desktop PDP includes full image set + HLS video metadata (mobile often lacks videos).
    html = _fetch(f"https://www.amazon.com/dp/{asin}")
    if len(html) < 20000:
        # Soft-block fallback once via mobile detail
        html = _fetch(f"https://www.amazon.com/gp/aw/d/{asin}", mobile=True)

    detail_title = ""
    title_meta = re.search(r'<meta name="title" content="([^"]+)"', html)
    if title_meta:
        raw = html_lib.unescape(title_meta.group(1))
        parts = [p.strip() for p in raw.split(" : ") if p.strip()]
        if len(parts) >= 2 and parts[0].lower().startswith("amazon"):
            detail_title = parts[1][:255]
        elif parts:
            detail_title = parts[0].replace("Amazon.com", "").strip(" :-")[:255]

    if detail_title and not _looks_like_department(detail_title):
        # Prefer longer/detail title when listing was truncated
        if len(detail_title) >= max(18, len(listing_title) - 10):
            item["title"] = detail_title
    elif listing_title:
        item["title"] = listing_title
    elif detail_title:
        item["title"] = detail_title

    price = None
    total_price = re.search(
        r'id="tp_price_block_total_price_ww"[^>]*>\s*<span class="a-offscreen">\s*\$([0-9,]+\.[0-9]{2})',
        html,
    )
    if total_price:
        price = float(total_price.group(1).replace(",", ""))
    if price is None:
        pay = re.search(
            r'priceToPay[^>]*>.*?class="a-price-whole">([0-9,]+).*?class="a-price-fraction">([0-9]{2})',
            html,
            re.S,
        )
        if pay:
            price = float(f"{pay.group(1).replace(',', '')}.{pay.group(2)}")
    if price is None:
        core = re.search(
            r'data-a-color="price"[^>]*>.*?a-offscreen">\s*\$([0-9,]+\.[0-9]{2})',
            html,
            re.S,
        )
        if core:
            price = float(core.group(1).replace(",", ""))
    if price is None:
        for match in re.finditer(r'a-offscreen">\s*\$([0-9,]+\.[0-9]{2})\s*<', html):
            value = float(match.group(1).replace(",", ""))
            if value >= 1.0:
                price = value
                break
    item["price_usd"] = price

    brand = None
    brand_match = re.search(r"Visit the ([^<:]+?) Store", html)
    if brand_match:
        brand = _clean(brand_match.group(1))
        if brand.lower() in {"amazon", "store"}:
            brand = None
    if not brand:
        brand_match = re.search(r'id="sellerProfileTriggerId"[^>]*>\s*([^<]+)', html)
        if brand_match:
            brand = _clean(brand_match.group(1))
    if not brand and item.get("title"):
        # e.g. "Amazon Basics ..." → Amazon Basics
        words = item["title"].split()
        brand = " ".join(words[:2]) if words and words[0].lower() == "amazon" else words[0]
    item["brand"] = (brand or "Amazon")[:255]

    feature_block = re.search(r'id="feature-bullets"[^>]*>(.*?)</div>\s*</div>', html, re.S)
    bullets: list[str] = []
    if feature_block:
        bullets = [
            _clean(b)
            for b in re.findall(r'<span class="a-list-item">\s*([^<]{12,500})', feature_block.group(1))
        ]

    if bullets:
        item["description"] = "\n".join(f"- {b}" for b in bullets[:8])
    else:
        desc_meta = re.search(r'<meta name="description" content="([^"]+)"', html)
        desc = _clean(html_lib.unescape(desc_meta.group(1))) if desc_meta else ""
        if desc and not _looks_like_department(desc):
            item["description"] = desc
        else:
            item["description"] = item["title"]

    # Prefer primary product photo slots (hiRes/large), skip logos/sprites
    photos = extract_product_images(html, limit=6)
    if not photos:
        photos = asin_cdn_image_urls(asin, count=4)
    if photos:
        item["image"] = photos[0]
        item["images"] = photos

    item["videos"] = extract_product_videos(html, limit=6)

    item["detail_url"] = f"https://www.amazon.com/dp/{asin}"
    return item


def fetch_catalog(
    *,
    limit: int = 100,
    progress: Callable[[str], None] | None = None,
    enrich: bool = True,
) -> list[dict[str, Any]]:
    log = progress or (lambda _msg: None)
    listings = collect_bestsellers(limit=limit, progress=log)
    if not enrich:
        return listings[:limit]

    selected: list[dict[str, Any]] = []
    for idx, item in enumerate(listings, start=1):
        if len(selected) >= limit:
            break
        log(f"Enriching {idx}/{len(listings)} {item['asin']} (kept {len(selected)}/{limit})")
        try:
            enriched = enrich_product(dict(item))
        except Exception as exc:  # noqa: BLE001
            log(f"  enrich failed for {item['asin']}: {exc}")
            continue
        if not enriched.get("price_usd"):
            log(f"  skip {item['asin']}: no USD price")
            continue
        if _looks_like_department(enriched.get("title") or ""):
            log(f"  skip {item['asin']}: department-like title")
            continue
        if _is_pet_listing(enriched.get("title") or "", enriched.get("category") or ""):
            log(f"  skip {item['asin']}: pet listing")
            continue
        selected.append(enriched)
        time.sleep(0.55)

    log(f"Ready to import {len(selected)} priced products")
    return selected


def asin_cdn_image_urls(asin: str, *, count: int = 4) -> list[str]:
    """Amazon still serves durable main photos via /images/P/{ASIN}.NN.LZZZZZZZ.jpg."""
    asin = (asin or "").strip().upper()
    if not asin:
        return []
    urls: list[str] = []
    for idx in range(1, max(1, count) + 1):
        urls.append(f"https://m.media-amazon.com/images/P/{asin}.{idx:02d}.LZZZZZZZ.jpg")
    return urls


def extract_product_videos(html: str, *, limit: int = 6) -> list[dict[str, Any]]:
    """
    Parse Amazon PDP video objects (HLS + poster).
    Returns [{video_url, poster_url, title, duration_seconds}, ...]
    """
    videos: list[dict[str, Any]] = []
    seen: set[str] = set()

    # Walk each HLS URL and scoop nearby metadata from a local window.
    for match in re.finditer(
        r'https://[^"\s]+vse-vms[^"\s]+\.m3u8',
        html,
        re.I,
    ):
        video_url = html_lib.unescape(match.group(0))
        if video_url in seen:
            continue
        # Skip Amazon mouseover preview streams
        if "gandalf_preview" in video_url:
            continue
        # Prefer landscape jobtemplate over duplicate .vertical. for same uuid when both exist
        if ".vertical.jobtemplate." in video_url:
            landscape = video_url.replace(
                ".vertical.jobtemplate.hls.m3u8", ".jobtemplate.hls.m3u8"
            )
            # Skip vertical if landscape also appears in page (we'll pick landscape later)
            if landscape in html:
                continue
        # Prefer dropping very short "Amazon Splash" bumpers when metadata suggests it
        start = max(0, match.start() - 900)
        end = min(len(html), match.end() + 900)
        window = html[start:end]

        poster = ""
        pm = re.search(r'"slateUrl"\s*:\s*"(https://[^"]+)"', window)
        if pm:
            poster = upgrade_image_url(html_lib.unescape(pm.group(1))) or ""
        if not poster:
            pm = re.search(
                r'"(?:thumbnailUrl)"\s*:\s*"(https://[^"]+/images/I/[^"]+\.(?:jpg|jpeg|png)[^"]*)"',
                window,
                re.I,
            )
            if pm:
                poster = upgrade_image_url(html_lib.unescape(pm.group(1))) or ""

        title = "Product video"
        tm = re.search(r'"title"\s*:\s*"([^"]{3,120})"', window)
        if tm:
            title = _clean(html_lib.unescape(tm.group(1)))[:255] or title
        # Skip Amazon brand / splash-only clips
        if re.search(r"\bamazon\b", title, re.I) and not re.search(
            r"\b(product|overview|how|review|demo|hands)\b", title, re.I
        ):
            continue

        duration = None
        dm = re.search(r'"durationSeconds"\s*:\s*(\d+)', window)
        if dm:
            duration = int(dm.group(1))
        if duration is None:
            dm = re.search(r'"durationTimestamp"\s*:\s*"(\d+):(\d+)"', window)
            if dm:
                duration = int(dm.group(1)) * 60 + int(dm.group(2))

        seen.add(video_url)
        videos.append(
            {
                "video_url": video_url[:800],
                "poster_url": poster[:500],
                "title": title,
                "duration_seconds": duration,
            }
        )
        if len(videos) >= limit:
            break

    # Landscape first for gallery quality
    videos.sort(key=lambda v: 1 if ".vertical." in (v.get("video_url") or "") else 0)
    return videos


def download_image(url: str, dest_path) -> bool:
    """Download a remote image to dest_path. Returns True on success."""
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": DESKTOP_UA, "Accept": "image/avif,image/webp,image/*,*/*;q=0.8"},
        )
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = resp.read()
        if len(data) < 500:
            return False
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        dest_path.write_bytes(data)
        return True
    except (urllib.error.URLError, TimeoutError, OSError):
        return False
