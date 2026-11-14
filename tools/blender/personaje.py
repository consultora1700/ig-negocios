"""Personajes estilo maniquí (cabeza ovalada sin cara, pelo en casco, ropa con volumen) para Blender 4.2.
Cada parte es una malla redondeada colgada de un "hueso" (empty) para poder posar y animar sin deformar mallas.
Uso: from personaje import Persona;  p = Persona("cajera", ropa={...}); p.pose(...)."""
import bpy, bmesh, math
from mathutils import Vector, Euler

# ---------- materiales ----------
_mats = {}
def mat(nombre, color, rough=0.75, sss=0.0, sheen=0.0, metal=0.0, coat=0.0, emis=None, fuerza=0.0):
    k = (nombre, color, rough, sss, sheen, metal, coat, emis, fuerza)
    if k in _mats: return _mats[k]
    m = bpy.data.materials.new(nombre); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*hex2lin(color), 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if sss:
        b.inputs["Subsurface Weight"].default_value = sss
        b.inputs["Subsurface Radius"].default_value = (1.0, 0.45, 0.3)
        b.inputs["Subsurface Scale"].default_value = 0.025
    if sheen: b.inputs["Sheen Weight"].default_value = sheen
    if coat: b.inputs["Coat Weight"].default_value = coat
    if emis:
        b.inputs["Emission Color"].default_value = (*hex2lin(emis), 1); b.inputs["Emission Strength"].default_value = fuerza
    _mats[k] = m; return m

def hex2lin(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)

# ---------- primitivas redondeadas ----------
def _obj(nombre, me, material, padre=None, loc=(0, 0, 0), rot=(0, 0, 0), sub=2, liso=True):
    o = bpy.data.objects.new(nombre, me); bpy.context.scene.collection.objects.link(o)
    if material: o.data.materials.append(material)
    if liso:
        for p in o.data.polygons: p.use_smooth = True
    if sub:
        s = o.modifiers.new("sub", "SUBSURF"); s.levels = sub; s.render_levels = sub
    o.location = loc; o.rotation_euler = rot
    if padre: o.parent = padre
    return o

def caja(nombre, tam, material, padre=None, loc=(0, 0, 0), rot=(0, 0, 0), bisel=0.3, sub=2, afinar=None):
    """Caja redondeada: tam=(x,y,z). afinar=(escala_arriba_x, escala_arriba_y) para torsos/piernas."""
    me = bpy.data.meshes.new(nombre); bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.subdivide_edges(bm, edges=[e for e in bm.edges if abs((e.verts[0].co - e.verts[1].co).z) > 0.5], cuts=2, use_grid_fill=True)
    for v in bm.verts:
        v.co.x *= tam[0]; v.co.y *= tam[1]; v.co.z *= tam[2]
        if afinar:
            u = v.co.z / tam[2] + 0.5
            v.co.x *= 1 + (afinar[0] - 1) * u; v.co.y *= 1 + (afinar[1] - 1) * u
    bm.to_mesh(me); bm.free()
    o = _obj(nombre, me, material, padre, loc, rot, sub=0)
    bv = o.modifiers.new("bisel", "BEVEL"); bv.width = min(tam) * bisel; bv.segments = 3; bv.limit_method = "NONE"
    if sub:
        s = o.modifiers.new("sub", "SUBSURF"); s.levels = sub; s.render_levels = sub
    return o

def esfera(nombre, r, material, padre=None, loc=(0, 0, 0), esc=(1, 1, 1), sub=1):
    me = bpy.data.meshes.new(nombre); bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=16, radius=r)
    for v in bm.verts: v.co.x *= esc[0]; v.co.y *= esc[1]; v.co.z *= esc[2]
    bm.to_mesh(me); bm.free()
    return _obj(nombre, me, material, padre, loc, sub=sub)

def capsula(nombre, r1, r2, largo, material, padre=None, loc=(0, 0, 0), rot=(0, 0, 0)):
    """Cilindro con puntas redondeadas que cuelga hacia -Z desde su origen (como un hueso)."""
    me = bpy.data.meshes.new(nombre); bm = bmesh.new()
    seg = 20; anillos = []
    for k in range(5):
        u = k / 4; r = r1 + (r2 - r1) * u; z = -largo * u
        anillos.append([bm.verts.new((math.cos(a) * r, math.sin(a) * r, z)) for a in [i * 2 * math.pi / seg for i in range(seg)]])
    for a, b in zip(anillos, anillos[1:]):
        for i in range(seg): bm.faces.new((a[i], a[(i + 1) % seg], b[(i + 1) % seg], b[i]))
    top = bm.verts.new((0, 0, r1 * 0.55)); bot = bm.verts.new((0, 0, -largo - r2 * 0.55))
    for i in range(seg):
        bm.faces.new((anillos[0][(i + 1) % seg], anillos[0][i], top)); bm.faces.new((anillos[-1][i], anillos[-1][(i + 1) % seg], bot))
    bm.normal_update(); bm.to_mesh(me); bm.free()
    return _obj(nombre, me, material, padre, loc, rot, sub=2)

def loft(nombre, secs, material, padre=None, loc=(0, 0, 0), expo=2.6, seg=28, cerrar=(True, True), sub=2):
    """Malla por secciones horizontales: secs = [(z, rx, ry, dy)], cortes tipo superelipse (ropa con forma)."""
    me = bpy.data.meshes.new(nombre); bm = bmesh.new(); anillos = []
    for z, rx, ry, dy in secs:
        r = []
        for i in range(seg):
            a = i * 2 * math.pi / seg; c, s_ = math.cos(a), math.sin(a)
            x = rx * math.copysign(abs(c) ** (2 / expo), c); y = ry * math.copysign(abs(s_) ** (2 / expo), s_) + dy
            r.append(bm.verts.new((x, y, z)))
        anillos.append(r)
    for a, b in zip(anillos, anillos[1:]):
        for i in range(seg): bm.faces.new((a[i], a[(i + 1) % seg], b[(i + 1) % seg], b[i]))
    if cerrar[0]: bm.faces.new(list(reversed(anillos[0])))
    if cerrar[1]: bm.faces.new(anillos[-1])
    bm.normal_update(); bm.to_mesh(me); bm.free()
    return _obj(nombre, me, material, padre, loc, sub=sub)

def hueso(nombre, padre=None, loc=(0, 0, 0)):
    e = bpy.data.objects.new(nombre, None); bpy.context.scene.collection.objects.link(e)
    e.empty_display_size = 0.05; e.location = loc; e.rotation_mode = "XYZ"
    if padre: e.parent = padre
    return e

# ---------- persona ----------
PIEL = "#C69A72"
class Persona:
    """ropa: camisa, pantalon, zapatos, pelo, (opcional) campera=True para inflada, delantal=color, cuello=color."""
    def __init__(self, nombre, ropa, alto=1.0, pelo_forma="corto"):
        self.n = nombre; R = ropa
        piel = mat("piel", R.get("piel", PIEL), rough=0.5, sss=0.18)
        tela = mat(f"camisa-{R['camisa']}", R["camisa"], rough=0.82, sheen=0.25)
        pant = mat(f"pantalon-{R['pantalon']}", R["pantalon"], rough=0.85, sheen=0.2)
        zap = mat(f"zapato-{R['zapatos']}", R["zapatos"], rough=0.45, coat=0.2)
        suela = mat("suela", "#EDEAE4", rough=0.6)
        pelo = mat(f"pelo-{R['pelo']}", R["pelo"], rough=0.42, sheen=0.4)
        H = {}
        H["raiz"] = hueso(f"{nombre}.raiz"); H["raiz"].scale = (alto, alto, alto)
        H["pelvis"] = hueso(f"{nombre}.pelvis", H["raiz"], (0, 0, 0.93))
        H["pecho"] = hueso(f"{nombre}.pecho", H["pelvis"], (0, 0, 0.12))
        H["cuello"] = hueso(f"{nombre}.cuello", H["pecho"], (0, 0, 0.47))
        # cabeza ovalada sin cara + pelo
        esfera(f"{nombre}.cabeza", 0.126, piel, H["cuello"], (0, 0.0, 0.135), (0.93, 0.97, 1.16), sub=2)
        capsula(f"{nombre}.cuellito", 0.042, 0.046, 0.07, piel, H["cuello"], (0, 0, 0.05))
        self._pelo(nombre, pelo, H["cuello"], pelo_forma)
        # torso con hombros más anchos que la cintura
        inflada = R.get("campera")
        g = 1.12 if inflada else 1.0
        # secciones del torso: (z, medio ancho, medio fondo, corrimiento y)
        TS = [(-0.06, 0.155, 0.1, 0), (0.06, 0.15, 0.098, 0), (0.2, 0.162, 0.108, -0.004), (0.32, 0.178, 0.112, -0.006), (0.41, 0.19, 0.105, 0), (0.46, 0.17, 0.09, 0.005), (0.49, 0.09, 0.06, 0.008)]
        loft(f"{nombre}.torso", [(z, rx * g, ry * g, dy) for z, rx, ry, dy in TS], tela, H["pecho"], expo=2.4)
        if inflada:  # anillos de campera inflada
            for k, z in enumerate((0.0, 0.11, 0.22, 0.33)):
                rx = [t for t in TS if t[0] >= z][0]
                loft(f"{nombre}.anillo{k}", [(z - 0.03, rx[1] * g * 1.0, rx[2] * g * 1.0, 0), (z, rx[1] * g * 1.08, rx[2] * g * 1.11, 0), (z + 0.03, rx[1] * g * 1.0, rx[2] * g * 1.0, 0)], tela, H["pecho"], expo=2.4, cerrar=(False, False), sub=1)
        if R.get("cuello"):
            caja(f"{nombre}.cuellocamisa", (0.13, 0.11, 0.05), mat("cuello", R["cuello"], rough=0.8), H["pecho"], (0, 0.01, 0.45), bisel=0.4, sub=1)
        if R.get("delantal"):
            dm = mat("delantal", R["delantal"], rough=0.7, sheen=0.2)
            caja(f"{nombre}.delantal", (0.3, 0.02, 0.62), dm, H["pecho"], (0, -0.11 * g, 0.0), bisel=0.3, sub=1)
            for s in (-1, 1): caja(f"{nombre}.tira{s}", (0.025, 0.02, 0.26), dm, H["pecho"], (s * 0.085, -0.105, 0.38), (0.05, 0, -s * 0.12), bisel=0.4, sub=1)
        # cadera y cinturón
        loft(f"{nombre}.cadera", [(-0.12, 0.15, 0.09, 0), (-0.02, 0.165, 0.1, 0), (0.07, 0.158, 0.1, 0), (0.1, 0.155, 0.1, 0)], pant, H["pelvis"], expo=2.4)
        loft(f"{nombre}.cinto", [(0.075, 0.161, 0.104, 0), (0.105, 0.161, 0.104, 0)], mat("cinto", "#1C1C1E", rough=0.4), H["pelvis"], expo=2.4, sub=1)
        # piernas
        for s, lado in ((1, "I"), (-1, "D")):
            H[f"cadera{lado}"] = hueso(f"{nombre}.cadera{lado}", H["pelvis"], (s * 0.08, 0, -0.06))
            capsula(f"{nombre}.muslo{lado}", 0.082, 0.064, 0.4, pant, H[f"cadera{lado}"])
            H[f"rodilla{lado}"] = hueso(f"{nombre}.rodilla{lado}", H[f"cadera{lado}"], (0, 0, -0.4))
            capsula(f"{nombre}.pierna{lado}", 0.064, 0.056, 0.4, pant, H[f"rodilla{lado}"])
            esfera(f"{nombre}.rodillera{lado}", 0.062, pant, H[f"rodilla{lado}"], (0, 0, 0.0), sub=1)
            H[f"tobillo{lado}"] = hueso(f"{nombre}.tobillo{lado}", H[f"rodilla{lado}"], (0, 0, -0.41))
            caja(f"{nombre}.zapato{lado}", (0.1, 0.25, 0.09), zap, H[f"tobillo{lado}"], (0, -0.05, -0.03), bisel=0.45, sub=2)
            caja(f"{nombre}.suela{lado}", (0.1, 0.245, 0.025), suela, H[f"tobillo{lado}"], (0, -0.045, -0.075), bisel=0.4, sub=1)
        # brazos con manga, puño y mano con dedos
        manga_corta = R.get("manga_corta")
        for s, lado in ((1, "I"), (-1, "D")):
            H[f"hombro{lado}"] = hueso(f"{nombre}.hombro{lado}", H["pecho"], (s * 0.195 * g, 0, 0.395))
            esfera(f"{nombre}.hombrera{lado}", 0.072 * g, tela, H[f"hombro{lado}"], (0, 0, -0.01), sub=1)
            capsula(f"{nombre}.brazo{lado}", 0.064 * g, 0.054 * g, 0.27, tela, H[f"hombro{lado}"])
            H[f"codo{lado}"] = hueso(f"{nombre}.codo{lado}", H[f"hombro{lado}"], (0, 0, -0.28))
            esfera(f"{nombre}.codera{lado}", 0.05 * g, piel if manga_corta else tela, H[f"codo{lado}"], (0, 0, 0.0), sub=1)
            capsula(f"{nombre}.antebrazo{lado}", 0.052 * g, 0.043 * (g if not manga_corta else 1), 0.24, piel if manga_corta else tela, H[f"codo{lado}"])
            if not manga_corta:
                caja(f"{nombre}.puno{lado}", (0.095 * g, 0.095 * g, 0.04), tela, H[f"codo{lado}"], (0, 0, -0.235), bisel=0.5, sub=2)
            H[f"muneca{lado}"] = hueso(f"{nombre}.muneca{lado}", H[f"codo{lado}"], (0, 0, -0.26))
            self._mano(nombre + lado, piel, H[f"muneca{lado}"], s)
        self.H = H

    def _pelo(self, n, m, padre, forma):
        me = bpy.data.meshes.new(n + ".pelo"); bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=20, radius=0.136)
        corte = []
        for v in bm.verts:
            v.co.x *= 0.98; v.co.y *= 1.02; v.co.z *= 1.17
            # línea del corte: alta en la frente (-y), baja en la nuca (+y)
            lim = 0.03 + (-v.co.y) * 0.55 if forma != "largo" else -0.02 + (-v.co.y) * 0.9
            if v.co.z < lim: corte.append(v)
        bmesh.ops.delete(bm, geom=corte, context="VERTS")
        bm.to_mesh(me); bm.free()
        o = _obj(n + ".pelo", me, m, padre, (0, 0.012, 0.145), sub=0)
        so = o.modifiers.new("grosor", "SOLIDIFY"); so.thickness = 0.026; so.offset = 1
        s = o.modifiers.new("sub", "SUBSURF"); s.levels = 2; s.render_levels = 2
        if forma == "rulos":
            d = o.modifiers.new("rulos", "DISPLACE"); t = bpy.data.textures.new(n + ".rulos", "VORONOI"); t.noise_scale = 0.03; d.texture = t; d.strength = 0.012

    def _mano(self, n, piel, padre, s):
        # palma, pulgar y cuatro dedos levemente curvos
        caja(n + ".palma", (0.075, 0.03, 0.08), piel, padre, (0, 0, -0.04), bisel=0.45, sub=2)
        capsula(n + ".pulgar", 0.012, 0.011, 0.045, piel, padre, (s * 0.035, -0.012, -0.02), (0.3, 0, s * 0.7))
        for k in range(4):
            x = (k - 1.5) * 0.019
            capsula(f"{n}.dedo{k}", 0.0105, 0.0095, 0.05 - abs(k - 1.5) * 0.006, piel, padre, (x, 0, -0.078), (-0.25, 0, 0))

    # ---------- poses ----------
    def poner(self, loc=(0, 0, 0), giro=0.0):
        self.H["raiz"].location = loc; self.H["raiz"].rotation_euler = (0, 0, giro)

    def rotar(self, h, x=0, y=0, z=0):
        self.H[h].rotation_euler = Euler((x, y, z))

    def caminar(self, fase, amplitud=1.0):
        """fase en ciclos (0..1 = un paso doble)."""
        a = math.sin(fase * 2 * math.pi) * 0.42 * amplitud
        self.rotar("caderaI", a); self.rotar("caderaD", -a)
        self.rotar("rodillaI", max(0, -math.sin(fase * 2 * math.pi + 1.2)) * 0.7 * amplitud)
        self.rotar("rodillaD", max(0, math.sin(fase * 2 * math.pi + 1.2)) * 0.7 * amplitud)
        self.rotar("hombroI", -a * 0.8, 0, 0.08); self.rotar("hombroD", a * 0.8, 0, -0.08)
        self.rotar("codoI", -0.25); self.rotar("codoD", -0.25)
        self.H["pelvis"].location.z = 0.93 + abs(math.cos(fase * 2 * math.pi)) * 0.025 * amplitud
        self.rotar("pecho", 0, 0, a * 0.12)

    def parado(self, t=0.0):
        r = math.sin(t * 1.3) * 0.015
        self.rotar("hombroI", 0, 0, 0.06); self.rotar("hombroD", 0, 0, -0.06)
        self.rotar("codoI", -0.12); self.rotar("codoD", -0.12)
        self.rotar("pecho", r, 0, 0)

    def keyframe(self, f):
        for h in self.H.values():
            h.keyframe_insert("rotation_euler", frame=f); h.keyframe_insert("location", frame=f)
