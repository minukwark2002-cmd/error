"""Put an AI-generated photo into the site.

Usage: python add_image.py <number 01-32 from PROMPTS.md> <image path>

Center-crops to 9:16, resizes to 1080x1920, saves img/<code>.jpg under ~500KB.
"""
import io
import sys
from pathlib import Path

from PIL import Image, ImageOps

W, H, MAX_BYTES = 1080, 1920, 500_000


def main(num, src):
    n = int(num)
    if not 1 <= n <= 32:
        sys.exit('number must be 01-32')
    code = format(32 - n, '05b')  # PROMPTS.md lists types from 11111 down to 00000

    img = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
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
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(*sys.argv[1:])
