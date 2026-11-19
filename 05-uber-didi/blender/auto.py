"""Prepara el sedán (Sloyd, CC-BY 4.0, TopoSphere): escala real (4,5 m), ruedas separadas para que giren,
dos colores (Martín: blanco de flota; Lucas: gris azulado) y exporta escena/auto-martin.glb y auto-lucas.glb.
blender -b -P auto.py"""
import bpy, bmesh, os, math, numpy as np
from mathutils import Vector
AQUI = os.path.dirname(os.path.abspath(__file__)); os.makedirs(f"{AQUI}/escena", exist_ok=True)
SRC = "/root/ig-negocios/assets3d/descargas/sloyd-sedan.glb"
def recolor(img, modo):
    px = np.array(img.pixels[:], dtype=np.float32).reshape(-1, 4); rgb = px[:, :3]
    mx = rgb.max(1); mn = rgb.min(1); d = mx - mn + 1e-6; s = d / (mx + 1e-6); v = mx
    r, g, b = rgb.T; h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) / 6
    m = (s > 0.28) & ((h < 0.07) | (h > 0.93)) & (v > 0.12)          # la pintura roja
    if modo == "blanco":
        nv = np.clip(v * 1.05 + 0.32, 0, 0.94); new = np.stack([nv * 0.985, nv * 0.99, nv], 1)
    else:  # gris azulado
        nv = np.clip(v * 0.62, 0, 1); new = np.stack([nv * 0.62, nv * 0.70, nv * 0.82], 1)
    rgb[m] = new[m]; px[:, :3] = rgb; img.pixels[:] = px.ravel(); return m.mean()
for modo, nombre in (("blanco", "martin"), ("azul", "lucas")):
    bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
    bpy.ops.import_scene.gltf(filepath=SRC)
    o = [x for x in sc.objects if x.type == "MESH"][0]
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    for x in sc.objects:
        if x.parent is None and x != o and x.type == "EMPTY": pass
    mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # escala real: 15,87 → 4,5 m de largo
    k = 4.5 / 15.87; o.scale = (k, k, k); bpy.ops.object.transform_apply(scale=True)
    # textura recoloreada (copia propia)
    img = [n.image for n in o.data.materials[0].node_tree.nodes if n.type == "TEX_IMAGE"][0]
    img2 = img.copy(); img2.name = f"pintura_{nombre}"; frac = recolor(img2, modo)
    m2 = o.data.materials[0].copy(); m2.name = f"auto_{nombre}"
    for n in m2.node_tree.nodes:
        if n.type == "TEX_IMAGE": n.image = img2
    o.data.materials[0] = m2
    img2.filepath_raw = f"{AQUI}/escena/pintura-{nombre}.png"; img2.file_format = "PNG"; img2.save()
    # ruedas: vértices cerca de cada eje (x≈±0,85; y≈±1,35; z≈0,33) → objeto propio con el pivote en el centro
    pts = np.array([v.co[:] for v in o.data.vertices])
    print("BBOX", pts.min(0).round(3), pts.max(0).round(3), "pintura %.2f" % frac)
    xs, ys = pts[:, 0], pts[:, 1]
    ruedas = []
    for sy in (1, -1):
        sel = (np.abs(xs) > 0.55) & (pts[:, 2] < 0.75)
        cy = np.median(ys[sel & (np.sign(ys) == sy) & (np.abs(ys) > 0.9)]) if (sel & (np.sign(ys) == sy)).any() else sy * 1.35
        for sx in (1, -1):
            c = Vector((sx * 0.0, cy, 0.0)); ruedas.append((sx, sy, cy))
    # centro real de cada rueda: vértices bajos y de afuera
    for sx, sy, cy in ruedas:
        sel = (np.sign(xs) == sx) & (np.abs(xs) > 0.62) & (np.abs(ys - cy) < 0.45) & (pts[:, 2] < 0.72)
        p = pts[sel]; c = Vector(((p[:, 0].min() + p[:, 0].max()) / 2, (p[:, 1].min() + p[:, 1].max()) / 2, (p[:, 2].min() + p[:, 2].max()) / 2))
        r = (p[:, 2].max() - p[:, 2].min()) / 2
        bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="DESELECT"); bpy.ops.object.mode_set(mode="OBJECT")
        for f in o.data.polygons:
            vs = [o.data.vertices[i].co for i in f.vertices]
            f.select = all(np.sign(v.x) == sx and abs(v.x) > 0.6 and (v.y - c.y) ** 2 + (v.z - c.z) ** 2 < (r * 0.98) ** 2 for v in vs)
        bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.separate(type="SELECTED"); bpy.ops.object.mode_set(mode="OBJECT")
        w = [x for x in sc.objects if x.type == "MESH" and x != o and not x.name.startswith("rueda")][0]
        w.name = f"rueda_{'d' if sy > 0 else 't'}{'i' if sx > 0 else 'r'}"
        sc.cursor.location = c; bpy.context.view_layer.objects.active = w; bpy.ops.object.select_all(action="DESELECT"); w.select_set(True)
        bpy.ops.object.origin_set(type="ORIGIN_CURSOR"); w.parent = o; w.matrix_parent_inverse = o.matrix_world.inverted()
        bpy.context.view_layer.objects.active = o; o.select_set(True)
        print("rueda", w.name, [round(x, 3) for x in c], round(r, 3), len(w.data.polygons))
    o.name = "carroceria"
    if nombre == "martin":   # prueba: ruedas giradas 35° para ver si quedan prolijas
        for w in [x for x in sc.objects if x.name.startswith("rueda")]: w.rotation_euler.x = math.radians(35)
        cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
        cam.location = (4.2, -1.2, 0.9); cam.rotation_euler = (Vector((0, -0.6, 0.4)) - cam.location).to_track_quat("-Z", "Y").to_euler()
        sc.render.engine = "CYCLES"; sc.cycles.samples = 24; sc.render.resolution_x = 900; sc.render.resolution_y = 500
        wd = bpy.data.worlds.new("w"); sc.world = wd; wd.use_nodes = True; wd.node_tree.nodes["Background"].inputs[0].default_value = (0.8, 0.82, 0.85, 1)
        sc.render.filepath = "/root/.claude/jobs/84a94d17/tmp/ruedas.png"; bpy.ops.render.render(write_still=True)
        for w in [x for x in sc.objects if x.name.startswith("rueda")]: w.rotation_euler.x = 0
        bpy.data.objects.remove(cam)
    bpy.ops.export_scene.gltf(filepath=f"{AQUI}/escena/auto-{nombre}.glb", export_format="GLB", export_image_format="JPEG", export_jpeg_quality=88)
    print("ok", nombre)
