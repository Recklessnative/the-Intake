# Your desk close up (scene.py shot/shotmask friday, or desk by day): the picture, graded like post.py,
# and where each thing on the desk sits on it, for js/friday-map.js or js/desk-map.js.
# Usage: python3 friday_post.py <repo dir> [friday|desk]   (from tools/office: python3 friday_post.py ../.. desk)
import sys, os, json
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
REPO = sys.argv[1]
NAME = sys.argv[2] if len(sys.argv) > 2 else 'friday'
MEDIA = os.path.join(REPO, 'media', 'office')

def grade(im):   # the same grade as post.py: blacks lifted a little, cool shadows, warm highlights
    a = np.asarray(im).astype(float) / 255
    lum = a.mean(axis=2, keepdims=True)
    a = 0.03 + a * 0.97
    a = a + (lum - 0.5) * np.array([0.035, 0.0, -0.035]) * 2
    a = np.clip(a, 0, 1) ** 0.97
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGB')

def srgb(x): return 12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055
EXPOSURE = 2 ** -0.3   # as in post.py: the mask pass keeps the scene's exposure
pct = lambda v, n: round(100 * v / n, 3)

im = grade(Image.open(os.path.join(OUT, f'shot_{NAME}.png')).convert('RGB'))
w, h = im.size
im.save(os.path.join(MEDIA, f'{NAME}.webp'), quality=84, method=6)
im.resize((w // 2, h // 2), Image.LANCZOS).save(os.path.join(MEDIA, f'{NAME}-960.webp'), quality=82, method=6)

tids = json.load(open(os.path.join(OUT, f'shot_{NAME}_ids.json')))
lv = np.array([0] + [srgb((i + 1) / 16 * EXPOSURE) * 255 for i in range(len(tids))])
rd = np.asarray(Image.open(os.path.join(OUT, f'shot_{NAME}_mask.png')).convert('RGB'))[:, :, 0].astype(float)
df = np.abs(rd[:, :, None] - lv[None, None, :]); ix = df.argmin(axis=2); ix[df.min(axis=2) > 4] = 0
things = {}
for k, t in enumerate(tids, start=1):
    m = np.asarray(Image.fromarray((ix == k).astype(np.uint8) * 255).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))) > 0
    ys, xs = np.nonzero(m)
    if len(xs) < 30: continue
    top = ys.min()
    things[t] = {'rect': [pct(xs.min(), w), pct(ys.min(), h), pct(xs.max(), w), pct(ys.max(), h)],
                 'tag': [pct(xs[ys < top + 30].mean(), w), max(7.0, pct(top, h))]}
with open(os.path.join(REPO, 'js', NAME + '-map.js'), 'w') as f:
    f.write('// Generated from the Blender render (tools/office/friday_post.py): where each thing on your ' + ('Friday desk' if NAME == 'friday' else 'desk') + ' sits, in % of the picture.\n')
    f.write('window.' + NAME.upper() + '_MAP = ' + json.dumps({'w': w, 'h': h, 'things': things}, separators=(',', ':')) + ';\n')
print(NAME + ':', sorted(things))
