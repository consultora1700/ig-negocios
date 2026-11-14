"""Prueba Blender/Cycles: el candy del cine de cerca, con personajes propios.
blender -b -P escena.py -- --cuadro 1 --salida /ruta/  [--muestras 96] [--escala 100]"""
import bpy, sys, os, math, random
from mathutils import Vector
AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
sys.path.insert(0, os.path.join(RAIZ, "tools", "blender"))
from personaje import Persona, mat, caja, esfera, capsula, hex2lin

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
opt = {args[i].lstrip("-"): args[i + 1] for i in range(0, len(args) - 1, 2)}
CUADRO = int(opt.get("cuadro", 1)); SALIDA = opt.get("salida", "/tmp/render"); MUESTRAS = int(opt.get("muestras", 96)); ESCALA = int(opt.get("escala", 100))
random.seed(7)

# ---------- escena limpia ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
FUENTE = bpy.data.fonts.load(os.path.join(RAIZ, "tools", "fuentes", "Montserrat-Black.ttf"))
FUENTE2 = bpy.data.fonts.load(os.path.join(RAIZ, "tools", "fuentes", "Montserrat-Bold.ttf"))
sc.render.engine = opt.get("motor", "CYCLES"); sc.cycles.device = "CPU"; sc.cycles.samples = MUESTRAS; sc.cycles.use_adaptive_sampling = True
sc.cycles.use_denoising = True; sc.cycles.denoiser = "OPENIMAGEDENOISE"
sc.cycles.max_bounces = 6; sc.cycles.diffuse_bounces = 3; sc.cycles.glossy_bounces = 2; sc.cycles.transmission_bounces = 4; sc.cycles.transparent_max_bounces = 4
sc.render.resolution_x = 1080; sc.render.resolution_y = 1920; sc.render.resolution_percentage = ESCALA
sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"; sc.view_settings.exposure = 0.0
sc.render.image_settings.file_format = "PNG"; sc.render.film_transparent = False
w = bpy.data.worlds.new("mundo"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (*hex2lin("#1B2340"), 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.35

def plano(nombre, tam, m, loc, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.name = nombre
    o.scale = (*tam, 1); o.data.materials.append(m); return o

def mat_nodos(nombre, armar):
    m = bpy.data.materials.new(nombre); m.use_nodes = True; nt = m.node_tree; armar(nt, nt.nodes["Principled BSDF"]); return m

def rayas(nt, b, a="#C8202E", c="#F4EFE6", n=8, coord="Object", radial=False):
    tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs[coord], sep.inputs[0])
    if radial:
        at = nt.nodes.new("ShaderNodeMath"); at.operation = "ARCTAN2"; nt.links.new(sep.outputs[1], at.inputs[0]); nt.links.new(sep.outputs[0], at.inputs[1]); src = at.outputs[0]; k = n / (2 * math.pi)
    else:
        src = sep.outputs[0]; k = n
    mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"; mul.inputs[1].default_value = k; nt.links.new(src, mul.inputs[0])
    fr = nt.nodes.new("ShaderNodeMath"); fr.operation = "FRACT"; nt.links.new(mul.outputs[0], fr.inputs[0])
    st = nt.nodes.new("ShaderNodeMath"); st.operation = "GREATER_THAN"; st.inputs[1].default_value = 0.5; nt.links.new(fr.outputs[0], st.inputs[0])
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.inputs[6].default_value = (*hex2lin(a), 1); mix.inputs[7].default_value = (*hex2lin(c), 1)
    nt.links.new(st.outputs[0], mix.inputs[0]); nt.links.new(mix.outputs[2], b.inputs["Base Color"])

# ---------- piso, paredes ----------
def alfombra(nt, b):
    br = nt.nodes.new("ShaderNodeTexBrick"); br.inputs["Scale"].default_value = 6; br.inputs["Color1"].default_value = (*hex2lin("#5B1A28"), 1)
    br.inputs["Color2"].default_value = (*hex2lin("#4E1622"), 1); br.inputs["Mortar"].default_value = (*hex2lin("#7A3040"), 1); br.inputs["Mortar Size"].default_value = 0.01
    nt.links.new(br.outputs[0], b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.95; b.inputs["Sheen Weight"].default_value = 0.5
plano("piso", (14, 12), mat_nodos("alfombra", alfombra), (0, -2, 0))
pared_m = mat("pared", "#2D3658", rough=0.9)
caja("pared", (14, 0.3, 5), pared_m, loc=(0, 1.6, 2.5), bisel=0.02, sub=0)
caja("zocalo", (14, 0.34, 0.16), mat("zocalo", "#14182A", rough=0.6), loc=(0, 1.58, 0.08), bisel=0.2, sub=0)
caja("franja", (13, 0.04, 0.05), mat("led", "#FFD9A0", emis="#FFB868", fuerza=12), loc=(0, 1.43, 3.55), bisel=0.3, sub=0)

# ---------- candy ----------
mostr = mat("mostrador", "#2B1A1E", rough=0.55)
caja("mostrador", (4.6, 0.85, 1.02), mostr, loc=(0, -0.1, 0.51), bisel=0.04, sub=1)
caja("tapa", (4.8, 0.95, 0.07), mat("marmol", "#EFE9DF", rough=0.22, coat=0.4), loc=(0, -0.1, 1.06), bisel=0.3, sub=1)
pan = mat_nodos("panel-rayas", lambda nt, b: rayas(nt, b, n=1.6))
caja("panel", (4.4, 0.02, 0.5), pan, loc=(0, -0.53, 0.47), bisel=0.2, sub=0)
caja("luzfrente", (4.4, 0.02, 0.05), mat("ledfrente", "#FFE2B0", emis="#FFB060", fuerza=18), loc=(0, -0.535, 0.85), bisel=0.3, sub=0)
caja("muebleatras", (4.8, 0.6, 1.0), mat("mueble", "#3A2228", rough=0.6), loc=(0, 1.15, 0.5), bisel=0.05, sub=1)

# carteles de menú con texto real
def cartel(nombre, titulo, sub, x, fondo):
    caja(nombre, (1.5, 0.06, 0.55), mat("marco-" + nombre, "#0A0A0C", rough=0.4), loc=(x, 1.38, 2.75), bisel=0.2, sub=0)
    caja(nombre + "f", (1.44, 0.01, 0.49), mat("fondo-" + nombre, fondo, emis=fondo, fuerza=1.6), loc=(x, 1.345, 2.75), bisel=0.1, sub=0)
    for t, z, f, tam in ((titulo, 2.78, FUENTE, 0.2), (sub, 2.6, FUENTE2, 0.075)):
        cu = bpy.data.curves.new(nombre + t, "FONT"); cu.body = t; cu.font = f; cu.size = tam; cu.align_x = "CENTER"; cu.extrude = 0.004
        o = bpy.data.objects.new(nombre + t, cu); sc.collection.objects.link(o); o.location = (x, 1.335, z); o.rotation_euler = (math.pi / 2, 0, 0)
        o.data.materials.append(mat("letra", "#FFF4E2", emis="#FFF4E2", fuerza=4))
cartel("menu1", "POCHOCLO", "BALDE · MEDIANO · CHICO", -1.6, "#14161C")
cartel("menu2", "COMBOS", "BALDE + GASEOSA", 0.0, "#B81C2A")
cartel("menu3", "BEBIDAS", "GRANDE · MEDIANA", 1.6, "#14161C")

# pochoclo: florcita de esferas
poch_m = mat("pochoclo", "#F6E7C1", rough=0.8, sss=0.15)
def pochoclo(nombre, loc, r=0.03):
    import bmesh
    me = bpy.data.meshes.new(nombre); bm = bmesh.new()
    for k in range(6):
        g = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=r * (0.5 + random.random() * 0.35))
        off = Vector(((random.random() - 0.5) * r * 1.3, (random.random() - 0.5) * r * 1.3, (random.random() - 0.5) * r))
        bmesh.ops.translate(bm, verts=g["verts"], vec=off)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(nombre, me); sc.collection.objects.link(o); o.data.materials.append(poch_m)
    for p in o.data.polygons: p.use_smooth = True
    o.location = loc; o.rotation_euler = (random.random() * 6, random.random() * 6, random.random() * 6); return o

def balde(nombre, loc, esc=1.0):
    bpy.ops.mesh.primitive_cone_add(vertices=48, radius1=0.15 * esc, radius2=0.21 * esc, depth=0.42 * esc, location=(loc[0], loc[1], loc[2] + 0.21 * esc), end_fill_type="NOTHING")
    o = bpy.context.object; o.name = nombre
    sol = o.modifiers.new("grosor", "SOLIDIFY"); sol.thickness = 0.006
    o.data.materials.append(mat_nodos("balde", lambda nt, b: rayas(nt, b, n=16, radial=True)))
    for p in o.data.polygons: p.use_smooth = True
    for k in range(34):
        a = random.random() * 6.28; r = random.random() * 0.17 * esc
        pochoclo(f"{nombre}.p{k}", (loc[0] + math.cos(a) * r, loc[1] + math.sin(a) * r, loc[2] + 0.41 * esc + (0.17 * esc - r) * 0.5 + random.random() * 0.04), 0.03 * esc)
    return o

def vaso(nombre, loc, esc=1.0):
    bpy.ops.mesh.primitive_cone_add(vertices=40, radius1=0.085 * esc, radius2=0.11 * esc, depth=0.36 * esc, location=(loc[0], loc[1], loc[2] + 0.18 * esc))
    o = bpy.context.object; o.name = nombre; o.data.materials.append(mat_nodos("vaso", lambda nt, b: rayas(nt, b, n=12, radial=True)))
    for p in o.data.polygons: p.use_smooth = True
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.115 * esc, depth=0.025 * esc, location=(loc[0], loc[1], loc[2] + 0.37 * esc)); bpy.context.object.data.materials.append(mat("tapa", "#F2F2F2", rough=0.35))
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.008 * esc, depth=0.3 * esc, location=(loc[0] + 0.03 * esc, loc[1], loc[2] + 0.5 * esc), rotation=(0, 0.15, 0)); bpy.context.object.data.materials.append(mat("sorbete", "#1E5BD6", rough=0.3))

balde("combo", (0.55, -0.2, 1.095), 1.25); vaso("vasocombo", (1.05, -0.17, 1.095), 1.15)
balde("balde2", (-1.9, -0.25, 1.095), 0.9); balde("balde3", (1.95, -0.2, 1.095), 0.9)
for i in range(5): vaso(f"vaso{i}", (0.55 + i * 0.27, 1.15, 1.0), 0.9)

# máquina de pochoclo
caja("maqpie", (1.0, 0.6, 0.14), mat("rojo", "#C8202E", rough=0.4, coat=0.5), loc=(-1.4, 1.1, 1.07), bisel=0.3, sub=1)
caja("maqtecho", (1.06, 0.66, 0.22), mat("rojo", "#C8202E", rough=0.4, coat=0.5), loc=(-1.4, 1.1, 2.12), bisel=0.3, sub=1)
vid = mat("vidrio", "#FFFFFF", rough=0.03); vid.node_tree.nodes["Principled BSDF"].inputs["Transmission Weight"].default_value = 1.0; vid.node_tree.nodes["Principled BSDF"].inputs["IOR"].default_value = 1.45
caja("maqvidrio", (0.96, 0.56, 0.86), vid, loc=(-1.4, 1.1, 1.58), bisel=0.02, sub=0)
for k in range(140):
    pochoclo(f"maq.p{k}", (-1.4 + (random.random() - 0.5) * 0.85, 1.1 + (random.random() - 0.5) * 0.45, 1.16 + random.random() * 0.32 * (1 - abs(random.random() - 0.5))), 0.03)
luz = bpy.data.lights.new("luzmaq", "POINT"); luz.energy = 25; luz.color = hex2lin("#FFC27A"); luz.shadow_soft_size = 0.2
lo = bpy.data.objects.new("luzmaq", luz); sc.collection.objects.link(lo); lo.location = (-1.4, 1.1, 1.9)

# lámparas colgantes
for i, x in enumerate((-1.6, 0.0, 1.6)):
    bpy.ops.mesh.primitive_cone_add(vertices=40, radius1=0.3, radius2=0.04, depth=0.3, location=(x, -0.15, 3.25), end_fill_type="NOTHING")
    o = bpy.context.object; o.modifiers.new("g", "SOLIDIFY").thickness = 0.01; o.data.materials.append(mat("pantalla", "#151515", rough=0.35, metal=0.7))
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.006, depth=1.4, location=(x, -0.15, 4.1)); bpy.context.object.data.materials.append(mat("cable", "#111111"))
    esfera(f"foco{i}", 0.08, mat("foco", "#FFF1D6", emis="#FFD39A", fuerza=30), loc=(x, -0.15, 3.12), sub=1)
    l = bpy.data.lights.new(f"lampara{i}", "SPOT"); l.energy = 160; l.color = hex2lin("#FFC98A"); l.spot_size = 1.6; l.spot_blend = 0.6; l.shadow_soft_size = 0.15
    lo = bpy.data.objects.new(f"lampara{i}", l); sc.collection.objects.link(lo); lo.location = (x, -0.15, 3.08)

# ---------- personas ----------
cajera = Persona("cajera", dict(camisa="#F2F0EC", pantalon="#26282E", zapatos="#1A1A1C", pelo="#3A2418", delantal="#1E2024", cuello="#FFFFFF"), alto=0.98)
cajera.poner((0.4, 0.55, 0), 0); cajera.parado(1.0)
cajera.rotar("hombroD", -0.95, 0, -0.1); cajera.rotar("codoD", -0.75)   # le alcanza el balde
cajera.rotar("hombroI", -0.5, 0, 0.1); cajera.rotar("codoI", -0.9)
c1 = Persona("cliente1", dict(camisa="#E0A21C", pantalon="#1F3A66", zapatos="#6B3A1E", pelo="#5A3A22", campera=True), alto=0.97, pelo_forma="largo")
c1.poner((0.75, -1.05, 0), math.pi + 0.1); c1.parado(0.3); c1.rotar("hombroD", -0.6, 0, -0.05); c1.rotar("codoD", -0.9)
c2 = Persona("cliente2", dict(camisa="#9E1F2E", pantalon="#2A2C34", zapatos="#1F2E4F", pelo="#2A1A12"), alto=1.03, pelo_forma="rulos")
c2.poner((-0.35, -1.75, 0), math.pi - 0.25); c2.caminar(0.3, 0.6)
c3 = Persona("cliente3", dict(camisa="#2F5D8A", pantalon="#3B3F47", zapatos="#EDEDED", pelo="#B07A4A", manga_corta=True), alto=1.0)
c3.poner((1.85, -2.2, 0), math.pi + 0.35); c3.parado(2.0)

# ---------- luces de estudio (suaves, de área) ----------
def area(nombre, loc, rot, tam, energia, color):
    l = bpy.data.lights.new(nombre, "AREA"); l.shape = "RECTANGLE"; l.size = tam[0]; l.size_y = tam[1]; l.energy = energia; l.color = hex2lin(color)
    o = bpy.data.objects.new(nombre, l); sc.collection.objects.link(o); o.location = loc; o.rotation_euler = rot; return o
area("principal", (-3.5, -5.5, 6.5), (math.radians(50), 0, math.radians(-30)), (5, 5), 1500, "#FFE4C4")
area("relleno", (5, -4, 3), (math.radians(70), 0, math.radians(50)), (4, 3), 350, "#AFC6FF")
area("contra", (0, 3.5, 5), (math.radians(-35), 0, 0), (6, 2), 400, "#FFD2A0")

# ---------- cámara ----------
cam_d = bpy.data.cameras.new("cam"); cam_d.lens = 38; cam_d.sensor_fit = "VERTICAL"; cam_d.sensor_height = 36
cam_d.dof.use_dof = True; cam_d.dof.aperture_fstop = 2.2
cam = bpy.data.objects.new("cam", cam_d); sc.collection.objects.link(cam); sc.camera = cam
cam.location = (2.6, -4.6, 2.45)
foco = bpy.data.objects.new("foco_cam", None); sc.collection.objects.link(foco); foco.location = (0.5, -0.2, 1.35)
tr = cam.constraints.new("TRACK_TO"); tr.target = foco; tr.track_axis = "TRACK_NEGATIVE_Z"; tr.up_axis = "UP_Y"
cam_d.dof.focus_object = foco

sc.frame_set(CUADRO)
os.makedirs(SALIDA, exist_ok=True)
sc.render.filepath = os.path.join(SALIDA, f"cuadro-{CUADRO:04d}.png")
bpy.ops.render.render(write_still=True)
print("LISTO", sc.render.filepath)
