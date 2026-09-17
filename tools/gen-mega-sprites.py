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
    small = Image.open(os.path.join(BLOCK_DIR, "outpost-small.png")).convert("RGBA")
    mega = small.resize((128, 128), Image.NEAREST)
    mega = add_block_motif(mega)
    mega.save(os.path.join(BLOCK_DIR, "outpost-mega.png"))
    print(f"outpost-mega.png: {mega.size}")

    # === 2. outpost-quad.png (192x192) ===
    base = Image.open(os.path.join(BLOCK_DIR, "outpost.png")).convert("RGBA")
    quad = base.resize((192, 192), Image.NEAREST)
    quad = add_block_motif(quad)
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
