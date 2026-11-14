"""Herramientas para armar un escenario en Blender y hornear su luz con Cycles (ver 00-prueba-3d/blender/hornear.py).
Cada superficie marcada con fijo() se hornea en su propia imagen HDR y se exporta en set.glb con un UV "luz";
en Three.js se dibuja con MeshBasicMaterial + esa imagen (se ve como un render de trazado de rayos).
Ejes: Blender Z arriba; en glTF/Three queda Y arriba: (x, y, z)_blender → (x, z, -y)_three."""
import bpy, os, math, json
from personaje import mat, hex2lin

FIJOS = []
LUCES = []
def fijo(o): FIJOS.append(o); return o

def mat_nodos(nombre, armar):
    m = bpy.data.materials.new(nombre); m.use_nodes = True; nt = m.node_tree; armar(nt, nt.nodes["Principled BSDF"]); return m

def texto(nombre, t, fuente, tam, loc, rot, color="#FFF4E2", fuerza=4.0, extrude=0.004, emisivo=True):
    cu = bpy.data.curves.new(nombre, "FONT"); cu.body = t; cu.font = fuente; cu.size = tam; cu.align_x = "CENTER"; cu.extrude = extrude
    o = bpy.data.objects.new(nombre, cu); bpy.context.scene.collection.objects.link(o); o.location = loc; o.rotation_euler = rot
    o.data.materials.append(mat("letra" + color + str(emisivo), color, emis=color if emisivo else None, fuerza=fuerza if emisivo else 0)); return fijo(o)

def luz(nombre, tipo, loc, energia, color, rot=(0, 0, 0), registrar=True, **k):
    l = bpy.data.lights.new(nombre, tipo); l.energy = energia; l.color = hex2lin(color)
    for a, v in k.items(): setattr(l, a, v)
    o = bpy.data.objects.new(nombre, l); bpy.context.scene.collection.objects.link(o); o.location = loc; o.rotation_euler = rot
    if registrar: LUCES.append(dict(nombre=nombre, tipo=tipo, pos=list(loc), rot=list(rot), energia=energia, color=list(hex2lin(color))))
    return o

def mundo(color, fuerza):
    sc = bpy.context.scene; w = bpy.data.worlds.new("mundo"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (*hex2lin(color), 1); w.node_tree.nodes["Background"].inputs[1].default_value = fuerza
    return dict(color=list(hex2lin(color)), fuerza=fuerza)

def _limpiar(img, ruta):
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

def hornear(salida, densidad=110, muestras=48, mundo_info=None, max_lado=2048):
    sc = bpy.context.scene; os.makedirs(os.path.join(salida, "luz"), exist_ok=True)
    sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = muestras; sc.cycles.use_denoising = False
    b = sc.render.bake; b.margin = 6; b.use_pass_direct = True; b.use_pass_indirect = True
    b.use_pass_diffuse = True; b.use_pass_glossy = False; b.use_pass_transmission = True; b.use_pass_emit = True
    bpy.ops.object.select_all(action="DESELECT")
    for o in FIJOS: o.select_set(True)
    bpy.context.view_layer.objects.active = FIJOS[0]; bpy.ops.object.convert(target="MESH")
    nombres = {o.name for o in FIJOS}
    objs = [o for o in sc.objects if o.type == "MESH" and o.name in nombres]
    info = {}
    for o in objs:
        for i, ms in enumerate(o.material_slots):
            if ms.material: o.material_slots[i].material = ms.material.copy()
        area = sum(p.area for p in o.data.polygons)
        lado = int(2 ** round(math.log2(max(32, min(max_lado, math.sqrt(area) * densidad)))))
        bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
        while o.data.uv_layers: o.data.uv_layers.remove(o.data.uv_layers[0])
        o.data.uv_layers.new(name="luz")
        bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.004); bpy.ops.object.mode_set(mode="OBJECT")
        img = bpy.data.images.new("luz_" + o.name, lado, lado, float_buffer=True)
        for ms in o.material_slots:
            nt = ms.material.node_tree; t = nt.nodes.new("ShaderNodeTexImage"); t.image = img; nt.nodes.active = t
        bpy.ops.object.bake(type="COMBINED")
        _limpiar(img, os.path.join(salida, "luz", o.name + ".hdr"))
        info[o.name] = lado; print("horneado", o.name, lado, flush=True)
    json.dump(info, open(os.path.join(salida, "luz", "indice.json"), "w"), indent=1)
    json.dump(dict(luces=LUCES, mundo=mundo_info or {}), open(os.path.join(salida, "luces.json"), "w"), indent=1)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(salida, "set.glb"), use_selection=True, export_materials="NONE", export_apply=True, export_texcoords=True, export_normals=True)
