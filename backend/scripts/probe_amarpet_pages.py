import json
import re
import urllib.request

BASE = "https://amarpet.com"


def fetch_products(path: str) -> list:
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "Mozilla/5.0"})
    html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
    data = json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S).group(1))
    pp = data["props"]["pageProps"]
    cd = pp.get("categoryData") or pp.get("offerData") or {}
    return cd.get("products") or []


for page in [1, 2, 3]:
    prods = fetch_products(f"/category/dog-food?page={page}")
    slugs = [p["slug"] for p in prods]
    print(f"page {page}: count={len(slugs)} first={slugs[0] if slugs else None} last={slugs[-1] if slugs else None}")

print("--- offers ---")
for page in [1, 2]:
    prods = fetch_products(f"/offers?page={page}")
    slugs = [p["slug"] for p in prods]
    print(f"offers page {page}: count={len(slugs)} first={slugs[0] if slugs else None}")
