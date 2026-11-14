"""Estudio neutro para revisar personajes: blender -b -P estudio.py -- --salida DIR --escala 40 --muestras 24"""
import bpy, sys, os, math
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
sys.path.insert(0, os.path.join(RAIZ, "tools", "blender"))
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
opt = {args[i].lstrip("-"): args[i + 1] for i in range(0, len(args) - 1, 2)}
bpy.ops.wm.read_factory_settings(use_empty=True)
from personaje import Persona, mat, hex2lin
sc = bpy.context.scene
sc.render.engine = "CYCLES"; sc.cycles.samples = int(opt.get("muestras", 24)); sc.cycles.use_denoising = True
sc.render.resolution_x = 1920; sc.render.resolution_y = 1080; sc.render.resolution_percentage = int(opt.get("escala", 40))
sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (*hex2lin("#C9C2B6"), 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.5
bpy.ops.mesh.primitive_plane_add(size=40); bpy.context.object.data.materials.append(mat("piso", "#BDB6AA", rough=0.9))
P = [
 Persona("a", dict(camisa="#F2F0EC", pantalon="#26282E", zapatos="#1A1A1C", pelo="#3A2418", delantal="#2A2C30", cuello="#FFFFFF")),
 Persona("b", dict(camisa="#E0A21C", pantalon="#1F3A66", zapatos="#6B3A1E", pelo="#5A3A22", campera=True), alto=0.96, pelo_forma="largo"),
 Persona("c", dict(camisa="#9E1F2E", pantalon="#2A2C34", zapatos="#1F2E4F", pelo="#2A1A12"), alto=1.02, pelo_forma="rulos"),
 Persona("d", dict(camisa="#8FB3D9", pantalon="#4A4F57", zapatos="#EDEDED", pelo="#9A9A9A", manga_corta=True), alto=0.98),
]
for i, p in enumerate(P):
    p.poner(((i - 1.5) * 0.85, 0, 0), 0.35 - i * 0.2)
    p.parado(i)
P[1].caminar(0.25, 0.8); P[2].rotar("hombroD", -2.6, 0, -0.2); P[2].rotar("codoD", -0.3)
P[3].rotar("hombroI", -0.7, 0, 0.1); P[3].rotar("codoI", -1.2)
l = bpy.data.lights.new("k", "AREA"); l.size = 4; l.energy = 900; l.color = hex2lin("#FFE4C4"); o = bpy.data.objects.new("k", l); sc.collection.objects.link(o); o.location = (-3, -4, 5); o.rotation_euler = (math.radians(50), 0, math.radians(-35))
l2 = bpy.data.lights.new("f", "AREA"); l2.size = 4; l2.energy = 250; l2.color = hex2lin("#B9CCFF"); o2 = bpy.data.objects.new("f", l2); sc.collection.objects.link(o2); o2.location = (4, -3, 3); o2.rotation_euler = (math.radians(65), 0, math.radians(50))
cd = bpy.data.cameras.new("c"); cd.lens = 50; cam = bpy.data.objects.new("c", cd); sc.collection.objects.link(cam); sc.camera = cam
cam.location = (0.4, -5.2, 1.5); cam.rotation_euler = (math.radians(86), 0, math.radians(4))
sc.render.filepath = os.path.join(opt.get("salida", "/tmp"), "estudio.png"); bpy.ops.render.render(write_still=True); print("LISTO")
