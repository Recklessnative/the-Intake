# Turns the four title renders into the game's pictures: media/title/title-<stage>.webp (1920)
# and -960.webp for phones, graded like the office pictures in post.py.
# Usage: python3 title_post.py <repo dir>   (from tools/office: python3 title_post.py ../..)
import sys, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
MEDIA = os.path.join(sys.argv[1], 'media', 'title')
os.makedirs(MEDIA, exist_ok=True)

def grade(im):   # the same grade as post.py: blacks lifted a little, cool shadows, warm highlights
    a = np.asarray(im).astype(float) / 255
    lum = a.mean(axis=2, keepdims=True)
    a = 0.03 + a * 0.97
    a = a + (lum - 0.5) * np.array([0.035, 0.0, -0.035]) * 2
    a = np.clip(a, 0, 1) ** 0.97
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGB')

for stage, name in (('day', 'day'), ('rain', 'rain'), ('night', 'night'), ('dystopia', '2041')):
    src = os.path.join(OUT, f'title_{stage}_1920.png')
    if not os.path.exists(src):
        print('missing', src); continue
    im = grade(Image.open(src).convert('RGB'))
    im.save(os.path.join(MEDIA, f'title-{name}.webp'), quality=84, method=6)
    im.resize((960, 540), Image.LANCZOS).save(os.path.join(MEDIA, f'title-{name}-960.webp'), quality=82, method=6)
    print('wrote', name)
