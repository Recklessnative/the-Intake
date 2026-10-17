# The Synergix building from the street, for the title screen (Belgium, autumn 2007).
# One locked camera; the stage changes the weather and the hour, never the framing.
# Usage: python3 exterior.py <stage> <width> <height> <samples> [frame]
#   stage = day | rain | night | dystopia      -> out/title_<stage>_<width>.png
# x runs along the street, y = 0 is the building's face (it looks towards -y), z is up.
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

def ball(name, x, y, z, r, m, sx=1, sy=1, sz=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=r, location=(x, y, z))
    o = bpy.context.object; o.name = name; o.scale = (sx, sy, sz); o.data.materials.append(m)
    d = o.modifiers.new('lumps', 'DISPLACE'); t = bpy.data.textures.new(name + 'tx', 'CLOUDS'); t.noise_scale = r * 0.45
    d.texture = t; d.strength = r * 0.35
    bpy.ops.object.shade_smooth()
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

# ---------- the Synergix building: 2 + 6 floors of 1990s precast and ribbon glass ----------
BX0, BX1, BD = 0.0, 34.0, 16.0
GROUND = 4.6; FLOOR = 3.5; FLOORS = 6
TOP = GROUND + FLOOR * FLOORS
# floor -> lit stretches (x0, x1, strength). The one constant across every stage: a single lit
# stretch of window on the fourth floor, Synergix, near the corner.
LIT = {4: [(25.4, 31.4, 1.0)]}
if STAGE == 'night': LIT[2] = [(4.0, 7.0, 0.35)]
box('core', BX0 + 0.6, 9.1, 0, BX1 - 1.2, BD - 0.8, TOP, mat('coredark', (0.1, 0.1, 0.1), 0.9))   # the front 9 m are open office behind glass
DEEP = 9.0
# Ground floor: recessed glass lobby behind round columns, a canopy over the door.
box('lobby_floor', BX0, -0.2, 0, BX1, BD, 0.15, STONE)
box('lobby_back', BX0 + 0.6, 3.0, 0, BX1 - 0.6, 3.1, GROUND, mat('lobbywall', (0.75, 0.72, 0.65), 0.6))
box('lobby_glass', BX0 + 0.6, 1.4, 0.15, BX1 - 0.6, 1.43, GROUND - 0.3, TINT)
for i in range(13):
    x = BX0 + 0.8 + i * (BX1 - BX0 - 1.6) / 12
    box(f'lobby_mull{i}', x - 0.04, 1.36, 0.15, x + 0.04, 1.46, GROUND - 0.3, MULLION)
for i in range(7):
    cyl(f'column{i}', BX0 + 1.5 + i * (BX1 - BX0 - 3) / 6, 0.4, 0.15, 0.32, GROUND - 0.15, CONCRETE, 24)
box('canopy', 12.0, -2.2, 3.4, 18.0, 1.4, 3.6, STEEL, 0.02)
for x in (12.3, 17.7): cyl(f'canopy_rod{x}', x, -2.0, 0.15, 0.05, 3.3, STEEL)
lobby_light = emit_mat('lobbylight', WARM, 3.0 if DARK else 1.2)
for i in range(6): box(f'lobby_lamp{i}', 3 + i * 5.5, 1.6, GROUND - 0.32, 4.4 + i * 5.5, 2.9, GROUND - 0.3, lobby_light)
box('band0', BX0, -0.15, GROUND - 0.3, BX1, 1.0, GROUND + 0.9, CONCRETE, 0.02)

# Upper floors: a precast band, then a ribbon of tinted glass with thin mullions, every floor.
for f in range(1, FLOORS + 1):
    z0 = GROUND + (f - 1) * FLOOR
    sill = z0 + 0.9; head = z0 + FLOOR - 0.35
    if f > 1: box(f'band{f}', BX0, -0.15, z0 - 0.35, BX1, 1.0, sill, CONCRETE, 0.02)
    box(f'spandrel{f}', BX0 + 0.05, -0.17, sill - 0.25, BX1 - 0.05, -0.15, sill, SPANDREL)
    box(f'glass{f}', BX0 + 0.1, 0.35, sill, BX1 - 0.1, 0.38, head, TINT)
    for i in range(35):
        x = BX0 + 0.1 + i * (BX1 - BX0 - 0.2) / 34
        box(f'mull{f}_{i}', x - 0.035, 0.3, sill, x + 0.035, 0.42, head, MULLION)
    # The same ribbon turns the corner and runs down the side as far as the office goes.
    box(f'sband{f}', BX1 - 1.0, 0.8, z0 - 0.35, BX1 + 0.15, BD, sill, CONCRETE, 0.02)
    box(f'sglass{f}', BX1 - 0.38, 0.8, sill, BX1 - 0.35, BD - 0.6, head, TINT)
    for i in range(11):
        y = 0.9 + i * (BD - 1.5) / 10
        box(f'smull{f}_{i}', BX1 - 0.42, y - 0.035, sill, BX1 - 0.3, y + 0.035, head, MULLION)
    # Inside: a floor, a ceiling with tube lights where the floor is lit, partitions and a back wall.
    box(f'slab{f}', BX0 + 0.1, 0.42, z0 + 0.6, BX1 - 0.1, 9, z0 + 0.9, FLOOR_IN)
    box(f'back{f}', BX0 + 0.1, 9, z0 + 0.9, BX1 - 0.1, 9.1, head + 0.35, mat('backwall', (0.55, 0.55, 0.52), 0.9))
    box(f'ceil{f}', BX0 + 0.1, 0.42, head + 0.06, BX1 - 0.1, 9, head + 0.35, CEIL_OFF)
    for i in range(22):   # cubicle walls, mostly lost in the dark unless a stretch is lit
        x = BX0 + 1 + i * 1.5 + random.uniform(-0.2, 0.2)
        box(f'part{f}_{i}', x, 1.4 + random.uniform(0, 1.5), z0 + 0.9, x + 0.06, 4.2, z0 + 2.4, PARTITION)
    for j, (lx0, lx1, lit) in enumerate(LIT.get(f, [])):
        box(f'ceilglow{f}_{j}', lx0, 0.42, head + 0.04, lx1, 9, head + 0.06, emit_mat(f'ceilglow{f}_{j}', WARM, 3.0 * lit))
        for k in range(int((lx1 - lx0) / 1.6)):
            x = lx0 + 0.3 + k * 1.6
            for yy in (2.0, 4.6, 7.2): box(f'tube{f}_{j}_{k}_{yy}', x, yy, head + 0.02, x + 1.2, yy + 0.25, head + 0.04, TUBE)
        # Real light, so the glass and the street catch it.
        lt = bpy.data.lights.new(f'floorlight{f}_{j}', 'AREA'); lt.shape = 'RECTANGLE'; lt.size = lx1 - lx0; lt.size_y = 7
        lt.energy = 3500 * lit * (lx1 - lx0) / 6 * (1.5 if DARK else 1.0); lt.color = WARM
        lo = bpy.data.objects.new(f'floorlight{f}_{j}', lt); lo.location = ((lx0 + lx1) / 2, 4.5, head); S.collection.objects.link(lo)
box('parapet', BX0, -0.15, TOP - 0.35, BX1, 1.0, TOP + 1.1, CONCRETE, 0.02)
box('sparapet', BX1 - 1.0, -0.15, TOP - 0.35, BX1 + 0.15, BD, TOP + 1.1, CONCRETE, 0.02)
box('sground', BX1 - 0.6, 3.0, 0, BX1 + 0.15, BD, GROUND + 0.9, STONE)
for i in range(4): box(f'sgwin{i}', BX1 + 0.15, 3.6 + i * 3.1, 0.9, BX1 + 0.18, 5.6 + i * 3.1, 3.6, DARKWIN)
box('sgdoor', BX1 + 0.15, 14.2, 0.15, BX1 + 0.19, 15.4, 2.3, PAINT)
box('roof', BX0 + 0.6, 0.6, TOP, BX1 - 0.6, BD, TOP + 0.9, CONCRETE)
box('plant_room', BX0 + 6, 3, TOP + 0.9, BX1 - 12, 12, TOP + 3.6, mat('plantroom', (0.45, 0.45, 0.43), 0.7, var=0.4, scale=8))
for i in range(6): box(f'louvre{i}', BX0 + 6.2, 2.95, TOP + 1.3 + i * 0.35, BX1 - 12.2, 3.0, TOP + 1.42 + i * 0.35, STEEL)
# The company sign on the roof edge: a lit box with an open door. No lettering.
box('sign_box', BX1 - 9.5, -0.35, TOP + 1.1, BX1 - 1.0, 0.4, TOP + 3.0, mat('signcase', (0.08, 0.09, 0.1), 0.4, metal=0.6), 0.03)
box('sign_face', BX1 - 9.3, -0.37, TOP + 1.3, BX1 - 1.2, -0.35, TOP + 2.8, SIGN)
box('sign_door', BX1 - 8.6, -0.39, TOP + 1.45, BX1 - 7.8, -0.37, TOP + 2.65, SIGN_DOOR)
for x in (BX1 - 8.8, BX1 - 2.0): box(f'sign_leg{x}', x, 0, TOP + 0.9, x + 0.12, 0.3, TOP + 1.1, STEEL)

# ---------- neighbours: older brick houses to the left, a lower block to the right ----------
x = BX0
for i in range(16):
    w = random.uniform(5.5, 7.5); x1 = x; x0 = x - w
    floors = random.choice((2, 3, 3)); h = 1.2 + floors * 3.1
    m = BRICK if i % 2 == 0 else BRICK2
    y0 = random.uniform(-0.2, 0.3)
    box(f'house{i}', x0, y0, 0, x1, 12, h, m)
    box(f'cornice{i}', x0 - 0.05, y0 - 0.25, h - 0.3, x1 + 0.05, y0 + 0.2, h, STONE, 0.02)
    for fl in range(floors):
        for k in range(3):
            wx = x0 + 0.7 + k * (w - 1.4) / 3
            wz = 1.2 + fl * 3.1 + (0.6 if fl == 0 else 0.4)
            lit = DARK and random.random() < 0.25
            wm = emit_mat('housewarm', (1.0, 0.72, 0.42), 2.0) if lit else DARKWIN
            box(f'hwin{i}_{fl}_{k}', wx, y0 - 0.02, wz, wx + (w - 1.4) / 3 - 0.5, y0 + 0.05, wz + 1.9, wm)
            box(f'hsill{i}_{fl}_{k}', wx - 0.08, y0 - 0.12, wz - 0.1, wx + (w - 1.4) / 3 - 0.42, y0 + 0.05, wz, STONE)
    x = x0
box('block_r', BX1 + 12, 1.0, 0, BX1 + 42, 16, 8, mat('blockr', (0.5, 0.47, 0.42), 0.8, var=0.3, scale=10))
for fl in range(2):
    for k in range(14):
        wx = BX1 + 12.6 + k * 2.1
        box(f'rwin{fl}_{k}', wx, 0.97, 1.4 + fl * 3.2, wx + 1.4, 1.02, 3.0 + fl * 3.2, DARKWIN)
# A far skyline closes the street on the left.
for i in range(10):
    x0 = -90 + i * 7 + random.uniform(-2, 2)
    box(f'far{i}', x0, 30 + random.uniform(0, 30), 0, x0 + random.uniform(5, 9), 60 + random.uniform(0, 30), random.uniform(10, 30),
        mat('far', (0.32, 0.34, 0.37), 0.9))

# ---------- the street ----------
box('pavement_far', -120, -3.2, 0, 90, 1.0, 0.15, PAVING)
box('kerb_far', -120, -3.4, 0, 90, -3.2, 0.15, KERB)
box('road', -120, -12.6, -0.02, 90, -3.4, 0.0, ASPHALT)
box('kerb_near', -120, -12.8, 0, 90, -12.6, 0.15, KERB)
box('pavement_near', -160, -17.0, 0, 90, -12.8, 0.15, PAVING)
# Across the street: a quay and the canal, then the far bank low on the horizon. It keeps the left calm.
box('quay_edge', -160, -17.4, -0.1, 90, -17.0, 0.25, STONE, 0.02)
for i in range(-64, 36):
    cyl(f'rail_post{i}', i * 2.5, -17.2, 0.25, 0.03, 0.9, PAINT, 8)
box('rail_top', -160, -17.24, 1.12, 90, -17.16, 1.18, PAINT)
box('quay_wall', -160, -17.6, -2.2, 90, -17.4, 0.0, mat('quaywall', (0.3, 0.29, 0.27), 0.8, bump=0.3, scale=6, var=0.5))
WATER = bpy.data.materials.new('water'); WATER.use_nodes = True
wn, wl = WATER.node_tree.nodes, WATER.node_tree.links
wp = wn['Principled BSDF']; wp.inputs['Base Color'].default_value = (0.02, 0.03, 0.03, 1); wp.inputs['Roughness'].default_value = 0.04
wtc = wn.new('ShaderNodeTexCoord'); wnz = wn.new('ShaderNodeTexNoise'); wnz.inputs['Scale'].default_value = 1.6; wnz.inputs['Detail'].default_value = 6
wmp = wn.new('ShaderNodeMapping'); wmp.inputs['Scale'].default_value = (0.4, 2.5, 1)
wl.new(wtc.outputs['Object'], wmp.inputs['Vector']); wl.new(wmp.outputs[0], wnz.inputs['Vector'])
wb = wn.new('ShaderNodeBump'); wb.inputs['Strength'].default_value = 0.08 if not WET else 0.2
wl.new(wnz.outputs['Fac'], wb.inputs['Height']); wl.new(wb.outputs['Normal'], wp.inputs['Normal'])
box('canal', -300, -175, -1.6, 90, -17.4, -1.5, WATER)
random.seed(11)
FARBANK = mat('farbank', (0.42, 0.46, 0.5), 0.9, var=0.2, scale=4)
for i in range(60):
    x0 = -300 + i * 7.5 + random.uniform(-1.5, 1.5)
    h = random.uniform(5, 12) if random.random() < 0.9 else random.uniform(15, 22)
    wd = random.uniform(5, 7)
    box(f'farbank{i}', x0, -185, -1.5, x0 + wd, -170, h, FARBANK)
    for k in range(int(h / 3.2)):
        for c in range(int(wd / 1.6)):
            if random.random() < 0.6:
                box(f'fbw{i}_{k}_{c}', x0 + 0.4 + c * 1.6, -170.05, 0.5 + k * 3.2, x0 + 1.2 + c * 1.6, -170.0, 1.8 + k * 3.2,
                    emit_mat('fbwarm', (1.0, 0.75, 0.45), 1.5) if DARK and random.random() < 0.3 else DARKWIN)
for i in range(-30, 22):
    box(f'dash{i}', i * 4.0, -8.05, 0.0, i * 4.0 + 2.0, -7.95, 0.005, LINE)
box('stopline', -120, -12.45, 0.0, 90, -12.35, 0.005, LINE)

# A bus shelter on the building's side, glass and steel, its advert lit and blank.
SX, SY = -6.0, -2.4
box('shelter_roof', SX - 2.0, SY - 0.6, 2.45, SX + 2.0, SY + 1.0, 2.55, STEEL, 0.01)
for x in (SX - 1.9, SX + 1.9):
    for y in (SY - 0.5, SY + 0.9): box(f'shelter_post{x}{y}', x - 0.04, y - 0.04, 0.15, x + 0.04, y + 0.04, 2.45, STEEL)
box('shelter_back', SX - 1.9, SY + 0.88, 0.25, SX + 1.9, SY + 0.9, 2.35, SHELTER_GLASS)
box('shelter_side', SX + 1.88, SY - 0.4, 0.25, SX + 1.9, SY + 0.88, 2.35, SHELTER_GLASS)
box('shelter_ad_case', SX - 2.0, SY - 0.5, 0.3, SX - 1.86, SY + 0.85, 2.3, STEEL)
box('shelter_ad', SX - 2.02, SY - 0.4, 0.4, SX - 2.0, SY + 0.75, 2.2, AD)
box('shelter_bench', SX - 1.2, SY + 0.45, 0.5, SX + 1.2, SY + 0.8, 0.55, STEEL)
cyl('stop_pole', SX + 2.5, SY - 0.7, 0.15, 0.04, 2.8, STEEL)
box('stop_plate', SX + 2.3, SY - 0.73, 2.4, SX + 2.7, SY - 0.69, 2.9, mat('stopplate', (0.85, 0.6, 0.1), 0.4))

# Street lamps on both pavements, and plane trees going yellow along the building.
def lamp(name, x, y, facing):
    cyl(name + '_pole', x, y, 0.15, 0.08, 7.0, PAINT, 12, 0.06)
    arm_y = y + 1.2 * facing
    box(name + '_arm', x - 0.05, min(y, arm_y), 6.95, x + 0.05, max(y, arm_y), 7.05, PAINT)
    box(name + '_head', x - 0.22, arm_y - 0.35, 6.85, x + 0.22, arm_y + 0.35, 7.05, PAINT, 0.02)
    box(name + '_glow', x - 0.18, arm_y - 0.3, 6.83, x + 0.18, arm_y + 0.3, 6.85, LAMPGLOW if DARK else mat('lampoff', (0.7, 0.68, 0.6), 0.2))
    if DARK:
        lt = bpy.data.lights.new(name, 'SPOT'); lt.energy = 2600; lt.color = (1.0, 0.62, 0.3); lt.spot_size = math.radians(120)
        lt.spot_blend = 0.8; lt.shadow_soft_size = 0.15
        lo = bpy.data.objects.new(name, lt); lo.location = (x, arm_y, 6.8); S.collection.objects.link(lo)
for x in (-34, -10, 14, 38): lamp(f'lampf{x}', x, -2.7, -1)
for x in (-46, -22, 2, 26): lamp(f'lampn{x}', x, -13.4, 1)
for i, x in enumerate((-9.0, -2.5, 3.0, 9.5, 16.0, 22.0)):
    cyl(f'trunk{i}', x, -2.2, 0.15, 0.2, 4.2, BARK, 12, 0.14)
    for k in range(4): rod_branch = cyl(f'branch{i}_{k}', x, -2.2, 3.6, 0.07, 2.6, BARK, 8, 0.02)
    for k in range(5):   # bare limbs show through: it is late October
        a = k * math.tau / 5 + random.uniform(-0.3, 0.3)
        o = cyl(f'limb{i}_{k}', 0, 0, 0, 0.07, 2.6, BARK, 6, 0.02)
        o.location = (x + math.cos(a) * 0.5, -2.2 + math.sin(a) * 0.5, 4.9)
        o.rotation_euler = (math.sin(a) * -0.6, math.cos(a) * 0.6, 0)
    for k in range(90):
        a = random.uniform(0, math.tau); r = random.uniform(0.2, 1.9) ** 0.8
        ball(f'crown{i}_{k}', x + math.cos(a) * r, -2.2 + math.sin(a) * r * 0.8, 4.4 + random.uniform(0, 2.6) - r * 0.25,
             random.uniform(0.18, 0.38), LEAVES if k % 3 else LEAVES2, 1, 1, 0.8)
    box(f'treegrate{i}', x - 0.7, -2.9, 0.15, x + 0.7, -1.5, 0.17, STEEL)
# Fallen leaves along the kerb.
for i in range(140):
    x = random.uniform(-8, 46); y = random.uniform(-3.5, -1.0) if random.random() < 0.7 else random.uniform(-4.2, -3.4)
    box(f'leaf{i}', x, y, 0.15 if y > -3.4 else 0.0, x + 0.09, y + 0.06, 0.155 if y > -3.4 else 0.005, LEAVES)
# A few parked cars of the period, boxy and anonymous, along the far kerb.
def car(name, x, color):
    body = mat('car_' + name, color, 0.25, metal=0.5)
    box(name + '_body', x, -5.1, 0.32, x + 4.1, -3.45, 0.95, body, 0.12)
    box(name + '_cabin', x + 0.9, -4.95, 0.95, x + 3.2, -3.6, 1.45, body, 0.12)
    box(name + '_glass', x + 0.95, -4.97, 1.0, x + 3.15, -3.58, 1.4, mat('carglass', (0.02, 0.025, 0.03), 0.05))
    for wx in (x + 0.75, x + 3.35):
        for wy in (-5.12, -3.55):
            o = cyl(f'{name}_wheel{wx}{wy}', wx, wy, 0, 0.31, 0.2, mat('tyre', (0.02, 0.02, 0.02), 0.7), 16)
            o.rotation_euler = (math.pi / 2, 0, 0); o.location = (wx, wy + 0.1 if wy > -4 else wy - 0.0, 0.31)
car('car2', 21.0, (0.5, 0.52, 0.55))
car('car3', 8.0, (0.06, 0.09, 0.16))
car('car4', -14.0, (0.2, 0.22, 0.18))
# Bollards and a litter bin by the entrance.
for x in range(10, 21, 2): cyl(f'bollard{x}', x, -3.0, 0.15, 0.09, 0.9, PAINT, 12)
cyl('bin', 19.5, -2.6, 0.15, 0.25, 0.85, PAINT, 16)

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

# A level camera with the lens shifted up keeps the verticals straight, like an architect's photo.
# The building fills the right; the left third is low houses and sky, where the menu sits.
# Standing on the quay past the building's corner, looking back down the street: the building rises
# on the right and runs away to the left; the road, the canal and the sky take the left third.
cd = bpy.data.cameras.new('cam'); cd.lens = 18; cd.clip_end = 600
cd.shift_y = 0.2
cam = bpy.data.objects.new('cam', cd); S.collection.objects.link(cam); S.camera = cam
cam.location = (56.0, -14.8, 1.7)
cam.rotation_euler = (math.pi / 2, 0, math.radians(81))

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
