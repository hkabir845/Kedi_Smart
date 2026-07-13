import json
import re
import urllib.request

BASE = "https://amarpet.com"


def fetch_next_data(path: str) -> dict:
    url = BASE + path
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not m:
        raise RuntimeError(f"No __NEXT_DATA__ at {path}")
    return json.loads(m.group(1))["props"]["pageProps"]


home = fetch_next_data("/")
print("home keys", home.keys())

slugs = set()


def collect_slugs(obj):
    if isinstance(obj, dict):
        if "slug" in obj and isinstance(obj.get("slug"), str):
            s = obj["slug"]
            if s and not s.startswith("http"):
                slugs.add(s)
        for v in obj.values():
            collect_slugs(v)
    elif isinstance(obj, list):
        for item in obj:
            collect_slugs(item)


collect_slugs(home)
cat_slugs = sorted(s for s in slugs if "-" in s or s in ("dog", "bird", "rabbit"))
print("slug count", len(slugs))
print("sample slugs", sorted(slugs)[:40])

# test category pagination total
pp = fetch_next_data("/category/dog-food?page=1")
cd = pp["categoryData"]
print("dog-food total", cd.get("total"), "products on page", len(cd["products"]))

pp2 = fetch_next_data("/category/dog-food?page=2")
cd2 = pp2["categoryData"]
print("page2 first", cd2["products"][0]["slug"] if cd2["products"] else None)
