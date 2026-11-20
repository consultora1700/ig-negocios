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
// tiempos de la voz v5 (voz5/tiempos.py)
export const T = {
  gancho: 0.0, depende: 3.3, tres: 5.12, hacemos: 6.4, cap1: 8.34, martin: 10.3, dia: 11.48, noEsSuyo: 15.6,
  s360: 17.54, div: 21.08, h30: 23.38, lunes: 24.54, poreso: 28.02, mes: 31.94, alq: 35.3, gas: 37.6,
  mono: 40.14, cel: 43.44, quedan: 45.7, h312: 48.52, m4800: 50.06, cap2: 51.84, quien: 54.24, dueno: 56.72,
  compro: 58.2, s159: 62.02, cobra: 63.74, paga: 66.24, service: 66.84, seguro: 71.24, monoD: 73.4, patente: 75.14,
  bolsillo: 77.56, invisible: 80.66, km: 82.6, s33: 85.28, s206: 89.3, ganancia: 90.88, sinManejar: 93.66, recupera: 94.68,
  dos: 97.14, pone318: 98.34, m1500: 100.4, igual: 102.8, h312b: 104.1, cero: 106.02, riesgo: 107.52, noPaga: 109.36,
  caja: 112.74, choca: 114.7, rechazar: 117.68, kmAno: 119.42, cap3: 124.76, lucas: 127.16, noAlq: 128.34, maneja8: 132.18,
  app2496: 134.0, quedaL: 136.92, masQue: 139.3, h104: 140.34, m7340: 142.26, si12: 144.02, m2360: 146.5, cierre: 148.4,
  duenoPlata: 149.64, lucasDos: 150.92, metodo: 153.86, entra: 155.32, menos: 156.24, tambien: 157.92, dividido: 159.22, lado: 161.54,
  comenta: 162.86, mandaselo: 163.48, seguime: 165.56, fin: 167.54,
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
const SEMAF = new THREE.Group(); scene.add(SEMAF); SEMAF.position.set(4.4, 0.15, 7.4);
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

// ---------- auto (Quaternius NormalCar1, CC0) reexportado con sus 6 materiales (blender/auto_v5.py); frente hacia +z ----------
const PROTO_MODERNO = (await carga("assets/p2/auto-v5.glb")).scene;
const ESC_AUTO = 1.03, WHEEL_R = 0.262 * ESC_AUTO;
function auto(pintura) {
  const wrapper = new THREE.Group(); scene.add(wrapper);
  const o = PROTO_MODERNO.clone(true);
  o.scale.setScalar(ESC_AUTO);
  wrapper.add(o);
  const ruedas = [], wheelMeshes = new Set(), bodyMeshes = [];
  o.traverse((m) => {
    if (/^Wheel(Front|Rear)(L|R)$/.test(m.name)) { ruedas.push(m); m.userData.baseQ = m.quaternion.clone(); m.traverse((c) => { if (c.isMesh) wheelMeshes.add(c); }); }
  });
  o.traverse((m) => {
    if (m.isMesh) {
      m.castShadow = true; m.receiveShadow = true;
      const mats = (Array.isArray(m.material) ? m.material : [m.material]).map((src) => {
        const mn = src.name || "";
        if (/Paint 1|^Blue$/.test(mn)) return new THREE.MeshPhysicalMaterial({ name: mn, color: pintura, metalness: 0.45, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 });
        if (/Glass|^Windows$/.test(mn)) return new THREE.MeshPhysicalMaterial({ name: mn, color: "#06080B", metalness: 0, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 });
        if (/Headlight/.test(mn)) return new THREE.MeshStandardMaterial({ name: mn, color: "#EDEDE6", roughness: 0.1, emissive: "#FFF6E0", emissiveIntensity: 0 });
        if (/Taillight|^TailLights$/i.test(mn)) return new THREE.MeshStandardMaterial({ name: mn, color: "#8A0A0A", roughness: 0.15, emissive: "#FF1A1A", emissiveIntensity: 0 });
        if (/Rim|^Grey$/.test(mn)) return new THREE.MeshStandardMaterial({ name: mn, color: "#B9BDC4", metalness: 1, roughness: 0.28 });
        const c = src.clone(); c.side = THREE.FrontSide; return c;
      });
      m.material = Array.isArray(m.material) ? mats : mats[0];
      if (!wheelMeshes.has(m)) bodyMeshes.push(m);
    }
  });
  const luces = []; o.traverse((m) => { if (m.isMesh) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => { if (/light/i.test(x.name)) luces.push(x); }); });
  const cuerpo = { set visible(v) { bodyMeshes.forEach((m) => (m.visible = v)); }, get visible() { return bodyMeshes[0]?.visible ?? true; } };
  const faros = [[0.75, 0.55, 2.1, "#EAF2FF", 1.1], [-0.75, 0.55, 2.1, "#EAF2FF", 1.1], [0.75, 0.55, -2.1, "#FF3A3A", 0.7], [-0.75, 0.55, -2.1, "#FF3A3A", 0.7]].map(([x, y, z, c, s]) => [halo(0, 0, 0, s, c), [x, y, z]]);
  const luz = new THREE.SpotLight("#EAF2FF", 0, 22, 0.55, 0.5, 1.4); scene.add(luz, luz.target);
  return { o: wrapper, ruedas, faros, luz, cuerpo, luces };
}
const _spinQ = new THREE.Quaternion(), _spinAxis = new THREE.Vector3(1, 0, 0);
// autoM = el Cronos del dueño que maneja Martín (azul); autoD2 = segundo auto del dueño (igual); autoL = el de Lucas (rojo)
export const autoM = auto("#24456E"), autoL = auto("#8A1F25"), autoD2 = auto("#24456E");
const _p = new THREE.Vector3();
function ubicar(a, x, y, z, ry, noche = 0, vis = true, giro = 0) {
  a.o.visible = vis; a.o.position.set(x, y, z); a.o.rotation.set(0, ry, 0);
  a.ruedas.forEach((r) => { _spinQ.setFromAxisAngle(_spinAxis, giro / WHEEL_R); r.quaternion.copy(r.userData.baseQ).premultiply(_spinQ); });
  a.o.updateWorldMatrix(true, true);
  a.faros.forEach(([h, l]) => { _p.set(...l); a.o.localToWorld(_p); h.position.copy(_p); h.material.opacity = noche; h.visible = vis && noche > 0.01; });
  a.luces.forEach((m) => (m.emissiveIntensity = 0.3 + noche * 2.5));
  _p.set(0, 0.55, 2.1); a.o.localToWorld(_p); a.luz.position.copy(_p); _p.set(0, 0, 8); a.o.localToWorld(_p); a.luz.target.position.copy(_p); a.luz.intensity = vis ? noche * 40 : 0;
}
export const marcaM = new THREE.Object3D(), marcaL = new THREE.Object3D(); scene.add(marcaM, marcaL);

// ---------- interior: tablero, volante, soporte con celular (viaja dentro del auto; coordenadas del auto) ----------
const INT = new THREE.Group();
const plast = new THREE.MeshStandardMaterial({ color: "#1C1E22", roughness: 0.75 }), plast2 = new THREE.MeshStandardMaterial({ color: "#2A2D33", roughness: 0.6 });
{ const tab = new THREE.Mesh(new RoundedBoxGeometry(1.72, 0.32, 0.55, 4, 0.08), plast); tab.position.set(0, 0.8, 0.85); INT.add(tab);
  const consola = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.5, 0.5, 3, 0.04), plast); consola.position.set(0, 0.5, 0.5); INT.add(consola);
  [1, -1].forEach((x) => { const pil = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.62, 0.07), plast); pil.position.set(x * 0.8, 1.15, 0.72); pil.rotation.x = 0.75; INT.add(pil); });
  const techo = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.04, 1.6), new THREE.MeshStandardMaterial({ color: "#8B8680", roughness: 0.9, side: THREE.DoubleSide })); techo.position.set(0, 1.29, -0.3); INT.add(techo);
  const espejo = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.04, 0.02, 2, 0.006), plast); espejo.position.set(-0.12, 1.24, 0.46); INT.add(espejo); }
const volante = new THREE.Group(); volante.position.set(0.38, 0.92, 0.46); volante.rotation.x = -0.45; INT.add(volante);
{ volante.add(new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 12, 40), plast)); const cubo = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.05, 20), plast2); cubo.rotation.x = Math.PI / 2; volante.add(cubo);
  [0, 2.1, 4.2].forEach((a) => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.015), plast2); r.position.set(Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0); r.rotation.z = a; volante.add(r); }); }
// odómetro (lienzo) detrás del volante
export const ODO = lienzo(512, 256);
{ const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), new THREE.MeshBasicMaterial({ map: ODO.t, toneMapped: false })); m.position.set(0.38, 0.86, 0.568); m.rotation.set(0, Math.PI, 0); INT.add(m); }
// soporte y celular con la app (lienzo); la pantalla mira hacia el conductor (−z)
export const TEL = lienzo(540, 1170);
const telG = new THREE.Group(); telG.position.set(0.06, 1.1, 0.52); telG.rotation.order = "YXZ"; telG.rotation.set(0.22, Math.PI - 0.3, 0); INT.add(telG);
{ const cuerpo = new THREE.Mesh(new RoundedBoxGeometry(0.078, 0.162, 0.009, 4, 0.008), new THREE.MeshStandardMaterial({ color: "#101114", roughness: 0.3, metalness: 0.5 })); telG.add(cuerpo);
  const pant = new THREE.Mesh(new THREE.PlaneGeometry(0.072, 0.156), new THREE.MeshBasicMaterial({ map: TEL.t, color: "#E6E6E6" })); pant.position.z = 0.0047; telG.add(pant);
  const brazo = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 10), plast); brazo.position.set(0, -0.11, -0.02); telG.add(brazo); }
export const marcaTel = new THREE.Object3D(); marcaTel.position.set(0, 0.085, 0); telG.add(marcaTel);
// etiqueta de precio colgada del espejo (lienzo)
export const ETQ = lienzo(512, 300);
const etqG = new THREE.Group(); etqG.position.set(-0.12, 1.21, 0.46); INT.add(etqG);
{ const hilo = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.1, 6), new THREE.MeshStandardMaterial({ color: "#DDD" })); hilo.position.y = -0.05; etqG.add(hilo);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.076), new THREE.MeshStandardMaterial({ map: ETQ.t, roughness: 0.8, side: THREE.DoubleSide })); p.position.y = -0.14; p.rotation.y = Math.PI; etqG.add(p); }
export const marcaOdo = new THREE.Object3D(); marcaOdo.position.set(0.38, 0.95, 0.56); INT.add(marcaOdo);
export const marcaEtq = new THREE.Object3D(); marcaEtq.position.set(-0.12, 1.12, 0.46); INT.add(marcaEtq);
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
const transeuntes = [persona("clienta"), persona("clienta")];
const playero = persona("clienta"), mecanico = persona("clienta");
// los tres protagonistas: Martín (alquila), el dueño, Lucas (maneja lo suyo)
export const martinP = persona("repartidor"), duenoP = persona("vendedor"), lucasP = persona("vecino");
export const marcaMartin = new THREE.Object3D(), marcaDueno = new THREE.Object3D(), marcaLucas = new THREE.Object3D(); scene.add(marcaMartin, marcaDueno, marcaLucas);

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
export const TICKET_M = papel(0.12, 0.30, 480, 1200, OX - 0.1, 0.04, -0.03);
export const TICKET_D = papel(0.12, 0.30, 480, 1200, OX + 0.1, 0.04, 0.03);
export const TICKET_L = papel(0.12, 0.30, 480, 1200, OX + 0.1, 0.04, 0.03);
export const POLIZA = papel(0.21, 0.297, 840, 1188, OX - 0.02, 0.1, -0.05);
export const CASO = papel(0.21, 0.16, 840, 640, OX + 0.02, 0.08, 0.03);
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
export const marcaRecibo = new THREE.Object3D(), marcaTicketM = new THREE.Object3D(), marcaTicketD = new THREE.Object3D(), marcaCal = new THREE.Object3D(), marcaPapel = new THREE.Object3D(); scene.add(marcaRecibo, marcaTicketM, marcaTicketD, marcaCal, marcaPapel);
// pilas de fajos ($100.000 cada uno): [marca, x, z]
const PILAS = { a: [marcaPilaM, OX - 0.12, 0.05], b: [marcaPilaD, OX + 0.12, 0.05], c: [marcaPilaL, OX + 0.12, 0.05] };
let _fajo = 0;
function apilar(clave, cant) {
  const [marca, x, z] = PILAS[clave]; const n = Math.max(0, Math.min(18, cant)); const ent = Math.floor(n), frac = n - ent;
  for (let k = 0; k < Math.ceil(n) && _fajo < FAJOS.length; k++) {
    const f = FAJOS[_fajo++]; f.visible = true; const cae = k === ent ? 1 - frac : 0;
    f.position.set(x + Math.sin(k * 2.3) * 0.004, MY() + 0.006 + k * 0.0125 + cae * 0.12, z + Math.cos(k * 1.7) * 0.004); f.rotation.set(0, Math.sin(k * 1.3) * 0.08, 0);
  }
  marca.position.set(x, MY() + 0.012 + Math.ceil(n) * 0.0125 + 0.02, z);
}

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
// [desde, zona, ref, pos0, pos1, mira0, mira1, fov, apertura, escena]
// ref: 'M'/'L' siguen al auto; 'iM'/'iL' = coordenadas dentro del auto; null = mundo.
// escena: qué hay en la calle (semaforo, trio, subeM, subeL, rodandoM, rodandoL, parado, dos).
const PARK_Z = 6.0, VEREDA_Z = 7.7;
const PL = [
  // GANCHO
  [T.gancho, "int", "iM", [0.02, 1.16, 0.16], [0.035, 1.14, 0.25], [0.06, 1.1, 0.52], [0.06, 1.1, 0.52], 42, 0.012, "rodandoM"],
  [T.depende, "calle", null, [7.5, 3.6, 15.0], [4.0, 1.7, 11.5], [0.3, 0.9, 5.2], [0.0, 0.9, 5.4], 36, 0.0008, "semaforo"],
  [T.tres, "calle", null, [0.0, 1.5, 15.6], [0.0, 1.4, 14.6], [0.0, 1.15, 7.4], [0.0, 1.15, 7.4], 44, 0.001, "trio"],
  // CAP. 1 — MARTÍN, EL QUE ALQUILA (amanece)
  [T.cap1, "calle", null, [-7.5, 0.55, 10.4], [-4.2, 0.65, 10.0], [-4.0, 0.95, 7.7], [-1.2, 1.0, 7.4], 34, 0.0015, "subeM"],
  [T.dia, "int", "iM", [0.03, 1.15, 0.12], [0.03, 1.14, 0.2], [0.06, 1.1, 0.52], [0.06, 1.1, 0.52], 44, 0.012, "rodandoM"],
  [T.noEsSuyo, "ofi", null, [OX + 0.85, 1.22, 1.15], [OX + 0.6, 1.12, 0.95], [OX + 0.05, 0.8, 0.12], [OX + 0.05, 0.78, 0.12], 34, 0.012],
  [T.div, "int", "iM", [0.04, 1.14, 0.14], [0.045, 1.135, 0.19], [0.06, 1.1, 0.52], [0.06, 1.1, 0.52], 40, 0.014, "rodandoM"],
  [T.lunes, "ofi", null, [OX + 0.6, 1.6, -1.2], [OX + 0.75, 1.65, -1.6], [OX + 0.9, 1.75, -4.5], [OX + 0.9, 1.75, -4.5], 44, 0.002],
  [T.poreso, "calle", "M", [3.2, 0.9, 9.6], [1.2, 1.3, 8.4], [0.0, 0.9, 3.0], [0.4, 0.9, 3.0], 36, 0.001, "rodandoM"],
  [T.mes, "ofi", null, [OX - 0.1, MESA + 0.47, 0.33], [OX - 0.1, MESA + 0.43, 0.29], [OX - 0.1, MESA, 0.03], [OX - 0.1, MESA, 0.04], 38, 0.006],
  [T.gas, "estacion", null, [-58.2, 1.6, 3.8], [-58.8, 1.55, 3.2], [-61.6, 1.3, -0.8], [-61.6, 1.4, -0.9], 40, 0.003],
  [T.mono, "ofi", null, [OX - 0.1, MESA + 0.45, 0.31], [OX - 0.1, MESA + 0.41, 0.27], [OX - 0.1, MESA, 0.04], [OX - 0.1, MESA, 0.05], 38, 0.006],
  [T.quedan, "ofi", null, [OX - 0.1, MESA + 0.36, 0.22], [OX - 0.1, MESA + 0.3, 0.18], [OX - 0.1, MESA, 0.02], [OX - 0.1, MESA, 0.0], 38, 0.008],
  // CAP. 2 — EL DUEÑO (de día, cálido)
  [T.cap2, "ofi", null, [OX + 2.6, 1.55, 3.0], [OX + 1.9, 1.45, 2.4], [OX + 0.1, 1.0, -0.6], [OX + 0.1, 1.05, -0.6], 38, 0.003, "dueno"],
  [T.dueno, "calle", null, [4.2, 1.0, 11.2], [-3.2, 1.2, 11.0], [0.0, 0.8, PARK_Z], [0.0, 0.8, PARK_Z], 34, 0.0012, "parado"],
  [T.cobra, "ofi", null, [OX + 0.1, MESA + 0.47, 0.33], [OX + 0.1, MESA + 0.43, 0.29], [OX + 0.1, MESA, 0.03], [OX + 0.1, MESA, 0.04], 38, 0.006],
  [T.service, "taller", null, [TX + 4.8, 1.9, 5.2], [TX + 3.6, 1.8, 4.4], [TX, 1.7, -0.6], [TX - 0.2, 1.7, -0.6], 40, 0.001],
  [T.seguro, "ofi", null, [OX - 0.02, MESA + 0.5, 0.42], [OX - 0.02, MESA + 0.46, 0.36], [OX - 0.02, MESA, 0.1], [OX - 0.02, MESA, 0.1], 36, 0.006],
  [T.monoD, "ofi", null, [OX + 0.1, MESA + 0.45, 0.31], [OX + 0.1, MESA + 0.41, 0.27], [OX + 0.1, MESA, 0.04], [OX + 0.1, MESA, 0.05], 38, 0.006],
  [T.bolsillo, "ofi", null, [OX + 0.5, MESA + 0.3, 0.5], [OX + 0.4, MESA + 0.24, 0.42], [OX + 0.12, MESA + 0.07, 0.05], [OX + 0.12, MESA + 0.09, 0.05], 34, 0.01],
  [T.invisible, "int", "iM", [0.38, 1.03, 0.1], [0.38, 1.0, 0.16], [0.38, 0.86, 0.565], [0.38, 0.86, 0.565], 72, 0.006, "rodandoM"],
  [T.s33, "int", "iM", [-0.05, 1.12, 0.18], [-0.08, 1.11, 0.24], [-0.12, 1.07, 0.46], [-0.12, 1.07, 0.46], 40, 0.012, "rodandoM"],
  [T.s206, "ofi", null, [OX + 0.1, MESA + 0.42, 0.3], [OX + 0.1, MESA + 0.34, 0.22], [OX + 0.1, MESA, 0.0], [OX + 0.1, MESA, -0.02], 38, 0.008],
  [T.recupera, "calle", null, [-3.8, 1.5, 11.8], [-1.6, 1.3, 10.6], [0.0, 0.8, PARK_Z], [0.0, 0.8, PARK_Z], 34, 0.0012, "parado"],
  [T.dos, "calle", null, [6.5, 2.4, 12.5], [4.5, 1.6, 11.0], [-1.4, 0.8, PARK_Z], [-1.2, 0.8, PARK_Z], 36, 0.0008, "dos"],
  [T.igual, "ofi", null, [OX, MESA + 0.5, 0.82], [OX, MESA + 0.42, 0.7], [OX, MESA + 0.1, 0.05], [OX, MESA + 0.12, 0.05], 36, 0.006, "pilasMD"],
  [T.riesgo, "calle", "M", [3.0, 1.0, 9.2], [1.4, 1.2, 8.2], [0.0, 0.9, 3.0], [0.3, 0.9, 3.0], 36, 0.001, "rodandoM"],
  [T.caja, "taller", null, [TX - 3.5, 1.2, 4.0], [TX - 2.4, 1.4, 3.2], [TX, 1.6, -0.6], [TX, 1.7, -0.6], 38, 0.001],
  [T.choca, "ofi", null, [OX - 0.02, MESA + 0.5, 0.42], [OX - 0.02, MESA + 0.46, 0.36], [OX - 0.02, MESA, 0.1], [OX - 0.02, MESA, 0.1], 36, 0.006],
  [T.kmAno, "int", "iM", [0.38, 1.03, 0.1], [0.38, 1.0, 0.16], [0.38, 0.86, 0.565], [0.38, 0.86, 0.565], 72, 0.006, "rodandoM"],
  // CAP. 3 — LUCAS, MANEJA LO SUYO (atardecer)
  [T.cap3, "calle", null, [7.0, 0.6, 10.6], [3.6, 0.7, 10.1], [3.8, 0.95, 7.7], [1.4, 1.0, 7.3], 34, 0.0015, "subeL"],
  [T.noAlq, "calle", "L", [-3.4, 1.0, 9.2], [-1.4, 1.2, 8.6], [0.0, 0.9, 3.0], [-0.3, 0.9, 3.0], 36, 0.001, "rodandoL"],
  [T.maneja8, "int", "iL", [0.03, 1.15, 0.12], [0.03, 1.14, 0.2], [0.06, 1.1, 0.52], [0.06, 1.1, 0.52], 44, 0.012, "rodandoL"],
  [T.app2496, "ofi", null, [OX + 0.1, MESA + 0.47, 0.33], [OX + 0.1, MESA + 0.4, 0.27], [OX + 0.1, MESA, 0.03], [OX + 0.1, MESA, 0.02], 38, 0.006],
  [T.masQue, "ofi", null, [OX, MESA + 0.5, 0.82], [OX, MESA + 0.42, 0.7], [OX, MESA + 0.1, 0.05], [OX, MESA + 0.12, 0.05], 36, 0.006, "pilasML"],
  [T.si12, "calle", "L", [3.4, 1.0, 9.6], [1.4, 1.3, 8.6], [0.0, 0.9, 6.0], [0.4, 0.9, 6.0], 36, 0.001, "rodandoL"],
  // CIERRE
  [T.cierre, "calle", null, [0.0, 1.5, 15.8], [0.0, 1.45, 14.8], [0.0, 1.15, 7.4], [0.0, 1.15, 7.4], 44, 0.001, "trio"],
  [T.metodo, "ofi", null, [OX + 0.4, 1.3, 1.1], [OX + 0.3, 1.25, 1.0], [OX, 0.8, 0], [OX, 0.8, 0], 36, 0.008],
  [T.lado, "calle", null, [0.0, 1.45, 14.8], [0.0, 5.0, 18.5], [0.0, 1.15, 7.4], [0.0, 0.9, 5.0], 44, 0.0008, "trio"],
];
function plano(t) { let i = 0; while (i + 1 < PL.length && t >= PL[i + 1][0]) i++; return i; }
// noche: timelapse del día de Martín, los riesgos y el cierre; tarde: el capítulo de Lucas
export function nocheAt(t) {
  if (t >= T.poreso && t < T.mes) return sstep(T.poreso + 0.6, T.mes - 0.4, t);
  if (t >= T.riesgo && t < T.cap3) return 1;
  if (t >= T.cierre) return 1;
  return 0;
}
export function tardeAt(t) { return t >= T.cap3 && t < T.cierre ? 1 : 0; }

// ---------- lienzos ----------
const AZ = "#007BFF", AZL = "#00CFFF", NEG = "#0B0C0E";
function redondo(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function dibujar(L, firma, fn) { if (L.firma === firma) return; L.firma = firma; fn(L.g, L.w, L.h); L.t.needsUpdate = true; }
const VIAJES = [10400, 9800, 12600, 8900, 11200, 13100, 9700, 10800, 12200, 9300, 11800, 10600];
function telAt(t) {
  // modos: gancho y «un día normal» (viajes que entran), «30 horas» (semana del alquiler), Lucas (sus viajes)
  const B = t >= T.div - 0.3 && t < T.lunes + 0.5; const aL = t >= T.maneja8 - 0.5 && t < T.app2496;
  const a0 = B ? T.div : aL ? T.maneja8 : t < T.cap1 ? T.gancho : T.dia; const L = t - a0;
  let hoy = aL ? 61400 : 38200; if (!B) VIAJES.slice(0, 3).forEach((v, k) => (hoy += v * clamp((L - (0.9 + k * 1.1)) / 0.5)));
  const fe = clamp((t - T.div - 0.2) / (T.h30 - T.div - 0.2)); const of = clamp((L - 0.3) / 0.45); const rv = !B;
  const ciclo = (L % 6.5) / 6.5; const ac = Math.round(clamp((L - 0.6) / 2.5) * 30);
  dibujar(TEL, [B, Math.round(hoy / 100), Math.round(fe * 360), Math.round(of * 20), rv, Math.round(ciclo * 60), ac].join("|"), (g, w, h) => {
    // ── mapa: fondo con calles, manzanas, parque y río ──
    g.fillStyle = "#EDF0F4"; g.fillRect(0, 0, w, h);
    // manzanas (bloques con sutil relleno)
    const BW = 72, BH = 88, GAP = 10, OX2 = 8, OY2 = 60;
    for (let i = 0; i < 8; i++) for (let j = 0; j < 14; j++) {
      const bx = OX2 + i * (BW + GAP), by = OY2 + j * (BH + GAP);
      g.fillStyle = "#E3E6EB"; redondo(g, bx, by, BW, BH, 4); g.fill();
    }
    // calles: líneas horizontales y verticales
    g.strokeStyle = "#D5D9E0"; g.lineWidth = GAP;
    for (let i = 0; i <= 8; i++) { const x = OX2 + i * (BW + GAP) - GAP / 2; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let j = 0; j <= 14; j++) { const y = OY2 + j * (BH + GAP) - GAP / 2; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    // líneas centrales amarillas en las calles principales
    g.strokeStyle = "rgba(220,195,120,.35)"; g.lineWidth = 1.5; g.setLineDash([6, 8]);
    [OX2 + 3 * (BW + GAP) - GAP / 2, OX2 + 5 * (BW + GAP) - GAP / 2].forEach((x) => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); });
    [OY2 + 4 * (BH + GAP) - GAP / 2, OY2 + 9 * (BH + GAP) - GAP / 2].forEach((y) => { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); });
    g.setLineDash([]);
    // parque (verde suave)
    g.fillStyle = "#D4E8D0"; redondo(g, 345, 180, 160, 190, 16); g.fill();
    g.fillStyle = "#BCD9B4"; g.beginPath(); g.arc(395, 240, 22, 0, 7); g.fill(); g.beginPath(); g.arc(445, 290, 18, 0, 7); g.fill(); g.beginPath(); g.arc(410, 320, 14, 0, 7); g.fill();
    // río diagonal (azul suave)
    g.save(); g.beginPath(); g.moveTo(0, 100); g.quadraticCurveTo(140, 60, 280, 95); g.quadraticCurveTo(420, 130, 540, 80);
    g.lineTo(540, 140); g.quadraticCurveTo(420, 190, 280, 155); g.quadraticCurveTo(140, 120, 0, 160); g.closePath();
    g.fillStyle = "#C4DAF0"; g.fill(); g.restore();

    // ── ruta ──
    const R = [[90, 1010], [90, 810], [250, 810], [250, 610], [410, 610], [410, 420], [490, 420], [490, 300]];
    let tot = 0; const seg = []; for (let k = 1; k < R.length; k++) { const d = Math.hypot(R[k][0] - R[k - 1][0], R[k][1] - R[k - 1][1]); seg.push(d); tot += d; }
    const dib = clamp(ciclo / 0.25), rec = clamp((ciclo - 0.25) / 0.7);
    // sombra de la ruta
    g.save(); g.strokeStyle = "rgba(0,80,180,.12)"; g.lineWidth = 28; g.lineCap = g.lineJoin = "round";
    g.beginPath(); g.moveTo(R[0][0] + 3, R[0][1] + 3); let acc2 = 0;
    for (let k = 1; k < R.length; k++) { const lim = tot * dib; if (acc2 >= lim) break; const f = Math.min(1, (lim - acc2) / seg[k - 1]); g.lineTo(mix(R[k - 1][0], R[k][0], f) + 3, mix(R[k - 1][1], R[k][1], f) + 3); acc2 += seg[k - 1]; } g.stroke(); g.restore();
    // ruta principal con gradiente
    const rGr = g.createLinearGradient(R[0][0], R[0][1], R[R.length - 1][0], R[R.length - 1][1]);
    rGr.addColorStop(0, "#0057D9"); rGr.addColorStop(0.5, AZ); rGr.addColorStop(1, AZL);
    g.strokeStyle = rGr; g.lineWidth = 18; g.lineCap = g.lineJoin = "round";
    g.beginPath(); g.moveTo(...R[0]); let acc = 0;
    for (let k = 1; k < R.length; k++) { const lim = tot * dib; if (acc >= lim) break; const f = Math.min(1, (lim - acc) / seg[k - 1]); g.lineTo(mix(R[k - 1][0], R[k][0], f), mix(R[k - 1][1], R[k][1], f)); acc += seg[k - 1]; } g.stroke();
    // origen: punto verde con anillo
    g.fillStyle = "#fff"; g.beginPath(); g.arc(R[0][0], R[0][1], 18, 0, 7); g.fill();
    g.fillStyle = "#22C55E"; g.beginPath(); g.arc(R[0][0], R[0][1], 12, 0, 7); g.fill();
    // destino: pin rojo
    if (dib >= 0.95) { const dx = R[R.length - 1][0], dy = R[R.length - 1][1];
      g.fillStyle = "#DC2626"; g.beginPath(); g.arc(dx, dy - 16, 14, 0, 7); g.fill(); g.beginPath(); g.moveTo(dx - 10, dy - 8); g.lineTo(dx, dy + 6); g.lineTo(dx + 10, dy - 8); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(dx, dy - 16, 5, 0, 7); g.fill(); }
    // auto sobre la ruta (posición animada)
    let pos = R[0]; acc = 0;
    for (let k = 1; k < R.length; k++) { const lim = tot * rec; if (acc + seg[k - 1] >= lim) { const f = clamp((lim - acc) / seg[k - 1]); pos = [mix(R[k - 1][0], R[k][0], f), mix(R[k - 1][1], R[k][1], f)]; break; } acc += seg[k - 1]; pos = R[k]; }
    // sombra del auto
    g.fillStyle = "rgba(0,0,0,.15)"; g.beginPath(); g.ellipse(pos[0] + 2, pos[1] + 4, 20, 14, 0, 0, 7); g.fill();
    // cuerpo del auto (vista cenital simplificada)
    g.save(); g.translate(pos[0], pos[1]);
    const ang = rec > 0.01 && rec < 0.99 ? (() => { let a2 = 0; for (let k = 1; k < R.length; k++) { if (a2 + seg[k - 1] >= tot * rec) { return Math.atan2(R[k][1] - R[k - 1][1], R[k][0] - R[k - 1][0]); } a2 += seg[k - 1]; } return 0; })() : -Math.PI / 2;
    g.rotate(ang);
    g.fillStyle = "#1A1C20"; redondo(g, -16, -10, 32, 20, 6); g.fill();
    g.fillStyle = "#E8EAEE"; g.fillRect(-10, -7, 20, 14);
    g.fillStyle = "#AAD4FF"; g.fillRect(-4, -6, 10, 12); // ventana
    g.restore();

    // ── barra de estado ──
    g.fillStyle = "rgba(237,240,244,.85)"; g.fillRect(0, 0, w, 56);
    g.fillStyle = "#1A1C20"; g.font = F(700, 28, "Inter"); g.fillText(B ? "18:12" : aL ? "17:40" : "10:26", 24, 40);
    g.textAlign = "right"; g.font = F(600, 22, "Inter"); g.fillStyle = "#5A6070";
    // signal bars
    const sx = w - 24; [0, 8, 16, 22].forEach((bh, i) => { g.fillStyle = i < 3 ? "#3A3E46" : "#C5C9D0"; g.fillRect(sx - 56 + i * 12, 24 - bh * 0.6, 8, 10 + bh * 0.6); });
    // battery
    g.fillStyle = "#3A3E46"; redondo(g, sx - 8, 16, 32, 18, 4); g.fill(); g.fillStyle = "#22C55E"; redondo(g, sx - 6, 18, 24, 14, 3); g.fill();
    g.fillStyle = "#3A3E46"; g.fillRect(sx + 24, 21, 3, 8);
    g.textAlign = "left";

    // ── pill de ganancias del día ──
    g.save();
    g.shadowColor = "rgba(0,0,0,.18)"; g.shadowBlur = 16; g.shadowOffsetY = 4;
    const pw = 320, px = (w - pw) / 2, py = 72;
    const pg = g.createLinearGradient(px, py, px + pw, py);
    pg.addColorStop(0, "#0A0C10"); pg.addColorStop(1, "#1C2030");
    g.fillStyle = pg; redondo(g, px, py, pw, 72, 36); g.fill();
    g.shadowColor = "transparent"; g.restore();
    // led pulsante
    g.fillStyle = AZL; g.beginPath(); g.arc(px + 32, py + 36, 8, 0, 7); g.fill();
    g.fillStyle = "rgba(0,207,255,.3)"; g.beginPath(); g.arc(px + 32, py + 36, 13, 0, 7); g.fill();
    g.fillStyle = "#7A808C"; g.font = F(800, 20); g.fillText("HOY", px + 50, py + 32);
    g.fillStyle = "#FFFFFF"; g.font = F(900, 38); g.fillText(B ? pesos(Math.round(12000 * ((fe * 30) % 12) / 100) * 100) : pesos(hoy), px + 50, py + 62);

    // ── tarjeta inferior ──
    const hy = h - 500;

    if (!B && of > 0) {
      const y = hy + (1 - eo(of)) * 520;
      // sombra de la tarjeta
      g.save(); g.shadowColor = "rgba(0,0,0,.22)"; g.shadowBlur = 32; g.shadowOffsetY = -8;
      g.fillStyle = "#FFFFFF"; redondo(g, 0, y, w, 560, 32); g.fill(); g.restore();
      // acento superior
      const tg = g.createLinearGradient(0, y, w, y); tg.addColorStop(0, "#0057D9"); tg.addColorStop(1, AZL);
      g.fillStyle = tg; g.fillRect(32, y + 2, w - 64, 4);
      // "NUEVO VIAJE"
      g.fillStyle = "#9299A3"; g.font = F(800, 22, "Inter"); g.fillText("NUEVO VIAJE", 36, y + 50);
      // precio grande
      g.fillStyle = NEG; g.font = F(900, 108); g.fillText("$10.000", 32, y + 158);
      // distancia y tiempo con íconos
      g.fillStyle = "#5A6070"; g.font = F(700, 26, "Inter");
      // pin ícono
      g.fillStyle = AZ; g.beginPath(); g.arc(48, y + 198, 7, 0, 7); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(48, y + 198, 3, 0, 7); g.fill();
      g.fillStyle = "#5A6070"; g.font = F(700, 26, "Inter"); g.fillText("6,2 km", 66, y + 206);
      // reloj ícono
      g.strokeStyle = "#5A6070"; g.lineWidth = 2.5; g.beginPath(); g.arc(186, y + 198, 10, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(186, y + 191); g.lineTo(186, y + 198); g.lineTo(192, y + 198); g.stroke();
      g.fillStyle = "#5A6070"; g.fillText("18 min", 204, y + 206);
      // separador
      g.strokeStyle = "#ECEEF2"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(32, y + 230); g.lineTo(w - 32, y + 230); g.stroke();
      // "Lo que paga el pasajero"
      g.fillStyle = "#EEF5FF"; redondo(g, 28, y + 248, w - 56, 108, 16); g.fill();
      g.fillStyle = "#7A808C"; g.font = F(700, 22, "Inter"); g.fillText("Ya sin la comisión de la app", 48, y + 286);
      g.fillStyle = "#0B5BD3"; g.font = F(900, 42); g.fillText("Te paga ≈ $12.000 / hora", 48, y + 338);
      // botón ACEPTAR
      g.save();
      g.fillStyle = "#111"; redondo(g, 28, y + 378, w - 56, 86, 20); g.fill();
      redondo(g, 28, y + 378, w - 56, 86, 20); g.clip();
      const bg = g.createLinearGradient(28, 0, w - 28, 0); bg.addColorStop(0, "#0057D9"); bg.addColorStop(0.6, AZ); bg.addColorStop(1, AZL);
      g.fillStyle = bg; g.fillRect(28, y + 378, (w - 56) * ac / 30, 86);
      // brillo en el borde superior del botón
      const sh = g.createLinearGradient(0, y + 378, 0, y + 396);
      sh.addColorStop(0, "rgba(255,255,255,.18)"); sh.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = sh; g.fillRect(28, y + 378, w - 56, 18);
      g.restore();
      g.fillStyle = "#FFFFFF"; g.font = F(900, 36); g.textAlign = "center"; g.fillText("ACEPTAR", w / 2, y + 432); g.textAlign = "left";
      // flecha sutil dentro del botón
      if (ac >= 30) { g.fillStyle = "rgba(255,255,255,.5)"; g.font = F(700, 32, "Inter"); g.textAlign = "center"; g.fillText("›", w / 2 + 70, y + 430); g.textAlign = "left"; }
    }

    if (B) {
      const y = hy + (1 - eo(clamp((t - T.div) / 0.45))) * 520;
      // sombra
      g.save(); g.shadowColor = "rgba(0,0,0,.22)"; g.shadowBlur = 32; g.shadowOffsetY = -8;
      g.fillStyle = "#FFFFFF"; redondo(g, 0, y, w, 560, 32); g.fill(); g.restore();
      // acento superior rojo
      const rg = g.createLinearGradient(0, y, w, y); rg.addColorStop(0, "#DC2626"); rg.addColorStop(1, "#FF5A5A");
      g.fillStyle = rg; g.fillRect(32, y + 2, w - 64, 4);
      // "ESTA SEMANA"
      g.fillStyle = "#9299A3"; g.font = F(800, 22, "Inter"); g.fillText("ESTA SEMANA", 36, y + 50);
      // monto grande
      g.fillStyle = NEG; g.font = F(900, 100); g.fillText(pesos(Math.round(360 * fe) * 1000), 32, y + 155);
      // horas
      g.fillStyle = "#5A6070"; g.font = F(700, 28, "Inter"); g.fillText(Math.round(30 * fe) + " horas manejadas", 36, y + 200);
      // barra de progreso (track)
      g.fillStyle = "#ECEEF2"; redondo(g, 36, y + 230, w - 72, 32, 16); g.fill();
      // barra de progreso (fill con gradiente)
      g.save(); redondo(g, 36, y + 230, w - 72, 32, 16); g.clip();
      const bg = g.createLinearGradient(36, 0, w - 36, 0); bg.addColorStop(0, "#FF5A5A"); bg.addColorStop(1, "#B91C1C");
      g.fillStyle = bg; g.fillRect(36, y + 230, Math.max(32, (w - 72) * fe), 32);
      // brillo en la barra
      const sh = g.createLinearGradient(0, y + 230, 0, y + 244);
      sh.addColorStop(0, "rgba(255,255,255,.25)"); sh.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = sh; g.fillRect(36, y + 230, Math.max(32, (w - 72) * fe), 14);
      g.restore();
      // separador
      g.strokeStyle = "#ECEEF2"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(32, y + 286); g.lineTo(w - 32, y + 286); g.stroke();
      // fila "ALQUILER DEL AUTO"
      g.fillStyle = "#F5F6F8"; redondo(g, 28, y + 300, w - 56, 68, 14); g.fill();
      g.fillStyle = "#5A6070"; g.font = F(800, 22, "Inter"); g.fillText("ALQUILER DEL AUTO", 48, y + 342);
      g.textAlign = "right"; g.fillStyle = "#B91C1C"; g.font = F(900, 28, "Inter"); g.fillText("$360.000", w - 48, y + 342); g.textAlign = "left";
      // sello 30 HORAS
      if (fe >= 1) {
        g.save(); g.translate(w / 2, y + 430); g.rotate(-0.08);
        g.shadowColor = "rgba(185,28,28,.25)"; g.shadowBlur = 12;
        g.strokeStyle = "#B91C1C"; g.lineWidth = 6; redondo(g, -190, -40, 380, 80, 10); g.stroke();
        g.fillStyle = "#B91C1C"; g.font = F(900, 44); g.textAlign = "center"; g.fillText("30 HORAS", 0, 17);
        g.restore(); g.textAlign = "left";
      }
    }
  });
}
function kmMes(t) { return t >= T.km ? 6240 * eo((t - T.km - 0.3) / 2.2) : 0; }
function kmAnos(t) { return t >= T.kmAno ? (246000 - 96000 - 6240) * eo((t - T.kmAno - 0.4) / 3.2) : 0; }
function odoAt(t) {
  const km = 96000 + kmMes(t) + kmAnos(t) + Math.max(0, t - T.invisible) * 0.4;
  dibujar(ODO, String(Math.floor(km)), (g, w, h) => {
    g.fillStyle = "#050607"; g.fillRect(0, 0, w, h); const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); gr.addColorStop(0, "rgba(0,123,255,.2)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#3A3E46"; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, h + 40, 230, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    g.fillStyle = "#E5E7EB"; g.font = F(800, 100, "Inter"); g.textAlign = "center"; g.fillText(Math.floor(km).toLocaleString("es-AR"), w / 2, 170); g.fillStyle = "#9299A3"; g.font = F(800, 30); g.fillText("km", w / 2, 220); g.textAlign = "left";
  });
}
function etqAt(t) {
  const km = kmMes(t); const v = 15900000 - 33 * km;
  dibujar(ETQ, String(Math.round(v / 10)), (g, w, h) => {
    g.fillStyle = "#F4F1EA"; redondo(g, 0, 0, w, h, 26); g.fill(); g.fillStyle = "#C9C3B6"; g.beginPath(); g.arc(46, 46, 16, 0, 7); g.fill();
    g.fillStyle = "#5A6070"; g.font = F(900, 30); g.fillText("EL CRONOS VALE", 84, 58); g.fillStyle = NEG; g.font = F(900, 74); g.fillText(pesos(v), 34, 160);
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
  const u = [0, 1, 2, 3, 4, 5, 6].map((k) => clamp((t - (T.lunes + 0.2 + k * 0.12)) / 0.25)); const ua = clamp((t - T.lunes - 1.2) / 0.4);
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
function partir(g, txt, ancho) { const out = []; for (const par of txt.split("\n")) { let l = ""; for (const w of par.split(" ")) { const p = l ? l + " " + w : w; if (g.measureText(p).width > ancho && l) { out.push(l); l = w; } else l = p; } out.push(l); } return out; }
function ticketAt(L, t, lineas, cab, sellos) {
  const vis = lineas.filter((l) => t >= l[0]).length; const sv = sellos.filter((s) => t >= s[0]).length;
  dibujar(L, vis + "|" + sv, (g, w, h) => {
    g.fillStyle = "#FBFAF7"; g.fillRect(0, 0, w, h); const M = 28;
    g.fillStyle = NEG; g.font = F(900, 36, "Inter"); g.textAlign = "center"; g.fillText(cab[0], w / 2, 70); g.font = F(700, 24, "Inter"); g.fillStyle = "#5A6070"; g.fillText(cab[1], w / 2, 108); g.fillText(cab[2], w / 2, 140); g.textAlign = "left";
    g.strokeStyle = "#BDB7AA"; g.lineWidth = 2; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(M, 170); g.lineTo(w - M, 170); g.stroke(); g.setLineDash([]);
    let y = 210;
    lineas.slice(0, vis).forEach(([, txt, val, tipo]) => {
      const tot = tipo === "total"; if (tot) { g.strokeStyle = NEG; g.lineWidth = 3; g.beginPath(); g.moveTo(M, y - 26); g.lineTo(w - M, y - 26); g.stroke(); y += 6; }
      const vSz = tot ? 30 : 24, lSz = tot ? 26 : 22, lh = tot ? 28 : 24;
      g.font = F(900, vSz, "Inter"); const vw = g.measureText(val).width;
      g.font = F(tot ? 900 : 600, lSz, "Inter"); const filas = partir(g, txt, w - 2 * M - vw - 14);
      g.fillStyle = tipo === "menos" ? "#9E2A30" : NEG; filas.forEach((f, i) => g.fillText(f, M, y + i * lh));
      g.font = F(900, vSz, "Inter"); g.textAlign = "right"; g.fillText(val, w - M, y + (tot ? 2 : 0)); g.textAlign = "left";
      y += lh * filas.length + (tot ? 26 : 22); });
    sellos.slice(0, sv).forEach(([, txt, color]) => { g.font = F(900, 54); const ancho = g.measureText(txt).width + 60; const sy = Math.max(y + 50, h * 0.82); selloSobre(g, w / 2, Math.min(h - 70, sy), txt, color, -0.08, Math.min(0.85, (w - 50) / ancho)); });
  });
}
const TM = [[T.mes + 0.3, "La app le paga", "$3.744.000"], [T.alq, "Alquiler del auto\n($360.000 × 4,33 sem.)", "−$1.560.000", "menos"], [T.gas, "Gas (GNC)", "−$427.000", "menos"],
  [T.mono, "Monotributo + IIBB\n(categoría F)", "−$227.000", "menos"], [T.cel, "Celular y lavado", "−$33.000", "menos"], [T.quedan, "LE QUEDA", "$1.497.000", "total"], [T.h312, "312 h al mes\n(12 h × 6 días)", "÷ 312"]];
const TD = [[T.cobra, "Cobra de Martín", "$1.560.000"], [T.service, "Service, cubiertas,\nfrenos, amortiguad.", "−$306.000", "menos"], [T.seguro, "Seguro", "−$160.000", "menos"],
  [T.monoD, "Monotributo (C)", "−$95.000", "menos"], [T.patente, "Patente + VTV", "−$24.000", "menos"], [T.bolsillo, "AL BOLSILLO", "$975.000", "total"],
  [T.s206 - 0.3, "El auto pierde valor\n(6.240 km × $33)", "−$206.000", "menos"], [T.ganancia, "GANANCIA REAL", "$769.000", "total"]];
const TL = [[T.app2496, "La app le paga\n(8 h × 6 días)", "$2.496.000"], [T.app2496 + 0.9, "Service, cubiertas, frenos", "−$204.000", "menos"], [T.app2496 + 1.2, "Seguro", "−$160.000", "menos"],
  [T.app2496 + 1.5, "Gas (GNC)", "−$285.000", "menos"], [T.app2496 + 1.8, "El auto pierde valor", "−$137.000", "menos"], [T.app2496 + 2.1, "Monotributo + IIBB (D)", "−$125.000", "menos"],
  [T.app2496 + 2.4, "Patente, celular, lavado", "−$57.000", "menos"], [T.quedaL, "LE QUEDA", "$1.527.000", "total"]];
function polizaAt(t) {
  const st = t >= T.rechazar + 0.2; dibujar(POLIZA, String(st), (g, w, h) => {
    g.fillStyle = "#FBF8F2"; g.fillRect(0, 0, w, h); g.fillStyle = "#1E3A6B"; g.fillRect(0, 0, w, 120); g.fillStyle = "#fff"; g.font = F(900, 50); g.fillText("PÓLIZA DE AUTO", 40, 78);
    const L = [["Vehículo", "Sedán 2020 · GNC"], ["Cobertura", "Terceros completo"], ["Uso declarado", "PARTICULAR"], ["Prima mensual", "$160.000"]];
    L.forEach(([a, b], i) => { g.fillStyle = "#5A6070"; g.font = F(700, 26, "Inter"); g.fillText(a, 40, 200 + i * 110); g.fillStyle = NEG; g.font = F(900, i === 2 ? 46 : 36, "Inter"); g.fillText(b, 40, 245 + i * 110); });
    g.strokeStyle = "#D7D2C6"; g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(40, 700 + i * 50); g.lineTo(w - 40 - (i % 2) * 120, 700 + i * 50); g.stroke(); }
    g.fillStyle = "#9299A3"; g.font = F(700, 22, "Inter"); g.fillText("Documento de ejemplo", 40, h - 40);
    if (st) selloSobre(g, w / 2, 560, "SINIESTRO RECHAZADO", "rgba(179,38,46,.9)", -0.2, 0.95);
  });
}
function casoAt(t) {
  const k = [T.martin + 1.6, T.alquila, T.div, T.primeros].filter((a) => t >= a).length; dibujar(CASO, String(k), (g, w, h) => {
    g.fillStyle = "#FBF8F2"; g.fillRect(0, 0, w, h); g.fillStyle = AZ; g.fillRect(36, 34, 10, 82); g.fillStyle = NEG; g.font = F(900, 48); g.fillText("CASO REAL · ROSARIO", 64, 78); g.fillStyle = "#5A6070"; g.font = F(700, 24, "Inter"); g.fillText("Publicado en La Capital, 26/04/2026", 64, 112);
    const L = [["Gerardo", "62 años"], ["Alquila con GNC", "$360.000 / sem."], ["Maneja", "12 h por día"]];
    L.slice(0, k).forEach(([a, b], i) => { const y = 180 + i * 62; g.fillStyle = "#3A3E46"; g.font = F(700, 34, "Inter"); g.fillText(a, 36, y); g.fillStyle = NEG; g.font = F(900, 40, "Inter"); g.textAlign = "right"; g.fillText(b, w - 36, y); g.textAlign = "left"; });
    if (k >= 4) { g.fillStyle = "#E7F0FF"; redondo(g, 24, 384, w - 48, 232, 18); g.fill(); g.fillStyle = NEG; g.font = F(900, 50, "Inter"); ["«Limpios me quedan entre", "$60.000 y $70.000", "por día»"].forEach((x, i) => g.fillText(x, 52, 450 + i * 64)); }
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
const CARRIL_M = 3.0, CARRIL_L = 6.0;

export function render(t, oscuro = 0) {
  const i = plano(t); const P = PL[i]; const [t0, zona, ref] = P; const esc = P[9] || ""; const t1 = i + 1 < PL.length ? PL[i + 1][0] : T.fin; const u = ease(clamp((t - t0) / (t1 - t0))); const s = t - t0;
  const exteriorZ = zona === "calle" || zona === "int";
  const n = exteriorZ ? nocheAt(t) : zona === "estacion" ? 0.85 : 0; const tarde = exteriorZ ? tardeAt(t) * (1 - n) : 0;
  // --- autos ---
  const ry = Math.PI / 2; let mx = 999, lx = 999, d2 = 999; let mz = CARRIL_M, lz = CARRIL_L, mVis = false, lVis = false;
  if (esc === "semaforo") { mx = 0.4; lx = 0.0; mVis = lVis = true; }
  else if (esc === "trio" ) { mx = 0.0; mz = PARK_Z; mVis = true; const va = t >= T.mandaselo + 0.4 ? Math.pow(t - T.mandaselo - 0.4, 2) * 1.1 : 0; mx += va; lx = -5.6 + va; lz = PARK_Z; lVis = true; }
  else if (esc === "subeM" || esc === "parado") { mx = 0.0; mz = PARK_Z; mVis = true; }
  else if (esc === "subeL") { lx = 0.0; lz = PARK_Z; lVis = true; }
  else if (esc === "dos") { mx = 1.4; mz = PARK_Z; d2 = -3.6; mVis = true; }
  else if (esc === "rodandoM") { mx = zona === "int" ? -14 + ((s * 4.5) % 26) : -9 + s * 1.6; mVis = true; }
  else if (esc === "rodandoL") { lx = zona === "int" ? -14 + ((s * 4.5) % 26) : -9 + s * 1.6; lVis = true; }
  const est = zona === "estacion"; const enTaller = zona === "taller";
  const subeT = enTaller ? (t >= T.caja ? T.caja : T.service) : 0;
  ubicar(autoM, est ? -61.8 : enTaller ? TX : mx, enTaller ? 0.1 + 1.45 * eo((t - subeT) / 1.2) : 0, est ? 0.9 : enTaller ? -0.6 : mz, enTaller ? 0 : ry, n, est || enTaller || (mVis && exteriorZ), mx < 900 ? mx : 0);
  ubicar(autoL, lx, 0, lz, ry, n, lVis && exteriorZ, lx < 900 ? lx : 0);
  ubicar(autoD2, d2, 0, PARK_Z, ry, n, d2 < 900 && zona === "calle", 0);
  marcaM.position.set(autoM.o.position.x, autoM.o.position.y + 1.75, autoM.o.position.z); marcaL.position.set(autoL.o.position.x, autoL.o.position.y + 1.75, autoL.o.position.z);
  marcaGolpe.position.set(autoD2.o.position.x, 1.75, PARK_Z);
  const enInt = zona === "int"; const carInt = ref === "iL" ? autoL : autoM;
  autoM.cuerpo.visible = !(enInt && ref === "iM"); autoL.cuerpo.visible = !(enInt && ref === "iL");
  if (enInt) { if (INT.parent !== carInt.o) carInt.o.add(INT); INT.visible = true; etqG.visible = ref === "iM" && t >= T.invisible && t < T.s206 + 0.2; volante.visible = !(t >= T.invisible && t < T.s33) && !(t >= T.kmAno && t < T.cap3); volante.rotation.z = Math.sin(t * 0.7) * 0.08; } else INT.visible = false;
  const verde = esc === "semaforo" ? false : true; SEMAF.userData.focos[0].emissiveIntensity = esc === "semaforo" ? 5 : 0; SEMAF.userData.focos[2].emissiveIntensity = esc === "trio" && t > T.mandaselo ? 5 : 0;
  // --- personas ---
  transeuntes.forEach((p, k) => { const L = 26, v = 1.1, ss = ((t * v + k * 13) % L); const ida = k % 2 === 0; mover(p, ss / v, 0.15, [ida ? -13 : 13, -0.3 - k * 0.6], [ida ? 13 : -13, -0.3 - k * 0.6], 0, L / v, null, "parado", k * 0.7); p.o.visible = zona === "calle"; });
  mover(playero, t, 0, [-64.2, 0.6], [-64.2, 0.6], 0, 0.01, [-61.6, 0.7], "parado", 0.4);
  mover(mecanico, t, 0, [TX - 1.7, 1.5], [TX - 1.7, 1.5], 0, 0.01, [TX, -0.6], "parado", 0.6);
  [martinP, duenoP, lucasP].forEach((p) => (p.o.visible = false));
  const cam0 = [P[3][0], P[3][2]];
  if (esc === "trio") {
    const fila = [[martinP, -1.25], [duenoP, 0.0], [lucasP, 1.25]];
    fila.forEach(([p, x], k) => { p.o.visible = true; mover(p, t, 0.15, [x, VEREDA_Z + 0.2], [x, VEREDA_Z + 0.2], 0, 0.01, [x * 0.6, 12], "parado", k * 1.3); });
  } else if (esc === "subeM") { martinP.o.visible = true; mover(martinP, t, 0.15, [-7.5, VEREDA_Z], [-1.6, VEREDA_Z - 0.3], T.cap1 - 0.2, T.dia - 0.4, [0, PARK_Z], "parado", 0.3); }
  else if (esc === "subeL") { lucasP.o.visible = true; mover(lucasP, t, 0.15, [7.0, VEREDA_Z], [1.8, VEREDA_Z - 0.3], T.cap3 + 0.2, T.noAlq - 0.3, [0, PARK_Z], "parado", 0.9); }
  else if (esc === "dos" || esc === "parado" && t >= T.dueno && t < T.cobra) { duenoP.o.visible = true; const x = esc === "dos" ? -1.1 : 2.6; mover(duenoP, t, 0.15, [x, VEREDA_Z], [x, VEREDA_Z], 0, 0.01, [cam0[0], cam0[1]], "parado", 1.1); }
  else if (esc === "dueno") { duenoP.o.visible = true; mover(duenoP, t, 0, [OX + 0.6, -0.95], [OX + 0.6, -0.95], 0, 0.01, [OX + 2.6, 3.0], "parado", 0.5); }
  marcaMartin.position.copy(martinP.o.position).add(new THREE.Vector3(0, 1.95, 0)); marcaDueno.position.copy(duenoP.o.position).add(new THREE.Vector3(0, 1.95, 0)); marcaLucas.position.copy(lucasP.o.position).add(new THREE.Vector3(0, 1.95, 0));
  // --- oficina: qué hay sobre la mesa ---
  const entre = (a, b) => t >= a && t < b;
  const enOfi = zona === "ofi";
  RECIBO.mesh.visible = entre(T.noEsSuyo - 0.5, T.div); llaves.visible = RECIBO.mesh.visible || entre(T.cobra - 0.5, T.service); llaves.position.set(OX - 0.13, MY(), 0.2);
  TICKET_M.mesh.visible = entre(T.mes - 0.5, T.cap2);
  TICKET_D.mesh.visible = entre(T.cobra - 0.5, T.recupera) && !entre(T.seguro, T.monoD) && !entre(T.bolsillo, T.s206);
  TICKET_L.mesh.visible = entre(T.app2496 - 0.5, T.masQue);
  POLIZA.mesh.visible = entre(T.seguro, T.monoD) || entre(T.choca - 0.5, T.kmAno); CASO.mesh.visible = false;
  const baja = (ta) => { const d = t - ta; return d < -0.35 || d > 0.6 ? 1 : d < 0 ? 1 - eo((d + 0.35) / 0.35) : d < 0.25 ? 0 : eo((d - 0.25) / 0.35); };
  const selloRecibo = entre(T.noEsSuyo + 0.5, T.div), selloPoliza = entre(T.choca, T.kmAno); sello.visible = selloRecibo || selloPoliza;
  if (selloRecibo) sello.position.set(OX + 0.12, MY() + 0.16 * baja(T.s360 + 0.25), 0.13); else sello.position.set(OX - 0.02, MY() + 0.16 * baja(T.rechazar + 0.2), 0.08);
  marcaRecibo.position.set(OX + 0.05, MY() + 0.05, 0.12); marcaTicketM.position.set(OX - 0.1, MY() + 0.002, 0.17); marcaTicketD.position.set(OX + 0.1, MY() + 0.002, 0.17);
  marcaCal.position.set(OX + 0.9, 2.18, -4.49); marcaPapel.position.set(OX, MY() + 0.03, -0.05);
  FAJOS.forEach((f) => { f.visible = false; f.scale.setScalar(1); }); _fajo = 0;
  const cuenta = (desde, hasta, dur) => hasta * eo(clamp((t - desde) / dur));
  if (entre(T.bolsillo - 0.3, T.invisible)) apilar("b", cuenta(T.bolsillo, 9.75, 2.4));
  if (esc === "pilasMD") { apilar("a", cuenta(T.igual, 15, 1.6)); apilar("b", cuenta(T.igual + 0.4, 15, 1.6)); }
  if (esc === "pilasML") { apilar("a", cuenta(T.masQue, 15, 1.4)); apilar("c", cuenta(T.masQue + 0.4, 15.3, 1.4)); }
  // --- lienzos ---
  if (enInt) telAt(t);
  if (RECIBO.mesh.visible) reciboAt(t);
  if (enOfi && t >= T.lunes && t < T.poreso) calAt(t);
  if (TICKET_M.mesh.visible) ticketAt(TICKET_M, t, TM, ["MARTÍN · ALQUILA", "Por mes · 12 h × 6 días", "Ejemplo · nov. 2026"], [[T.m4800, "$4.800 LA HORA", "rgba(179,38,46,.9)"]]);
  if (TICKET_D.mesh.visible) ticketAt(TICKET_D, t, TD, ["EL DUEÑO · CRONOS 2020", "Por mes · alquiler por semana", "Ejemplo · nov. 2026"], [[T.ganancia + 0.4, "$769.000/MES", "rgba(0,87,217,.9)"]]);
  if (TICKET_L.mesh.visible) ticketAt(TICKET_L, t, TL, ["LUCAS · SU PROPIO AUTO", "Por mes · 8 h × 6 días", "Ejemplo · nov. 2026"], [[T.m7340, "$7.340 LA HORA", "rgba(0,87,217,.9)"]]);
  if (POLIZA.mesh.visible) polizaAt(t);
  if (est) surtAt(t, 427000, T.gas + 0.2);
  if (enInt) { odoAt(t); etqAt(t); }
  // --- cámara ---
  const cp = new THREE.Vector3(...P[3].map((v, k) => mix(v, P[4][k], u))), cm = new THREE.Vector3(...P[5].map((v, k) => mix(v, P[6][k], u)));
  if (ref === "iM" || ref === "iL") { carInt.o.updateWorldMatrix(true, true); carInt.o.localToWorld(cp); carInt.o.localToWorld(cm); cp.y += Math.sin(t * 23) * 0.0025 + Math.sin(t * 7.3) * 0.0025; }
  else if (ref === "M" || ref === "L") { const ox = ref === "M" ? autoM.o.position.x : autoL.o.position.x; cp.x += ox; cm.x += ox; }
  cam.position.copy(cp); cam.fov = P[7]; cam.aspect = W / H; cam.updateProjectionMatrix(); cam.lookAt(cm);
  // --- luz y ambiente por zona y capítulo ---
  const exterior = exteriorZ || est;
  scene.environment = exterior ? (n > 0.5 ? ENV_NOCHE : ENV_DIA) : zona === "ofi" ? ENV_OFI : ENV_TALLER;
  scene.environmentIntensity = zona === "ofi" ? 0.7 : zona === "taller" ? 0.8 : mix(mix(1.0, 0.75, tarde), 0.35, n);
  const tinte = new THREE.Color().setRGB(mix(mix(1, 1.12, tarde), 0.42, n), mix(mix(1, 0.86, tarde), 0.48, n), mix(mix(1, 0.66, tarde), 0.72, n));
  MATS.forEach(([m, c, brilla]) => { m.color.copy(c); if (!brilla) m.color.multiply(tinte); else m.color.multiplyScalar(1 + n * 1.5); });
  FAROLES.forEach(([p, h]) => { p.intensity = n * 14; h.material.opacity = n; h.visible = n > 0.01; });
  VENT.opacity = Math.max(sstep(0.35, 0.9, n), tarde * 0.35) * 0.95;
  hemi.intensity = exterior ? mix(mix(0.6, 0.45, tarde), 0.15, n) : 0.2;
  sol.intensity = zona === "ofi" ? 2.4 : zona === "taller" ? 0.0 : mix(3.0, 2.6, tarde) * Math.pow(1 - n, 1.5);
  const base = zona === "ofi" ? new THREE.Vector3(OX, 0.8, 0) : cm.clone(); const dir = zona === "ofi" ? new THREE.Vector3(-4, 6, 3) : tarde > 0 ? new THREE.Vector3(14, 4, 9).normalize().multiplyScalar(25) : SOL_DIR;
  sol.target.position.copy(base); sol.position.copy(base).add(dir); const ext = zona === "ofi" ? 2 : 8;
  Object.assign(sol.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext }); sol.shadow.camera.updateProjectionMatrix();
  sol.color.set(zona === "ofi" ? "#FFE2BC" : tarde > 0 ? "#FF9C55" : "#FFE6C8");
  lamparaLuz.intensity = zona === "ofi" ? 2.5 : 0; luzTaller.intensity = zona === "taller" ? 90 : 0;
  cielo.setRGB(mix(mix(0.56, 0.95, tarde), 0.02, n), mix(mix(0.70, 0.58, tarde), 0.035, n), mix(mix(0.86, 0.42, tarde), 0.09, n));
  renderer.toneMappingExposure = zona === "ofi" ? 1.05 : mix(1.0, 1.25, n);
  // --- profundidad de campo: foco donde mira la cámara ---
  bokeh.uniforms.focus.value = cam.position.distanceTo(cm); bokeh.uniforms.aperture.value = P[8]; bokeh.uniforms.maxblur.value = 0.014;
  bloom.strength = zona === "int" ? 0.12 : n > 0.3 ? 0.4 : 0.18 + tarde * 0.12;
  grado.uniforms.vin.value = mix(0.4, 0.75, n); grado.uniforms.oscuro.value = oscuro; grado.uniforms.noche.value = n;
  composer.render();
  estado.plano = i; estado.zona = zona; return { plano: i, noche: n, zona };
}
calAt(T.lunes + 3);
