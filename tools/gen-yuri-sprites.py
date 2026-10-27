from PIL import Image
import os

UNIT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "sprites", "units")
UNITS = 40

OUTLINE = (0x56, 0x56, 0x66, 255)
LIGHT = (0xB0, 0xB9, 0xC0, 255)
MID = (0x98, 0x9A, 0xA4, 255)
DARK = (0x6E, 0x70, 0x80, 255)
PURPLE = (163, 91, 216, 255)
PURPLE_DARK = (104, 50, 150, 255)
PURPLE_LIGHT = (214, 168, 240, 255)
PUPIL = (40, 20, 56, 255)
CELL_LIT = (0x84, 0xF4, 0x90, 255)
CELL_SHADE = (0x62, 0xAE, 0x7E, 255)
WHITE = (255, 255, 255, 255)
WHITE_SHADE = (0xDC, 0xC6, 0xC6, 255)
CLEAR = (0, 0, 0, 0)

PAD = [(5, 14), (9, 11), (13.5, 12), (13.5, 28), (9, 30), (5, 27)]
TORSO = [(12.5, 9), (27.5, 9), (31.5, 13), (31.5, 28), (27.5, 33), (12.5, 33), (8.5, 28), (8.5, 13)]
BARREL = (18, 3, 22, 13)
EYE = (20, 21)
RIM_R = 6.5
IRIS_R = 5.5
PUPIL_BOX = (19, 20, 21, 22)
GLINT_BOX = (19, 20, 19.5, 20.5)


def mirror(poly):
    return [(UNITS - x, y) for x, y in reversed(poly)]


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


def in_box(box, x, y):
    return box[0] <= x < box[2] and box[1] <= y < box[3]


def in_circle(r, x, y):
    return (x - EYE[0]) ** 2 + (y - EYE[1]) ** 2 < r * r


def shade(y, y0, y1):
    t = (y - y0) / (y1 - y0)
    return LIGHT if t < 0.35 else MID if t < 0.75 else DARK


def dilate(mask, size, r):
    out = set()
    for x, y in mask:
        for dx in range(-r, r + 1):
            for dy in range(-r, r + 1):
                if dx * dx + dy * dy <= r * r + 1 and 0 <= x + dx < size and 0 <= y + dy < size:
                    out.add((x + dx, y + dy))
    return out


def render(k, outline):
    size = UNITS * k
    body = Image.new("RGBA", (size, size), CLEAR)
    cell = Image.new("RGBA", (size, size), CLEAR)
    bp, cp = body.load(), cell.load()
    centers = [(px, py, (px + 0.5) / k, (py + 0.5) / k) for py in range(size) for px in range(size)]

    def part(test, paint):
        mask = {(px, py) for px, py, x, y in centers if test(x, y)}
        for px, py in dilate(mask, size, 1) - mask:
            bp[px, py] = OUTLINE
        for px, py, x, y in centers:
            if (px, py) in mask:
                bp[px, py] = paint(x, y)
        return mask

    def pad(x, y):
        if (x < 6.5 or x > UNITS - 6.5) and 15 < y < 25:
            return PURPLE
        return shade(y, 11, 30)

    def barrel(x, y):
        if y < 5:
            return PURPLE_LIGHT
        if y < 6:
            return PURPLE
        return LIGHT if x < 20 else MID

    def eye(x, y):
        if not in_circle(IRIS_R, x, y):
            return PURPLE_DARK
        if in_box(GLINT_BOX, x, y):
            return PURPLE_LIGHT
        if in_box(PUPIL_BOX, x, y):
            return PUPIL
        return CELL_LIT if y < EYE[1] + 1.5 else CELL_SHADE

    left, right = PAD, mirror(PAD)
    shell = part(lambda x, y: in_poly(left, x, y) or in_poly(right, x, y), pad)
    shell |= part(lambda x, y: in_poly(TORSO, x, y), lambda x, y: shade(y, 9, 33))
    shell |= part(lambda x, y: in_box(BARREL, x, y), barrel)
    part(lambda x, y: in_circle(RIM_R, x, y), eye)

    for px, py, x, y in centers:
        if in_circle(IRIS_R, x, y) and not in_box(PUPIL_BOX, x, y):
            cp[px, py] = WHITE if y < EYE[1] + 1.5 else WHITE_SHADE

    filled = {(px, py) for px in range(size) for py in range(size) if bp[px, py][3]}
    for px, py in dilate(filled, size, outline) - filled:
        bp[px, py] = OUTLINE
    return body, cell


for name, k, outline in (("yuri", 1, 2), ("yuri-big", 2, 3)):
    body, cell = render(k, outline)
    body.save(os.path.join(UNIT_DIR, name + ".png"))
    cell.save(os.path.join(UNIT_DIR, name + "-cell.png"))
