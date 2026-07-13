import json
import re
import urllib.request

url = "https://amarpet.com/category/dog-food?page=1"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")

m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
data = json.loads(m.group(1))
page_props = data["props"]["pageProps"]
print("pageProps keys:", list(page_props.keys())[:20])


def walk(obj, path=""):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in ("products", "items", "productList", "data", "results"):
                print("FOUND", path + "." + k, type(v), len(v) if isinstance(v, list) else "")
            walk(v, path + "." + k)
    elif isinstance(obj, list) and obj and isinstance(obj[0], dict):
        keys = set(obj[0].keys())
        if {"name", "price"} & keys or {"title", "price"} & keys or {"slug"} & keys:
            print("LIST at", path, "len", len(obj), "keys", keys)


walk(page_props)

with open("scripts/amarpet_pageprops_sample.json", "w", encoding="utf-8") as f:
    json.dump(page_props, f, indent=2, ensure_ascii=False)
print("saved sample")
