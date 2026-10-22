# Builds the Synergix office floor (Belgium, autumn 2007) in Blender, procedurally.
# Usage: python3 scene.py <mode> [args]   mode = hub | mask | walk | still
# x runs from the lift (0) to the canteen (18), y from the front aisle (0) to the windows (12).
import bpy, math, os, sys, json
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'tex')
OUT = os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)
MODE = sys.argv[1] if len(sys.argv) > 1 else 'hub'
ARGS = sys.argv[2:]

bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene
COL = {}

def coll(name):
    if name not in COL:
        c = bpy.data.collections.new(name)
        S.collection.children.link(c)
        COL[name] = c
    return COL[name]

CUR = ['room']
HOT = {}   # object name -> hotspot id
THING = {}   # object name -> (close-up, a thing you can find in it)
SHOT = ['mieke']   # the close-up the things being built belong to
def thing(o, tid):
    THING[o.name] = (SHOT[0], tid)
    return o

# ---------- materials ----------
M = {}
def nodes_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    return m, m.node_tree.nodes, m.node_tree.links, m.node_tree.nodes['Principled BSDF']

def mat(name, color, rough=0.6, metal=0.0, spec=0.5, bump=0.0, scale=40.0, var=0.0, coat=0.0):
    if name in M: return M[name]
    m, n, l, p = nodes_mat(name)
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    p.inputs['Specular IOR Level'].default_value = spec
    if coat: p.inputs['Coat Weight'].default_value = coat
    if bump or var:
        tc = n.new('ShaderNodeTexCoord'); nz = n.new('ShaderNodeTexNoise')
        nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 8
        l.new(tc.outputs['Object'], nz.inputs['Vector'])
        if bump:
            b = n.new('ShaderNodeBump'); b.inputs['Strength'].default_value = bump; b.inputs['Distance'].default_value = 0.002
            l.new(nz.outputs['Fac'], b.inputs['Height']); l.new(b.outputs['Normal'], p.inputs['Normal'])
        if var:
            mix = n.new('ShaderNodeMix'); mix.data_type = 'RGBA'
            mix.inputs['Factor'].default_value = var
            mix.inputs[6].default_value = (*color, 1)
            mix.inputs[7].default_value = (*[c * 0.75 for c in color], 1)
            l.new(nz.outputs['Fac'], mix.inputs['Factor'])
            mul = n.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = var
            l.new(nz.outputs['Fac'], mul.inputs[0]); l.new(mul.outputs[0], mix.inputs['Factor'])
            l.new(mix.outputs[2], p.inputs['Base Color'])
    M[name] = m
    return m

def img_mat(name, file, emit=0.0, rough=0.5):
    if name in M: return M[name]
    m, n, l, p = nodes_mat(name)
    t = n.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(os.path.join(TEX, file))
    l.new(t.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = rough
    if emit:
        l.new(t.outputs['Color'], p.inputs['Emission Color'])
        p.inputs['Emission Strength'].default_value = emit
    M[name] = m
    return m

def emit_mat(name, color, strength, camera_only=False):
    if name in M: return M[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    n.remove(n['Principled BSDF'])
    e = n.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*color, 1); e.inputs['Strength'].default_value = strength
    out = n['Material Output']
    if camera_only:   # the panel glows for the eye; real light comes from the area lamps
        lp = n.new('ShaderNodeLightPath'); tr = n.new('ShaderNodeBsdfTransparent'); mx = n.new('ShaderNodeMixShader')
        l.new(lp.outputs['Is Camera Ray'], mx.inputs['Fac']); l.new(tr.outputs[0], mx.inputs[1]); l.new(e.outputs[0], mx.inputs[2])
        l.new(mx.outputs[0], out.inputs['Surface'])
    else:
        l.new(e.outputs[0], out.inputs['Surface'])
    M[name] = m
    return m

def glass_mat():
    if 'glass' in M: return M['glass']
    m, n, l, p = nodes_mat('glass')
    p.inputs['Base Color'].default_value = (0.92, 0.97, 0.96, 1)
    p.inputs['Transmission Weight'].default_value = 1.0
    p.inputs['Roughness'].default_value = 0.02
    p.inputs['IOR'].default_value = 1.45
    M['glass'] = m
    return m

def carpet_mat():
    m, n, l, p = nodes_mat('carpet')
    tc = n.new('ShaderNodeTexCoord')
    ck = n.new('ShaderNodeTexChecker'); ck.inputs['Scale'].default_value = 1.0
    ck.inputs['Color1'].default_value = (0.115, 0.118, 0.125, 1); ck.inputs['Color2'].default_value = (0.13, 0.13, 0.135, 1)
    mp = n.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (2.0, 2.0, 2.0)
    l.new(tc.outputs['Object'], mp.inputs['Vector']); l.new(mp.outputs[0], ck.inputs['Vector'])
    nz = n.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 300; nz.inputs['Detail'].default_value = 4
    l.new(tc.outputs['Object'], nz.inputs['Vector'])
    mix = n.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = 0.35
    l.new(ck.outputs['Color'], mix.inputs[6]); l.new(nz.outputs['Color'], mix.inputs[7]); l.new(mix.outputs[2], p.inputs['Base Color'])
    b = n.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.4
    l.new(nz.outputs['Fac'], b.inputs['Height']); l.new(b.outputs['Normal'], p.inputs['Normal'])
    p.inputs['Roughness'].default_value = 0.95
    p.inputs['Specular IOR Level'].default_value = 0.2
    return m

def wood_mat():
    m, n, l, p = nodes_mat('beech')
    tc = n.new('ShaderNodeTexCoord'); w = n.new('ShaderNodeTexWave')
    w.inputs['Scale'].default_value = 3; w.inputs['Distortion'].default_value = 6; w.inputs['Detail'].default_value = 4
    mp = n.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1, 12, 1)
    l.new(tc.outputs['Object'], mp.inputs['Vector']); l.new(mp.outputs[0], w.inputs['Vector'])
    mix = n.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.inputs['Factor'].default_value = 0.5
    mix.inputs[6].default_value = (0.62, 0.45, 0.28, 1); mix.inputs[7].default_value = (0.70, 0.53, 0.34, 1)
    l.new(w.outputs['Fac'], mix.inputs['Factor']); l.new(mix.outputs[2], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.42
    p.inputs['Coat Weight'].default_value = 0.15
    return m

# ---------- primitives ----------
def link(o, bevel=0.0):
    for c in o.users_collection: c.objects.unlink(o)
    coll(CUR[0]).objects.link(o)
    if bevel:
        b = o.modifiers.new('bevel', 'BEVEL'); b.width = bevel; b.segments = 3; b.limit_method = 'ANGLE'
    return o

def box(name, x0, y0, z0, x1, y1, z1, m, bevel=0.006, hot=None):
    me = bpy.data.meshes.new(name)
    v = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    me.from_pydata(v, [], f); me.update()
    # UVs follow the box so image materials map onto the big faces.
    uv = me.uv_layers.new()
    for poly in me.polygons:
        for li, vi in zip(poly.loop_indices, poly.vertices):
            co = Vector(v[vi]); nrm = poly.normal
            if abs(nrm.z) > .5: u, w = (co.x - x0) / max(x1 - x0, 1e-6), (co.y - y0) / max(y1 - y0, 1e-6)
            elif abs(nrm.y) > .5: u, w = (co.x - x0) / max(x1 - x0, 1e-6), (co.z - z0) / max(z1 - z0, 1e-6)
            else: u, w = (co.y - y0) / max(y1 - y0, 1e-6), (co.z - z0) / max(z1 - z0, 1e-6)
            if nrm.y > .5 or nrm.x < -.5: u = 1 - u
            uv.data[li].uv = (u, w)
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    o.data.materials.append(m)
    if hot: HOT[o.name] = hot
    if m is M.get('wall') and not bevel: bevel = 0.012   # cut walls catch a highlight on their edge
    return link(o, bevel if min(x1 - x0, y1 - y0, z1 - z0) > bevel * 2 else 0)

def plane_img(name, cx, cy, cz, w, h, m, face='-y', hot=None):
    """A picture on a wall. face = direction the picture looks at."""
    if face == '-y': return box(name, cx - w / 2, cy - 0.004, cz - h / 2, cx + w / 2, cy, cz + h / 2, m, 0, hot)
    if face == '+y': return box(name, cx - w / 2, cy, cz - h / 2, cx + w / 2, cy + 0.004, cz + h / 2, m, 0, hot)
    if face == '-x': return box(name, cx - 0.004, cy - w / 2, cz - h / 2, cx, cy + w / 2, cz + h / 2, m, 0, hot)
    if face == '+x': return box(name, cx, cy - w / 2, cz - h / 2, cx + 0.004, cy + w / 2, cz + h / 2, m, 0, hot)

def cyl(name, x, y, z0, r, h, m, verts=24, hot=None, r2=None):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r if r2 is None else r2, depth=h, location=(x, y, z0 + h / 2))
    o = bpy.context.object; o.name = name; o.data.materials.append(m)
    bpy.ops.object.shade_smooth()
    if hot: HOT[o.name] = hot
    return link(o)

def turn(o, r):
    """Rotate a box about its own middle (boxes are built in world coordinates)."""
    c = sum((Vector(v.co) for v in o.data.vertices), Vector()) / len(o.data.vertices)
    o.data.transform(Matrix.Translation(-c)); o.location = c; o.rotation_euler = r
    return o

def rod(name, p1, p2, r, m, verts=12, hot=None):
    a, b = Vector(p1), Vector(p2)
    o = cyl(name, 0, 0, 0, r, (b - a).length, m, verts, hot)
    o.location = (a + b) / 2
    o.rotation_euler = (b - a).to_track_quat('Z', 'Y').to_euler()
    return o

def ball(name, x, y, z, r, m, sx=1, sy=1, sz=1, hot=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=r, location=(x, y, z))
    o = bpy.context.object; o.name = name; o.scale = (sx, sy, sz); o.data.materials.append(m)
    bpy.ops.object.shade_smooth()
    if hot: HOT[o.name] = hot
    return link(o)

def text(name, body, x, y, z, size, m, face='-y', bold=True, extrude=0.004, align='CENTER', hot=None):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = body; cu.size = size; cu.extrude = extrude
    cu.align_x = align; cu.align_y = 'CENTER'
    cu.font = bpy.data.fonts.load('/usr/share/fonts/truetype/liberation/LiberationSans-' + ('Bold' if bold else 'Regular') + '.ttf')
    o = bpy.data.objects.new(name, cu); bpy.context.collection.objects.link(o)
    o.location = (x, y, z)
    o.rotation_euler = {'-y': (math.pi / 2, 0, 0), '+x': (math.pi / 2, 0, math.pi / 2), '+y': (math.pi / 2, 0, math.pi), '-x': (math.pi / 2, 0, -math.pi / 2), 'up': (0, 0, 0)}[face]
    o.data.materials.append(m)
    if hot: HOT[o.name] = hot
    return link(o)

# ---------- palette ----------
WALL = mat('wall', (0.68, 0.66, 0.60), 0.85, bump=0.05, scale=80)
WALL2 = mat('wall_accent', (0.16, 0.36, 0.62), 0.8)
CEIL = mat('ceiling', (0.62, 0.62, 0.60), 0.9, bump=0.15, scale=200)
FABRIC = mat('fabric', (0.11, 0.14, 0.19), 0.95, spec=0.2, bump=0.25, scale=500, var=0.3)
TRIM = mat('trim', (0.55, 0.56, 0.58), 0.35, metal=0.9)
BEIGE = mat('beige', (0.72, 0.68, 0.58), 0.45, var=0.15, scale=20)
DARKP = mat('darkplastic', (0.035, 0.037, 0.04), 0.4)
CHAIR = mat('chairfabric', (0.05, 0.055, 0.07), 0.9, bump=0.2, scale=400)
SCREEN_OFF = mat('crt_off', (0.012, 0.014, 0.016), 0.06, spec=0.8, coat=1.0)
STEEL = mat('steel', (0.62, 0.62, 0.64), 0.28, metal=1.0, bump=0.02, scale=8)
PAPER = mat('paper', (0.92, 0.92, 0.88), 0.8)
WOOD = wood_mat()
CARPET = carpet_mat()
GLASS = glass_mat()
LEAF = mat('leaf', (0.08, 0.22, 0.07), 0.55, var=0.4, scale=10)
DEADLEAF = mat('deadleaf', (0.30, 0.25, 0.08), 0.7, var=0.5, scale=10)
POT = mat('pot', (0.55, 0.22, 0.12), 0.7)
MUG = mat('mug', (0.75, 0.10, 0.10), 0.25)
BLUE = mat('binder_blue', (0.05, 0.09, 0.2), 0.45)
RED = mat('binder_red', (0.28, 0.06, 0.05), 0.45)
GREY = mat('binder_grey', (0.22, 0.22, 0.23), 0.45)
SIGN = mat('sign', (0.10, 0.30, 0.65), 0.3, metal=0.2)
LAMPWARM = emit_mat('lamp_warm', (1.0, 0.72, 0.42), 30)
PANEL = emit_mat('troffer', (1.0, 0.95, 0.86), 5, camera_only=True)

# ---------- the room ----------
CUR[0] = 'room'
box('floor', -0.2, -0.6, -0.1, 18.2, 12.2, 0, CARPET, 0)
CAP = mat('modelcard', (0.8, 0.78, 0.72), 0.9, bump=0.05, scale=120)
box('slab', -0.2, -0.6, -0.45, 18.2, 12.2, -0.1, CAP, 0.01)
# Back wall with a band of windows between x 5 and 13.5, solid elsewhere.
box('wall_back_l', 0, 12, 0, 5, 12.2, 2.8, WALL, 0)
box('wall_back_r', 13.5, 12, 0, 18, 12.2, 2.8, WALL, 0)
box('wall_back_sill', 5, 12, 0, 13.5, 12.2, 0.85, WALL, 0)
box('wall_back_head', 5, 12, 2.35, 13.5, 12.2, 2.8, WALL, 0)
for i in range(7):
    x = 5 + i * (8.5 / 6)
    box(f'mullion{i}', x - 0.04, 11.98, 0.85, x + 0.04, 12.08, 2.35, TRIM, 0.004)
box('sill', 5, 11.85, 0.82, 13.5, 12.05, 0.86, mat('sillstone', (0.55, 0.53, 0.5), 0.3), 0.004)
box('window_glass', 5, 12.06, 0.85, 13.5, 12.07, 2.35, GLASS, 0, hot='window')
# Left wall with the lift opening at y 0.9..2.1.
box('wall_left_a', -0.2, -0.6, 0, 0, 0.9, 2.8, WALL, 0)
box('wall_left_b', -0.2, 2.1, 0, 0, 12.2, 2.8, WALL, 0)
box('wall_left_head', -0.2, 0.9, 2.2, 0, 2.1, 2.8, WALL, 0)
box('accent_left', 0.0, 2.6, 0, 0.012, 7.5, 2.8, WALL2, 0)
box('lift_frame_l', 0, 0.82, 0, 0.04, 0.9, 2.2, STEEL, 0.003, hot='lift')
box('lift_frame_r', 0, 2.1, 0, 0.04, 2.18, 2.2, STEEL, 0.003, hot='lift')
box('lift_frame_t', 0, 0.82, 2.2, 0.04, 2.18, 2.28, STEEL, 0.003, hot='lift')
DOOR_L = box('lift_door_l', -0.06, 0.9, 0, -0.02, 1.5, 2.2, STEEL, 0.003, hot='lift')
DOOR_R = box('lift_door_r', -0.06, 1.5, 0, -0.02, 2.1, 2.2, STEEL, 0.003, hot='lift')
CUR[0] = 'walkonly'
box('lift_car_floor', -1.7, 0.85, -0.1, -0.06, 2.15, 0.0, mat('liftfloor', (0.15, 0.15, 0.15), 0.5), 0)
box('lift_car_back', -1.8, 0.85, 0, -1.7, 2.15, 2.5, STEEL, 0)
box('lift_car_l', -1.8, 0.75, 0, -0.06, 0.85, 2.5, STEEL, 0)
box('lift_car_r', -1.8, 2.15, 0, -0.06, 2.25, 2.5, STEEL, 0)
box('lift_car_ceil', -1.8, 0.75, 2.4, -0.06, 2.25, 2.5, emit_mat('liftlight', (1, 0.95, 0.85), 3), 0)
CUR[0] = 'room'
box('lift_indicator', 0.0, 2.3, 2.0, 0.02, 2.45, 2.14, emit_mat('led', (1, 0.25, 0.05), 6), 0, hot='lift')
text('lift_floor_no', '4', 0.03, 2.375, 2.07, 0.1, emit_mat('led', (1, 0.25, 0.05), 6), '+x')
# Company sign on the accent wall, facing the lift exit.
text('sign_main', 'SYNERGIX', 0.03, 5.0, 1.95, 0.42, mat('signwhite', (0.95, 0.95, 0.95), 0.3), '+x', extrude=0.02)
text('sign_sub', 'e-Learning Solutions', 0.03, 5.0, 1.62, 0.16, mat('signwhite', (0.95, 0.95, 0.95), 0.3), '+x', bold=False, extrude=0.008)
sl = bpy.data.lights.new('signwash', 'AREA'); sl.size = 3; sl.energy = 60; sl.color = (1, 0.9, 0.8)
so = bpy.data.objects.new('signwash', sl); so.location = (1.2, 5.0, 2.7); so.rotation_euler = (0, -math.radians(50), 0); coll('lights').objects.link(so)
cyl('sign_ring', 0.0, 3.35, 1.95, 0.2, 0.03, SIGN).rotation_euler = (0, math.pi / 2, 0)

# Ceiling with a grid and troffers (only the walk-in sees it).
CUR[0] = 'ceiling'
TROFFERS = []
box('ceiling', -0.2, -1, 2.8, 18, 12.2, 2.85, CEIL, 0)
for ix in range(7):
    for iy in range(5):
        x, y = 1.4 + ix * 2.5, 1.3 + iy * 2.4
        box(f'troffer{ix}_{iy}', x - 0.3, y - 0.6, 2.79, x + 0.3, y + 0.6, 2.8, PANEL, 0)
        lt = bpy.data.lights.new(f'L{ix}_{iy}', 'AREA'); lt.shape = 'RECTANGLE'; lt.size = 0.6; lt.size_y = 1.2
        lt.energy = 62 if (ix + iy) % 2 == 0 else 14; lt.color = (0.96, 1.0, 0.86)
        lo = bpy.data.objects.new(f'L{ix}_{iy}', lt); lo.location = (x, y, 2.77); coll('lights').objects.link(lo)
        TROFFERS.append(lt)

# ---------- reception ----------
CUR[0] = 'room'
box('reception_body', 1.4, 3.6, 0, 3.6, 4.3, 1.05, mat('recep', (0.16, 0.2, 0.28), 0.4), 0.01)
box('reception_top', 1.3, 3.5, 1.05, 3.7, 4.4, 1.09, WOOD, 0.008)
box('reception_glass', 1.35, 3.52, 1.09, 3.65, 3.56, 1.25, GLASS, 0)
box('reception_crt', 2.2, 4.0, 1.09, 2.6, 4.35, 1.45, BEIGE, 0.01)
box('reception_scr', 2.24, 3.995, 1.13, 2.56, 4.0, 1.41, img_mat('scr_saver', 'screen_saver.png', 1.2), 0)
cyl('orchid_pot', 1.6, 3.9, 1.09, 0.06, 0.1, mat('whitepot', (0.9, 0.9, 0.9), 0.3))
ball('orchid', 1.6, 3.9, 1.32, 0.09, mat('orchidpink', (0.85, 0.5, 0.75), 0.6), 1, 1, 1.4)
# Waiting chairs and a magazine table.
for i, y in enumerate((5.6, 6.4)):
    box(f'wait_seat{i}', 0.25, y - 0.3, 0.42, 0.85, y + 0.3, 0.5, mat('leather', (0.06, 0.06, 0.07), 0.35), 0.03)
    box(f'wait_back{i}', 0.2, y - 0.3, 0.42, 0.3, y + 0.3, 0.95, mat('leather', (0.06, 0.06, 0.07), 0.35), 0.03)
    for dx in (0.28, 0.82):
        box(f'wait_leg{i}{dx}', dx - 0.015, y - 0.28, 0, dx + 0.015, y + 0.28, 0.42, STEEL, 0)
box('mag_table', 0.4, 6.9, 0.38, 0.9, 7.4, 0.42, GLASS, 0)
box('mag', 0.5, 7.0, 0.42, 0.72, 7.28, 0.425, mat('magazine', (0.8, 0.2, 0.15), 0.3), 0)

# ---------- cubicles ----------
def star_base(n, x, y, hot=None, reach=0.3, top=0.44):
    cyl(f'{n}_hub', x, y, 0.06, 0.045, 0.05, DARKP, 16, hot)
    for k in range(5):
        a = k * 2 * math.pi / 5 + 0.3
        tx, ty = x + reach * math.cos(a), y + reach * math.sin(a)
        rod(f'{n}_spoke{k}', (x, y, 0.085), (tx, ty, 0.06), 0.018, DARKP, 8, hot)
        ball(f'{n}_caster{k}', tx, ty, 0.03, 0.028, DARKP, 1, 1, 0.9, hot)
    cyl(f'{n}_post', x, y, 0.11, 0.025, top - 0.11, STEEL, 12, hot)

def chair(n, x, y, rot=0.0, hot=None):
    star_base(n, x, y, hot)
    box(f'{n}_seat', x - 0.25, y - 0.24, 0.44, x + 0.25, y + 0.24, 0.52, CHAIR, 0.03, hot)
    by = y - 0.26 if rot == 0 else y + 0.26
    box(f'{n}_back', x - 0.21, by - 0.025, 0.6, x + 0.21, by + 0.025, 0.98, CHAIR, 0.022, hot)
    box(f'{n}_spine', x - 0.03, by - 0.02, 0.5, x + 0.03, by + 0.02, 0.62, DARKP, 0, hot)

def crt(n, x, y, z, scr, hot=None, w=0.42):
    """A beige 17-inch CRT facing -y, front face at y."""
    box(f'{n}_front', x - w / 2, y, z + 0.04, x + w / 2, y + 0.06, z + 0.42, BEIGE, 0.012, hot)
    box(f'{n}_body', x - w / 2 + 0.03, y + 0.06, z + 0.07, x + w / 2 - 0.03, y + 0.3, z + 0.39, BEIGE, 0.03, hot)
    box(f'{n}_neck', x - 0.11, y + 0.3, z + 0.12, x + 0.11, y + 0.42, z + 0.32, BEIGE, 0.02, hot)
    box(f'{n}_foot', x - 0.13, y + 0.05, z, x + 0.13, y + 0.3, z + 0.045, BEIGE, 0.01, hot)
    box(f'{n}_screen', x - w / 2 + 0.035, y - 0.002, z + 0.08, x + w / 2 - 0.035, y + 0.001, z + 0.37, scr, 0, hot)
    box(f'{n}_led', x + w / 2 - 0.05, y - 0.003, z + 0.055, x + w / 2 - 0.035, y, z + 0.065, emit_mat('ledgreen', (0.2, 1, 0.3), 8), 0, hot)

def cubicle(n, cx, cy, who=None, hot=None):
    back, h = cy + 1.2, 1.35
    box(f'{n}_pback', cx - 1.2, back - 0.03, 0, cx + 1.2, back + 0.03, h, FABRIC, 0.01, hot)
    box(f'{n}_pback_t', cx - 1.2, back - 0.035, h, cx + 1.2, back + 0.035, h + 0.025, TRIM, 0.004, hot)
    for side, sx in (('l', cx - 1.2), ('r', cx + 1.2)):
        box(f'{n}_p{side}', sx - 0.03, cy - 0.9, 0, sx + 0.03, back, h, FABRIC, 0.01, hot)
        box(f'{n}_p{side}_t', sx - 0.035, cy - 0.9, h, sx + 0.035, back, h + 0.025, TRIM, 0.004, hot)
    # L-shaped desk: back run plus a return on the left.
    box(f'{n}_desk', cx - 1.15, back - 0.78, 0.71, cx + 1.15, back - 0.04, 0.745, WOOD, 0.006, hot)
    box(f'{n}_ret', cx - 1.15, cy - 0.75, 0.71, cx - 0.45, back - 0.78, 0.745, WOOD, 0.006, hot)
    box(f'{n}_leg1', cx + 1.05, back - 0.75, 0, cx + 1.1, back - 0.1, 0.71, TRIM, 0, hot)
    box(f'{n}_modesty', cx - 1.1, back - 0.12, 0.2, cx + 1.1, back - 0.09, 0.71, TRIM, 0, hot)
    box(f'{n}_pedestal', cx - 1.1, cy - 0.7, 0, cx - 0.55, cy - 0.1, 0.68, GREY, 0.008, hot)
    box(f'{n}_tower', cx + 0.55, back - 0.62, 0, cx + 0.75, back - 0.17, 0.45, BEIGE, 0.008, hot)
    box(f'{n}_kbd', cx - 0.22, back - 0.775, 0.745, cx + 0.22, back - 0.635, 0.768, BEIGE, 0.006, hot)
    box(f'{n}_mouse', cx + 0.33, back - 0.65, 0.745, cx + 0.39, back - 0.56, 0.77, BEIGE, 0.01, hot)
    box(f'{n}_pad', cx + 0.27, back - 0.72, 0.745, cx + 0.47, back - 0.52, 0.748, BLUE, 0, hot)
    chair(f'{n}_chair', cx + 0.1, cy - 0.15, 0, hot)
    box(f'{n}_phone', cx + 0.62, back - 0.5, 0.745, cx + 0.84, back - 0.28, 0.8, BEIGE, 0.012, hot)
    box(f'{n}_handset', cx + 0.6, back - 0.46, 0.8, cx + 0.66, back - 0.3, 0.83, BEIGE, 0.01, hot)
    box(f'{n}_paper', cx - 0.95, cy - 0.6, 0.745, cx - 0.66, cy - 0.38, 0.752 + 0.01 * (len(n) % 3), PAPER, 0.001, hot)
    # Shelf of binders resting on the back panel's top rail, held by two steel brackets.
    top = h + 0.025
    box(f'{n}_shelf', cx - 1.1, back - 0.33, top, cx - 0.1, back + 0.035, top + 0.025, GREY, 0.004, hot)
    for i, bx in enumerate((cx - 1.04, cx - 0.16)):
        box(f'{n}_bracket{i}', bx - 0.006, back - 0.3, top - 0.16, bx + 0.006, back - 0.03, top, TRIM, 0, hot)
    for i in range(7):
        bm = (BLUE, RED, GREY)[(i * 5 + len(n)) % 3]
        box(f'{n}_binder{i}', cx - 1.05 + i * 0.09, back - 0.3, top + 0.025, cx - 0.97 + i * 0.09, back - 0.02, top + 0.305, bm, 0.004, hot)
    return back

CUR[0] = 'cubicles'
ROW1, ROW2 = 4.3, 7.7
# Mieke: lamp on, mail open, mug, cardigan on her chair.
b = cubicle('mieke', 6.8, ROW1, hot='mieke')
crt('mieke_crt', 6.75, b - 0.62, 0.745, img_mat('scr_mieke', 'screen_mieke.png', 1.4), 'mieke')
cyl('mieke_mug', 7.45, b - 0.62, 0.745, 0.04, 0.1, MUG, hot='mieke')
cyl('mieke_lampbase', 6.05, b - 0.3, 0.745, 0.08, 0.02, DARKP, hot='mieke')
cyl('mieke_lamparm', 6.05, b - 0.3, 0.765, 0.012, 0.42, DARKP, hot='mieke')
rod('mieke_lamparm2', (6.05, b - 0.3, 1.18), (6.15, b - 0.36, 1.2), 0.011, DARKP, 8, 'mieke')
cyl('mieke_lampshade', 6.15, b - 0.36, 1.08, 0.11, 0.12, mat('lampgreen', (0.05, 0.25, 0.12), 0.25), hot='mieke', r2=0.05)
ball('mieke_bulb', 6.15, b - 0.36, 1.09, 0.035, LAMPWARM, hot='mieke')
ml = bpy.data.lights.new('mieke_lamp', 'SPOT'); ml.energy = 25; ml.color = (1, 0.72, 0.45); ml.spot_size = 1.6; ml.shadow_soft_size = 0.05
mo = bpy.data.objects.new('mieke_lamp', ml); mo.location = (6.15, b - 0.36, 1.07); coll('lights').objects.link(mo)
KNIT = mat('cardigan', (0.16, 0.03, 0.06), 0.95, bump=0.3, scale=300)
cg = box('mieke_cardigan', 6.67, ROW1 - 0.465, 0.66, 7.13, ROW1 - 0.355, 1.0, KNIT, 0.04, hot='mieke')
sd = cg.modifiers.new('soft', 'SUBSURF'); sd.levels = sd.render_levels = 2
tx = bpy.data.textures.new('drape', 'CLOUDS'); tx.noise_scale = 0.08
dp = cg.modifiers.new('drape', 'DISPLACE'); dp.texture = tx; dp.strength = 0.025; dp.mid_level = 0.5
for i, sx in enumerate((6.69, 7.11)):   # the sleeves hang down either side of the chair back
    sl = cyl(f'mieke_sleeve{i}', sx, ROW1 - 0.41, 0.5, 0.04, 0.46, KNIT, 16, hot='mieke', r2=0.05)
    sl.rotation_euler = (0.12, 0.18 * (1 if i else -1), 0); thing(sl, 'cardigan')
box('mieke_papers', 7.6, b - 0.7, 0.745, 7.9, b - 0.48, 0.775, PAPER, 0.002, hot='mieke')
box('mieke_photo', 7.6, b - 0.3, 0.745, 7.75, b - 0.28, 0.87, mat('frame', (0.15, 0.1, 0.06), 0.4), 0.004, hot='mieke')
# Things to find at Mieke's desk (close-up 'mieke').
SHOT[0] = 'mieke'
thing(bpy.data.objects['mieke_photo'], 'photo'); thing(bpy.data.objects['mieke_cardigan'], 'cardigan')
pp = bpy.data.objects['mieke_papers']; pp.data.materials[0] = img_mat('coe_redpen', 'coe_redpen.png', 0, 0.6); thing(pp, 'coe')
thing(box('mieke_phone', 7.18, b - 0.74, 0.745, 7.24, b - 0.62, 0.766, mat('phonegrey', (0.32, 0.34, 0.36), 0.35), 0.006, hot='mieke'), 'phone')
thing(box('mieke_phone_scr', 7.19, b - 0.715, 0.766, 7.23, b - 0.675, 0.7665, img_mat('snake', 'snake.png', 0.8), 0, hot='mieke'), 'phone')
thing(cyl('mieke_cds_base', 5.95, b - 0.62, 0.745, 0.065, 0.008, DARKP, 32, hot='mieke'), 'cds')
thing(cyl('mieke_cds_pin', 5.95, b - 0.62, 0.745, 0.007, 0.12, DARKP, 12, hot='mieke'), 'cds')
for i in range(14):   # a spindle of old course CD-ROMs, each with a sticky note
    thing(cyl(f'mieke_cd{i}', 5.95, b - 0.62, 0.755 + i * 0.0045, 0.06, 0.0015, mat('cdsilver', (0.8, 0.82, 0.86), 0.12, metal=1.0), 32, hot='mieke'), 'cds')
for i in range(4):
    o = box(f'mieke_cdnote{i}', 5.9, b - 0.69, 0.756 + i * 0.013, 5.96, b - 0.67, 0.7575 + i * 0.013, mat('sticky', (1.0, 0.85, 0.25), 0.7), 0, hot='mieke')
    o.rotation_euler = (0, 0, 0.6 * i); thing(o, 'cds')
cyl('mieke_plant_pot', 5.9, ROW1 - 0.55, 0.745, 0.07, 0.11, POT, hot='mieke')
for i in range(11):
    a = i * 2.4
    o = ball(f'mieke_leaf{i}', 5.9 + 0.05 * math.cos(a), ROW1 - 0.55 + 0.05 * math.sin(a), 0.95 + 0.02 * (i % 3), 0.09, LEAF, 0.22, 0.08, 1.0, hot='mieke')
    o.rotation_euler = (0.5 * math.sin(a), -0.5 * math.cos(a), a)
box('mieke_nameplate_bg', 5.56, ROW1 - 0.75, 1.1, 5.565, ROW1 - 0.35, 1.2, mat('namebg', (0.1, 0.12, 0.16), 0.4), 0, hot='mieke')
text('mieke_nameplate', 'Mieke', 5.555, ROW1 - 0.55, 1.15, 0.07, PAPER, '-x', extrude=0.001, hot='mieke')

# Bart's desk, between yours and Mieke's.
H = 'bart'
b = cubicle('bart', 9.3, ROW1, hot=H)
crt('bart_crt', 9.25, b - 0.62, 0.745, img_mat('scr_saver', 'screen_saver.png', 1.2), H)
SHOT[0] = 'bart'
thing(box('bart_pizza', 8.5, b - 0.7, 0.745, 8.85, b - 0.35, 0.79, mat('cardboard', (0.6, 0.45, 0.28), 0.8), 0.003, hot=H), 'pizza')
thing(box('bart_pizzanote', 8.6, b - 0.62, 0.79, 8.72, b - 0.5, 0.7905, img_mat('pizzanote', 'pizzanote.png', 0, 0.8), 0, hot=H), 'pizza')
FRAME = mat('frame', (0.15, 0.1, 0.06), 0.4)
thing(box('bart_frame', 9.95, b - 0.2, 0.745, 10.3, b - 0.17, 1.0, FRAME, 0.004, hot=H), 'frame')
thing(plane_img('bart_frame_pic', 10.125, b - 0.2, 0.873, 0.31, 0.22, img_mat('onboard', 'onboard.png', 0, 0.3), '-y', H), 'frame')
thing(turn(box('bart_risk', 8.35, ROW1 - 0.3, 0.745, 8.6, ROW1 + 0.05, 0.752, img_mat('riskreg', 'riskreg.png', 0, 0.6), 0.001, hot=H), (0, 0, -0.1)), 'risk')
GOLD = mat('gold', (0.85, 0.62, 0.2), 0.25, metal=1.0)
thing(box('bart_trophy_base', 10.27, b - 0.62, 0.745, 10.39, b - 0.5, 0.79, mat('blackplastic', (0.02, 0.02, 0.02), 0.4), 0.004, hot=H), 'trophy')
thing(cyl('bart_trophy_stem', 10.33, b - 0.56, 0.79, 0.012, 0.06, GOLD, 12, hot=H), 'trophy')
thing(cyl('bart_trophy_cup', 10.33, b - 0.56, 0.85, 0.028, 0.08, GOLD, 24, hot=H, r2=0.055), 'trophy')
TIE = mat('orangetie', (0.9, 0.35, 0.05), 0.5, bump=0.1, scale=200)
thing(box('bart_tie', 8.56, b - 0.05, 0.92, 8.64, b - 0.03, 1.3, TIE, 0.003, hot=H), 'tie')
thing(box('bart_tie_knot', 8.57, b - 0.055, 1.3, 8.63, b - 0.03, 1.35, TIE, 0.004, hot=H), 'tie')
box('bart_hook', 8.585, b - 0.05, 1.35, 8.615, b - 0.03, 1.38, STEEL, 0, hot=H)

# Yours: monitor off, sticky note, a plant on its last legs, the calendar.
b = cubicle('you', 11.8, ROW1, hot='desk')
crt('you_crt', 11.85, b - 0.62, 0.745, SCREEN_OFF, 'desk')
box('you_sticky', 11.98, b - 0.627, 1.115, 12.06, b - 0.621, 1.195, img_mat('sticky', 'sticky.png', 0, 0.8), 0, hot='desk')
cyl('you_plant_pot', 12.75, b - 0.6, 0.745, 0.07, 0.11, POT, hot='desk')
for i in range(5):
    a = i * 1.3
    o = ball(f'you_leaf{i}', 12.75 + 0.09 * math.cos(a), b - 0.6 + 0.09 * math.sin(a), 0.86, 0.06, DEADLEAF, 1, 0.4, 1.1, hot='desk')
    o.rotation_euler = (0.9 * math.sin(a), 0.9 * math.cos(a), 0)
plane_img('you_calendar', 12.55, b - 0.035, 1.2, 0.27, 0.36, img_mat('calendar', 'calendar.png', 0, 0.8), '-y', 'desk')
box('you_mug', 11.2, b - 0.45, 0.745, 11.28, b - 0.37, 0.84, mat('mugwhite', (0.85, 0.85, 0.82), 0.2), 0.01, hot='desk')
box('you_welcome', 11.3, b - 0.75, 0.745, 11.55, b - 0.6, 0.75, PAPER, 0.001, hot='desk')
# Friday evening (close-up 'friday', only in that shot): the week report on your keyboard, Darren's
# memo beside it, your screen on, and your coat over the side panel for going home.
CUR[0] = 'friday'; SHOT[0] = 'friday'
MANILA = mat('manila', (0.72, 0.58, 0.33), 0.75)
thing(turn(box('fri_folder', 11.52, b - 0.86, 0.768, 11.98, b - 0.55, 0.781, MANILA, 0.002), (0, 0, 0.06)), 'report')
thing(turn(box('fri_label', 11.6, b - 0.774, 0.781, 11.9, b - 0.667, 0.7815, img_mat('weekreport', 'weekreport.png', 0, 0.7), 0), (0, 0, 0.06)), 'report')
thing(turn(box('fri_memo', 11.22, b - 0.77, 0.745, 11.48, b - 0.4, 0.747, img_mat('memo_friday', 'memo_friday.png', 0, 0.7), 0.0005), (0, 0, -0.12)), 'memo')
COAT = mat('coat', (0.42, 0.3, 0.17), 0.9, bump=0.2, scale=250)   # a camel raincoat
ct = box('fri_coat', 10.66, b - 0.1, 0.78, 11.02, b - 0.035, 1.3, COAT, 0.03)
sd = ct.modifiers.new('soft', 'SUBSURF'); sd.levels = sd.render_levels = 2
dp = ct.modifiers.new('drape', 'DISPLACE'); dp.texture = bpy.data.textures['drape']; dp.strength = 0.03; dp.mid_level = 0.5
thing(ct, 'coat')
thing(box('fri_collar', 10.7, b - 0.11, 1.24, 10.98, b - 0.03, 1.34, COAT, 0.03), 'coat')
MUGW = mat('mugwhite', (0.85, 0.85, 0.82), 0.2)
thing(cyl('fri_mug', 11.24, b - 0.41, 0.745, 0.042, 0.1, MUGW, 32), 'mug')
rod('fri_mug_handle', (11.2, b - 0.36, 0.77), (11.2, b - 0.36, 0.83), 0.008, MUGW, 8)
CUR[0] = 'cubicles'

# Row two: three more desks, one with a screen on.
# Priya behind Mieke, an empty desk, Jens behind you.
H = 'priya'
b = cubicle('row2a', 6.8, ROW2, hot=H); crt('row2a_crt', 6.75, b - 0.62, 0.745, img_mat('scr_desk', 'screen_desk.png', 1.2), H)
SHOT[0] = 'priya'
thing(plane_img('priya_chart', 7.55, b - 0.031, 1.15, 0.36, 0.27, img_mat('chart98', 'chart98.png', 0, 0.4), '-y', H), 'chart')
thing(box('priya_calc', 7.3, b - 0.72, 0.745, 7.39, b - 0.56, 0.758, mat('calcgrey', (0.08, 0.08, 0.09), 0.4), 0.003, hot=H), 'calculator')
thing(box('priya_calc_scr', 7.31, b - 0.6, 0.758, 7.38, b - 0.57, 0.7585, mat('lcd', (0.55, 0.6, 0.45), 0.3), 0, hot=H), 'calculator')
thing(cyl('priya_watch', 7.62, b - 0.62, 0.745, 0.035, 0.014, STEEL, 32, hot=H), 'stopwatch')
thing(cyl('priya_watch_face', 7.62, b - 0.62, 0.759, 0.029, 0.001, img_mat('stopwatch', 'stopwatch.png', 0, 0.3), 32, hot=H), 'stopwatch')
thing(cyl('priya_cactus_pot', 6.0, b - 0.25, 0.745, 0.05, 0.08, POT, hot=H), 'cactus')
thing(cyl('priya_cactus', 6.0, b - 0.25, 0.825, 0.03, 0.12, mat('cactus', (0.12, 0.35, 0.12), 0.7, bump=0.3, scale=400), 16, hot=H, r2=0.022), 'cactus')
thing(turn(box('priya_cactus_log', 6.08, b - 0.33, 0.745, 6.2, b - 0.32, 0.83, img_mat('cactuslog', 'cactuslog.png', 0, 0.6), 0, hot=H), (-0.2, 0, 0.2)), 'cactus')
NOTE_C = [mat('sticky', (1.0, 0.85, 0.25), 0.7), mat('stickyblue', (0.45, 0.75, 1.0), 0.7), mat('stickygreen', (0.55, 0.95, 0.5), 0.7)]
for i in range(12):   # a perfect grid of sticky notes, colour by colour, and one that is not hers
    x, z = 5.75 + (i % 4) * 0.085, 1.27 - (i // 4) * 0.085
    thing(box(f'priya_note{i}', x, b - 0.034, z, x + 0.07, b - 0.03, z + 0.07, NOTE_C[i // 4], 0, hot=H), 'notes')
thing(turn(plane_img('priya_pink', 6.38, b - 0.035, 1.05, 0.08, 0.08, img_mat('pinknote', 'pinknote.png', 0, 0.8), '-y', H), (0, 0.25, 0)), 'notes')
cubicle('row2b', 9.3, ROW2); crt('row2b_crt', 9.25, ROW2 + 1.2 - 0.62, 0.745, SCREEN_OFF)
H = 'jens'
b = cubicle('row2c', 11.8, ROW2, hot=H); crt('row2c_crt', 11.75, b - 0.62, 0.745, img_mat('scr_saver', 'screen_saver.png', 1.2), H)
SHOT[0] = 'jens'
thing(plane_img('jens_story', 12.35, b - 0.031, 1.17, 0.56, 0.35, img_mat('storyboard', 'storyboard.png', 0, 0.4), '-y', H), 'storyboard')
thing(turn(box('jens_ideas', 10.85, ROW2 - 0.35, 0.745, 11.25, ROW2 - 0.08, 0.752, img_mat('ideas', 'ideas.png', 0, 0.6), 0.001, hot=H), (0, 0, 0.12)), 'ideas')
PHONES = mat('headphones', (0.03, 0.03, 0.035), 0.35)
for i, dx in enumerate((-0.09, 0.09)):
    c = cyl(f'jens_cup{i}', 12.45 + dx, b - 0.62, 0.745, 0.05, 0.035, PHONES, 24, hot=H); thing(c, 'headphones')
bpy.ops.mesh.primitive_torus_add(major_radius=0.09, minor_radius=0.008, location=(12.45, b - 0.62, 0.78), rotation=(math.pi / 2, 0, 0))
band = bpy.context.object; band.name = 'jens_band'; band.data.materials.append(PHONES); HOT[band.name] = H; link(band); thing(band, 'headphones')
band.scale = (1, 1, 0.6); band.rotation_euler = (math.pi / 2 - 1.35, 0, 0)
CLAY = [mat('clayred', (0.7, 0.12, 0.08), 0.8), mat('clayblue', (0.1, 0.25, 0.7), 0.8), mat('clayyellow', (0.9, 0.7, 0.1), 0.8), mat('claygreen', (0.15, 0.55, 0.2), 0.8)]
for i in range(4):   # clay mascots for courses nobody commissioned
    x = 12.68 + i * 0.07
    thing(ball(f'jens_clay{i}', x, b - 0.25, 0.775, 0.03, CLAY[i], 1, 1, 1.1, hot=H), 'mascots')
    thing(ball(f'jens_clayhead{i}', x, b - 0.25, 0.83, 0.02, CLAY[i], hot=H), 'mascots')
thing(box('jens_tablet', 11.0, b - 0.62, 0.745, 11.34, b - 0.38, 0.757, mat('tablet', (0.05, 0.05, 0.06), 0.35), 0.004, hot=H), 'tablet')
thing(box('jens_tablet_area', 11.04, b - 0.58, 0.757, 11.3, b - 0.42, 0.7575, mat('tabletarea', (0.12, 0.12, 0.14), 0.6), 0, hot=H), 'tablet')
thing(turn(box('jens_pen', 11.1, b - 0.66, 0.746, 11.28, b - 0.65, 0.758, PHONES, 0.003, hot=H), (0, 0, 0.3)), 'tablet')

# ---------- meeting room (back left) ----------
CUR[0] = 'meeting'
H = 'meeting'
box('meet_glass_front', 0, 8.0, 0, 3.6, 8.04, 2.8, GLASS, 0, hot=H)
box('meet_glass_side', 5.0, 8.0, 0, 5.04, 12, 2.8, GLASS, 0, hot=H)
box('meet_door', 3.6, 8.0, 0, 4.5, 8.04, 2.1, GLASS, 0, hot=H)
for x in (0.02, 3.6, 4.5):
    box(f'meet_post{x}', x - 0.025, 7.99, 0, x + 0.025, 8.05, 2.8, TRIM, 0.003, hot=H)
box('meet_post_c', 4.98, 7.99, 0, 5.06, 8.05, 2.8, TRIM, 0.003, hot=H)
for nm, a in (('meet_rail_front', (0, 7.99, 2.74, 4.5, 8.05, 2.8)), ('meet_rail_side', (4.98, 8.0, 2.74, 5.06, 12, 2.8))):
    box(nm, *a, TRIM, 0.003, hot=H)
box('meet_frost', 0, 7.995, 1.0, 3.6, 8.045, 1.3, mat('frost', (0.9, 0.92, 0.92), 0.5), 0, hot=H)
box('meet_table', 1.0, 9.4, 0.72, 4.0, 10.6, 0.76, WOOD, 0.01, hot=H)
for x in (1.2, 3.8):
    box(f'meet_tleg{x}', x - 0.04, 9.8, 0, x + 0.04, 10.2, 0.72, TRIM, 0, hot=H)
for i, x in enumerate((1.6, 2.5, 3.4)):
    chair(f'meet_c{i}', x, 9.0, 0, hot=H)
    chair(f'meet_d{i}', x, 11.0, 1, hot=H)
plane_img('meet_board', 2.5, 11.99, 1.5, 2.2, 1.2, img_mat('whiteboard', 'whiteboard.png', 0, 0.3), '-y', H)
box('meet_board_tray', 1.4, 11.9, 0.88, 3.6, 12, 0.9, TRIM, 0, hot=H)
box('meet_projector', 2.3, 9.9, 0.76, 2.7, 10.2, 0.86, mat('projgrey', (0.5, 0.5, 0.52), 0.4), 0.01, hot=H)
SHOT[0] = 'board'
thing(bpy.data.objects['meet_board'], 'whiteboard')
thing(box('meet_flip_board', 0.4, 10.9, 0.9, 0.42, 11.65, 1.85, img_mat('flipchart', 'flipchart.png', 0, 0.6), 0, hot=H), 'flipchart')
for dy in (10.95, 11.6):
    box(f'meet_flip_leg{dy}', 0.37, dy - 0.01, 0, 0.39, dy + 0.01, 1.9, TRIM, 0, hot=H)
thing(bpy.data.objects['meet_projector'], 'projector')
thing(box('meet_projnote', 2.42, 9.98, 0.86, 2.56, 10.12, 0.861, img_mat('projnote', 'projnote.png', 0, 0.8), 0, hot=H), 'projector')
# Darren's chair at the head of the table, four centimetres higher than the rest.
LEATHER = mat('leather', (0.06, 0.06, 0.07), 0.35)
star_base('meet_head', 0.62, 10.0, H, 0.3, 0.56)
thing(bpy.data.objects['meet_head_post'], 'chair')
thing(box('meet_head_seat', 0.36, 9.74, 0.56, 0.88, 10.26, 0.66, LEATHER, 0.03, hot=H), 'chair')
thing(box('meet_head_back', 0.3, 9.76, 0.66, 0.38, 10.24, 1.32, LEATHER, 0.03, hot=H), 'chair')
thing(box('meet_adapters', 3.25, 9.5, 0.76, 3.6, 9.75, 0.84, mat('tub', (0.7, 0.72, 0.75), 0.2), 0.006, hot=H), 'adapters')
for i, c in enumerate(((0.1, 0.2, 0.6), (0.9, 0.9, 0.9), (0.05, 0.05, 0.05), (0.6, 0.1, 0.1), (0.2, 0.2, 0.22))):
    thing(box(f'meet_adapter{i}', 3.28 + i * 0.062, 9.56 + (i % 2) * 0.07, 0.8, 3.33 + i * 0.062, 9.66 + (i % 2) * 0.07, 0.855, mat(f'adapter{i}', c, 0.4), 0.004, hot=H), 'adapters')
text('meet_label', 'BOARD ROOM', 1.8, 7.985, 1.15, 0.12, mat('signdark', (0.15, 0.17, 0.2), 0.4), '-y', hot=H)

# ---------- board day (pitch shots only) ----------
# Friday the screen comes down in front of the whiteboard and the board takes the near side of the
# table. Nobody has a face: each member is known by what they bring.
CUR[0] = 'pitch'
SHOT[0] = 'pitch'
SCREEN = (1.4, 3.6, 0.9, 2.55)   # x0, x1, z0, z1: 4 by 3, like the slide
SCREEN_Y = 11.9
box('pitch_case', SCREEN[0] - 0.12, SCREEN_Y - 0.06, SCREEN[3] + 0.02, SCREEN[1] + 0.12, SCREEN_Y + 0.06, SCREEN[3] + 0.13, mat('casegrey', (0.82, 0.82, 0.8), 0.4), 0.02)
box('pitch_screen_frame', SCREEN[0] - 0.04, SCREEN_Y - 0.008, SCREEN[2] - 0.06, SCREEN[1] + 0.04, SCREEN_Y, SCREEN[3] + 0.02, mat('screenblack', (0.03, 0.03, 0.03), 0.6), 0)
SCREEN_MAT = mat('screenwhite', (0.85, 0.86, 0.86), 0.9)
SCREEN_MAT.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value = (0.8, 0.85, 1.0, 1)
box('pitch_screen', SCREEN[0], SCREEN_Y - 0.012, SCREEN[2], SCREEN[1], SCREEN_Y - 0.008, SCREEN[3], SCREEN_MAT, 0)
box('pitch_pull', 2.47, SCREEN_Y - 0.02, SCREEN[2] - 0.16, 2.53, SCREEN_Y - 0.01, SCREEN[2] - 0.06, DARKP, 0)
# CFO, left: a desk calculator with a paper roll, reading glasses on the cost sheet.
H = 'cfo'
thing(box('cfo_sheet', 1.4, 9.45, 0.76, 1.65, 9.8, 0.762, PAPER, 0, hot=H), H)
thing(turn(box('cfo_calc', 1.68, 9.48, 0.76, 1.88, 9.72, 0.8, mat('calcbeige', (0.7, 0.66, 0.56), 0.45), 0.006, hot=H), (0.12, 0, -0.2)), H)
thing(box('cfo_roll', 1.71, 9.68, 0.8, 1.85, 9.74, 0.86, PAPER, 0.01, hot=H), H)
for i, gx in enumerate((1.49, 1.56)):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.026, minor_radius=0.003, location=(gx, 9.6, 0.766))
    g = bpy.context.object; g.name = f'cfo_glass{i}'; g.data.materials.append(DARKP); HOT[g.name] = H; link(g); thing(g, H)
thing(box('cfo_bridge', 1.515, 9.598, 0.765, 1.535, 9.602, 0.768, DARKP, 0, hot=H), H)
# CHRO, middle: the works council binder, and a second chair pulled up for the privacy officer.
H = 'chro'
thing(box('chro_binder', 2.3, 9.45, 0.76, 2.6, 9.82, 0.81, mat('binder_green', (0.08, 0.3, 0.16), 0.45), 0.004, hot=H), H)
thing(box('chro_binder_label', 2.36, 9.5, 0.81, 2.54, 9.62, 0.8105, PAPER, 0, hot=H), H)
for i in range(3):
    thing(box(f'chro_flag{i}', 2.6, 9.5 + i * 0.09, 0.77, 2.64, 9.53 + i * 0.09, 0.8, mat('stickyblue', (0.45, 0.75, 1.0), 0.7), 0, hot=H), H)
thing(box('chro_dpo_pad', 2.75, 9.55, 0.76, 2.85, 9.65, 0.775, mat('sticky', (1.0, 0.85, 0.25), 0.7), 0.002, hot=H), H)
thing(cyl('chro_pen', 2.88, 9.6, 0.76, 0.005, 0.14, mat('penred', (0.7, 0.05, 0.05), 0.4), 8, hot=H), H).rotation_euler = (math.pi / 2, 0, 0.4)
# COO, right: the shift roster on a clipboard, a hard hat on the table, still dusty.
H = 'coo'
thing(turn(box('coo_clip', 3.2, 9.45, 0.76, 3.45, 9.8, 0.768, mat('masonite', (0.45, 0.3, 0.16), 0.6), 0.003, hot=H), (0, 0, 0.1)), H)
thing(turn(box('coo_roster', 3.22, 9.47, 0.768, 3.43, 9.74, 0.77, PAPER, 0, hot=H), (0, 0, 0.1)), H)
thing(turn(box('coo_clipjaw', 3.27, 9.73, 0.768, 3.38, 9.78, 0.785, STEEL, 0.003, hot=H), (0, 0, 0.1)), H)
hat = ball('coo_hat', 3.68, 9.65, 0.775, 0.13, mat('hatyellow', (0.9, 0.65, 0.05), 0.4, var=0.2, scale=30), 1, 1.15, 0.85, hot=H); thing(hat, H)
thing(cyl('coo_brim', 3.68, 9.65, 0.765, 0.155, 0.012, mat('hatyellow', (0.9, 0.65, 0.05), 0.4), 32, hot=H), H).scale = (1, 1.12, 1)
CUR[0] = 'room'

# ---------- Darren's office (back right) ----------
CUR[0] = 'darren'
H = 'darren'
box('dar_wall_solid', 15.4, 8.5, 0, 18, 8.6, 2.8, WALL, 0)
box('dar_glass', 13.5, 8.5, 0, 14.5, 8.54, 2.8, GLASS, 0, hot=H)
box('dar_door', 14.5, 8.5, 0, 15.4, 8.54, 2.1, mat('doorwood', (0.35, 0.2, 0.1), 0.45), 0.01, hot=H)
box('dar_door_head', 14.5, 8.5, 2.1, 15.4, 8.6, 2.8, WALL, 0)
box('dar_glass_side', 13.5, 8.5, 0, 13.54, 12, 2.8, GLASS, 0, hot=H)
box('dar_rail_front', 13.49, 8.49, 2.74, 14.5, 8.55, 2.8, TRIM, 0.003, hot=H)
box('dar_rail_side', 13.49, 8.5, 2.74, 13.55, 12, 2.8, TRIM, 0.003, hot=H)
for i in range(22):   # venetian blinds behind the glass, half drawn
    z = 0.9 + i * 0.085
    box(f'dar_blind{i}', 13.56, 8.6, z, 13.58, 11.9, z + 0.06, mat('blind', (0.82, 0.8, 0.74), 0.5), 0, hot=H)
box('dar_handle', 15.25, 8.47, 1.0, 15.33, 8.5, 1.03, STEEL, 0, hot=H)
box('dar_plate', 14.75, 8.495, 1.5, 15.15, 8.5, 1.62, mat('brass', (0.8, 0.6, 0.25), 0.3, metal=1), 0, hot=H)
text('dar_plate_t', 'DARREN', 14.95, 8.49, 1.56, 0.06, mat('signdark', (0.15, 0.17, 0.2), 0.4), '-y', hot=H)
box('dar_desk', 15.0, 10.4, 0.72, 17.2, 11.3, 0.78, mat('mahogany', (0.18, 0.06, 0.03), 0.3, coat=0.4), 0.01, hot=H)
box('dar_desk_body', 15.1, 10.9, 0, 17.1, 11.25, 0.72, mat('mahogany', (0.18, 0.06, 0.03), 0.3, coat=0.4), 0.01, hot=H)
star_base('dar_chair', 16.1, 11.65, H, 0.32, 0.5)
box('dar_chair_seat', 15.8, 11.4, 0.5, 16.4, 11.92, 0.62, mat('leather', (0.06, 0.06, 0.07), 0.35), 0.04, hot=H)
box('dar_chair_back', 15.83, 11.86, 0.62, 16.37, 11.96, 1.38, mat('leather', (0.06, 0.06, 0.07), 0.35), 0.04, hot=H)
for i, ax in enumerate((15.8, 16.4)):
    box(f'dar_chair_arm{i}', ax - 0.03, 11.5, 0.72, ax + 0.03, 11.88, 0.76, DARKP, 0.01, hot=H)
box('dar_lcd', 15.8, 11.05, 0.78, 16.4, 11.1, 1.22, DARKP, 0.01, hot=H)
box('dar_lcd_scr', 15.83, 11.045, 0.82, 16.37, 11.05, 1.19, img_mat('scr_desk', 'screen_desk.png', 1.2), 0, hot=H)
plane_img('dar_poster', 14.2, 11.99, 1.55, 0.6, 0.8, img_mat('poster', 'poster.png', 0, 0.2), '-y', H)
cyl('dar_golf', 16.9, 10.6, 0.78, 0.022, 0.04, mat('golf', (0.95, 0.95, 0.95), 0.3), hot=H)
# Things to find in Darren's office (close-up 'darren').
SHOT[0] = 'darren'
thing(bpy.data.objects['dar_poster'], 'poster')
for i in range(3):
    o = box(f'dar_pass{i}', 15.25, 10.5, 0.78 + i * 0.002, 15.57, 10.62, 0.781 + i * 0.002, img_mat('boarding', 'boarding.png', 0, 0.5), 0, hot=H)
    o.rotation_euler = (0, 0, 0.15 * (i - 1)); thing(o, 'boarding')
thing(box('dar_planner', 16.45, 10.5, 0.78, 16.9, 10.79, 0.8, img_mat('planner', 'planner.png', 0, 0.6), 0.002, hot=H), 'planner')
thing(box('dar_charger', 15.22, 10.95, 0.78, 15.3, 11.0, 0.81, mat('blackplastic', (0.02, 0.02, 0.02), 0.4), 0.004, hot=H), 'charger')
thing(box('dar_cable', 15.3, 10.97, 0.78, 15.75, 10.98, 0.785, mat('blackplastic', (0.02, 0.02, 0.02), 0.4), 0, hot=H), 'charger')
thing(cyl('dar_umbrella', 17.75, 11.75, 0, 0.035, 0.92, mat('navy', (0.03, 0.05, 0.15), 0.6), hot=H), 'umbrella')
thing(cyl('dar_umbrella_h', 17.75, 11.75, 0.92, 0.012, 0.08, mat('woodhandle', (0.3, 0.15, 0.05), 0.4), hot=H), 'umbrella')
cyl('dar_plant_pot', 17.6, 9.0, 0, 0.22, 0.45, mat('blackpot', (0.05, 0.05, 0.05), 0.4), hot=H)
ball('dar_plant', 17.6, 9.0, 1.0, 0.45, LEAF, 1, 1, 1.4, hot=H)

# ---------- canteen (front right) ----------
CUR[0] = 'canteen'
box('can_floor', 14.0, -0.6, 0.0, 18.2, 8.5, 0.005, mat('lino', (0.55, 0.52, 0.45), 0.35, var=0.3, scale=6), 0)
# Kitchenette along Darren's solid wall, facing the floor.
CAB = mat('cabinet', (0.85, 0.85, 0.82), 0.4)
box('can_counter', 15.5, 7.8, 0, 17.95, 8.45, 0.88, CAB, 0.008)
box('can_top', 15.45, 7.75, 0.88, 18.0, 8.5, 0.92, mat('worktop', (0.2, 0.2, 0.22), 0.25, var=0.4, scale=50), 0.006)
box('can_splash', 15.45, 8.44, 0.92, 18.0, 8.5, 1.45, mat('tile', (0.88, 0.88, 0.86), 0.15), 0)
for i in range(4):
    x = 15.55 + i * 0.6
    box(f'can_door{i}', x, 7.79, 0.08, x + 0.56, 7.8, 0.84, CAB, 0)
    box(f'can_knob{i}', x + 0.25, 7.77, 0.74, x + 0.31, 7.79, 0.76, STEEL, 0)
box('can_micro', 17.3, 7.95, 0.92, 17.9, 8.42, 1.22, mat('fridge', (0.86, 0.86, 0.84), 0.3), 0.01)
box('can_micro_door', 17.33, 7.94, 0.96, 17.72, 7.95, 1.18, DARKP, 0)
box('can_kettle', 16.75, 8.1, 0.92, 16.9, 8.25, 1.12, STEEL, 0.02)
H = 'coffee'
box('coffee_body', 15.7, 7.95, 0.92, 16.3, 8.42, 1.62, mat('coffeeblack', (0.04, 0.04, 0.045), 0.3), 0.02, hot=H)
box('coffee_front', 15.75, 7.93, 1.2, 16.25, 7.95, 1.55, STEEL, 0, hot=H)
box('coffee_drip', 15.85, 7.85, 0.92, 16.15, 7.95, 0.96, STEEL, 0.004, hot=H)
box('coffee_note', 15.8, 7.925, 1.22, 16.2, 7.93, 1.52, img_mat('outoforder', 'outoforder.png', 0, 0.8), 0, hot=H)
cyl('coffee_cup', 16.0, 7.9, 0.96, 0.035, 0.08, mat('cupwhite', (0.95, 0.95, 0.93), 0.3), hot=H)
SHOT[0] = 'canteen'
thing(box('cooler_body', 14.4, 7.9, 0, 14.8, 8.3, 1.05, mat('fridge', (0.86, 0.86, 0.84), 0.3), 0.02, hot='canteen'), 'cooler')
thing(cyl('cooler_bottle', 14.6, 8.1, 1.05, 0.15, 0.45, mat('bottle', (0.5, 0.75, 0.95), 0.05), 32, hot='canteen'), 'cooler')
thing(plane_img('cooler_note', 14.6, 7.897, 0.72, 0.16, 0.16, img_mat('soupnote', 'soupnote.png', 0, 0.8), '-y', 'canteen'), 'cooler')
# The canteen TV hangs above the counter.
H = 'tv'
box('tv_bracket', 16.85, 8.4, 1.95, 17.15, 8.5, 2.15, DARKP, 0, hot=H)
box('tv_body', 16.5, 8.05, 1.62, 17.5, 8.45, 2.37, mat('tvgrey', (0.12, 0.12, 0.13), 0.35), 0.03, hot=H)
box('tv_screen', 16.6, 8.045, 1.7, 17.4, 8.05, 2.29, img_mat('tv', 'tv.png', 2.5), 0, hot=H)
tl = bpy.data.lights.new('tv_glow', 'AREA'); tl.size = 0.8; tl.energy = 6; tl.color = (0.4, 0.5, 1.0)
to = bpy.data.objects.new('tv_glow', tl); to.location = (17.0, 7.9, 1.95); to.rotation_euler = (-math.pi / 2, 0, 0); coll('lights').objects.link(to)
# Table and stools.
H = 'canteen'
cyl('can_table', 15.9, 5.2, 0.72, 0.5, 0.03, mat('worktop', (0.2, 0.2, 0.22), 0.25), 32, hot=H)
cyl('can_tleg', 15.9, 5.2, 0, 0.04, 0.72, STEEL, hot=H)
for i in range(3):
    a = i * 2.1 + 0.4
    x, y = 15.9 + 0.75 * math.cos(a), 5.2 + 0.75 * math.sin(a)
    cyl(f'can_stool{i}', x, y, 0.45, 0.18, 0.04, mat('stoolred', (0.6, 0.08, 0.06), 0.4), 24, hot=H)
    cyl(f'can_stoolleg{i}', x, y, 0, 0.02, 0.45, STEEL, hot=H)
SHOT[0] = 'canteen'
thing(box('can_lunch', 15.72, 5.08, 0.75, 15.96, 5.26, 0.83, mat('tupperware', (0.75, 0.8, 0.85), 0.15), 0.01, hot=H), 'lunch')
thing(box('can_lunchnote', 15.79, 5.12, 0.83, 15.89, 5.22, 0.8305, img_mat('lunchnote', 'lunchnote.png', 0, 0.8), 0, hot=H), 'lunch')
thing(plane_img('can_rota', 15.83, 7.787, 0.58, 0.24, 0.17, img_mat('rota', 'rota.png', 0, 0.6), '-y'), 'rota')
thing(plane_img('can_fishnote', 17.52, 7.938, 1.07, 0.12, 0.12, img_mat('fishnote', 'fishnote.png', 0, 0.8), '-y'), 'microwave')
thing(bpy.data.objects['can_micro_door'], 'microwave'); thing(bpy.data.objects['can_micro'], 'microwave')
for i, c in enumerate(((0.8, 0.1, 0.1), (0.1, 0.3, 0.7), (0.9, 0.75, 0.2))):
    thing(cyl(f'can_mug{i}', 16.4 + i * 0.1, 8.05, 0.92, 0.035, 0.09, mat(f'mug{i}', c, 0.3), 24), 'mugs')
thing(cyl('can_mug_gms', 16.62, 7.95, 0.92, 0.035, 0.09, img_mat('gmsmug', 'gmsmug.png', 0, 0.3), 24), 'mugs')


# A foosball table: every agency had one in 2007.
FG = mat('foosgreen', (0.05, 0.3, 0.1), 0.6)
box('foos_body', 15.0, 1.6, 0.62, 16.4, 2.4, 0.92, mat('foosframe', (0.12, 0.08, 0.05), 0.35), 0.015)
box('foos_field', 15.08, 1.68, 0.86, 16.32, 2.32, 0.87, FG, 0)
for i in range(4):
    lx, ly = (15.05, 15.05, 16.35, 16.35)[i], (1.65, 2.35, 1.65, 2.35)[i]
    box(f'foos_leg{i}', lx - 0.04, ly - 0.04, 0, lx + 0.04, ly + 0.04, 0.62, mat('foosframe', (0.12, 0.08, 0.05), 0.35), 0.01)
for i in range(8):
    x = 15.15 + i * 0.155
    fr = cyl(f'foos_rod{i}', x, 1.3, 0.9, 0.008, 1.4, STEEL, 8)
    fr.rotation_euler = (math.pi / 2, 0, 0); fr.location = (x, 2.0, 0.9)
    for k in range(3):
        box(f'foos_man{i}_{k}', x - 0.015, 1.8 + k * 0.2 - 0.02, 0.82, x + 0.015, 1.8 + k * 0.2 + 0.02, 0.95, mat('foosred', (0.6, 0.05, 0.05), 0.3) if i % 2 else mat('foosblue', (0.05, 0.1, 0.5), 0.3), 0.004)
for x, y in ((0.5, 0.3), (14.2, 0.4)):
    cyl(f'lobbypot{x}', x, y, 0, 0.2, 0.42, mat('blackpot', (0.05, 0.05, 0.05), 0.4))
    cyl(f'lobbysoil{x}', x, y, 0.42, 0.18, 0.01, mat('soil', (0.08, 0.05, 0.03), 0.9))
    cyl(f'lobbytrunk{x}', x, y, 0.42, 0.035, 0.7, mat('trunk', (0.22, 0.15, 0.08), 0.8, bump=0.4, scale=60), 10, r2=0.025)
    for k in range(5):
        a = k * 1.26
        o = ball(f'palm{x}_{k}', x + 0.2 * math.cos(a), y + 0.2 * math.sin(a), 1.15, 0.35, LEAF, 1, 0.25, 0.9)
        o.rotation_euler = (0.6 * math.sin(a), -0.6 * math.cos(a), a)

# ---------- the back aisle: copier, filing, plants ----------
CUR[0] = 'room'
box('copier', 9.6, 10.4, 0, 10.6, 11.1, 1.0, mat('copier', (0.78, 0.78, 0.75), 0.4), 0.02)
box('copier_lid', 9.6, 10.4, 1.0, 10.6, 11.1, 1.06, mat('copiergrey', (0.35, 0.36, 0.38), 0.4), 0.01)
box('copier_tray', 10.6, 10.5, 0.7, 10.9, 11.0, 0.72, mat('copiergrey', (0.35, 0.36, 0.38), 0.4), 0)
for i in range(3):
    box(f'filing{i}', 6.0 + i * 0.5, 11.3, 0, 6.46 + i * 0.5, 11.9, 1.3, mat('filing', (0.55, 0.57, 0.6), 0.35, metal=0.6), 0.008)
for x in (5.4, 13.0):
    cyl(f'bigpot{x}', x, 11.5, 0, 0.22, 0.45, POT)
    ball(f'bigplant{x}', x, 11.5, 1.05, 0.42, LEAF, 1, 1, 1.5)

# ---------- outside the windows: a rainy Brussels morning ----------
CUR[0] = 'outside'
sky = bpy.data.materials.new('sky'); sky.use_nodes = True
n, l = sky.node_tree.nodes, sky.node_tree.links
n.remove(n['Principled BSDF'])
tc = n.new('ShaderNodeTexCoord'); sep = n.new('ShaderNodeSeparateXYZ'); ramp = n.new('ShaderNodeValToRGB')
l.new(tc.outputs['Generated'], sep.inputs[0]); l.new(sep.outputs['Z'], ramp.inputs['Fac'])
ramp.color_ramp.elements[0].color = (0.45, 0.5, 0.55, 1); ramp.color_ramp.elements[1].color = (0.62, 0.68, 0.74, 1)
em = n.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.6
l.new(ramp.outputs['Color'], em.inputs['Color']); l.new(em.outputs[0], n['Material Output'].inputs['Surface'])
M['sky'] = sky
box('street', -30, 12.3, -12.2, 50, 60, -12, mat('asphalt', (0.06, 0.065, 0.07), 0.15), 0)
box('sky', -20, 60, -10, 40, 60.5, 40, sky, 0)
import random
random.seed(3)
BLD = mat('building', (0.18, 0.2, 0.23), 0.8)
WIN = emit_mat('bwin', (1, 0.85, 0.6), 2.5)
for i in range(12):
    x0 = -6 + i * 3.2 + random.uniform(-0.5, 0.5)
    d = random.uniform(18, 40); h = random.uniform(8, 22)
    box(f'bld{i}', x0, 12 + d, -12, x0 + random.uniform(2, 3.2), 12 + d + 3, h - 12, BLD, 0)
    for k in range(random.randint(2, 6)):
        wx = x0 + random.uniform(0.2, 1.8); wz = random.uniform(-8, h - 13)
        box(f'bwin{i}_{k}', wx, 12 + d - 0.05, wz, wx + 0.5, 12 + d, wz + 0.6, WIN, 0)
# Daylight through the window band.
dl = bpy.data.lights.new('daylight', 'AREA'); dl.shape = 'RECTANGLE'; dl.size = 8.5; dl.size_y = 1.5
dl.energy = 1400; dl.color = (0.75, 0.84, 1.0)
do = bpy.data.objects.new('daylight', dl); do.location = (9.25, 12.6, 1.6); do.rotation_euler = (math.pi / 2, 0, 0)
coll('lights').objects.link(do)
fl = bpy.data.lights.new('fill', 'AREA'); fl.size = 14; fl.energy = 60; fl.color = (0.85, 0.9, 1.0)
fo = bpy.data.objects.new('fill', fl); fo.location = (9, 2, 6); coll('lights').objects.link(fo)


# Walls the diorama cuts away; only the walk-in sees them.
CUR[0] = 'walkonly'
box('wall_front_a', -0.2, -0.8, 0, 3.5, -0.6, 2.8, WALL, 0)
box('wall_front_b', 13.5, -0.8, 0, 18.4, -0.6, 2.8, WALL, 0)
box('wall_front_sill', 3.5, -0.8, 0, 13.5, -0.6, 0.85, WALL, 0)
box('wall_front_head', 3.5, -0.8, 2.35, 13.5, -0.6, 2.8, WALL, 0)
box('wall_front_glass', 3.5, -0.75, 0.85, 13.5, -0.74, 2.35, GLASS, 0)
for i in range(8):
    x = 3.5 + i * (10 / 7)
    box(f'fmullion{i}', x - 0.04, -0.7, 0.85, x + 0.04, -0.62, 2.35, TRIM, 0.004)
box('wall_right', 18.2, -0.8, 0, 18.4, 12.2, 2.8, WALL, 0)
plane_img('right_print', 18.2, 3.0, 1.6, 0.8, 1.0, img_mat('poster', 'poster.png', 0, 0.2), '-x')
box('sky_front', -20, -40.5, -10, 40, -40, 40, M['sky'], 0)
for i in range(10):
    x0 = -4 + i * 3.4
    box(f'fbld{i}', x0, -36, -12, x0 + 2.6, -33, 4 + (i * 7) % 11, mat('building', (0.18, 0.2, 0.23), 0.8), 0)
dl2 = bpy.data.lights.new('daylight2', 'AREA'); dl2.shape = 'RECTANGLE'; dl2.size = 10; dl2.size_y = 1.5
dl2.energy = 900; dl2.color = (0.75, 0.84, 1.0)
do2 = bpy.data.objects.new('daylight2', dl2); do2.location = (8.5, -1.3, 1.6); do2.rotation_euler = (-math.pi / 2, 0, 0)
coll('walklights').objects.link(do2)
CUR[0] = 'room'

# Cut walls get an off-white cap, like an architect's model; the eye reads the cut, not a grey slab.
CUR[0] = 'room'
for o in list(S.objects):
    if o.type != 'MESH' or not o.data.materials or o.data.materials[0] is not WALL: continue
    if any(c.name in ('walkonly', 'ceiling') for c in o.users_collection): continue
    xs = [v.co.x for v in o.data.vertices]; ys = [v.co.y for v in o.data.vertices]; zs = [v.co.z for v in o.data.vertices]
    if max(zs) < 2.79: continue
    box(o.name + '_cap', min(xs) - 0.004, min(ys) - 0.004, max(zs), max(xs) + 0.004, max(ys) + 0.004, max(zs) + 0.012, CAP, 0.003, hot=HOT.get(o.name))

# ---------- world, render ----------
w = bpy.data.worlds.new('world'); S.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.3, 0.33, 0.38, 1)
w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.15
S.render.engine = 'CYCLES'
S.cycles.device = 'CPU'
S.cycles.use_denoising = True
S.cycles.denoiser = 'OPENIMAGEDENOISE'
S.cycles.max_bounces = 8
S.cycles.diffuse_bounces = 3
S.cycles.glossy_bounces = 2
S.cycles.adaptive_threshold = 0.04
S.render.use_persistent_data = True
S.cycles.transmission_bounces = 8
S.cycles.sample_clamp_indirect = 8
S.cycles.blur_glossy = 0.5
S.view_settings.view_transform = 'AgX'
S.view_settings.look = 'AgX - Medium High Contrast'
S.render.film_transparent = False
S.view_settings.exposure = -0.3

def compositor(glare=True):
    return   # bloom and grain are added afterwards in post.py
    S.use_nodes = True
    tree = S.node_tree
    for nd in list(tree.nodes): tree.nodes.remove(nd)
    rl = tree.nodes.new('CompositorNodeRLayers'); out = tree.nodes.new('CompositorNodeComposite')
    last = rl.outputs['Image']
    if glare:
        g = tree.nodes.new('CompositorNodeGlare')
        for k, v in (('glare_type', 'FOG_GLOW'), ('quality', 'HIGH'), ('threshold', 0.9), ('mix', -0.85), ('size', 8)):
            try: setattr(g, k, v)
            except Exception: pass
        tree.links.new(last, g.inputs[0]); last = g.outputs[0]
    tree.links.new(last, out.inputs[0])

def look_at(cam, target):
    d = Vector(target) - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

def hide(name, flag=True):
    if name in COL: COL[name].hide_render = flag

# ---------- modes ----------
PITCH = MODE in ('shot', 'shotmask') and ARGS[:1] in (['pitch'], ['pitchwide'])
if not PITCH: hide('pitch')
FRIDAY = MODE in ('shot', 'shotmask') and ARGS[:1] == ['friday']
if not FRIDAY: hide('friday')

def evening():
    """17:40: most of the troffers off, dusk outside, the desk lamps and screens carry the room."""
    for lt in TROFFERS: lt.energy *= 0.22
    dl.energy = 140; dl.color = (0.35, 0.42, 0.75)
    fl.energy = 22
    for nm, x, y in (('eve_lamp_you', 12.5, 5.1), ('eve_lamp_priya', 6.2, 8.5)):
        lt = bpy.data.lights.new(nm, 'POINT'); lt.energy = 18; lt.color = (1, 0.7, 0.42); lt.shadow_soft_size = 0.1
        lo = bpy.data.objects.new(nm, lt); lo.location = (x, y, 1.15); coll('lights').objects.link(lo)

HUB_TARGET = (9.0, 6.5, 0.8)
def hub_camera():
    cd = bpy.data.cameras.new('hubcam'); cd.type = 'ORTHO'; cd.ortho_scale = 22
    cam = bpy.data.objects.new('hubcam', cd); S.collection.objects.link(cam)
    az, el, dist = math.radians(-38), math.radians(36), 40
    t = Vector(HUB_TARGET)
    cam.location = t + Vector((math.sin(-az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el))) * dist
    look_at(cam, t)
    cd.clip_end = 200
    S.camera = cam
    hide('ceiling'); hide('walkonly'); hide('walklights')
    S.render.film_transparent = True
    S.render.image_settings.color_mode = 'RGBA'
    hide('outside')
    # The diorama has no street: the window glass renders see-through, so the game paints sky and rain
    # behind the picture and the mullions stay in front of it.
    S.cycles.film_transparent_glass = True
    # Lights that the ceiling used to hide stay; the cutaway reads like a diorama.
    return cam

def hotspot_boxes(cam):
    """Screen rectangles (0..1, origin top left) of every hotspot, for the HTML layer."""
    from bpy_extras.object_utils import world_to_camera_view
    dg = bpy.context.evaluated_depsgraph_get()
    res = {}
    for o in S.objects:
        h = HOT.get(o.name)
        if not h or o.type not in ('MESH', 'FONT'): continue
        for c in o.bound_box:
            p = world_to_camera_view(S, cam, o.matrix_world @ Vector(c))
            r = res.setdefault(h, [1, 1, 0, 0])
            r[0] = min(r[0], p.x); r[1] = min(r[1], 1 - p.y); r[2] = max(r[2], p.x); r[3] = max(r[3], 1 - p.y)
    return {k: [round(v, 4) for v in r] for k, r in res.items()}

IDS = ['desk', 'mieke', 'darren', 'tv', 'meeting', 'coffee', 'window', 'bart', 'priya', 'jens', 'canteen', 'lift']
def mask_materials():
    """Every hotspot glows in its own flat colour; the rest is black. One cheap pass."""
    cols = {}
    for i, h in enumerate(IDS):
        cols[h] = emit_mat('id_' + h, ((i + 1) / 16, 0, 0), 1)
    black = emit_mat('id_none', (0, 0, 0), 0)
    for o in S.objects:
        if o.type in ('MESH', 'FONT'):
            m = cols.get(HOT.get(o.name), black)
            o.data.materials.clear(); o.data.materials.append(m)
    for o in list(S.objects):
        if o.type == 'LIGHT': o.hide_render = True
    S.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0
    S.view_settings.view_transform = 'Standard'; S.view_settings.look = 'None'
    S.cycles.use_denoising = False
    S.cycles.samples = 4
    S.cycles.max_bounces = 0
    S.render.filter_size = 0.01

def set_res(w, h, samples):
    S.render.resolution_x, S.render.resolution_y, S.render.resolution_percentage = w, h, 100
    S.cycles.samples = samples

if MODE in ('hub', 'hubeve', 'mask'):
    w_, h_ = (int(ARGS[0]), int(ARGS[1])) if len(ARGS) > 1 else (1920, 1080)
    samples = int(ARGS[2]) if len(ARGS) > 2 else 128
    cam = hub_camera()
    set_res(w_, h_, samples)
    if MODE == 'hubeve':
        evening()
        S.render.filepath = os.path.join(OUT, f'hub_evening_{w_}.png')
    elif MODE == 'hub':
        compositor()
        json.dump(hotspot_boxes(cam), open(os.path.join(OUT, 'hotspots.json'), 'w'), indent=1)
        S.render.filepath = os.path.join(OUT, f'hub_{w_}.png')
    else:
        mask_materials()
        S.render.filepath = os.path.join(OUT, f'mask_{w_}.png')
    S.render.image_settings.file_format = 'PNG'
    S.render.image_settings.color_mode = 'RGBA'
    bpy.ops.render.render(write_still=True)

elif MODE in ('walk', 'still'):
    # First person: out of the lift, past reception and Mieke, into your cubicle, onto the screen.
    cd = bpy.data.cameras.new('eye'); cd.lens = 24; cd.clip_start = 0.02; cd.clip_end = 200
    cd.dof.use_dof = True; cd.dof.aperture_fstop = 4.0
    cam = bpy.data.objects.new('eye', cd); S.collection.objects.link(cam); S.camera = cam
    tgt = bpy.data.objects.new('eye_target', None); S.collection.objects.link(tgt)
    tr = cam.constraints.new('TRACK_TO'); tr.target = tgt; tr.track_axis = 'TRACK_NEGATIVE_Z'; tr.up_axis = 'UP_Y'
    cd.dof.focus_object = tgt
    Y = 4.3 + 1.2   # your back panel
    KEYS = [  # frame, eye, look-at
        (1,   (-1.0, 1.5, 1.62), (3.0, 1.6, 1.55)),
        (40,  (-1.0, 1.5, 1.62), (3.0, 1.7, 1.55)),
        (80,  (1.6, 2.0, 1.62),  (4.0, 4.6, 1.5)),
        (120, (4.4, 2.25, 1.62), (6.6, 4.6, 1.0)),
        (165, (7.4, 2.3, 1.62),  (7.0, 5.0, 1.0)),
        (205, (10.2, 2.35, 1.62), (13.5, 3.2, 1.3)),
        (240, (11.8, 2.6, 1.6),  (11.9, 5.6, 1.1)),
        (275, (11.9, 3.75, 1.2), (11.85, Y, 1.02)),
        (310, (11.85, 4.76, 0.975), (11.85, Y, 0.97)),
    ]
    for f, e, t in KEYS:
        cam.location = e; cam.keyframe_insert('location', frame=f)
        tgt.location = t; tgt.keyframe_insert('location', frame=f)
    for o in (cam, tgt):
        for fc in o.animation_data.action.fcurves if hasattr(o.animation_data.action, 'fcurves') else []:
            for kp in fc.keyframe_points: kp.interpolation = 'BEZIER'; kp.handle_left_type = kp.handle_right_type = 'AUTO_CLAMPED'
    # Lift doors slide open.
    for o, dy in ((DOOR_L, -0.58), (DOOR_R, 0.58)):
        o.keyframe_insert('location', frame=4)
        o.location.y += dy; o.keyframe_insert('location', frame=30)
    S.frame_start, S.frame_end = 1, 310
    S.render.fps = 25
    w_, h_ = (int(ARGS[0]), int(ARGS[1])) if len(ARGS) > 1 else (1280, 720)
    samples = int(ARGS[2]) if len(ARGS) > 2 else 48
    set_res(w_, h_, samples)
    compositor()
    S.render.image_settings.file_format = 'JPEG'; S.render.image_settings.quality = 92
    if MODE == 'still':
        for f in (int(x) for x in ARGS[3].split(',')):
            S.frame_set(f)
            S.render.filepath = os.path.join(OUT, f'walk_still_{f:03d}.jpg')
            bpy.ops.render.render(write_still=True)
    else:
        a, z = (int(ARGS[3]), int(ARGS[4])) if len(ARGS) > 4 else (1, 310)
        S.frame_start, S.frame_end = a, z
        S.render.filepath = os.path.join(OUT, 'walk', '')
        bpy.ops.render.render(animation=True)
elif MODE in ('shot', 'shotmask'):
    # A close-up of one place, for the floor's "look closer" view. ARGS: name w h samples
    SHOTS = {   # eye, look-at, lens
        'mieke': ((7.1, 3.15, 1.62), (6.85, 4.85, 0.8), 24),
        'darren': ((14.6, 9.3, 1.55), (15.55, 11.2, 0.95), 22),
        'bart': ((9.6, 3.15, 1.62), (9.35, 4.85, 0.8), 24),
        'priya': ((7.1, 6.55, 1.62), (6.85, 8.25, 0.8), 24),
        'jens': ((12.1, 6.55, 1.62), (11.85, 8.25, 0.8), 24),
        'canteen': ((14.5, 4.3, 1.6), (16.4, 7.6, 0.95), 20),
        'board': ((3.9, 8.4, 1.7), (1.6, 10.8, 1.0), 18),
        'pitch': ((2.5, 8.95, 1.45), (2.5, 11.9, 1.68), 27),          # the slide show: the screen, big
        'pitchwide': ((2.5, 8.12, 2.1), (2.5, 11.0, 1.12), 16),       # questions and verdict: the board's places too
        'friday': ((11.72, 3.9, 1.26), (11.62, 5.0, 0.88), 19),       # your desk, Friday evening, from your chair
        'desk': ((11.72, 3.9, 1.26), (11.62, 5.0, 0.88), 19),         # your desk by day, the same view: you sit down, then look at the screen
    }
    name = ARGS[0]
    e, g, lens = SHOTS[name]
    cd = bpy.data.cameras.new('eye'); cd.lens = lens; cd.clip_start = 0.02; cd.clip_end = 200
    cam = bpy.data.objects.new('eye', cd); S.collection.objects.link(cam); S.camera = cam
    cam.location = e; look_at(cam, g)
    w_, h_ = (int(ARGS[1]), int(ARGS[2])) if len(ARGS) > 2 else (1600, 900)
    set_res(w_, h_, int(ARGS[3]) if len(ARGS) > 3 else 96)
    variant = ARGS[4] if len(ARGS) > 4 else ''
    if PITCH:
        # You stand at the screen end; the far chairs are yours to pace behind, so they go.
        for o in S.objects:
            if o.name.startswith('meet_d') or o.name.startswith('meet_adapter'): o.hide_render = True
        # Where the slide sits on the picture: the screen's corners, for the HTML layer.
        from bpy_extras.object_utils import world_to_camera_view
        S.frame_set(1); bpy.context.view_layer.update()
        x0, x1, z0, z1 = SCREEN; y = SCREEN_Y - 0.012
        corners = [world_to_camera_view(S, cam, Vector(c)) for c in ((x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0))]
        json.dump([[round(c.x * 100, 3), round((1 - c.y) * 100, 3)] for c in corners], open(os.path.join(OUT, f'{name}_screen.json'), 'w'))
        room = [lt for lt in TROFFERS if bpy.data.objects[lt.name].location.x < 5.2 and bpy.data.objects[lt.name].location.y > 7.8]
        if variant in ('dim', 'off'):
            for lt in TROFFERS: lt.energy *= 0.35
            for lt in room: lt.energy *= 0.3
            PANEL.node_tree.nodes['Emission'].inputs['Strength'].default_value = 1.2
        # The projector throws the slide; the game draws it, so the render only lights the screen and its spill.
        sp = SCREEN_MAT.node_tree.nodes['Principled BSDF']
        sp.inputs['Emission Strength'].default_value = {'dim': 1.6, 'lit': 0.5}.get(variant, 0.0)
        if variant in ('dim', 'lit'):
            gl = bpy.data.lights.new('screen_spill', 'AREA'); gl.shape = 'RECTANGLE'; gl.size = SCREEN[1] - SCREEN[0]; gl.size_y = SCREEN[3] - SCREEN[2]
            gl.energy = 40 if variant == 'dim' else 10; gl.color = (0.8, 0.86, 1.0)
            go = bpy.data.objects.new('screen_spill', gl); go.location = ((SCREEN[0] + SCREEN[1]) / 2, SCREEN_Y - 0.05, (SCREEN[2] + SCREEN[3]) / 2)
            go.rotation_euler = (-math.pi / 2, 0, 0); coll('lights').objects.link(go)
    if FRIDAY:
        # 18:00 on Friday: the floor half dark, your screen on, the welcome note long gone.
        evening()
        bpy.data.objects['you_crt_screen'].data.materials[0] = img_mat('scr_desk', 'screen_desk.png', 1.2)
        for o in ('you_welcome', 'you_mug'): bpy.data.objects[o].hide_render = True
        for o in S.objects:
            if o.name.startswith('you_chair'): o.hide_render = True   # you are sitting in it
        for o in ('you_crt_front', 'you_crt_screen'): THING[o] = ('friday', 'screen')
    if name == 'desk':
        # Any working day: the screen on, the mug of the morning, the things on your desk that have
        # something to say. The welcome note is from your first morning only.
        bpy.data.objects['you_crt_screen'].data.materials[0] = img_mat('scr_desk', 'screen_desk.png', 1.2)
        bpy.data.objects['you_welcome'].hide_render = True
        for o in S.objects:
            if o.name.startswith('you_chair'): o.hide_render = True
        # From Friday's set: your coat on the side panel and the round mug; not the report or the memo.
        hide('friday', False)
        for o in ('fri_folder', 'fri_label', 'fri_memo', 'you_mug'): bpy.data.objects[o].hide_render = True
        for o in ('fri_coat', 'fri_collar'): THING[o] = ('desk', 'coat')
        for o in ('fri_mug', 'fri_mug_handle'): THING[o] = ('desk', 'mug')
        # The plant on its last legs, in view beside the phone: three bare stems, a few drooping
        # yellow leaves, one already on the desk.
        for o in S.objects:
            if o.name.startswith(('you_plant', 'you_leaf')): o.hide_render = True
        CUR[0] = 'deskday'
        px, py, pz = 12.42, 5.5 - 0.2, 0.745
        THING[cyl('dd_pot', px, py, pz, 0.062, 0.1, POT, 32, r2=0.075).name] = ('desk', 'plant')
        THING[cyl('dd_soil', px, py, pz + 0.085, 0.07, 0.008, mat('soil', (0.08, 0.05, 0.03), 0.95), 32).name] = ('desk', 'plant')
        STEM = mat('stem', (0.25, 0.22, 0.08), 0.8)
        LEAF = [mat('leafy', (0.45, 0.4, 0.08), 0.6), mat('leafo', (0.38, 0.26, 0.06), 0.7), DEADLEAF]
        for i, (a, tall, lean) in enumerate(((0.4, 0.2, 0.25), (2.3, 0.15, 0.4), (4.2, 0.24, 0.15))):
            top = (px + math.cos(a) * lean * tall, py + math.sin(a) * lean * tall, pz + 0.09 + tall)
            THING[rod(f'dd_stem{i}', (px, py, pz + 0.09), top, 0.004, STEM, 6).name] = ('desk', 'plant')
            for k in range(2 if i != 1 else 1):
                lf = ball(f'dd_leaf{i}_{k}', top[0] + math.cos(a + k * 1.6) * 0.03, top[1] + math.sin(a + k * 1.6) * 0.03, top[2] - 0.02 - k * 0.03, 0.04, LEAF[(i + k) % 3], 1, 0.38, 0.1)
                lf.rotation_euler = (0.9 + 0.3 * k, 0.2, a + k * 1.6)
                THING[lf.name] = ('desk', 'plant')
        # A pen pot and a tray of this week's printouts, left of the keyboard.
        THING[cyl('dd_pens', 11.42, 5.5 - 0.22, pz, 0.035, 0.1, mat('penpot', (0.12, 0.13, 0.15), 0.5), 24).name] = ('desk', 'pens')
        for i, (dx, dy, c) in enumerate(((0.01, 0.005, (0.1, 0.2, 0.6)), (-0.012, 0.01, (0.7, 0.1, 0.1)), (0.004, -0.012, (0.1, 0.1, 0.1)))):
            THING[rod(f'dd_pen{i}', (11.42 + dx, 5.5 - 0.22 + dy, pz + 0.02), (11.42 + dx * 4, 5.5 - 0.22 + dy * 4, pz + 0.17), 0.004, mat(f'pen{i}', c, 0.4), 6).name] = ('desk', 'pens')
        TRAY = mat('traygrey', (0.2, 0.2, 0.22), 0.5)
        THING[turn(box('dd_tray', 10.92, 5.5 - 0.96, pz, 11.2, 5.5 - 0.6, pz + 0.008, TRAY, 0.002), (0, 0, 0.1)).name] = ('desk', 'tray')
        for k in range(5):
            THING[turn(box(f'dd_print{k}', 10.94, 5.5 - 0.94, pz + 0.008 + k * 0.004, 11.18, 5.5 - 0.62, pz + 0.011 + k * 0.004, PAPER, 0.0005), (0, 0, 0.1 + 0.05 * (k % 2) - 0.02 * k)).name] = ('desk', 'tray')
        fl = ball('dd_fallen', px - 0.14, py - 0.08, pz + 0.004, 0.035, DEADLEAF, 1, 0.4, 0.08)
        fl.rotation_euler = (0, 0, 0.7); THING[fl.name] = ('desk', 'plant')
        for o in ('you_crt_front', 'you_crt_screen'): THING[o] = ('desk', 'screen')
        THING['you_sticky'] = ('desk', 'sticky')
        THING['you_calendar'] = ('desk', 'calendar')
        for o in ('you_phone', 'you_handset'): THING[o] = ('desk', 'phone')
        for o in S.objects:
            if o.name.startswith('you_plant') or o.name.startswith('you_leaf'): THING[o.name] = ('desk', 'plant')
        for o in S.objects:
            if o.name.startswith('you_bm') or o.name.startswith('you_binder'): THING[o.name] = ('desk', 'binders')
    suffix = '_' + variant if variant else ''
    if MODE == 'shotmask':
        key = 'pitch' if PITCH else name   # both board day shots share the board's places
        ids = sorted({t for s_, t in THING.values() if s_ == key})
        json.dump(ids, open(os.path.join(OUT, f'shot_{name}_ids.json'), 'w'))
        cols = {t: emit_mat('th_' + t, ((i + 1) / 16, 0, 0), 1) for i, t in enumerate(ids)}
        black = emit_mat('id_none', (0, 0, 0), 0)
        for o in S.objects:
            if o.type in ('MESH', 'FONT'):
                st = THING.get(o.name)
                m = cols.get(st[1], black) if st and st[0] == key else black
                o.data.materials.clear(); o.data.materials.append(m)
        for o in list(S.objects):
            if o.type == 'LIGHT': o.hide_render = True
        S.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0
        S.view_settings.view_transform = 'Standard'; S.view_settings.look = 'None'
        S.cycles.use_denoising = False; S.cycles.samples = 4; S.cycles.max_bounces = 0; S.render.filter_size = 0.01
        S.render.image_settings.file_format = 'PNG'
        S.render.filepath = os.path.join(OUT, f'shot_{name}_mask.png')
    else:
        S.render.image_settings.file_format = 'PNG'
        S.render.filepath = os.path.join(OUT, f'shot_{name}{suffix}.png')
    bpy.ops.render.render(write_still=True)

elif MODE in ('stand', 'standstill'):
    # Between requests: from your monitor you sit back, stand up, step out of the cubicle and the view
    # rises through the ceiling into the diorama the floor picture shows. The game cross-fades into it.
    bpy.data.objects['you_crt_screen'].data.materials[0] = img_mat('scr_desk', 'screen_desk.png', 1.2)   # the game was on it
    cd = bpy.data.cameras.new('eye'); cd.lens = 24; cd.clip_start = 0.02; cd.clip_end = 300
    cd.dof.use_dof = True; cd.dof.aperture_fstop = 4.0
    cam = bpy.data.objects.new('eye', cd); S.collection.objects.link(cam); S.camera = cam
    tgt = bpy.data.objects.new('eye_target', None); S.collection.objects.link(tgt)
    tr = cam.constraints.new('TRACK_TO'); tr.target = tgt; tr.track_axis = 'TRACK_NEGATIVE_Z'; tr.up_axis = 'UP_Y'
    cd.dof.focus_object = tgt
    Y = 4.3 + 1.2
    SCR = (11.85, Y - 0.62, 0.97)   # the middle of your screen
    t = Vector(HUB_TARGET)
    az, el = math.radians(-38), math.radians(36)
    far = t + Vector((math.sin(-az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el))) * 52   # far and long-lensed, so the floor sits like the flat picture
    KEYS = [  # frame, eye, look-at, lens
        (1,   (11.85, SCR[1] - 0.27, 0.97), SCR, 24),
        (12,  (11.85, SCR[1] - 0.45, 0.99), SCR, 24),
        (30,  (11.85, 4.25, 1.52),    (11.85, Y + 0.3, 1.2), 24),
        (50,  (11.95, 3.2, 1.62),     (8.5, 6.5, 1.0), 24),
        (70,  (13.6, 1.0, 2.6),       tuple(t), 30),
        (105, tuple(far),             tuple(t), 85),
    ]
    END = KEYS[-1][0]
    # Once the street is gone, an overcast sky sits right behind the window band (the picture paints rain there).
    CUR[0] = 'standsky'
    box('standsky', 4.8, 12.6, 0.7, 13.7, 12.65, 2.5, M['sky'], 0)
    for f, e, g, lens in KEYS:
        cam.location = e; cam.keyframe_insert('location', frame=f)
        tgt.location = g; tgt.keyframe_insert('location', frame=f)
        cd.lens = lens; cd.keyframe_insert('lens', frame=f)
    # Ceiling, front wall and street vanish once the eye leaves the room.
    def outside_room(f):
        S.frame_set(f); p = cam.matrix_world.translation
        return p.z > 2.55 or p.y < -0.4
    out_at = next(f for f in range(1, END + 1) if outside_room(f))
    print('leaves the room at frame', out_at)
    S.render.fps = 25
    w_, h_ = (int(ARGS[0]), int(ARGS[1])) if len(ARGS) > 1 else (960, 540)
    samples = int(ARGS[2]) if len(ARGS) > 2 else 16
    set_res(w_, h_, samples)
    S.render.image_settings.file_format = 'JPEG'; S.render.image_settings.quality = 92
    if MODE == 'standstill':
        frames = [int(x) for x in ARGS[3].split(',')]
        name = lambda f: os.path.join(OUT, f'stand_still_{f:03d}.jpg')
    else:
        a, z = (int(ARGS[3]), int(ARGS[4])) if len(ARGS) > 4 else (1, END)
        frames = range(a, z + 1)
        os.makedirs(os.path.join(OUT, 'stand'), exist_ok=True)
        name = lambda f: os.path.join(OUT, 'stand', f'{f:04d}.jpg')
    for f in frames:
        for cname in ('ceiling', 'walkonly', 'walklights', 'outside'): hide(cname, f >= out_at)
        S.frame_set(f)
        S.render.filepath = name(f)
        bpy.ops.render.render(write_still=True)
elif MODE in ('floor5', 'lift5', 'lift5still'):
    # The reveal: the lift opens on floor 5, the same floor in 2041. No desks, rows of GMS racks, one CRT
    # on the carpet running Doors OS. Its screen is drawn by the game. ARGS: w h samples
    keep = ('wall_', 'mullion', 'sill', 'window_glass', 'lift_', 'accent_left', 'floor', 'slab', 'troffer', 'ceiling', 'street', 'sky', 'bld', 'bwin', 'fbld', 'right_print')
    for o in S.objects:
        if o.type in ('MESH', 'FONT') and not o.name.startswith(keep): o.hide_render = True
    for nm in ('right_print', 'lift_floor_no'): bpy.data.objects[nm].hide_render = True
    for cname in ('cubicles', 'meeting', 'pitch', 'darren', 'canteen'): hide(cname)
    CUR[0] = 'floor5'
    LED = emit_mat('led', (1, 0.25, 0.05), 6)
    text('f5_floor_no', '5', 0.03, 2.375, 2.07, 0.1, LED, '+x')
    # Where the sign hung: a cleaner patch of wall and four screw holes.
    box('f5_signghost', 0.012, 3.0, 1.45, 0.016, 7.0, 2.25, mat('wallclean', (0.74, 0.72, 0.66), 0.85), 0)
    for i, (y, z) in enumerate(((3.2, 1.55), (6.8, 1.55), (3.2, 2.15), (6.8, 2.15))):
        cyl(f'f5_screw{i}', 0.017, y, z, 0.012, 0.004, DARKP).rotation_euler = (0, math.pi / 2, 0)
    # Lighter carpet where the cubicles stood for years.
    GHOST = mat('carpetghost', (0.16, 0.17, 0.19), 0.95, bump=0.2, scale=300)
    for cx, cy in ((7.0, 4.3), (9.5, 4.3), (12.0, 4.3), (7.0, 7.7), (9.5, 7.7), (12.0, 7.7)):
        box(f'f5_ghost{cx}_{cy}', cx - 1.2, cy - 0.9, 0.0, cx + 1.2, cy + 1.2, 0.002, GHOST, 0)
    RACK = mat('rack', (0.03, 0.035, 0.04), 0.4, metal=0.5)
    MESHF = mat('rackmesh', (0.06, 0.065, 0.07), 0.5, metal=0.7, bump=0.4, scale=900)
    BLUEL = emit_mat('rackblue', (0.25, 0.5, 1.0), 9)
    GREENL = emit_mat('rackgreen', (0.2, 1.0, 0.4), 9)
    GMSRED = emit_mat('gmsred', (0.9, 0.08, 0.1), 2.5)
    import random as _r
    _r.seed(41)
    for row, y in enumerate((6.9, 9.0, 11.0)):
        for i in range(11):
            x = 3.0 + i * 1.05 + (0.6 if i > 5 else 0)
            if row == 0 and i in (3,): continue   # a gap in the first row, towards the window
            box(f'f5_rack{row}_{i}', x, y, 0, x + 1.0, y + 1.1, 2.15, RACK, 0.01)
            box(f'f5_door{row}_{i}', x + 0.04, y - 0.012, 0.08, x + 0.96, y, 2.08, MESHF, 0)
            text(f'f5_gms{row}_{i}', 'GMS', x + 0.5, y - 0.016, 1.92, 0.12, GMSRED, '-y', extrude=0.002)
            for k in range(14):
                if _r.random() < 0.55:
                    lz = 0.3 + k * 0.11; lx = x + 0.12 + _r.random() * 0.15
                    box(f'f5_led{row}_{i}_{k}', lx, y - 0.016, lz, lx + 0.02, y - 0.013, lz + 0.012, BLUEL if _r.random() < 0.7 else GREENL, 0)
    # Cold light from the racks onto the carpet.
    for i, (x, y) in enumerate(((5.5, 6.3), (11.0, 6.3))):
        lt = bpy.data.lights.new(f'f5_rackwash{i}', 'AREA'); lt.shape = 'RECTANGLE'; lt.size = 4; lt.size_y = 0.3
        lt.energy = 35; lt.color = (0.35, 0.55, 1.0)
        lo = bpy.data.objects.new(f'f5_rackwash{i}', lt); lo.location = (x, y, 1.0); lo.rotation_euler = (-math.pi / 2, 0, 0); coll('lights').objects.link(lo)
    # The CRT on the carpet, cable across the floor to the racks. Its screen glows Doors blue.
    SCR5 = emit_mat('f5_screen', (0.16, 0.33, 0.78), 0.8)
    CRT_X, CRT_Y = 4.6, 3.6
    crt('f5_crt', CRT_X, CRT_Y, 0.0, SCR5, hot='crt')
    box('f5_kbd', CRT_X - 0.22, CRT_Y - 0.55, 0.0, CRT_X + 0.22, CRT_Y - 0.41, 0.025, BEIGE, 0.006, hot='crt')
    # Turned three-quarters towards the lift, so the screen catches the eye.
    piv = bpy.data.objects.new('f5_crt_pivot', None); S.collection.objects.link(piv); piv.location = (CRT_X, CRT_Y, 0)
    for o in S.objects:
        if o.name.startswith(('f5_crt_', 'f5_kbd')) and o is not piv:
            o.parent = piv; o.matrix_parent_inverse = Matrix.Translation((-CRT_X, -CRT_Y, 0))
    piv.rotation_euler = (0, 0, math.radians(-50))
    pts = [(CRT_X + 0.1, CRT_Y + 0.4, 0.01), (CRT_X + 0.5, CRT_Y + 1.4, 0.01), (CRT_X - 0.2, CRT_Y + 2.3, 0.01), (CRT_X - 0.9, 6.85, 0.01)]
    for i in range(len(pts) - 1): rod(f'f5_cable{i}', pts[i], pts[i + 1], 0.009, DARKP, 8)
    gl = bpy.data.lights.new('f5_crtglow', 'AREA'); gl.size = 0.3; gl.energy = 6; gl.color = (0.4, 0.55, 1.0)
    go = bpy.data.objects.new('f5_crtglow', gl); go.location = (CRT_X, CRT_Y - 0.1, 0.23); go.rotation_euler = (math.pi / 2, 0, 0); coll('lights').objects.link(go)
    # Most of the ceiling is dark; the street outside is the same rain, colder.
    for lt in TROFFERS: lt.energy *= 0.05
    PANEL.node_tree.nodes['Emission'].inputs['Strength'].default_value = 0.04
    dl.energy = 500; dl.color = (0.55, 0.62, 0.8); fl.energy = 8
    WIN.node_tree.nodes['Emission'].inputs['Strength'].default_value = 0.0
    cd = bpy.data.cameras.new('eye'); cd.lens = 22; cd.clip_start = 0.02; cd.clip_end = 200
    cd.dof.use_dof = True; cd.dof.aperture_fstop = 5.6
    cam = bpy.data.objects.new('eye', cd); S.collection.objects.link(cam); S.camera = cam
    cam.location = (0.9, 1.45, 1.62); look_at(cam, (6.0, 5.2, 0.5))
    fo_ = bpy.data.objects.new('f5_focus', None); fo_.location = (CRT_X, CRT_Y, 0.2); S.collection.objects.link(fo_); cd.dof.focus_object = fo_
    if MODE.startswith('lift5'):
        # The film before the still: inside the lift, the doors open on floor 5 and you step out to
        # where the still is taken. 125 frames at 25 fps; the game adds the ding and plays it once.
        cam.constraints.clear()
        tgt = bpy.data.objects.new('lift_target', None); S.collection.objects.link(tgt)
        tr = cam.constraints.new('TRACK_TO'); tr.target = tgt; tr.track_axis = 'TRACK_NEGATIVE_Z'; tr.up_axis = 'UP_Y'
        KEYS = [(1, (-1.35, 1.5, 1.62), (1.0, 1.5, 1.5)), (40, (-1.35, 1.5, 1.62), (1.0, 1.52, 1.45)),
                (70, (-0.9, 1.5, 1.62), (3.0, 2.6, 1.0)), (125, (0.9, 1.45, 1.62), (6.0, 5.2, 0.5))]
        for f, e, g in KEYS:
            cam.location = e; cam.keyframe_insert('location', frame=f)
            tgt.location = g; tgt.keyframe_insert('location', frame=f)
        for o, dy in ((bpy.data.objects['lift_door_l'], -0.58), (bpy.data.objects['lift_door_r'], 0.58)):
            o.keyframe_insert('location', frame=34)
            o.location.y += dy; o.keyframe_insert('location', frame=62)
        S.render.fps = 25
        w_, h_ = (int(ARGS[0]), int(ARGS[1])) if len(ARGS) > 1 else (960, 540)
        set_res(w_, h_, int(ARGS[2]) if len(ARGS) > 2 else 24)
        S.render.image_settings.file_format = 'JPEG'; S.render.image_settings.quality = 92
        frames = [int(x) for x in ARGS[3].split(',')] if MODE == 'lift5still' else range(int(ARGS[3]) if len(ARGS) > 3 else 1, (int(ARGS[4]) if len(ARGS) > 4 else 125) + 1)
        os.makedirs(os.path.join(OUT, 'lift5'), exist_ok=True)
        for f in frames:
            S.frame_set(f)
            S.render.filepath = os.path.join(OUT, 'lift5', f'{f:04d}.jpg')
            bpy.ops.render.render(write_still=True)
        print('done', MODE); sys.exit(0)
    for nm in ('lift_door_l', 'lift_door_r'): bpy.data.objects[nm].location.y += (-0.58 if nm.endswith('l') else 0.58)
    w_, h_ = (int(ARGS[0]), int(ARGS[1])) if len(ARGS) > 1 else (1600, 900)
    set_res(w_, h_, int(ARGS[2]) if len(ARGS) > 2 else 96)
    S.render.image_settings.file_format = 'PNG'
    S.render.filepath = os.path.join(OUT, 'floor5.png')
    # Where the CRT screen sits on the picture, for the HTML layer.
    from bpy_extras.object_utils import world_to_camera_view
    bpy.context.view_layer.update()
    sc = bpy.data.objects['f5_crt_screen']
    pts2 = [world_to_camera_view(S, cam, sc.matrix_world @ Vector(c)) for c in sc.bound_box]
    json.dump([round(min(p.x for p in pts2) * 100, 2), round((1 - max(p.y for p in pts2)) * 100, 2), round(max(p.x for p in pts2) * 100, 2), round((1 - min(p.y for p in pts2)) * 100, 2)], open(os.path.join(OUT, 'floor5_screen.json'), 'w'))
    bpy.ops.render.render(write_still=True)
print('done', MODE)
