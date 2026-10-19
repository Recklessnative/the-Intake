# Turns the floor 5 render (the reveal, STORY.md) into media/office/floor5(-960).webp, graded like post.py.
# Usage: python3 floor5_post.py <repo dir>   (from tools/office: python3 floor5_post.py ../..)
# The CRT screen's place on the picture is in out/floor5_screen.json; js/reveal.js keeps a copy (SCREEN).
import sys, os, json
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
MEDIA = os.path.join(sys.argv[1], 'media', 'office')

def grade(im):   # the same grade as post.py: blacks lifted a little, cool shadows, warm highlights
    a = np.asarray(im).astype(float) / 255
    lum = a.mean(axis=2, keepdims=True)
    a = 0.03 + a * 0.97
    a = a + (lum - 0.5) * np.array([0.035, 0.0, -0.035]) * 2
    a = np.clip(a, 0, 1) ** 0.97
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGB')

im = grade(Image.open(os.path.join(OUT, 'floor5.png')).convert('RGB'))
im.save(os.path.join(MEDIA, 'floor5.webp'), quality=84, method=6)
im.resize((im.size[0] // 2, im.size[1] // 2), Image.LANCZOS).save(os.path.join(MEDIA, 'floor5-960.webp'), quality=82, method=6)
print('wrote floor5, screen at', json.load(open(os.path.join(OUT, 'floor5_screen.json'))))
