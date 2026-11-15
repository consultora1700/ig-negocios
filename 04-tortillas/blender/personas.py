"""Elenco del reel 04 (tortillas): crea, anima y exporta cada personaje a un glb.
blender -b -P personas.py -- --salida DIR [--muestra 1]   (con --muestra además renderiza una foto de estudio)"""
import bpy, sys, os, math
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
sys.path.insert(0, os.path.join(RAIZ, "tools", "blender"))
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
opt = {args[i].lstrip("-"): args[i + 1] for i in range(0, len(args) - 1, 2)}
SAL = opt.get("salida", "/tmp/personas"); os.makedirs(SAL, exist_ok=True)
bpy.ops.wm.read_homefile(use_empty=True)
from humano import crear, animar, exportar, parado
from personaje import mat, hex2lin
ELENCO = {
 # Martín: remera, jean y zapatillas reales (sin recortar un traje: así no se pierden los brazos)
 "martin": (dict(genero=1.0, edad=0.36, peso=0.55, musculo=0.55, ropa=["toigo_basic_tucked_t-shirt", "punkduck_male_classic_jeans", "punkduck_comfortable_sneakers"],
                 colores={"toigo_basic_tucked_t-shirt": "#B8322B", "punkduck_male_classic_jeans": "#2E4566", "punkduck_comfortable_sneakers": "#E8E8E8"}, pelo="#2A1A12", pelo_forma="corto"), ["embalar", "atender", "entregar"]),
 "vecina": (dict(genero=0.0, edad=0.45, peso=0.55, ropa=["elvs_ladies_tank1", "elvs_jeans_straight_leg", "toigo_flats"], colores={"elvs_ladies_tank1": "#2F6B8F", "elvs_jeans_straight_leg": "#34496A", "toigo_flats": "#3A2A20"}, pelo="#3B2416", pelo_forma="largo"), []),
 "obrero": (dict(genero=1.0, edad=0.5, peso=0.62, musculo=0.6, ropa=["male_worksuit01", "culturalibre_male_boots"], colores={"male_worksuit01": "#3E5A7A", "culturalibre_male_boots": "#3A2C22"}, pelo="#4A4A4A", pelo_forma="corto"), []),
}
arms = {}
for n, (cfg, extras) in ELENCO.items():
    a = crear(n, cfg); animar(a, extras); arms[n] = a
for i, (n, a) in enumerate(arms.items()):
    a.location = ((i - 1.5) * 0.9, 0, 0); a.rotation_euler = (0, 0, 0.3 - i * 0.2)
if opt.get("muestra"):
    sc = bpy.context.scene
    for a in arms.values(): parado(a)
    sc.render.engine = "CYCLES"; sc.cycles.samples = 32; sc.cycles.use_denoising = True
    sc.render.resolution_x = 1920; sc.render.resolution_y = 1080; sc.render.resolution_percentage = 60
    sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (*hex2lin("#C9C2B6"), 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.5
    bpy.ops.mesh.primitive_plane_add(size=40); bpy.context.object.data.materials.append(mat("piso", "#BDB6AA", rough=0.9))
    for nm, loc, rot, en, col in (("k", (-3, -4, 5), (50, 0, -35), 900, "#FFE4C4"), ("f", (4, -3, 3), (65, 0, 50), 250, "#B9CCFF")):
        l = bpy.data.lights.new(nm, "AREA"); l.size = 4; l.energy = en; l.color = hex2lin(col); o = bpy.data.objects.new(nm, l); sc.collection.objects.link(o)
        o.location = loc; o.rotation_euler = tuple(math.radians(x) for x in rot)
    cd = bpy.data.cameras.new("c"); cd.lens = 50; cam = bpy.data.objects.new("c", cd); sc.collection.objects.link(cam); sc.camera = cam
    cam.location = (0.4, -6.6, 1.05); cam.rotation_euler = (math.radians(88), 0, math.radians(3))
    sc.render.filepath = os.path.join(SAL, "elenco.png"); bpy.ops.render.render(write_still=True)
    for a in arms.values():
        for pb in a.pose.bones: pb.matrix_basis.identity()
for i, (n, a) in enumerate(arms.items()):
    a.location = (0, 0, 0); a.rotation_euler = (0, 0, 0)
    for o in bpy.context.scene.objects:
        o.hide_set(False)
    exportar(a, os.path.join(SAL, n + ".glb")); print("exportado", n, flush=True)
print("LISTO")
