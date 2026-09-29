#!/usr/bin/env python3
"""Generate outpost-micro sprites by downscaling the outpost-small sprites."""

from PIL import Image
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOCK_DIR = os.path.join(ROOT, "sprites", "blocks", "units")
UNIT_DIR = os.path.join(ROOT, "sprites", "units")
SIZE = (32, 32)


def clamp_alpha(img):
    img.putalpha(img.getchannel("A").point(lambda a: 0 if a < 128 else 255))
    return img


def block():
    src = Image.open(os.path.join(BLOCK_DIR, "outpost-small.png")).convert("RGBA")
    src.resize(SIZE, Image.BOX).save(os.path.join(BLOCK_DIR, "outpost-micro.png"))


def drone(name):
    src = Image.open(os.path.join(UNIT_DIR, "outpost-small-" + name + ".png")).convert("RGBA")
    clamp_alpha(src.resize(SIZE, Image.LANCZOS)).save(os.path.join(UNIT_DIR, "outpost-micro-" + name + ".png"))


if __name__ == "__main__":
    block()
    drone("drone")
    drone("drone-cell")
