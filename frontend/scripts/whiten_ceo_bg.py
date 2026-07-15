from PIL import Image
from collections import deque
from pathlib import Path

src = Path(r"I:\ITProjects\Kedi_Smart\frontend\public\brand\jahura-satter-ceo.png")
# Re-copy from original asset if needed for a clean pass
original = Path(
    r"C:\Users\MT\.cursor\projects\i-ITProjects-GAIMS\assets"
    r"\c__Users_MT_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images"
    r"\image-cdee26cf-b235-42a6-b8e0-59a73bb9e3e1.png"
)
if original.exists():
    img = Image.open(original).convert("RGBA")
else:
    img = Image.open(src).convert("RGBA")

w, h = img.size
px = img.load()


def is_bg(r, g, b, a):
    return a > 0 and r < 40 and g < 40 and b < 40


visited = [[False] * w for _ in range(h)]
q = deque()

for x in range(w):
    for y in (0, h - 1):
        r, g, b, a = px[x, y]
        if is_bg(r, g, b, a):
            q.append((x, y))
            visited[y][x] = True
for y in range(h):
    for x in (0, w - 1):
        r, g, b, a = px[x, y]
        if is_bg(r, g, b, a) and not visited[y][x]:
            q.append((x, y))
            visited[y][x] = True

changed = 0
while q:
    x, y = q.popleft()
    px[x, y] = (255, 255, 255, 255)
    changed += 1
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
            r, g, b, a = px[nx, ny]
            if is_bg(r, g, b, a):
                visited[ny][nx] = True
                q.append((nx, ny))

img.save(src, optimize=True)
print(f"saved {src} changed={changed} bytes={src.stat().st_size}")
