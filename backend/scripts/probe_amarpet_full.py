import json
import re
import urllib.request
from collections import deque

BASE = "https://amarpet.com"


def fetch_page_props(path: str) -> dict:
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "Mozilla/5.0"})
    html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
    return json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S).group(1))["props"]["pageProps"]


def extract_menus(category_data: dict) -> list:
    cat = category_data.get("category") or {}
    return cat.get("menus") or []


def collect_category_slugs(start_slugs: list) -> set:
    seen = set()
    queue = deque(start_slugs)
    all_slugs = set()

    while queue:
        slug = queue.popleft()
        if slug in seen:
            continue
        seen.add(slug)
        try:
            pp = fetch_page_props(f"/category/{slug}")
        except Exception as e:
            print("skip category", slug, e)
            continue
        cd = pp.get("categoryData") or {}
        all_slugs.add(slug)
        for menu in extract_menus(cd):
            child = menu.get("slug")
            if child:
                queue.append(child)
        print("category", slug, "products", len(cd.get("products") or []), "menus", len(extract_menus(cd)))

    return all_slugs


starts = ["dry-food", "cat-litter", "dog", "bird", "rabbit", "offers"]
slugs = collect_category_slugs(starts)
print("TOTAL CATEGORIES", len(slugs))
print(sorted(slugs))

# count unique products across categories
products = {}
for slug in sorted(slugs):
    try:
        pp = fetch_page_props(f"/category/{slug}")
        for p in (pp.get("categoryData") or {}).get("products") or []:
            products[p["slug"]] = p["name"]
    except Exception:
        pass
print("UNIQUE PRODUCTS from categories", len(products))

# brand page test
pp = fetch_page_props("/brands/billi")
print("brand keys", pp.keys())
