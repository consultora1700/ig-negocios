"""Prueba de personajes humanos MPFB estilizados: blender -b -P humano_test.py -- --salida DIR"""
import bpy, sys, os, math
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
sys.path.insert(0, os.path.join(RAIZ, "tools", "blender"))
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
opt = {args[i].lstrip("-"): args[i + 1] for i in range(0, len(args) - 1, 2)}
bpy.ops.wm.read_homefile(use_empty=True)
from humano import crear, parado
from personaje import mat, hex2lin
sc = bpy.context.scene
G = [
 ("ana", dict(genero=0.0, edad=0.45, peso=0.5, ropa=["female_casualsuit01", "shoes03"], colores={"female_casualsuit01": "#E0A21C", "shoes03": "#6B3A1E"}, pelo="#5A3A22", pelo_forma="largo")),
 ("beto", dict(genero=1.0, edad=0.5, peso=0.55, ropa=["male_casualsuit03", "shoes02"], colores={"male_casualsuit03": "#9E1F2E", "shoes02": "#1F2E4F"}, pelo="#2A1A12", pelo_forma="rulos")),
 ("carla", dict(genero=0.0, edad=0.6, peso=0.6, ropa=["female_casualsuit02", "shoes05"], colores={"female_casualsuit02": "#1F3A66", "shoes05": "#2A2A2E"}, pelo="#3A2418", pelo_forma="corto")),
 ("dario", dict(genero=1.0, edad=0.85, peso=0.6, ropa=["male_worksuit01", "shoes01"], colores={"male_worksuit01": "#8FB3D9", "shoes01": "#1A1A1C"}, pelo="#A8A8A8", pelo_forma="canoso")),
]
for i, (n, c) in enumerate(G):
    a = crear(n, c); a.location = ((i - 1.5) * 0.85, 0, 0); a.rotation_euler = (0, 0, 0.3 - i * 0.2); parado(a)
sc.render.engine = "CYCLES"; sc.cycles.samples = int(opt.get("muestras", 24)); sc.cycles.use_denoising = True
sc.render.resolution_x = 1920; sc.render.resolution_y = 1080; sc.render.resolution_percentage = int(opt.get("escala", 50))
sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (*hex2lin("#C9C2B6"), 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.5
bpy.ops.mesh.primitive_plane_add(size=40); bpy.context.object.data.materials.append(mat("piso", "#BDB6AA", rough=0.9))
l = bpy.data.lights.new("k", "AREA"); l.size = 4; l.energy = 900; l.color = hex2lin("#FFE4C4"); o = bpy.data.objects.new("k", l); sc.collection.objects.link(o); o.location = (-3, -4, 5); o.rotation_euler = (math.radians(50), 0, math.radians(-35))
l2 = bpy.data.lights.new("f", "AREA"); l2.size = 4; l2.energy = 250; l2.color = hex2lin("#B9CCFF"); o2 = bpy.data.objects.new("f", l2); sc.collection.objects.link(o2); o2.location = (4, -3, 3); o2.rotation_euler = (math.radians(65), 0, math.radians(50))
cd = bpy.data.cameras.new("c"); cd.lens = 50; cam = bpy.data.objects.new("c", cd); sc.collection.objects.link(cam); sc.camera = cam
cam.location = (0.4, -6.6, 1.05); cam.rotation_euler = (math.radians(88), 0, math.radians(3))
sc.render.filepath = os.path.join(opt.get("salida", "/tmp"), "humanos.png"); bpy.ops.render.render(write_still=True); print("LISTO")
