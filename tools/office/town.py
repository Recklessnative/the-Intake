# Lindeveld at half past six in the rain (Belgium, autumn 2007), in Blender, procedurally: the town as a
# diorama for the lift's evening walk home, and a closer look at each of its five places.
# Usage: python3 town.py <mode> [args]
#   town <act> w h samples          the diorama (act 1 plain, 2 fog past the ring road, 3 the archive) -> out/town_<act>.png
#   townmask w h                    one flat colour per place                                         -> out/town_mask.png
#   shot <place> <variant> w h s    a place close up (see SHOTS)                                      -> out/tshot_<place>_<variant>.png
#   shotmask <place> w h            its click mask, one colour per thing                              -> out/tshot_<place>_mask.png
#   item <id> w h s                 one thing from the Home Catalogue, alone, for the flat (RGBA)     -> out/titem_<id>.png
# Town: x runs west to east, y south to north, z up. The canal runs east-west at y -12..-4; the station is at
# the north edge. Nobody is out: people are known by their things, and their things are indoors.
import bpy, bmesh, math, os, sys, json, random
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'tex')
OUT = os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True); os.makedirs(TEX, exist_ok=True)
MODE = sys.argv[1] if len(sys.argv) > 1 else 'town'
ARGS = sys.argv[2:]
PLACE = ARGS[0] if MODE in ('shot', 'shotmask', 'item') else None
VARIANT = ARGS[1] if MODE == 'shot' else ''
ACT = int(ARGS[0]) if MODE == 'town' else (3 if VARIANT in ('closed', 'archive', 'terminal', '3') else 2 if VARIANT == '2' else 1)
FONT = '/usr/share/fonts/truetype/liberation/LiberationSans-'

bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene
HOT = {}     # object name -> place on the town map
THING = {}   # object name -> thing you can find in a close-up
R = random.Random(1207)

# ---------- textures (Pillow): signs, posters, the view out of windows ----------
from PIL import Image, ImageDraw, ImageFont, ImageFilter
def font(size, bold=True): return ImageFont.truetype(FONT + ('Bold' if bold else 'Regular') + '.ttf', size)
def tex_posters():
    """Election posters from June 2007, every face torn off. Party colours, a list number, VOTE."""
    for i, (bg, fg, no) in enumerate((((0.85, 0.12, 0.1), (1, 1, 1), '3'), ((0.95, 0.75, 0.1), (0.1, 0.1, 0.1), '7'), ((0.1, 0.35, 0.7), (1, 1, 1), '1'), ((0.2, 0.55, 0.25), (1, 1, 1), '5'))):
        im = Image.new('RGB', (400, 560), tuple(int(c * 255) for c in bg)); d = ImageDraw.Draw(im)
        d.rectangle((0, 400, 400, 560), fill=tuple(int(c * 255) for c in fg))
        d.text((200, 450), 'VOTE', font=font(64), fill=tuple(int(c * 255) for c in bg), anchor='mm')
        d.text((200, 520), 'LIST ' + no + ' · 10 JUNE', font=font(30), fill=tuple(int(c * 255) for c in bg), anchor='mm')
        # Where the face was: torn away to the white backing paper, ragged edges.
        rr = random.Random(i)
        pts = [(200 + math.cos(a) * (115 + rr.uniform(-22, 22)), 200 + math.sin(a) * (150 + rr.uniform(-22, 22))) for a in [k * math.tau / 26 for k in range(26)]]
        d.polygon(pts, fill=(232, 228, 214))
        for k in range(30):
            x, y = rr.uniform(90, 310), rr.uniform(40, 360)
            d.line((x, y, x + rr.uniform(-12, 12), y + rr.uniform(-12, 12)), fill=(200, 194, 178), width=2)
        im.save(os.path.join(TEX, f'town_poster{i}.png'))
def tex_window_view(name, size, sky, lights, water=False, seed=1):
    """A dark rainy view for behind a window: sky, a row of houses with lit windows, wet reflections."""
    w, h = size; rr = random.Random(seed)
    im = Image.new('RGB', (w, h)); d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / h; d.line((0, y, w, y), fill=tuple(int((sky[0][k] * (1 - t) + sky[1][k] * t) * 255) for k in range(3)))
    top = int(h * 0.38)
    x = 0
    while x < w:
        bw = rr.randint(int(w * 0.06), int(w * 0.12)); bh = rr.randint(int(h * 0.18), int(h * 0.3))
        d.rectangle((x, top - bh + int(h * 0.3), x + bw, h if not water else int(h * 0.68)), fill=(18, 18, 24))
        d.polygon(((x, top - bh + int(h * 0.3)), (x + bw / 2, top - bh + int(h * 0.3) - bw * 0.35), (x + bw, top - bh + int(h * 0.3))), fill=(14, 14, 19))
        for wy in range(top - bh + int(h * 0.33), int(h * 0.62), int(h * 0.07)):
            for wx in range(x + 6, x + bw - 10, int(w * 0.035)):
                if rr.random() < lights:
                    c = rr.choice(((255, 196, 120), (255, 214, 150), (190, 205, 255)))
                    d.rectangle((wx, wy, wx + int(w * 0.018), wy + int(h * 0.04)), fill=c)
        x += bw + rr.randint(0, 6)
    if water:
        wl = int(h * 0.68)
        d.rectangle((0, wl, w, h), fill=(10, 13, 20))
        ref = im.crop((0, int(h * 0.36), w, wl)).transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(3))
        ref = Image.eval(ref, lambda v: int(v * 0.45))
        im.paste(ref.resize((w, h - wl)), (0, wl))
    # Street lamps: soft sodium dots.
    glow = Image.new('RGB', (w, h)); g = ImageDraw.Draw(glow)
    for k in range(5):
        lx, ly = rr.randint(0, w), int(h * rr.uniform(0.45, 0.6))
        g.ellipse((lx - 14, ly - 14, lx + 14, ly + 14), fill=(255, 150, 60))
    glow = glow.filter(ImageFilter.GaussianBlur(10))
    im = Image.fromarray(__import__('numpy').clip(__import__('numpy').asarray(im).astype(int) + __import__('numpy').asarray(glow).astype(int), 0, 255).astype('uint8'))
    im = im.filter(ImageFilter.GaussianBlur(1.5))   # rain on the glass
    im.save(os.path.join(TEX, name))
def tex_sign(name, text, size, bg, fg, fsize, bold=True, lines=None):
    im = Image.new('RGB', size, bg); d = ImageDraw.Draw(im)
    if lines:
        y = size[1] * 0.12
        for ln, fs in lines:
            d.text((size[0] / 2, y), ln, font=font(fs, bold), fill=fg, anchor='ma'); y += fs * 1.35
    else:
        d.text((size[0] / 2, size[1] / 2), text, font=font(fsize, bold), fill=fg, anchor='mm')
    im.save(os.path.join(TEX, name))
def tex_flyers():
    """The Learning House corkboard: course flyers and job ads, hand-written cards (STORY.md, js/clinic.js)."""
    im = Image.new('RGB', (900, 600), (150, 105, 62)); d = ImageDraw.Draw(im); rr = random.Random(5)
    for k in range(900 * 6):
        x, y = rr.randrange(900), rr.randrange(600); d.point((x, y), fill=(120 + rr.randrange(40), 82 + rr.randrange(30), 45))
    cards = [((40, 40, 300, 250), (250, 250, 240), ['Managing Change', '2 days · 395 euro', 'Autumn 2007']),
             ((330, 30, 560, 210), (255, 244, 170), ['WANTED', 'Training coordinator', 'Must like PowerPoint']),
             ((590, 50, 860, 260), (220, 235, 250), ['Train the Trainer', '3 days · Lindeveld', 'Lunch included']),
             ((60, 300, 330, 540), (250, 250, 240), ['Tuesday seminar', 'CANCELLED', 'Projector bulb']),
             ((370, 260, 600, 520), (250, 225, 225), ['Time Management', 'Half a day', '149 euro']),
             ((640, 300, 860, 560), (240, 240, 240), ['Reading room', 'Mon to Thu', '17:00 to 21:00'])]
    for (x0, y0, x1, y1), c, lines in cards:
        d.rectangle((x0 + 5, y0 + 5, x1 + 5, y1 + 5), fill=(70, 50, 30)); d.rectangle((x0, y0, x1, y1), fill=c)
        for i, ln in enumerate(lines): d.text(((x0 + x1) / 2, y0 + 45 + i * 60), ln, font=font(30 if i == 0 else 24, i == 0), fill=(30, 30, 40), anchor='mm')
        d.ellipse(((x0 + x1) / 2 - 8, y0 + 4, (x0 + x1) / 2 + 8, y0 + 20), fill=(200, 30, 30))
    im.save(os.path.join(TEX, 'town_cork.png'))

if MODE in ('town', 'shot', 'item'):
    tex_posters()
    tex_window_view('town_view_canal.png', (1200, 600), ((0.05, 0.07, 0.13), (0.12, 0.13, 0.18)), 0.4, water=True, seed=3)
    tex_window_view('town_view_square.png', (1200, 600), ((0.05, 0.07, 0.13), (0.14, 0.14, 0.18)), 0.35, seed=4)
    tex_window_view('town_view_dead.png', (1200, 600), ((0.10, 0.10, 0.11), (0.16, 0.16, 0.17)), 0.0, water=True, seed=3)
    tex_sign('town_junction.png', 'THE JUNCTION', (1200, 200), (120, 22, 26), (250, 236, 200), 120)
    tex_sign('town_hall.png', 'CITY HALL', (1200, 200), (205, 196, 170), (40, 36, 30), 130)
    tex_sign('town_station.png', 'LINDEVELD', (1200, 200), (28, 52, 98), (255, 255, 255), 130)
    tex_sign('town_mill.png', 'THE LEARNING HOUSE', (1600, 200), (36, 34, 32), (238, 226, 196), 120)
    tex_sign('town_bakery.png', 'BAKERY', (900, 200), (238, 228, 200), (130, 40, 30), 130)
    tex_sign('town_backat7.png', '', (400, 300), (250, 250, 245), (20, 20, 20), 0, lines=[('BACK', 90), ('AT 7', 90)])
    tex_sign('town_counters.png', 'CITIZEN SERVICES', (1600, 200), (30, 60, 110), (255, 255, 255), 110)
    tex_sign('town_takeanumber.png', '', (500, 400), (250, 250, 245), (20, 30, 60), 0, lines=[('TAKE A', 80), ('NUMBER', 80), ('Appointment only', 40)])
    tex_sign('town_tag.png', '', (300, 160), (246, 246, 240), (20, 20, 20), 0, lines=[('ARCHIVE', 54), ('ITEM', 54)])
    tex_sign('town_soup.png', '', (600, 420), (24, 30, 26), (235, 235, 225), 0, lines=[('TONIGHT', 70), ('Soup of the day', 46), ('Croque monsieur', 46), ('Stella · Duvel · Leffe', 40)], bold=False)
    tex_sign('town_slot.png', '', (400, 600), (40, 20, 60), (255, 220, 60), 0, lines=[('JACKPOT', 70), ('7  7  7', 90), ('INSERT COIN', 40)])
    tex_flyers()

# ---------- materials ----------
M = {}
def nodes_mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    return m, m.node_tree.nodes, m.node_tree.links, m.node_tree.nodes['Principled BSDF']

def mat(name, color, rough=0.6, metal=0.0, bump=0.0, scale=40.0, var=0.0, wet=False, puddles=(0.42, 0.52), coat=0.0):
    """var darkens the colour in noisy patches; wet makes the surface glossy where puddles would be."""
    if name in M: return M[name]
    m, n, l, p = nodes_mat(name)
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    if coat: p.inputs['Coat Weight'].default_value = coat
    tc = n.new('ShaderNodeTexCoord')
    nz = n.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 8
    l.new(tc.outputs['Object'], nz.inputs['Vector'])
    if bump:
        b = n.new('ShaderNodeBump'); b.inputs['Strength'].default_value = bump; b.inputs['Distance'].default_value = 0.002
        l.new(nz.outputs['Fac'], b.inputs['Height']); l.new(b.outputs['Normal'], p.inputs['Normal'])
    if var:
        mix = n.new('ShaderNodeMix'); mix.data_type = 'RGBA'
        mix.inputs[6].default_value = (*color, 1)
        mix.inputs[7].default_value = (*[c * 0.6 for c in color], 1)
        mul = n.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = var
        l.new(nz.outputs['Fac'], mul.inputs[0]); l.new(mul.outputs[0], mix.inputs['Factor'])
        l.new(mix.outputs[2], p.inputs['Base Color'])
    if wet:
        pn = n.new('ShaderNodeTexNoise'); pn.inputs['Scale'].default_value = 0.25; pn.inputs['Detail'].default_value = 3
        gc = n.new('ShaderNodeNewGeometry'); l.new(gc.outputs['Position'], pn.inputs['Vector'])
        rp = n.new('ShaderNodeValToRGB'); rp.color_ramp.elements[0].position = puddles[0]; rp.color_ramp.elements[1].position = puddles[1]
        l.new(pn.outputs['Fac'], rp.inputs['Fac'])
        mr = n.new('ShaderNodeMapRange'); mr.inputs['To Min'].default_value = min(rough, 0.32); mr.inputs['To Max'].default_value = 0.04
        l.new(rp.outputs['Color'], mr.inputs['Value']); l.new(mr.outputs['Result'], p.inputs['Roughness'])
    M[name] = m
    return m

def brick_mat(name, c1, c2, mortar=(0.5, 0.48, 0.44), scale=1.0):
    """Real bricks, for close-ups. Laid along whichever wall the face is on (object x+y across, z up)."""
    if name in M: return M[name]
    m, n, l, p = nodes_mat(name)
    tc = n.new('ShaderNodeTexCoord'); sep = n.new('ShaderNodeSeparateXYZ'); add = n.new('ShaderNodeMath'); add.operation = 'ADD'
    cmb = n.new('ShaderNodeCombineXYZ')
    l.new(tc.outputs['Object'], sep.inputs[0]); l.new(sep.outputs[0], add.inputs[0]); l.new(sep.outputs[1], add.inputs[1])
    l.new(add.outputs[0], cmb.inputs[0]); l.new(sep.outputs[2], cmb.inputs[1])
    b = n.new('ShaderNodeTexBrick')
    b.inputs['Color1'].default_value = (*c1, 1); b.inputs['Color2'].default_value = (*c2, 1); b.inputs['Mortar'].default_value = (*mortar, 1)
    b.inputs['Scale'].default_value = scale; b.inputs['Mortar Size'].default_value = 0.012
    b.inputs['Brick Width'].default_value = 0.22; b.inputs['Row Height'].default_value = 0.068
    b.offset = 0.5; b.squash = 1.0
    l.new(cmb.outputs[0], b.inputs['Vector'])
    l.new(b.outputs['Color'], p.inputs['Base Color'])
    bp = n.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.5; bp.inputs['Distance'].default_value = 0.004
    inv = n.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0
    l.new(b.outputs['Fac'], inv.inputs[1]); l.new(inv.outputs[0], bp.inputs['Height']); l.new(bp.outputs['Normal'], p.inputs['Normal'])
    p.inputs['Roughness'].default_value = 0.85
    M[name] = m
    return m

def img_mat(name, file, emit=0.0, rough=0.5):
    if name in M: return M[name]
    m, n, l, p = nodes_mat(name)
    t = n.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(os.path.join(TEX, file))
    l.new(t.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = rough
    if emit:
        l.new(t.outputs['Color'], p.inputs['Emission Color']); p.inputs['Emission Strength'].default_value = emit
    M[name] = m
    return m

def emit_mat(name, color, strength):
    if name in M: return M[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    n.remove(n['Principled BSDF'])
    e = n.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*color, 1); e.inputs['Strength'].default_value = strength
    l.new(e.outputs[0], n['Material Output'].inputs['Surface'])
    M[name] = m
    return m

def glass_mat(name='glass', tint=(0.9, 0.95, 0.95), rough=0.03):
    if name in M: return M[name]
    m, n, l, p = nodes_mat(name)
    p.inputs['Base Color'].default_value = (*tint, 1)
    p.inputs['Transmission Weight'].default_value = 1.0
    p.inputs['Roughness'].default_value = rough
    p.inputs['IOR'].default_value = 1.45
    M[name] = m
    return m

def fog_mat(name, r0, r1, alpha, centre=(0.0, 10.0), color=(0.78, 0.8, 0.84)):
    """A sheet that is clear in town and turns to fog past radius r0..r1 (world position)."""
    m, n, l, p = nodes_mat(name)
    n.remove(p)
    geo = n.new('ShaderNodeNewGeometry'); sep = n.new('ShaderNodeSeparateXYZ'); l.new(geo.outputs['Position'], sep.inputs[0])
    dx = n.new('ShaderNodeMath'); dx.operation = 'SUBTRACT'; dx.inputs[1].default_value = centre[0]; l.new(sep.outputs[0], dx.inputs[0])
    dy = n.new('ShaderNodeMath'); dy.operation = 'SUBTRACT'; dy.inputs[1].default_value = centre[1]; l.new(sep.outputs[1], dy.inputs[0])
    cmb = n.new('ShaderNodeCombineXYZ'); l.new(dx.outputs[0], cmb.inputs[0]); l.new(dy.outputs[0], cmb.inputs[1])
    ln = n.new('ShaderNodeVectorMath'); ln.operation = 'LENGTH'; l.new(cmb.outputs[0], ln.inputs[0])
    mr = n.new('ShaderNodeMapRange'); mr.interpolation_type = 'SMOOTHSTEP'
    mr.inputs['From Min'].default_value = r0; mr.inputs['From Max'].default_value = r1; mr.inputs['To Max'].default_value = alpha
    l.new(ln.outputs['Value'], mr.inputs['Value'])
    tr = n.new('ShaderNodeBsdfTransparent'); df = n.new('ShaderNodeBsdfDiffuse'); df.inputs['Color'].default_value = (*color, 1)
    em = n.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (*color, 1); em.inputs['Strength'].default_value = 0.08
    ad = n.new('ShaderNodeAddShader'); l.new(df.outputs[0], ad.inputs[0]); l.new(em.outputs[0], ad.inputs[1])
    mx = n.new('ShaderNodeMixShader'); l.new(mr.outputs['Result'], mx.inputs['Fac']); l.new(tr.outputs[0], mx.inputs[1]); l.new(ad.outputs[0], mx.inputs[2])
    l.new(mx.outputs[0], n['Material Output'].inputs['Surface'])
    return m

# ---------- geometry ----------
BOXF = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
def place(o, hot=None, thing=None):
    S.collection.objects.link(o)
    if hot: HOT[o.name] = hot
    if thing: THING[o.name] = thing
    return o

class MB:
    """Many boxes and polygons, one object: a house is one mesh with a few materials."""
    def __init__(s): s.v, s.f, s.mi, s.mats = [], [], [], []
    def k(s, m):
        if m not in s.mats: s.mats.append(m)
        return s.mats.index(m)
    def box(s, x0, y0, z0, x1, y1, z1, m):
        i = len(s.v); s.v += [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
        for f in BOXF: s.f.append(tuple(i + a for a in f)); s.mi.append(s.k(m))
    def poly(s, pts, m):
        i = len(s.v); s.v += list(pts); s.f.append(tuple(range(i, i + len(pts)))); s.mi.append(s.k(m))
    def done(s, name, loc=(0, 0, 0), rot=0.0, hot=None, thing=None, smooth=False):
        me = bpy.data.meshes.new(name); me.from_pydata(s.v, [], s.f)
        for p_, k_ in zip(me.polygons, s.mi): p_.material_index = k_
        bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
        for m in s.mats: me.materials.append(m)
        me.update()
        o = bpy.data.objects.new(name, me); o.location = loc; o.rotation_euler = (0, 0, rot)
        return place(o, hot, thing)

def box(name, x0, y0, z0, x1, y1, z1, m, hot=None, thing=None, bevel=0.0):
    b = MB(); b.box(x0, y0, z0, x1, y1, z1, m); o = b.done(name, hot=hot, thing=thing)
    if bevel and min(x1 - x0, y1 - y0, z1 - z0) > bevel * 2:
        bv = o.modifiers.new('bevel', 'BEVEL'); bv.width = bevel; bv.segments = 2; bv.limit_method = 'ANGLE'
    return o

def cyl(name, x, y, z0, r, h, m, verts=20, r2=None, hot=None, thing=None):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r if r2 is None else r2, depth=h)
    bm.to_mesh(me); bm.free()
    for p_ in me.polygons: p_.use_smooth = len(p_.vertices) == 4
    me.materials.append(m)
    o = bpy.data.objects.new(name, me); o.location = (x, y, z0 + h / 2)
    return place(o, hot, thing)

def rod(name, p1, p2, r, m, verts=10, hot=None, thing=None):
    a, b = Vector(p1), Vector(p2)
    o = cyl(name, 0, 0, 0, r, (b - a).length, m, verts, hot=hot, thing=thing)
    o.location = (a + b) / 2; o.rotation_euler = (b - a).to_track_quat('Z', 'Y').to_euler()
    return o

BALL = {}
def ball(name, x, y, z, r, m, sx=1, sy=1, sz=1, lumpy=True, hot=None, thing=None):
    key = (m.name, lumpy)
    if key not in BALL:
        me = bpy.data.meshes.new('ball_' + m.name); bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1); bm.to_mesh(me); bm.free()
        for p_ in me.polygons: p_.use_smooth = True
        me.materials.append(m)
        tx = bpy.data.textures.new('lumps_' + m.name, 'CLOUDS'); tx.noise_scale = 0.45
        BALL[key] = (me, tx)
    me, tx = BALL[key]
    o = bpy.data.objects.new(name, me); o.location = (x, y, z); o.scale = (r * sx, r * sy, r * sz)
    o.rotation_euler = (0, 0, R.uniform(0, math.tau))
    if lumpy:
        d = o.modifiers.new('lumps', 'DISPLACE'); d.texture = tx; d.strength = 0.35; d.texture_coords = 'GLOBAL'
    return place(o, hot, thing)

def text(name, body, x, y, z, size, m, face='-y', bold=True, extrude=0.01, hot=None, thing=None):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = body; cu.size = size; cu.extrude = extrude
    cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
    cu.font = bpy.data.fonts.load(FONT + ('Bold' if bold else 'Regular') + '.ttf')
    o = bpy.data.objects.new(name, cu); o.location = (x, y, z)
    o.rotation_euler = {'-y': (math.pi / 2, 0, 0), '+x': (math.pi / 2, 0, math.pi / 2), '+y': (math.pi / 2, 0, math.pi), '-x': (math.pi / 2, 0, -math.pi / 2), 'up': (0, 0, 0)}[face]
    o.data.materials.append(m)
    return place(o, hot, thing)

def picture(name, cx, cy, cz, w, h, m, face='-y', hot=None, thing=None, t=0.01):
    """A flat picture (sign, poster) on a wall; face is where it looks."""
    if face == '-y': return uvbox(name, cx - w / 2, cy - t, cz - h / 2, cx + w / 2, cy, cz + h / 2, m, face, hot, thing)
    if face == '+y': return uvbox(name, cx - w / 2, cy, cz - h / 2, cx + w / 2, cy + t, cz + h / 2, m, face, hot, thing)
    if face == '+x': return uvbox(name, cx, cy - w / 2, cz - h / 2, cx + t, cy + w / 2, cz + h / 2, m, face, hot, thing)
    if face == '-x': return uvbox(name, cx - t, cy - w / 2, cz - h / 2, cx, cy + w / 2, cz + h / 2, m, face, hot, thing)
    if face == 'up': return uvbox(name, cx - w / 2, cy - h / 2, cz, cx + w / 2, cy + h / 2, cz + t, m, face, hot, thing)

def uvbox(name, x0, y0, z0, x1, y1, z1, m, face, hot=None, thing=None):
    me = bpy.data.meshes.new(name)
    v = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    me.from_pydata(v, [], BOXF); me.update()
    uv = me.uv_layers.new()
    for poly in me.polygons:
        for li, vi in zip(poly.loop_indices, poly.vertices):
            co = Vector(v[vi])
            if face == 'up': u, w_ = (co.x - x0) / (x1 - x0), (co.y - y0) / (y1 - y0)
            elif face in ('-y', '+y'): u, w_ = (co.x - x0) / (x1 - x0), (co.z - z0) / (z1 - z0)
            else: u, w_ = (co.y - y0) / (y1 - y0), (co.z - z0) / (z1 - z0)
            if face in ('+y', '-x'): u = 1 - u
            uv.data[li].uv = (u, w_)
    me.materials.append(m)
    return place(bpy.data.objects.new(name, me), hot, thing)

def light(name, kind, loc, energy, color=(1, 0.8, 0.6), size=0.2, rot=None, size_y=None):
    lt = bpy.data.lights.new(name, kind); lt.energy = energy; lt.color = color
    if kind == 'AREA':
        lt.size = size
        if size_y: lt.shape = 'RECTANGLE'; lt.size_y = size_y
    else: lt.shadow_soft_size = size
    o = bpy.data.objects.new(name, lt); o.location = loc
    if rot: o.rotation_euler = rot
    S.collection.objects.link(o)
    return lt

# ---------- palette ----------
FAR = MODE in ('town', 'townmask')   # the diorama: no brick pattern (it would shimmer), noise instead
BRICKS = [mat('brick_red', (0.34, 0.13, 0.08), 0.85, bump=0.15, scale=30, var=0.4),
          mat('brick_brown', (0.25, 0.14, 0.09), 0.85, bump=0.15, scale=30, var=0.4),
          mat('brick_yellow', (0.52, 0.42, 0.28), 0.85, bump=0.15, scale=30, var=0.4),
          mat('render_white', (0.66, 0.64, 0.6), 0.8, bump=0.05, scale=30, var=0.3),
          mat('brick_dark', (0.18, 0.09, 0.07), 0.85, bump=0.15, scale=30, var=0.4)]
if not FAR:
    BRICKS = [brick_mat('cbrick_red', (0.34, 0.13, 0.08), (0.28, 0.1, 0.07)), brick_mat('cbrick_brown', (0.25, 0.14, 0.09), (0.2, 0.11, 0.07)),
              brick_mat('cbrick_yellow', (0.52, 0.42, 0.28), (0.45, 0.36, 0.24), (0.55, 0.53, 0.5)), mat('render_white', (0.66, 0.64, 0.6), 0.8, bump=0.05, scale=30, var=0.3),
              brick_mat('cbrick_dark', (0.18, 0.09, 0.07), (0.15, 0.08, 0.06))]
SLATE = mat('slate', (0.07, 0.075, 0.085), 0.35, bump=0.3, scale=25, var=0.3, wet=True, puddles=(0.3, 0.6))
TILE = mat('rooftile', (0.24, 0.08, 0.05), 0.5, bump=0.3, scale=25, var=0.4, wet=True, puddles=(0.3, 0.6))
STONE = mat('stone', (0.55, 0.52, 0.46), 0.75, bump=0.1, scale=12, var=0.35)
TRIM = mat('trim', (0.82, 0.8, 0.75), 0.5)
DARKWIN = mat('darkwin', (0.012, 0.014, 0.018), 0.06, coat=1.0)
K = 1.0 if FAR else 0.3   # close up, a lit window is a glow, not a light box
WARMS = [emit_mat('win_warm1', (1.0, 0.68, 0.36), 3.2 * K), emit_mat('win_warm2', (1.0, 0.78, 0.5), 2.6 * K), emit_mat('win_warm3', (1.0, 0.6, 0.3), 2.0 * K), emit_mat('win_tv', (0.55, 0.65, 1.0), 1.4 * K)]
SHOPWIN = emit_mat('shopwin', (1.0, 0.85, 0.62), 4.0)
if not FAR:   # close up: dark glass with the shop's light behind it
    SHOPWIN = mat('shopglass', (0.02, 0.018, 0.015), 0.05, coat=1.0)
    _p = SHOPWIN.node_tree.nodes['Principled BSDF']; _p.inputs['Emission Color'].default_value = (1.0, 0.72, 0.42, 1); _p.inputs['Emission Strength'].default_value = 0.12; _p.inputs['Roughness'].default_value = 0.15
ASPHALT = mat('asphalt', (0.05, 0.052, 0.056), 0.7, bump=0.2, scale=300, var=0.3, wet=True)
COBBLE = mat('cobble', (0.16, 0.15, 0.14), 0.7, bump=0.5, scale=18, var=0.5, wet=True, puddles=(0.38, 0.5))
PAVING = mat('paving', (0.24, 0.235, 0.225), 0.75, bump=0.1, scale=6, var=0.35, wet=True)
KERB = mat('kerb', (0.45, 0.45, 0.43), 0.6)
GRASS = mat('grass', (0.06, 0.1, 0.04), 0.9, bump=0.3, scale=40, var=0.5)
WATER = mat('water', (0.006, 0.01, 0.014), 0.03, bump=0.08, scale=3)
EARTH = mat('earth', (0.09, 0.07, 0.05), 0.95, bump=0.3, scale=10, var=0.4)
BASE = mat('modelbase', (0.24, 0.2, 0.16), 0.5, coat=0.4)
STEEL = mat('steel', (0.3, 0.32, 0.34), 0.4, metal=0.9)
IRON = mat('iron', (0.04, 0.045, 0.05), 0.45, metal=0.6)
BARK = mat('bark', (0.1, 0.08, 0.06), 0.9, bump=0.4, scale=20)
LEAVES = [mat('leaves_rust', (0.32, 0.15, 0.04), 0.7, bump=0.6, scale=14, var=0.7), mat('leaves_gold', (0.42, 0.3, 0.06), 0.7, bump=0.6, scale=14, var=0.7),
          mat('leaves_green', (0.12, 0.15, 0.05), 0.7, bump=0.6, scale=14, var=0.7)]
SODIUM = (1.0, 0.55, 0.22)
LAMPHEAD = emit_mat('lamphead', SODIUM, 25)
CLAY = mat('clay', (0.42, 0.42, 0.43), 0.9)   # the archive's unrecovered edge: geometry with no colour left
GLASS = glass_mat()
CARS = [mat('car_' + str(i), c, 0.25, metal=0.4, coat=1.0) for i, c in enumerate(((0.12, 0.13, 0.15), (0.35, 0.03, 0.03), (0.5, 0.5, 0.52), (0.04, 0.08, 0.2), (0.15, 0.2, 0.12)))]

# ---------- the town ----------
CENTRE = Vector((0.0, 10.0))
def dist(x, y): return (Vector((x, y)) - CENTRE).length
LIT = {1: 0.42, 2: 0.42, 3: 0.04}[ACT] if MODE != 'shot' or PLACE != 'streets' else {1: 0.45, 2: 0.45, 3: 0.03}[ACT]
def edge_mat(m, x, y):
    """After the reveal the edge of town is not recovered: plain clay, no colour."""
    return CLAY if ACT >= 3 and dist(x, y) > 58 else m

def windows(b, w, h, floors, d, rng, shop=False, door=True, back=False, lit=LIT, warm_bias=0):
    """Windows on the local facade y=0 (or y=d for the back): a frame, a pane, a sill."""
    fh = h / floors
    n = max(1, int(w / 2.0))
    ys, sgn = (d, 1) if back else (0, -1)
    for f in range(floors):
        z0 = f * fh
        if f == 0 and not back and shop:
            b.box(0.4, ys + sgn * 0.06 if not back else ys, 0.25, w - 0.4, ys, fh * 0.85, SHOPWIN if rng.random() < lit * 2.2 else DARKWIN)
            b.box(0.2, ys + sgn * 0.12, fh * 0.86, w - 0.2, ys, fh * 0.98, rng.choice((mat('awning_r', (0.4, 0.05, 0.05), 0.7), mat('awning_g', (0.05, 0.2, 0.1), 0.7), mat('awning_b', (0.05, 0.08, 0.25), 0.7))))
            continue
        for i in range(n):
            cx = (i + 0.5) * w / n
            if f == 0 and door and i == 0 and not back:
                b.box(cx - 0.5, ys - 0.06, 0, cx + 0.5, ys + 0.02, 2.2, mat('door', (0.12, 0.06, 0.03), 0.5)); continue
            ww, wh = min(1.1, w / n * 0.55), fh * 0.55
            zc = z0 + fh * 0.55
            pane = rng.choice(WARMS[:3] if warm_bias else WARMS) if rng.random() < lit else DARKWIN
            b.box(cx - ww / 2 - 0.08, ys + sgn * 0.04, zc - wh / 2 - 0.08, cx + ww / 2 + 0.08, ys + sgn * 0.0, zc + wh / 2 + 0.08, TRIM)
            b.box(cx - ww / 2, ys + sgn * 0.07, zc - wh / 2, cx + ww / 2, ys + sgn * 0.02, zc + wh / 2, pane)
            b.box(cx - ww / 2 - 0.12, ys + sgn * 0.16, zc - wh / 2 - 0.12, cx + ww / 2 + 0.12, ys, zc - wh / 2 - 0.06, STONE)

def house(name, x, y, w, d, h, face, rng, shop=False, style=None, wall=None, hot=None, lit=None):
    """A Flemish town house, built with its front at local y=0 looking -y, then turned to face S/E/N/W."""
    rng = random.Random(name)   # its own dice, so the same house looks the same in every act and every shot
    rot = {'S': 0, 'E': math.pi / 2, 'N': math.pi, 'W': -math.pi / 2}[face]
    wx, wy = {'S': (x + w / 2, y + d / 2), 'E': (x - d / 2, y + w / 2), 'N': (x - w / 2, y - d / 2), 'W': (x + d / 2, y - w / 2)}[face]
    wall = edge_mat(wall or rng.choice(BRICKS), wx, wy)
    roofm = edge_mat(rng.choice((SLATE, SLATE, TILE)), wx, wy)
    style = style or rng.choice(('eaves', 'eaves', 'gable', 'step', 'flat'))
    floors = max(2, int(h / 3.0))
    b = MB()
    b.box(0, 0, 0, w, d, h, wall)
    b.box(-0.02, -0.08, h - 0.25, w + 0.02, 0.0, h - 0.1, edge_mat(TRIM, wx, wy))   # cornice
    lit_ = LIT if lit is None else lit
    if wall is not CLAY:
        windows(b, w, h, floors, d, rng, shop=shop, lit=lit_)
        windows(b, w, h, floors, d, rng, back=True, door=False, lit=lit_ * 0.6)
    rh = min(w, d) * 0.45
    if style == 'eaves':
        o = 0.25
        b.poly([(-o, -o, h), (w + o, -o, h), (w + o, d / 2, h + rh), (-o, d / 2, h + rh)], roofm)
        b.poly([(w + o, d + o, h), (-o, d + o, h), (-o, d / 2, h + rh), (w + o, d / 2, h + rh)], roofm)
        b.poly([(0, 0, h), (0, d / 2, h + rh), (0, d, h)], wall); b.poly([(w, d, h), (w, d / 2, h + rh), (w, 0, h)], wall)
        if rng.random() < 0.5: b.box(w * 0.7, d * 0.55, h, w * 0.7 + 0.5, d * 0.55 + 0.5, h + rh + 0.6, wall)   # chimney
    elif style in ('gable', 'step'):
        rh = w * 0.6
        o = 0.15
        b.poly([(-o, -0.05, h), (w / 2, -0.05, h + rh), (w / 2, d + o, h + rh), (-o, d + o, h)], roofm)
        b.poly([(w + o, d + o, h), (w / 2, d + o, h + rh), (w / 2, -0.05, h + rh), (w + o, -0.05, h)], roofm)
        if style == 'gable':
            b.poly([(0, 0, h), (w, 0, h), (w / 2, 0, h + rh)], wall)
        else:   # a stepped gable in front of the roof
            steps = 4
            for k in range(steps):
                sx = w / 2 * k / steps
                b.box(sx, -0.12, h, w - sx, 0.25, h + rh * (k + 1) / steps, wall)
        b.poly([(w, d, h), (0, d, h), (w / 2, d, h + rh)], wall)
        if floors >= 2 and wall is not CLAY:
            b.box(w / 2 - 0.4, -0.06, h + rh * 0.25, w / 2 + 0.4, 0.02, h + rh * 0.55, rng.choice(WARMS[:2]) if rng.random() < lit_ else DARKWIN)
    else:
        b.box(-0.05, -0.05, h, w + 0.05, d + 0.05, h + 0.5, wall)
        b.box(0.3, 0.3, h + 0.02, w - 0.3, d - 0.3, h + 0.45, mat('roofing', (0.08, 0.08, 0.08), 0.6))
    return b.done(name, (x, y, 0), rot, hot=hot)

def row(prefix, x0, x1, y, face, depth, rng, hmin=8, hmax=13, shops=0.0, skip=(), wmin=5, wmax=8):
    """Fill a street side with houses from x0 to x1 (or along y for E/W faces)."""
    t = x0; i = 0
    while t < x1 - 3:
        w = min(rng.uniform(wmin, wmax), x1 - t)
        if not any(a <= t + w / 2 <= b_ for a, b_ in skip):
            h = rng.uniform(hmin, hmax)
            if face == 'S': house(f'{prefix}{i}', t, y, w, depth, h, 'S', rng, shop=rng.random() < shops)
            elif face == 'N': house(f'{prefix}{i}', t + w, y, w, depth, h, 'N', rng, shop=rng.random() < shops)
            elif face == 'E': house(f'{prefix}{i}', y, t, w, depth, h, 'E', rng, shop=rng.random() < shops)
            elif face == 'W': house(f'{prefix}{i}', y, t + w, w, depth, h, 'W', rng, shop=rng.random() < shops)
        t += w; i += 1

def tree(name, x, y, rng, s=1.0):
    if ACT >= 3 and dist(x, y) > 58: return
    h = rng.uniform(3.5, 5.0) * s
    cyl(name + '_trunk', x, y, 0, 0.18 * s, h, BARK, 8)
    lv = rng.choice(LEAVES)
    for k in range(3):
        ball(f'{name}_crown{k}', x + rng.uniform(-0.8, 0.8) * s, y + rng.uniform(-0.8, 0.8) * s, h + rng.uniform(-0.3, 0.8) * s, rng.uniform(1.4, 2.0) * s, lv, 1, 1, 0.85)

LAMPS = []
def lamp(name, x, y, on=True, h=5.0):
    """A 2007 street lamp: a grey pole, a sodium head."""
    cyl(name + '_pole', x, y, 0, 0.07, h, IRON, 8)
    b = MB(); b.box(-0.25, -0.12, -0.12, 0.25, 0.12, 0.0, IRON); o = b.done(name + '_head', (x, y, h))
    bulb = box(name + '_bulb', x - 0.18, y - 0.08, h - 0.16, x + 0.18, y + 0.08, h - 0.12, LAMPHEAD if on else DARKWIN)
    if on:
        LAMPS.append(light(name + '_L', 'POINT', (x, y, h - 0.4), 260, SODIUM, 0.3))

def car(name, x, y, rot, rng):
    if ACT >= 3 or not FAR: return   # boxes for cars only work from far away
    m = rng.choice(CARS)
    b = MB()
    b.box(-2.1, -0.85, 0.3, 2.1, 0.85, 0.95, m); b.box(-1.2, -0.78, 0.95, 1.0, 0.78, 1.45, m)
    b.box(-1.15, -0.8, 1.0, 0.95, 0.8, 1.4, DARKWIN)
    for wx in (-1.35, 1.35):
        for wy in (-0.86, 0.7): b.box(wx - 0.32, wy, 0, wx + 0.32, wy + 0.16, 0.62, mat('tyre', (0.02, 0.02, 0.02), 0.8))
    b.done(name, (x, y, 0), rot)

def ground(name, x0, y0, x1, y1, m, z=0.0, z0=-0.2, hot=None):
    # Tiles of 8 m, so that after the reveal whole tiles can be missing at the edge of town.
    if ACT < 3:
        return box(name, x0, y0, z0, x1, y1, z, m, hot=hot)
    rr = random.Random(hash(name) & 0xffff)
    b = MB()
    gx = x0
    while gx < x1:
        gy = y0
        while gy < y1:
            ax, ay = min(gx + 8, x1), min(gy + 8, y1)
            dd = dist((gx + ax) / 2, (gy + ay) / 2)
            if not (dd > 62 and rr.random() < 0.35):
                b.box(gx, gy, z0, ax, ay, z, CLAY if dd > 58 else m)
            gy = ay
        gx = ax
    return b.done(name, hot=hot)

def build_town(detail=False):
    rng = random.Random(41)
    # The base of the model, and its earth sides (the diorama is cut out of the world).
    X0, X1, Y0, Y1 = -64, 64, -42, 66
    if MODE == 'town':
        box('base', X0 - 0.4, Y0 - 0.4, -3.0, X1 + 0.4, Y1 + 0.4, -0.6, BASE)
        box('earth', X0, Y0, -0.6, X1, Y1, -0.2, EARTH)
    # Streets and squares.
    ground('g_canal_street', X0, -20, X1, -12, ASPHALT)
    ground('g_quay_n', X0, -4, X1, 0, PAVING)
    ground('g_mill_street', X0, 14, -2, 22, ASPHALT, hot='streets')
    ground('g_market', -2, 14, 16, 34, COBBLE)
    ground('g_station_road', 16, 0, 24, 30, ASPHALT)
    ground('g_square', 24, 26, X1, 44, COBBLE)
    ground('g_east_road', 46, 0, X1, 26, PAVING)
    ground('g_rail_bed', X0, 52, X1, Y1, mat('ballast', (0.2, 0.19, 0.18), 0.9, bump=0.6, scale=30, var=0.5))
    ground('g_south', X0, Y0, X1, -20, GRASS)   # back gardens
    ground('g_blocks', X0, 0, 46, 52, PAVING, z0=-0.21, z=-0.01)
    ground('g_ne', 46, 44, X1, 52, PAVING)
    # Mill Street has pavements: the carriageway is the middle four metres.
    box('ms_pave_s', X0, 14, 0, -2, 16, 0.12, PAVING); box('ms_pave_n', X0, 20, 0, -2, 22, 0.12, PAVING)
    # The canal: water a metre down between stone quays.
    box('canal_water', X0, -12, -1.2, X1, -4, -1.0, edge_mat(WATER, 0, -60) if ACT >= 3 else WATER)
    box('canal_bed', X0, -12, -2.0, X1, -4, -1.2, EARTH)
    box('quay_s', X0, -12.5, -2.0, X1, -12, 0.15, STONE); box('quay_n', X0, -4, -2.0, X1, -3.5, 0.15, STONE)
    # A bridge for Station Road.
    box('bridge_deck', 16.5, -12.5, -0.2, 23.5, -3.5, 0.25, STONE)
    box('bridge_rail_w', 16.5, -12.5, 0.25, 16.8, -3.5, 1.1, IRON); box('bridge_rail_e', 23.2, -12.5, 0.25, 23.5, -3.5, 1.1, IRON)
    # Kerbs along the streets.
    for nm, a in (('k1', (X0, -12.4, X1, -12.2)), ('k2', (X0, -20.2, X1, -20)), ('k3', (X0, 13.8, -2, 14)), ('k4', (X0, 22, -2, 22.2))):
        box('kerb_' + nm, a[0], a[1], 0, a[2], a[3], 0.12, KERB)
    # The railway: two tracks and a platform under a canopy.
    for ty in (57.0, 61.0):
        for k, dy in enumerate((-0.72, 0.72)): box(f'rail_{ty}_{k}', X0, ty + dy - 0.04, -0.01, X1, ty + dy + 0.04, 0.16, STEEL)
        b = MB(); s_ = X0
        while s_ < X1: b.box(s_, ty - 1.2, -0.05, s_ + 0.25, ty + 1.2, 0.06, mat('sleeper', (0.12, 0.09, 0.07), 0.9)); s_ += 0.9
        b.done(f'sleepers_{ty}')
    box('platform', 20, 52, 0, 60, 55.5, 0.9, STONE)
    box('canopy', 22, 52.3, 3.6, 58, 55.3, 3.8, IRON)
    for k in range(7): cyl(f'canopy_post{k}', 24 + k * 5.5, 54.6, 0.9, 0.08, 2.7, IRON, 8)
    # The station: brick, a clock, its name.
    st = MB(); stw = edge_mat(BRICKS[0], 40, 48)
    st.box(28, 44, 0, 54, 52, 9, stw); st.box(37, 43.6, 0, 45, 52, 13, stw)
    st.poly([(37, 43.6, 13), (45, 43.6, 13), (41, 43.6, 16)], stw)
    st.poly([(36.8, 43.4, 13), (41, 43.4, 16.2), (41, 52.2, 16.2), (36.8, 52.2, 13)], SLATE); st.poly([(45.2, 52.2, 13), (41, 52.2, 16.2), (41, 43.4, 16.2), (45.2, 43.4, 13)], SLATE)
    st.box(27.8, 43.8, 9, 54.2, 52.2, 9.4, SLATE)
    for k in range(10):
        if 36 < 29.5 + k * 2.6 < 45: continue
        x_ = 29.5 + k * 2.6; st.box(x_, 43.94, 1.2, x_ + 1.2, 44.0, 6.8, WARMS[1] if ACT < 3 else DARKWIN)
    st.box(38.2, 43.5, 0, 43.8, 43.62, 4.5, SHOPWIN if ACT < 3 else DARKWIN)
    st.done('station')
    cyl('clock', 41, 43.5, 9.6, 1.1, 0.12, emit_mat('clockface', (0.95, 0.92, 0.8), 1.5 if ACT < 3 else 0.0), 32).rotation_euler = (math.pi / 2, 0, 0)
    picture('station_sign', 41, 43.45, 7.2, 7.0, 1.15, img_mat('stationsign', 'town_station.png', 1.0 if ACT < 3 else 0.0))
    # The Junction, the station café: a corner house on the square, its front onto the square (east).
    j = MB(); jw = BRICKS[3]
    j.box(16, 28, 0, 26, 40, 8.5, jw)
    j.box(25.92, 28.6, 0.3, 26.06, 39.4, 3.2, SHOPWIN if ACT < 3 else emit_mat('onelamp', (1, 0.7, 0.4), 0.6))
    j.box(26.0, 28.4, 3.3, 27.4, 39.6, 3.55, mat('awning_junction', (0.42, 0.04, 0.05), 0.6))
    for k in range(4):
        y_ = 29.5 + k * 2.8; j.box(26.0, y_, 4.6, 26.07, y_ + 1.3, 6.8, WARMS[0] if (ACT < 3 and k % 2 == 0) else DARKWIN)
    j.poly([(15.8, 27.8, 8.5), (26.2, 27.8, 8.5), (26.2, 34, 11.5), (15.8, 34, 11.5)], TILE); j.poly([(26.2, 40.2, 8.5), (15.8, 40.2, 8.5), (15.8, 34, 11.5), (26.2, 34, 11.5)], TILE)
    j.poly([(16, 28, 8.5), (16, 34, 11.5), (16, 40, 8.5)], jw); j.poly([(26, 40, 8.5), (26, 34, 11.5), (26, 28, 8.5)], jw)
    j.done('junction', hot='junction')
    picture('junction_sign', 26.1, 34, 3.95, 7.0, 0.9, img_mat('junctionsign', 'town_junction.png', 0.8 if ACT < 3 else 0.0), '+x', hot='junction')
    # Café tables out front, under the awning, chairs tipped against them for the rain.
    if ACT < 3:
        for k in range(3):
            y_ = 30.5 + k * 3.2; cyl(f'terrace_t{k}', 27.6, y_, 0, 0.35, 0.75, IRON, 12)
    # City Hall: pale stone, a steep roof, a belfry on the market square.
    ch = MB(); chs = edge_mat(mat('hallstone', (0.6, 0.56, 0.47), 0.75, bump=0.15, scale=8, var=0.4), 7, 40)
    ch.box(-2, 34, 0, 16, 46, 12, chs)
    ch.poly([(-2.3, 33.7, 12), (16.3, 33.7, 12), (16.3, 40, 19), (-2.3, 40, 19)], SLATE); ch.poly([(16.3, 46.3, 12), (-2.3, 46.3, 12), (-2.3, 40, 19), (16.3, 40, 19)], SLATE)
    ch.poly([(-2, 34, 12), (-2, 40, 19), (-2, 46, 12)], chs); ch.poly([(16, 46, 12), (16, 40, 19), (16, 34, 12)], chs)
    for k in range(7):
        x_ = -0.6 + k * 2.4
        for zc, hh in ((2.5, 2.8), (7.5, 3.6)):
            if k == 3 and zc < 5: continue
            ch.box(x_, 33.92, zc - hh / 2, x_ + 1.2, 34.0, zc + hh / 2, (WARMS[1] if ACT < 3 and (k + int(zc)) % 3 == 0 else DARKWIN))
    ch.box(5.6, 33.6, 0, 8.4, 34.05, 4.2, mat('halldoor', (0.15, 0.08, 0.04), 0.5))
    for k in range(5): ch.box(4.4 - k * 0.0, 33.0 - k * 0.3, 0, 9.6, 34, 0.15 * (5 - k), STONE)
    ch.box(4.5, 34.5, 12, 9.5, 39.5, 24, chs)   # the belfry
    ch.box(4.3, 34.3, 24, 9.7, 39.7, 24.6, chs)
    ch.poly([(4.3, 34.3, 24.6), (9.7, 34.3, 24.6), (7, 37, 33)], SLATE); ch.poly([(9.7, 34.3, 24.6), (9.7, 39.7, 24.6), (7, 37, 33)], SLATE)
    ch.poly([(9.7, 39.7, 24.6), (4.3, 39.7, 24.6), (7, 37, 33)], SLATE); ch.poly([(4.3, 39.7, 24.6), (4.3, 34.3, 24.6), (7, 37, 33)], SLATE)
    for zc in (14.5, 19.5): ch.box(6.2, 34.42, zc, 7.8, 34.5, zc + 3, DARKWIN)
    ch.done('cityhall', hot='hall')
    picture('hall_sign', 7, 33.9, 5.0, 5.2, 0.8, img_mat('hallsign', 'town_hall.png', 0.0, 0.6))
    cyl('hall_clock', 7, 34.45, 21.8, 0.9, 0.1, emit_mat('hallclock', (0.95, 0.92, 0.8), 1.2 if ACT < 3 else 0), 32).rotation_euler = (math.pi / 2, 0, 0)
    # The Learning House: a textile mill on the north quay, three storeys of tall windows, a chimney.
    ml = MB(); mw = BRICKS[1]
    ml.box(24, 0.5, 0, 46, 14, 13, mw)
    for f in range(3):
        for k in range(9):
            x_ = 25.2 + k * 2.4
            warm = (f == 0) or (ACT >= 3 and f == 0) or (ACT < 3 and (k + f) % 3 == 0)
            ml.box(x_, 0.42, 1.0 + f * 4.1, x_ + 1.3, 0.5, 3.6 + f * 4.1, emit_mat('millwarm', (1.0, 0.74, 0.42), 3.4 if ACT < 3 else 4.5) if warm else DARKWIN)
            ml.box(x_ - 0.1, 0.35, 0.85 + f * 4.1, x_ + 1.4, 0.5, 1.0 + f * 4.1, STONE)
    # Saw-tooth roof lights.
    for k in range(5):
        y_ = 0.5 + k * 2.7
        ml.poly([(24, y_, 13), (46, y_, 13), (46, y_ + 2.7, 15.2), (24, y_ + 2.7, 15.2)], SLATE)
        ml.box(24, y_ + 2.6, 13, 46, y_ + 2.7, 15.2, emit_mat('rooflight', (1, 0.75, 0.45), 1.2) if (k == 1 or ACT >= 3) else DARKWIN)
        ml.poly([(24, y_, 13), (24, y_ + 2.7, 15.2), (24, y_ + 2.7, 13)], mw); ml.poly([(46, y_ + 2.7, 13), (46, y_ + 2.7, 15.2), (46, y_, 13)], mw)
    ml.box(34, 0.4, 0, 36, 0.52, 3.2, mat('milldoor', (0.12, 0.2, 0.15), 0.5))
    ml.done('mill', hot='house')
    cyl('mill_chimney', 43, 11, 0, 1.0, 30, mw, 16, r2=0.7, hot='house')
    picture('mill_sign', 35, 0.4, 12.3, 14, 1.0, img_mat('millsign', 'town_mill.png', 0.6), hot='house')
    # Canal Street: the south side, one row of houses looking north over the canal. No. 12 is yours.
    row('cs_', X0 + 2, -24, -20, 'N', 10, rng, shops=0.15)
    house('flat12', -16.5, -20, 6.5, 10, 11.5, 'N', rng, style='step', wall=BRICKS[0], hot='flat', lit=1.0)
    row('cs2_', -16.5, X1 - 2, -20, 'N', 10, rng, shops=0.2)
    # North quay: houses west of the mill, looking south over the canal.
    row('nq_', X0 + 2, 15, 0.5, 'S', 12, rng, hmin=9, hmax=14, shops=0.1)
    row('nq2_', 47, X1 - 1, 0.5, 'S', 10, rng)
    # Mill Street: both sides, west of the market. The bakery is on the north side.
    row('ms_s', X0 + 2, -2.5, 14, 'N', 10, rng, shops=0.25)
    row('ms_n', X0 + 2, -34, 22, 'S', 10, rng, shops=0.3)
    row('ms_n2', -27, -2.5, 22, 'S', 10, rng, shops=0.3)
    bk = house('bakery', -34, 22, 7, 10, 9.5, 'S', rng, shop=True, style='step', wall=BRICKS[3], hot='streets', lit=0.0)
    picture('bakery_sign', -30.5, 21.88, 3.4, 4.2, 0.9, img_mat('bakerysign', 'town_bakery.png', 0.0, 0.6), hot='streets')
    # Behind: blocks between Mill Street and the railway, west of City Hall.
    row('wb_', X0 + 2, -2.5, 34, 'S', 9, rng, shops=0.0)
    row('wb2_', X0 + 2, -2.5, 52, 'N', 9, rng)
    # East: Station Road, the square's south side, the east block.
    row('eb_', 24.5, 45.5, 26, 'N', 10, rng, shops=0.4)   # the square's south side, between it and the mill
    row('jn_', 41, 52, 26, 'E', 9, rng)                   # north of the Junction
    row('ee_', 47, X1 - 1, 26, 'N', 10, rng)
    # Trees on the quays and the square; lamps along the streets.
    for k in range(14):
        x_ = X0 + 5 + k * 9.0
        if 15 < x_ < 25: continue
        tree(f'tq{k}', x_, -14.5, rng); tree(f'tn{k}', x_ + 4, -2.0, rng, 0.9)
    for k, (x_, y_) in enumerate(((0, 16.5), (14, 16.5), (0, 31.5), (14, 31.5), (30, 42), (40, 40.5), (52, 42), (62, 30))):
        tree(f'ts{k}', x_, y_, rng, 1.1)
    lamps = [(X0 + 4 + k * 10, -12.8) for k in range(13)] + [(X0 + 6 + k * 10, -3.6) for k in range(12)] + \
            [(X0 + 4 + k * 9, 14.6) for k in range(7)] + [(3, 24), (11, 24), (3, 32.5), (11, 32.5)] + [(23.5, 4 + k * 8) for k in range(4)] + \
            [(30, 30), (38, 36), (48, 32), (56, 38), (48, 2), (58, 2)]
    for k, (x_, y_) in enumerate(lamps):
        if ACT >= 3 and dist(x_, y_) > 50: continue
        on = ACT < 3 or k % 4 == 0
        lamp(f'lamp{k}', x_, y_, on)
    for k, (x_, y_, r_) in enumerate(((-40, -18.5, 0), (-30, -18.6, 0), (2, -18.5, math.pi), (36, -18.4, 0), (-48, 15.4, 0), (-20, 15.5, math.pi), (32, 32, math.pi / 2), (36, 32, math.pi / 2), (50, 40, 0))):
        car(f'car{k}', x_, y_, r_, rng)
    # The bus to Brussels at its stop on the square.
    if ACT < 3:
        b = MB(); bus = mat('bus', (0.85, 0.75, 0.1), 0.3, coat=1.0)
        b.box(-6, -1.25, 0.3, 6, 1.25, 3.1, bus); b.box(-5.6, -1.3, 1.4, 5.4, 1.3, 2.6, WARMS[1])
        b.done('bus', (40, 28.5, 0), 0)

def town_lights():
    w = bpy.data.worlds.new('dusk'); S.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.02, 0.028, 0.05, 1) if ACT < 3 else (0.05, 0.05, 0.055, 1)
    bg.inputs['Strength'].default_value = 2.2
    sun = light('dusk', 'SUN', (0, 0, 50), 1.2 if ACT < 3 else 1.6, (0.55, 0.65, 1.0) if ACT < 3 else (0.8, 0.82, 0.86), rot=(math.radians(40), 0, math.radians(200)))
    sun.angle = math.radians(20)

def render_settings(w, h, samples, transparent=False):
    S.render.engine = 'CYCLES'
    S.cycles.device = 'CPU'
    S.cycles.samples = samples
    S.cycles.use_denoising = True
    S.cycles.use_light_tree = True
    S.cycles.max_bounces = 6; S.cycles.transparent_max_bounces = 16
    S.cycles.sample_clamp_indirect = 6
    S.cycles.blur_glossy = 0.5
    S.render.resolution_x, S.render.resolution_y, S.render.resolution_percentage = w, h, 100
    S.view_settings.view_transform = 'AgX'
    S.view_settings.look = 'AgX - Medium High Contrast'
    S.view_settings.exposure = 0.8 if FAR else 0.0
    S.render.film_transparent = transparent
    S.render.image_settings.file_format = 'PNG'
    S.render.image_settings.color_mode = 'RGBA' if transparent else 'RGB'
    S.render.use_persistent_data = True

def town_camera():
    cd = bpy.data.cameras.new('towncam'); cd.type = 'ORTHO'; cd.ortho_scale = 186; cd.clip_end = 600
    cam = bpy.data.objects.new('towncam', cd); S.collection.objects.link(cam)
    az, el, dd = math.radians(-36), math.radians(52), 260
    t = Vector((0.0, 11.0, 0.0))
    cam.location = t + Vector((math.sin(-az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el))) * dd
    d = t - cam.location; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    S.camera = cam
    return cam

def fog_volume(r0, r1, density, top=14.0, color=(0.8, 0.82, 0.86), centre=(0.0, 10.0)):
    """Fog over the model that thickens towards its edges (past the ring road), never in the middle of town."""
    m = bpy.data.materials.new('fog'); m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    n.remove(n['Principled BSDF'])
    geo = n.new('ShaderNodeNewGeometry'); sep = n.new('ShaderNodeSeparateXYZ'); l.new(geo.outputs['Position'], sep.inputs[0])
    dx = n.new('ShaderNodeMath'); dx.operation = 'SUBTRACT'; dx.inputs[1].default_value = centre[0]; l.new(sep.outputs[0], dx.inputs[0])
    dy = n.new('ShaderNodeMath'); dy.operation = 'SUBTRACT'; dy.inputs[1].default_value = centre[1]; l.new(sep.outputs[1], dy.inputs[0])
    cmb = n.new('ShaderNodeCombineXYZ'); l.new(dx.outputs[0], cmb.inputs[0]); l.new(dy.outputs[0], cmb.inputs[1])
    ln = n.new('ShaderNodeVectorMath'); ln.operation = 'LENGTH'; l.new(cmb.outputs[0], ln.inputs[0])
    mr = n.new('ShaderNodeMapRange'); mr.interpolation_type = 'SMOOTHSTEP'
    mr.inputs['From Min'].default_value = r0; mr.inputs['From Max'].default_value = r1; mr.inputs['To Max'].default_value = density
    l.new(ln.outputs['Value'], mr.inputs['Value'])
    # Low fog: thicker near the ground.
    hz = n.new('ShaderNodeMapRange'); hz.inputs['From Min'].default_value = 0; hz.inputs['From Max'].default_value = top; hz.inputs['To Min'].default_value = 1; hz.inputs['To Max'].default_value = 0.2
    l.new(sep.outputs[2], hz.inputs['Value'])
    mul = n.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; l.new(mr.outputs['Result'], mul.inputs[0]); l.new(hz.outputs['Result'], mul.inputs[1])
    vs = n.new('ShaderNodeVolumePrincipled'); vs.inputs['Color'].default_value = (*color, 1)
    l.new(mul.outputs[0], vs.inputs['Density'])
    l.new(vs.outputs[0], n['Material Output'].inputs['Volume'])
    box('fog', -64, -42, -0.5, 64, 66, top, m)

def boxes_on_screen(cam, table):
    """Screen rectangles (percent, origin top left) of every tagged object."""
    from bpy_extras.object_utils import world_to_camera_view
    bpy.context.view_layer.update()
    res = {}
    for o in S.objects:
        h = table.get(o.name)
        if not h or o.type not in ('MESH', 'FONT'): continue
        for c in o.bound_box:
            p = world_to_camera_view(S, cam, o.matrix_world @ Vector(c))
            r = res.setdefault(h, [1, 1, 0, 0])
            r[0] = min(r[0], p.x); r[1] = min(r[1], 1 - p.y); r[2] = max(r[2], p.x); r[3] = max(r[3], 1 - p.y)
    return {k: [round(v * 100, 3) for v in r] for k, r in res.items()}

def flat_ids(table, ids, path):
    """Mask pass: every tagged object glows in its own flat red level, everything else is black."""
    cols = {h: emit_mat('id_' + h, ((i + 1) / 16, 0, 0), 1) for i, h in enumerate(ids)}
    black = emit_mat('id_none', (0, 0, 0), 0)
    for o in S.objects:
        if o.type in ('MESH', 'FONT'):
            m = cols.get(table.get(o.name), black)
            o.data.materials.clear(); o.data.materials.append(m)
    for o in list(S.objects):
        if o.type == 'LIGHT': o.hide_render = True
    if S.world: S.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0
    S.view_settings.view_transform = 'Standard'; S.view_settings.look = 'None'; S.view_settings.exposure = 0
    S.cycles.use_denoising = False; S.cycles.samples = 4; S.cycles.max_bounces = 0; S.render.filter_size = 0.01
    S.render.filepath = path
    bpy.ops.render.render(write_still=True)

TOWN_IDS = ['junction', 'flat', 'hall', 'streets', 'house']

# ---------- the places, close up ----------
# Each place is a small set of its own, far from the town. eye, look-at, lens; things in id order.
SHOTS = {
    'junction': ((1.2, 0.9, 2.15), (6.0, 6.4, 1.2), 20, ['board', 'seat1', 'seat2', 'seat3', 'seat4', 'bar']),
    'flat': ((2.35, 0.12, 2.15), (2.15, 3.2, 0.35), 14, ['machine', 'envelope', 'scrapbook', 'catalogue']),
    'hall': ((1.0, 0.8, 2.6), (7.0, 7.5, 1.1), 20, ['ticket', 'counter']),
    'streets': ((-8.0, 18.3, 1.65), (-40.0, 19.4, 2.4), 24, ['posters', 'bakery', 'road']),
    'house': ((13.2, 0.6, 3.1), (6.0, 6.0, 0.9), 16, ['table', 'reader', 'handouts', 'corkboard']),
}

WOOD = mat('wood', (0.28, 0.16, 0.08), 0.45, bump=0.05, scale=4, var=0.4, coat=0.2)
DARKWOOD = mat('darkwood', (0.1, 0.055, 0.03), 0.4, bump=0.05, scale=4, var=0.3, coat=0.3)
PAPER = mat('paper', (0.9, 0.89, 0.84), 0.8)
BEIGE = mat('beige', (0.7, 0.66, 0.56), 0.45, var=0.15, scale=20)
PLASTER = mat('plaster', (0.62, 0.6, 0.55), 0.9, bump=0.05, scale=40, var=0.15)
TILEFLOOR = mat('tilefloor', (0.3, 0.28, 0.25), 0.35, bump=0.1, scale=3, var=0.4)
CHROME = mat('chrome', (0.8, 0.8, 0.82), 0.12, metal=1.0)
FABRIC = mat('fabric', (0.2, 0.08, 0.06), 0.95, bump=0.3, scale=300, var=0.3)

def room(x0, y0, x1, y1, h, wall, floor, ceil=True, open_sides=()):
    box('floor', x0 - 0.2, y0 - 0.2, -0.1, x1 + 0.2, y1 + 0.2, 0, floor)
    if ceil: box('ceiling', x0 - 0.2, y0 - 0.2, h, x1 + 0.2, y1 + 0.2, h + 0.1, PLASTER)
    if 'S' not in open_sides: box('wall_s', x0 - 0.2, y0 - 0.2, 0, x1 + 0.2, y0, h, wall)
    if 'W' not in open_sides: box('wall_w', x0 - 0.2, y0, 0, x0, y1, h, wall)

def window_wall(name, x0, x1, y, h, wins, view, sill=0.9, top=None, wall=None, mull=0.08, emit=0.9):
    """The back wall (at y, looking -y into the room) with windows onto a painted view outside."""
    top = top or h - 0.4
    wall = wall or PLASTER
    box(name + '_sill', x0, y, 0, x1, y + 0.25, sill, wall); box(name + '_head', x0, y, top, x1, y + 0.25, h, wall)
    edges = [x0] + [a for w_ in wins for a in w_] + [x1]
    for k in range(0, len(edges), 2):
        if edges[k + 1] > edges[k]: box(f'{name}_pier{k}', edges[k], y, sill, edges[k + 1], y + 0.25, top, wall)
    for k, (a, b) in enumerate(wins):
        box(f'{name}_frame{k}', a, y + 0.08, sill, b, y + 0.12, sill + 0.06, TRIM)
        for t in range(1, 3):
            xm = a + (b - a) * t / 3; box(f'{name}_mull{k}_{t}', xm - mull / 2, y + 0.06, sill, xm + mull / 2, y + 0.14, top, TRIM)
        box(f'{name}_glass{k}', a, y + 0.1, sill, b, y + 0.11, top, GLASS)
    picture(name + '_view', (x0 + x1) / 2, y + 2.5, (sill + top) / 2 + 0.2, (x1 - x0) * 1.6, (top - sill) * 2.2, img_mat(name + '_viewm', view, emit), '-y')

def stool(n, x, y, h=0.78, thing=None):
    cyl(n + '_seat', x, y, h, 0.2, 0.06, mat('stoolseat', (0.2, 0.06, 0.04), 0.5), 16, thing=thing)
    cyl(n + '_post', x, y, 0, 0.03, h, CHROME, 8, thing=thing)
    cyl(n + '_foot', x, y, 0, 0.18, 0.03, CHROME, 16, thing=thing)
    cyl(n + '_ring', x, y, 0.28, 0.17, 0.02, CHROME, 16)

def chair(n, x, y, rot=0.0, m=None, upturned=False):
    m = m or DARKWOOD
    b = MB()
    b.box(-0.21, -0.21, 0.44, 0.21, 0.21, 0.48, m)
    for dx in (-0.18, 0.15):
        for dy in (-0.18, 0.15): b.box(dx, dy, 0, dx + 0.035, dy + 0.035, 0.44, m)
    b.box(-0.21, 0.17, 0.48, 0.21, 0.21, 0.92, m)
    o = b.done(n, (x, y, 0), rot)
    if upturned:   # on the table, legs up, for the cleaner
        o.rotation_euler = (math.pi, 0, rot); o.location.z = 0.78 + 0.92
    return o

def table(n, x, y, r=0.38, h=0.74, m=None):
    cyl(n + '_top', x, y, h - 0.03, r, 0.03, m or DARKWOOD, 24)
    cyl(n + '_post', x, y, 0, 0.04, h - 0.03, IRON, 8)
    cyl(n + '_foot', x, y, 0, 0.22, 0.03, IRON, 16)

def pint(n, x, y, z, full=0.7):
    cyl(n, x, y, z, 0.038, 0.16, GLASS, 16, r2=0.044)
    if full: cyl(n + '_beer', x, y, z + 0.005, 0.034, 0.15 * full, mat('beer', (0.55, 0.3, 0.05), 0.1), 16)

def build_junction(closed):
    """The Junction, inside: the bar along the back, the departures board over it, windows onto the square."""
    W_, D_, H_ = 9.0, 7.0, 3.3
    wall = mat('junction_wall', (0.32, 0.22, 0.14), 0.8, bump=0.05, scale=30, var=0.2)
    room(0, 0, W_, D_, H_, wall, mat('jfloor', (0.16, 0.1, 0.06), 0.35, bump=0.05, scale=5, var=0.35, coat=0.3))
    box('wall_n', -0.2, D_, 0, W_ + 0.2, D_ + 0.2, H_, wall)
    box('wainscot', 0.01, D_ - 0.03, 0, W_, D_, 1.1, DARKWOOD)
    # The east wall: big windows onto the station square, at dusk in the rain.
    box('wall_e_low', W_, 0, 0, W_ + 0.25, D_, 0.8, wall)
    box('wall_e_high', W_, 0, 2.6, W_ + 0.25, D_, H_, wall)
    for k in range(4):
        y_ = k * D_ / 3.5; box(f'mull_e{k}', W_, y_ - 0.06, 0.8, W_ + 0.25, y_ + 0.06, 2.6, DARKWOOD)
    box('glass_e', W_ + 0.1, 0, 0.8, W_ + 0.11, D_, 2.6, GLASS)
    picture('view_e', W_ + 2.0, D_ / 2, 1.8, D_ * 1.6, 3.2, img_mat('view_square', 'town_view_square.png' if not closed else 'town_view_dead.png', 0.8), '-x')
    # The bar.
    box('bar_body', 1.6, 5.4, 0, 7.6, 6.0, 1.05, DARKWOOD, thing='bar')
    box('bar_top', 1.5, 5.3, 1.05, 7.7, 6.05, 1.1, mat('bartop', (0.12, 0.06, 0.03), 0.2, coat=0.6), thing='bar')
    box('bar_rail', 1.5, 5.26, 0.15, 7.7, 5.3, 0.2, mat('brass', (0.6, 0.45, 0.2), 0.25, metal=1.0))
    box('backbar', 1.5, 6.6, 0, 7.7, D_, 1.0, DARKWOOD)
    box('mirror', 1.6, 6.97, 1.15, 7.6, D_, 2.1, mat('mirror', (0.7, 0.7, 0.72), 0.04, metal=1.0))
    rr = random.Random(9)
    for k in range(2):
        box(f'shelf{k}', 1.6, 6.75, 1.35 + k * 0.4, 7.6, D_, 1.38 + k * 0.4, mat('glassshelf', (0.6, 0.65, 0.6), 0.1))
        for i in range(26):
            x_ = 1.75 + i * 0.225 + rr.uniform(-0.02, 0.02)
            cyl(f'bottle{k}_{i}', x_, 6.85, 1.38 + k * 0.4, 0.035, rr.uniform(0.24, 0.32), glass_mat('bglass' + str(i % 4), ((0.2, 0.35, 0.1), (0.5, 0.25, 0.05), (0.75, 0.7, 0.6), (0.15, 0.2, 0.35))[i % 4], 0.05), 10, r2=0.012)
    for k in range(4):
        x_ = 3.2 + k * 0.5
        cyl(f'tap{k}', x_, 5.62, 1.1, 0.035, 0.42, CHROME, 12)
        cyl(f'taph{k}', x_, 5.55, 1.5, 0.025, 0.12, mat('taphandle', (0.1, 0.1, 0.1), 0.3), 8)
    # The departures board over the bar: a dark panel; the game draws the times on it.
    box('board_case', 3.1, 6.82, 2.28, 6.1, D_, 2.98, mat('boardcase', (0.05, 0.05, 0.055), 0.4), thing='board')
    box('board_face', 3.2, 6.78, 2.36, 6.0, 6.82, 2.9, mat('boardface', (0.008, 0.008, 0.01), 0.3), thing='board')
    # Menu board and the fruit machine on the west wall.
    picture('menu', 0.02, 2.4, 1.9, 1.0, 0.7, img_mat('menum', 'town_soup.png', 0.0, 0.7), '+x')
    box('slot_body', 0.05, 4.1, 0, 0.6, 4.75, 1.75, mat('slotbody', (0.15, 0.04, 0.2), 0.3))
    picture('slot_face', 0.61, 4.425, 1.25, 0.55, 0.8, img_mat('slotm', 'town_slot.png', 1.6 if not closed else 0.0), '+x')
    # Stools, each with a regular's things: a coat, an umbrella, a hat, a bag, a half pint.
    things = []
    for k in range(4):
        x_ = 2.6 + k * 1.25
        stool(f'stool{k}', x_, 4.85, thing=f'seat{k + 1}')
        if not closed:
            pint(f'pint{k}', x_ + 0.05, 5.55, 1.1, rr.uniform(0.3, 0.8))
            THING[f'pint{k}'] = f'seat{k + 1}'
            cyl(f'mat{k}', x_ + 0.05, 5.55, 1.1, 0.05, 0.004, mat('beermat', (0.85, 0.82, 0.7), 0.8), 16)
    if not closed:
        box('coat', 2.42, 4.72, 0.55, 2.78, 5.02, 0.84, mat('coat', (0.12, 0.13, 0.1), 0.9, bump=0.3, scale=200), thing='seat1')
        rod('umbrella', (3.95, 4.62, 0.0), (4.05, 4.95, 0.95), 0.03, mat('umbrella', (0.05, 0.05, 0.08), 0.5), thing='seat2')
        ball('hat', 5.1, 4.85, 0.9, 0.17, mat('hat', (0.85, 0.7, 0.1), 0.4), 1, 1, 0.6, lumpy=False, thing='seat3')
        box('bag', 6.2, 4.65, 0.81, 6.5, 4.9, 1.1, mat('bag', (0.35, 0.25, 0.15), 0.8), thing='seat4')
    else:
        # After the reveal: a clipboard on the bar, the operator's Monday check.
        box('clipboard', 4.4, 5.45, 1.1, 4.7, 5.85, 1.115, mat('clip', (0.4, 0.28, 0.15), 0.6), thing='bar')
        box('clippaper', 4.42, 5.47, 1.115, 4.68, 5.8, 1.118, PAPER, thing='bar')
    # Tables by the window, chairs (on the tables when closed).
    for k, (x_, y_) in enumerate(((7.6, 1.2), (7.6, 3.2), (5.2, 1.6), (3.0, 1.4))):
        table(f'tbl{k}', x_, y_)
        for i, a in enumerate((0, math.pi)):
            chair(f'tch{k}_{i}', x_ + math.sin(a) * 0.62, y_ - math.cos(a) * 0.62, a, upturned=closed)
        if not closed:
            cyl(f'candle{k}', x_, y_, 0.74, 0.03, 0.08, emit_mat('candle', (1, 0.6, 0.25), 6), 10)
            light(f'candleL{k}', 'POINT', (x_, y_, 0.95), 2.5, (1, 0.6, 0.3), 0.03)
    # Pendant lamps.
    for k, (x_, y_) in enumerate(((3.0, 4.6), (4.6, 4.6), (6.2, 4.6), (7.6, 2.2), (4.2, 1.5))):
        on = not closed or k == 1
        rod(f'pend{k}_cord', (x_, y_, H_), (x_, y_, 2.35), 0.006, IRON)
        cyl(f'pend{k}', x_, y_, 2.15, 0.22, 0.2, mat('shade', (0.5, 0.25, 0.08), 0.5), 20, r2=0.06)
        cyl(f'pend{k}_bulb', x_, y_, 2.12, 0.07, 0.05, emit_mat('bulb', (1, 0.75, 0.45), 18) if on else DARKWIN, 12)
        if on: light(f'pendL{k}', 'POINT', (x_, y_, 2.05), 65 if not closed else 45, (1, 0.68, 0.38), 0.08)
    light('fill', 'AREA', (4.5, 3.0, H_ - 0.05), 120 if not closed else 15, (1, 0.8, 0.6), 4.0, size_y=3.0)
    light('window_fill', 'AREA', (W_ + 0.6, D_ / 2, 1.7), 40, (0.5, 0.6, 1.0), 3.0, rot=(0, -math.pi / 2, 0), size_y=1.6)

def build_flat(archive, items=()):
    """Canal Street 12, second floor: a bed, a chair, a window onto the canal. Staff housing."""
    W_, D_, H_ = 5.0, 4.2, 2.7
    wall = mat('flatwall', (0.56, 0.54, 0.45), 0.9, bump=0.05, scale=30, var=0.2)
    room(0, 0, W_, D_, H_, wall, mat('lino', (0.32, 0.27, 0.2), 0.35, bump=0.05, scale=2, var=0.3))
    box('wall_e', W_, 0, 0, W_ + 0.2, D_, H_, wall)
    window_wall('win', 0, W_, D_, H_, [(1.6, 3.6)], 'town_view_canal.png' if not archive else 'town_view_dead.png', sill=0.85, top=2.2, wall=wall)
    box('skirting', 0, D_ - 0.02, 0, W_, D_, 0.1, mat('skirt', (0.3, 0.25, 0.2), 0.5))
    box('winsill', 1.5, D_ - 0.12, 0.83, 3.7, D_ + 0.05, 0.87, TRIM)
    # The bed against the west wall, a grey blanket; the scrapbook on it.
    box('bed_frame', 0.05, 1.6, 0, 1.0, 3.7, 0.38, DARKWOOD)
    box('bed_mattress', 0.08, 1.63, 0.38, 0.97, 3.67, 0.55, mat('blanket', (0.25, 0.27, 0.3), 0.95, bump=0.4, scale=60))
    box('pillow', 0.15, 3.25, 0.55, 0.9, 3.6, 0.65, mat('pillow', (0.8, 0.8, 0.76), 0.9))
    box('bed_head', 0.05, 3.67, 0, 1.0, 3.75, 0.9, DARKWOOD)
    box('scrapbook', 0.3, 2.2, 0.55, 0.7, 2.7, 0.6, mat('scrap', (0.35, 0.1, 0.08), 0.6), thing='scrapbook')
    box('scrapbook_p', 0.32, 2.22, 0.6, 0.68, 2.68, 0.605, PAPER, thing='scrapbook')
    # The side table with the answering machine, its light blinking.
    box('side_table', 0.1, 0.95, 0, 0.6, 1.45, 0.55, WOOD)
    box('machine', 0.18, 1.05, 0.55, 0.48, 1.35, 0.62, BEIGE, thing='machine')
    box('machine_led', 0.42, 1.08, 0.62, 0.45, 1.11, 0.625, emit_mat('led', (1, 0.1, 0.05), 25), thing='machine')
    box('phone', 0.2, 1.1, 0.62, 0.44, 1.22, 0.66, mat('phone', (0.12, 0.12, 0.12), 0.3), thing='machine')
    # The door in the east wall, a doormat, the brown envelope from Payroll on it.
    box('door', W_ - 0.06, 1.5, 0, W_, 2.4, 2.05, mat('flatdoor', (0.45, 0.38, 0.28), 0.5))
    box('doormat', W_ - 0.85, 1.55, 0, W_ - 0.1, 2.35, 0.015, mat('mat', (0.22, 0.16, 0.08), 0.95, bump=0.4, scale=200))
    box('envelope', W_ - 0.7, 1.75, 0.015, W_ - 0.38, 1.97, 0.022, mat('envelope', (0.6, 0.45, 0.25), 0.8), thing='envelope')
    # A kitchenette along the east wall: a counter, two rings, a boiler on the wall.
    box('counter', W_ - 0.6, 2.7, 0, W_, D_ - 0.05, 0.9, mat('counter', (0.62, 0.58, 0.5), 0.4))
    box('hob', W_ - 0.5, 3.4, 0.9, W_ - 0.1, 3.9, 0.92, IRON)
    box('boiler', W_ - 0.35, 3.45, 1.55, W_, 3.95, 2.25, mat('boiler', (0.8, 0.8, 0.77), 0.4))
    # The one chair, with the Home Catalogue on it.
    chair('chair', 2.6, 1.9, math.radians(200), WOOD)
    box('catalogue', 2.45, 1.75, 0.48, 2.75, 2.1, 0.5, mat('catalogue', (0.85, 0.3, 0.1), 0.5), thing='catalogue')
    box('table', 2.0, 2.4, 0.72, 3.3, 3.2, 0.76, WOOD)
    for dx, dy in ((2.05, 2.45), (3.2, 2.45), (2.05, 3.1), (3.2, 3.1)): box(f'tleg{dx}{dy}', dx, dy, 0, dx + 0.05, dy + 0.05, 0.72, WOOD)
    pint('mug', 2.4, 2.8, 0.76, 0)
    # The bare bulb.
    rod('cord', (2.5, 2.0, H_), (2.5, 2.0, 2.2), 0.005, IRON)
    cyl('bulb', 2.5, 2.0, 2.12, 0.05, 0.08, emit_mat('flatbulb', (1, 0.8, 0.55), 20), 12)
    light('bulbL', 'POINT', (2.5, 2.0, 2.05), 80 if not archive else 40, (1, 0.75, 0.5), 0.05)
    light('canal_glow', 'AREA', (2.6, D_ + 0.4, 1.5), 20, (0.5, 0.6, 1.0), 2.0, rot=(math.radians(90), 0, 0))
    # The Home Catalogue: what you have bought turns up here (rendered one at a time, see MODE item).
    ITEMS = {}
    def it(name):
        ITEMS.setdefault(name, [])
        return name
    if 'rug' in items:
        ITEMS['rug'] = [box('rug', 1.3, 0.9, 0, 3.6, 2.6, 0.012, mat('rug', (0.45, 0.12, 0.08), 0.95, bump=0.3, scale=100, var=0.4))]
    if 'armchair' in items:
        am = mat('armchair', (0.2, 0.28, 0.22), 0.9, bump=0.3, scale=200)
        b = MB(); b.box(-0.45, -0.45, 0.15, 0.45, 0.45, 0.48, am); b.box(-0.45, 0.3, 0.15, 0.45, 0.48, 1.0, am)
        b.box(-0.55, -0.45, 0.15, -0.4, 0.48, 0.68, am); b.box(0.4, -0.45, 0.15, 0.55, 0.48, 0.68, am)
        for dx in (-0.45, 0.4):
            for dy in (-0.42, 0.4): b.box(dx, dy, 0, dx + 0.05, dy + 0.05, 0.15, DARKWOOD)
        ITEMS['armchair'] = [b.done('armchair', (3.9, 3.3, 0), math.radians(150))]
    if 'lamp' in items:
        ITEMS['lamp'] = [cyl('lamp_base', 1.3, 3.8, 0, 0.15, 0.03, IRON, 16), cyl('lamp_pole', 1.3, 3.8, 0.03, 0.015, 1.35, IRON, 8),
                         cyl('lamp_shade', 1.3, 3.8, 1.3, 0.2, 0.25, emit_mat('lampshade', (1, 0.7, 0.4), 1.5), 20, r2=0.12)]
        if MODE != 'item' or PLACE == 'lamp': light('lampL', 'POINT', (1.3, 3.8, 1.35), 25, (1, 0.7, 0.4), 0.1)
    if 'kettle' in items:
        ITEMS['kettle'] = [cyl('kettle', W_ - 0.3, 3.0, 0.9, 0.1, 0.2, CHROME, 20, r2=0.07), rod('kettle_spout', (W_ - 0.38, 3.0, 0.98), (W_ - 0.48, 3.0, 1.1), 0.015, CHROME)]
    if 'plant' in items:
        ITEMS['plant'] = [cyl('plant_pot', 2.0, D_ - 0.05, 0.87, 0.09, 0.13, mat('pot', (0.55, 0.22, 0.12), 0.7), 16, r2=0.11),
                          ball('plant', 2.0, D_ - 0.05, 1.1, 0.16, LEAVES[2], 1, 1, 1.3)]
    if 'radio' in items:
        ITEMS['radio'] = [box('radio', 2.7, 2.9, 0.76, 3.15, 3.08, 0.98, mat('radio', (0.12, 0.1, 0.09), 0.4)),
                          box('radio_grill', 2.75, 2.885, 0.8, 2.95, 2.9, 0.94, mat('grill', (0.6, 0.6, 0.6), 0.4, metal=0.8)),
                          box('radio_dial', 2.98, 2.885, 0.88, 3.1, 2.9, 0.93, emit_mat('dial', (1, 0.7, 0.3), 2))]
    if archive:
        # Every object has a small white label now: ARCHIVE ITEM, and a number.
        TAG = img_mat('tagm', 'town_tag.png', 0.0, 0.8)
        for n_, (x_, y_, z_, f_) in {'bed': (0.6, 1.58, 0.45, '-y'), 'chair': (2.62, 1.66, 0.62, '-y'), 'machine': (0.33, 1.03, 0.6, '-y'), 'window': (2.6, D_ - 0.14, 0.75, '-y'), 'counter': (W_ - 0.62, 3.0, 0.7, '-x')}.items():
            picture('tag_' + n_, x_, y_, z_, 0.16, 0.085, TAG, f_)
    return ITEMS

def build_hall(terminal):
    """City Hall, the citizen service desk: five counters, one open, a ticket machine by the door."""
    W_, D_, H_ = 13.0, 9.0, 4.2
    wall = mat('hallwall', (0.66, 0.65, 0.6), 0.85, bump=0.05, scale=30, var=0.15)
    room(0, 0, W_, D_, H_, wall, mat('hallfloor', (0.38, 0.36, 0.33), 0.25, bump=0.05, scale=1.2, var=0.4, coat=0.3))
    box('wall_n', -0.2, D_, 0, W_ + 0.2, D_ + 0.2, H_, wall)
    box('wall_e', W_, 0, 0, W_ + 0.2, D_, H_, wall)
    picture('sign', W_ / 2 + 0.5, D_ - 0.01, 3.55, 4.8, 0.6, img_mat('counterssign', 'town_counters.png', 0.2), '-y')
    # Counters along the back: a desk, a glass screen, a number over each. Only 3 is open.
    for k in range(5):
        x_ = 2.2 + k * 2.1
        open_ = k == 2
        tag = 'counter' if open_ else None
        box(f'ctr{k}_desk', x_ - 0.9, D_ - 1.8, 0, x_ + 0.9, D_ - 1.2, 1.1, mat('ctrdesk', (0.42, 0.44, 0.48), 0.4), thing=tag)
        box(f'ctr{k}_top', x_ - 0.95, D_ - 1.85, 1.1, x_ + 0.95, D_ - 1.15, 1.14, mat('ctrtop', (0.7, 0.68, 0.62), 0.3), thing=tag)
        box(f'ctr{k}_glass', x_ - 0.9, D_ - 1.5, 1.14, x_ + 0.9, D_ - 1.48, 2.2, glass_mat('screen', (0.92, 0.96, 0.96), 0.08), thing=tag)
        box(f'ctr{k}_div', x_ + 0.9, D_ - 1.85, 0, x_ + 0.98, D_, 2.3, mat('divider', (0.3, 0.32, 0.36), 0.5))
        text(f'ctr{k}_no', str(k + 1), x_, D_ - 0.05, 2.75, 0.45, emit_mat('ctrno_on', (1, 0.3, 0.1), 6) if (open_ and not terminal) else mat('ctrno', (0.15, 0.15, 0.15), 0.5), '-y')
        chair(f'ctr{k}_staff', x_, D_ - 0.7, math.pi, mat('staffchair', (0.1, 0.1, 0.12), 0.8))
        if open_ and not terminal:
            box('nameplate', x_ - 0.3, D_ - 1.84, 1.14, x_ + 0.3, D_ - 1.78, 1.24, mat('nameplate', (0.85, 0.82, 0.7), 0.3), thing='counter')
            cyl('penpot', x_ + 0.6, D_ - 1.65, 1.14, 0.05, 0.11, IRON, 12, thing='counter')
            for i in range(4): rod(f'pen{i}', (x_ + 0.6, D_ - 1.65, 1.2), (x_ + 0.55 + i * 0.03, D_ - 1.7, 1.33), 0.006, mat('pen', (0.1, 0.2, 0.6), 0.4))
            box('forms', x_ - 0.75, D_ - 1.8, 1.14, x_ - 0.35, D_ - 1.55, 1.2, PAPER, thing='counter')
            box('ctr_crt', x_ - 0.2, D_ - 1.4, 1.1, x_ + 0.25, D_ - 1.0, 1.5, BEIGE)
            light('ctr_lamp', 'POINT', (x_, D_ - 1.3, 2.3), 30, (1, 0.9, 0.75), 0.1)
        if open_ and terminal:
            # The counter is a terminal now: green letters on black, a cursor.
            box('term_body', x_ - 0.45, D_ - 1.75, 1.14, x_ + 0.45, D_ - 1.25, 1.85, mat('termbody', (0.08, 0.08, 0.09), 0.4), thing='counter')
            box('term_screen', x_ - 0.38, D_ - 1.76, 1.25, x_ + 0.38, D_ - 1.74, 1.78, emit_mat('termgreen', (0.15, 0.9, 0.35), 1.6), thing='counter')
            light('term_glow', 'AREA', (x_, D_ - 2.1, 1.5), 12, (0.2, 1.0, 0.4), 0.6, rot=(math.radians(90), 0, 0))
    # The ticket machine by the door, west wall.
    # The ticket machine just inside the door, facing the way in.
    TX, TY = 1.6, 3.4
    box('ticket_body', TX, TY, 0, TX + 0.5, TY + 0.45, 1.45, mat('ticketred', (0.6, 0.05, 0.04), 0.35, coat=0.5), thing='ticket')
    box('ticket_disp', TX + 0.1, TY - 0.02, 1.2, TX + 0.4, TY, 1.38, emit_mat('ticketdisp', (1, 0.25, 0.08), 3), thing='ticket')
    box('ticket_slot', TX + 0.18, TY - 0.03, 0.95, TX + 0.32, TY, 0.98, IRON, thing='ticket')
    box('ticket_paper', TX + 0.22, TY - 0.06, 0.88, TX + 0.28, TY, 0.96, PAPER, thing='ticket')
    picture('takeanumber', TX + 0.25, TY + 0.2, 1.75, 0.45, 0.36, img_mat('takenum', 'town_takeanumber.png', 0.2), '-y', t=0.01)
    box('takeanumber_post', TX + 0.22, TY + 0.2, 1.45, TX + 0.28, TY + 0.25, 1.57, IRON)
    # Rows of moulded chairs, a queue line on stanchions.
    for r_ in range(3):
        for k in range(6):
            chair(f'wait{r_}_{k}', 3.0 + k * 0.6 + r_ * 0.2, 2.0 + r_ * 1.4, 0, mat('plastic', (0.12, 0.3, 0.55) if not terminal else (0.3, 0.32, 0.34), 0.4))
    for k in range(5):
        x_ = 9.0 + (k % 3) * 1.1; y_ = 2.0 + (k // 3) * 1.6
        cyl(f'stanch{k}', x_, y_, 0, 0.03, 0.95, CHROME, 8); cyl(f'stanch{k}_b', x_, y_, 0, 0.16, 0.03, CHROME, 16)
    for a, b in ((0, 1), (1, 2), (3, 4)):
        p = [(9.0 + (k % 3) * 1.1, 2.0 + (k // 3) * 1.6) for k in (a, b)]
        rod(f'rope{a}', (p[0][0], p[0][1], 0.9), (p[1][0], p[1][1], 0.9), 0.02, mat('rope', (0.5, 0.05, 0.08), 0.8))
    # Strip lights.
    for k in range(3):
        for i in range(2):
            x_, y_ = 3.0 + k * 3.5, 3.0 + i * 3.0
            on = (not terminal) or (k == 1 and i == 1)
            box(f'strip{k}{i}', x_ - 0.7, y_ - 0.12, H_ - 0.05, x_ + 0.7, y_ + 0.12, H_, emit_mat('strip', (0.95, 1, 0.95), 6) if on else PLASTER)
            if on: light(f'stripL{k}{i}', 'AREA', (x_, y_, H_ - 0.08), 55, (0.92, 1.0, 0.9), 1.4, size_y=0.25)

def build_house():
    """The Learning House reading room: a mill floor, cast-iron columns, the long table under strip lights."""
    W_, D_, H_ = 14.0, 9.0, 4.6
    wall = brick_mat('millbrick', (0.3, 0.15, 0.09), (0.25, 0.12, 0.08))
    room(0, 0, W_, D_, H_, wall, mat('boards', (0.3, 0.2, 0.12), 0.5, bump=0.1, scale=2, var=0.45))
    box('wall_e', W_, 0, 0, W_ + 0.25, D_, H_, wall)
    window_wall('win', 0, W_, D_, H_, [(1.2, 3.2), (4.7, 6.7), (8.2, 10.2), (11.7, 13.4)], 'town_view_canal.png', sill=1.0, top=3.7, wall=wall, emit=0.7)
    for k in range(3):
        cyl(f'column{k}', 3.5 + k * 3.5, 4.5, 0, 0.12, H_, mat('castiron', (0.14, 0.18, 0.16), 0.5, metal=0.4), 16)
    # The long table, chairs, the overhead projector and its transparencies, today's handouts.
    box('ltable', 3.0, 3.6, 0.74, 10.0, 5.0, 0.8, WOOD, thing='table')
    for dx in (3.1, 9.85):
        for dy in (3.7, 4.85): box(f'ltleg{dx}{dy}', dx, dy, 0, dx + 0.06, dy + 0.06, 0.74, WOOD, thing='table')
    for k in range(6):
        x_ = 3.7 + k * 1.1
        chair(f'lch_s{k}', x_, 3.1, 0, WOOD); chair(f'lch_n{k}', x_, 5.5, math.pi, WOOD)
    box('ohp_base', 8.6, 4.0, 0.8, 9.1, 4.5, 0.95, mat('ohp', (0.55, 0.55, 0.52), 0.4), thing='table')
    rod('ohp_arm', (9.05, 4.25, 0.95), (9.05, 4.25, 1.45), 0.015, IRON)
    box('ohp_head', 8.75, 4.15, 1.45, 9.1, 4.35, 1.55, IRON)
    box('ohp_glass', 8.65, 4.05, 0.95, 9.05, 4.45, 0.952, emit_mat('ohpglow', (1, 0.95, 0.85), 3))
    for k in range(5): box(f'transp{k}', 8.0 + k * 0.02, 3.75 + k * 0.03, 0.8 + k * 0.003, 8.3 + k * 0.02, 4.15 + k * 0.03, 0.803 + k * 0.003, glass_mat('transp', (0.95, 0.95, 1.0), 0.15), thing='table')
    box('handouts', 3.3, 3.75, 0.8, 3.75, 4.35, 0.86, PAPER, thing='handouts')
    box('handouts_tray', 3.25, 3.7, 0.8, 3.8, 4.4, 0.82, mat('tray', (0.15, 0.15, 0.17), 0.4), thing='handouts')
    rr = random.Random(3)
    for k in range(5): box(f'sheet{k}', 4.4 + k * 1.2 + rr.uniform(-0.1, 0.1), 3.7 + rr.uniform(0, 0.3), 0.8, 4.7 + k * 1.2, 4.1 + rr.uniform(0, 0.3), 0.801, PAPER, thing='table')
    # The card catalogue against the west wall.
    box('catalogue', 0.05, 2.0, 0, 0.6, 4.2, 1.35, WOOD)
    for i in range(6):
        for k in range(8):
            y_ = 2.1 + k * 0.26; z_ = 0.12 + i * 0.2
            box(f'drawer{i}_{k}', 0.6, y_, z_, 0.62, y_ + 0.22, z_ + 0.17, mat('drawer', (0.36, 0.22, 0.1), 0.4))
            box(f'pull{i}_{k}', 0.62, y_ + 0.08, z_ + 0.06, 0.64, y_ + 0.14, z_ + 0.09, mat('brass', (0.6, 0.45, 0.2), 0.25, metal=1.0))
    # The corkboard.
    picture('corkboard', 0.03, 6.3, 1.75, 2.1, 1.4, img_mat('corkm', 'town_cork.png', 0.0, 0.8), '+x', thing='corkboard')
    box('cork_frame', 0.0, 5.2, 1.0, 0.04, 7.4, 2.5, DARKWOOD, thing='corkboard')
    # The grey machine in the corner (east), green screen, a slot, a card in the tray.
    gm = mat('greymachine', (0.45, 0.46, 0.46), 0.45, var=0.1, scale=10)
    # Against the pier between two windows, facing the room (-y).
    RX0, RX1, RY = 10.45, 11.45, D_ - 0.05
    box('reader_cab', RX0, RY - 0.9, 0, RX1, RY, 0.85, gm, thing='reader')
    box('reader_body', RX0 + 0.05, RY - 0.8, 0.85, RX1 - 0.05, RY - 0.05, 1.6, gm, thing='reader')
    box('reader_hood', RX0 + 0.1, RY - 0.6, 1.6, RX1 - 0.1, RY - 0.05, 1.75, gm, thing='reader')
    box('reader_screen', RX0 + 0.15, RY - 0.82, 1.0, RX1 - 0.15, RY - 0.8, 1.5, emit_mat('readerscreen', (0.2, 0.85, 0.35), 1.4), thing='reader')
    box('reader_slot', RX0 + 0.3, RY - 0.83, 0.9, RX1 - 0.3, RY - 0.79, 0.94, IRON, thing='reader')
    box('reader_card', RX0 + 0.38, RY - 0.98, 0.86, RX1 - 0.38, RY - 0.8, 0.87, mat('indexcard', (0.95, 0.93, 0.85), 0.8), thing='reader')
    light('reader_glow', 'AREA', (RX0 + 0.5, RY - 1.2, 1.25), 8, (0.25, 1.0, 0.45), 0.5, rot=(math.radians(90), 0, 0))
    # Strip lights hung over the long table, a radiator under the window.
    for k in range(3):
        x_ = 4.3 + k * 2.2
        rod(f'strip_w{k}a', (x_ - 0.5, 4.3, H_), (x_ - 0.5, 4.3, 2.6), 0.005, IRON); rod(f'strip_w{k}b', (x_ + 0.5, 4.3, H_), (x_ + 0.5, 4.3, 2.6), 0.005, IRON)
        box(f'strip{k}', x_ - 0.65, 4.2, 2.5, x_ + 0.65, 4.4, 2.6, IRON)
        box(f'strip{k}_tube', x_ - 0.6, 4.25, 2.48, x_ + 0.6, 4.35, 2.5, emit_mat('tube', (0.95, 1.0, 0.92), 10))
        light(f'stripL{k}', 'AREA', (x_, 4.3, 2.46), 70, (0.95, 1.0, 0.9), 1.2, size_y=0.2)
    for k in range(4): box(f'radiator{k}', 1.3 + k * 3.5, D_ - 0.35, 0.15, 3.0 + k * 3.5, D_ - 0.2, 0.8, mat('radiator', (0.8, 0.78, 0.72), 0.4))
    light('warm', 'AREA', (7, 2.0, H_ - 0.1), 150, (1, 0.75, 0.5), 5.0, size_y=3.0)
    light('desklamp', 'POINT', (3.5, 4.0, 1.4), 20, (1, 0.7, 0.4), 0.1)
    box('desklamp_shade', 3.35, 4.45, 1.2, 3.65, 4.75, 1.4, mat('greenshade', (0.05, 0.25, 0.12), 0.3, coat=0.8))
    box('desklamp_base', 3.42, 4.52, 0.8, 3.58, 4.68, 1.2, mat('brass', (0.6, 0.45, 0.2), 0.25, metal=1.0))

def build_street_detail():
    """Mill Street at eye level: the bakery's window and its card, election posters on the gable opposite."""
    BACK = img_mat('backat7', 'town_backat7.png', 0.0, 0.7)
    # The shop window is glass here, a little display behind it, and the card on the door glass.
    bpy.data.objects['bakery'].hide_render = False
    box('bakery_display_back', -33.6, 21.7, 0.3, -28.4, 21.75, 2.6, mat('displayback', (0.35, 0.3, 0.22), 0.7), thing='bakery')
    box('bakery_glass', -33.6, 21.35, 0.3, -28.4, 21.37, 2.6, GLASS, thing='bakery')
    box('bakery_sill', -33.7, 21.3, 0.12, -28.3, 21.75, 0.3, STONE, thing='bakery')
    picture('bakery_card', -29.0, 21.34, 1.5, 0.45, 0.34, BACK, '-y', thing='bakery')
    light('bakery_night', 'POINT', (-31, 21.55, 2.3), 6, (1, 0.8, 0.55), 0.1)
    # Bread in the window, under a dim night light.
    for k in range(6):
        ball(f'bread{k}', -32.8 + k * 0.6, 21.55, 0.95, 0.16, mat('bread', (0.5, 0.28, 0.1), 0.6, bump=0.3, scale=30), 1.6, 1, 0.7, lumpy=False, thing='bakery')
    box('bread_shelf', -33.4, 21.4, 0.78, -28.6, 21.7, 0.8, WOOD, thing='bakery')
    THING['bakery'] = 'bakery'; THING['bakery_sign'] = 'bakery'
    # A blank gable on the south side with four posters, faces torn off.
    # A hoarding on the south pavement with four posters, faces torn off.
    box('hoarding', -26.0, 14.05, 0.12, -20.0, 14.15, 2.6, mat('hoarding', (0.22, 0.2, 0.17), 0.8, bump=0.2, scale=10, var=0.5), thing='posters')
    for k in range(4):
        picture(f'poster{k}', -21.6 - k * 1.25, 14.15, 1.45, 0.9, 1.26, img_mat(f'posterm{k}', f'town_poster{k}.png', 0.0, 0.7), '+y', thing='posters')
    # Where the street leaves town: it goes on to the ring road (act 1), into fog (act 2), into nothing (act 3).
    if ACT < 3:
        box('road_on', -140, 14, -0.2, -64, 22, 0, ASPHALT, thing='road')
        rng = random.Random(77)
        row('far_s', -136, -66, 14, 'N', 10, rng); row('far_n', -136, -66, 22, 'S', 10, rng)
        for k in range(7): lamp(f'farlamp{k}', -70 - k * 10, 14.6)
    else:
        box('road_on', -72, 14, -0.2, -64, 22, 0, CLAY, thing='road')
    for k in range(4): lamp(f'nearlamp{k}', -12 - k * 9, 21.4)
    if ACT == 2:
        # Fog at the end of every road out of town: sheets standing across the street, thicker with distance.
        for k in range(12):
            x_ = -56 - k * 4
            m = fog_mat(f'streetfog{k}', 0, 1, 0.1 + 0.03 * k, (x_ - 1000, 0), (0.62, 0.64, 0.68))
            box(f'streetfog{k}', x_, 8, -0.2, x_ + 0.02, 28, 14, m)
    if ACT >= 3:
        w = S.world.node_tree.nodes['Background']; w.inputs['Color'].default_value = (0.22, 0.22, 0.23, 1)

# ---------- modes ----------
def write_json(name, data): json.dump(data, open(os.path.join(OUT, name), 'w'), indent=1)

if MODE in ('town', 'townmask'):
    w_, h_ = (int(ARGS[1]), int(ARGS[2])) if MODE == 'town' else (int(ARGS[0]), int(ARGS[1]))
    town_lights()
    build_town()
    if ACT == 2: fog_volume(46, 84, 0.13)
    if ACT >= 3: fog_volume(56, 84, 0.12, 8.0, (0.6, 0.6, 0.62))
    cam = town_camera()
    render_settings(w_, h_, int(ARGS[3]) if MODE == 'town' else 4, transparent=True)
    if MODE == 'town':
        write_json('town_hotspots.json', boxes_on_screen(cam, HOT))
        S.render.filepath = os.path.join(OUT, f'town_{ACT}.png')
        bpy.ops.render.render(write_still=True)
    else:
        write_json('town_ids.json', TOWN_IDS)
        flat_ids(HOT, TOWN_IDS, os.path.join(OUT, 'town_mask.png'))

elif MODE in ('shot', 'shotmask', 'item'):
    eye, look, lens, ids = SHOTS[PLACE] if MODE != 'item' else SHOTS['flat']
    if MODE == 'item': w_, h_, smp = int(ARGS[1]), int(ARGS[2]), int(ARGS[3])
    elif MODE == 'shot': w_, h_, smp = int(ARGS[2]), int(ARGS[3]), int(ARGS[4])
    else: w_, h_, smp = int(ARGS[1]), int(ARGS[2]), 4
    w = bpy.data.worlds.new('inside'); S.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.02, 0.025, 0.04, 1)
    if PLACE == 'junction' and MODE != 'item': build_junction(VARIANT == 'closed')
    elif PLACE == 'flat' or MODE == 'item':
        alls = ('rug', 'armchair', 'lamp', 'kettle', 'plant', 'radio')
        ITEMS = build_flat(VARIANT == 'archive', items=alls if MODE == 'item' else ())
    elif PLACE == 'hall': build_hall(VARIANT == 'terminal')
    elif PLACE == 'house': build_house()
    elif PLACE == 'streets':
        town_lights(); build_town(); build_street_detail()
        w = S.world
    cd = bpy.data.cameras.new('eye'); cd.lens = lens; cd.clip_start = 0.05; cd.clip_end = 400
    cam = bpy.data.objects.new('eye', cd); S.collection.objects.link(cam); S.camera = cam
    cam.location = eye; cam.rotation_euler = (Vector(look) - Vector(eye)).to_track_quat('-Z', 'Y').to_euler()
    render_settings(w_, h_, smp, transparent=(MODE == 'item'))
    if MODE == 'shot':
        write_json(f'tshot_{PLACE}.json', boxes_on_screen(cam, THING))
        if PLACE == 'junction':
            # Where the departures board sits on the picture: its face's corners, for the HTML layer.
            from bpy_extras.object_utils import world_to_camera_view
            bpy.context.view_layer.update()
            cs = [world_to_camera_view(S, cam, Vector(c)) for c in ((3.2, 6.78, 2.9), (6.0, 6.78, 2.9), (6.0, 6.78, 2.36), (3.2, 6.78, 2.36))]
            write_json('tshot_junction_board.json', [[round(c.x * 100, 3), round((1 - c.y) * 100, 3)] for c in cs])
        S.render.filepath = os.path.join(OUT, f'tshot_{PLACE}_{VARIANT}.png')
        bpy.ops.render.render(write_still=True)
    elif MODE == 'shotmask':
        write_json(f'tshot_{PLACE}_ids.json', ids)
        flat_ids(THING, ids, os.path.join(OUT, f'tshot_{PLACE}_mask.png'))
    else:
        # One catalogue thing on its own: everything else still blocks it, but renders transparent.
        keep = set(o.name for o in ITEMS.get(PLACE, []))
        for o in S.objects:
            if o.type in ('MESH', 'FONT') and o.name not in keep: o.is_holdout = True
        S.render.filepath = os.path.join(OUT, f'titem_{PLACE}.png')
        bpy.ops.render.render(write_still=True)
print('done', MODE, ARGS)
