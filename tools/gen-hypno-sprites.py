#!/usr/bin/env python3
"""Generate the chrono-hypno block placeholder sprite."""

from PIL import Image, ImageDraw
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOCK_DIR = os.path.join(ROOT, "sprites", "blocks", "units")
SIZE = 96

OUTLINE = (24, 20, 32, 255)
BASE = (62, 62, 68, 255)
BORDER = (38, 38, 44, 255)
PURPLE = (163, 91, 216, 255)
PURPLE_DARK = (104, 50, 150, 255)
PURPLE_LIGHT = (214, 168, 240, 255)
EYE = (20, 12, 30, 255)


def block():
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, SIZE - 1, SIZE - 1], fill=OUTLINE)
    d.rectangle([1, 1, SIZE - 2, SIZE - 2], fill=BORDER)
    d.rectangle([3, 3, SIZE - 4, SIZE - 4], fill=BASE)
    c = SIZE // 2
    d.ellipse([c - 34, c - 34, c + 33, c + 33], fill=OUTLINE)
    d.ellipse([c - 33, c - 33, c + 32, c + 32], fill=PURPLE_DARK)
    d.ellipse([c - 30, c - 30, c + 29, c + 29], fill=PURPLE)
    d.ellipse([c - 24, c - 24, c + 23, c + 23], fill=BASE)
    for i in range(0, 360, 4):
        a = math.radians(i)
        r = 4 + i / 360 * 18
        x = int(round(c - 0.5 + r * math.cos(a)))
        y = int(round(c - 0.5 + r * math.sin(a)))
        d.rectangle([x, y, x + 1, y + 1], fill=PURPLE_LIGHT)
    d.ellipse([c - 5, c - 5, c + 4, c + 4], fill=OUTLINE)
    d.ellipse([c - 4, c - 4, c + 3, c + 3], fill=EYE)
    d.rectangle([c - 1, c - 1, c, c], fill=PURPLE_LIGHT)
    for x, y in ((6, 6), (SIZE - 8, 6), (6, SIZE - 8), (SIZE - 8, SIZE - 8)):
        d.rectangle([x, y, x + 1, y + 1], fill=PURPLE)
    img.save(os.path.join(BLOCK_DIR, "chrono-hypno.png"))


if __name__ == "__main__":
    block()
