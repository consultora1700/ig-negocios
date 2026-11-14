"""Escenario del reel 03 (repartir para Mercado Libre): tres zonas con texturas reales y luz horneada aparte.
  Zona A (x≈0):    calle comercial (asfalto, vereda de baldosas, locales Kenney, jacarandás, hidrante, tachos)
  Zona B (x≈60):   centro de última milla por dentro (hormigón, racks de pallets, cintas transportadoras, portones)
  Zona C (x≈-60):  estación de servicio (playa de hormigón, techo con luces, isla con surtidores, cartel de precios)
blender -b -P set.py -- --salida DIR [--densidad 60] [--muestras 64] [--vista ruta.png --zona A|B|C]
Ejes Blender: X derecha, Y fondo, Z arriba; la cámara mira desde -Y. En Three: (x, y, z) → (x, z, -y)."""
import bpy, sys, os, math, random
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
sys.path.insert(0, os.path.join(RAIZ, "tools", "blender"))
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
opt = {args[i].lstrip("-"): args[i + 1] for i in range(0, len(args) - 1, 2)}
bpy.ops.wm.read_factory_settings(use_empty=True)
from personaje import mat, caja, esfera, capsula, hex2lin
from horno import fijo, texto, luz, mundo, mat_textura, uv_textura, hornear_luz
sc = bpy.context.scene; R = math.radians; random.seed(3)
A3 = os.path.join(RAIZ, "assets3d"); TX = os.path.join(A3, "texturas")
F_BLACK = bpy.data.fonts.load(os.path.join(RAIZ, "tools", "fuentes", "Montserrat-Black.ttf"))
F_BOLD = bpy.data.fonts.load(os.path.join(RAIZ, "tools", "fuentes", "Montserrat-Bold.ttf"))

def suelo(nombre, w, d, x, y, z, carpeta, tam, tinte=None):
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=max(2, int(w)), y_subdivisions=max(2, int(d)), size=1, location=(x, y, z))
    o = bpy.context.object; o.name = nombre; o.scale = (w, d, 1); bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(mat_textura(nombre, os.path.join(TX, carpeta), tinte=tinte)); uv_textura(o, tam); return fijo(o)

def bloque(nombre, tam, loc, m, uvtam=2.0, rot=(0, 0, 0), bisel=0.02):
    o = caja(nombre, tam, m, loc=loc, rot=rot, bisel=bisel, sub=0)
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="bisel")
    uv_textura(o, uvtam); return fijo(o)

def importar(ruta, loc, giro=0.0, esc=1.0):
    bpy.ops.object.select_all(action="DESELECT"); bpy.ops.import_scene.gltf(filepath=ruta)
    nuevos = list(bpy.context.selected_objects); raices = [o for o in nuevos if o.parent is None]
    for r in raices: r.location = loc; r.rotation_euler = (0, 0, giro); r.scale = (esc, esc, esc)
    bpy.context.view_layer.update()
    mallas = [o for o in nuevos if o.type == "MESH"]
    for o in mallas:   # aplicar la transformación para hornear cada malla en su lugar
        mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
        bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        o.name = os.path.splitext(os.path.basename(ruta))[0] + "_" + str(len([f for f in sc.objects]))
        fijo(o)
    for o in nuevos:
        if o.type != "MESH": bpy.data.objects.remove(o)
    return mallas

pintura = lambda n, c, r=0.6: mat(n, c, rough=r)

# ======================= ZONA A: calle comercial =======================
suelo("calle", 30, 6, 0, -4, 0.0, "Asphalt031", 4.0)
bloque("cordon", (30, 0.2, 0.15), (0, -0.95, 0.075), mat_textura("cordon", os.path.join(TX, "Concrete044C")), 1.0)
suelo("vereda", 30, 3.2, 0, 0.55, 0.15, "PavingStones138", 1.6)
for i in range(13):
    bloque(f"senda{i}", (1.4, 0.12, 0.01), (-12 + i * 2.2, -4.0, 0.006), pintura("pintura_calle", "#E9E4D6"), 1.0)
K = os.path.join(A3, "kenney", "city-commercial")
for i, (n, x) in enumerate((("building-a", -11.0), ("building-g", -5.4), ("building-c", 0.4), ("building-b", 6.0), ("building-e", 11.6))):
    importar(os.path.join(K, n + ".glb"), (x, 4.6, 0.15), 0.0, 6.2)
for x in (-3.2, 2.8, 8.6):   # jacarandás estilizados (copa violeta)
    fijo(capsula(f"tronco{x}", 0.11, 0.15, 2.6, mat("tronco", "#5E4A3A", rough=0.9), loc=(x, -0.35, 2.75)))
    for j in range(7):
        r = 0.55 + random.random() * 0.35
        fijo(esfera(f"copa{x}{j}", r, mat("copa_jacaranda" + str(j % 2), ("#8C6CC4", "#7357A8")[j % 2], rough=0.85),
                    loc=(x + random.uniform(-0.8, 0.8), -0.35 + random.uniform(-0.6, 0.6), 3.2 + random.uniform(-0.2, 0.7)), sub=1))
    bloque(f"cantero{x}", (0.9, 0.9, 0.05), (x, -0.35, 0.175), mat("tierra", "#4F3E30", rough=0.95))
for x in (-8.0, 5.2):
    fijo(capsula(f"farol{x}", 0.05, 0.065, 4.0, mat("farol", "#2A2E35", rough=0.4, metal=0.6), loc=(x, -0.75, 4.15)))
    bloque(f"farol_cabeza{x}", (0.6, 0.25, 0.12), (x + 0.22, -0.75, 4.15), mat("farol_luz", "#FFF1D6", emis="#FFE2B0", fuerza=1.5))

# ======================= ZONA B: centro de última milla =======================
BX = 60.0
suelo("nave_piso", 26, 18, BX, 4, 0.0, "Concrete044C", 3.0, tinte="#FFFFFF")
paredes = mat_textura("nave_pared", os.path.join(TX, "Plaster003"), tinte="#DADDE2")
bloque("nave_fondo", (26, 0.3, 7.5), (BX, 13.15, 3.75), paredes, 3.0)
bloque("nave_izq", (0.3, 18, 7.5), (BX - 13.15, 4, 3.75), paredes, 3.0)
bloque("nave_zocalo", (26, 0.32, 1.0), (BX, 13.1, 0.5), pintura("zocalo_nave", "#3E4652"), 1.0)
for i, x in enumerate((-8, 0, 8)):   # portones de carga con su marco amarillo
    bloque(f"porton{i}", (4.2, 0.08, 4.4), (BX + x, 12.98, 2.2), mat_textura("porton", os.path.join(TX, "Metal032"), tinte="#8C96A3"), 1.0)
    bloque(f"porton_marco{i}", (4.6, 0.12, 0.25), (BX + x, 12.95, 4.5), pintura("amarillo", "#E8B11C", 0.5), 1.0)
    for s in (-1, 1): bloque(f"porton_lado{i}{s}", (0.2, 0.12, 4.5), (BX + x + s * 2.2, 12.95, 2.25), pintura("amarillo", "#E8B11C", 0.5), 1.0)
for k in range(9):   # líneas de seguridad en el piso
    bloque(f"linea_piso{k}", (0.12, 16, 0.01), (BX - 11 + k * 2.75, 4, 0.006), pintura("linea_amarilla", "#E8B11C", 0.6), 1.0)
azul, naranja, madera = pintura("rack_azul", "#2B4C8C", 0.45), pintura("rack_naranja", "#E2731E", 0.45), mat_textura("pallet", os.path.join(TX, "Wood066"))
for f, y in enumerate((5.0, 9.0)):   # dos filas de racks de pallets (las cajas van en tiempo real)
    for c in range(5):
        x0 = BX - 11 + c * 2.9
        for s in (0, 2.7):
            bloque(f"rack_poste{f}{c}{s}", (0.09, 1.1, 5.2), (x0 + s, y, 2.6), azul, 1.0)
        for nivel in (0.15, 1.75, 3.35, 4.95):
            bloque(f"rack_viga{f}{c}{nivel}", (2.8, 0.1, 0.14), (x0 + 1.35, y - 0.52, nivel), naranja, 1.0)
            bloque(f"rack_vigat{f}{c}{nivel}", (2.8, 0.1, 0.14), (x0 + 1.35, y + 0.52, nivel), naranja, 1.0)
            if nivel < 4.9:
                for p in (0.7, 2.0): bloque(f"pallet{f}{c}{nivel}{p}", (1.1, 1.0, 0.13), (x0 + p, y, nivel + 0.14), madera, 1.2)
gris = pintura("cinta_gris", "#5C636E", 0.4)
for i, (x, y, L) in enumerate(((BX + 4.0, 1.5, 16.0), (BX - 2.0, -2.5, 12.0))):   # cintas transportadoras (eje X)
    bloque(f"cinta{i}", (L, 0.9, 0.12), (x, y, 0.92), mat("banda", "#23262B", rough=0.7), 1.0)
    for s in (-1, 1): bloque(f"cinta_borde{i}{s}", (L, 0.06, 0.18), (x, y + s * 0.48, 0.98), gris, 1.0)
    for k in range(int(L / 1.6) + 1):
        for s in (-1, 1): bloque(f"cinta_pata{i}{k}{s}", (0.07, 0.07, 0.86), (x - L / 2 + k * 1.6, y + s * 0.4, 0.43), gris, 1.0)
texto("nave_cartel", "CENTRO DE ÚLTIMA MILLA", F_BLACK, 0.55, (BX - 4.0, 12.98, 6.3), (R(90), 0, 0), "#2A2E35", 1.0, emisivo=False)

# ======================= ZONA C: estación de servicio =======================
CX = -60.0
suelo("playa", 22, 16, CX, 2, 0.0, "Concrete044C", 3.0, tinte="#FFFFFF")
suelo("calle_estacion", 22, 4, CX, -8, 0.0, "Asphalt031", 4.0)
for s in (-1, 1): bloque(f"columna{s}", (0.45, 0.45, 5.2), (CX + s * 4.5, 2.0, 2.6), pintura("columna", "#D9DCE1", 0.5), 1.0)
bloque("techo", (13, 8, 0.6), (CX, 2.0, 5.5), pintura("techo_est", "#F2F2F0", 0.6), 2.0)
bloque("techo_banda", (13.05, 8.05, 0.25), (CX, 2.0, 5.15), pintura("banda_azul", "#1F4E9C", 0.4), 2.0)
for k in range(4): bloque(f"techo_luz{k}", (1.8, 0.4, 0.04), (CX - 4.5 + k * 3.0, 2.0, 5.02), mat("luz_techo", "#FFFFFF", emis="#FFFFFF", fuerza=6), 1.0)
bloque("isla", (6.4, 1.3, 0.22), (CX, 2.0, 0.11), pintura("isla", "#8E8B84", 0.8), 1.0)
for i, x in enumerate((-1.6, 1.6)):
    bloque(f"surtidor{i}", (0.95, 0.55, 1.9), (CX + x, 2.0, 1.17), pintura("surtidor", "#ECEEF1", 0.45), 1.0)
    bloque(f"surtidor_franja{i}", (0.97, 0.57, 0.28), (CX + x, 2.0, 1.75), pintura("banda_azul", "#1F4E9C", 0.4), 1.0)
    bloque(f"surtidor_pantalla{i}", (0.55, 0.02, 0.32), (CX + x, 1.72, 1.35), mat("pantalla_surt", "#0E1A12", emis="#3A6B4A", fuerza=0.6), 1.0)
    bloque(f"surtidor_base{i}", (1.05, 0.65, 0.12), (CX + x, 2.0, 0.28), pintura("isla", "#8E8B84", 0.8), 1.0)
bloque("cartel_precios", (2.4, 0.3, 3.0), (CX + 8.5, -4.0, 3.5), pintura("cartel_precio", "#1F4E9C", 0.5), 1.0)
fijo(capsula("cartel_pie", 0.12, 0.12, 2.1, pintura("columna", "#D9DCE1", 0.5), loc=(CX + 8.5, -4.0, 2.1)))
texto("precio_titulo", "SÚPER", F_BLACK, 0.42, (CX + 8.5, -4.16, 4.3), (R(90), 0, 0), "#FFFFFF", 2.0)
texto("precio_valor", "$2.103", F_BLACK, 0.62, (CX + 8.5, -4.16, 3.4), (R(90), 0, 0), "#FFD24A", 2.5)
texto("precio_litro", "POR LITRO", F_BOLD, 0.22, (CX + 8.5, -4.16, 2.95), (R(90), 0, 0), "#FFFFFF", 1.5)

# ---------------- luces ----------------
mi = mundo("#B5C9E8", 0.85)
luz("sol", "SUN", (-6, -8, 12), 3.0, "#FFE6C8", (R(50), 0, R(-32)), angle=R(5))
for x in (-6, 0, 6):
    luz(f"nave_luz{x}", "AREA", (BX + x, 4, 6.8), 320, "#F3F6FF", (0, 0, 0), size=4.0)
luz("techo_estacion", "AREA", (CX, 2.0, 4.95), 500, "#FFFFFF", (0, 0, 0), size=8.0)

# ---------------- agrupar piezas repetidas (menos objetos para hornear y mejor resolución de luz) ----------------
import horno
GRUPOS = ("rack_poste", "rack_viga", "pallet", "cinta_pata", "cinta_borde", "linea_piso", "senda", "porton", "copa", "tronco", "cantero", "farol", "columna", "techo_luz", "surtidor")
for g in GRUPOS:
    obs = [o for o in horno.FIJOS if o.name.startswith(g) and o.type == "MESH"]
    if len(obs) < 2: continue
    bpy.ops.object.select_all(action="DESELECT")
    for o in obs:
        o.select_set(True)
        if o.modifiers: bpy.context.view_layer.objects.active = o; bpy.ops.object.convert(target="MESH")
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]; bpy.ops.object.join(); obs[0].name = g + "_grupo"
    vivos = set(sc.objects[:]); horno.FIJOS[:] = [o for o in horno.FIJOS if o in vivos]
print("objetos a hornear:", len(horno.FIJOS))

if opt.get("vista"):
    zx = {"A": 0.0, "B": BX, "C": CX}[opt.get("zona", "A")]
    cd = bpy.data.cameras.new("c"); cd.lens = 28; cd.sensor_fit = "VERTICAL"; cd.sensor_height = 36
    cam = bpy.data.objects.new("c", cd); sc.collection.objects.link(cam); sc.camera = cam
    cam.location = (zx + 2, -16, 11); cam.rotation_euler = (R(58), 0, R(6))
    sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.cycles.use_denoising = True
    sc.render.resolution_x = 1080; sc.render.resolution_y = 1920; sc.render.resolution_percentage = 35
    sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
    sc.render.filepath = opt["vista"]; bpy.ops.render.render(write_still=True); print("LISTO"); sys.exit(0)
hornear_luz(opt.get("salida", "/tmp/set03"), densidad=float(opt.get("densidad", 60)), muestras=int(opt.get("muestras", 64)), mundo_info=mi)
print("LISTO")
