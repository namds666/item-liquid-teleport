#!/usr/bin/env python3
"""Generate the chrono-hypno (1x1) and chrono-hypno-big (2x2) block sprites and the Big Yuri unit sprites."""

from PIL import Image, ImageDraw
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOCK_DIR = os.path.join(ROOT, "sprites", "blocks", "units")
UNIT_DIR = os.path.join(ROOT, "sprites", "units")

OUTLINE = (24, 20, 32, 255)
BASE = (62, 62, 68, 255)
BORDER = (38, 38, 44, 255)
PURPLE = (163, 91, 216, 255)
PURPLE_DARK = (104, 50, 150, 255)
PURPLE_LIGHT = (214, 168, 240, 255)
EYE = (20, 12, 30, 255)


def block(name, size):
    k = size / 96
    s = lambda v: int(round(v * k))
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, size - 1, size - 1], fill=OUTLINE)
    d.rectangle([1, 1, size - 2, size - 2], fill=BORDER)
    d.rectangle([2, 2, size - 3, size - 3], fill=BASE)
    c = size // 2
    for r, color in ((34, OUTLINE), (33, PURPLE_DARK), (30, PURPLE), (24, BASE)):
        d.ellipse([c - s(r), c - s(r), c + s(r) - 1, c + s(r) - 1], fill=color)
    dot = max(1, s(2)) - 1
    for i in range(0, 360, 4 if size > 48 else 8):
        a = math.radians(i)
        r = s(4) + i / 360 * s(18)
        x = int(round(c - 0.5 + r * math.cos(a)))
        y = int(round(c - 0.5 + r * math.sin(a)))
        d.rectangle([x, y, x + dot, y + dot], fill=PURPLE_LIGHT)
    e = max(2, s(5))
    d.ellipse([c - e, c - e, c + e - 1, c + e - 1], fill=OUTLINE)
    d.ellipse([c - e + 1, c - e + 1, c + e - 2, c + e - 2], fill=EYE)
    d.rectangle([c - 1, c - 1, c, c], fill=PURPLE_LIGHT)
    img.save(os.path.join(BLOCK_DIR, name + ".png"))


def big_unit(part):
    src = Image.open(os.path.join(UNIT_DIR, "yuri" + part + ".png")).convert("RGBA")
    src.resize((src.width * 2, src.height * 2), Image.NEAREST).save(os.path.join(UNIT_DIR, "yuri-big" + part + ".png"))


if __name__ == "__main__":
    block("chrono-hypno", 32)
    block("chrono-hypno-big", 64)
    for part in ("", "-base", "-leg"):
        big_unit(part)
