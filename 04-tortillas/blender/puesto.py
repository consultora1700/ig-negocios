"""Reel 04: arma el puesto de tortillas y la cocina de madrugada con modelos CC0 de Poly Haven y piezas propias,
y exporta dos glb (texturas incluidas) para el mundo en tiempo real. Con --foto además saca una foto de control.
blender -b -P puesto.py -- --salida DIR [--foto 1]"""
import bpy, bmesh, math, os, sys, random
from mathutils import Vector
sys.path.insert(0, "/root/ig-negocios/tools/blender")
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
opt = {args[i].lstrip("-"): args[i + 1] for i in range(0, len(args) - 1, 2)}
SAL = opt.get("salida", "/tmp/puesto"); os.makedirs(SAL, exist_ok=True)
bpy.ops.wm.read_homefile(use_empty=True)
from personaje import mat, hex2lin
PH = "/root/ig-negocios-assets/polyhaven"; TX = "/root/ig-negocios-assets/texturas"
random.seed(4)
sc = bpy.context.scene

def coleccion(n):
    c = bpy.data.collections.new(n); sc.collection.children.link(c); return c
def a_col(objs, col):
    for o in objs:
        for c in list(o.users_collection): c.objects.unlink(o)
        col.objects.link(o)
def importar(nombre, col, loc, rot=0.0, esc=1.0, padre_nombre=None):
    f = [x for x in os.listdir(os.path.join(PH, nombre)) if x.endswith(".gltf")][0]
    antes = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=os.path.join(PH, nombre, f)); nuevos = [o for o in bpy.data.objects if o not in antes]
    e = bpy.data.objects.new(padre_nombre or nombre, None); col.objects.link(e)
    for o in nuevos:
        if o.parent is None: o.parent = e
    a_col(nuevos, col); e.location = loc; e.rotation_euler = (0, 0, rot); e.scale = (esc, esc, esc); return e
def caja(n, dim, loc, m, col, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.name = n; o.scale = dim; bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m); a_col([o], col); return o
def cil(n, r, h, loc, m, col, rot=(0, 0, 0), v=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=h, location=loc, rotation=rot); o = bpy.context.object; o.name = n; o.data.materials.append(m); a_col([o], col); return o
def tex_mat(nombre, carpeta, tinte=None, rough=None, escala=1.0):
    m = bpy.data.materials.new(nombre); m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    fs = os.listdir(os.path.join(TX, carpeta))
    def img(sufijo, color=True):
        f = [x for x in fs if sufijo in x]
        if not f: return None
        t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(os.path.join(TX, carpeta, f[0]))
        if not color: t.image.colorspace_settings.name = "Non-Color"
        return t
    c = img("_Color"); 
    if c:
        if tinte:
            mx = nt.nodes.new("ShaderNodeMixRGB"); mx.blend_type = "MULTIPLY"; mx.inputs[0].default_value = 1; mx.inputs[2].default_value = (*hex2lin(tinte), 1)
            nt.links.new(c.outputs[0], mx.inputs[1]); nt.links.new(mx.outputs[0], b.inputs["Base Color"])
        else: nt.links.new(c.outputs[0], b.inputs["Base Color"])
    r = img("_Roughness", False)
    if r and rough is None: nt.links.new(r.outputs[0], b.inputs["Roughness"])
    else: b.inputs["Roughness"].default_value = rough or 0.6
    n = img("_NormalGL", False)
    if n: nm = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(n.outputs[0], nm.inputs[1]); nt.links.new(nm.outputs[0], b.inputs["Normal"])
    if "Metal" in carpeta: b.inputs["Metallic"].default_value = 0.85
    return m
def emisivo(nombre, color, fuerza):
    m = bpy.data.materials.new(nombre); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*hex2lin("#2A1208"), 1); b.inputs["Emission Color"].default_value = (*hex2lin(color), 1); b.inputs["Emission Strength"].default_value = fuerza; return m

# =========================== PUESTO (origen = centro del gazebo, sobre la vereda) ===========================
P = coleccion("puesto")
metal = tex_mat("caño", "Metal032", tinte="#9AA0A8", rough=0.45)
negro = mat("pintura_negra", "#1A1B1E", rough=0.5, metal=0.4)
# --- gazebo plegable: patas con pie, tijeras laterales, techo de lona con leve caída y faldón festoneado ---
G = bpy.data.objects.new("gazebo", None); P.objects.link(G)
L, LY, H = 1.2, 0.95, 2.05   # la vereda tiene 2,05 m entre la pared y el cordón
lona = mat("lona_roja", "#C2302A", rough=0.8); lonaB = mat("lona_blanca", "#F1EEE6", rough=0.8)
for sx in (-1, 1):
    for sy in (-1, 1):
        o = caja("pata", (0.045, 0.045, H), (sx * L, sy * LY, H / 2), metal, P); o.parent = G
        o = caja("pie", (0.16, 0.16, 0.01), (sx * L, sy * LY, 0.005), metal, P); o.parent = G
for (ax, ay, horiz) in ((0, -1, True), (0, 1, True), (-1, 0, False), (1, 0, False)):   # tijeras en X bajo el techo
    for s in (-1, 1):
        for k in (-0.5, 0.5):
            cx = ax * L if not horiz else k * L; cy = ay * LY if horiz else k * LY
            ang = math.atan2(0.28, L if horiz else LY) * s
            o = caja("tijera", (L * 1.0 if horiz else 0.03, 0.03 if horiz else LY * 1.0, 0.03), (cx, cy, H - 0.16), metal, P, rot=((ang if not horiz else 0), (ang if horiz else 0), 0)); o.parent = G
# techo: pirámide subdividida con caída entre caños (cosido a 8 paños rojo/blanco)
bm = bmesh.new(); top = bm.verts.new((0, 0, H + 0.6)); esq = [bm.verts.new((sx * L * 1.04, sy * LY * 1.04, H)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
for i in range(4): bm.faces.new((top, esq[i], esq[(i + 1) % 4]))
bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=10, use_grid_fill=True)
for v in bm.verts:   # cae entre las aristas (la lona cuelga entre los caños)
    x, y, z = v.co; r = max(abs(x) / L, abs(y) / LY) * L; 
    if r > 0.05:
        a = math.atan2(y, x); f = abs(math.sin(2 * a)); v.co.z -= (1 - f) * 0.06 * math.sin(math.pi * min(1, r / (L * 1.04)))
me = bpy.data.meshes.new("techo"); bm.to_mesh(me); bm.free(); techo = bpy.data.objects.new("techo", me); P.objects.link(techo); techo.parent = G
me.materials.append(lona); me.materials.append(lonaB)
for p in me.polygons:
    c = p.center; a = (math.degrees(math.atan2(c.y, c.x)) + 360 + 45) % 360; p.material_index = int(a // 90) % 2; p.use_smooth = True
# faldón festoneado
for i, (cx, cy, rz) in enumerate(((0, -LY * 1.04, 0), (L * 1.04, 0, math.pi / 2), (0, LY * 1.04, math.pi), (-L * 1.04, 0, -math.pi / 2))):
    bm = bmesh.new(); n = 40; w = (L if i % 2 == 0 else LY) * 2.08
    arriba = [bm.verts.new((-w / 2 + w * j / n, 0, 0)) for j in range(n + 1)]
    abajo = [bm.verts.new((-w / 2 + w * j / n, 0, -0.16 - 0.05 * abs(math.sin(math.pi * j / 5)))) for j in range(n + 1)]
    for j in range(n): bm.faces.new((arriba[j], arriba[j + 1], abajo[j + 1], abajo[j]))
    me = bpy.data.meshes.new("faldon"); bm.to_mesh(me); bm.free(); f = bpy.data.objects.new("faldon", me); P.objects.link(f); f.parent = G
    f.location = (cx, cy, H); f.rotation_euler = (0, 0, rz); me.materials.append(lona)
# --- parrilla: tambor oxidado (Poly Haven) con brasas, rejilla redonda y tortillas ---
par = importar("barrel_stove", P, (-0.25, -0.1, 0), 0.0, 1.0, "parrilla")
bpy.context.view_layer.update()
hs = [ (o.matrix_world @ v.co).z for o in par.children_recursive if o.type == "MESH" for v in o.data.vertices ]
alto = max(hs); xs = [ (o.matrix_world @ v.co).x for o in par.children_recursive if o.type == "MESH" for v in o.data.vertices ]; radio = (max(xs) - min(xs)) / 2
k = 0.82 / alto; par.scale = (k, k, k); alto *= k; radio *= k
brasa = emisivo("brasa", "#FF5A12", 6.0); carbonM = mat("carbon", "#16110D", rough=0.95)
for i in range(40):
    a = random.random() * 6.28; r = random.random() * radio * 0.8
    o = caja("brasa", (0.06, 0.05, 0.05), (-0.25 + math.cos(a) * r, -0.1 + math.sin(a) * r, alto - 0.12 + random.random() * 0.03), brasa if random.random() > 0.35 else carbonM, P, rot=(random.random(), random.random(), random.random())); o.parent = par; o.matrix_parent_inverse = par.matrix_world.inverted()
rej = bpy.data.objects.new("rejilla", None); P.objects.link(rej); bpy.context.view_layer.update(); rej.parent = par; rej.matrix_parent_inverse = par.matrix_world.inverted()
for i in range(13):
    x = -radio + 0.06 + i * (2 * radio - 0.12) / 12; l = 2 * math.sqrt(max(0.0, radio ** 2 - x ** 2)) * 0.98
    o = cil("varilla", 0.006, l, (-0.25 + x, -0.1, alto + 0.01), negro, P, rot=(math.pi / 2, 0, 0), v=8); o.parent = rej
o = bpy.ops.mesh.primitive_torus_add(major_radius=radio * 0.99, minor_radius=0.01, location=(-0.25, -0.1, alto + 0.01)); aro = bpy.context.object; aro.data.materials.append(negro); a_col([aro], P); aro.parent = rej
# --- mesa de madera con mantel, canasta de mimbre, pila de tortillas, chicharrón y bolsitas ---
mesa = importar("WoodenTable_01", P, (0.6, -0.15, 0), 0.0, 1.0, "mesa"); mesa.scale = (0.62, 0.95, 1.42)
bpy.context.view_layer.update()
mz = max((o.matrix_world @ v.co).z for o in mesa.children_recursive if o.type == "MESH" for v in o.data.vertices)
importar("wicker_basket_01", P, (0.85, -0.15, mz), 0.2, 1.0, "canasta")
importar("wooden_bowl_01", P, (0.35, -0.02, mz), 0.0, 1.0, "chicha")
importar("wooden_cutting_board", P, (0.5, -0.3, mz), 0.3, 1.0, "tabla")
# --- pizarrón de precios en la vereda (texto pintado a tiza) ---
pz = importar("standing_chalkboard_01", P, (1.75, 0.35, 0), math.radians(195), 1.0, "cartel")
tizaM = bpy.data.materials.new("tiza"); tizaM.use_nodes = True; nt = tizaM.node_tree; b = nt.nodes["Principled BSDF"]; ti = nt.nodes.new("ShaderNodeTexImage"); ti.image = bpy.data.images.load("/root/ig-negocios/04-tortillas/blender/tiza.png")
nt.links.new(ti.outputs["Color"], b.inputs["Base Color"]); nt.links.new(ti.outputs["Alpha"], b.inputs["Alpha"]); b.inputs["Roughness"].default_value = 1.0; tizaM.blend_method = "BLEND"
bpy.ops.mesh.primitive_plane_add(size=1); hoja = bpy.context.object; hoja.name = "tiza"; hoja.scale = (0.64, 0.84, 1); bpy.ops.object.transform_apply(scale=True); hoja.data.materials.append(tizaM); a_col([hoja], P)
hoja.parent = pz; hoja.location = (0.013, -0.196, 0.86); hoja.rotation_euler = (math.radians(76), 0, 0)
# --- insumos a la vista: bolsa de harina, bolsa de carbón, cajón plástico, silla de plástico ---
importar("flour_bag", P, (0.9, -0.72, 0), math.radians(80), 1.0, "harina")
importar("carbon_bag", P, (-0.75, -0.92, 0), math.radians(10), 0.75, "carbon")
importar("plastic_crate_01", P, (-0.95, 0.4, 0), math.radians(15), 1.0, "cajon")
importar("plastic_monobloc_chair_01", P, (0.3, -0.78, 0), math.radians(175), 1.0, "silla")
importar("trashbag", P, (-1.5, -0.6, 0), 0.0, 1.0, "basura")
# medidas de control
bpy.context.view_layer.update()
print("ALTO_TAMBOR", round(alto, 3), "RADIO", round(radio, 3), "ALTO_MESA", round(mz, 3))

# =========================== COCINA DE MADRUGADA (origen propio) ===========================
C = coleccion("cocina")
azul = mat("azulejo", "#E9EEEC", rough=0.25); revoque = tex_mat("revoque", "Plaster003", tinte="#E8DCC8"); piso = tex_mat("piso_madera", "Wood066", tinte="#9A7452")
caja("pared_fondo", (4.0, 0.1, 2.8), (0, -1.2, 1.4), revoque, C); caja("azulejos", (4.0, 0.02, 0.9), (0, -1.14, 1.2), azul, C)
caja("pared_lado", (0.1, 3.0, 2.8), (-2.0, 0.3, 1.4), revoque, C); caja("piso", (4.0, 3.2, 0.02), (0, 0.3, -0.01), piso, C)
noche = emisivo("noche", "#1C2A4A", 0.6); vidrio = caja("ventana", (0.9, 0.02, 0.7), (0.9, -1.13, 1.75), noche, C)
marco = mat("marco", "#E8E4DA", rough=0.5)
for dx, dz, w, h in ((0, 0.36, 0.96, 0.04), (0, -0.36, 0.96, 0.04), (-0.47, 0, 0.04, 0.76), (0.47, 0, 0.04, 0.76), (0, 0, 0.03, 0.72)): caja("marco", (w, 0.04, h), (0.9 + dx, -1.12, 1.75 + dz), marco, C)
mesaC = importar("WoodenTable_01", C, (0, -0.35, 0), 0.0, 1.0, "mesa_cocina"); mesaC.scale = (0.8, 1.1, 1.5)
bpy.context.view_layer.update()
cz = max((o.matrix_world @ v.co).z for o in mesaC.children_recursive if o.type == "MESH" for v in o.data.vertices)
importar("wooden_bowl_01", C, (-0.45, -0.4, cz), 0.0, 1.3, "bowl")
importar("metal_jug", C, (0.6, -0.55, cz), 0.0, 0.55, "jarra")
importar("flour_bag", C, (-1.3, -0.7, 0), math.radians(60), 1.0, "harina_cocina")
importar("hanging_industrial_lamp", C, (0, -0.3, 3.35), 0.0, 1.0, "lampara") if os.path.isdir(os.path.join(PH, "hanging_industrial_lamp")) else None
masaM = mat("masa", "#EAD9B5", rough=0.85)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.17, location=(0.05, -0.3, cz + 0.06)); bollo = bpy.context.object; bollo.scale = (1.15, 1.0, 0.45); bollo.data.materials.append(masaM); a_col([bollo], C)
for i in range(4):   # bollitos ya cortados
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.055, location=(0.35 + (i % 2) * 0.13, -0.15 - (i // 2) * 0.13, cz + 0.03)); b = bpy.context.object; b.scale = (1, 1, 0.6); b.data.materials.append(masaM); a_col([b], C)
harinaM = mat("harina_polvo", "#F7F3EA", rough=1.0); caja("harina_mesa", (0.7, 0.45, 0.002), (0.1, -0.3, cz + 0.001), harinaM, C)
cil("palote", 0.025, 0.45, (0.3, -0.5, cz + 0.025), mat("palote", "#B8875A", rough=0.6), C, rot=(0, math.pi / 2, 0.3))

# =========================== exportar ===========================
def exportar(col, ruta):
    bpy.ops.object.select_all(action="DESELECT")
    for o in col.all_objects: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=ruta, use_selection=True, export_format="GLB", export_apply=True, export_image_format="JPEG", export_jpeg_quality=85, export_yup=True)
exportar(P, os.path.join(SAL, "puesto.glb")); exportar(C, os.path.join(SAL, "cocina.glb"))
print("EXPORTADO")
if opt.get("foto"):
    C.hide_render = False
    for o in C.all_objects: o.location.x += 6
    sc.render.engine = "CYCLES"; sc.cycles.samples = 48; sc.cycles.use_denoising = True
    sc.render.resolution_x = 1800; sc.render.resolution_y = 1000; sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (*hex2lin("#C9D6EA"), 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.7
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, -0.001)); bpy.context.object.data.materials.append(tex_mat("vereda", "PavingStones138"))
    l = bpy.data.lights.new("sol", "SUN"); l.energy = 3.2; l.angle = math.radians(4); o = bpy.data.objects.new("sol", l); sc.collection.objects.link(o); o.rotation_euler = (math.radians(50), 0, math.radians(-30))
    l2 = bpy.data.lights.new("foco", "AREA"); l2.energy = 120; l2.size = 0.6; l2.color = hex2lin("#FFD9A8"); o2 = bpy.data.objects.new("foco", l2); sc.collection.objects.link(o2); o2.location = (6, -0.3, 2.4)
    cd = bpy.data.cameras.new("c"); cd.lens = 28; cam = bpy.data.objects.new("c", cd); sc.collection.objects.link(cam); sc.camera = cam
    cam.location = (3.0, 6.8, 2.6); cam.rotation_euler = (math.radians(78), 0, math.radians(180 - 8))
    sc.render.filepath = os.path.join(SAL, "control.png"); bpy.ops.render.render(write_still=True)
