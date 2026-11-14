import bpy, sys, os, math
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
sys.path.insert(0, os.path.join(RAIZ, "tools", "blender"))
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []; opt = {args[i].lstrip("-"): args[i + 1] for i in range(0, len(args) - 1, 2)}
bpy.ops.wm.read_factory_settings(use_empty=True)
from vehiculos import sedan, utilitario
from personaje import mat, hex2lin
sc = bpy.context.scene
a = sedan("auto", "#9FB3C8"); a.location = (-1.4, 0, 0); a.rotation_euler = (0, 0, math.radians(-35))
b = utilitario("van", "#EEF0F2"); b.location = (1.6, 0.5, 0); b.rotation_euler = (0, 0, math.radians(-35))
sc.render.engine = "CYCLES"; sc.cycles.samples = 24; sc.cycles.use_denoising = True
sc.render.resolution_x = 1920; sc.render.resolution_y = 1080; sc.render.resolution_percentage = 50
sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (*hex2lin("#C9D4E2"), 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.8
bpy.ops.mesh.primitive_plane_add(size=40); bpy.context.object.data.materials.append(mat("piso", "#9A968E", rough=0.9))
l = bpy.data.lights.new("s", "SUN"); l.energy = 3; l.angle = math.radians(5); o = bpy.data.objects.new("s", l); sc.collection.objects.link(o); o.rotation_euler = (math.radians(50), 0, math.radians(-30))
cd = bpy.data.cameras.new("c"); cd.lens = 40; cam = bpy.data.objects.new("c", cd); sc.collection.objects.link(cam); sc.camera = cam
cam.location = (0.5, -8.5, 3.2); cam.rotation_euler = (math.radians(73), 0, 0)
sc.render.filepath = opt.get("salida", "/tmp/v.png"); bpy.ops.render.render(write_still=True); print("LISTO")
