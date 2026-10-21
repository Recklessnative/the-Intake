# Turns the Lindeveld renders (town.py) into game assets in media/town/ and writes js/town-map.js.
# Usage: python3 town_post.py <repo dir>   (from tools/office: python3 town_post.py ../..)
import sys, os, json
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
REPO = sys.argv[1]
MEDIA = os.path.join(REPO, 'media', 'town')
os.makedirs(MEDIA, exist_ok=True)

def grade(im):   # the same grade as post.py: blacks lifted a little, cool shadows, warm highlights
    a = np.asarray(im).astype(float) / 255
    rgb = a[:, :, :3]
    lum = rgb.mean(axis=2, keepdims=True)
    rgb = 0.03 + rgb * 0.97
    rgb = rgb + (lum - 0.5) * np.array([0.035, 0.0, -0.035]) * 2
    a[:, :, :3] = np.clip(np.clip(rgb, 0, 1) ** 0.97, 0, 1)
    return Image.fromarray((a * 255 + 0.5).astype(np.uint8), im.mode)

def srgb(x): return 12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055
pct = lambda v, n: round(100 * v / n, 3)

def ids_from(mask, n):
    """The mask pass paints thing i in linear red (i+1)/16, stored sRGB; 0 is nothing."""
    lv = np.array([0] + [srgb((i + 1) / 16) * 255 for i in range(n)])
    rd = np.asarray(Image.open(mask).convert('RGB'))[:, :, 0].astype(float)
    df = np.abs(rd[:, :, None] - lv[None, None, :]); ix = df.argmin(axis=2); ix[df.min(axis=2) > 5] = 0
    return ix

def clean(m):
    return np.asarray(Image.fromarray(m.astype(np.uint8) * 255).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))) > 0

# ---------- the diorama: three acts, a hit mask, a hover glow per place ----------
for a in (1, 2, 3):
    src = os.path.join(OUT, f'town_{a}.png')
    if not os.path.exists(src): continue
    im = grade(Image.open(src).convert('RGBA'))
    im.save(os.path.join(MEDIA, f'town-{a}.webp'), quality=86, method=6)
    im.resize((im.size[0] // 2, im.size[1] // 2), Image.LANCZOS).save(os.path.join(MEDIA, f'town-{a}-960.webp'), quality=84, method=6)
TIDS = json.load(open(os.path.join(OUT, 'town_ids.json')))
ix = ids_from(os.path.join(OUT, 'town_mask.png'), len(TIDS)); H, W = ix.shape
Image.fromarray((ix * 20).astype(np.uint8), 'L').resize((480, 270), Image.NEAREST).save(os.path.join(MEDIA, 'mask.png'), optimize=True)
spots = {}
for k, name in enumerate(TIDS, start=1):
    m = clean(ix == k)
    ys, xs = np.nonzero(m)
    if not len(xs): continue
    pad = 24
    x0, y0, x1, y1 = max(0, xs.min() - pad), max(0, ys.min() - pad), min(W, xs.max() + pad), min(H, ys.max() + pad)
    crop = Image.fromarray((m[y0:y1, x0:x1] * 255).astype(np.uint8), 'L')
    outer = crop.filter(ImageFilter.MaxFilter(7))
    rim = np.clip(np.asarray(outer, float) - np.asarray(crop, float), 0, 255)
    halo = np.asarray(outer.filter(ImageFilter.GaussianBlur(10)), float)
    al = np.clip(rim * 0.95 + halo * 0.45 + np.asarray(crop, float) * 0.12, 0, 255)
    rgba = np.zeros((*al.shape, 4), np.uint8); rgba[:, :, 0], rgba[:, :, 1], rgba[:, :, 2], rgba[:, :, 3] = 255, 226, 150, al.astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(os.path.join(MEDIA, f'glow-{name}.webp'), quality=80, method=6)
    top = ys.min()
    spots[name] = {'rect': [pct(x0, W), pct(y0, H), pct(x1, W), pct(y1, H)], 'tag': [pct(xs[ys < top + 40].mean(), W), max(7.0, pct(top, H))]}

# ---------- the places, close up: each picture and where its things sit ----------
PICS = {'junction': ('open', 'closed'), 'flat': ('base', 'archive'), 'hall': ('base', 'terminal'), 'house': ('base',), 'streets': ('1', '2', '3')}
shots = {}
for place, variants in PICS.items():
    for v in variants:
        src = os.path.join(OUT, f'tshot_{place}_{v}.png')
        if os.path.exists(src):
            grade(Image.open(src).convert('RGB')).save(os.path.join(MEDIA, f'{place}-{v}.webp'), quality=84, method=6)
    mpath = os.path.join(OUT, f'tshot_{place}_mask.png')
    if not os.path.exists(mpath): continue
    tids = json.load(open(os.path.join(OUT, f'tshot_{place}_ids.json')))
    ix = ids_from(mpath, len(tids)); sh, sw = ix.shape
    things = {}
    for k, t in enumerate(tids, start=1):
        ys, xs = np.nonzero(clean(ix == k))
        if len(xs) < 30: continue
        top = ys.min()
        things[t] = {'rect': [pct(xs.min(), sw), pct(ys.min(), sh), pct(xs.max(), sw), pct(ys.max(), sh)],
                     'tag': [pct(xs[ys < top + 30].mean(), sw), max(7.0, pct(top, sh))]}
    shots[place] = {'things': things}
bf = os.path.join(OUT, 'tshot_junction_board.json')
if os.path.exists(bf) and 'junction' in shots: shots['junction']['board'] = json.load(open(bf))

# ---------- the Home Catalogue: each thing on its own, cropped, and where it goes on the flat ----------
items = {}
for i in ('rug', 'armchair', 'lamp', 'kettle', 'plant', 'radio'):
    src = os.path.join(OUT, f'titem_{i}.png')
    if not os.path.exists(src): continue
    im = grade(Image.open(src).convert('RGBA')); iw, ih = im.size
    al = np.asarray(im)[:, :, 3]
    ys, xs = np.nonzero(al > 4)
    if not len(xs): continue
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    im.crop((x0, y0, x1, y1)).save(os.path.join(MEDIA, f'item-{i}.webp'), quality=86, method=6)
    items[i] = [pct(x0, iw), pct(y0, ih), pct(x1, iw), pct(y1, ih)]

with open(os.path.join(REPO, 'js', 'town-map.js'), 'w') as f:
    f.write('// Generated from the Blender renders (tools/office/town_post.py): where each place and thing sits on the Lindeveld pictures, in % of them.\n')
    f.write('window.TOWN_MAP = ' + json.dumps({'w': W, 'h': H, 'ids': TIDS, 'spots': spots, 'shots': shots, 'items': items}, separators=(',', ':')) + ';\n')
print(json.dumps({'spots': spots, 'items': items}, indent=1))
