import json
import re
import urllib.request
from collections import deque

BASE = "https://amarpet.com"


def fetch_page_props(path: str) -> dict:
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "Mozilla/5.0"})
    html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
    return json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S).group(1))["props"]["pageProps"]


def add_product(store: dict, p: dict):
    if p and p.get("slug"):
        store[p["slug"]] = p


# categories
CATEGORY_SLUGS = [
    "dry-food", "kitten-food", "cat-litter", "cat-accessories", "cat-care-health",
    "cat-food", "wet-food", "clothing-beds-carrier", "catnip", "cat-house", "cat-bed",
    "cat-tick-flea-controls", "pet-supplements", "milk-replacer",
    "dog", "dog-food", "dog-adult-food", "puppy-food", "dog-care-health", "dog-accessories",
    "dog-toy", "dog-collar", "dog-harness", "dog-care-accessories",
    "bird", "bird-food", "rabbit", "rabbit-food", "rabbit-care-accessories",
    "litter-essentials", "litter-box", "offers",
]

products = {}

# homepage sections
home = fetch_page_props("/")["data"]
for key in ["popular_products", "deal_products"]:
    for p in home.get(key) or []:
        add_product(products, p)
for section in home.get("category_products") or []:
    for p in section.get("products") or []:
        add_product(products, p)
print("after home", len(products))

for slug in CATEGORY_SLUGS:
    try:
        pp = fetch_page_props(f"/category/{slug}")
        cd = pp.get("categoryData") or pp.get("offerData") or {}
        for p in cd.get("products") or []:
            add_product(products, p)
    except Exception as e:
        print("cat fail", slug, e)
print("after categories", len(products))

# brands from homepage
brand_slugs = [b["slug"] for b in home.get("brand_sliders") or [] if b.get("slug")]
print("brands", len(brand_slugs))
for slug in brand_slugs:
    try:
        pp = fetch_page_props(f"/brands/{slug}")
        bd = pp.get("brandData") or {}
        for p in bd.get("products") or []:
            add_product(products, p)
    except Exception as e:
        print("brand fail", slug, e)
print("after brands", len(products))

# crawl related products (limited BFS)
queue = deque(list(products.keys())[:50])
visited = set()
while queue and len(visited) < 120:
    slug = queue.popleft()
    if slug in visited:
        continue
    visited.add(slug)
    try:
        pp = fetch_page_props(f"/product/{slug}")
        for p in pp.get("relatedProducts") or []:
            add_product(products, p)
            if p.get("slug") not in visited:
                queue.append(p["slug"])
    except Exception:
        pass
print("after related crawl", len(products), "visited", len(visited))
