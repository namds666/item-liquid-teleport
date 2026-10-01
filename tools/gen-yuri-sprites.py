from PIL import Image, ImageDraw
import os

S = 40
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "sprites", "units", "yuri.png")
OUTLINE = (30, 12, 44, 255)
ROBE = (112, 52, 156, 255)
ROBE_DARK = (82, 34, 120, 255)
SKIN = (232, 196, 160, 255)
GOLD = (214, 176, 72, 255)


def hard(img):
    px = img.load()
    for y in range(S):
        for x in range(S):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255 if a >= 128 else 0)


def layer(draw_fn):
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(im))
    return im


def body(d):
    d.ellipse((6, 6, 33, 33), fill=ROBE)
    d.ellipse((6, 6, 33, 33), outline=ROBE_DARK, width=2)
    d.rectangle((18, 4, 21, 12), fill=GOLD)
    d.ellipse((13, 13, 26, 26), fill=SKIN)


def silhouette(d):
    d.ellipse((6, 6, 33, 33), fill=OUTLINE)
    d.rectangle((18, 4, 21, 12), fill=OUTLINE)


sil = layer(silhouette)
hard(sil)
base = layer(body)
hard(base)
out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
sp = sil.load()
op = out.load()
for y in range(S):
    for x in range(S):
        if sp[x, y][3]:
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < S and 0 <= ny < S:
                        op[nx, ny] = OUTLINE
bp = base.load()
for y in range(S):
    for x in range(S):
        if bp[x, y][3]:
            op[x, y] = bp[x, y]
hard(out)
out.save(OUT)
