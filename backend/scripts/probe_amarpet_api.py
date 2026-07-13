import json
import re
import urllib.request

BASE = "https://amarpet.com"


def fetch_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        return json.loads(resp.read().decode())
    except Exception as e:
        return str(e)


# find api paths in category page html
req = urllib.request.Request(BASE + "/category/dog-food", headers={"User-Agent": "Mozilla/5.0"})
html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
apis = sorted(set(re.findall(r"/api/[a-zA-Z0-9/_-]+", html)))
print("api paths found", apis[:30])

for path in apis[:15]:
    print(path, "->", fetch_json(BASE + path) if not path.endswith(".js") else "skip")

# common patterns
candidates = [
    "/api/products?category=dog-food&page=2",
    "/api/v1/products?category=dog-food&page=2",
    "/api/category/dog-food/products?page=2",
]
for c in candidates:
    print(c, fetch_json(BASE + c))
