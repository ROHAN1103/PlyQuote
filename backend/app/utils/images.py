"""Logo sanitising: decode, validate, downscale and re-encode as PNG.

Re-encoding discards anything that is not pixel data (metadata, embedded scripts, polyglot payloads).
SVG is deliberately unsupported because it can carry script.
"""
from io import BytesIO

from PIL import Image, ImageOps

ALLOWED_FORMATS = {"PNG", "JPEG", "WEBP"}
MAX_DIMENSION = 800
Image.MAX_IMAGE_PIXELS = 25_000_000  # decompression-bomb guard


class InvalidImageError(Exception):
    pass


def sanitize_logo(data: bytes) -> bytes:
    try:
        with Image.open(BytesIO(data)) as img:
            if img.format not in ALLOWED_FORMATS:
                raise InvalidImageError("Upload a PNG, JPEG or WebP image.")
            img.load()  # fully decode: catches truncated and corrupt files
            img = ImageOps.exif_transpose(img)
            img.thumbnail((MAX_DIMENSION, MAX_DIMENSION))
            if img.mode not in ("RGB", "RGBA"):
                img = img.convert("RGBA")
            out = BytesIO()
            img.save(out, format="PNG", optimize=True)
            return out.getvalue()
    except InvalidImageError:
        raise
    except Exception as exc:  # corrupt, truncated, bomb, unsupported
        raise InvalidImageError("That file isn't a valid image.") from exc
