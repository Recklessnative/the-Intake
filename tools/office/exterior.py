# The Synergix building from its parking lot, for the title screen (Belgium, autumn 2007).
# One locked camera; the stage changes the weather and the hour, never the framing.
# Usage: python3 exterior.py <stage> <width> <height> <samples> [frame]
#   stage = day | rain | night | dystopia      -> out/title_<stage>_<width>.png
# x runs along the building, y = 0 is its face (it looks towards -y, over the lot), z is up.
import bpy, math, os, sys, random
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)
STAGE = sys.argv[1] if len(sys.argv) > 1 else 'day'
W, H = (int(a) for a in sys.argv[2:4]) if len(sys.argv) > 3 else (1280, 720)
SAMPLES = int(sys.argv[4]) if len(sys.argv) > 4 else 64
WET = True   # the street is wet in every stage; it rains from stage two
PUDDLES = (0.56, 0.64) if STAGE == 'day' else (0.42, 0.52)
DARK = STAGE in ('night', 'dystopia')

bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene
random.seed(7)

# ---------- materials ----------
M = {}
def nodes_mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    return m, m.node_tree.nodes, m.node_tree.links, m.node_tree.nodes['Principled BSDF']

def mat(name, color, rough=0.6, metal=0.0, bump=0.0, scale=40.0, var=0.0, wet=False):
    """var darkens the colour in noisy patches; wet makes the surface glossy where puddles would be."""
    if name in M: return M[name]
    m, n, l, p = nodes_mat(name)
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
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
        # Big soft noise decides where water lies: there the surface goes dark and mirror-like.
        pn = n.new('ShaderNodeTexNoise'); pn.inputs['Scale'].default_value = 0.35; pn.inputs['Detail'].default_value = 3
        l.new(tc.outputs['Object'], pn.inputs['Vector'])
        rp = n.new('ShaderNodeValToRGB'); rp.color_ramp.elements[0].position = PUDDLES[0]; rp.color_ramp.elements[1].position = PUDDLES[1]
        l.new(pn.outputs['Fac'], rp.inputs['Fac'])
        mr = n.new('ShaderNodeMapRange'); mr.inputs['To Min'].default_value = rough; mr.inputs['To Max'].default_value = 0.06
        l.new(rp.outputs['Color'], mr.inputs['Value']); l.new(mr.outputs['Result'], p.inputs['Roughness'])
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

def glass_mat(name, tint, rough=0.03):
    if name in M: return M[name]
    m, n, l, p = nodes_mat(name)
    p.inputs['Base Color'].default_value = (*tint, 1)
    p.inputs['Transmission Weight'].default_value = 1.0
    p.inputs['Roughness'].default_value = rough
    p.inputs['IOR'].default_value = 1.5
    M[name] = m
    return m

# ---------- primitives ----------
def box(name, x0, y0, z0, x1, y1, z1, m, bevel=0.0):
    me = bpy.data.meshes.new(name)
    v = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    me.from_pydata(v, [], f); me.update()
    o = bpy.data.objects.new(name, me); S.collection.objects.link(o)
    o.data.materials.append(m)
    if bevel and min(x1 - x0, y1 - y0, z1 - z0) > bevel * 2:
        b = o.modifiers.new('bevel', 'BEVEL'); b.width = bevel; b.segments = 2; b.limit_method = 'ANGLE'
    return o

def cyl(name, x, y, z0, r, h, m, verts=16, r2=None):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r if r2 is None else r2, depth=h, location=(x, y, z0 + h / 2))
    o = bpy.context.object; o.name = name; o.data.materials.append(m)
    bpy.ops.object.shade_smooth()
    return o

BALL = {}
def ball(name, x, y, z, r, m, sx=1, sy=1, sz=1):
    """A lumpy ball (shrubs, tree crowns). One mesh and one noise per material, shared and scaled."""
    if m.name not in BALL:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1)
        src = bpy.context.object; bpy.ops.object.shade_smooth()
        src.data.materials.append(m)
        tx = bpy.data.textures.new('lumps_' + m.name, 'CLOUDS'); tx.noise_scale = 0.45
        BALL[m.name] = (src.data, tx)
        bpy.data.objects.remove(src)
    me, tx = BALL[m.name]
    o = bpy.data.objects.new(name, me); S.collection.objects.link(o)
    o.location = (x, y, z); o.scale = (r * sx, r * sy, r * sz)
    o.rotation_euler = (0, 0, random.uniform(0, math.tau))
    d = o.modifiers.new('lumps', 'DISPLACE'); d.texture = tx; d.strength = 0.35; d.texture_coords = 'GLOBAL'
    return o

# ---------- palette ----------
CONCRETE = mat('concrete', (0.40, 0.39, 0.36), 0.8, bump=0.08, scale=60, var=0.45)
CEIL_OFF = mat('ceiloff', (0.05, 0.05, 0.055), 0.9)
SPANDREL = mat('spandrel', (0.30, 0.33, 0.37), 0.35, metal=0.6, var=0.1)
MULLION = mat('mullion', (0.20, 0.21, 0.22), 0.4, metal=0.8)
TINT = glass_mat('tinted', (0.55, 0.66, 0.72), 0.02)
SHELTER_GLASS = glass_mat('shelterglass', (0.9, 0.95, 0.95), 0.05)
BRICK = mat('brick', (0.36, 0.17, 0.11), 0.85, bump=0.15, scale=30, var=0.4)
BRICK2 = mat('brick2', (0.42, 0.33, 0.24), 0.85, bump=0.15, scale=30, var=0.4)
STONE = mat('stone', (0.62, 0.6, 0.55), 0.8, var=0.3, scale=20)
ASPHALT = mat('asphalt', (0.055, 0.058, 0.062), 0.75, bump=0.2, scale=400, var=0.3, wet=WET)
PAVING = mat('paving', (0.26, 0.255, 0.245), 0.8, bump=0.1, scale=6, var=0.35, wet=WET)
KERB = mat('kerb', (0.5, 0.5, 0.48), 0.7)
STEEL = mat('steel', (0.30, 0.32, 0.34), 0.45, metal=0.9)
PAINT = mat('paint', (0.09, 0.14, 0.12), 0.5, metal=0.3)
LINE = mat('roadline', (0.75, 0.75, 0.7), 0.6, wet=WET)
BARK = mat('bark', (0.12, 0.10, 0.08), 0.9, bump=0.4, scale=20)
LEAVES = mat('leaves', (0.30, 0.22, 0.07), 0.7, bump=0.6, scale=14, var=0.7)
LEAVES2 = mat('leaves2', (0.14, 0.15, 0.06), 0.7, bump=0.6, scale=14, var=0.7)
DARKWIN = mat('darkwindow', (0.02, 0.025, 0.03), 0.08)
FLOOR_IN = mat('floorin', (0.18, 0.18, 0.2), 0.9)
PARTITION = mat('partition', (0.25, 0.28, 0.33), 0.9)
WARM = (1.0, 0.72, 0.42)
TUBE = emit_mat('tube', (0.95, 0.97, 1.0), 9.0 if DARK else 5.0)
LAMPGLOW = emit_mat('lampglow', (1.0, 0.62, 0.3), 14)
AD = emit_mat('adpanel', (0.92, 0.94, 0.98), 2.2)
SIGN = emit_mat('sign', (0.2, 0.45, 1.0), 6)
SIGN_DOOR = emit_mat('signdoor', (0.15, 0.75, 0.55), 6)

# ---------- the Synergix building: a plain business-park office, ground floor plus four ----------
# Tan brick, a light precast band at every sill, dark ribbon windows, a flat roof with plant on it.
BX0, BX1, BD = 0.0, 44.0, 18.0
FLOOR = 3.4; LEVELS = 5            # ground floor (0) and floors 1-4; Synergix rents the fourth
TOP = LEVELS * FLOOR + 0.3
TAN = mat('tanbrick', (0.47, 0.37, 0.27), 0.85, bump=0.2, scale=45, var=0.35)
BAND = mat('precast', (0.62, 0.59, 0.52), 0.8, bump=0.05, scale=30, var=0.3)
BLIND = mat('blind', (0.62, 0.62, 0.58), 0.7)
GRASS = mat('grass', (0.13, 0.17, 0.06), 0.9, bump=0.3, scale=80, var=0.6)
SHRUB = mat('shrub', (0.08, 0.12, 0.05), 0.8, bump=0.6, scale=12, var=0.6)
# floor -> lit stretches (x0, x1, strength). The one constant across every stage: a single lit
# stretch of window on the fourth floor, Synergix.
LIT = {4: [(27.0, 33.0, 1.0)]}
if STAGE == 'night': LIT[2] = [(6.0, 9.0, 0.35)]
box('body', BX0, 9.1, 0, BX1, BD, TOP, TAN)   # the core; the front 9 m are open office behind glass
for x0, x1 in ((BX0 - 0.0, BX0 + 1.2), (BX0 + 10.8, BX0 + 11.8), (BX0 + 21.4, BX0 + 22.4), (BX0 + 32.0, BX0 + 33.0), (BX1 - 1.2, BX1)):
    box(f'pier{x0}', x0, -0.03, 0, x1, 9.1, TOP, TAN)   # proud of the spandrels; no shared faces
box('coping', BX0 - 0.1, -0.1, TOP, BX1 + 0.1, BD + 0.1, TOP + 0.25, BAND)
for f in range(LEVELS):
    z0 = f * FLOOR + 0.3
    sill = z0 + (1.0 if f else 0.6); head = z0 + 2.75
    box(f'band{f}', BX0 - 0.06, -0.06, sill - 0.3, BX1 + 0.06, 0.2, sill, BAND)
    box(f'spandrel{f}', BX0, 0.0, head, BX1, 0.4, (f + 1) * FLOOR + 0.3 + (1.0 if f + 1 < LEVELS else 0) - (0.3 if f + 1 < LEVELS else 0), TAN)
    if f == 0: box('plinth', BX0, 0.0, 0, BX1, 0.4, sill - 0.3, TAN)
    # The ribbon: recessed dark glass between brick piers every 11 m.
    for p in range(4):
        x0 = BX0 + 1.2 + p * 10.6; x1 = x0 + 9.6
        if f == 0 and p == 1: continue              # the entrance takes this bay
        box(f'glass{f}_{p}', x0, 0.18, sill, x1, 0.2, head, TINT)
        for i in range(7):
            x = x0 + i * (x1 - x0) / 6
            box(f'mull{f}_{p}_{i}', x - 0.04, 0.14, sill, x + 0.04, 0.22, head, MULLION)
        # Vertical blinds, half down at random: somebody always fights the glare.
        for i in range(6):
            if random.random() < 0.35:
                bx = x0 + i * (x1 - x0) / 6
                box(f'blind{f}_{p}_{i}', bx + 0.06, 0.3, head - random.uniform(0.6, 1.6), bx + (x1 - x0) / 6 - 0.06, 0.32, head - 0.05, BLIND)
    # Inside, so the glass has depth: a floor, a dark ceiling, cubicle walls.
    box(f'slab{f}', BX0 + 0.3, 0.2, z0, BX1 - 0.3, 9, sill - 0.3, FLOOR_IN)
    box(f'ceil{f}', BX0 + 0.3, 0.2, head + 0.05, BX1 - 0.3, 9, head + 0.3, CEIL_OFF)
    box(f'back{f}', BX0 + 0.3, 9, z0, BX1 - 0.3, 9.1, head + 0.3, mat('backwall', (0.4, 0.4, 0.38), 0.9))
    for i in range(26):
        x = BX0 + 1.5 + i * 1.6 + random.uniform(-0.2, 0.2)
        box(f'part{f}_{i}', x, 1.6 + random.uniform(0, 1.2), sill - 0.3, x + 0.06, 4.0, sill + 0.6, PARTITION)
    for j, (lx0, lx1, lit) in enumerate(LIT.get(f, [])):
        box(f'ceilglow{f}_{j}', lx0, 0.2, head + 0.03, lx1, 9, head + 0.05, emit_mat(f'ceilglow{f}_{j}', WARM, 3.0 * lit))
        for k in range(int((lx1 - lx0) / 1.6)):
            x = lx0 + 0.3 + k * 1.6
            for yy in (1.8, 4.4, 7.0): box(f'tube{f}_{j}_{k}_{yy}', x, yy, head + 0.01, x + 1.2, yy + 0.25, head + 0.03, TUBE)
        lt = bpy.data.lights.new(f'floorlight{f}_{j}', 'AREA'); lt.shape = 'RECTANGLE'; lt.size = lx1 - lx0; lt.size_y = 7
        lt.energy = 3500 * lit * (lx1 - lx0) / 6 * (1.5 if DARK else 1.0); lt.color = WARM
        lo = bpy.data.objects.new(f'floorlight{f}_{j}', lt); lo.location = ((lx0 + lx1) / 2, 4.5, head); S.collection.objects.link(lo)
# The entrance: a glass door bay, a flat steel canopy, two steps, a bench and an ashtray bin.
EX0, EX1 = BX0 + 11.8, BX0 + 21.8
box('entry_glass', EX0 + 2.5, 0.25, 0.3, EX1 - 2.5, 0.28, 3.0, TINT)
for x in (EX0 + 2.5, EX0 + 3.75, EX0 + 5.0, EX0 + 6.25, EX1 - 2.5): box(f'entry_mull{x}', x - 0.05, 0.2, 0.3, x + 0.05, 0.3, 3.0, MULLION)
box('entry_inside', EX0 + 2.5, 0.3, 0.3, EX1 - 2.5, 6, 3.0, emit_mat('lobbyglow', WARM, 0.6 if DARK else 0.25))
box('canopy', EX0 + 1.5, -2.6, 3.2, EX1 - 1.5, 0.0, 3.4, STEEL, 0.02)
for x in (EX0 + 1.7, EX1 - 1.7): cyl(f'canopy_post{x}', x, -2.4, 0.15, 0.06, 3.05, STEEL)
box('step1', EX0 + 1.5, -1.2, 0.0, EX1 - 1.5, 0.0, 0.3, BAND)
box('step0', EX0 + 1.5, -2.0, 0.0, EX1 - 1.5, -1.2, 0.15, BAND)
box('bench_seat', EX1 - 1.2, -3.6, 0.45, EX1 + 0.6, -3.2, 0.5, mat('benchwood', (0.3, 0.2, 0.12), 0.7))
for x in (EX1 - 1.1, EX1 + 0.5): box(f'bench_leg{x}', x, -3.55, 0.15, x + 0.05, -3.25, 0.45, STEEL)
cyl('ashtray', EX0 + 1.0, -2.8, 0.15, 0.2, 0.9, STEEL, 16)
# Downpipes, roof plant, a lift overrun.
for x in (BX0 + 0.6, BX0 + 11.4, BX0 + 32.6, BX1 - 0.6): cyl(f'downpipe{x}', x, -0.1, 0, 0.06, TOP, PAINT, 8)
box('overrun', BX0 + 18, 6, TOP + 0.25, BX0 + 23, 11, TOP + 3.0, TAN)
for i, (x, y) in enumerate(((6, 4), (9, 4), (30, 5), (34, 5), (38, 10))):
    box(f'hvac{i}', x, y, TOP + 0.25, x + 2.2, y + 1.6, TOP + 1.5, mat('hvac', (0.55, 0.56, 0.55), 0.5, metal=0.4))
# The sign by the door: a wall plate with the open-door mark. No lettering.
box('sign_plate', EX1 + 0.6, -0.08, 2.0, EX1 + 3.0, 0.0, 3.0, mat('signplate', (0.85, 0.86, 0.86), 0.3, metal=0.5))
box('sign_door', EX1 + 0.85, -0.1, 2.12, EX1 + 1.35, -0.08, 2.88, SIGN_DOOR)
box('sign_band', EX1 + 1.55, -0.1, 2.38, EX1 + 2.8, -0.08, 2.62, SIGN)
# A gravel and shrub strip along the front, grass at the ends.
box('verge', BX0 - 20, -3.2, 0, BX1 + 30, 0.0, 0.12, GRASS)
for i in range(70):
    x = random.uniform(BX0 + 0.5, BX1 - 0.5)
    if EX0 + 1.0 < x < EX1 + 3.2: continue
    ball(f'shrub{i}', x, -1.2 + random.uniform(-0.5, 0.5), 0.35, random.uniform(0.45, 0.8), SHRUB, 1, 1, 0.75)

# ---------- the parking lot ----------
box('walk', BX0 - 20, -4.6, 0, BX1 + 30, -3.2, 0.15, PAVING)
box('kerb', BX0 - 20, -4.8, 0, BX1 + 30, -4.6, 0.15, KERB)
box('lot', -140, -120, -0.02, 160, -4.8, 0.0, ASPHALT)
# Two rows of bays nose to nose either side of an aisle, lines every 2.6 m.
ROWS = ((-5.0, -10.2), (-17.4, -22.6))
for r, (ya, yb) in enumerate(ROWS):
    for i in range(-8, 24):
        x = i * 2.6
        box(f'bay{r}_{i}', x - 0.06, min(ya, yb), 0.0, x + 0.06, max(ya, yb), 0.006, LINE)
box('island', -22, -30.5, 0, 58, -29.0, 0.15, KERB)
box('island_grass', -21.8, -30.3, 0.15, 57.8, -29.2, 0.2, GRASS)
# Light poles with shoebox heads.
def pole(name, x, y):
    cyl(name, x, y, 0.15, 0.1, 9.0, STEEL, 12, 0.07)
    box(name + '_head', x - 0.35, y - 0.6, 8.9, x + 0.35, y + 0.6, 9.25, STEEL, 0.03)
    box(name + '_lens', x - 0.3, y - 0.55, 8.88, x + 0.3, y + 0.55, 8.9, LAMPGLOW if DARK else mat('lens', (0.75, 0.74, 0.7), 0.15))
    if DARK:
        lt = bpy.data.lights.new(name, 'SPOT'); lt.energy = 6000; lt.color = (1.0, 0.62, 0.3); lt.spot_size = math.radians(130)
        lt.spot_blend = 0.7; lt.shadow_soft_size = 0.2
        lo = bpy.data.objects.new(name, lt); lo.location = (x, y, 8.85); S.collection.objects.link(lo)
for x in (-18, 8, 34, 60): pole(f'pole{x}', x, -29.75)
# Parked cars of the period: saloons and estates, nose to the building, a few bays empty.
def car(name, x, y, color, estate=False, facing=1):
    body = mat('car_' + name, color, 0.2, metal=0.6)
    L, Wd = 4.4, 1.75
    y0 = y - L / 2; y1 = y + L / 2
    box(name + '_body', x - Wd / 2, y0, 0.3, x + Wd / 2, y1, 0.92, body, 0.12)
    # The cabin: a box with its roof pulled in, set back from the nose.
    cy0 = y0 + (1.0 if facing > 0 else 0.5); cy1 = y1 - (0.5 if facing > 0 else 1.0)
    if estate: cy0, cy1 = (y0 + 1.0, y1 - 0.15) if facing > 0 else (y0 + 0.15, y1 - 1.0)
    me = bpy.data.meshes.new(name + '_cabin')
    t0, t1 = (cy0 + 0.35, cy1 - (0.1 if estate else 0.35))
    if facing < 0: t0, t1 = cy0 + (0.1 if estate else 0.35), cy1 - 0.35
    xa, xb, ia = x - Wd / 2 + 0.06, x + Wd / 2 - 0.06, 0.12
    v = [(xa, cy0, 0.92), (xb, cy0, 0.92), (xb, cy1, 0.92), (xa, cy1, 0.92),
         (xa + ia, t0, 1.42), (xb - ia, t0, 1.42), (xb - ia, t1, 1.42), (xa + ia, t1, 1.42)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    me.from_pydata(v, [], f); me.update()
    o = bpy.data.objects.new(name + '_cabin', me); S.collection.objects.link(o)
    o.data.materials.append(mat('carglass', (0.015, 0.02, 0.025), 0.04))
    box(name + '_roof', xa + ia + 0.02, t0 + 0.05, 1.42, xb - ia - 0.02, t1 - 0.05, 1.45, body, 0.02)
    for wy in (y0 + 0.85, y1 - 0.85):
        for wx in (x - Wd / 2 - 0.02, x + Wd / 2 - 0.2):
            o = cyl(f'{name}_wheel{wx}{wy}', 0, 0, 0, 0.31, 0.22, mat('tyre', (0.02, 0.02, 0.02), 0.7), 18)
            o.rotation_euler = (0, math.pi / 2, 0); o.location = (wx + 0.11, wy, 0.31)
COLOURS = [(0.45, 0.46, 0.48), (0.08, 0.1, 0.16), (0.3, 0.04, 0.04), (0.6, 0.6, 0.58), (0.12, 0.16, 0.12), (0.03, 0.03, 0.035), (0.35, 0.3, 0.22)]
random.seed(21)
for r, (ya, yb) in enumerate(ROWS):
    for i in range(-7, 22):
        if random.random() < 0.38: continue
        x = i * 2.6 + 1.3
        car(f'car{r}_{i}', x + random.uniform(-0.1, 0.1), (ya + yb) / 2 + random.uniform(-0.15, 0.15), random.choice(COLOURS),
            random.random() < 0.35, 1 if r == 0 else -1)
# A dumpster by the far corner and a trolley bay of nothing in particular.
box('dumpster', BX1 + 3, -2.0, 0.0, BX1 + 5.0, -0.6, 1.3, mat('dumpster', (0.12, 0.22, 0.14), 0.6, metal=0.3), 0.03)

# ---------- around it: trees behind and to the left, a neighbouring shed to the right ----------
random.seed(5)
TREE_A = mat('treeA', (0.14, 0.15, 0.06), 0.8, bump=0.6, scale=10, var=0.6)
TREE_B = mat('treeB', (0.32, 0.22, 0.07), 0.8, bump=0.6, scale=10, var=0.6)
def tree(name, x, y, h):
    cyl(name + '_trunk', x, y, 0, 0.25, h * 0.45, BARK, 8, 0.18)
    mm = TREE_A if random.random() < 0.6 else TREE_B
    for k in range(12):
        hk = random.uniform(0.35, 0.95)
        spread = (1.0 - abs(hk - 0.6)) * 2.6 * h / 12
        ball(f'{name}_{k}', x + random.uniform(-spread, spread), y + random.uniform(-spread, spread), h * hk,
             random.uniform(1.2, 2.0) * h / 12, mm if random.random() < 0.8 else (TREE_B if mm is TREE_A else TREE_A))
for i in range(40):
    tree(f'back{i}', random.uniform(-60, BX1 + 40), random.uniform(BD + 4, BD + 30), random.uniform(10, 17))
for i in range(90):   # the far tree line all round, so the lot never ends in nothing
    a = random.uniform(-1.25, 1.25)
    tree(f'far{i}', -14 + math.sin(a) * 130, -46 + math.cos(a) * 130, random.uniform(14, 22))
for i in range(45):
    tree(f'left{i}', random.uniform(-110, -32), random.uniform(-22, 30), random.uniform(9, 15))
for i in range(60):   # a clipped hedge closes the lot on the left
    ball(f'hedge{i}', -30 + random.uniform(-0.3, 0.3), -40 + i * 1.1, 0.6, random.uniform(0.8, 1.0), SHRUB, 1, 1, 0.9)
box('shed', BX1 + 14, 4, 0, BX1 + 60, 30, 7.5, mat('cladding', (0.5, 0.52, 0.5), 0.6, metal=0.3, var=0.2, scale=4))
for i in range(4): box(f'shed_door{i}', BX1 + 16 + i * 6, 3.95, 0, BX1 + 20 + i * 6, 4.0, 4.5, mat('sheddoor', (0.3, 0.32, 0.33), 0.5, metal=0.5))

# ---------- sky, sun, render ----------
w = bpy.data.worlds.new('world'); S.world = w; w.use_nodes = True
n, l = w.node_tree.nodes, w.node_tree.links
bg = n['Background']
sky = n.new('ShaderNodeTexSky'); sky.sky_type = 'MULTIPLE_SCATTERING'
sky.sun_elevation = math.radians(9); sky.sun_rotation = math.radians(-120); sky.sun_disc = False
# Clouds: noise on the view direction, thresholded, mixed over the sky. Grey and heavy once it rains.
tc = n.new('ShaderNodeTexCoord'); nz = n.new('ShaderNodeTexNoise')
nz.inputs['Scale'].default_value = 1.3; nz.inputs['Detail'].default_value = 12; nz.inputs['Roughness'].default_value = 0.62
mp = n.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1, 1, 4.0)
l.new(tc.outputs['Generated'], mp.inputs['Vector']); l.new(mp.outputs[0], nz.inputs['Vector'])
rp = n.new('ShaderNodeValToRGB')
cover = {'day': (0.38, 0.75), 'rain': (0.2, 0.45), 'night': (0.2, 0.45), 'dystopia': (0.15, 0.4)}[STAGE]
rp.color_ramp.elements[0].position, rp.color_ramp.elements[1].position = cover
l.new(nz.outputs['Fac'], rp.inputs['Fac'])
cloud = {'day': (0.58, 0.6, 0.63), 'rain': (0.32, 0.34, 0.37), 'night': (0.04, 0.045, 0.06), 'dystopia': (0.06, 0.05, 0.05)}[STAGE]
mix = n.new('ShaderNodeMix'); mix.data_type = 'RGBA'
mix.inputs[7].default_value = (*cloud, 1)
l.new(rp.outputs['Color'], mix.inputs['Factor']); l.new(sky.outputs['Color'], mix.inputs[6])
l.new(mix.outputs[2], bg.inputs['Color'])
bg.inputs['Strength'].default_value = {'day': 0.55, 'rain': 0.35, 'night': 0.12, 'dystopia': 0.1}[STAGE]
if DARK: sky.sun_elevation = math.radians(-4)

sun = bpy.data.lights.new('sun', 'SUN'); sun.angle = math.radians(6)
sun.energy = {'day': 1.1, 'rain': 0.4, 'night': 0.0, 'dystopia': 0.0}[STAGE]; sun.color = (1.0, 0.8, 0.6)
so = bpy.data.objects.new('sun', sun); S.collection.objects.link(so)
so.rotation_euler = (math.radians(90 - 9), 0, math.radians(-120 + 180))

# Standing in the lot between the parked cars, a little off to the left: the building fills the
# right two thirds, the lot, the trees and the sky leave the left calm for the menu.
cd = bpy.data.cameras.new('cam'); cd.lens = 24; cd.clip_end = 600
cd.shift_y = 0.12
cam = bpy.data.objects.new('cam', cd); S.collection.objects.link(cam); S.camera = cam
cam.location = (-14.0, -46.0, 1.6)
cam.rotation_euler = (math.pi / 2, 0, math.radians(-16))

S.render.engine = 'CYCLES'
S.cycles.device = 'CPU'
S.cycles.samples = SAMPLES
S.cycles.use_denoising = True
S.cycles.denoiser = 'OPENIMAGEDENOISE'
S.cycles.max_bounces = 6; S.cycles.diffuse_bounces = 3; S.cycles.glossy_bounces = 3; S.cycles.transmission_bounces = 6
S.cycles.sample_clamp_indirect = 6
S.view_settings.view_transform = 'AgX'
S.view_settings.look = 'AgX - Medium High Contrast'
S.view_settings.exposure = {'day': -0.65, 'rain': 0.2, 'night': 0.0, 'dystopia': 0.0}[STAGE]
S.render.resolution_x, S.render.resolution_y = W, H
S.render.resolution_percentage = 100
S.render.image_settings.file_format = 'PNG'
S.render.filepath = os.path.join(OUT, f'title_{STAGE}_{W}.png')
bpy.ops.render.render(write_still=True)
print('wrote', S.render.filepath)
