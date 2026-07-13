import json
import re
import urllib.request

req = urllib.request.Request(
    "https://amarpet.com/product/billi-adult-dry-cat-food-real-tuna-3kg",
    headers={"User-Agent": "Mozilla/5.0"},
)
html = urllib.request.urlopen(req, timeout=60).read().decode("utf-8", "replace")
pp = json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S).group(1))["props"]["pageProps"]
prod = pp["product"]
print("product keys", prod.keys())
print("desc snippet", (prod.get("description") or prod.get("short_description") or "")[:200])
print("related", len(pp.get("relatedProducts") or []))
