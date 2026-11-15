"""Foto de estudio de los objetos candidatos (para elegir antes de usarlos)."""
import bpy, math, os, sys
sys.path.insert(0, "/root/ig-negocios/tools/blender")
bpy.ops.wm.read_homefile(use_empty=True)
PH = "/root/ig-negocios-assets/polyhaven"
L = ["barrel_stove", "standing_chalkboard_01", "small_wooden_table_01", "WoodenTable_01", "wicker_basket_01", "wicker_basket_02", "cement_bag", "compost_bag_02",
     "plastic_crate_01", "plastic_monobloc_chair_01", "trashbag", "wooden_bowl_01", "wooden_cutting_board", "wooden_spoon", "metal_jug", "folding_wooden_stool"]
sc = bpy.context.scene
for i, n in enumerate(L):
    f = [x for x in os.listdir(os.path.join(PH, n)) if x.endswith(".gltf")][0]
    antes = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=os.path.join(PH, n, f)); nuevos = [o for o in bpy.data.objects if o not in antes]
    raiz = [o for o in nuevos if o.parent is None]
    # normalizar tamaño para la foto: alto máximo 1,2 m (los chicos se agrandan para verlos)
    bpy.context.view_layer.update()
    zs = [ (o.matrix_world @ v.co).z for o in nuevos if o.type == "MESH" for v in o.data.vertices ]
    h = max(zs) - min(zs); k = min(3.0, 1.0 / max(h, 0.05)) if h < 0.5 else 1.0
    for r in raiz: r.scale = [s * k for s in r.scale]; r.location = ((i % 4) * 1.6 - 2.4, (i // 4) * 1.6, 0)
sc.render.engine = "CYCLES"; sc.cycles.samples = 24; sc.cycles.use_denoising = True
sc.render.resolution_x = 1600; sc.render.resolution_y = 1600
sc.view_settings.view_transform = "AgX"
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 0.9
bpy.ops.mesh.primitive_plane_add(size=30)
l = bpy.data.lights.new("k", "SUN"); l.energy = 3.5; o = bpy.data.objects.new("k", l); sc.collection.objects.link(o); o.rotation_euler = (math.radians(50), 0, math.radians(30))
cd = bpy.data.cameras.new("c"); cd.lens = 32; cam = bpy.data.objects.new("c", cd); sc.collection.objects.link(cam); sc.camera = cam
cam.location = (0, -6.5, 6.5); cam.rotation_euler = (math.radians(52), 0, 0)
sc.render.filepath = "/root/ig-negocios/04-tortillas/blender/elenco/props.png"; bpy.ops.render.render(write_still=True)
