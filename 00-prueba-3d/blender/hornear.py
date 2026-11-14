"""Arma el hall del cine en Blender, hornea la luz (Cycles) de cada superficie fija y exporta:
  salida/set.glb          geometría con UV "luz" (una malla por superficie)
  salida/luz/<nombre>.hdr la luz horneada de cada superficie (radiancia lineal, sin tone mapping)
  salida/personas.glb     los personajes (cada uno con sus huesos como nodos)
  salida/luces.json       las luces, para replicarlas en tiempo real sobre los personajes
Uso: blender -b -P hornear.py -- --salida DIR [--densidad 160] [--muestras 64] [--solo personas]
Ejes: Blender Z arriba; al exportar a glTF queda Y arriba (Three.js): (x, y, z)_blender → (x, z, -y)_three."""
import bpy, bmesh, sys, os, math, json, random
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
sys.path.insert(0, os.path.join(RAIZ, "tools", "blender"))
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
opt = {args[i].lstrip("-"): args[i + 1] for i in range(0, len(args) - 1, 2)}
SALIDA = opt.get("salida", "/tmp/horneado"); DENS = float(opt.get("densidad", 160)); MUESTRAS = int(opt.get("muestras", 64)); SOLO = opt.get("solo", "")
os.makedirs(os.path.join(SALIDA, "luz"), exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
from personaje import Persona, mat, caja, esfera, capsula, loft, hex2lin
sc = bpy.context.scene
F_BLACK = bpy.data.fonts.load(os.path.join(RAIZ, "tools", "fuentes", "Montserrat-Black.ttf"))
F_BOLD = bpy.data.fonts.load(os.path.join(RAIZ, "tools", "fuentes", "Montserrat-Bold.ttf"))
random.seed(7)
FIJOS = []      # superficies que se hornean
def fijo(o): FIJOS.append(o); return o

def mat_nodos(nombre, armar):
    m = bpy.data.materials.new(nombre); m.use_nodes = True; nt = m.node_tree; armar(nt, nt.nodes["Principled BSDF"]); return m
def rayas(nt, b, a="#C8202E", c="#F4EFE6", n=8):
    tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sep.inputs[0])
    mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"; mul.inputs[1].default_value = n; nt.links.new(sep.outputs[0], mul.inputs[0])
    fr = nt.nodes.new("ShaderNodeMath"); fr.operation = "FRACT"; nt.links.new(mul.outputs[0], fr.inputs[0])
    st = nt.nodes.new("ShaderNodeMath"); st.operation = "GREATER_THAN"; st.inputs[1].default_value = 0.5; nt.links.new(fr.outputs[0], st.inputs[0])
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.inputs[6].default_value = (*hex2lin(a), 1); mix.inputs[7].default_value = (*hex2lin(c), 1)
    nt.links.new(st.outputs[0], mix.inputs[0]); nt.links.new(mix.outputs[2], b.inputs["Base Color"])
def texto(nombre, t, f, tam, loc, rot, color="#FFF4E2", fuerza=4.0):
    cu = bpy.data.curves.new(nombre, "FONT"); cu.body = t; cu.font = f; cu.size = tam; cu.align_x = "CENTER"; cu.extrude = 0.004
    o = bpy.data.objects.new(nombre, cu); sc.collection.objects.link(o); o.location = loc; o.rotation_euler = rot
    o.data.materials.append(mat("letra" + color, color, emis=color, fuerza=fuerza)); return fijo(o)

def luz(nombre, tipo, loc, energia, color, rot=(0, 0, 0), **k):
    l = bpy.data.lights.new(nombre, tipo); l.energy = energia; l.color = hex2lin(color)
    for a, v in k.items(): setattr(l, a, v)
    o = bpy.data.objects.new(nombre, l); sc.collection.objects.link(o); o.location = loc; o.rotation_euler = rot; return o

# ======================= el hall =======================
AN, PR = 12.0, 9.0
def armar_set():
    fijo(caja("base", (AN + 0.6, PR + 0.6, 0.5), mat("base", "#202228", rough=0.9), loc=(0, 0, -0.26), bisel=0.05, sub=0))
    def alfombra(nt, b):
        br = nt.nodes.new("ShaderNodeTexBrick"); br.inputs["Scale"].default_value = 2.2
        br.inputs["Color1"].default_value = (*hex2lin("#5B1A28"), 1); br.inputs["Color2"].default_value = (*hex2lin("#551826"), 1)
        br.inputs["Mortar"].default_value = (*hex2lin("#7E3343"), 1); br.inputs["Mortar Size"].default_value = 0.006; br.inputs["Brick Width"].default_value = 0.5; br.inputs["Row Height"].default_value = 0.5
        tc = nt.nodes.new("ShaderNodeTexCoord"); nt.links.new(tc.outputs["Object"], br.inputs["Vector"])
        nt.links.new(br.outputs[0], b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.95; b.inputs["Sheen Weight"].default_value = 0.4
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=24, y_subdivisions=18, size=1); p = bpy.context.object; p.name = "piso"; p.scale = (AN, PR, 1); p.location = (0, 0, 0.002)
    bpy.ops.object.transform_apply(scale=True); p.data.materials.append(mat_nodos("alfombra", alfombra)); fijo(p)
    pared = mat("pared", "#2C3760", rough=0.9)
    fijo(caja("pared_fondo", (AN, 0.25, 4.2), pared, loc=(0, PR / 2 - 0.12, 2.1), bisel=0.02, sub=0))
    fijo(caja("pared_izq", (0.25, PR, 4.2), mat("pared2", "#303C68", rough=0.9), loc=(-AN / 2 + 0.12, 0, 2.1), bisel=0.02, sub=0))
    fijo(caja("cornisa", (AN, 0.3, 0.35), mat("cornisa", "#11152A", rough=0.7), loc=(0, PR / 2 - 0.12, 4.2), bisel=0.1, sub=0))
    fijo(caja("zocalo", (AN, 0.3, 0.16), mat("zocalo", "#14182A", rough=0.6), loc=(0, PR / 2 - 0.3, 0.08), bisel=0.2, sub=0))
    fijo(caja("led_fondo", (AN - 0.4, 0.04, 0.06), mat("led", "#FFD9A0", emis="#FFB868", fuerza=40), loc=(0, PR / 2 - 0.27, 3.86), bisel=0.3, sub=0))
    # afiches
    AF = [("#1E5BD6", "#0A1030", "ÓRBITA\nCERO"), ("#D6452F", "#2A0A10", "LA ÚLTIMA\nCUENTA"), ("#16A27A", "#06221B", "DOS\nVERANOS")]
    for i, (a, b, t) in enumerate(AF):
        if i < 2: x, y, rz = -AN / 2 + 0.3, 2.6 - i * 2.1, -math.pi / 2
        else: x, y, rz = -4.3, PR / 2 - 0.3, 0
        fijo(caja(f"afiche_marco{i}", (1.36, 0.08, 1.96), mat("marco", "#0A0A0C", rough=0.4, metal=0.5), loc=(x, y, 2.2), rot=(0, 0, rz), bisel=0.1, sub=0))
        def grad(nt, bs, a=a, b=b):
            tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sep.inputs[0])
            mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs[1].default_value = -0.9; mr.inputs[2].default_value = 0.9; nt.links.new(sep.outputs[2], mr.inputs[0])
            mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.inputs[6].default_value = (*hex2lin(b), 1); mix.inputs[7].default_value = (*hex2lin(a), 1)
            nt.links.new(mr.outputs[0], mix.inputs[0]); nt.links.new(mix.outputs[2], bs.inputs["Base Color"]); nt.links.new(mix.outputs[2], bs.inputs["Emission Color"]); bs.inputs["Emission Strength"].default_value = 1.2
        dx, dy = (0.045, 0) if i < 2 else (0, -0.045)
        fijo(caja(f"afiche{i}", (1.2, 0.01, 1.8), mat_nodos(f"afiche{i}", grad), loc=(x + dx, y + dy, 2.2), rot=(0, 0, rz), bisel=0.05, sub=0))
        for k, linea in enumerate(t.split("\n")):
            texto(f"afiche{i}t{k}", linea, F_BLACK, 0.16, (x + dx * 1.3, y + dy * 1.3, 1.78 - k * 0.18), (math.pi / 2, 0, rz + (math.pi if i < 2 else 0) * 0 + (0 if i == 2 else 0)), "#FFFFFF", 2.5)
    # boletería
    bx, by = -3.9, 3.3
    fijo(caja("boleteria", (2.0, 1.2, 2.5), mat("boleteria", "#26304F", rough=0.6), loc=(bx, by, 1.25), bisel=0.04, sub=1))
    fijo(caja("boleteria_ventana", (1.4, 0.02, 0.8), mat("ventana", "#FFE7C2", emis="#FFB866", fuerza=3), loc=(bx, by - 0.605, 1.45), bisel=0.05, sub=0))
    fijo(caja("boleteria_cartel", (1.7, 0.02, 0.42), mat("cartelrojo", "#C8202E", emis="#C8202E", fuerza=1.2), loc=(bx, by - 0.61, 2.25), bisel=0.05, sub=0))
    texto("boleteria_txt", "BOLETERÍA", F_BLACK, 0.2, (bx, by - 0.625, 2.18), (math.pi / 2, 0, 0))
    # puerta de la sala
    fijo(caja("puerta", (0.1, 1.8, 2.5), mat("puerta", "#0B0D16", rough=0.5), loc=(-AN / 2 + 0.3, -1.6, 1.25), bisel=0.05, sub=0))
    fijo(caja("sala_cartel", (0.03, 1.4, 0.44), mat("salacartel", "#0B0D16", rough=0.5), loc=(-AN / 2 + 0.33, -1.6, 2.9), bisel=0.05, sub=0))
    texto("sala_txt", "SALA 3", F_BLACK, 0.24, (-AN / 2 + 0.36, -1.6, 2.82), (math.pi / 2, 0, -math.pi / 2), "#7FD3FF", 5)
    # candy (origen en x=1.6, y=3.0)
    cx, cy = 1.6, 3.0
    fijo(caja("mostrador", (5.2, 0.9, 1.05), mat("mostrador", "#2B1A1E", rough=0.55), loc=(cx, cy, 0.525), bisel=0.04, sub=1))
    fijo(caja("mostrador_tapa", (5.4, 1.0, 0.08), mat("marmol", "#EFE9DF", rough=0.25, coat=0.3), loc=(cx, cy, 1.09), bisel=0.3, sub=1))
    fijo(caja("mostrador_panel", (4.8, 0.02, 0.5), mat_nodos("panel", lambda nt, b: rayas(nt, b, n=1.65)), loc=(cx, cy - 0.455, 0.45), bisel=0.2, sub=0))
    fijo(caja("mostrador_led", (5.0, 0.02, 0.07), mat("ledfrente", "#FFE2B0", emis="#FFB060", fuerza=16), loc=(cx, cy - 0.46, 0.86), bisel=0.3, sub=0))
    fijo(caja("mueble_atras", (5.4, 0.6, 1.0), mat("mueble", "#3A2228", rough=0.6), loc=(cx, cy + 1.15, 0.5), bisel=0.05, sub=1))
    for i, (t, s, f) in enumerate((("POCHOCLO", "BALDE · MEDIANO · CHICO", "#14161C"), ("COMBOS", "BALDE + GASEOSA", "#B81C2A"), ("BEBIDAS", "GRANDE · MEDIANA", "#14161C"))):
        x = cx - 1.75 + i * 1.75
        fijo(caja(f"menu{i}", (1.6, 0.06, 0.52), mat("marco", "#0A0A0C", rough=0.4, metal=0.5), loc=(x, cy + 1.4, 2.75), bisel=0.1, sub=0))
        fijo(caja(f"menu{i}f", (1.54, 0.01, 0.46), mat("menufondo" + f, f, emis=f, fuerza=1.4), loc=(x, cy + 1.365, 2.75), bisel=0.05, sub=0))
        texto(f"menu{i}t", t, F_BLACK, 0.2, (x, cy + 1.355, 2.78), (math.pi / 2, 0, 0)); texto(f"menu{i}s", s, F_BOLD, 0.075, (x, cy + 1.355, 2.6), (math.pi / 2, 0, 0))
    fijo(caja("maquina_pie", (1.08, 0.68, 0.14), mat("rojo", "#C8202E", rough=0.4, coat=0.5), loc=(cx - 1.6, cy + 1.15, 1.07), bisel=0.3, sub=1))
    fijo(caja("maquina_techo", (1.08, 0.68, 0.22), mat("rojo", "#C8202E", rough=0.4, coat=0.5), loc=(cx - 1.6, cy + 1.15, 2.18), bisel=0.3, sub=1))
    fijo(caja("dispenser", (0.9, 0.5, 0.8), mat("dispenser", "#14161C", rough=0.35), loc=(cx + 1.95, cy + 1.15, 1.4), bisel=0.08, sub=1))
    fijo(caja("dispenser_f", (0.8, 0.01, 0.32), mat("dispf", "#1E5BD6", emis="#1E5BD6", fuerza=2), loc=(cx + 1.95, cy + 0.89, 1.55), bisel=0.05, sub=0))
    for i in range(3):
        x = cx - 1.6 + i * 1.6
        bpy.ops.mesh.primitive_cone_add(vertices=40, radius1=0.28, radius2=0.05, depth=0.3, location=(x, cy + 0.1, 3.3), end_fill_type="NOTHING")
        o = bpy.context.object; o.name = f"pantalla{i}"; o.modifiers.new("g", "SOLIDIFY").thickness = 0.012; o.data.materials.append(mat("pantalla", "#151515", rough=0.35, metal=0.6)); fijo(o)
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.008, depth=0.9, location=(x, cy + 0.1, 3.9)); o = bpy.context.object; o.name = f"cable{i}"; o.data.materials.append(mat("cable", "#111111")); fijo(o)
        fijo(esfera(f"foco{i}", 0.08, mat("foco", "#FFF1D6", emis="#FFD39A", fuerza=25), loc=(x, cy + 0.1, 3.16), sub=1))
    # postes con cordón
    pts = [(-1.2 + i * 1.3, 1.0) for i in range(4)]
    for i, (x, y) in enumerate(pts):
        cromo = mat("cromo", "#C9CCD2", rough=0.25, metal=0.9)
        fijo(capsula(f"poste{i}", 0.03, 0.03, 0.95, cromo, loc=(x, y, 0.98)))
        bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.17, depth=0.05, location=(x, y, 0.025)); o = bpy.context.object; o.name = f"poste_base{i}"; o.data.materials.append(cromo); fijo(o)
    for i in range(3):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        cu = bpy.data.curves.new(f"cordon{i}", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.025; cu.bevel_resolution = 3
        sp = cu.splines.new("BEZIER"); sp.bezier_points.add(1)
        for bp, (x, z) in zip(sp.bezier_points, ((x0, 0.95), (x1, 0.95))):
            bp.co = (x, y0, z); bp.handle_left_type = bp.handle_right_type = "FREE"
        sp.bezier_points[0].handle_right = (x0 + 0.4, y0, 0.62); sp.bezier_points[0].handle_left = (x0 - 0.1, y0, 0.95)
        sp.bezier_points[1].handle_left = (x1 - 0.4, y0, 0.62); sp.bezier_points[1].handle_right = (x1 + 0.1, y0, 0.95)
        o = bpy.data.objects.new(f"cordon{i}", cu); sc.collection.objects.link(o); o.data.materials.append(mat("cordon", "#8E1622", rough=0.6)); fijo(o)

    # ---- luces (se hornean en el set y se replican en tiempo real para la gente) ----
    L = []
    def reg(o, extra): L.append(dict(nombre=o.name, tipo=o.data.type, pos=list(o.location), rot=list(o.rotation_euler), energia=o.data.energy, color=list(o.data.color), **extra))
    reg(luz("principal", "AREA", (-5, -7, 9), 1500, "#FFE1BC", (math.radians(48), 0, math.radians(-33)), size=3, shape="SQUARE"), {"tam": 3})
    reg(luz("relleno", "AREA", (7, -5, 4), 260, "#9DB6FF", (math.radians(68), 0, math.radians(52)), size=5), {"tam": 5})
    reg(luz("contra", "AREA", (1, 6, 6), 500, "#FFD2A0", (math.radians(-40), 0, 0), size=6), {"tam": 6})
    for i in range(3):
        reg(luz(f"lampara{i}", "SPOT", (cx - 1.6 + i * 1.6, cy + 0.1, 3.08), 520, "#FFC27A", (0, 0, 0), spot_size=1.5, spot_blend=0.55, shadow_soft_size=0.12), {})
    reg(luz("luz_maquina", "POINT", (cx - 1.6, cy + 1.15, 1.9), 35, "#FFC27A", shadow_soft_size=0.25), {})
    reg(luz("luz_boleteria", "AREA", (bx, by - 1.0, 1.45), 60, "#FFB866", (math.radians(90), 0, 0), size=1.2), {"tam": 1.2})
    for k, (x, y) in enumerate(((2.0, 0.6), (-2.6, -1.4), (3.6, -2.8))):   # charcos de luz cálida en el piso
        reg(luz(f"charco{k}", "SPOT", (x, y, 5.5), 650, "#FFD39A", (0, 0, 0), spot_size=0.75, spot_blend=0.8, shadow_soft_size=0.3), {})
    reg(luz("luz_afiches", "SPOT", (-3.2, 0.5, 4.3), 400, "#FFFFFF", (math.radians(40), 0, math.radians(60)), spot_size=1.1, spot_blend=0.6), {})
    w = bpy.data.worlds.new("mundo"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (*hex2lin("#1B2340"), 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.18
    json.dump(dict(luces=L, mundo=dict(color=list(hex2lin("#1B2340")), fuerza=0.18)), open(os.path.join(SALIDA, "luces.json"), "w"), indent=1)

# ======================= personajes =======================
VARIANTES = {
    "cajera": dict(ropa=dict(camisa="#F2F0EC", pantalon="#26282E", zapatos="#1A1A1C", pelo="#3A2418", delantal="#2A2C30", cuello="#FFFFFF"), alto=0.98, pelo="corto"),
    "campera": dict(ropa=dict(camisa="#E0A21C", pantalon="#1F3A66", zapatos="#6B3A1E", pelo="#5A3A22", campera=True), alto=0.96, pelo="largo"),
    "rulos": dict(ropa=dict(camisa="#9E1F2E", pantalon="#2A2C34", zapatos="#1F2E4F", pelo="#2A1A12"), alto=1.02, pelo="rulos"),
    "canoso": dict(ropa=dict(camisa="#8FB3D9", pantalon="#4A4F57", zapatos="#EDEDED", pelo="#9A9A9A", manga_corta=True), alto=0.98, pelo="corto"),
    "verde": dict(ropa=dict(camisa="#2F6B4F", pantalon="#3B3F47", zapatos="#2A2A2E", pelo="#1E1410"), alto=1.0, pelo="largo"),
    "azul": dict(ropa=dict(camisa="#1F3A66", pantalon="#C9B79A", zapatos="#5A3A22", pelo="#6B4A2A", campera=True), alto=1.03, pelo="corto"),
}
def armar_personas():
    for i, (n, v) in enumerate(VARIANTES.items()):
        p = Persona(n, v["ropa"], alto=v["alto"], pelo_forma=v["pelo"]); p.poner((i * 1.0, -20, 0), 0)

def aplicar_y_convertir(objs):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.convert(target="MESH")

def limpiar(img, ruta):
    """Quita el ruido del horneado con OpenImageDenoise (compositor) y lo guarda en HDR lineal."""
    s2 = bpy.data.scenes.get("limpiar") or bpy.data.scenes.new("limpiar")
    if not s2.camera:
        c = bpy.data.objects.new("cam_limpiar", bpy.data.cameras.new("cam_limpiar")); s2.collection.objects.link(c); s2.camera = c
    s2.render.engine = "BLENDER_WORKBENCH"; s2.use_nodes = True; t = s2.node_tree; t.nodes.clear()
    a = t.nodes.new("CompositorNodeImage"); a.image = img
    d = t.nodes.new("CompositorNodeDenoise"); d.use_hdr = True; d.prefilter = "ACCURATE"
    o = t.nodes.new("CompositorNodeComposite"); t.links.new(a.outputs[0], d.inputs[0]); t.links.new(d.outputs[0], o.inputs[0])
    s2.render.resolution_x, s2.render.resolution_y = img.size; s2.render.resolution_percentage = 100
    s2.view_settings.view_transform = "Standard"; s2.render.image_settings.file_format = "HDR"
    s2.render.filepath = ruta; bpy.ops.render.render(write_still=True, scene=s2.name)

def hornear():
    sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = MUESTRAS; sc.cycles.use_denoising = False
    sc.render.bake.margin = 6; sc.render.bake.use_pass_direct = True; sc.render.bake.use_pass_indirect = True
    sc.render.bake.use_pass_diffuse = True; sc.render.bake.use_pass_glossy = False; sc.render.bake.use_pass_transmission = True; sc.render.bake.use_pass_emit = True
    aplicar_y_convertir(FIJOS)
    objs = [o for o in sc.objects if o.type == "MESH" and not o.name.startswith(tuple(VARIANTES))]
    info = {}
    for o in objs:
        # material propio por objeto (para que cada uno hornee en su imagen)
        for i, ms in enumerate(o.material_slots):
            if ms.material: o.material_slots[i].material = ms.material.copy()
        area = sum(p.area for p in o.data.polygons) * max(o.scale) ** 2
        lado = int(2 ** round(math.log2(max(32, min(2048, math.sqrt(area) * DENS)))))
        bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
        while o.data.uv_layers: o.data.uv_layers.remove(o.data.uv_layers[0])
        o.data.uv_layers.new(name="luz")
        bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.004); bpy.ops.object.mode_set(mode="OBJECT")
        img = bpy.data.images.new("luz_" + o.name, lado, lado, float_buffer=True)
        for ms in o.material_slots:
            nt = ms.material.node_tree; t = nt.nodes.new("ShaderNodeTexImage"); t.image = img; nt.nodes.active = t
        bpy.ops.object.bake(type="COMBINED")
        limpiar(img, os.path.join(SALIDA, "luz", o.name + ".hdr"))
        info[o.name] = lado; print("horneado", o.name, lado, flush=True)
    json.dump(info, open(os.path.join(SALIDA, "luz", "indice.json"), "w"), indent=1)
    # exportar solo la geometría del set, con su UV
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(SALIDA, "set.glb"), use_selection=True, export_materials="NONE", export_apply=True, export_texcoords=True, export_normals=True)

def exportar_personas():
    bpy.ops.object.select_all(action="DESELECT")
    for o in sc.objects:
        if o.name.split(".")[0] in VARIANTES: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(SALIDA, "personas.glb"), use_selection=True, export_apply=True, export_materials="EXPORT")

if SOLO != "personas":
    armar_set(); hornear()
    for o in list(sc.objects): bpy.data.objects.remove(o)
armar_personas(); exportar_personas()
print("LISTO", SALIDA)
