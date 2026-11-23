"""Put an AI-generated photo into the site.

Usage: python add_image.py <number 01-32 from PROMPTS.md> <image path> [--gemini]

Center-crops to 9:16, resizes to 1080x1920, saves img/<code>.jpg under ~500KB.
--gemini covers Gemini's sparkle watermark (bottom-right) with the patch just left of it.
"""
import io
import sys
from pathlib import Path

from PIL import Image, ImageOps

W, H, MAX_BYTES = 1080, 1920, 500_000


def remove_gemini_mark(img):
    # Sparkle sits ~97-144px from the right and bottom edges on a 768px-wide image.
    s = img.width / 768
    a, b = round(90 * s), round(152 * s)
    w = b - a
    box = (img.width - b, img.height - b, img.width - a, img.height - a)
    img.paste(img.crop((box[0] - w, box[1], box[2] - w, box[3])), box)


def main(num, src, gemini=False):
    n = int(num)
    if not 1 <= n <= 32:
        sys.exit('number must be 01-32')
    code = format(32 - n, '05b')  # PROMPTS.md lists types from 11111 down to 00000

    img = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
    if gemini:
        remove_gemini_mark(img)
    img = ImageOps.fit(img, (W, H), Image.LANCZOS)

    for q in range(88, 50, -6):
        buf = io.BytesIO()
        img.save(buf, 'JPEG', quality=q, optimize=True, progressive=True)
        if buf.tell() <= MAX_BYTES:
            break

    out = Path(__file__).parent / 'img' / f'{code}.jpg'
    out.parent.mkdir(exist_ok=True)
    out.write_bytes(buf.getvalue())
    print(f'{n:02d} -> {out.relative_to(Path(__file__).parent)} ({buf.tell() // 1024}KB, q={q})')


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if a != '--gemini']
    if len(args) != 2:
        sys.exit(__doc__)
    main(*args, gemini='--gemini' in sys.argv)
