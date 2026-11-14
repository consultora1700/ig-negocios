"""Vehículos de reparto modelados por código (Blender 4.2): auto sedán y utilitario tipo Kangoo/Partner.
Carrocería por secciones transversales (superelipses) a lo largo del largo del auto, suavizada; vidrios, faros, parrilla,
espejos, líneas de puertas y ruedas con llanta de rayos. Eje: el auto mira hacia -Y (adelante), Z arriba, origen en el piso.
Uso: from vehiculos import sedan, utilitario;  g = sedan("auto", "#B8C2CC")"""
import bpy, bmesh, math
from mathutils import Vector
from personaje import mat, hex2lin

def _pintura(color):
    m = bpy.data.materials.new("pintura" + color); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*hex2lin(color), 1); b.inputs["Metallic"].default_value = 0.35; b.inputs["Roughness"].default_value = 0.32
    b.inputs["Coat Weight"].default_value = 0.8; b.inputs["Coat Roughness"].default_value = 0.05
    return m

def _carroceria(nombre, secciones, material, seg=32, expo=3.2, sub=2):
    """secciones: [(y, ancho/2, z_piso, z_techo, redondez_arriba)] → malla tubular cerrada en los extremos."""
    me = bpy.data.meshes.new(nombre); bm = bmesh.new(); anillos = []
    for y, rx, z0, z1, ra in secciones:
        cz, rz = (z0 + z1) / 2, (z1 - z0) / 2; r = []
        for i in range(seg):
            a = i * 2 * math.pi / seg; c, s = math.cos(a), math.sin(a)
            e = expo if s < 0 else expo * ra   # arriba más redondeado
            x = rx * math.copysign(abs(c) ** (2 / e), c); z = cz + rz * math.copysign(abs(s) ** (2 / e), s)
            if s > 0: x *= 1 - 0.18 * s ** 2   # el techo se angosta (tumblehome)
            r.append(bm.verts.new((x, y, z)))
        anillos.append(r)
    for a, b in zip(anillos, anillos[1:]):
        for i in range(seg): bm.faces.new((a[i], a[(i + 1) % seg], b[(i + 1) % seg], b[i]))
    bm.faces.new(list(reversed(anillos[0]))); bm.faces.new(anillos[-1])
    bm.normal_update(); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(nombre, me); bpy.context.scene.collection.objects.link(o); me.materials.append(material)
    for p in me.polygons: p.use_smooth = True
    s = o.modifiers.new("sub", "SUBSURF"); s.levels = sub; s.render_levels = sub
    return o

def _caja(nombre, tam, m, loc, rot=(0, 0, 0), bisel=0.3, padre=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.name = nombre; o.scale = tam
    bpy.ops.object.transform_apply(scale=True)
    bv = o.modifiers.new("b", "BEVEL"); bv.width = min(tam) * bisel; bv.segments = 3; o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = True
    if padre: o.parent = padre
    return o

def _rueda(nombre, r, ancho, loc, padre):
    g = bpy.data.objects.new(nombre, None); bpy.context.scene.collection.objects.link(g); g.location = loc; g.parent = padre
    goma, llanta = mat("goma", "#1A1A1C", rough=0.85), mat("llanta", "#C9CDD3", rough=0.25, metal=0.9)
    bpy.ops.mesh.primitive_torus_add(major_radius=r * 0.78, minor_radius=r * 0.24, major_segments=40, minor_segments=14, location=(0, 0, 0), rotation=(0, math.pi / 2, 0))
    t = bpy.context.object; t.name = nombre + ".cubierta"; t.scale = (1, 1, ancho / (r * 0.48)); t.data.materials.append(goma); t.parent = g
    for p in t.data.polygons: p.use_smooth = True
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=r * 0.6, depth=ancho * 0.7, rotation=(0, math.pi / 2, 0)); l = bpy.context.object; l.name = nombre + ".llanta"; l.data.materials.append(llanta); l.parent = g
    for k in range(5):   # rayos
        a = k * 2 * math.pi / 5
        bpy.ops.mesh.primitive_cube_add(size=1, location=(ancho * 0.36, math.cos(a) * r * 0.3, math.sin(a) * r * 0.3), rotation=(a, 0, 0))
        e = bpy.context.object; e.scale = (0.03, 0.09, r * 0.55); e.data.materials.append(llanta); e.parent = g
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=r * 0.16, depth=ancho * 0.75, rotation=(0, math.pi / 2, 0)); c = bpy.context.object; c.data.materials.append(mat("maza", "#2A2C30", rough=0.4, metal=0.6)); c.parent = g
    return g

def _detalles(raiz, L, A, z_luces, frente_y, atras_y, z_paragolpe):
    """Faros, luces traseras, parrilla, paragolpes y patente."""
    faro = mat("faro", "#F4F6F8", rough=0.05, emis="#FFFFFF", fuerza=0.6); trasera = mat("trasera", "#B3121E", rough=0.2, emis="#7A0A10", fuerza=0.4)
    negro = mat("plastico", "#1E2024", rough=0.6); patente = mat("patente", "#F2F2F2", rough=0.4)
    for s in (-1, 1):
        _caja(f"faro{s}", (A * 0.22, 0.06, 0.1), faro, (s * A * 0.33, frente_y - 0.01, z_luces), bisel=0.4, padre=raiz)
        _caja(f"trasera{s}", (A * 0.18, 0.05, 0.12), trasera, (s * A * 0.35, atras_y + 0.01, z_luces + 0.05), bisel=0.4, padre=raiz)
    _caja("parrilla", (A * 0.42, 0.05, 0.14), negro, (0, frente_y - 0.005, z_luces - 0.12), bisel=0.4, padre=raiz)
    _caja("paragolpe_d", (A * 0.98, 0.12, 0.2), negro, (0, frente_y + 0.03, z_paragolpe), bisel=0.45, padre=raiz)
    _caja("paragolpe_t", (A * 0.98, 0.12, 0.2), negro, (0, atras_y - 0.03, z_paragolpe), bisel=0.45, padre=raiz)
    _caja("patente_d", (0.4, 0.02, 0.12), patente, (0, frente_y - 0.04, z_paragolpe), bisel=0.2, padre=raiz)
    _caja("patente_t", (0.4, 0.02, 0.12), patente, (0, atras_y + 0.04, z_paragolpe + 0.12), bisel=0.2, padre=raiz)

def sedan(nombre, color="#B8C2CC"):
    """Sedán chico (tipo Cronos/Onix): 4,35 m de largo."""
    raiz = bpy.data.objects.new(nombre, None); bpy.context.scene.collection.objects.link(raiz)
    L, A = 4.35, 1.74; y0 = -L / 2
    # perfil lateral: y, medio ancho, z piso, z techo, redondez
    S = [(0.00, 0.80, 0.30, 0.66, 1.0), (0.15, 0.86, 0.26, 0.78, 1.0), (0.55, 0.87, 0.25, 0.86, 1.0), (1.05, 0.87, 0.25, 0.92, 1.0),
         (1.45, 0.86, 0.25, 1.30, 0.6), (1.85, 0.85, 0.25, 1.45, 0.5), (2.55, 0.85, 0.25, 1.47, 0.5), (3.05, 0.86, 0.25, 1.36, 0.6),
         (3.45, 0.87, 0.26, 1.04, 1.0), (4.05, 0.86, 0.28, 1.00, 1.0), (4.35, 0.80, 0.33, 0.92, 1.0)]
    cuerpo = _carroceria(nombre + ".carroceria", [(y0 + y, rx, z0, z1, ra) for y, rx, z0, z1, ra in S], _pintura(color)); cuerpo.parent = raiz
    # vidrios: la "cabina" un poco más grande, solo en la franja de ventanas
    V = [(1.40, 0.80, 0.98, 1.28, 0.6), (1.85, 0.80, 0.97, 1.43, 0.5), (2.55, 0.80, 0.97, 1.45, 0.5), (3.05, 0.81, 0.98, 1.34, 0.6), (3.30, 0.82, 1.0, 1.12, 0.8)]
    vid = mat("vidrio_auto", "#1F2A36", rough=0.05, metal=0.3)
    cab = _carroceria(nombre + ".vidrios", [(y0 + y, rx + 0.015, z0, z1 + 0.012, ra) for y, rx, z0, z1, ra in V], vid, sub=2); cab.parent = raiz
    for s in (-1, 1):   # parantes y líneas de puertas
        _caja(f"{nombre}.parante{s}", (0.02, 0.08, 0.45), mat("plastico", "#1E2024", rough=0.6), (s * 0.83, y0 + 2.2, 1.2), rot=(0.1, 0, 0), padre=raiz)
        _caja(f"{nombre}.puerta{s}", (0.005, 0.012, 0.55), mat("junta", "#2A2E35", rough=0.5), (s * 0.875, y0 + 2.25, 0.62), padre=raiz)
        _caja(f"{nombre}.espejo{s}", (0.18, 0.08, 0.1), _pintura(color), (s * 0.97, y0 + 1.55, 1.02), padre=raiz)
        for k, yy in enumerate((0.78, 3.35)):
            _rueda(f"{nombre}.rueda{s}{k}", 0.32, 0.21, (s * 0.76, y0 + yy, 0.32), raiz)
    _detalles(raiz, L, A, 0.72, y0, y0 + L, 0.4)
    return raiz

def utilitario(nombre, color="#E9EBEE"):
    """Utilitario chico (tipo Kangoo/Partner): 4,3 m, techo alto y caja de carga."""
    raiz = bpy.data.objects.new(nombre, None); bpy.context.scene.collection.objects.link(raiz)
    L, A = 4.3, 1.8; y0 = -L / 2
    S = [(0.00, 0.82, 0.32, 0.72, 1.0), (0.15, 0.88, 0.28, 0.86, 1.0), (0.60, 0.90, 0.27, 1.00, 1.0), (1.05, 0.90, 0.27, 1.25, 0.8),
         (1.45, 0.90, 0.27, 1.72, 0.45), (1.85, 0.90, 0.27, 1.84, 0.35), (3.80, 0.90, 0.27, 1.84, 0.35), (4.20, 0.89, 0.29, 1.80, 0.4), (4.30, 0.86, 0.32, 1.74, 0.5)]
    cuerpo = _carroceria(nombre + ".carroceria", [(y0 + y, rx, z0, z1, ra) for y, rx, z0, z1, ra in S], _pintura(color), expo=4.0); cuerpo.parent = raiz
    V = [(1.10, 0.84, 1.0, 1.24, 0.8), (1.45, 0.84, 1.0, 1.66, 0.5), (1.90, 0.84, 1.0, 1.74, 0.4), (2.35, 0.84, 1.0, 1.74, 0.4)]
    vid = mat("vidrio_auto", "#1F2A36", rough=0.05, metal=0.3)
    cab = _carroceria(nombre + ".vidrios", [(y0 + y, rx + 0.075, z0, z1 + 0.01, ra) for y, rx, z0, z1, ra in V], vid, expo=4.0); cab.parent = raiz
    for s in (-1, 1):
        _caja(f"{nombre}.puerta{s}", (0.005, 0.012, 0.75), mat("junta", "#2A2E35", rough=0.5), (s * 0.905, y0 + 2.45, 0.85), padre=raiz)
        _caja(f"{nombre}.corrediza{s}", (0.005, 0.9, 0.012), mat("junta", "#2A2E35", rough=0.5), (s * 0.905, y0 + 2.95, 1.62), padre=raiz)
        _caja(f"{nombre}.espejo{s}", (0.2, 0.08, 0.14), mat("plastico", "#1E2024", rough=0.6), (s * 1.0, y0 + 1.5, 1.1), padre=raiz)
        _caja(f"{nombre}.zocalo{s}", (0.02, 2.4, 0.16), mat("plastico", "#1E2024", rough=0.6), (s * 0.91, y0 + 2.3, 0.42), padre=raiz)
        for k, yy in enumerate((0.8, 3.45)):
            _rueda(f"{nombre}.rueda{s}{k}", 0.32, 0.22, (s * 0.78, y0 + yy, 0.32), raiz)
    _detalles(raiz, L, A, 0.78, y0, y0 + L, 0.42)
    return raiz
