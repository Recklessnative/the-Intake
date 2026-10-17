# Turns the Blender renders into game assets: hub image, hit mask, hover glows, the map script.
# Usage: python3 post.py <repo dir>   (from tools/office: python3 post.py ../..)
import sys, os, json
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
REPO = sys.argv[1]
MEDIA = os.path.join(REPO, 'media', 'office')
os.makedirs(MEDIA, exist_ok=True)
IDS = ['desk', 'mieke', 'darren', 'tv', 'meeting', 'coffee', 'window', 'bart', 'priya', 'jens', 'canteen', 'lift']

hub = Image.open(os.path.join(OUT, 'hub_1920.png')).convert('RGBA')
W, H = hub.size
hub.save(os.path.join(MEDIA, 'hub.webp'), quality=86, method=6)
hub.resize((W // 2, H // 2), Image.LANCZOS).save(os.path.join(MEDIA, 'hub-960.webp'), quality=84, method=6)

# The mask pass paints hotspot i in linear red (i+1)/16; the PNG stores it sRGB-encoded.
def srgb(x): return 12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055
EXPOSURE = 2 ** -0.3   # scene.py sets exposure -0.3, which the mask pass keeps
levels = np.array([0] + [srgb((i + 1) / 16 * EXPOSURE) * 255 for i in range(len(IDS))])
red = np.asarray(Image.open(os.path.join(OUT, 'mask_1920.png')).convert('RGB'))[:, :, 0].astype(float)
diff = np.abs(red[:, :, None] - levels[None, None, :])
ids = diff.argmin(axis=2)   # 0 = nothing, k = IDS[k-1]
ids[diff.min(axis=2) > 5] = 0   # anti-aliased edges blend two colours: they belong to nobody

# A small hit mask for the browser: grey value = (id + 1) * 20, sampled by nearest pixel.
small = Image.fromarray((ids * 20).astype(np.uint8), 'L').resize((480, 270), Image.NEAREST)
small.save(os.path.join(MEDIA, 'mask.png'), optimize=True)

pct = lambda v, n: round(100 * v / n, 3)
spots = {}
for k, name in enumerate(IDS, start=1):
    m = ids == k
    m = np.asarray(Image.fromarray(m.astype(np.uint8) * 255).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))) > 0   # drop stray pixels
    ys, xs = np.nonzero(m)
    if not len(xs): continue
    pad = 24
    x0, y0, x1, y1 = max(0, xs.min() - pad), max(0, ys.min() - pad), min(W, xs.max() + pad), min(H, ys.max() + pad)
    crop = Image.fromarray((m[y0:y1, x0:x1] * 255).astype(np.uint8), 'L')
    rect = [pct(x0, W), pct(y0, H), pct(x1, W), pct(y1, H)]
    if name == 'window':
        # Rain runs only over the glass: the mask becomes a CSS mask image.
        # CSS masks read alpha, so the glass goes into the alpha channel; slightly grown, the mullions cover the seam.
        a = crop.filter(ImageFilter.MaxFilter(5))
        wm = Image.new('LA', crop.size, 255); wm.putalpha(a)
        wm.save(os.path.join(MEDIA, 'window-mask.png'), optimize=True)
        spots[name] = {'rect': rect}
        continue
    # Hover glow: a warm rim around the object and a faint lift inside it.
    outer = crop.filter(ImageFilter.MaxFilter(7))
    rim = Image.fromarray(np.clip(np.asarray(outer, float) - np.asarray(crop, float), 0, 255).astype(np.uint8))
    halo = outer.filter(ImageFilter.GaussianBlur(10))
    a = np.clip(np.asarray(rim, float) * 0.95 + np.asarray(halo, float) * 0.45 + np.asarray(crop, float) * 0.10, 0, 255)
    rgba = np.zeros((*a.shape, 4), np.uint8)
    rgba[:, :, 0], rgba[:, :, 1], rgba[:, :, 2], rgba[:, :, 3] = 255, 226, 150, a.astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(os.path.join(MEDIA, f'glow-{name}.webp'), quality=80, method=6)
    # The label sits above the object's highest point, at its middle.
    top = ys.min()
    cx = xs[ys < top + 40].mean()
    spots[name] = {'rect': rect, 'tag': [pct(cx, W), max(7.0, pct(top, H))]}   # room for the label above

# Close-ups (scene.py shot/shotmask): the picture, and where each thing you can find sits on it.
shots = {}
for name in ('mieke', 'darren', 'bart', 'priya', 'jens', 'canteen', 'board'):
    pic, mpath, ipath = (os.path.join(OUT, f'shot_{name}{x}') for x in ('.png', '_mask.png', '_ids.json'))
    if not (os.path.exists(pic) and os.path.exists(mpath)): continue
    im = Image.open(pic).convert('RGB'); sw, sh = im.size
    im.save(os.path.join(MEDIA, f'shot-{name}.webp'), quality=84, method=6)
    tids = json.load(open(ipath))
    lv = np.array([0] + [srgb((i + 1) / 16 * EXPOSURE) * 255 for i in range(len(tids))])
    rd = np.asarray(Image.open(mpath).convert('RGB'))[:, :, 0].astype(float)
    df = np.abs(rd[:, :, None] - lv[None, None, :]); ix = df.argmin(axis=2); ix[df.min(axis=2) > 4] = 0
    things = {}
    for k, t in enumerate(tids, start=1):
        m = ix == k
        m = np.asarray(Image.fromarray(m.astype(np.uint8) * 255).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))) > 0
        ys, xs = np.nonzero(m)
        if len(xs) < 30: continue
        top = ys.min()
        things[t] = {'rect': [pct(xs.min(), sw), pct(ys.min(), sh), pct(xs.max(), sw), pct(ys.max(), sh)],
                     'tag': [pct(xs[ys < top + 30].mean(), sw), max(7.0, pct(top, sh))]}
    shots[name] = {'things': things}

with open(os.path.join(REPO, 'js', 'office-map.js'), 'w') as f:
    f.write('// Generated from the Blender render (office/post.py): where each place sits on the office picture, in % of it.\n')
    f.write('window.OFFICE_MAP = ' + json.dumps({'w': W, 'h': H, 'spots': spots, 'shots': shots}, separators=(',', ':')) + ';\n')
print(json.dumps(spots, indent=1))
