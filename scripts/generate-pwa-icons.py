"""Genera iconos PWA del manifest. Diseño simple: gradiente azul + 'PL' (Poweria Legal)."""
from PIL import Image, ImageDraw, ImageFont
import os

OUT_DIR = "frontend/public/icons"
os.makedirs(OUT_DIR, exist_ok=True)

SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

def make_icon(size: int, path: str) -> None:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Gradiente azul → púrpura (manualmente fila a fila)
    for y in range(size):
        t = y / (size - 1)
        r = int(99 * (1 - t) + 124 * t)   # 6366f1 → 7c3aed
        g = int(102 * (1 - t) + 58 * t)
        b = int(241 * (1 - t) + 237 * t)
        d.line([(0, y), (size, y)], fill=(r, g, b, 255))

    # Esquinas redondeadas
    radius = max(6, int(size * 0.18))
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    img.putalpha(mask)

    # Texto "PL" centrado en blanco
    text = "PL"
    try:
        font = ImageFont.truetype("arial.ttf", int(size * 0.5))
    except OSError:
        try:
            font = ImageFont.truetype("DejaVuSans-Bold.ttf", int(size * 0.5))
        except OSError:
            font = ImageFont.load_default()

    d2 = ImageDraw.Draw(img)
    bbox = d2.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (size - tw) // 2 - bbox[0]
    ty = (size - th) // 2 - bbox[1]
    d2.text((tx, ty), text, fill=(255, 255, 255, 240), font=font)

    img.save(path, "PNG")
    print(f"  wrote {path} ({size}x{size})")

def main() -> None:
    for s in SIZES:
        path = os.path.join(OUT_DIR, f"icon-{s}x{s}.png")
        make_icon(s, path)
    # favicon
    make_icon(64, "frontend/public/favicon.png")
    print("Done.")

if __name__ == "__main__":
    main()
