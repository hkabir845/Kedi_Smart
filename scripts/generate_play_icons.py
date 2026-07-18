"""Generate PWA + Play Store icons from brand mark."""
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parents[1] / "frontend" / "public"
src = root / "brand" / "kedismart-mark.png"
if not src.exists():
    src = root / "brand" / "kedismart-logo.png"

img = Image.open(src).convert("RGBA")
out_dir = root / "icons"
out_dir.mkdir(parents=True, exist_ok=True)
play_dir = root / "play"
play_dir.mkdir(parents=True, exist_ok=True)


def square_contain(im: Image.Image, size: int, bg, pad_ratio: float = 0.12) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), bg)
    max_side = int(size * (1 - 2 * pad_ratio))
    im2 = im.copy()
    im2.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    x = (size - im2.width) // 2
    y = (size - im2.height) // 2
    canvas.paste(im2, (x, y), im2)
    return canvas


for size in (192, 512):
    any_icon = square_contain(img, size, bg=(249, 250, 251, 255), pad_ratio=0.08)
    maskable = square_contain(img, size, bg=(13, 148, 136, 255), pad_ratio=0.18)
    any_icon.save(out_dir / f"icon-{size}.png", "PNG")
    maskable.save(out_dir / f"icon-maskable-{size}.png", "PNG")
    print("wrote", size)

fg = Image.new("RGBA", (1024, 500), (13, 148, 136, 255))
logo = img.copy()
logo.thumbnail((280, 280), Image.Resampling.LANCZOS)
fg.paste(logo, ((1024 - logo.width) // 2, (500 - logo.height) // 2), logo)
fg.convert("RGB").save(play_dir / "feature-graphic.png", "PNG")
square_contain(img, 512, bg=(13, 148, 136, 255), pad_ratio=0.12).save(
    play_dir / "icon-512.png", "PNG"
)
print("done", out_dir, play_dir)
