#!/usr/bin/env python3
"""Generate sprites/statuses/chrono-*.png: one white glyph per boosted stat, tinted in game by the status color.

The stat of each status is read from its makeStatus(...) line in scripts/chrono-buffer.js.
"""

from PIL import Image, ImageDraw
import math
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "sprites", "statuses")
SOURCE = os.path.join(ROOT, "scripts", "chrono-buffer.js")

SIZE = 32
SS = 8
# Vanilla status icons are white with a faint white edge, no dark outline.
EDGE_ALPHA = 56
CORNER_ALPHA = 28


def canvas():
    img = Image.new("L", (SIZE * SS, SIZE * SS), 0)
    return img, ImageDraw.Draw(img)


def poly(d, pts):
    d.polygon([(x * SS, y * SS) for x, y in pts], fill=255)


def speed(d):
    poly(d, [(16, 2), (24, 10), (24, 18), (21, 18), (16, 13), (11, 18), (8, 18), (8, 10)])
    poly(d, [(16, 20), (24, 28), (24, 30), (8, 30), (8, 28)])


def damage(d):
    def rot(pts):
        c, s = math.cos(math.radians(45)), math.sin(math.radians(45))
        return [(16 + x * c - y * s, 16 + x * s + y * c) for x, y in pts]
    poly(d, rot([(0, -19), (3.2, -14), (3.2, 5), (-3.2, 5), (-3.2, -14)]))
    poly(d, rot([(-9, 5), (9, 5), (9, 9), (-9, 9)]))
    poly(d, rot([(-2, 9), (2, 9), (2, 14), (-2, 14)]))
    poly(d, rot([(-3.5, 14), (3.5, 14), (3.5, 18), (-3.5, 18)]))


def reload(d):
    c, r_out, r_in = 16, 14, 10
    start, end = 0, 255
    at = lambda r, deg: (c + r * math.cos(math.radians(deg)), c + r * math.sin(math.radians(deg)))
    poly(d, [at(r_out, a) for a in range(start, end + 1, 5)] + [at(r_in, a) for a in range(end, start - 1, -5)])
    mid = (r_out + r_in) / 2
    poly(d, [at(r_out + 3.5, end), at(r_in - 3.5, end), at(mid, end + 40)])
    poly(d, [(14.5, 10), (17.5, 10), (17.5, 17.5), (14.5, 17.5)])
    poly(d, [(14.5, 14.5), (22, 14.5), (22, 17.5), (14.5, 17.5)])


def health(d):
    poly(d, [(12, 3), (20, 3), (20, 12), (29, 12), (29, 20), (20, 20), (20, 29), (12, 29), (12, 20), (3, 20), (3, 12), (12, 12)])


GLYPHS = {"speed": speed, "damage": damage, "reload": reload, "health": health}


def render(glyph):
    big, d = canvas()
    glyph(d)
    small = big.resize((SIZE, SIZE), Image.BOX)
    body = [[small.getpixel((x, y)) >= 128 for x in range(SIZE)] for y in range(SIZE)]
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    for y in range(SIZE):
        for x in range(SIZE):
            if body[y][x]:
                img.putpixel((x, y), (255, 255, 255, 255))
                continue
            near = lambda dx, dy: 0 <= x + dx < SIZE and 0 <= y + dy < SIZE and body[y + dy][x + dx]
            if near(1, 0) or near(-1, 0) or near(0, 1) or near(0, -1):
                img.putpixel((x, y), (255, 255, 255, EDGE_ALPHA))
            elif near(1, 1) or near(-1, 1) or near(1, -1) or near(-1, -1):
                img.putpixel((x, y), (255, 255, 255, CORNER_ALPHA))
    return img


def statuses():
    src = open(SOURCE, encoding="utf-8").read()
    out = {}
    for name, stats in re.findall(r'makeStatus\("([\w-]+)",\s*"\w+",\s*\{([^}]*)\}', src):
        values = {k: float(v) for k, v in re.findall(r"(\w+):\s*([\d.]+)", stats)}
        # A status boosting several stats shows the one it raises most.
        out[name] = max(values, key=lambda k: values[k])
    return out


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    icons = {stat: render(fn) for stat, fn in GLYPHS.items()}
    for name, stat in sorted(statuses().items()):
        icons[stat].save(os.path.join(OUT_DIR, name + ".png"))
        print(name, stat)


if __name__ == "__main__":
    main()
