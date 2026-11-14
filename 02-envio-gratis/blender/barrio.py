"""Escenario del reel 02: una cuadra de barrio en maqueta (casa chorizo con tanque, garage del vendedor, centro de
distribución, vereda de baldosas, calle). Arma, hornea la luz y exporta.
blender -b -P barrio.py -- --salida DIR [--densidad 110] [--muestras 48]
Ejes Blender: X derecha, Y hacia el fondo, Z arriba; la cámara mira desde -Y."""
import bpy, sys, os, math, random
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
sys.path.insert(0, os.path.join(RAIZ, "tools", "blender"))
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
opt = {args[i].lstrip("-"): args[i + 1] for i in range(0, len(args) - 1, 2)}
bpy.ops.wm.read_factory_settings(use_empty=True)
from personaje import mat, caja, esfera, capsula, hex2lin
from horno import fijo, mat_nodos, texto, luz, mundo, hornear
sc = bpy.context.scene
F_BLACK = bpy.data.fonts.load(os.path.join(RAIZ, "tools", "fuentes", "Montserrat-Black.ttf"))
F_BOLD = bpy.data.fonts.load(os.path.join(RAIZ, "tools", "fuentes", "Montserrat-Bold.ttf"))
random.seed(11)
R = math.radians

def baldosas(nt, b, c1="#B9B3A8", c2="#A9A398", junta="#8E887E", escala=5.0):
    br = nt.nodes.new("ShaderNodeTexBrick"); br.inputs["Scale"].default_value = escala; br.offset = 0.0
    br.inputs["Color1"].default_value = (*hex2lin(c1), 1); br.inputs["Color2"].default_value = (*hex2lin(c2), 1)
    br.inputs["Mortar"].default_value = (*hex2lin(junta), 1); br.inputs["Mortar Size"].default_value = 0.015
    br.inputs["Brick Width"].default_value = 0.5; br.inputs["Row Height"].default_value = 0.5
    tc = nt.nodes.new("ShaderNodeTexCoord"); nt.links.new(tc.outputs["Object"], br.inputs["Vector"])
    nt.links.new(br.outputs[0], b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.9
def chapa(nt, b, color="#B9BEC4"):
    w = nt.nodes.new("ShaderNodeTexWave"); w.inputs["Scale"].default_value = 18; w.inputs["Distortion"].default_value = 0
    tc = nt.nodes.new("ShaderNodeTexCoord"); nt.links.new(tc.outputs["Object"], w.inputs["Vector"])
    bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.35; nt.links.new(w.outputs["Fac"], bp.inputs["Height"]); nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Base Color"].default_value = (*hex2lin(color), 1); b.inputs["Roughness"].default_value = 0.55; b.inputs["Metallic"].default_value = 0.3
def asfalto(nt, b):
    n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = 60
    mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs[3].default_value = 0.85; mr.inputs[4].default_value = 1.0; nt.links.new(n.outputs["Fac"], mr.inputs[0])
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.inputs[6].default_value = (*hex2lin("#3A3D44"), 1); mix.inputs[7].default_value = (*hex2lin("#4A4D55"), 1)
    nt.links.new(n.outputs["Fac"], mix.inputs[0]); nt.links.new(mix.outputs[2], b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.92

def plano(nombre, w, d, m, loc):
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=max(2, int(w * 2)), y_subdivisions=max(2, int(d * 2)), size=1, location=loc)
    o = bpy.context.object; o.name = nombre; o.scale = (w, d, 1); bpy.ops.object.transform_apply(scale=True); o.data.materials.append(m); return fijo(o)

# ---------------- suelo ----------------
fijo(caja("base", (18.6, 13.6, 0.5), mat("base", "#1E2026", rough=0.9), loc=(0, 1.8, -0.26), bisel=0.04, sub=0))
plano("calle", 18, 3.5, mat_nodos("asfalto", asfalto), (0, -2.75, 0.002))
for i in range(9):
    fijo(caja(f"linea{i}", (1.1, 0.12, 0.01), mat("pintura", "#E9E4D6", rough=0.6), loc=(-8 + i * 2, -2.75, 0.008), bisel=0.2, sub=0))
fijo(caja("cordon", (18, 0.18, 0.14), mat("cordon", "#8F8C86", rough=0.85), loc=(0, -0.95, 0.07), bisel=0.25, sub=0))
v = plano("vereda", 18, 2.3, mat_nodos("baldosa", baldosas), (0, 0.2, 0.14))
# ---------------- casa chorizo ----------------
cx = -6.0
fijo(caja("casa", (5.2, 4.4, 3.6), mat("casa", "#E6C3A0", rough=0.88), loc=(cx, 3.55, 1.8 + 0.14), bisel=0.01, sub=0))
fijo(caja("casa_zocalo", (5.24, 0.08, 0.5), mat("zocalo_casa", "#8C8378", rough=0.8), loc=(cx, 1.33, 0.39), bisel=0.2, sub=0))
fijo(caja("casa_cornisa", (5.4, 0.3, 0.22), mat("cornisa_casa", "#F2DCC2", rough=0.8), loc=(cx, 1.36, 3.62), bisel=0.2, sub=0))
fijo(caja("casa_parapeto", (5.3, 0.15, 0.55), mat("casa", "#E6C3A0", rough=0.88), loc=(cx, 1.42, 4.0), bisel=0.1, sub=0))
fijo(caja("puerta", (1.05, 0.1, 2.25), mat("madera", "#6B3E22", rough=0.55, coat=0.3), loc=(cx + 1.1, 1.32, 1.27), bisel=0.08, sub=0))
for k in range(2):
    fijo(caja(f"puerta_panel{k}", (0.8, 0.03, 0.85), mat("madera2", "#5A321A", rough=0.5), loc=(cx + 1.1, 1.26, 0.75 + k * 1.05), bisel=0.2, sub=0))
fijo(caja("puerta_marco", (1.3, 0.12, 2.42), mat("marco_puerta", "#F2DCC2", rough=0.8), loc=(cx + 1.1, 1.36, 1.35), bisel=0.05, sub=0))
fijo(esfera("picaporte", 0.035, mat("bronce", "#B88A3A", rough=0.3, metal=0.9), loc=(cx + 1.48, 1.24, 1.25), sub=1))
fijo(caja("escalon", (1.5, 0.35, 0.12), mat("escalon", "#9C968C", rough=0.85), loc=(cx + 1.1, 1.15, 0.2), bisel=0.2, sub=0))
fijo(caja("timbre", (0.12, 0.04, 0.2), mat("timbre", "#2A2C30", rough=0.4), loc=(cx + 1.95, 1.28, 1.45), bisel=0.3, sub=0))
fijo(caja("numero", (0.42, 0.03, 0.16), mat("chapa_num", "#1F3A66", rough=0.4), loc=(cx + 1.1, 1.29, 2.75), bisel=0.3, sub=0))
texto("numero_txt", "1250", F_BOLD, 0.11, (cx + 1.1, 1.27, 2.715), (R(90), 0, 0), "#FFFFFF", 1.0, emisivo=False)
fijo(caja("ventana", (1.4, 0.08, 1.5), mat("vidrio_casa", "#2C3A4A", rough=0.15, metal=0.2), loc=(cx - 1.2, 1.34, 1.85), bisel=0.05, sub=0))
fijo(caja("ventana_marco", (1.6, 0.1, 1.7), mat("marco_puerta", "#F2DCC2", rough=0.8), loc=(cx - 1.2, 1.36, 1.85), bisel=0.05, sub=0))
for k in range(7):
    fijo(caja(f"reja{k}", (0.03, 0.03, 1.55), mat("reja", "#1C1C1E", rough=0.4, metal=0.6), loc=(cx - 1.8 + k * 0.2, 1.24, 1.85), bisel=0.3, sub=0))
fijo(caja("reja_h", (1.5, 0.03, 0.03), mat("reja", "#1C1C1E", rough=0.4, metal=0.6), loc=(cx - 1.2, 1.24, 2.5), bisel=0.3, sub=0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.45, depth=0.9, location=(cx - 1.5, 4.0, 4.25)); o = bpy.context.object; o.name = "tanque"; o.data.materials.append(mat("tanque", "#B9BCC2", rough=0.4, metal=0.5)); fijo(o)
bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.47, radius2=0.1, depth=0.25, location=(cx - 1.5, 4.0, 4.82)); o = bpy.context.object; o.name = "tanque_tapa"; o.data.materials.append(mat("tanque", "#B9BCC2", rough=0.4, metal=0.5)); fijo(o)
fijo(caja("tanque_base", (1.1, 1.1, 0.35), mat("ladrillo", "#9A5B43", rough=0.9), loc=(cx - 1.5, 4.0, 3.9), bisel=0.05, sub=0))
fijo(caja("maceta", (0.45, 0.45, 0.45), mat("maceta", "#B0603E", rough=0.8), loc=(cx - 0.05, 1.05, 0.37), bisel=0.2, sub=0))
fijo(esfera("planta", 0.38, mat("planta", "#3E7A45", rough=0.8), loc=(cx - 0.05, 1.05, 0.85), sub=1))
# ---------------- garage del vendedor (abierto, se ve adentro) ----------------
gx = -0.6
pared_g = mat("garage", "#C9D6CF", rough=0.88)
fijo(caja("garage_izq", (0.3, 4.4, 3.4), pared_g, loc=(gx - 2.25, 3.55, 1.84), bisel=0.01, sub=0))
fijo(caja("garage_der", (0.3, 4.4, 3.4), pared_g, loc=(gx + 2.25, 3.55, 1.84), bisel=0.01, sub=0))
fijo(caja("garage_fondo", (4.8, 0.3, 3.4), mat("garage_int", "#E8E2D6", rough=0.9), loc=(gx, 5.6, 1.84), bisel=0.01, sub=0))
fijo(caja("garage_dintel", (4.8, 0.3, 0.8), pared_g, loc=(gx, 1.5, 3.14), bisel=0.02, sub=0))
fijo(caja("garage_techo", (4.8, 4.4, 0.25), pared_g, loc=(gx, 3.55, 3.66), bisel=0.02, sub=0))
fijo(caja("persiana", (4.2, 0.12, 0.6), mat_nodos("persiana", lambda nt, b: chapa(nt, b, "#9AA3A8")), loc=(gx, 1.55, 2.5), bisel=0.1, sub=0))
fijo(caja("garage_piso", (4.2, 4.0, 0.04), mat("cemento", "#A8A49C", rough=0.9), loc=(gx, 3.6, 0.16), bisel=0.1, sub=0))
carton = mat("carton", "#C08E5A", rough=0.85); cinta = mat("cinta", "#D9C7A0", rough=0.4)
for k in range(3):   # estantería con cajas
    fijo(caja(f"estante{k}", (2.6, 0.55, 0.05), mat("metal", "#5C6168", rough=0.4, metal=0.7), loc=(gx + 0.6, 5.1, 0.6 + k * 0.85), bisel=0.2, sub=0))
    for j in range(4):
        tw, th = 0.4 + random.random() * 0.15, 0.3 + random.random() * 0.25
        fijo(caja(f"caja_est{k}{j}", (tw, 0.42, th), carton, loc=(gx - 0.45 + j * 0.62, 5.1, 0.63 + k * 0.85 + th / 2), bisel=0.08, sub=0))
for x in (-0.65, 1.85):
    fijo(caja(f"estante_pata{x}", (0.05, 0.55, 2.4), mat("metal", "#5C6168", rough=0.4, metal=0.7), loc=(gx + x, 5.1, 1.36), bisel=0.2, sub=0))
fijo(caja("mesa", (1.8, 0.8, 0.06), mat("mesa", "#D8CBB4", rough=0.6), loc=(gx - 0.6, 3.0, 0.92), bisel=0.2, sub=0))
for x, y in ((-1.4, 2.7), (0.2, 2.7), (-1.4, 3.3), (0.2, 3.3)):
    fijo(caja(f"mesa_pata{x}{y}", (0.05, 0.05, 0.75), mat("metal", "#5C6168", rough=0.4, metal=0.7), loc=(gx + x, y, 0.53), bisel=0.2, sub=0))
for k, (x, s) in enumerate(((-1.1, 0.42), (-0.55, 0.32))):
    fijo(caja(f"caja_mesa{k}", (s, s * 0.8, s * 0.7), carton, loc=(gx + x, 3.0, 0.95 + s * 0.35), bisel=0.08, sub=0))
    fijo(caja(f"cinta_mesa{k}", (s + 0.005, 0.06, s * 0.7 + 0.005), cinta, loc=(gx + x, 3.0, 0.95 + s * 0.35), bisel=0.1, sub=0))
for k in range(5):
    s = 0.35 + random.random() * 0.2
    fijo(caja(f"caja_piso{k}", (s, s * 0.85, s * 0.75), carton, loc=(gx + 1.2 + (k % 3) * 0.45, 2.6 + (k // 3) * 0.5, 0.18 + s * 0.375 + (0.0 if k < 3 else 0.0)), rot=(0, 0, R(random.uniform(-8, 8))), bisel=0.08, sub=0))
# ---------------- centro de distribución ----------------
dx = 5.6
fijo(caja("deposito", (6.4, 4.6, 5.0), mat_nodos("chapa_dep", lambda nt, b: chapa(nt, b, "#C4C9CF")), loc=(dx, 3.65, 2.64), bisel=0.005, sub=0))
fijo(caja("deposito_borde", (6.5, 4.7, 0.25), mat("borde_dep", "#2F3540", rough=0.6), loc=(dx, 3.65, 5.2), bisel=0.1, sub=0))
fijo(caja("anden", (6.4, 0.9, 0.7), mat("hormigon", "#8E8B84", rough=0.9), loc=(dx, 1.2, 0.35 + 0.14), bisel=0.05, sub=0))
for k, x in enumerate((-1.6, 1.6)):
    fijo(caja(f"porton{k}", (2.2, 0.06, 2.6), mat_nodos("porton", lambda nt, b: chapa(nt, b, "#3E4652")), loc=(dx + x, 1.33, 1.95 + (1.5 if k == 1 else 0)), bisel=0.05, sub=0))
fijo(caja("porton_hueco", (2.2, 0.04, 2.6), mat("hueco", "#15181D", rough=0.9), loc=(dx + 1.6, 1.35, 1.95), bisel=0.05, sub=0))
fijo(caja("cartel_dep", (4.2, 0.08, 0.7), mat("cartel_blanco", "#F4F2EC", rough=0.5), loc=(dx, 1.3, 4.25), bisel=0.1, sub=0))
texto("cartel_dep_txt", "CENTRO DE DISTRIBUCIÓN", F_BLACK, 0.26, (dx, 1.25, 4.16), (R(90), 0, 0), "#1E2430", 1.0, emisivo=False)
for k in range(4):   # pallets con cajas en el andén
    x = dx - 2.6 + k * 0.9
    fijo(caja(f"pallet{k}", (0.8, 0.8, 0.12), mat("pallet", "#A37A4C", rough=0.9), loc=(x, 1.1, 0.92), bisel=0.1, sub=0))
    for j in range(2):
        fijo(caja(f"pallet_caja{k}{j}", (0.36, 0.7, 0.38), carton, loc=(x - 0.19 + j * 0.38, 1.1, 1.17), bisel=0.08, sub=0))
# ---------------- árboles y faroles de vereda ----------------
for k, x in enumerate((-3.0, 2.0, 8.0)):
    fijo(capsula(f"tronco{k}", 0.09, 0.12, 2.2, mat("tronco", "#6B5440", rough=0.9), loc=(x, -0.4, 2.35)))
    for j in range(4):
        fijo(esfera(f"copa{k}{j}", 0.7 + random.random() * 0.25, mat("copa", "#5E8F4E", rough=0.85), loc=(x + random.uniform(-0.45, 0.45), -0.4 + random.uniform(-0.35, 0.35), 2.7 + random.uniform(0, 0.6)), sub=1))
    fijo(caja(f"cantero{k}", (0.8, 0.8, 0.05), mat("tierra", "#5A4636", rough=0.95), loc=(x, -0.4, 0.165), bisel=0.2, sub=0))
for k, x in enumerate((-8.4, -3.6, 4.6)):
    fijo(capsula(f"farol{k}", 0.05, 0.06, 3.4, mat("farol", "#2A2E35", rough=0.4, metal=0.6), loc=(x, -0.75, 3.55)))
    fijo(caja(f"farol_luz{k}", (0.5, 0.22, 0.12), mat("farol_luz", "#FFF1D6", emis="#FFE2B0", fuerza=2), loc=(x + 0.18, -0.75, 3.55), bisel=0.3, sub=0))

# ---------------- luz: tarde soleada, suave ----------------
mi = mundo("#AFC4E6", 0.9)
luz("sol", "SUN", (-6, -8, 12), 3.2, "#FFE4C2", (R(48), 0, R(-35)), angle=R(6))
luz("interior_garage", "AREA", (gx, 3.6, 3.3), 180, "#FFE9CF", (0, 0, 0), size=3.5)
luz("interior_deposito", "AREA", (dx + 1.6, 3.0, 3.0), 120, "#E9F0FF", (0, 0, 0), size=2.0)
if opt.get("vista"):   # vista previa rápida sin hornear
    cd = bpy.data.cameras.new("c"); cd.lens = 28; cd.sensor_fit = "VERTICAL"; cd.sensor_height = 36
    cam = bpy.data.objects.new("c", cd); sc.collection.objects.link(cam); sc.camera = cam
    cam.location = (-1.0, -14.5, 9.5); cam.rotation_euler = (R(58), 0, R(0))
    sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.cycles.use_denoising = True
    sc.render.resolution_x = 1080; sc.render.resolution_y = 1920; sc.render.resolution_percentage = 35
    sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
    sc.render.filepath = opt["vista"]; bpy.ops.render.render(write_still=True); print("LISTO"); sys.exit(0)
hornear(opt.get("salida", "/tmp/barrio"), densidad=float(opt.get("densidad", 110)), muestras=int(opt.get("muestras", 48)), mundo_info=mi)
print("LISTO")
