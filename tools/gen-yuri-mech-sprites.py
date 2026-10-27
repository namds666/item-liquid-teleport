from PIL import Image

OUT = "sprites/units/"
UNITS = 24
OUTLINE = (0x56, 0x56, 0x66, 255)
LIGHT = (0x98, 0x9A, 0xA4, 255)
FILL = (0x6E, 0x70, 0x80, 255)
SEAM = (0x5D, 0x5D, 0x6C, 255)

LEG = [(12, 5), (14, 3), (17, 3), (19, 5), (19, 18), (17, 20), (14, 20), (12, 18)]
BASE = [(6, 7), (18, 7), (21, 10), (21, 14), (18, 17), (6, 17), (3, 14), (3, 10)]


def in_poly(poly, x, y):
    inside = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def draw(name, poly, k, paint):
    size = UNITS * k
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    px = img.load()
    ys = [y for _, y in poly]
    y0, y1 = min(ys), max(ys)
    for py in range(size):
        for qx in range(size):
            x, y = (qx + 0.5) / k, (py + 0.5) / k
            if not in_poly(poly, x, y):
                continue
            edge = any(not in_poly(poly, x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            px[qx, py] = OUTLINE if edge else paint(x, (y - y0) / (y1 - y0))
    img.save(OUT + name)


def leg(x, t):
    if 0.5 < t < 0.5 + 1.5 / 17:
        return SEAM
    return LIGHT if t < 0.3 and x < 16 else FILL


def base(x, t):
    if t > 0.7 and 9 < x < 15:
        return SEAM
    return LIGHT if t < 0.35 else FILL


for prefix, k in (("yuri", 1), ("yuri-big", 2)):
    draw(prefix + "-leg.png", LEG, k, leg)
    draw(prefix + "-base.png", BASE, k, base)
