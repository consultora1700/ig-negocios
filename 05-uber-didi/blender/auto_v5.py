# Reel 05 v5: reexporta el NormalCar1 de Quaternius (CC0) CONSERVANDO sus 6 materiales
# (la v4 lo había exportado con la carrocería, vidrios y faros en un solo color).
# Uso: blender -b NormalCar1.blend --python auto_v5.py -- salida.glb
import bpy, bmesh, sys
out = sys.argv[sys.argv.index("--") + 1]
ob = {o.name: o for o in bpy.data.objects}
body = ob["NormalCar1"]; body.name = "Body"
def origen_al_centro(o):
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
# rueda trasera: separar en izquierda y derecha
bw = ob["NormalCar1_BackWheels"]
bpy.ops.object.select_all(action="DESELECT"); bw.select_set(True); bpy.context.view_layer.objects.active = bw
bpy.ops.object.duplicate(); bw2 = bpy.context.active_object
for o, borrar_pos in ((bw, False), (bw2, True)):
    me = o.data; bm = bmesh.new(); bm.from_mesh(me)
    wx = o.matrix_world
    quitar = [v for v in bm.verts if ((wx @ v.co).x > 0) == borrar_pos]
    bmesh.ops.delete(bm, geom=quitar, context="VERTS"); bm.to_mesh(me); bm.free()
bw.name = "WheelRearL"; bw2.name = "WheelRearR"   # L = x>0, igual que las delanteras
ob["NormalCar1_FrontLeftWheel"].name = "WheelFrontL"; ob["NormalCar1_FrontRightWheel"].name = "WheelFrontR"
for n in ("WheelRearL", "WheelRearR", "WheelFrontL", "WheelFrontR"): origen_al_centro(bpy.data.objects[n])
# suavizado por ángulo (quita el facetado de juguete sin redondear las aristas vivas)
for o in bpy.data.objects:
    if o.type != "MESH": continue
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.shade_smooth_by_angle(angle=0.55)
# materiales
def bsdf(m): return m.node_tree.nodes.get("Principled BSDF")
for m in bpy.data.materials:
    if not m.use_nodes or not bsdf(m): continue
    b = bsdf(m)
    if m.name == "Blue": m.name = "Paint 1"; b.inputs["Metallic"].default_value = 0.55; b.inputs["Roughness"].default_value = 0.28
    elif m.name == "Windows": m.name = "Glass"; b.inputs["Base Color"].default_value = (0.012, 0.016, 0.022, 1); b.inputs["Metallic"].default_value = 0.0; b.inputs["Roughness"].default_value = 0.04
    elif m.name == "Black": m.name = "Trim"; b.inputs["Roughness"].default_value = 0.6
    elif m.name == "Grey": m.name = "Rim"; b.inputs["Base Color"].default_value = (0.55, 0.57, 0.6, 1); b.inputs["Metallic"].default_value = 1.0; b.inputs["Roughness"].default_value = 0.3
    elif m.name == "Headlights": m.name = "Headlight"; b.inputs["Base Color"].default_value = (0.9, 0.9, 0.85, 1); b.inputs["Roughness"].default_value = 0.1
    elif m.name == "TailLights": m.name = "Taillight"; b.inputs["Base Color"].default_value = (0.6, 0.03, 0.03, 1); b.inputs["Roughness"].default_value = 0.15
# (la escala se aplica en Three: o.scale = 1.03)
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_yup=True, export_apply=True)
print("OK", out, [(o.name, tuple(round(v, 3) for v in o.location)) for o in bpy.data.objects])
