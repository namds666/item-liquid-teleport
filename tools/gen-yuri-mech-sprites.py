from PIL import Image, ImageDraw

OUT = "sprites/units/"
FILL = (96, 96, 104, 255)
OUTLINE = (40, 40, 46, 255)


def draw(name, box):
    img = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle(box, fill=OUTLINE)
    x0, y0, x1, y1 = box
    d.rectangle((x0 + 1, y0 + 1, x1 - 1, y1 - 1), fill=FILL)
    img.save(OUT + name)


draw("yuri-leg.png", (8, 4, 15, 19))
draw("yuri-base.png", (5, 8, 18, 15))
