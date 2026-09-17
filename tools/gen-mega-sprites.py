#!/usr/bin/env python3
"""Generate outpost-mega and outpost-quad sprites from existing outpost sprites.

Blocks:  outpost-small 2x -> outpost-mega 128x128
         outpost 2x -> outpost-quad 192x192
Drones:  vanilla mega 1:1 -> outpost-mega-drone 100x100
         vanilla quad 1:1 -> outpost-quad-drone 220x220
         (plus accent treatment: yellow stripe pair, small side armour plates)

Vanilla references live in tools/vanilla-ref/ for reproducibility.
"""

from PIL import Image, ImageDraw
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOCK_DIR = os.path.join(ROOT, "sprites", "blocks", "units")
UNIT_DIR = os.path.join(ROOT, "sprites", "units")
VANILLA_DIR = os.path.join(ROOT, "tools", "vanilla-ref")

DARK_EDGE = (0x2B, 0x2B, 0x30, 255)
LIGHT_RIM = (0x7D, 0x7F, 0x8F, 255)
ARMOUR_LIGHT = (0xB0, 0xBA, 0xC0, 255)
ARMOUR_MID = (0x98, 0x9A, 0xA4, 255)
ARMOUR_DARK = (0x6E, 0x70, 0x80, 255)
ACCENT_YELLOW = (0xFF, 0xD3, 0x7F, 255)
ACCENT_ORANGE = (0xFF, 0xA6, 0x65, 255)



OUT = (0x28, 0x29, 0x2f, 255)
DARK = (0x3b, 0x3c, 0x44, 255)
BODY = (0x4a, 0x4b, 0x53, 255)
MID = (0x5c, 0x5e, 0x6c, 255)
LIGHT = (0x6e, 0x70, 0x80, 255)
HI = (0x8c, 0x8e, 0x9e, 255)
ACC = (0xff, 0xd3, 0x7f, 255)
ACC2 = (0xff, 0xa6, 0x65, 255)
ACC3 = (0xd4, 0x81, 0x6b, 255)
CLEAR = (0, 0, 0, 0)


def draw_mega_block(n, rings):
    """Original design shared by both merged outposts: armored frame, four hangar pads with
    hazard stripes, plus-shaped struts and a central reactor. `rings` adds concentric
    conduit rings around the reactor (1 for Mega, 2 for Quad)."""
    img = Image.new("RGBA", (n, n), CLEAR)
    d = ImageDraw.Draw(img)
    m = 1
    e = n - 2
    f = max(4, n // 12)

    d.rectangle([m, m, e, e], fill=OUT)
    d.rectangle([m + 1, m + 1, e - 1, e - 1], fill=LIGHT)
    d.rectangle([m + 1, m + 1, e - 1, m + 1], fill=HI)
    d.rectangle([m + 1, m + 1, m + 1, e - 1], fill=HI)
    d.rectangle([m + 1, e - 1, e - 1, e - 1], fill=DARK)
    d.rectangle([e - 1, m + 1, e - 1, e - 1], fill=DARK)
    d.rectangle([m + f, m + f, e - f, e - f], fill=OUT)
    d.rectangle([m + f + 1, m + f + 1, e - f - 1, e - f - 1], fill=BODY)

    b = max(2, n // 32)
    for bx in (m + f // 2, e - f // 2):
        for by in (m + f // 2, e - f // 2):
            d.rectangle([bx - b, by - b, bx + b, by + b], fill=OUT)
            d.rectangle([bx - b + 1, by - b + 1, bx + b - 1, by + b - 1], fill=MID)
            d.point((bx - b + 1, by - b + 1), fill=HI)
    if n >= 160:
        c = n // 2
        for bx, by in ((c, m + f // 2), (c, e - f // 2), (m + f // 2, c), (e - f // 2, c)):
            d.rectangle([bx - b, by - b, bx + b, by + b], fill=OUT)
            d.rectangle([bx - b + 1, by - b + 1, bx + b - 1, by + b - 1], fill=MID)

    c = n // 2
    inner0 = m + f + 1
    inner1 = e - f - 1
    sw = max(3, n // 16)
    d.rectangle([c - sw, inner0, c + sw, inner1], fill=OUT)
    d.rectangle([inner0, c - sw, inner1, c + sw], fill=OUT)
    d.rectangle([c - sw + 1, inner0, c + sw - 1, inner1], fill=MID)
    d.rectangle([inner0, c - sw + 1, inner1, c + sw - 1], fill=MID)
    d.rectangle([c - sw + 1, inner0, c - sw + 1, inner1], fill=LIGHT)
    d.rectangle([inner0, c - sw + 1, inner1, c - sw + 1], fill=LIGHT)
    d.rectangle([c - 1, inner0, c, inner1], fill=DARK)
    d.rectangle([inner0, c - 1, inner1, c], fill=DARK)

    r = int(n * 0.21)
    w = max(2, n // 32)
    for i in range(rings):
        rr = r + (i + 1) * max(4, n // 14)
        d.ellipse([c - rr, c - rr, c + rr, c + rr], outline=OUT, width=w + 2)
        d.ellipse([c - rr + 1, c - rr + 1, c + rr - 1, c + rr - 1], outline=LIGHT, width=w)
        for ang in range(0, 360, 45):
            import math
            tx = int(round(c + rr * math.cos(math.radians(ang))))
            ty = int(round(c + rr * math.sin(math.radians(ang))))
            d.rectangle([tx - w, ty - w, tx + w, ty + w], fill=OUT)
            d.rectangle([tx - w + 1, ty - w + 1, tx + w - 1, ty + w - 1], fill=MID)
    c = n // 2
    inner0 = m + f + 1
    inner1 = e - f - 1
    pad = int(n * 0.27)
    gap = max(3, n // 24)
    rim = max(2, n // 40)
    stripe = max(2, n // 40)
    pads = [(inner0 + gap, inner0 + gap), (inner1 - gap - pad, inner0 + gap),
            (inner0 + gap, inner1 - gap - pad), (inner1 - gap - pad, inner1 - gap - pad)]
    for (px, py) in pads:
        d.rectangle([px, py, px + pad, py + pad], fill=OUT)
        d.rectangle([px + 1, py + 1, px + pad - 1, py + pad - 1], fill=LIGHT)
        d.rectangle([px + 1, py + 1, px + pad - 1, py + 1], fill=HI)
        d.rectangle([px + 1, py + 1, px + 1, py + pad - 1], fill=HI)
        d.rectangle([px + 1 + rim, py + 1 + rim, px + pad - 1 - rim, py + pad - 1 - rim], fill=OUT)
        d.rectangle([px + 2 + rim, py + 2 + rim, px + pad - 2 - rim, py + pad - 2 - rim], fill=DARK)
        ix0, iy0, ix1, iy1 = px + 2 + rim, py + 2 + rim, px + pad - 2 - rim, py + pad - 2 - rim
        sx = ix1 - stripe + 1 if px < c else ix0
        sy = iy1 - stripe + 1 if py < c else iy0
        for k in range(0, iy1 - iy0 + 1, stripe * 2):
            d.rectangle([sx, iy0 + k, sx + stripe - 1, min(iy0 + k + stripe - 1, iy1)], fill=ACC)
        for k in range(0, ix1 - ix0 + 1, stripe * 2):
            d.rectangle([ix0 + k, sy, min(ix0 + k + stripe - 1, ix1), sy + stripe - 1], fill=ACC)
        cx, cy = (ix0 + ix1) // 2, (iy0 + iy1) // 2
        arm = (ix1 - ix0) // 3
        d.rectangle([cx - arm, cy - 1, cx + arm, cy], fill=BODY)
        d.rectangle([cx - 1, cy - arm, cx, cy + arm], fill=BODY)
        d.rectangle([cx - 2, cy - 2, cx + 1, cy + 1], fill=OUT)
        d.rectangle([cx - 1, cy - 1, cx, cy], fill=ACC3)

    d.ellipse([c - r - 1, c - r - 1, c + r + 1, c + r + 1], fill=OUT)
    d.ellipse([c - r + 1, c - r + 1, c + r - 1, c + r - 1], fill=LIGHT)
    d.ellipse([c - r + 1 + w, c - r + 1 + w, c + r - 1 - w, c + r - 1 - w], fill=OUT)
    d.ellipse([c - r + 2 + w, c - r + 2 + w, c + r - 2 - w, c + r - 2 - w], fill=DARK)
    core = r - 2 * w - 3
    d.ellipse([c - core - 1, c - core - 1, c + core + 1, c + core + 1], fill=ACC3)
    d.ellipse([c - core, c - core, c + core, c + core], fill=ACC2)
    d.ellipse([c - core // 2 - 1, c - core // 2 - 1, c + core // 2, c + core // 2], fill=ACC)
    d.ellipse([c - core // 4 - 1, c - core // 2 - 1, c + core // 4 - core // 3, c - core // 6], fill=(255, 240, 200, 255))
    for ang in (45, 135, 225, 315):
        import math
        tx = int(round(c + (r - w // 2 - 1) * math.cos(math.radians(ang))))
        ty = int(round(c + (r - w // 2 - 1) * math.sin(math.radians(ang))))
        d.rectangle([tx - w // 2 - 1, ty - w // 2 - 1, tx + w // 2 + 1, ty + w // 2 + 1], fill=OUT)
        d.rectangle([tx - w // 2, ty - w // 2, tx + w // 2, ty + w // 2], fill=ACC)
    return img


def add_block_motif(img):
    w, h = img.size
    draw = ImageDraw.Draw(img)
    m = 1

    for i in range(3):
        c = DARK_EDGE if i < 2 else LIGHT_RIM
        draw.line([(m + i, m + i), (w - 1 - m - i, m + i)], fill=c)
        draw.line([(m + i, h - 1 - m - i), (w - 1 - m - i, h - 1 - m - i)], fill=c)
        draw.line([(m + i, m + i), (m + i, h - 1 - m - i)], fill=c)
        draw.line([(w - 1 - m - i, m + i), (w - 1 - m - i, h - 1 - m - i)], fill=c)

    pad = max(4, w // 10)
    corners = [
        (m + 4, m + 4),
        (w - 1 - m - 3 - pad, m + 4),
        (m + 4, h - 1 - m - 3 - pad),
        (w - 1 - m - 3 - pad, h - 1 - m - 3 - pad),
    ]
    for cx, cy in corners:
        draw.rectangle([cx - 1, cy - 1, cx + pad, cy + pad], fill=ARMOUR_DARK)
        draw.rectangle([cx, cy, cx + pad - 1, cy + pad - 1], fill=ARMOUR_MID)
        draw.line([(cx, cy), (cx + pad - 1, cy)], fill=ARMOUR_LIGHT)
        draw.line([(cx, cy), (cx, cy + pad - 1)], fill=ARMOUR_LIGHT)

    cx, cy = w // 2, h // 2
    r_outer = w // 8
    r_inner = max(2, r_outer - 2)
    draw.ellipse(
        [cx - r_outer, cy - r_outer, cx + r_outer, cy + r_outer], fill=ACCENT_ORANGE
    )
    draw.ellipse(
        [cx - r_inner, cy - r_inner, cx + r_inner, cy + r_inner], fill=ACCENT_YELLOW
    )
    if r_inner > 2:
        draw.ellipse(
            [cx - r_inner + 2, cy - r_inner + 2, cx + r_inner - 2, cy + r_inner - 2],
            fill=(0xFF, 0xFF, 0xCC, 255),
        )
    return img


def _body_span_at(px, w, y):
    """Return (left, right) of opaque pixels at row y, or None."""
    xs = [x for x in range(w) if px[x, y][3] > 0]
    return (min(xs), max(xs)) if xs else None


def add_vanilla_drone_accents(img, cell, stripe_y, stripe_w, plate_size, plate_y):
    """Overlay accent stripes and side armour plates on a vanilla-based drone.

    Stripes are drawn only on existing opaque body pixels (no bleed into
    transparent areas). Plates sit at the outer edges of the body.
    """
    w, h = img.size
    px_img = img.load()
    draw = ImageDraw.Draw(img)
    draw_cell = ImageDraw.Draw(cell)
    cx = w // 2

    # --- Yellow stripe pair ---
    gap = stripe_w + 2
    for dy in (0, gap):
        sy = stripe_y + dy
        for row in range(sy, sy + stripe_w):
            if row < 0 or row >= h:
                continue
            span = _body_span_at(px_img, w, row)
            if span is None:
                continue
            left, right = span
            inset = max(3, (right - left) // 8)
            x1, x2 = left + inset, right - inset
            draw.line([(x1, row), (x2, row)], fill=ACCENT_YELLOW)
            draw_cell.line([(x1, row), (x2, row)], fill=(255, 255, 255, 255))

    # --- Side armour plates ---
    pw, ph = plate_size, plate_size + plate_size // 2
    span = _body_span_at(px_img, w, plate_y)
    if span is None:
        span = _body_span_at(px_img, w, h // 2)
    if span:
        left_edge, right_edge = span
        for side, edge in [(-1, left_edge), (1, right_edge)]:
            if side == -1:
                bx = edge - pw - 1
            else:
                bx = edge + 2
            by = plate_y - ph // 2

            draw.rectangle([bx - 1, by - 1, bx + pw, by + ph], fill=ARMOUR_DARK)
            draw.rectangle([bx, by, bx + pw - 1, by + ph - 1], fill=ARMOUR_MID)
            hl_x = bx if side == -1 else bx + pw - 1
            draw.line([(hl_x, by), (hl_x, by + ph - 1)], fill=ARMOUR_LIGHT)
            draw.line([(bx, by), (bx + pw - 1, by)], fill=ARMOUR_LIGHT)

            draw_cell.rectangle(
                [bx, by, bx + pw - 1, by + 1], fill=(255, 255, 255, 255)
            )

    return img, cell


def main():
    # === 1. outpost-mega.png (128x128) ===
    mega = draw_mega_block(128, rings=1)
    mega.save(os.path.join(BLOCK_DIR, "outpost-mega.png"))
    print(f"outpost-mega.png: {mega.size}")

    # === 2. outpost-quad.png (192x192) ===
    quad = draw_mega_block(192, rings=2)
    quad.save(os.path.join(BLOCK_DIR, "outpost-quad.png"))
    print(f"outpost-quad.png: {quad.size}")

    # === 3. outpost-mega-drone (100x100, vanilla mega base) ===
    md = Image.open(os.path.join(VANILLA_DIR, "mega.png")).convert("RGBA")
    mc = Image.open(os.path.join(VANILLA_DIR, "mega-cell.png")).convert("RGBA")
    # Stripes at upper-body (~y=42), plates at mid-body (~y=60)
    md, mc = add_vanilla_drone_accents(
        md, mc, stripe_y=42, stripe_w=2, plate_size=6, plate_y=60
    )
    md.save(os.path.join(UNIT_DIR, "outpost-mega-drone.png"))
    mc.save(os.path.join(UNIT_DIR, "outpost-mega-drone-cell.png"))
    print(f"outpost-mega-drone.png: {md.size}")
    print(f"outpost-mega-drone-cell.png: {mc.size}")

    # === 4. outpost-quad-drone (220x220, vanilla quad base) ===
    qd = Image.open(os.path.join(VANILLA_DIR, "quad.png")).convert("RGBA")
    qc = Image.open(os.path.join(VANILLA_DIR, "quad-cell.png")).convert("RGBA")
    # Stripes at upper-body (~y=88), plates at mid-body (~y=120)
    qd, qc = add_vanilla_drone_accents(
        qd, qc, stripe_y=88, stripe_w=3, plate_size=12, plate_y=120
    )
    qd.save(os.path.join(UNIT_DIR, "outpost-quad-drone.png"))
    qc.save(os.path.join(UNIT_DIR, "outpost-quad-drone-cell.png"))
    print(f"outpost-quad-drone.png: {qd.size}")
    print(f"outpost-quad-drone-cell.png: {qc.size}")

    # === Contact sheet ===
    print("\nGenerating contact sheet...")
    scale = 3
    all_sprites = [
        ("outpost-small", os.path.join(BLOCK_DIR, "outpost-small.png")),
        ("outpost-mega", os.path.join(BLOCK_DIR, "outpost-mega.png")),
        ("outpost", os.path.join(BLOCK_DIR, "outpost.png")),
        ("outpost-quad", os.path.join(BLOCK_DIR, "outpost-quad.png")),
        ("vanilla-mega", os.path.join(VANILLA_DIR, "mega.png")),
        ("mega-drone", os.path.join(UNIT_DIR, "outpost-mega-drone.png")),
        ("vanilla-quad", os.path.join(VANILLA_DIR, "quad.png")),
        ("quad-drone", os.path.join(UNIT_DIR, "outpost-quad-drone.png")),
        ("vanilla-mega-cell", os.path.join(VANILLA_DIR, "mega-cell.png")),
        ("mega-cell", os.path.join(UNIT_DIR, "outpost-mega-drone-cell.png")),
        ("vanilla-quad-cell", os.path.join(VANILLA_DIR, "quad-cell.png")),
        ("quad-cell", os.path.join(UNIT_DIR, "outpost-quad-drone-cell.png")),
    ]

    rows = [all_sprites[i : i + 4] for i in range(0, len(all_sprites), 4)]
    padding = 8
    max_h_per_row = []
    total_w = 0
    for row in rows:
        imgs = [Image.open(p).convert("RGBA") for _, p in row]
        rh = max(im.size[1] for im in imgs) * scale
        rw = sum(im.size[0] * scale for im in imgs) + padding * (len(imgs) + 1)
        max_h_per_row.append(rh)
        total_w = max(total_w, rw)

    total_h = sum(max_h_per_row) + padding * (len(rows) + 1)
    sheet = Image.new("RGBA", (total_w, total_h), (0x20, 0x20, 0x28, 255))

    y_off = padding
    for ri, row in enumerate(rows):
        x_off = padding
        for name, path in row:
            im = Image.open(path).convert("RGBA")
            scaled = im.resize(
                (im.size[0] * scale, im.size[1] * scale), Image.NEAREST
            )
            sheet.paste(scaled, (x_off, y_off), scaled)
            x_off += scaled.size[0] + padding
        y_off += max_h_per_row[ri] + padding

    scratchpad = "/private/tmp/claude-501/-Users-namduong-Unity-Projects-item-liquid-teleport/bf3f8994-bcbc-4615-849d-0394db94202f/scratchpad"
    os.makedirs(scratchpad, exist_ok=True)
    sheet_path = os.path.join(scratchpad, "contact.png")
    sheet.save(sheet_path)
    print(f"Contact sheet: {sheet_path} ({sheet.size})")


if __name__ == "__main__":
    main()
