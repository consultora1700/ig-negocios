// Reel 05 v2 «Uber y DiDi: ¿cuánto te queda?» — mundo 3D.
// Lección de la referencia DfyFAFfhbQ0: el dato vive en un objeto (celular en el soporte, recibo con sello, calendario,
// ticket que se imprime, surtidor, odómetro, fajos, póliza). Zonas: calle horneada (x≈0) y estación (x≈-60) del reel 03,
// interior del auto (viaja con el auto), oficina de la flota (x≈300) y taller (x≈400). Luz: HDRI + sol + horneado.
import * as THREE from "./lib/three.module.min.js";
import { GLTFLoader } from "./lib/GLTFLoader.js";
import { RGBELoader } from "./lib/RGBELoader.js";
import * as SkeletonUtils from "./lib/SkeletonUtils.js";
import { RoundedBoxGeometry } from "./lib/RoundedBoxGeometry.js";
import { EffectComposer } from "./lib/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./lib/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "./lib/jsm/postprocessing/GTAOPass.js";
import { BokehPass } from "./lib/jsm/postprocessing/BokehPass.js";
import { UnrealBloomPass } from "./lib/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "./lib/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "./lib/jsm/postprocessing/ShaderPass.js";

export const W = 1080, H = 1920;
export const T = {
  dos: 0.0, uno: 4.1, apenas: 6.1, donde: 9.0, tranq: 10.2, s12: 12.2, sincom: 13.8, nisiq: 15.1, viaje: 17.7, s10: 19.0, pasaj: 19.7, entre: 20.6,
  martin: 22.2, alquila: 23.6, s360: 26.0, div: 27.7, h30: 30.6, primeros: 31.7, dueno: 34.3, poreso: 36.2, h12: 36.9, seis: 38.1,
  mes: 39.4, m3744: 41.0, alq: 43.9, gas: 46.2, mono: 48.3, m227: 49.9, cel: 51.2, quedan: 52.7, h312: 54.7, m4830: 56.6,
  lucas: 58.6, tiene: 60.0, ocho: 61.6, mesL: 63.9, m2496: 65.1, sinalq: 67.1, pero: 69.2, gasL: 71.3, service: 71.8, cubiertas: 72.5, frenos: 73.2,
  seguro: 73.9, impuestos: 74.6, patente: 75.3, casi900: 76.0,
  gasto: 77.8, km: 81.1, vale: 82.4, s33: 83.7, km4000: 85.5, s137: 87.8, quedanL: 90.8, m1466: 91.7, m7050: 93.9,
  comp: 95.9, s40: 98.1, s386: 100.6, ysi: 103.1, quedarian: 105.5, m2262: 106.1, s755: 108.5, porque: 112.3, s800: 113.5, desg: 115.6,
  mpaga: 116.8, dif: 119.4, dueno2: 120.4,
  escritorio: 121.6, gerardo: 123.6, alquilaG: 125.0, manejaG: 127.8, s6070: 129.5,
  claro: 131.6, desgaste: 133.6, golpe: 135.4, cambiarlo: 137.0, ojo: 139.4, uso: 141.0, chocas: 141.9, rechazar: 143.3,
  entonces: 145.0, cuenta: 147.3, lo: 148.7, menos: 149.9, incluido: 151.6, dividido: 153.3, sueldo: 154.8,
  vos: 156.9, contalo: 158.4, mandaselo: 159.7, seguime: 162.5, fin: 167.64,
};
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const eo = (u) => 1 - Math.pow(1 - clamp(u), 3);
const mix = (a, b, u) => a + (b - a) * u;
const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const pesos = (v) => "$" + Math.round(v).toLocaleString("es-AR");

const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene(); const cielo = new THREE.Color("#000000"); scene.background = cielo;
const cam = new THREE.PerspectiveCamera(40, W / H, 0.02, 400);
function lienzo(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { c, g: c.getContext("2d"), t, w, h, firma: "" }; }
function tex(w, h, draw) { const L = lienzo(w, h); draw(L.g, w, h); L.t.needsUpdate = true; return L.t; }
const F = (peso, px, fam = "Montserrat") => `${peso} ${px}px ${fam}`;

// ---------- cargadores ----------
const gl = new GLTFLoader(), hdr = new RGBELoader(), pmrem = new THREE.PMREMGenerator(renderer);
const carga = (u) => new Promise((ok, mal) => gl.load(u, ok, undefined, mal));
const cargaHDR = (u) => new Promise((ok) => hdr.load(u, (t) => { t.mapping = THREE.EquirectangularReflectionMapping; const e = pmrem.fromEquirectangular(t).texture; t.dispose(); ok(e); }));
const texLoader = new THREE.TextureLoader();
function textura(u, rep = 1, color = true) { const t = texLoader.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); if (color) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
const [ENV_DIA, ENV_NOCHE, ENV_OFI, ENV_TALLER] = await Promise.all(["urban_street_04", "shanghai_bund", "artist_workshop", "garage"].map((n) => cargaHDR(`assets/hdri/${n}.hdr`)));

// ---------- calle y estación horneadas (reel 03) ----------
const [gSet, luces, indice] = await Promise.all([carga("assets/horneado/set.glb"), fetch("assets/horneado/luces.json").then((r) => r.json()), fetch("assets/horneado/luz/indice.json").then((r) => r.json())]);
const mapas = {};
await Promise.all(Object.keys(indice).map((n) => new Promise((ok) => hdr.load(`assets/horneado/luz/${encodeURIComponent(n)}.hdr`, (t) => {
  t.flipY = false; t.colorSpace = THREE.LinearSRGBColorSpace; t.channel = 1; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true;
  mapas[n.replace(/[.:\/\[\]]/g, "")] = t; ok(); }, undefined, () => ok()))));
const set = gSet.scene; scene.add(set);
const MATS = [];
set.traverse((o) => {
  if (!o.isMesh) return; const lm = mapas[o.name] || mapas[o.parent?.name]; const src = o.material;
  if (lm && !o.geometry.attributes.uv1) lm.channel = 0;
  o.material = new THREE.MeshBasicMaterial({ map: src.map || null, color: src.color || new THREE.Color("#999999"), lightMap: lm || null, lightMapIntensity: Math.PI, transparent: src.transparent, alphaTest: src.alphaTest || 0 });
  const brilla = !!(src.emissive && src.emissive.getHex() && !src.map);
  if (brilla) o.material.color = src.emissive.clone().multiplyScalar(1 + (src.emissiveIntensity || 0) * 0.3);
  MATS.push([o.material, o.material.color.clone(), brilla]); o.receiveShadow = true;
});
{ const losa = tex(512, 512, (c, w, h) => { c.fillStyle = "#A39C90"; c.fillRect(0, 0, w, h); c.strokeStyle = "#8C857A"; c.lineWidth = 6; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * 128, 0); c.lineTo(i * 128, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 128); c.lineTo(w, i * 128); c.stroke(); } });
  losa.wrapS = losa.wrapT = THREE.RepeatWrapping; losa.repeat.set(30, 2);
  const v = new THREE.Mesh(new THREE.BoxGeometry(60, 0.15, 3.2), new THREE.MeshStandardMaterial({ map: losa, roughness: 0.9 })); v.position.set(0, 0.075, 8.6); v.receiveShadow = true; scene.add(v);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), new THREE.MeshStandardMaterial({ color: "#5E6B4A", roughness: 1 })); p.rotation.x = -Math.PI / 2; p.position.set(0, 0.02, 30); p.receiveShadow = true; scene.add(p); }
// semáforo en la esquina
const SEMAF = new THREE.Group(); scene.add(SEMAF); SEMAF.position.set(6.0, 0.15, 7.4);
{ const metal = new THREE.MeshStandardMaterial({ color: "#2B2E33", roughness: 0.5, metalness: 0.6 });
  const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.4, 12), metal); poste.position.y = 1.7; SEMAF.add(poste);
  const caja = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.95, 0.28, 3, 0.05), metal); caja.position.set(0, 3.3, 0); SEMAF.add(caja);
  SEMAF.userData.focos = ["#FF3B30", "#FFB020", "#2BD96B"].map((c, i) => { const m = new THREE.MeshStandardMaterial({ color: "#111", emissive: c, emissiveIntensity: 0 }); const f = new THREE.Mesh(new THREE.CircleGeometry(0.09, 20), m); f.position.set(0, 3.6 - i * 0.29, -0.145); f.rotation.y = Math.PI; SEMAF.add(f); return m; }); }

// ---------- luces ----------
const hemi = new THREE.HemisphereLight("#C6D6F2", "#8A7C6A", 0.6); scene.add(hemi);
const sol = new THREE.DirectionalLight("#FFE6C8", 3.0); scene.add(sol, sol.target);
sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); Object.assign(sol.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 60 }); sol.shadow.radius = 6; sol.shadow.blurSamples = 16; sol.shadow.bias = -0.0005;
const SOL_DIR = new THREE.Vector3(-6, 12, 8).normalize().multiplyScalar(25);
const haloTex = tex(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2); r.addColorStop(0, "rgba(255,240,215,1)"); r.addColorStop(0.25, "rgba(255,210,150,.55)"); r.addColorStop(1, "rgba(255,190,110,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); });
function halo(x, y, z, s, tinte = "#FFFFFF") { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: tinte, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); m.position.set(x, y, z); m.scale.set(s, s, 1); scene.add(m); return m; }
const FAROLES = [-12, -6, 0, 6, 12].map((x) => { const p = new THREE.PointLight("#FFC98A", 0, 9, 1.6); p.position.set(x, 4.2, 0.4); scene.add(p); return [p, halo(x, 4.3, 0.4, 2.2)]; });
const VENT = new THREE.MeshBasicMaterial({ color: "#FFCF8A", transparent: true, opacity: 0, toneMapped: false });
{ let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 46; i++) { const v = new THREE.Mesh(new THREE.PlaneGeometry(0.7 + r() * 0.4, 0.9), VENT); v.position.set(-14 + r() * 28, 3.4 + Math.floor(r() * 4) * 2.1, -1.48); scene.add(v); } }

// ---------- autos (sedán Sloyd, CC-BY 4.0 TopoSphere; ruedas separadas; frente hacia +z) ----------
const PROTO = {};
await Promise.all([["martin", "assets/p2/auto-martin.glb"], ["lucas", "assets/p2/auto-lucas.glb"]].map(async ([k, u]) => { PROTO[k] = (await carga(u)).scene; }));
const PINTURA = {}; ['martin', 'lucas'].forEach((k) => { const t = texLoader.load(`assets/p2/pintura-${k}.jpg`); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; PINTURA[k] = t; });
function auto(k) {
  const o = PROTO[k].clone(true); scene.add(o); let cuerpo = null;
  const ruedas = []; o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; if (m.material) { m.material = m.material.clone(); m.material.side = THREE.FrontSide; if (m.material.map) m.material.map = PINTURA[k]; } if (m.name === 'carroceria') cuerpo = m; } if (/^rueda/.test(m.name)) ruedas.push(m); });
  const faros = [[0.62, 0.62, 2.22, "#EAF2FF", 1.1], [-0.62, 0.62, 2.22, "#EAF2FF", 1.1], [0.66, 0.66, -2.24, "#FF3A3A", 0.7], [-0.66, 0.66, -2.24, "#FF3A3A", 0.7]].map(([x, y, z, c, s]) => [halo(0, 0, 0, s, c), [x, y, z]]);
  const luz = new THREE.SpotLight("#EAF2FF", 0, 22, 0.55, 0.5, 1.4); scene.add(luz, luz.target);
  return { o, ruedas, faros, luz, cuerpo };
}
export const autoM = auto("martin"), autoL = auto("lucas");
const _p = new THREE.Vector3();
function ubicar(a, x, y, z, ry, noche = 0, vis = true, giro = 0) {
  a.o.visible = vis; a.o.position.set(x, y, z); a.o.rotation.set(0, ry, 0); a.ruedas.forEach((r) => (r.rotation.x = giro / 0.355));
  a.o.updateWorldMatrix(true, true);
  a.faros.forEach(([h, l]) => { _p.set(...l); a.o.localToWorld(_p); h.position.copy(_p); h.material.opacity = noche; h.visible = vis && noche > 0.01; });
  _p.set(0, 0.6, 2.3); a.o.localToWorld(_p); a.luz.position.copy(_p); _p.set(0, 0, 8); a.o.localToWorld(_p); a.luz.target.position.copy(_p); a.luz.intensity = vis ? noche * 40 : 0;
}
export const marcaM = new THREE.Object3D(), marcaL = new THREE.Object3D(); scene.add(marcaM, marcaL);

// ---------- interior: tablero, volante, soporte con celular (viaja dentro del auto; coordenadas del auto) ----------
const INT = new THREE.Group();
const plast = new THREE.MeshStandardMaterial({ color: "#1C1E22", roughness: 0.75 }), plast2 = new THREE.MeshStandardMaterial({ color: "#2A2D33", roughness: 0.6 });
{ const tab = new THREE.Mesh(new RoundedBoxGeometry(1.72, 0.32, 0.55, 4, 0.08), plast); tab.position.set(0, 0.8, 0.85); INT.add(tab);
  const cap = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.08, 0.32, 3, 0.03), plast2); cap.position.set(0, 0.97, 0.72); cap.rotation.x = 0.25; INT.add(cap);
  const consola = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.5, 0.5, 3, 0.04), plast); consola.position.set(0, 0.5, 0.5); INT.add(consola);
  [1, -1].forEach((x) => { const pil = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.62, 0.07), plast); pil.position.set(x * 0.8, 1.15, 0.72); pil.rotation.x = 0.75; INT.add(pil); });
  const techo = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.04, 1.6), new THREE.MeshStandardMaterial({ color: "#8B8680", roughness: 0.9, side: THREE.DoubleSide })); techo.position.set(0, 1.29, -0.3); INT.add(techo);
  const espejo = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.07, 0.03, 2, 0.01), plast); espejo.position.set(0, 1.2, 0.46); INT.add(espejo); }
const volante = new THREE.Group(); volante.position.set(0.38, 0.92, 0.46); volante.rotation.x = -0.45; INT.add(volante);
{ volante.add(new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 12, 40), plast)); const cubo = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.05, 20), plast2); cubo.rotation.x = Math.PI / 2; volante.add(cubo);
  [0, 2.1, 4.2].forEach((a) => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.015), plast2); r.position.set(Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0); r.rotation.z = a; volante.add(r); }); }
// odómetro (lienzo) detrás del volante
export const ODO = lienzo(512, 256);
{ const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), new THREE.MeshBasicMaterial({ map: ODO.t, toneMapped: false })); m.position.set(0.38, 0.86, 0.568); m.rotation.set(0, Math.PI, 0); INT.add(m); }
// soporte y celular con la app (lienzo); la pantalla mira hacia el conductor (−z)
export const TEL = lienzo(540, 1170);
const telG = new THREE.Group(); telG.position.set(0.08, 1.04, 0.56); telG.rotation.order = "YXZ"; telG.rotation.set(0.22, Math.PI - 0.3, 0); INT.add(telG);
{ const cuerpo = new THREE.Mesh(new RoundedBoxGeometry(0.078, 0.162, 0.009, 4, 0.008), new THREE.MeshStandardMaterial({ color: "#101114", roughness: 0.3, metalness: 0.5 })); telG.add(cuerpo);
  const pant = new THREE.Mesh(new THREE.PlaneGeometry(0.072, 0.156), new THREE.MeshBasicMaterial({ map: TEL.t, toneMapped: false })); pant.position.z = 0.0047; telG.add(pant);
  const brazo = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 10), plast); brazo.position.set(0, -0.11, -0.02); telG.add(brazo); }
export const marcaTel = new THREE.Object3D(); marcaTel.position.set(0, 0.085, 0); telG.add(marcaTel);
// etiqueta de precio colgada del espejo (lienzo)
export const ETQ = lienzo(512, 300);
const etqG = new THREE.Group(); etqG.position.set(0, 1.17, 0.46); INT.add(etqG);
{ const hilo = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.1, 6), new THREE.MeshStandardMaterial({ color: "#DDD" })); hilo.position.y = -0.05; etqG.add(hilo);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.076), new THREE.MeshStandardMaterial({ map: ETQ.t, roughness: 0.8, side: THREE.DoubleSide })); p.position.y = -0.14; p.rotation.y = Math.PI; etqG.add(p); }
export const marcaOdo = new THREE.Object3D(); marcaOdo.position.set(0.38, 0.95, 0.56); INT.add(marcaOdo);
export const marcaEtq = new THREE.Object3D(); marcaEtq.position.set(0, 1.08, 0.46); INT.add(marcaEtq);
INT.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = true; } });

// ---------- personas ----------
const TIPOS = ["clienta", "vecino", "vendedor", "repartidor"]; const PP = {};
await Promise.all(TIPOS.map(async (n) => { PP[n] = await carga(`assets/personas/${n}.glb`); }));
function persona(tipo) {
  const g = PP[tipo]; const o = SkeletonUtils.clone(g.scene); scene.add(o);
  o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; if ("sheen" in m.material) m.material.sheen = 0; } });
  const mixer = new THREE.AnimationMixer(o); const acc = {};
  g.animations.forEach((c) => { const a = mixer.clipAction(c); a.play(); a.setEffectiveWeight(0); acc[c.name] = a; });
  return { o, mixer, acc };
}
function pose(p, lista) { Object.values(p.acc).forEach((a) => a.setEffectiveWeight(0)); for (const [n, t, w] of lista) { const a = p.acc[n] || p.acc.parado; a.setEffectiveWeight(w); a.time = t % a.getClip().duration; } p.mixer.update(0); }
function mover(p, t, y, a, b, t0, t1, mira, quieto = "parado", fase = 0) {
  const u = clamp((t - t0) / Math.max(0.001, t1 - t0)); const x = mix(a[0], b[0], u), z = mix(a[1], b[1], u); const anda = t > t0 && t < t1;
  p.o.position.set(x, y, z); p.o.rotation.y = anda || !mira ? Math.atan2(b[0] - a[0], b[1] - a[1]) : Math.atan2(mira[0] - x, mira[1] - z);
  const w = anda ? clamp(Math.min((t - t0) / 0.3, (t1 - t) / 0.3)) : 0; const dist = Math.hypot(b[0] - a[0], b[1] - a[1]) * u;
  pose(p, [["caminar", (dist / 1.35) * 1.333 + fase, w], [quieto, t + fase, 1 - w]]);
}
const transeuntes = [persona("vecino"), persona("clienta"), persona("vendedor")];
const playero = persona("repartidor"), empleado = persona("vendedor"), mecanico = persona("repartidor");

// ---------- props Poly Haven (CC0) ----------
const PH = {};
await Promise.all(["metal_office_desk", "clipboard", "binder_notebook", "vintage_stapler", "tool_cart", "metal_tool_chest", "old_tyre", "oil_tin"].map(async (n) => { PH[n] = (await carga(`assets/p2/${n}/${n}_1k.gltf`)).scene; }));
const elevadorProto = (await carga("assets/p2/elevador.glb")).scene;
function poner(o, x, y, z, ry = 0, esc = 1) { const c = o.clone(true); c.position.set(x, y, z); c.rotation.y = ry; c.scale.setScalar(esc); c.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); scene.add(c); return c; }
function cuarto(x0, piso, pared, repP, repW, ancho = 12, fondo = 9, alto = 3.6) {
  const g = new THREE.Group(); g.position.set(x0, 0, 0); scene.add(g);
  const mp = new THREE.MeshStandardMaterial({ map: textura(piso[0], repP), roughnessMap: textura(piso[1], repP, false), roughness: 1 });
  const pisoM = new THREE.Mesh(new THREE.PlaneGeometry(ancho, fondo), mp); pisoM.rotation.x = -Math.PI / 2; pisoM.receiveShadow = true; g.add(pisoM);
  const mw = new THREE.MeshStandardMaterial({ map: textura(pared[0], repW), roughnessMap: textura(pared[1], repW, false), roughness: 1, color: "#E8E2D8" });
  const fondoM = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), mw); fondoM.position.set(0, alto / 2, -fondo / 2); fondoM.receiveShadow = true; g.add(fondoM);
  [-1, 1].forEach((s) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(fondo, alto), mw); l.position.set(s * ancho / 2, alto / 2, 0); l.rotation.y = -s * Math.PI / 2; l.receiveShadow = true; g.add(l); });
  const atras = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), mw); atras.position.set(0, alto / 2, fondo / 2); atras.rotation.y = Math.PI; g.add(atras);
  const techo = new THREE.Mesh(new THREE.PlaneGeometry(ancho, fondo), new THREE.MeshStandardMaterial({ color: "#D9D4CC", roughness: 1 })); techo.position.y = alto; techo.rotation.x = Math.PI / 2; g.add(techo);
  return g;
}

// ===== OFICINA DE LA FLOTA (x = 300) =====
export const OX = 300;
cuarto(OX, ["assets/tex/Wood066/Wood066_Color.jpg", "assets/tex/Wood066/Wood066_Roughness.jpg"], ["assets/tex/Plaster003/Plaster003_Color.jpg", "assets/tex/Plaster003/Plaster003_Roughness.jpg"], 4, 3);
const escritorio = poner(PH.metal_office_desk, OX, 0, 0, 0, 1.0);
const MESA = new THREE.Box3().setFromObject(escritorio).max.y + 0.001; const MY = () => MESA;
poner(PH.binder_notebook, OX - 0.62, MY(), -0.25, 0.3, 1.0); poner(PH.vintage_stapler, OX + 0.62, MY(), -0.25, -0.6, 1.0);
const lamparaLuz = new THREE.PointLight("#FFD9A8", 0, 6, 1.4); lamparaLuz.position.set(OX - 0.5, 1.8, 0.6); scene.add(lamparaLuz);
function papel(w, h, cw, ch, x, z, ry = 0) {
  const L = lienzo(cw, ch); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: L.t, roughness: 0.9 }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = ry; m.position.set(x, MY() + 0.0015, z); m.receiveShadow = true; scene.add(m); L.mesh = m; return L;
}
export const RECIBO = papel(0.21, 0.15, 840, 600, OX + 0.05, 0.12, 0.06);
export const TICKET_M = papel(0.09, 0.42, 360, 1680, OX - 0.12, 0.08, -0.04);
export const TICKET_L = papel(0.09, 0.42, 360, 1680, OX + 0.14, 0.08, 0.05);
export const POLIZA = papel(0.21, 0.297, 840, 1188, OX - 0.02, 0.1, -0.05);
export const CASO = papel(0.21, 0.297, 840, 1188, OX + 0.02, 0.1, 0.04);
const sello = new THREE.Group(); scene.add(sello);
{ const madera = new THREE.MeshStandardMaterial({ color: "#6B4A2E", roughness: 0.55 }); const goma = new THREE.MeshStandardMaterial({ color: "#2A2A2A", roughness: 0.9 });
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.025, 0.045, 2, 0.004), madera); base.position.y = 0.0185; sello.add(base);
  const g2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.006, 0.04), goma); g2.position.y = 0.003; sello.add(g2);
  const mango = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.07, 16), madera); mango.position.y = 0.065; sello.add(mango);
  const bola = new THREE.Mesh(new THREE.SphereGeometry(0.022, 20, 14), madera); bola.position.y = 0.105; sello.add(bola);
  sello.traverse((m) => { if (m.isMesh) m.castShadow = true; }); }
const llaves = new THREE.Group(); scene.add(llaves);
{ const met = new THREE.MeshStandardMaterial({ color: "#C9CCD1", roughness: 0.25, metalness: 1 });
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0018, 8, 24), met); aro.rotation.x = Math.PI / 2; llaves.add(aro);
  const llave = new THREE.Mesh(new RoundedBoxGeometry(0.022, 0.006, 0.06, 2, 0.002), new THREE.MeshStandardMaterial({ color: "#1A1A1A", roughness: 0.5 })); llave.position.set(0.012, 0.003, 0.038); llave.rotation.y = 0.4; llaves.add(llave);
  const hoja = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.002, 0.04), met); hoja.position.set(0.026, 0.003, 0.08); hoja.rotation.y = 0.4; llaves.add(hoja);
  llaves.traverse((m) => { if (m.isMesh) m.castShadow = true; }); }
export const CAL = lienzo(1100, 820);
{ const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.82), new THREE.MeshStandardMaterial({ map: CAL.t, roughness: 0.9 })); m.position.set(OX + 0.9, 1.75, -4.49); scene.add(m); }
// fajos (billete genérico de ejemplo, no imita ningún billete real)
const billete = tex(512, 220, (g, w, h) => { g.fillStyle = "#9FB7A4"; g.fillRect(0, 0, w, h); g.fillStyle = "#7E9C86"; g.fillRect(14, 14, w - 28, h - 28); g.fillStyle = "#CFDCCF"; g.beginPath(); g.ellipse(w * 0.72, h / 2, 62, 74, 0, 0, 7); g.fill();
  g.fillStyle = "#3F5A47"; g.font = F(900, 64); g.fillText("1000", 40, 92); g.font = F(800, 22); g.fillText("BILLETE DE EJEMPLO", 40, 140); g.strokeStyle = "#5E7C66"; g.lineWidth = 3; for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(w * 0.72, h / 2, 20 + i * 8, 0, 7); g.stroke(); } });
const fajaTex = tex(256, 64, (g, w, h) => { g.fillStyle = "#E9E3D3"; g.fillRect(0, 0, w, h); g.fillStyle = "#1A1A1A"; g.font = F(900, 30); g.textAlign = "center"; g.fillText("$100.000", w / 2, 43); });
const lado = new THREE.MeshStandardMaterial({ color: "#8FA894", roughness: 0.9 });
const matBill = [lado, lado, new THREE.MeshStandardMaterial({ map: billete, roughness: 0.8 }), lado, lado, lado];
const fajaMat = new THREE.MeshStandardMaterial({ map: fajaTex, roughness: 0.8 });
const FAJO_G = new THREE.BoxGeometry(0.155, 0.012, 0.066), FAJA_G = new THREE.BoxGeometry(0.032, 0.0126, 0.0666);
function fajo() { const g = new THREE.Group(); const b = new THREE.Mesh(FAJO_G, matBill); b.castShadow = b.receiveShadow = true; g.add(b); g.add(new THREE.Mesh(FAJA_G, fajaMat)); g.visible = false; scene.add(g); return g; }
const FAJOS = Array.from({ length: 40 }, fajo);
export const marcaPilaL = new THREE.Object3D(), marcaPilaM = new THREE.Object3D(), marcaPilaD = new THREE.Object3D(), marcaGolpe = new THREE.Object3D(); scene.add(marcaPilaL, marcaPilaM, marcaPilaD, marcaGolpe);
export const marcaRecibo = new THREE.Object3D(), marcaTicketM = new THREE.Object3D(), marcaTicketL = new THREE.Object3D(), marcaCal = new THREE.Object3D(), marcaPapel = new THREE.Object3D(); scene.add(marcaRecibo, marcaTicketM, marcaTicketL, marcaCal, marcaPapel);

// ===== TALLER (x = 400) =====
export const TX = 400;
cuarto(TX, ["assets/tex/Concrete044C/Concrete044C_Color.jpg", "assets/tex/Concrete044C/Concrete044C_Roughness.jpg"], ["assets/tex/Plaster003/Plaster003_Color.jpg", "assets/tex/Plaster003/Plaster003_Roughness.jpg"], 3, 3, 14, 11, 4.2);
const elev = poner(elevadorProto, TX, 0, -0.6, 0, 0.5);
{ const b = new THREE.Box3().setFromObject(elev); elev.position.y -= b.min.y; }
poner(PH.metal_tool_chest, TX - 3.4, 0, -3.6, 0.2, 1.6); poner(PH.tool_cart, TX + 2.6, 0, 0.6, -0.5, 1.0);
for (let i = 0; i < 4; i++) { const c = poner(PH.old_tyre, TX + 4.2, 0.12 + i * 0.2, -3.4, 0, 1.0); c.rotation.set(Math.PI / 2, 0, i * 0.7); }
for (let i = 0; i < 3; i++) { const c = poner(PH.old_tyre, TX + 3.5, 0.12 + i * 0.2, -3.9, 0, 1.0); c.rotation.set(Math.PI / 2, 0, i * 0.4); }
for (let i = 0; i < 3; i++) poner(PH.oil_tin, TX - 4.4 + i * 0.32, 0, -4.1, i, 1.0);
[-2.5, 0, 2.5].forEach((x) => { const t = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.2), new THREE.MeshBasicMaterial({ color: "#FFF8EE", toneMapped: false })); t.position.set(TX + x, 4.12, -0.6); scene.add(t); });
const luzTaller = new THREE.SpotLight("#FFF4E6", 0, 18, 1.0, 0.7, 1.2); luzTaller.position.set(TX + 1.5, 4.0, 2.5); luzTaller.target.position.set(TX, 0.8, -0.6); luzTaller.castShadow = true; luzTaller.shadow.mapSize.set(2048, 2048); scene.add(luzTaller, luzTaller.target);
export const marcaService = new THREE.Object3D(), marcaCubierta = new THREE.Object3D(), marcaFreno = new THREE.Object3D(); scene.add(marcaService, marcaCubierta, marcaFreno);
marcaService.position.set(TX, 3.1, -0.6); marcaCubierta.position.set(TX + 4.2, 1.0, -3.4); marcaFreno.position.set(TX - 0.9, 1.9, 0.9);

// ===== estación: display del surtidor (lienzo) =====
export const SURT = lienzo(600, 460);
{ const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.46), new THREE.MeshBasicMaterial({ map: SURT.t, toneMapped: false })); m.position.set(-61.6, 1.55, -1.05); scene.add(m); }
export const marcaSurt = new THREE.Object3D(); marcaSurt.position.set(-61.6, 1.85, -1.0); scene.add(marcaSurt);

// ---------- posproceso: AO + profundidad de campo + brillo + color ----------
const composer = new EffectComposer(renderer); composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, cam));
const gtao = new GTAOPass(scene, cam, W, H); gtao.blendIntensity = 0.85; composer.addPass(gtao);
const bokeh = new BokehPass(scene, cam, { focus: 5, aperture: 0.002, maxblur: 0.012 }); composer.addPass(bokeh);
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.3, 0.6, 0.85); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grado = new ShaderPass({ uniforms: { tDiffuse: { value: null }, vin: { value: 0.4 }, oscuro: { value: 0 }, noche: { value: 0 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `uniform sampler2D tDiffuse; uniform float vin, oscuro, noche; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 q = vUv - 0.5; c.rgb *= (1.0 - vin * dot(q, q) * 1.6) * (1.0 - oscuro);
      c.rgb = mix(c.rgb, c.rgb * c.rgb * (3.0 - 2.0 * c.rgb), 0.25); float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722)); c.rgb = mix(vec3(l), c.rgb, 1.08 - 0.3 * noche);
      gl_FragColor = c; }` });
composer.addPass(grado);

// ---------- planos ----------
// [desde, zona, ref ('M','L','ML' siguen al auto; 'iM','iL' = coordenadas dentro del auto; null = mundo), pos0, pos1, mira0, mira1, fov, apertura]
const PL = [
  [T.dos, "calle", "sem", [3.0, 1.5, 14.5], [2.0, 1.45, 13.5], [-0.3, 0.9, 4.4], [-0.5, 0.9, 4.4], 36, 0.0008],
  [T.uno, "calle", "ML", [-1.0, 7.5, 10.5], [-0.5, 6.8, 9.5], [0.5, 0.6, 4.4], [0.3, 0.6, 4.4], 38, 0.0008],
  [T.tranq, "int", "iM", [0.12, 1.2, -0.4], [0.1, 1.17, -0.28], [0.07, 1.02, 0.6], [0.07, 1.02, 0.6], 46, 0.004],
  [T.nisiq, "int", "iM", [0.02, 1.1, 0.2], [0.03, 1.09, 0.26], [0.08, 1.04, 0.56], [0.08, 1.04, 0.56], 40, 0.02],
  [T.martin, "ofi", null, [OX + 0.85, 1.22, 1.15], [OX + 0.6, 1.12, 0.95], [OX + 0.05, 0.8, 0.12], [OX + 0.05, 0.78, 0.12], 34, 0.012],
  [T.div, "int", "iM", [0.02, 1.1, 0.22], [0.03, 1.09, 0.26], [0.08, 1.04, 0.56], [0.08, 1.04, 0.56], 40, 0.02],
  [T.primeros, "ofi", null, [OX + 0.6, 1.6, -1.2], [OX + 0.75, 1.65, -1.6], [OX + 0.9, 1.75, -4.5], [OX + 0.9, 1.75, -4.5], 44, 0.002],
  [T.poreso, "calle", null, [0.0, 7.5, 21.0], [0.0, 6.8, 19.0], [0.0, 2.6, -1.0], [0.0, 2.6, -1.0], 44, 0.0004],
  [T.mes, "ofi", null, [OX - 0.12, MESA + 0.3, 0.12], [OX - 0.12, MESA + 0.29, 0.18], [OX - 0.12, MESA, -0.08], [OX - 0.12, MESA, 0.0], 36, 0.01],
  [T.gas, "estacion", null, [-58.2, 1.6, 3.8], [-58.8, 1.55, 3.2], [-61.6, 1.3, -0.8], [-61.6, 1.4, -0.9], 40, 0.003],
  [T.mono, "ofi", null, [OX - 0.12, MESA + 0.29, 0.2], [OX - 0.12, MESA + 0.3, 0.3], [OX - 0.12, MESA, 0.0], [OX - 0.12, MESA, 0.15], 36, 0.01],
  [T.lucas, "calle", "L", [4.8, 1.25, 11.8], [3.8, 1.2, 11.0], [0.0, 0.9, 5.4], [0.0, 0.9, 5.4], 34, 0.0012],
  [T.mesL, "ofi", null, [OX + 0.14, MESA + 0.3, 0.12], [OX + 0.14, MESA + 0.29, 0.16], [OX + 0.14, MESA, -0.08], [OX + 0.14, MESA, -0.02], 36, 0.01],
  [T.pero, "estacion", null, [-58.2, 1.6, 3.8], [-58.8, 1.55, 3.2], [-61.6, 1.3, -0.8], [-61.6, 1.4, -0.9], 40, 0.003],
  [T.service, "taller", null, [TX + 4.8, 1.9, 5.2], [TX + 3.6, 1.8, 4.4], [TX, 1.7, -0.6], [TX - 0.2, 1.7, -0.6], 40, 0.001],
  [T.seguro, "ofi", null, [OX + 0.14, MESA + 0.29, 0.18], [OX + 0.14, MESA + 0.3, 0.24], [OX + 0.14, MESA, -0.02], [OX + 0.14, MESA, 0.06], 36, 0.01],
  [T.gasto, "int", "iL", [0.44, 1.0, 0.04], [0.42, 0.99, 0.1], [0.38, 0.86, 0.568], [0.38, 0.86, 0.568], 44, 0.008],
  [T.vale, "int", "iL", [-0.15, 1.16, 0.12], [-0.1, 1.15, 0.18], [0.0, 1.04, 0.46], [0.0, 1.04, 0.46], 40, 0.015],
  [T.km4000, "int", "iL", [0.43, 1.0, 0.06], [0.41, 0.99, 0.12], [0.38, 0.86, 0.568], [0.38, 0.86, 0.568], 44, 0.008],
  [T.quedanL, "ofi", null, [OX + 0.14, MESA + 0.3, 0.3], [OX + 0.14, MESA + 0.32, 0.4], [OX + 0.14, MESA, 0.1], [OX + 0.14, MESA, 0.2], 36, 0.01],
  [T.comp, "ofi", null, [OX + 0.01, MESA + 0.62, 0.45], [OX + 0.01, MESA + 0.58, 0.4], [OX + 0.01, MESA, 0.06], [OX + 0.01, MESA, 0.06], 36, 0.006],
  [T.ysi, "calle", "L", [4.8, 1.25, 11.8], [3.8, 1.2, 11.0], [0.0, 0.9, 5.4], [0.0, 0.9, 5.4], 34, 0.0012],
  [T.porque, "ofi", null, [OX + 0.09, MESA + 0.5, 1.45], [OX + 0.09, MESA + 0.47, 1.35], [OX + 0.09, MESA + 0.08, 0.04], [OX + 0.09, MESA + 0.08, 0.04], 46, 0.003],
  [T.escritorio, "ofi", null, [OX + 0.02, MESA + 0.5, 0.42], [OX + 0.02, MESA + 0.46, 0.36], [OX + 0.02, MESA, 0.1], [OX + 0.02, MESA, 0.1], 36, 0.006],
  [T.claro, "ofi", null, [OX + 0.0, 1.45, 0.95], [OX + 0.0, 1.38, 0.82], [OX + 0.0, 0.78, 0.0], [OX + 0.0, 0.78, 0.0], 34, 0.006],
  [T.ojo, "ofi", null, [OX - 0.02, MESA + 0.5, 0.42], [OX - 0.02, MESA + 0.46, 0.36], [OX - 0.02, MESA, 0.1], [OX - 0.02, MESA, 0.1], 36, 0.006],
  [T.entonces, "ofi", null, [OX + 0.4, 1.3, 1.1], [OX + 0.3, 1.25, 1.0], [OX, 0.8, 0], [OX, 0.8, 0], 36, 0.008],
  [T.vos, "calle", "sem", [3.0, 1.5, 14.5], [2.2, 1.45, 13.7], [-0.3, 0.9, 4.4], [-0.5, 0.9, 4.4], 36, 0.0008],
];
function plano(t) { let i = 0; while (i + 1 < PL.length && t >= PL[i + 1][0]) i++; return i; }
export function nocheAt(t) {
  if (t >= T.poreso && t < T.lucas) return sstep(T.poreso + 0.3, T.mes - 0.2, t);
  if (t >= T.ysi && t < T.porque) return 1;
  return 0;
}

// ---------- lienzos ----------
const AZ = "#007BFF", AZL = "#00CFFF", NEG = "#0B0C0E";
function redondo(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function dibujar(L, firma, fn) { if (L.firma === firma) return; L.firma = firma; fn(L.g, L.w, L.h); L.t.needsUpdate = true; }
const VIAJES = [10400, 9800, 12600, 8900, 11200, 13100, 9700, 10800, 12200, 9300, 11800, 10600];
function telAt(t) {
  const B = t >= T.div - 0.3 && t < T.primeros + 0.5; const a0 = B ? T.div : T.tranq;
  let hoy = 38200; if (!B) VIAJES.slice(0, 3).forEach((v, k) => (hoy += v * clamp((t - (T.tranq + 1.2 + k * 2.2)) / 0.5)));
  const fe = clamp((t - T.div - 0.2) / (T.h30 - T.div - 0.2)); const of = clamp((t - T.viaje + 0.1) / 0.45); const rv = t >= T.pasaj;
  const ciclo = ((t - a0) % 6.5) / 6.5; const ac = Math.round(clamp((t - T.viaje) / 4) * 30);
  dibujar(TEL, [B, Math.round(hoy / 100), Math.round(fe * 360), Math.round(of * 20), rv, Math.round(ciclo * 60), ac].join("|"), (g, w, h) => {
    g.fillStyle = "#E9ECF1"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) for (let j = 0; j < 14; j++) { g.fillStyle = (i * 7 + j * 3) % 11 === 0 ? "#CFE3C8" : "#DADFE6"; redondo(g, 12 + i * 78, 10 + j * 86, 64, 72, 8); g.fill(); }
    const R = [[90, 1010], [90, 810], [250, 810], [250, 610], [410, 610], [410, 420], [490, 420], [490, 300]]; let tot = 0; const seg = []; for (let k = 1; k < R.length; k++) { const d = Math.hypot(R[k][0] - R[k - 1][0], R[k][1] - R[k - 1][1]); seg.push(d); tot += d; }
    const dib = clamp(ciclo / 0.25), rec = clamp((ciclo - 0.25) / 0.7); g.strokeStyle = AZ; g.lineWidth = 14; g.lineCap = g.lineJoin = "round"; g.beginPath(); g.moveTo(...R[0]); let acc = 0; let pos = R[0];
    for (let k = 1; k < R.length; k++) { const lim = tot * dib; if (acc >= lim) break; const f = Math.min(1, (lim - acc) / seg[k - 1]); g.lineTo(mix(R[k - 1][0], R[k][0], f), mix(R[k - 1][1], R[k][1], f)); acc += seg[k - 1]; } g.stroke();
    acc = 0; for (let k = 1; k < R.length; k++) { const lim = tot * rec; if (acc + seg[k - 1] >= lim) { const f = clamp((lim - acc) / seg[k - 1]); pos = [mix(R[k - 1][0], R[k][0], f), mix(R[k - 1][1], R[k][1], f)]; break; } acc += seg[k - 1]; pos = R[k]; }
    g.fillStyle = "#fff"; g.beginPath(); g.arc(...pos, 20, 0, 7); g.fill(); g.strokeStyle = AZ; g.lineWidth = 8; g.stroke();
    g.fillStyle = "#111"; g.font = F(800, 26, "Inter"); g.fillText(B ? "18:12" : "10:26", 40, 50); g.textAlign = "right"; g.fillText("5G ▮▮▮", w - 34, 50); g.textAlign = "left";
    g.fillStyle = "#111"; redondo(g, w / 2 - 170, 80, 340, 70, 35); g.fill(); g.fillStyle = AZL; g.beginPath(); g.arc(w / 2 - 130, 115, 9, 0, 7); g.fill();
    g.fillStyle = "#BFC4CC"; g.font = F(800, 22); g.fillText("HOY", w / 2 - 110, 123); g.fillStyle = "#fff"; g.font = F(900, 36); g.fillText(B ? pesos(Math.round(12000 * ((fe * 30) % 12) / 100) * 100) : pesos(hoy), w / 2 - 50, 128);
    const hy = h - 470;
    if (!B && of > 0) {
      const y = hy + (1 - eo(of)) * 480; g.fillStyle = "#fff"; redondo(g, 0, y, w, 520, 40); g.fill();
      g.fillStyle = "#5A6070"; g.font = F(900, 24); g.fillText("NUEVO VIAJE", 40, y + 56); g.fillStyle = NEG; g.font = F(900, 104); g.fillText("$10.000", 36, y + 160);
      g.fillStyle = "#3A3E46"; g.font = F(700, 28, "Inter"); g.fillText("6,2 km · 18 min", 40, y + 205);
      g.fillStyle = rv ? "#FFE9E9" : "#F1F3F6"; redondo(g, 30, y + 230, w - 60, 100, 18); g.fill(); g.fillStyle = "#3A3E46"; g.font = F(800, 24); g.fillText("Lo que paga el pasajero", 52, y + 268);
      g.fillStyle = rv ? "#B3262E" : "#9299A3"; g.font = F(900, 36); g.fillText(rv ? "$13.000 – 15.000" : "• • • • •", 52, y + 312);
      g.fillStyle = "#111"; redondo(g, 30, y + 350, w - 60, 90, 20); g.fill(); g.save(); redondo(g, 30, y + 350, w - 60, 90, 20); g.clip(); const gr = g.createLinearGradient(30, 0, w - 30, 0); gr.addColorStop(0, "#0057D9"); gr.addColorStop(1, AZL); g.fillStyle = gr; g.fillRect(30, y + 350, (w - 60) * ac / 30, 90); g.restore();
      g.fillStyle = "#fff"; g.font = F(900, 34); g.textAlign = "center"; g.fillText("ACEPTAR", w / 2, y + 407); g.textAlign = "left";
    }
    if (B) {
      const y = hy + (1 - eo(clamp((t - T.div) / 0.45))) * 480; g.fillStyle = "#fff"; redondo(g, 0, y, w, 520, 40); g.fill();
      g.fillStyle = "#5A6070"; g.font = F(900, 24); g.fillText("ESTA SEMANA", 40, y + 56); g.fillStyle = NEG; g.font = F(900, 96); g.fillText(pesos(Math.round(360 * fe) * 1000), 36, y + 155);
      g.fillStyle = "#3A3E46"; g.font = F(700, 28, "Inter"); g.fillText(Math.round(30 * fe) + " horas manejadas", 40, y + 200);
      g.fillStyle = "#E5E7EB"; redondo(g, 40, y + 235, w - 80, 34, 17); g.fill(); const gr = g.createLinearGradient(40, 0, w - 40, 0); gr.addColorStop(0, "#FF5A5A"); gr.addColorStop(1, "#B3262E"); g.fillStyle = gr; redondo(g, 40, y + 235, Math.max(34, (w - 80) * fe), 34, 17); g.fill();
      g.fillStyle = "#3A3E46"; g.font = F(800, 24); g.fillText("ALQUILER DEL AUTO", 40, y + 310); g.textAlign = "right"; g.fillText("$360.000", w - 40, y + 310); g.textAlign = "left";
      if (fe >= 1) { g.save(); g.translate(w / 2, y + 395); g.rotate(-0.08); g.strokeStyle = "#B3262E"; g.lineWidth = 6; redondo(g, -190, -40, 380, 80, 10); g.stroke(); g.fillStyle = "#B3262E"; g.font = F(900, 40); g.textAlign = "center"; g.fillText("30 HORAS", 0, 15); g.restore(); g.textAlign = "left"; }
    }
  });
}
function kmMes(t) { return t >= T.km4000 ? 4160 * eo((t - T.km4000) / 2.2) : 0; }
function odoAt(t) {
  const km = 82340 + kmMes(t) + Math.max(0, t - T.gasto) * 0.4;
  dibujar(ODO, String(Math.floor(km)), (g, w, h) => {
    g.fillStyle = "#050607"; g.fillRect(0, 0, w, h); const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); gr.addColorStop(0, "rgba(0,123,255,.2)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#3A3E46"; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, h + 40, 230, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    g.fillStyle = "#E5E7EB"; g.font = F(800, 100, "Inter"); g.textAlign = "center"; g.fillText(Math.floor(km).toLocaleString("es-AR"), w / 2, 170); g.fillStyle = "#9299A3"; g.font = F(800, 30); g.fillText("km", w / 2, 220); g.textAlign = "left";
  });
}
function etqAt(t) {
  const km = kmMes(t); const v = 15000000 - 33 * km;
  dibujar(ETQ, String(Math.round(v / 10)), (g, w, h) => {
    g.fillStyle = "#F4F1EA"; redondo(g, 0, 0, w, h, 26); g.fill(); g.fillStyle = "#C9C3B6"; g.beginPath(); g.arc(46, 46, 16, 0, 7); g.fill();
    g.fillStyle = "#5A6070"; g.font = F(900, 30); g.fillText("TU AUTO VALE", 84, 58); g.fillStyle = NEG; g.font = F(900, 74); g.fillText(pesos(v), 34, 160);
    g.fillStyle = "#9299A3"; g.font = F(700, 22, "Inter"); g.fillText("Ejemplo · $33 por km (avisos, nov. 2026)", 34, 210);
    if (km > 0) { g.fillStyle = "#B3262E"; g.font = F(900, 44); g.fillText("−" + pesos(33 * km), 34, 272); }
  });
}
function selloSobre(g, cx, cy, txt, color, rot = -0.12, esc = 1) {
  g.save(); g.translate(cx, cy); g.rotate(rot); g.scale(esc, esc); g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 9; g.font = F(900, 62); const tw = g.measureText(txt).width;
  redondo(g, -tw / 2 - 30, -56, tw + 60, 100, 14); g.stroke(); g.textAlign = "center"; g.fillText(txt, 0, 18); g.restore(); g.textAlign = "left";
}
function reciboAt(t) {
  const pg = t >= T.s360 + 0.25; dibujar(RECIBO, String(pg), (g, w, h) => {
    g.fillStyle = "#FBF8F2"; g.fillRect(0, 0, w, h); g.fillStyle = NEG; g.font = F(900, 40); g.fillText("RECIBO", 40, 70); g.fillStyle = "#5A6070"; g.font = F(700, 24, "Inter"); g.fillText("Flota · alquiler de auto para apps", 40, 108);
    g.strokeStyle = "#D7D2C6"; g.lineWidth = 2; [140, 300, 420].forEach((y) => { g.beginPath(); g.moveTo(40, y); g.lineTo(w - 40, y); g.stroke(); });
    g.fillStyle = "#3A3E46"; g.font = F(700, 28, "Inter"); g.fillText("Alquiler semanal · sedán con GNC", 40, 190); g.fillText("Incluye seguro y service", 40, 232); g.fillText("Combustible: a cargo del chofer", 40, 274);
    g.fillStyle = NEG; g.font = F(900, 30); g.fillText("TOTAL", 40, 380); g.font = F(900, 64); g.textAlign = "right"; g.fillText("$360.000", w - 40, 388); g.textAlign = "left";
    g.fillStyle = "#9299A3"; g.font = F(700, 20, "Inter"); g.fillText("Ejemplo con precios de avisos de nov. 2026", 40, 470);
    if (pg) selloSobre(g, w * 0.62, h * 0.55, "PAGADO", "rgba(179,38,46,.88)", -0.18, 1.3);
  });
}
function calAt(t) {
  const u = [0, 1, 2, 3, 4, 5, 6].map((k) => clamp((t - (T.primeros + 0.3 + k * 0.25)) / 0.35)); const ua = clamp((t - T.dueno - 0.6) / 0.5);
  dibujar(CAL, u.map((x) => Math.round(x * 10)).join("") + Math.round(ua * 10), (g, w, h) => {
    g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, w, h); g.fillStyle = NEG; g.fillRect(0, 0, w, 110); g.fillStyle = "#fff"; g.font = F(900, 54); g.fillText("SEMANA DE MARTÍN", 40, 75);
    const D = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"], cw = (w - 80) / 7;
    D.forEach((d, k) => { const x = 40 + k * cw; g.fillStyle = "#5A6070"; g.font = F(900, 34); g.textAlign = "center"; g.fillText(d, x + cw / 2, 165); g.textAlign = "left";
      g.strokeStyle = "#D7D2C6"; g.lineWidth = 3; g.strokeRect(x + 6, 190, cw - 12, 480);
      if (k === 6) { g.fillStyle = "#E5E7EB"; g.fillRect(x + 8, 192, cw - 16, 476); g.fillStyle = "#9299A3"; g.font = F(800, 24); g.save(); g.translate(x + cw / 2 + 8, 430); g.rotate(-Math.PI / 2); g.textAlign = "center"; g.fillText("DESCANSO", 0, 0); g.restore(); g.textAlign = "left"; return; }
      const rojo = k < 2 ? 1 : k === 2 ? 0.5 : 0, azul = 1 - rojo;
      const hr = 476 * rojo * eo(u[k]); g.fillStyle = "#D93A3A"; g.fillRect(x + 8, 668 - hr, cw - 16, hr);
      const ha = 476 * azul * eo(ua); g.fillStyle = AZ; g.fillRect(x + 8, 668 - 476 * rojo - ha, cw - 16, ha); });
    g.fillStyle = "#D93A3A"; g.fillRect(40, 720, 30, 30); g.fillStyle = NEG; g.font = F(800, 32); g.fillText("Para el dueño del auto · 30 h", 84, 746);
    if (ua > 0) { g.fillStyle = AZ; g.fillRect(40, 770, 30, 30); g.fillStyle = NEG; g.fillText("Para Martín", 84, 796); }
  });
}
function ticketAt(L, t, lineas, cab, sellos) {
  const vis = lineas.filter((l) => t >= l[0]).length; const sv = sellos.filter((s) => t >= s[0]).length;
  dibujar(L, vis + "|" + sv, (g, w, h) => {
    g.fillStyle = "#FBFAF7"; g.fillRect(0, 0, w, h); g.fillStyle = NEG; g.font = F(900, 30, "Inter"); g.textAlign = "center"; g.fillText(cab[0], w / 2, 60); g.font = F(700, 20, "Inter"); g.fillStyle = "#5A6070"; g.fillText(cab[1], w / 2, 92); g.fillText(cab[2], w / 2, 118); g.textAlign = "left";
    g.strokeStyle = "#BDB7AA"; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(20, 140); g.lineTo(w - 20, 140); g.stroke(); g.setLineDash([]);
    let y = 190; lineas.slice(0, vis).forEach(([, txt, val, tipo]) => {
      if (tipo === "total") { g.strokeStyle = NEG; g.lineWidth = 2; g.beginPath(); g.moveTo(20, y - 30); g.lineTo(w - 20, y - 30); g.stroke(); y += 10; }
      g.fillStyle = tipo === "menos" ? "#B3262E" : NEG; g.font = F(tipo === "total" ? 900 : 700, tipo === "total" ? 26 : 21, "Inter");
      const partes = txt.split("\n"); partes.forEach((p, i) => g.fillText(p, 20, y + i * 26)); g.textAlign = "right"; g.font = F(900, tipo === "total" ? 32 : 25, "Inter"); g.fillText(val, w - 20, y + (partes.length - 1) * 26); g.textAlign = "left";
      y += 52 + (partes.length - 1) * 26; });
    sellos.slice(0, sv).forEach(([, txt, color, yy]) => selloSobre(g, w / 2, yy, txt, color, -0.1, 0.62));
  });
}
const TM = [[T.m3744 - 0.2, "La app le paga", "$3.744.000"], [T.alq, "Alquiler del auto\n($360.000 × 4,3 sem.)", "−$1.560.000", "menos"], [T.gas, "Gas (GNC)", "−$427.000", "menos"],
  [T.mono, "Monotributo + IIBB\n(categoría F)", "−$227.000", "menos"], [T.cel, "Celular", "−$23.000", "menos"], [T.quedan, "LE QUEDAN", "$1.507.000", "total"], [T.h312, "312 h al mes\n(12 h × 6 días)", "÷ 312"]];
const TL = [[T.m2496 - 0.2, "La app le paga", "$2.496.000"], [T.gasL, "Gas (GNC)", "−$285.000", "menos"], [T.service, "Service, cubiertas,\nfrenos, amortiguad.", "−$279.000", "menos"], [T.seguro, "Seguro", "−$106.000", "menos"],
  [T.impuestos, "Monotributo + IIBB\n(categoría D)", "−$125.000", "menos"], [T.patente, "Patente, VTV, celular,\nlavado, equipo GNC", "−$97.000", "menos"], [T.s137, "Lo que pierde de valor\n(4.160 km × $33)", "−$137.000", "menos"],
  [T.m1466 - 0.1, "LE QUEDAN", "$1.466.000", "total"], [T.m1466 + 0.8, "208 h al mes\n(8 h × 6 días)", "÷ 208"]];
function polizaAt(t) {
  const st = t >= T.rechazar + 0.2; dibujar(POLIZA, String(st), (g, w, h) => {
    g.fillStyle = "#FBF8F2"; g.fillRect(0, 0, w, h); g.fillStyle = "#1E3A6B"; g.fillRect(0, 0, w, 120); g.fillStyle = "#fff"; g.font = F(900, 50); g.fillText("PÓLIZA DE AUTO", 40, 78);
    const L = [["Vehículo", "Sedán 4 puertas"], ["Cobertura", "Terceros completo"], ["Uso declarado", "PARTICULAR"], ["Vigencia", "12 meses"]];
    L.forEach(([a, b], i) => { g.fillStyle = "#5A6070"; g.font = F(700, 26, "Inter"); g.fillText(a, 40, 200 + i * 110); g.fillStyle = NEG; g.font = F(900, i === 2 ? 46 : 36, "Inter"); g.fillText(b, 40, 245 + i * 110); });
    g.strokeStyle = "#D7D2C6"; g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(40, 700 + i * 50); g.lineTo(w - 40 - (i % 2) * 120, 700 + i * 50); g.stroke(); }
    g.fillStyle = "#9299A3"; g.font = F(700, 22, "Inter"); g.fillText("Documento de ejemplo", 40, h - 40);
    if (st) selloSobre(g, w / 2, 560, "SINIESTRO RECHAZADO", "rgba(179,38,46,.9)", -0.2, 0.95);
  });
}
function casoAt(t) {
  const k = [T.escritorio + 1.6, T.alquilaG, T.manejaG, T.s6070].filter((a) => t >= a).length; dibujar(CASO, String(k), (g, w, h) => {
    g.fillStyle = "#FBF8F2"; g.fillRect(0, 0, w, h); g.fillStyle = AZ; g.fillRect(40, 60, 12, 120); g.fillStyle = NEG; g.font = F(900, 46); g.fillText("CASO REAL · ROSARIO", 76, 110); g.fillStyle = "#5A6070"; g.font = F(700, 26, "Inter"); g.fillText("Testimonio publicado en La Capital, 26/04/2026", 76, 160);
    const L = [["Gerardo", "62 años"], ["Alquila un auto con GNC", "$360.000 / semana"], ["Maneja", "12 h por día"]];
    L.slice(0, k).forEach(([a, b], i) => { g.fillStyle = "#3A3E46"; g.font = F(700, 32, "Inter"); g.fillText(a, 40, 270 + i * 100); g.fillStyle = NEG; g.font = F(900, 40, "Inter"); g.textAlign = "right"; g.fillText(b, w - 40, 270 + i * 100); g.textAlign = "left"; });
    if (k >= 4) { g.fillStyle = "#EEF4FF"; redondo(g, 30, 600, w - 60, 330, 20); g.fill(); g.fillStyle = NEG; g.font = F(900, 52, "Inter"); ["«Limpios me quedan", "entre $60.000 y", "$70.000 por día»"].forEach((s, i) => g.fillText(s, 60, 690 + i * 70));
      g.fillStyle = "#5A6070"; g.font = F(700, 24, "Inter"); g.fillText("Nuestra cuenta de Martín: ≈ $58.000 por día,", 40, 1010); g.fillText("ya pagados el monotributo y los impuestos.", 40, 1044); }
  });
}
function surtAt(t, total, desde) {
  const v = total * eo((t - desde) / 1.8); dibujar(SURT, String(Math.round(v / 100)), (g, w, h) => {
    g.fillStyle = "#07090C"; g.fillRect(0, 0, w, h); g.strokeStyle = "#2A2E36"; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = "#9299A3"; g.font = F(800, 30); g.fillText("GNC · ESTE MES", 30, 64); g.fillStyle = "#7CFFB2"; g.font = F(700, 96, "Inter"); g.textAlign = "right"; g.fillText(pesos(v), w - 30, 190);
    g.fillStyle = "#9299A3"; g.font = F(800, 26); g.textAlign = "left"; g.fillText("m³", 30, 290); g.fillStyle = "#7CFFB2"; g.font = F(700, 70, "Inter"); g.textAlign = "right"; g.fillText((v / 685).toFixed(0), w - 30, 300);
    g.fillStyle = "#9299A3"; g.font = F(800, 24); g.textAlign = "left"; g.fillText("PRECIO POR m³  $685", 30, 400);
  });
}

// ---------- utilidades ----------
const _v = new THREE.Vector3();
export function aPantalla(obj, local = [0, 0, 0]) { obj.updateWorldMatrix(true, false); _v.set(...local); obj.localToWorld(_v); _v.project(cam); return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H, vis: _v.z < 1 && _v.z > -1 }; }
export const estado = { plano: 0, zona: "calle" };
const CARRIL_M = 3.3, CARRIL_L = 5.5;

export function render(t, oscuro = 0) {
  const i = plano(t); const P = PL[i]; const [t0, zona, ref] = P; const t1 = i + 1 < PL.length ? PL[i + 1][0] : T.fin; const u = ease(clamp((t - t0) / (t1 - t0))); const s = t - t0;
  const n = (zona === "calle" || zona === "int") ? nocheAt(t) : zona === "estacion" && t < T.lucas ? 0.85 : 0;
  // --- autos ---
  let mx = 999, lx = 999; const ry = Math.PI / 2;
  const enSem = ref === "sem"; const verde = P[0] === T.vos && t > T.mandaselo + 0.6;
  if (enSem) { const arr = verde ? Math.pow(Math.max(0, t - T.mandaselo - 0.6), 2) * 1.2 : 0; mx = 2.2 + arr; lx = -2.8 + arr * 0.92; }
  else if (P[0] === T.uno) { mx = -2 + s * 1.2; lx = -7 + s * 1.2; }
  else if (zona === "int") { const v = 4.5; if (ref === "iM") mx = -14 + ((s * v) % 26); else lx = -14 + ((s * v) % 26); }
  else if (P[0] === T.poreso) { mx = -14 + ((s * 7) % 30); }
  else if (P[0] === T.lucas || P[0] === T.ysi) { lx = -9 + s * 1.6; }
  const est = zona === "estacion" ? (t < T.lucas ? "M" : "L") : null;
  ubicar(autoM, est === "M" ? -61.8 : mx, 0, est === "M" ? 0.9 : CARRIL_M, ry, n, est === "M" || mx < 900, mx < 900 ? mx : 0);
  const enTaller = zona === "taller";
  ubicar(autoL, est === "L" ? -61.8 : enTaller ? TX : lx, enTaller ? 0.1 + 1.45 * eo((t - T.service) / 1.2) : 0, est === "L" ? 0.9 : enTaller ? -0.6 : CARRIL_L, enTaller ? 0 : ry, n, est === "L" || lx < 900 || enTaller, lx < 900 ? lx : 0);
  marcaM.position.set(autoM.o.position.x, autoM.o.position.y + 1.75, autoM.o.position.z); marcaL.position.set(autoL.o.position.x, autoL.o.position.y + 1.75, autoL.o.position.z);
  autoM.cuerpo.visible = !(zona === "int" && ref === "iM"); autoL.cuerpo.visible = !(zona === "int" && ref === "iL");
  if (zona === "int") { const a = ref === "iM" ? autoM : autoL; if (INT.parent !== a.o) a.o.add(INT); INT.visible = true; etqG.visible = ref === "iL"; volante.visible = !(ref === "iL" && (P[0] === T.gasto || P[0] === T.km4000)); volante.rotation.z = Math.sin(t * 0.7) * 0.08; } else INT.visible = false;
  const rojo = enSem && !verde; SEMAF.userData.focos[0].emissiveIntensity = rojo ? 5 : 0; SEMAF.userData.focos[2].emissiveIntensity = verde ? 5 : 0;
  // --- personas ---
  transeuntes.forEach((p, k) => { const L = 26, v = 1.1, ss = ((t * v + k * 9) % L); const ida = k % 2 === 0; mover(p, ss / v, 0.15, [ida ? -13 : 13, -0.3 - k * 0.6], [ida ? 13 : -13, -0.3 - k * 0.6], 0, L / v, null, "parado", k * 0.7); });
  mover(playero, t, 0, [-64.2, 0.6], [-64.2, 0.6], 0, 0.01, [-61.6, 0.7], "parado", 0.4);
  mover(empleado, t, 0, [OX + 0.1, -0.85], [OX + 0.1, -0.85], 0, 0.01, [OX + 0.1, 1], "parado", 1.2); empleado.o.visible = !(t >= T.porque && t < T.escritorio);
  mover(mecanico, t, 0, [TX - 1.7, 1.5], [TX - 1.7, 1.5], 0, 0.01, [TX, -0.6], "parado", 0.6);
  // --- oficina: qué hay sobre la mesa ---
  const entre = (a, b) => t >= a && t < b;
  RECIBO.mesh.visible = entre(T.martin - 0.5, T.div); llaves.visible = RECIBO.mesh.visible; llaves.position.set(OX - 0.13, MY(), 0.2);
  const enComp = entre(T.comp - 0.5, T.porque);
  TICKET_M.mesh.visible = entre(T.mes - 0.5, T.lucas) || enComp; TICKET_L.mesh.visible = entre(T.mesL - 0.5, T.gasto) || entre(T.quedanL - 0.5, T.porque);
  POLIZA.mesh.visible = entre(T.ojo - 0.5, T.vos); CASO.mesh.visible = entre(T.escritorio - 0.5, T.claro);
  TICKET_M.mesh.position.x = enComp ? OX - 0.08 : OX - 0.12; TICKET_L.mesh.position.x = enComp ? OX + 0.1 : OX + 0.14;
  const baja = (ta) => { const d = t - ta; return d < -0.35 || d > 0.6 ? 1 : d < 0 ? 1 - eo((d + 0.35) / 0.35) : d < 0.25 ? 0 : eo((d - 0.25) / 0.35); };
  const selloRecibo = entre(T.martin + 1, T.div), selloPoliza = entre(T.ojo, T.entonces); sello.visible = selloRecibo || selloPoliza;
  if (selloRecibo) sello.position.set(OX + 0.12, MY() + 0.16 * baja(T.s360 + 0.25), 0.13); else sello.position.set(OX - 0.02, MY() + 0.16 * baja(T.rechazar + 0.2), 0.08);
  marcaRecibo.position.set(OX + 0.05, MY() + 0.05, 0.12); marcaTicketM.position.set(TICKET_M.mesh.position.x, MY() + 0.01, -0.12); marcaTicketL.position.set(TICKET_L.mesh.position.x, MY() + 0.01, -0.12);
  marcaCal.position.set(OX + 0.9, 2.18, -4.49); marcaPapel.position.set(OX, MY() + 0.03, -0.05);
  // fajos: costo del auto de Lucas vs alquiler de Martín (cada fajo = $100.000) y el desgaste de 36 meses
  FAJOS.forEach((f) => (f.visible = false));
  if (entre(T.porque, T.escritorio)) {
    const nL = 8, nM = 16; const uL = clamp((t - T.s800 + 0.3) / 1.2), uM = clamp((t - T.mpaga + 0.2) / 1.6), ud = eo((t - T.dif - 0.2) / 0.9);
    for (let k = 0; k < nL; k++) { const f = FAJOS[k]; const a = clamp(uL * nL - k); f.visible = a > 0; f.position.set(OX - 0.2, MY() + 0.006 + k * 0.0125 + (1 - eo(a)) * 0.15, 0.1); f.rotation.set(0, 0.04 * Math.sin(k * 2.1), 0); }
    for (let k = 0; k < nM; k++) { const f = FAJOS[nL + k]; const a = clamp(uM * nM - k); f.visible = a > 0; const sale = k >= nL ? ud : 0; f.position.set(OX + 0.12 + sale * 0.26, MY() + 0.006 + (k - (k >= nL ? nL * sale : 0)) * 0.0125 + (1 - eo(a)) * 0.15 + Math.sin(Math.PI * sale) * 0.05, 0.1 - sale * 0.1); f.rotation.set(0, 0.04 * Math.sin(k * 1.7), 0); }
    llaves.visible = true; llaves.position.set(OX + 0.42, MY(), 0.12);
    marcaPilaL.position.set(OX - 0.2, MY() + 0.12, 0.1); marcaPilaM.position.set(OX + 0.12, MY() + 0.21, 0.1); marcaPilaD.position.set(OX + 0.38, MY() + 0.12, 0.0);
  }
  if (entre(T.desgaste - 0.3, T.ojo)) {
    const ug = eo((t - T.golpe) / 0.7);
    for (let k = 0; k < 36; k++) { const f = FAJOS[k]; const a = clamp((t - T.desgaste - k * 0.045) / 0.2); f.visible = a > 0;
      const gx = OX - 0.42 + (k % 9) * 0.105, gz = -0.14 + Math.floor(k / 9) * 0.08, px = OX, pz = 0.05, py = MY() + 0.006 + k * 0.0125;
      f.position.set(mix(gx, px, ug), mix(MY() + 0.006 + (1 - eo(a)) * 0.08, py, ug) + Math.sin(Math.PI * ug) * 0.12, mix(gz, pz, ug)); f.rotation.set(0, mix(0, 0.05 * Math.sin(k * 1.3), ug), 0); }
    marcaGolpe.position.set(OX, MY() + 0.48, 0.05);
  }
  // --- lienzos ---
  if (zona === "int" && ref === "iM") telAt(t);
  if (zona === "int" && ref === "iL") { odoAt(t); etqAt(t); telAt(t); }
  if (RECIBO.mesh.visible) reciboAt(t);
  if (zona === "ofi" && t >= T.primeros && t < T.poreso) calAt(t);
  if (TICKET_M.mesh.visible) ticketAt(TICKET_M, t, TM, ["MARTÍN · ALQUILA", "Por mes · 12 h × 6 días", "Ejemplo · nov. 2026"], [[T.m4830, "$4.830 LA HORA", "rgba(179,38,46,.9)", 1180]]);
  if (TICKET_L.mesh.visible) ticketAt(TICKET_L, t, TL, ["LUCAS · AUTO PROPIO", "Por mes · 8 h × 6 días", "Ejemplo · nov. 2026"], [[T.m7050, "$7.050 LA HORA", "rgba(0,87,217,.9)", 1500]]);
  if (POLIZA.mesh.visible) polizaAt(t); if (CASO.mesh.visible) casoAt(t);
  if (zona === "estacion") surtAt(t, est === "M" ? 427000 : 285000, est === "M" ? T.gas + 0.2 : T.pero + 0.6);
  // --- cámara ---
  const cp = new THREE.Vector3(...P[3].map((v, k) => mix(v, P[4][k], u))), cm = new THREE.Vector3(...P[5].map((v, k) => mix(v, P[6][k], u)));
  if (ref === "iM" || ref === "iL") { const a = ref === "iM" ? autoM : autoL; a.o.updateWorldMatrix(true, true); a.o.localToWorld(cp); a.o.localToWorld(cm); cp.y += Math.sin(t * 23) * 0.0025 + Math.sin(t * 7.3) * 0.0025; }
  else if (ref === "M" || ref === "L" || ref === "ML") { const ox = ref === "M" ? autoM.o.position.x : ref === "L" ? autoL.o.position.x : (autoM.o.position.x + autoL.o.position.x) / 2; cp.x += ox; cm.x += ox; }
  cam.position.copy(cp); cam.fov = P[7]; cam.aspect = W / H; cam.updateProjectionMatrix(); cam.lookAt(cm);
  // --- luz y ambiente por zona ---
  const exterior = zona === "calle" || zona === "int" || zona === "estacion";
  scene.environment = exterior ? (n > 0.5 ? ENV_NOCHE : ENV_DIA) : zona === "ofi" ? ENV_OFI : ENV_TALLER;
  scene.environmentIntensity = zona === "ofi" ? 0.7 : zona === "taller" ? 0.8 : mix(1.0, 0.35, n);
  const tinte = new THREE.Color().setRGB(mix(1, 0.42, n), mix(1, 0.48, n), mix(1, 0.72, n));
  MATS.forEach(([m, c, brilla]) => { m.color.copy(c); if (!brilla) m.color.multiply(tinte); else m.color.multiplyScalar(1 + n * 1.5); });
  FAROLES.forEach(([p, h]) => { p.intensity = n * 14; h.material.opacity = n; h.visible = n > 0.01; });
  VENT.opacity = sstep(0.35, 0.9, n) * 0.95;
  hemi.intensity = exterior ? mix(0.6, 0.15, n) : 0.2;
  sol.intensity = zona === "ofi" ? 2.4 : zona === "taller" ? 0.0 : 3.0 * Math.pow(1 - n, 1.5);
  const base = zona === "ofi" ? new THREE.Vector3(OX, 0.8, 0) : cm.clone(); const dir = zona === "ofi" ? new THREE.Vector3(-4, 6, 3) : SOL_DIR;
  sol.target.position.copy(base); sol.position.copy(base).add(dir); const ext = zona === "ofi" ? 2 : 8;
  Object.assign(sol.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext }); sol.shadow.camera.updateProjectionMatrix();
  sol.color.set(zona === "ofi" ? "#FFE2BC" : "#FFE6C8");
  lamparaLuz.intensity = zona === "ofi" ? 2.5 : 0; luzTaller.intensity = zona === "taller" ? 90 : 0;
  cielo.setRGB(mix(0.56, 0.02, n), mix(0.70, 0.035, n), mix(0.86, 0.09, n));
  renderer.toneMappingExposure = zona === "ofi" ? 1.05 : mix(1.0, 1.25, n);
  // --- profundidad de campo: foco donde mira la cámara ---
  bokeh.uniforms.focus.value = cam.position.distanceTo(cm); bokeh.uniforms.aperture.value = P[8]; bokeh.uniforms.maxblur.value = 0.014;
  bloom.strength = zona === "int" || n > 0.3 ? 0.45 : 0.2;
  grado.uniforms.vin.value = mix(0.4, 0.75, n); grado.uniforms.oscuro.value = oscuro; grado.uniforms.noche.value = n;
  composer.render();
  estado.plano = i; estado.zona = zona; return { plano: i, noche: n, zona };
}
