// Reel 04 «Tortillas en la calle: ¿cuánto deja?» — mundo 3D.
// Esquina de la calle horneada (zona A del reel 03) con el puesto de Martín armado en tiempo real; cocina de madrugada en el escenario oscuro (x = 120).
// Escenario con texturas reales y luz horneada aparte (horneado/set.glb: TEXCOORD_0 textura, TEXCOORD_1 luz; horneado/luz/*.hdr).
// En tiempo real: personajes MPFB (pistas parado, caminar, cargar, entregar, embalar), autos Kenney, cajas y objetos de Poly Haven,
// cajas que viajan por las cintas y la mesa con las dos rutas. Ejes Three: X derecha, Y arriba, +Z hacia la cámara.
import * as THREE from "./lib/three.module.min.js";
import { GLTFLoader } from "./lib/GLTFLoader.js";
import { RGBELoader } from "./lib/RGBELoader.js";
import * as SkeletonUtils from "./lib/SkeletonUtils.js";
import { RoundedBoxGeometry } from "./lib/RoundedBoxGeometry.js";

export const W = 1080, H = 1920;
// Tiempos anclados a la voz (voz/voz-palabras.json)
export const T = {
  hook: 0.0, martin: 3.9, parrilla: 6.4, s120: 7.6, gazebo: 9.2, s290: 10.6, harina: 11.7, s22: 14.1, grasa: 15.2, carbon: 15.7, chicha: 16.3, calle: 17.1, medio: 18.5,
  amasar: 20.9, s200: 24.9, dias4: 26.2, comun: 27.9, s2500: 28.8, s3000: 30.7, s300: 32.6,
  dia1: 34.4, v50: 35.4, entran: 36.3, gasta: 41.1, quedan: 42.4, solo: 44.1,
  semana: 45.6, lunes: 47.2, sabado: 48.6, llueve: 50.5, cero: 52.2, basura: 52.8,
  mes: 54.5, m40: 56.9, m50: 60.4, m60: 62.3, m100: 64.6, m4: 67.4,
  nadie: 69.1, seis: 71.5, s15: 74.0, antes: 75.5, cuatro: 80.9, s9200: 82.8,
  decomiso: 85.8, pierde: 88.1, pgazebo: 89.2, pmerca: 90.3, metodo: 92.2, conta: 94.6, guarda: 97.8, mandaselo: 100.1, seguime: 101.9, fin: 107.3,
};
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const eo = (u) => 1 - Math.pow(1 - clamp(u), 3);
const mix = (a, b, u) => a + (b - a) * u;
let seed = 31; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene(); scene.background = new THREE.Color("#000000");
const cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 400);
const std = (c, r = 0.75, m = 0, e) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...(e ? { emissive: e, emissiveIntensity: 1 } : {}) });
function tex(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

// ---------- escenario: textura real × luz horneada ----------
const gl = new GLTFLoader(), hdr = new RGBELoader();
const carga = (u) => new Promise((ok, mal) => gl.load(u, ok, undefined, mal));
const [gSet, luces, indice] = await Promise.all([carga("assets/horneado/set.glb"), fetch("assets/horneado/luces.json").then((r) => r.json()), fetch("assets/horneado/luz/indice.json").then((r) => r.json())]);
const mapas = {};
await Promise.all(Object.keys(indice).map((n) => new Promise((ok) => hdr.load(`assets/horneado/luz/${encodeURIComponent(n)}.hdr`, (t) => {
  t.flipY = false; t.colorSpace = THREE.LinearSRGBColorSpace; t.channel = 1; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true;
  mapas[n.replace(/[.:\/\[\]]/g, "")] = t; ok(); }, undefined, () => ok()))));
const set = gSet.scene; scene.add(set);
set.traverse((o) => {
  if (!o.isMesh) return; const lm = mapas[o.name] || mapas[o.parent?.name]; const src = o.material;
  const tieneUv1 = !!o.geometry.attributes.uv1; if (lm && !tieneUv1) lm.channel = 0;
  o.material = new THREE.MeshBasicMaterial({ map: src.map || null, color: src.color || new THREE.Color("#999999"), lightMap: lm || null, lightMapIntensity: Math.PI,
    transparent: src.transparent, alphaTest: src.alphaTest || 0 });
  if (src.emissive && src.emissive.getHex() && !src.map) o.material.color = src.emissive.clone().multiplyScalar(1 + (src.emissiveIntensity || 0) * 0.3);
  o.castShadow = true;
});
const sombraPiso = (w, d, y, x, z, op = 0.3) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.ShadowMaterial({ opacity: op, color: "#14100C" })); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); p.receiveShadow = true; scene.add(p); };
sombraPiso(30, 6, 0.006, 0, 4); sombraPiso(30, 3.2, 0.156, 0, -0.55); sombraPiso(26, 18, 0.006, 60, -4, 0.35); sombraPiso(22, 16, 0.006, -60, -2);

// ---------- luces en tiempo real (copian el horneado) ----------
scene.add(new THREE.HemisphereLight("#C6D6F2", "#8A7C6A", 1.05));
const sol = new THREE.DirectionalLight("#FFE6C8", 3.0); scene.add(sol, sol.target);
sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); Object.assign(sol.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 80 }); sol.shadow.radius = 8; sol.shadow.blurSamples = 16; sol.shadow.bias = -0.0006;
const SOL_DIR = new THREE.Vector3(-6, 12, 8).normalize().multiplyScalar(30);
for (const l of luces.luces) if (l.tipo === "AREA") { const p = new THREE.PointLight(new THREE.Color(...l.color), l.energia * 0.02, 10, 2); p.position.set(l.pos[0], l.pos[2] - 0.5, -l.pos[1]); scene.add(p); }

// ---------- objetos en tiempo real ----------
const props = {};
await Promise.all([["sedan", "assets/props/sedan.glb"], ["hidrante", "assets/props/fire_hydrant/fire_hydrant.gltf"], ["tacho", "assets/props/metal_trash_can/metal_trash_can.gltf"]]
  .map(async ([k, u]) => { props[k] = (await carga(u)).scene; }));
function poner(k, x, y, z, ry = 0, esc = 1) { const o = props[k].clone(true); o.position.set(x, y, z); o.rotation.y = ry; o.scale.setScalar(esc); o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); scene.add(o); return o; }
poner("sedan", 7.5, 0, 2.2, Math.PI / 2, 1.75); poner("hidrante", 4.2, 0.15, 0.4, 0, 1.0); poner("tacho", -7.4, 0.15, -1.6, 0, 0.8);
const VEREDA = 0.15;
const PX = -0.2, PZ = -0.85;   // centro del puesto: entre los jacarandás (x −3,2 y 2,8), lejos de los faroles (x −8 y 5,2)
const caja = (w, h, d, mat, x, y, z, padre, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; (padre || scene).add(m); return m; };
const cil = (rt, rb, h, mat, x, y, z, padre, seg = 24) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; (padre || scene).add(m); return m; };
function rotulo(txt, sub, fondo, tinta, w = 512, h = 256) { return tex(w, h, (g) => { g.fillStyle = fondo; g.fillRect(0, 0, w, h); g.fillStyle = tinta; g.textAlign = "center"; g.font = `900 ${h * 0.3}px Montserrat`; g.fillText(txt, w / 2, h * 0.48); if (sub) { g.font = `800 ${h * 0.17}px Montserrat`; g.fillText(sub, w / 2, h * 0.78); } }); }
const metal = std("#1B1C1F", 0.55, 0.6), metalC = std("#5B5F66", 0.4, 0.7);
// parrilla: medio tambor sobre patas, brasas y tortillas sobre la rejilla
export const parrilla = new THREE.Group(); parrilla.position.set(PX + 0.55, VEREDA, PZ + 0.25); scene.add(parrilla);
{ const tambor = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.0, 28, 1, true, 0, Math.PI), metal); tambor.rotation.z = Math.PI / 2; tambor.rotation.x = Math.PI; tambor.position.y = 0.86; tambor.material.side = THREE.DoubleSide; tambor.castShadow = true; parrilla.add(tambor);
  for (const [x, z] of [[-0.42, -0.2], [0.42, -0.2], [-0.42, 0.2], [0.42, 0.2]]) caja(0.04, 0.86, 0.04, metal, x, 0.43, z, parrilla);
  for (let i = 0; i < 12; i++) caja(0.012, 0.012, 0.64, metalC, -0.47 + i * 0.085, 0.87, 0, parrilla);
  const brasa = std("#2A1208", 0.9, 0, "#FF5A10"); for (let i = 0; i < 26; i++) { const b = caja(0.07, 0.05, 0.07, brasa, (rnd() - 0.5) * 0.85, 0.66 + rnd() * 0.04, (rnd() - 0.5) * 0.36, parrilla, rnd()); b.castShadow = false; } }
const luzBrasa = new THREE.PointLight("#FF7A2A", 2.2, 3, 2); luzBrasa.position.set(0, 0.95, 0); parrilla.add(luzBrasa);
const tortiTex = tex(256, 256, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); r.addColorStop(0, "#E8C27A"); r.addColorStop(1, "#C9954A"); g.fillStyle = r; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(70,35,10,${0.25 + rnd() * 0.4})`; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 6 + rnd() * 10, 4 + rnd() * 6, rnd() * 3, 0, 7); g.fill(); } });
const matTorti = new THREE.MeshStandardMaterial({ map: tortiTex, roughness: 0.8 });
const enParrilla = []; for (const [x, z] of [[-0.3, -0.12], [0.0, -0.12], [0.3, -0.12], [-0.15, 0.14], [0.15, 0.14]]) enParrilla.push(cil(0.13, 0.13, 0.018, matTorti, x, 0.885, z, parrilla));
// humo: planos con textura suave que suben (posición calculada con t)
const humoTex = tex(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); r.addColorStop(0, "rgba(235,235,235,.55)"); r.addColorStop(1, "rgba(235,235,235,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); });
const HUMO = Array.from({ length: 14 }, (_, i) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: humoTex, transparent: true, depthWrite: false })); parrilla.add(m); return { m, f: i / 14, dx: (rnd() - 0.5) * 0.6 }; });
// gazebo 2,2 × 2,2 con techo a dos colores
export const gazebo = new THREE.Group(); gazebo.position.set(PX, VEREDA, PZ); scene.add(gazebo);
{ for (const [x, z] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) caja(0.05, 2.3, 0.05, metalC, x, 1.15, z, gazebo);
  const lona = tex(512, 512, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#F2EFE8" : "#C8372D"; g.fillRect((i * w) / 8, 0, w / 8 + 1, h); } });
  const techo = new THREE.Mesh(new THREE.ConeGeometry(1.65, 0.6, 4, 1, true), new THREE.MeshStandardMaterial({ map: lona, roughness: 0.85, side: THREE.DoubleSide })); techo.rotation.y = Math.PI / 4; techo.position.y = 2.6; techo.castShadow = true; gazebo.add(techo);
  const fald = new THREE.MeshStandardMaterial({ color: "#C8372D", roughness: 0.85, side: THREE.DoubleSide }); for (const [x, z, r] of [[0, -1.12, 0], [0, 1.12, 0], [-1.12, 0, Math.PI / 2], [1.12, 0, Math.PI / 2]]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(2.26, 0.2), fald); f.position.set(x, 2.22, z); f.rotation.y = r; gazebo.add(f); } }
// mesa con mantel, pila de tortillas, bolsitas y el cartel de precios
export const mesa = new THREE.Group(); mesa.position.set(PX - 0.6, VEREDA, PZ + 0.35); scene.add(mesa);
{ const mantel = tex(256, 256, (g, w, h) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? "#F4F1EA" : "#2E6FB0"; g.fillRect((i * w) / 8, (j * h) / 8, w / 8, h / 8); } });
  caja(1.0, 0.04, 0.6, new THREE.MeshStandardMaterial({ map: mantel, roughness: 0.9 }), 0, 0.76, 0, mesa); for (const [x, z] of [[-0.45, -0.25], [0.45, -0.25], [-0.45, 0.25], [0.45, 0.25]]) caja(0.035, 0.74, 0.035, metalC, x, 0.37, z, mesa);
  for (let i = 0; i < 9; i++) cil(0.13, 0.13, 0.016, matTorti, -0.25 + (rnd() - 0.5) * 0.02, 0.79 + i * 0.017, 0.02, mesa);
  cil(0.12, 0.1, 0.1, std("#E9E4D8", 0.4), 0.15, 0.83, -0.12, mesa); cil(0.11, 0.11, 0.02, std("#8A5A2E", 0.7), 0.15, 0.885, -0.12, mesa);   // tupper de chicharrón
  caja(0.22, 0.1, 0.14, std("#F2F2F2", 0.6), 0.32, 0.83, 0.12, mesa);   // bolsitas
  const cartel = caja(0.62, 0.42, 0.03, new THREE.MeshStandardMaterial({ map: tex(512, 352, (g, w, h) => { g.fillStyle = "#1F2A22"; g.fillRect(0, 0, w, h); g.strokeStyle = "#C9A26A"; g.lineWidth = 16; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = "#FFFFFF"; g.textAlign = "center";
    g.font = "900 64px Montserrat"; g.fillText("TORTILLAS", w / 2, 92); g.font = "800 44px Montserrat"; g.fillText("COMÚN  $2.500", w / 2, 180); g.fillStyle = "#FFD27A"; g.fillText("CHICHARRÓN  $3.000", w / 2, 262); }), roughness: 0.8 }), 0.0, 1.05, 0.33, mesa);
  cartel.rotation.x = -0.25; }
// insumos: bolsa de harina, grasa, carbón y chicharrón (aparecen cuando la voz los nombra)
const bolsaHarina = (padre, x, y, z, r = 0) => { const m = caja(0.42, 0.62, 0.18, [std("#EDE8DC", 0.9), std("#EDE8DC", 0.9), std("#EDE8DC", 0.9), std("#EDE8DC", 0.9), new THREE.MeshStandardMaterial({ map: rotulo("HARINA 000", "25 KG", "#EDE8DC", "#1F4E8C"), roughness: 0.9 }), std("#EDE8DC", 0.9)], x, y, z, padre, r); return m; };
export const harina = new THREE.Group(); harina.position.set(PX - 1.05, VEREDA, PZ - 0.6); scene.add(harina); bolsaHarina(harina, 0, 0.31, 0, 0.3);
export const carbon = new THREE.Group(); carbon.position.set(PX + 1.25, VEREDA, PZ - 0.55); scene.add(carbon);
caja(0.4, 0.55, 0.2, [std("#2A1E14", 0.9), std("#2A1E14", 0.9), std("#2A1E14", 0.9), std("#2A1E14", 0.9), new THREE.MeshStandardMaterial({ map: rotulo("CARBÓN", "10 KG", "#3B2A1C", "#F2E2C2"), roughness: 0.9 }), std("#2A1E14", 0.9)], 0, 0.275, 0, carbon, -0.4);
export const grasa = new THREE.Group(); grasa.position.set(PX - 0.95, VEREDA + 0.79, PZ + 0.45); scene.add(grasa); caja(0.16, 0.08, 0.1, std("#F4EBD2", 0.5), 0, 0.04, 0, grasa);
export const chicha = new THREE.Group(); chicha.position.set(PX - 0.45, VEREDA + 0.79, PZ + 0.23); scene.add(chicha); cil(0.09, 0.09, 0.06, std("#9A6232", 0.7), 0, 0.03, 0, chicha);
// cocina de madrugada (escenario oscuro): mesa, bolsa de harina, bowl, bollo de masa y palote
const MX = 120;
const piso = new THREE.Mesh(new RoundedBoxGeometry(9, 0.3, 11, 4, 0.12), std("#15171B", 0.6)); piso.position.set(MX, -0.15, 0); piso.receiveShadow = true; scene.add(piso);
const luzCocina = new THREE.SpotLight("#FFE2B8", 120, 14, 0.55, 0.7, 1.6); luzCocina.position.set(MX - 0.6, 4.2, 1.6); luzCocina.target.position.set(MX, 0.9, -0.4); luzCocina.castShadow = true; scene.add(luzCocina, luzCocina.target);
{ caja(1.7, 0.06, 0.9, std("#8A6A48", 0.7), MX, 0.88, -0.4); for (const [x, z] of [[-0.78, -0.78], [0.78, -0.78], [-0.78, -0.02], [0.78, -0.02]]) caja(0.06, 0.86, 0.06, std("#5E4630", 0.7), MX + x, 0.43, z);
  cil(0.22, 0.14, 0.14, std("#C9C4BA", 0.3, 0.2), MX - 0.5, 0.98, -0.5); const bollo = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), std("#EAD9B5", 0.85)); bollo.scale.y = 0.55; bollo.position.set(MX + 0.05, 0.98, -0.25); bollo.castShadow = true; scene.add(bollo);
  const palote = cil(0.03, 0.03, 0.5, std("#B8875A", 0.6), MX + 0.45, 0.95, -0.2); palote.rotation.z = Math.PI / 2;
  const enharinado = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshStandardMaterial({ color: "#F4F0E6", roughness: 1, transparent: true, opacity: 0.7 })); enharinado.rotation.x = -Math.PI / 2; enharinado.position.set(MX + 0.05, 0.912, -0.3); scene.add(enharinado);
  bolsaHarina(scene, MX - 1.15, 0.31, -0.6, 0.4); }
const _m = new THREE.Matrix4();
// lluvia: líneas finas que caen (seek-safe)
const N_LL = 900; const lluvia = new THREE.InstancedMesh(new THREE.BoxGeometry(0.008, 0.35, 0.008), new THREE.MeshBasicMaterial({ color: "#BFD4F0", transparent: true, opacity: 0.55 }), N_LL); lluvia.frustumCulled = false; scene.add(lluvia);
const GOTA = Array.from({ length: N_LL }, () => [PX + (rnd() - 0.5) * 16, rnd() * 9, PZ + 3 + (rnd() - 0.5) * 8]);

// ---------- personajes ----------
const TIPOS = ["repartidor", "clienta", "vendedor", "vecino"]; const PROTO = {};
await Promise.all(TIPOS.map(async (n) => { PROTO[n] = await carga(`assets/personas/${n}.glb`); }));
const blobTex = tex(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); r.addColorStop(0, "rgba(0,0,0,.5)"); r.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); });
function persona(tipo) {
  const g = PROTO[tipo]; const o = SkeletonUtils.clone(g.scene); scene.add(o);
  o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; if ("sheen" in m.material) m.material.sheen = 0; } });
  const mixer = new THREE.AnimationMixer(o); const acc = {};
  g.animations.forEach((c) => { const a = mixer.clipAction(c); a.play(); a.setEffectiveWeight(0); acc[c.name] = a; });
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, toneMapped: false })); blob.rotation.x = -Math.PI / 2; scene.add(blob);
  return { o, mixer, acc, blob };
}
function pose(p, lista) { Object.values(p.acc).forEach((a) => a.setEffectiveWeight(0)); for (const [n, t, w] of lista) { const a = p.acc[n] || p.acc.parado; a.setEffectiveWeight(w); a.time = t % a.getClip().duration; } p.mixer.update(0); }
const PASO = 1.35;
function mover(p, t, y, a, b, t0, t1, mira, quieto = "parado", fase = 0, andar = "caminar") {
  const u = clamp((t - t0) / Math.max(0.001, t1 - t0)); const x = mix(a[0], b[0], u), z = mix(a[1], b[1], u); const anda = t > t0 && t < t1;
  p.o.position.set(x, y, z); p.o.rotation.y = anda || !mira ? Math.atan2(b[0] - a[0], b[1] - a[1]) : Math.atan2(mira[0] - x, mira[1] - z);
  const w = anda ? clamp(Math.min((t - t0) / 0.3, (t1 - t) / 0.3)) : 0; const dist = Math.hypot(b[0] - a[0], b[1] - a[1]) * u;
  pose(p, [[andar, (dist / PASO) * 1.333 + fase, w], [quieto, t + fase, 1 - w]]); p.blob.position.set(x, y + 0.004, z);
}
const martin = persona("vecino");
const clientes = [persona("clienta"), persona("vendedor"), persona("repartidor")];
export const marcaMartin = new THREE.Object3D(); scene.add(marcaMartin);
export const marcaParrilla = new THREE.Object3D(); marcaParrilla.position.set(PX + 0.55, 1.5, PZ + 0.25); scene.add(marcaParrilla);
export const marcaHarina = new THREE.Object3D(); marcaHarina.position.set(MX - 1.15, 1.0, -0.6); scene.add(marcaHarina);

// ---------- efecto miniatura + curva de contraste ----------
const rtA = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }), rtB = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); const qScene = new THREE.Scene(); qScene.add(quad); const qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const blurMat = (final) => new THREE.ShaderMaterial({
  uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() }, foco: { value: 0.5 }, banda: { value: 0.12 }, radio: { value: 9 }, vin: { value: 0 }, oscuro: { value: 0 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
  fragmentShader: `uniform sampler2D tex; uniform vec2 dir; uniform float foco, banda, radio, vin, oscuro; varying vec2 vUv;
    void main(){ float d = abs(vUv.y - foco); float k = smoothstep(banda, banda + 0.28, d) * radio;
      vec4 acc = vec4(0.0); float ws = 0.0; for (int i = -6; i <= 6; i++) { float fi = float(i); float w = exp(-fi*fi/18.0); acc += texture2D(tex, vUv + dir * fi * k / 6.0) * w; ws += w; }
      vec4 col = acc / ws;
      ${final ? `vec2 q = vUv - 0.5; col.rgb *= (1.0 - vin * dot(q, q) * 1.6) * (1.0 - oscuro); gl_FragColor = col;
      #include <tonemapping_fragment>
      gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * gl_FragColor.rgb * (3.0 - 2.0 * gl_FragColor.rgb), 0.35);
      float lum = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722)); gl_FragColor.rgb = mix(vec3(lum), gl_FragColor.rgb, 1.1);
      #include <colorspace_fragment>` : "gl_FragColor = col;"} }`,
  toneMapped: final, depthTest: false, depthWrite: false });
const blurH = blurMat(false), blurV = blurMat(true);

// ---------- cámara por plano ----------
// [desde, posición inicial, posición final, mira inicial, mira final, fov, foco, banda, radio de desenfoque]
const E = [PX, 1.0, PZ];
const PLANOS = [
  [T.hook, [PX + 7.5, 3.4, PZ + 10.5], [PX + 5.5, 2.6, PZ + 8.0], [PX, 1.0, PZ], [PX, 1.0, PZ], 44, 0.55, 0.16, 8],
  [T.martin, [PX + 2.6, 1.7, PZ + 4.6], [PX + 2.0, 1.65, PZ + 3.9], [PX - 0.3, 1.2, PZ + 0.2], [PX - 0.3, 1.2, PZ + 0.2], 42, 0.55, 0.12, 9],
  [T.parrilla, [PX + 2.4, 1.6, PZ + 3.6], [PX + 3.4, 1.9, PZ + 4.8], [PX + 0.4, 0.9, PZ + 0.2], [PX, 1.1, PZ], 44, 0.58, 0.14, 9],
  [T.harina, [PX - 2.6, 1.3, PZ + 2.8], [PX - 2.2, 1.2, PZ + 2.3], [PX - 0.9, 0.6, PZ - 0.3], [PX - 0.8, 0.7, PZ], 42, 0.58, 0.12, 9],
  [T.calle, [PX + 6.0, 2.4, PZ + 8.0], [PX + 4.6, 2.1, PZ + 6.4], [PX, 1.0, PZ], [PX, 1.0, PZ], 44, 0.55, 0.14, 9],
  [T.amasar, [MX + 1.6, 1.7, 2.4], [MX + 1.1, 1.55, 1.8], [MX, 0.95, -0.4], [MX, 0.95, -0.4], 40, 0.55, 0.12, 9],
  [T.comun, [PX + 1.6, 1.45, PZ + 1.9], [PX + 1.25, 1.4, PZ + 1.6], [PX + 0.4, 0.95, PZ + 0.2], [PX + 0.3, 0.95, PZ + 0.2], 40, 0.55, 0.12, 10],
  [T.dia1, [PX + 4.2, 2.0, PZ + 5.4], [PX + 3.4, 1.9, PZ + 4.6], [PX, 1.0, PZ + 0.3], [PX, 1.0, PZ + 0.3], 44, 0.58, 0.14, 9],
  [T.semana, [PX + 9, 7.5, PZ + 11], [PX + 8, 6.6, PZ + 9.6], E, E, 44, 0.6, 0.2, 6],
  [T.llueve, [PX + 3.4, 1.5, PZ + 4.8], [PX + 2.8, 1.45, PZ + 4.0], [PX, 1.2, PZ], [PX, 1.2, PZ], 42, 0.56, 0.14, 8],
  [T.mes, [PX + 9, 7.5, PZ + 11], [PX + 7.8, 6.8, PZ + 9.8], E, E, 44, 0.6, 0.2, 6],
  [T.nadie, [PX + 2.4, 1.6, PZ + 3.8], [PX + 1.9, 1.55, PZ + 3.2], [PX - 0.2, 1.2, PZ], [PX - 0.2, 1.2, PZ], 42, 0.55, 0.12, 9],
  [T.antes, [MX - 1.4, 1.8, 2.2], [MX - 0.9, 1.6, 1.7], [MX, 0.95, -0.4], [MX, 0.95, -0.4], 40, 0.55, 0.12, 9],
  [T.s9200, [PX + 5.5, 3.0, PZ + 7.5], [PX + 4.5, 2.6, PZ + 6.2], E, E, 44, 0.58, 0.16, 8],
  [T.decomiso, [PX + 3.0, 1.7, PZ + 4.6], [PX + 3.8, 2.2, PZ + 5.8], [PX, 1.0, PZ], [PX, 1.0, PZ], 44, 0.56, 0.14, 9],
  [T.metodo, [PX + 9, 7.5, PZ + 11], [PX + 8.4, 7.0, PZ + 10.2], E, E, 44, 0.6, 0.2, 6],
  [T.mandaselo, [PX + 7.0, 3.0, PZ + 9.5], [PX + 5.8, 2.6, PZ + 8.0], E, E, 44, 0.55, 0.16, 8],
];
function camara(t) {
  let i = 0; while (i + 1 < PLANOS.length && t >= PLANOS[i + 1][0]) i++;
  const [t0, p0, p1, m0, m1, fov, foco, banda, radio] = PLANOS[i]; const t1 = i + 1 < PLANOS.length ? PLANOS[i + 1][0] : T.fin; const u = ease(clamp((t - t0) / (t1 - t0)));
  return { pos: p0.map((v, k) => mix(v, p1[k], u)), mira: m0.map((v, k) => mix(v, m1[k], u)), fov, foco, banda, radio, plano: i };
}
export function camAt(t) { const k = camara(t); cam.position.set(...k.pos); cam.fov = k.fov; cam.aspect = W / H; cam.updateProjectionMatrix(); cam.lookAt(...k.mira); return k; }
const _v = new THREE.Vector3();
export function aPantalla(obj, local = [0, 0, 0]) { obj.updateWorldMatrix(true, false); _v.set(...local); obj.localToWorld(_v); _v.project(cam); return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H, vis: _v.z < 1 && _v.z > -1 }; }

// ---------- estado del mundo en el tiempo t ----------
const pop = (o, t, a, b = 1e9) => { const u = clamp((t - a) / 0.45), v = clamp((b - t) / 0.35); const k = Math.min(u < 1 ? 1 - Math.pow(1 - u, 3) * Math.cos(u * 9) : 1, v); o.visible = k > 0.001; o.scale.setScalar(Math.max(0.001, k)); };
export function render(t, oscuro = 0) {
  const k = camAt(t); const cx = k.mira[0], cz = k.mira[2];
  sol.target.position.set(cx, 0, cz); sol.position.set(cx + SOL_DIR.x, SOL_DIR.y, cz + SOL_DIR.z);
  // las compras aparecen cuando la voz las nombra; el decomiso se las lleva
  pop(parrilla, t, T.parrilla + 0.3, T.pierde + 0.3); pop(gazebo, t, T.gazebo, T.pgazebo + 0.2); pop(mesa, t, T.gazebo + 0.5, T.pmerca + 0.2);
  pop(harina, t, T.harina + 0.2, T.calle + 0.4); pop(grasa, t, T.grasa, T.calle + 0.4); pop(carbon, t, T.carbon, T.pierde + 0.3); pop(chicha, t, T.chicha, T.pmerca + 0.2);
  const llueve = t >= T.llueve && t < T.mes; const brasas = t >= T.calle && !llueve && t < T.pierde;
  luzBrasa.intensity = brasas ? 2.2 + Math.sin(t * 7) * 0.4 : 0;
  enParrilla.forEach((m) => (m.visible = brasas));
  HUMO.forEach((h) => { const u = (t * 0.35 + h.f) % 1; h.m.visible = brasas; h.m.position.set(h.dx * (0.4 + u), 1.0 + u * 2.2, (u - 0.5) * 0.3); h.m.scale.setScalar(0.25 + u * 0.9); h.m.material.opacity = Math.sin(u * Math.PI) * 0.55; });
  // lluvia
  lluvia.visible = llueve; if (llueve) { GOTA.forEach(([x, y, z], i) => { const yy = (((y - t * 9) % 9) + 9) % 9; _m.makeTranslation(x, yy, z); lluvia.setMatrixAt(i, _m); }); lluvia.instanceMatrix.needsUpdate = true; }
  scene.background.set(llueve ? "#0A0C10" : "#000000"); sol.intensity = llueve ? 0.6 : 3.0;
  // Martín: llega con las cosas, amasa de madrugada, atiende en la parrilla
  const enCasa = (t >= T.amasar && t < T.comun) || (t >= T.antes && t < T.s9200);
  if (enCasa) mover(martin, t, 0, [MX, -1.15], [MX, -1.15], 0, 0.01, [MX, 0], "embalar", 0.2);
  else if (t < T.calle) mover(martin, t, VEREDA, [PX + 0.2, PZ + 1.6], [PX + 0.2, PZ + 1.6], 0, 0.01, [PX + 2, PZ + 5], "parado", 0.3);
  else if (t < T.calle + 2.4) mover(martin, t, VEREDA, [PX + 4.5, PZ + 1.7], [PX + 0.55, PZ - 0.55], T.calle, T.calle + 2.4, [PX + 0.55, PZ + 2], "embalar", 0.3);
  else if (t >= T.decomiso) mover(martin, t, VEREDA, [PX + 0.55, PZ - 0.55], [PX + 0.55, PZ - 0.55], 0, 0.01, [PX + 2.2, PZ + 2.2], "parado", 0.3);
  else mover(martin, t, VEREDA, [PX + 0.55, PZ - 0.55], [PX + 0.55, PZ - 0.55], 0, 0.01, [PX + 0.55, PZ + 2], llueve ? "parado" : "embalar", 0.3);
  martin.o.updateWorldMatrix(true, true); marcaMartin.position.set(martin.o.position.x, martin.o.position.y + 2.05, martin.o.position.z);
  // clientes: llegan por la vereda, compran y se van (no cuando llueve)
  clientes.forEach((p, i) => {
    const vis = t >= T.calle + 1 && !llueve && !enCasa && t < T.decomiso; p.o.visible = p.blob.visible = vis; if (!vis) return;
    const L = 16, c = ((t + i * 5.3) % L); const ox = i % 2 ? -6.8 : 4.4, fila = 0.95 + i * 0.03, frente = PX - 0.3 + i * 0.4;   // carril junto al cordón: esquiva canteros y faroles
    if (c < 5) mover(p, c, VEREDA, [ox, fila], [frente, fila], 0, 5, null, "parado", i);
    else if (c < 8) mover(p, c, VEREDA, [frente, fila], [frente, fila], 0, 0.01, [PX + 0.55, PZ - 0.5], "parado", i);
    else mover(p, c, VEREDA, [frente, fila], [i % 2 ? 4.4 : -6.8, fila], 8, 14, null, "parado", i);
  });
  renderer.setRenderTarget(rtA); renderer.render(scene, cam);
  blurH.uniforms.tex.value = rtA.texture; blurH.uniforms.dir.value.set(1 / W, 0); blurH.uniforms.foco.value = k.foco; blurH.uniforms.banda.value = k.banda; blurH.uniforms.radio.value = k.radio;
  quad.material = blurH; renderer.setRenderTarget(rtB); renderer.render(qScene, qCam);
  blurV.uniforms.tex.value = rtB.texture; blurV.uniforms.dir.value.set(0, 1 / H); blurV.uniforms.foco.value = k.foco; blurV.uniforms.banda.value = k.banda; blurV.uniforms.radio.value = k.radio; blurV.uniforms.vin.value = 0.45; blurV.uniforms.oscuro.value = oscuro;
  quad.material = blurV; renderer.setRenderTarget(null); renderer.render(qScene, qCam);
  return k;
}
