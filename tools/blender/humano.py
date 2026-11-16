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

def _mate(nombre, color, normal=None, rough=0.82, sheen=0.15, difusa=None):
    """Material mate. Con color: tono plano. Sin color: usa la textura original de la prenda (jean, remera y camisa
    quedan con su propio color) apenas desaturada para el look de maqueta. El mapa de normales conserva pliegues y costuras."""
    m = bpy.data.materials.new(nombre); m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = rough
    if color:
        b.inputs["Base Color"].default_value = (*hex2lin(color), 1)
    elif difusa and os.path.exists(difusa):
        t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(difusa, check_existing=True)
        hs = nt.nodes.new("ShaderNodeHueSaturation"); hs.inputs["Saturation"].default_value = 0.85; hs.inputs["Value"].default_value = 1.05
        nt.links.new(t.outputs["Color"], hs.inputs["Color"]); nt.links.new(hs.outputs["Color"], b.inputs["Base Color"])
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
    bmesh.ops.delete(bm, geom=borrar, context="VERTS")
    # tapa el agujero que deja la cabeza borrada (si no, se ve el interior oscuro del cuello)
    borde = [e for e in bm.edges if e.is_boundary and all((cuerpo.matrix_world @ v.co).z > 1.3 for v in e.verts)]
    if borde: bmesh.ops.holes_fill(bm, edges=borde, sides=0)
    bm.to_mesh(me); bm.free()
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
    # se apoya sobre el cuello: la base del óvalo queda apenas por debajo del arranque del hueso de la cabeza
    hz = (arm.matrix_world @ arm.pose.bones["head"].head).z
    cab.location = Vector((c.x, c.y, hz + t.z * 0.6 * 0.82))
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
    for o in (cab, pelo, *extra):   # colgar del hueso de la cabeza (el cuello, del hueso del cuello)
        mw = o.matrix_world.copy(); o.parent = arm; o.parent_type = "BONE"; o.parent_bone = "neck_01" if o.name.endswith(".cuello") else "head"; o.matrix_world = mw
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
    ARRIBA = ("spine", "clavicle", "upperarm", "lowerarm", "hand", "neck", "head", "thumb", "index", "middle", "ring", "pinky")
    for a in cfg["ropa"]:
        o = HumanService.add_mhclo_asset(_ruta("clothes", a), cuerpo, asset_type="Clothes", subdiv_levels=0, material_type="MAKESKIN")
        o.name = f"{nombre}.{a}"
        if a in cfg.get("solo_abajo", ()):   # va otra prenda encima: me quedo solo con la parte que se mueve con cadera y piernas
            me = o.data; bm = bmesh.new(); bm.from_mesh(me); dl = bm.verts.layers.deform.verify()
            arriba = {g.index for g in o.vertex_groups if g.name.startswith(ARRIBA)}
            fuera = []
            for v in bm.verts:
                w_ar = sum(w for gi, w in v[dl].items() if gi in arriba); w_tot = sum(v[dl].values()) or 1
                if w_ar / w_tot > 0.35: fuera.append(v)
            bmesh.ops.delete(bm, geom=fuera, context="VERTS"); bm.to_mesh(me); bm.free()
        d = os.path.join(DATOS, "clothes", a)
        normal = next((os.path.join(d, f) for f in os.listdir(d) if "normal" in f.lower() and f.endswith(".png")), None)
        difusa = next((os.path.join(d, f) for f in os.listdir(d) if ("diffuse" in f.lower() or f.lower() == a.lower() + ".png") and f.endswith(".png")), None)
        o.data.materials.clear(); o.data.materials.append(_mate(f"{nombre}-{a}", cfg.get("colores", {}).get(a), normal, difusa=difusa))
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

# ---------------- animaciones (se guardan como pistas NLA y viajan en el glTF) ----------------
from mathutils import Matrix

def _reposo(arm):
    for pb in arm.pose.bones: pb.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()

def _subir(arm, hueso, dz):
    pb = arm.pose.bones[hueso]; pb.matrix = Matrix.Translation((0, 0, dz)) @ pb.matrix; bpy.context.view_layer.update()

def _clave(arm, f):
    for pb in arm.pose.bones:
        pb.rotation_mode = "QUATERNION"; pb.keyframe_insert("rotation_quaternion", frame=f)
    arm.pose.bones["pelvis"].keyframe_insert("location", frame=f)

def _accion(arm, nombre, claves):
    """claves: lista de (cuadro, función que posa el esqueleto)."""
    arm.animation_data_create(); act = bpy.data.actions.new(nombre); arm.animation_data.action = act
    for f, posar in claves:
        _reposo(arm); posar(arm); _clave(arm, f)
    tr = arm.animation_data.nla_tracks.new(); tr.name = nombre; tr.strips.new(nombre, int(claves[0][0]), act)
    arm.animation_data.action = None; _reposo(arm)

def _paso(arm, fase, amp=1.0):
    """Ciclo de caminata: fase 0..1 = dos pasos. -Y es adelante."""
    for lado, s, d in (("l", 1, 0.0), ("r", -1, math.pi)):
        a = math.sin(2 * math.pi * fase + d)
        dobla = max(0.0, math.sin(2 * math.pi * fase + d + 1.3)) * 0.85 * amp
        apuntar(arm, f"thigh_{lado}", (s * 0.03, -a * 0.48 * amp, -1))
        apuntar(arm, f"calf_{lado}", (s * 0.02, -a * 0.24 * amp + dobla, -1))
        apuntar(arm, f"foot_{lado}", (s * 0.05, -1, -0.32 + dobla * 0.25))
        apuntar(arm, f"upperarm_{lado}", (s * 0.16, a * 0.36 * amp, -1))
        apuntar(arm, f"lowerarm_{lado}", (s * 0.1, a * 0.2 * amp - 0.3, -1))
        apuntar(arm, f"hand_{lado}", (s * 0.06, a * 0.15 - 0.2, -1))
    _subir(arm, "pelvis", -abs(math.sin(2 * math.pi * fase)) * 0.025 * amp)

def animar(arm, extras=()):
    """Pistas: parado (4 s, respira), caminar (1 s = 2 pasos) y las que pida el personaje: entregar, embalar, atender."""
    def respira(k):
        def p(a):
            parado(a, abre=0.17 + 0.01 * k, codo=0.12 + 0.03 * k)
            apuntar(a, "spine_03", (0, 0.03 * k, 1)); apuntar(a, "head", (0.02 * k, -0.04, 1))
        return p
    _accion(arm, "parado", [(1, respira(0)), (61, respira(1)), (121, respira(0))])
    _accion(arm, "caminar", [(1 + i * 4, (lambda f: lambda a: _paso(a, f))(i / 8)) for i in range(9)])
    if "entregar" in extras:   # sostiene un paquete con las dos manos, adelante
        def ent(k):
            def p(a):
                parado(a)
                for lado, s in (("l", 1), ("r", -1)):
                    apuntar(a, f"upperarm_{lado}", (s * 0.12, -0.55 - 0.05 * k, -0.85)); apuntar(a, f"lowerarm_{lado}", (-s * 0.25, -1, 0.05))
                    apuntar(a, f"hand_{lado}", (-s * 0.3, -1, 0.1))
            return p
        _accion(arm, "entregar", [(1, ent(0)), (31, ent(1)), (61, ent(0))])
    if "cargar" in extras:     # camina con una caja en los brazos
        def carga(f):
            def p(a):
                _paso(a, f, 0.9)
                for lado, s in (("l", 1), ("r", -1)):
                    apuntar(a, f"upperarm_{lado}", (s * 0.14, -0.5, -0.86)); apuntar(a, f"lowerarm_{lado}", (-s * 0.3, -1, 0.12)); apuntar(a, f"hand_{lado}", (-s * 0.35, -1, 0.1))
            return p
        _accion(arm, "cargar", [(1 + i * 4, carga(i / 8)) for i in range(9)])
    if "embalar" in extras:    # manos sobre la mesa, cerrando una caja
        def emb(k):
            def p(a):
                parado(a); apuntar(a, "spine_03", (0, -0.25, 1)); apuntar(a, "head", (0, -0.5, 1))
                for lado, s in (("l", 1), ("r", -1)):
                    apuntar(a, f"upperarm_{lado}", (s * 0.25, -0.5, -0.8)); apuntar(a, f"lowerarm_{lado}", (-s * (0.25 + 0.15 * k), -1, -0.35))
                    apuntar(a, f"hand_{lado}", (-s * 0.2, -1, -0.5))
            return p
        _accion(arm, "embalar", [(1, emb(0)), (16, emb(1)), (31, emb(0))])
    if "atender" in extras:    # mira y gesticula hacia adelante
        def ate(k):
            def p(a):
                parado(a); apuntar(a, "upperarm_r", (-0.2, -0.45, -0.85)); apuntar(a, "lowerarm_r", (0.1, -1, 0.15 + 0.15 * k))
                apuntar(a, "head", (0.05 * k, -0.08, 1))
            return p
        _accion(arm, "atender", [(1, ate(0)), (31, ate(1)), (61, ate(0))])

def exportar(arm, ruta):
    """Un glb por personaje: esqueleto, cuerpo, ropa, cabeza y pelo, con sus pistas de animación."""
    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    for o in arm.children_recursive: o.select_set(True)
    for o in bpy.context.scene.objects:
        if o.parent and o.parent.parent == arm: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=ruta, use_selection=True, export_animation_mode="NLA_TRACKS", export_morph=False,
                              export_apply=True, export_skins=True, export_def_bones=False, export_image_format="JPEG", export_jpeg_quality=85)
