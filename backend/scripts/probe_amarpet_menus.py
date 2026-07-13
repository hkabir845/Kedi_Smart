import json
import re
import urllib.request

BASE = "https://amarpet.com"
req = urllib.request.Request(BASE + "/", headers={"User-Agent": "Mozilla/5.0"})
html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
home = json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S).group(1))["props"]["pageProps"]

data = home.get("data", {})
print("data keys", data.keys())

menus = data.get("menus") or data.get("headerMenus") or []
print("menus type", type(menus), len(menus) if isinstance(menus, list) else "")


def print_menu(items, depth=0):
    for item in items or []:
        if not isinstance(item, dict):
            continue
        slug = item.get("slug") or item.get("full_path")
        name = item.get("name")
        children = item.get("children") or item.get("menus") or item.get("subMenus") or []
        print("  " * depth + f"- {name} -> {slug} ({len(children)} children)")
        print_menu(children, depth + 1)


if isinstance(menus, list):
    print_menu(menus)
else:
    for k, v in data.items():
        if isinstance(v, list) and v and isinstance(v[0], dict) and ("slug" in v[0] or "name" in v[0]):
            print("LIST KEY", k, len(v))
            print_menu(v[:3])

# save compact menus
with open("scripts/amarpet_menus.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
print("saved menus json")
