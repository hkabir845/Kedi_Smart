import json
import urllib.request

BASE = "https://amarpet.com"


def try_url(url, method="GET", data=None):
    headers = {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}
    if data is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(data).encode()
    else:
        body = None
    req = urllib.request.Request(url, headers=headers, data=body, method=method)
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        text = resp.read().decode()
        print("OK", url, text[:200])
        return json.loads(text)
    except Exception as e:
        print("FAIL", url, e)
        return None


for page in [1, 2]:
    try_url(f"{BASE}/api/v1/categories/dog-food?page={page}")
    try_url(f"{BASE}/api/v1/categories/dog-food/products?page={page}&limit=32")
    try_url(f"{BASE}/api/v1/categories/dog-food/products?skip={32*(page-1)}&limit=32")

try_url(f"{BASE}/api/v1/categories/dog-food/products", method="POST", data={"page": 2, "limit": 32})

# product detail page
import re
req = urllib.request.Request(f"{BASE}/product/billi-adult-dry-cat-food-real-tuna-3kg", headers={"User-Agent": "Mozilla/5.0"})
html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
data = json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S).group(1))
pp = data["props"]["pageProps"]
print("product page keys", pp.keys())
