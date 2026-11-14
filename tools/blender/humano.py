"""Personajes humanos con cuerpo real (MakeHuman/MPFB, CC0) estilizados al estilo de la cuenta:
cuerpo con esqueleto y piel que se deforma, ropa real con sus pliegues (mapa de normales) pero colores mate,
y la cabeza reemplazada por un óvalo sin cara con pelo en volumen.
Requiere la extensión MPFB instalada en Blender y el paquete de assets CC0 (ver /root/ig-negocios-assets/mpfb).
Uso: from humano import crear;  arm = crear("cajera", dict(genero=0.0, edad=0.45, ropa=[...], colores={...}))"""
import bpy, bmesh, math, os
from mathutils import Vector
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.locationservice import LocationService
from personaje import mat, hex2lin

DATOS = LocationService.get_user_data()

def _ruta(tipo, nombre):
    return os.path.join(DATOS, tipo, nombre, nombre + ".mhclo")

def _mate(nombre, color, normal=None, rough=0.82, sheen=0.15):
    """Material mate de color plano; si hay mapa de normales del asset, conserva los pliegues y costuras."""
    m = bpy.data.materials.new(nombre); m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*hex2lin(color), 1); b.inputs["Roughness"].default_value = rough
    b.inputs["Sheen Weight"].default_value = sheen
    if normal and os.path.exists(normal):
        t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(normal, check_existing=True); t.image.colorspace_settings.name = "Non-Color"
        nm = nt.nodes.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = 1.2
        nt.links.new(t.outputs["Color"], nm.inputs["Color"]); nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    return m

def _cabeza_ovalada(nombre, cuerpo, arm, piel, pelo_color, pelo_forma):
    """Borra la cabeza original (vértices del hueso 'head') y pone un óvalo sin cara + pelo, colgados del hueso."""
    bpy.context.view_layer.update()
    vg = cuerpo.vertex_groups.get("head")
    me = cuerpo.data; bm = bmesh.new(); bm.from_mesh(me); dl = bm.verts.layers.deform.verify()
    borrar = [v for v in bm.verts if vg and v[dl].get(vg.index, 0) > 0.45]
    pts = [cuerpo.matrix_world @ v.co for v in borrar]
    bmesh.ops.delete(bm, geom=borrar, context="VERTS"); bm.to_mesh(me); bm.free()
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))); mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    c = (mn + mx) / 2; t = mx - mn
    # óvalo: un poco más alto que ancho, apenas más grande que el cráneo original
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=20, radius=1)
    for v in bm.verts:
        v.co.x *= t.x * 0.56; v.co.y *= t.y * 0.56; v.co.z *= t.z * 0.6
        if v.co.z < 0: v.co.x *= 0.92 + 0.08 * (1 + v.co.z / (t.z * 0.6)); v.co.y *= 0.95  # mandíbula apenas más angosta
    m2 = bpy.data.meshes.new(nombre + ".cabeza"); bm.to_mesh(m2); bm.free()
    cab = bpy.data.objects.new(nombre + ".cabeza", m2); bpy.context.scene.collection.objects.link(cab)
    for p in m2.polygons: p.use_smooth = True
    cab.modifiers.new("sub", "SUBSURF").levels = 1; m2.materials.append(piel)
    cab.location = c + Vector((0, 0, t.z * 0.04))
    # pelo en volumen: casco recortado con línea de frente y nuca, con grosor
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=40, v_segments=24, radius=1)
    sx, sy, sz = t.x * 0.6, t.y * 0.61, t.z * 0.645
    corte = []
    for v in bm.verts:
        frente = -v.co.y   # -Y es la cara
        a, b = {"corto": (-0.14, 0.52), "largo": (-0.5, 0.72), "rulos": (-0.1, 0.48), "canoso": (-0.2, 0.45)}[pelo_forma]
        lim = a + b * frente
        if v.co.z < lim: corte.append(v)
        v.co.x *= sx; v.co.y *= sy; v.co.z *= sz
    bmesh.ops.delete(bm, geom=corte, context="VERTS")
    m3 = bpy.data.meshes.new(nombre + ".pelo"); bm.to_mesh(m3); bm.free()
    pelo = bpy.data.objects.new(nombre + ".pelo", m3); bpy.context.scene.collection.objects.link(pelo)
    for p in m3.polygons: p.use_smooth = True
    so = pelo.modifiers.new("grosor", "SOLIDIFY"); so.thickness = t.z * 0.1; so.offset = 1
    if pelo_forma == "rulos":
        tx = bpy.data.textures.new(nombre + ".rulos", "VORONOI"); tx.noise_scale = t.z * 0.12
        d = pelo.modifiers.new("rulos", "DISPLACE"); d.texture = tx; d.strength = t.z * 0.06
    pelo.modifiers.new("sub", "SUBSURF").levels = 1
    m3.materials.append(mat("pelo" + pelo_color, pelo_color, rough=0.45, sheen=0.3))
    pelo.location = cab.location + Vector((0, t.y * 0.03, t.z * 0.03))
    extra = []
    if pelo_forma == "largo":   # melena que cae hasta los hombros por detrás
        bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=20, radius=1)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y < -0.25], context="VERTS")
        for v in bm.verts: v.co.x *= t.x * 0.62; v.co.y *= t.y * 0.42; v.co.z *= t.z * 0.95
        m4 = bpy.data.meshes.new(nombre + ".melena"); bm.to_mesh(m4); bm.free()
        mel = bpy.data.objects.new(nombre + ".melena", m4); bpy.context.scene.collection.objects.link(mel)
        for p in m4.polygons: p.use_smooth = True
        mel.modifiers.new("grosor", "SOLIDIFY").thickness = t.z * 0.06; mel.modifiers.new("sub", "SUBSURF").levels = 1
        m4.materials.append(m3.materials[0]); mel.location = cab.location + Vector((0, t.y * 0.12, -t.z * 0.35)); extra.append(mel)
    bpy.context.view_layer.update()
    for o in (cab, pelo, *extra):   # colgar del hueso de la cabeza
        mw = o.matrix_world.copy(); o.parent = arm; o.parent_type = "BONE"; o.parent_bone = "head"; o.matrix_world = mw
    return cab, pelo

def crear(nombre, cfg):
    """cfg: genero (0 mujer, 1 varón), edad (0..1; 0.5 ≈ 25 años), peso, musculo, altura, piel (hex),
    ropa: lista de nombres de assets de clothes (p. ej. 'male_casualsuit03', 'shoes02'),
    colores: {asset: hex}, pelo: hex, pelo_forma: corto|largo|rulos|pelado."""
    macro = {"gender": cfg.get("genero", 0.5), "age": cfg.get("edad", 0.5), "muscle": cfg.get("musculo", 0.5), "weight": cfg.get("peso", 0.5),
             "proportions": 0.6, "height": cfg.get("altura", 0.5), "cupsize": 0.5, "firmness": 0.5,
             "race": {"asian": 0.2, "caucasian": 0.6, "african": 0.2}}
    cuerpo = HumanService.create_human(macro_detail_dict=macro, scale=0.1)
    cuerpo.name = nombre + ".cuerpo"
    arm = HumanService.add_builtin_rig(cuerpo, "game_engine"); arm.name = nombre + ".esqueleto"
    piel = mat("piel-" + cfg.get("piel", "#C69A72"), cfg.get("piel", "#C69A72"), rough=0.5, sss=0.15)
    cuerpo.data.materials.clear(); cuerpo.data.materials.append(piel)
    for a in cfg["ropa"]:
        o = HumanService.add_mhclo_asset(_ruta("clothes", a), cuerpo, asset_type="Clothes", subdiv_levels=0, material_type="MAKESKIN")
        o.name = f"{nombre}.{a}"
        normal = os.path.join(DATOS, "clothes", a, a + "_normal.png")
        o.data.materials.clear(); o.data.materials.append(_mate(f"{nombre}-{a}", cfg["colores"].get(a, "#777777"), normal))
        for p in o.data.polygons: p.use_smooth = True
    _cabeza_ovalada(nombre, cuerpo, arm, piel, cfg.get("pelo", "#3A2418"), cfg.get("pelo_forma", "corto"))
    # brazos abajo: la pose de reposo del esqueleto es en A
    return arm

def apuntar(arm, hueso, direccion):
    """Gira un hueso para que apunte en una dirección del espacio del esqueleto (x derecha del personaje = -x, -y adelante, z arriba)."""
    from mathutils import Matrix
    pb = arm.pose.bones[hueso]; bpy.context.view_layer.update()
    actual = (pb.tail - pb.head).normalized(); q = actual.rotation_difference(Vector(direccion).normalized())
    pb.matrix = Matrix.Translation(pb.head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-pb.head) @ pb.matrix
    bpy.context.view_layer.update()

def parado(arm, abre=0.18, codo=0.12):
    """Brazos al costado del cuerpo con los codos apenas doblados (la pose de reposo es en A)."""
    for lado, s in (("l", 1), ("r", -1)):
        apuntar(arm, f"upperarm_{lado}", (s * abre, 0.04, -1))
        apuntar(arm, f"lowerarm_{lado}", (s * abre * 0.6, -codo, -1))
        apuntar(arm, f"hand_{lado}", (s * 0.08, -codo * 0.5, -1))
        apuntar(arm, f"thigh_{lado}", (s * 0.035, 0.0, -1)); apuntar(arm, f"calf_{lado}", (s * 0.02, 0.03, -1))
