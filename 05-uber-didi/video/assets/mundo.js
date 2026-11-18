// Reel 05 «Uber y DiDi: ¿cuánto te queda?» — mundo 3D.
// Escenario horneado del reel 03 (calle comercial x≈0, estación de servicio x≈-60) + autos Kenney que circulan,
// pasajera que sube, transeúntes y paso del día a la noche (el turno de 12 h de Martín). Ejes Three: X derecha, Y arriba, +Z hacia la cámara.
import * as THREE from "./lib/three.module.min.js";
import { GLTFLoader } from "./lib/GLTFLoader.js";
import { RGBELoader } from "./lib/RGBELoader.js";
import * as SkeletonUtils from "./lib/SkeletonUtils.js";

export const W = 1080, H = 1920;
// Tiempos anclados a la voz (voz/voz-palabras.json)
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
const mix = (a, b, u) => a + (b - a) * u;
const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };

const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene(); const cielo = new THREE.Color("#000000"); scene.background = cielo;
const cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 400);
function tex(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

// ---------- escenario horneado (textura real × luz horneada) ----------
const gl = new GLTFLoader(), hdr = new RGBELoader();
const carga = (u) => new Promise((ok, mal) => gl.load(u, ok, undefined, mal));
const [gSet, luces, indice] = await Promise.all([carga("assets/horneado/set.glb"), fetch("assets/horneado/luces.json").then((r) => r.json()), fetch("assets/horneado/luz/indice.json").then((r) => r.json())]);
const mapas = {};
await Promise.all(Object.keys(indice).map((n) => new Promise((ok) => hdr.load(`assets/horneado/luz/${encodeURIComponent(n)}.hdr`, (t) => {
  t.flipY = false; t.colorSpace = THREE.LinearSRGBColorSpace; t.channel = 1; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true;
  mapas[n.replace(/[.:\/\[\]]/g, "")] = t; ok(); }, undefined, () => ok()))));
const set = gSet.scene; scene.add(set);
const MATS = [];   // [material, color de día, ¿brilla de noche?]
set.traverse((o) => {
  if (!o.isMesh) return; const lm = mapas[o.name] || mapas[o.parent?.name]; const src = o.material;
  const tieneUv1 = !!o.geometry.attributes.uv1; if (lm && !tieneUv1) lm.channel = 0;
  o.material = new THREE.MeshBasicMaterial({ map: src.map || null, color: src.color || new THREE.Color("#999999"), lightMap: lm || null, lightMapIntensity: Math.PI,
    transparent: src.transparent, alphaTest: src.alphaTest || 0 });
  const brilla = !!(src.emissive && src.emissive.getHex() && !src.map);
  if (brilla) o.material.color = src.emissive.clone().multiplyScalar(1 + (src.emissiveIntensity || 0) * 0.3);
  MATS.push([o.material, o.material.color.clone(), brilla]); o.castShadow = true;
});
const sombraPiso = (w, d, y, x, z, op = 0.3) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.ShadowMaterial({ opacity: op, color: "#14100C" })); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); p.receiveShadow = true; scene.add(p); return p; };
// vereda y piso de enfrente (el set horneado termina en el cordón de este lado)
{ const g = new THREE.Group(); scene.add(g);
  const losa = tex(512, 512, (c, w, h) => { c.fillStyle = "#A39C90"; c.fillRect(0, 0, w, h); c.strokeStyle = "#8C857A"; c.lineWidth = 6; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * 128, 0); c.lineTo(i * 128, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 128); c.lineTo(w, i * 128); c.stroke(); } });
  losa.wrapS = losa.wrapT = THREE.RepeatWrapping; losa.repeat.set(30, 2);
  const vereda = new THREE.Mesh(new THREE.BoxGeometry(60, 0.15, 3.2), new THREE.MeshStandardMaterial({ map: losa, roughness: 0.9 })); vereda.position.set(0, 0.075, 8.6); vereda.receiveShadow = true; g.add(vereda);
  const cordon = new THREE.Mesh(new THREE.BoxGeometry(60, 0.16, 0.22), new THREE.MeshStandardMaterial({ color: "#B8B2A6", roughness: 0.8 })); cordon.position.set(0, 0.08, 7.0); g.add(cordon);
  const pasto = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), new THREE.MeshStandardMaterial({ color: "#5E6B4A", roughness: 1 })); pasto.rotation.x = -Math.PI / 2; pasto.position.set(0, 0.02, 30); pasto.receiveShadow = true; g.add(pasto);
  const calleX = new THREE.Mesh(new THREE.PlaneGeometry(40, 6), new THREE.MeshStandardMaterial({ color: "#3A3A3C", roughness: 0.95 })); calleX.rotation.x = -Math.PI / 2;
  [-35, 35].forEach((x) => { const c = calleX.clone(); c.position.set(x, -0.005, 4); g.add(c); });
  window.__ACERA = g; }
const SOMBRAS = [sombraPiso(30, 6, 0.006, 0, 4), sombraPiso(30, 3.2, 0.156, 0, -0.55), sombraPiso(22, 16, 0.006, -60, -2)];

// ---------- luces en tiempo real (copian el horneado) ----------
const hemi = new THREE.HemisphereLight("#C6D6F2", "#8A7C6A", 1.05); scene.add(hemi);
const sol = new THREE.DirectionalLight("#FFE6C8", 3.0); scene.add(sol, sol.target);
sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); Object.assign(sol.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 80 }); sol.shadow.radius = 8; sol.shadow.blurSamples = 16; sol.shadow.bias = -0.0006;
const SOL_DIR = new THREE.Vector3(-6, 12, 8).normalize().multiplyScalar(30);
const PUNTOS = [];
for (const l of luces.luces) if (l.tipo === "AREA") { const p = new THREE.PointLight(new THREE.Color(...l.color), l.energia * 0.02, 10, 2); p.position.set(l.pos[0], l.pos[2] - 0.5, -l.pos[1]); scene.add(p); PUNTOS.push([p, p.intensity]); }
// faroles de noche: halo cálido sobre la vereda (aparecen al caer el sol)
const haloTex = tex(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2); r.addColorStop(0, "rgba(255,226,170,1)"); r.addColorStop(0.25, "rgba(255,200,120,.55)"); r.addColorStop(1, "rgba(255,180,90,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); });
const HALOS = [];
function halo(x, y, z, s, tinte = "#FFFFFF") { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: tinte, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); m.position.set(x, y, z); m.scale.set(s, s, 1); scene.add(m); HALOS.push(m); return m; }
const FAROLES = [-12, -6, 0, 6, 12].map((x) => { const p = new THREE.PointLight("#FFC98A", 0, 9, 1.6); p.position.set(x, 4.2, 0.4); scene.add(p); halo(x, 4.3, 0.4, 2.2); return p; });
// ventanas encendidas de noche (rectángulos cálidos sobre las fachadas)
const VENT = new THREE.Group(); scene.add(VENT);
{ const m = new THREE.MeshBasicMaterial({ color: "#FFCF8A", transparent: true, opacity: 0, toneMapped: false }); let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 46; i++) { const v = new THREE.Mesh(new THREE.PlaneGeometry(0.7 + r() * 0.4, 0.9), m); v.position.set(-14 + r() * 28, 3.4 + Math.floor(r() * 4) * 2.1, -1.48); VENT.add(v); }
  VENT.userData.m = m; }

// ---------- autos ----------
const props = {};
await Promise.all([["sedan", "assets/props/sedan.glb"], ["suv", "assets/props/suv.glb"], ["taxi", "assets/props/taxi.glb"], ["delivery", "assets/props/delivery.glb"]]
  .map(async ([k, u]) => { props[k] = (await carga(u)).scene; }));
const ESC = 1.75;
function auto(k) {
  const o = props[k].clone(true); o.scale.setScalar(ESC); o.rotation.y = Math.PI / 2; scene.add(o);
  const ruedas = []; o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } if (/^wheel/.test(m.name)) ruedas.push(m); });
  // faros (de noche): dos halos blancos adelante y dos rojos atrás + una luz que ilumina el asfalto
  const fr = [-0.28, 0.28].map((s) => { const h = halo(0, 0, 0, 1.1, "#EAF2FF"); return [h, [s, 0.42, 1.02]]; });
  const tr = [-0.3, 0.3].map((s) => { const h = halo(0, 0, 0, 0.7, "#FF3A3A"); return [h, [s, 0.45, -1.02]]; });
  const luz = new THREE.SpotLight("#EAF2FF", 0, 22, 0.55, 0.5, 1.4); scene.add(luz, luz.target);
  return { o, ruedas, faros: [...fr, ...tr], luz, x: 0 };
}
export const autoM = auto("sedan");   // Martín: alquilado
export const autoL = auto("suv");     // Lucas: propio, a GNC
const trafico = [auto("taxi"), auto("delivery"), auto("sedan")];
const _p = new THREE.Vector3();
function ubicar(a, x, z, dir = 1, noche = 0, y = 0) {
  const dx = x - a.x; a.x = x; a.o.position.set(x, y, z); a.o.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  a.ruedas.forEach((r) => (r.rotation.x = (x / 0.53) * dir));
  a.o.updateWorldMatrix(true, true);
  a.faros.forEach(([h, l]) => { _p.set(...l); a.o.localToWorld(_p); h.position.copy(_p); h.material.opacity = noche; h.visible = noche > 0.01 && a.o.visible; });
  _p.set(0, 0.45, 1.0); a.o.localToWorld(_p); a.luz.position.copy(_p); _p.set(0, 0, 5); a.o.localToWorld(_p); a.luz.target.position.copy(_p); a.luz.intensity = a.o.visible ? noche * 40 : 0;
}
export const marcaM = new THREE.Object3D(); export const marcaL = new THREE.Object3D(); scene.add(marcaM, marcaL);

// ---------- personas ----------
const TIPOS = ["clienta", "vecino", "vendedor", "repartidor"]; const PROTO = {};
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
const PASO = 1.35, VEREDA = 0.15;
function mover(p, t, y, a, b, t0, t1, mira, quieto = "parado", fase = 0) {
  const u = clamp((t - t0) / Math.max(0.001, t1 - t0)); const x = mix(a[0], b[0], u), z = mix(a[1], b[1], u); const anda = t > t0 && t < t1;
  p.o.position.set(x, y, z); p.o.rotation.y = anda || !mira ? Math.atan2(b[0] - a[0], b[1] - a[1]) : Math.atan2(mira[0] - x, mira[1] - z);
  const w = anda ? clamp(Math.min((t - t0) / 0.3, (t1 - t) / 0.3)) : 0; const dist = Math.hypot(b[0] - a[0], b[1] - a[1]) * u;
  pose(p, [["caminar", (dist / PASO) * 1.333 + fase, w], [quieto, t + fase, 1 - w]]); p.blob.position.set(x, y + 0.004, z);
}
const pasajera = persona("clienta");
const transeuntes = [persona("vecino"), persona("clienta"), persona("vendedor")];
const playero = persona("repartidor");

// ---------- efecto miniatura + curva de contraste ----------
const rtA = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }), rtB = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); const qScene = new THREE.Scene(); qScene.add(quad); const qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const blurMat = (final) => new THREE.ShaderMaterial({
  uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() }, foco: { value: 0.5 }, banda: { value: 0.12 }, radio: { value: 9 }, vin: { value: 0 }, oscuro: { value: 0 }, noche: { value: 0 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
  fragmentShader: `uniform sampler2D tex; uniform vec2 dir; uniform float foco, banda, radio, vin, oscuro, noche; varying vec2 vUv;
    void main(){ float d = abs(vUv.y - foco); float k = smoothstep(banda, banda + 0.28, d) * radio;
      vec4 acc = vec4(0.0); float ws = 0.0; for (int i = -6; i <= 6; i++) { float fi = float(i); float w = exp(-fi*fi/18.0); acc += texture2D(tex, vUv + dir * fi * k / 6.0) * w; ws += w; }
      vec4 col = acc / ws;
      ${final ? `vec2 q = vUv - 0.5; col.rgb *= (1.0 - vin * dot(q, q) * 1.6) * (1.0 - oscuro); gl_FragColor = col;
      #include <tonemapping_fragment>
      gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * gl_FragColor.rgb * (3.0 - 2.0 * gl_FragColor.rgb), 0.35);
      float lum = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722)); gl_FragColor.rgb = mix(vec3(lum), gl_FragColor.rgb, 1.1 - 0.35 * noche);
      #include <colorspace_fragment>` : "gl_FragColor = col;"} }`,
  toneMapped: final, depthTest: false, depthWrite: false });
const blurH = blurMat(false), blurV = blurMat(true);

// ---------- planos de cámara ----------
// [desde, sigue ('M' | 'L' | 'ML' | null), pos0, pos1, mira0, mira1, fov, foco, banda, radio]
// Si sigue a un auto, pos y mira son relativas a ese auto (x relativa; y, z absolutas).
const ML = "ML";
const PLANOS = [
  [T.dos, ML, [3.5, 3.2, 22.0], [2.2, 3.0, 20.5], [0.5, 1.0, 4.4], [0.0, 1.0, 4.4], 36, 0.55, 0.14, 9],
  [T.uno, ML, [-2.0, 13.0, 16.0], [-1.0, 11.5, 14.0], [1.5, 0.5, 4.4], [1.0, 0.5, 4.4], 42, 0.5, 0.16, 8],
  [T.tranq, "M", [-7.0, 2.6, 5.5], [-6.2, 2.4, 5.2], [3.0, 1.0, 3.6], [3.0, 1.0, 3.6], 44, 0.55, 0.12, 8],
  [T.martin, null, [6.5, 2.0, 12.0], [5.0, 1.9, 11.0], [0.0, 1.0, 2.0], [-0.4, 1.0, 2.0], 40, 0.55, 0.12, 9],
  [T.div, "M", [4.5, 2.0, 11.5], [4.0, 1.9, 11.0], [0.0, 0.9, 3.6], [0.0, 0.9, 3.6], 42, 0.55, 0.12, 8],
  [T.poreso, null, [0.0, 7.5, 21.0], [0.0, 6.8, 19.0], [0.0, 2.6, -1.0], [0.0, 2.6, -1.0], 44, 0.5, 0.16, 7],
  [T.mes, "M", [-6.0, 2.0, 11.0], [-5.0, 1.9, 10.5], [1.0, 0.9, 3.6], [1.0, 0.9, 3.6], 42, 0.55, 0.12, 9],
  [T.gas, null, [-60 + 7.0, 2.6, 9.0], [-60 + 5.5, 2.4, 8.0], [-61.4, 1.0, 0.4], [-61.6, 1.0, 0.4], 42, 0.55, 0.12, 9],
  [T.quedan, "M", [6.0, 2.6, 12.0], [5.0, 2.4, 11.4], [0.0, 0.9, 3.6], [0.0, 0.9, 3.6], 42, 0.55, 0.12, 9],
  [T.lucas, "L", [6.0, 1.8, 15.0], [5.0, 1.7, 14.2], [0.0, 1.0, 5.6], [0.0, 1.0, 5.6], 40, 0.55, 0.12, 9],
  [T.mesL, "L", [-6.5, 2.4, 13.5], [-5.0, 2.2, 12.5], [0.5, 0.9, 5.6], [0.5, 0.9, 5.6], 42, 0.55, 0.12, 9],
  [T.gasL, null, [-60 + 7.0, 2.6, 9.0], [-60 + 5.5, 2.4, 8.0], [-61.4, 1.0, 0.4], [-61.6, 1.0, 0.4], 42, 0.55, 0.12, 9],
  [T.gasto, "L", [5.0, 1.6, 12.5], [4.2, 1.5, 12.0], [0.0, 0.8, 5.6], [0.0, 0.8, 5.6], 36, 0.55, 0.11, 10],
  [T.quedanL, "L", [-1.0, 9.0, 16.0], [-0.5, 8.0, 14.5], [1.0, 0.5, 5.6], [1.0, 0.5, 5.6], 42, 0.5, 0.16, 8],
  [T.comp, ML, [-2.0, 13.0, 16.0], [-1.0, 11.5, 14.5], [1.5, 0.5, 4.4], [1.0, 0.5, 4.4], 42, 0.5, 0.16, 8],
  [T.porque, ML, [3.5, 3.2, 22.0], [2.5, 3.0, 21.0], [0.0, 1.0, 4.4], [0.0, 1.0, 4.4], 36, 0.55, 0.13, 9],
  [T.escritorio, "M", [5.0, 1.8, 11.5], [4.0, 1.7, 11.0], [0.0, 0.9, 3.6], [0.0, 0.9, 3.6], 40, 0.55, 0.12, 9],
  [T.claro, "L", [-5.5, 2.2, 13.0], [-4.5, 2.0, 12.4], [0.5, 0.9, 5.6], [0.5, 0.9, 5.6], 42, 0.55, 0.12, 9],
  [T.ojo, "M", [5.5, 1.8, 11.5], [4.6, 1.7, 11.0], [0.0, 0.9, 3.6], [0.0, 0.9, 3.6], 40, 0.55, 0.12, 9],
  [T.entonces, null, [0.0, 7.5, 21.0], [0.0, 7.0, 19.5], [0.0, 2.6, -1.0], [0.0, 2.6, -1.0], 44, 0.5, 0.16, 7],
  [T.vos, ML, [3.5, 3.2, 22.0], [2.4, 3.0, 20.8], [0.5, 1.0, 4.4], [0.0, 1.0, 4.4], 36, 0.55, 0.14, 9],
];
function plano(t) { let i = 0; while (i + 1 < PLANOS.length && t >= PLANOS[i + 1][0]) i++; return i; }

// ---------- guion del mundo: dónde está cada auto y qué hora del día es ----------
// noche: 0 = día, 1 = noche cerrada. Martín maneja 12 h: el día cae en «por eso maneja 12 horas».
export function nocheAt(t) {
  if (t < T.poreso) return 0;
  if (t < T.lucas) return sstep(T.poreso + 0.3, T.mes - 0.2, t);        // timelapse: atardece
  if (t < T.ysi) return 0;                                                // Lucas, de día
  if (t < T.vos) return sstep(T.ysi, T.ysi + 2.5, t);                     // «¿y si Lucas también manejara 12 horas?»
  return 0.35;                                                             // cierre: atardecer
}
// Posición de cada auto por plano (x en la calle). La calle mide 30 m (x −15…15); cada plano tiene su propio recorrido.
const CARRIL_M = 3.6, CARRIL_L = 5.6;
function recorrido(t, i) {
  const [t0] = PLANOS[i]; const t1 = i + 1 < PLANOS.length ? PLANOS[i + 1][0] : T.fin; const s = t - t0, d = t1 - t0;
  const r = { m: null, l: null, zm: CARRIL_M, zl: CARRIL_L, estM: null, estL: null };
  const pas = (x0, v) => x0 + v * s;   // arranca en x0 y avanza a v m/s
  switch (PLANOS[i][0]) {
    case T.dos: r.m = pas(-6, 3.0); r.l = pas(-11.5, 3.0); break;
    case T.uno: r.m = pas(-7, 2.4); r.l = pas(-12, 2.4); break;
    case T.tranq: r.m = pas(-13, 2.2); r.l = null; break;
    case T.martin: { // Martín frena junto a la vereda, la pasajera sube
      const u = clamp(s / 2.2); r.m = mix(-12, 1.2, 1 - Math.pow(1 - u, 2.4)); r.zm = mix(CARRIL_M, 2.2, sstep(0.4, 1, u)); r.sinTrafico = true; r.l = null; break; }
    case T.div: r.m = pas(-12, 2.6); break;
    case T.poreso: r.m = -14 + ((s * 7) % 30); r.l = null; break;      // timelapse: pasa y pasa
    case T.mes: r.m = pas(-12, 1.3); break;
    case T.gas: r.estM = [-61.6, 0.7]; break;                          // cargando GNC
    case T.quedan: r.m = pas(-10, 1.6); break;
    case T.lucas: r.l = pas(-10, 2.4); r.zl = CARRIL_L; break;
    case T.mesL: r.l = pas(-10, 2.0); break;
    case T.gasL: r.estL = [-61.6, 0.7]; break;
    case T.gasto: r.l = pas(-11, 1.5); break;
    case T.quedanL: r.l = pas(-9, 2.6); break;
    case T.comp: r.m = pas(-7, 1.0); r.l = pas(-12, 1.0); break;
    case T.porque: r.m = pas(-4, 1.2); r.l = pas(-9.5, 1.2); break;
    case T.escritorio: r.m = pas(-12, 2.0); break;
    case T.claro: r.l = pas(-11, 1.6); break;
    case T.ojo: { // frenada brusca en «chocás»
      const tf = T.chocas - t0; const x = s < tf ? -12 + 4.2 * s : -12 + 4.2 * tf + 4.2 * 0.25 * (1 - Math.exp(-(s - tf) * 4)); r.m = x; break; }
    case T.entonces: r.m = -14 + ((s * 3.5) % 30); r.l = 14 - ((s * 3.0 + 9) % 30); r.dirL = -1; r.zl = 2.0; r.sinTrafico = true; break;
    case T.vos: r.m = pas(-3, 1.6); r.l = pas(-8.5, 1.6); break;
  }
  return r;
}

const _v = new THREE.Vector3();
export function aPantalla(obj, local = [0, 0, 0]) { obj.updateWorldMatrix(true, false); _v.set(...local); obj.localToWorld(_v); _v.project(cam); return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H, vis: _v.z < 1 && _v.z > -1 }; }
export const estado = { plano: 0 };

export function render(t, oscuro = 0) {
  const i = plano(t); const P = PLANOS[i]; const t1 = i + 1 < PLANOS.length ? PLANOS[i + 1][0] : T.fin; const u = ease(clamp((t - P[0]) / (t1 - P[0])));
  const n = nocheAt(t); const r = recorrido(t, i);
  // autos
  autoM.o.visible = r.m !== null || !!r.estM; autoL.o.visible = r.l !== null || !!r.estL;
  if (r.estM) ubicar(autoM, r.estM[0], r.estM[1], 1, n); else if (r.m !== null) ubicar(autoM, r.m, r.zm, 1, n);
  if (r.estL) ubicar(autoL, r.estL[0], r.estL[1], 1, n); else if (r.l !== null) ubicar(autoL, r.l, r.zl, r.dirL || 1, n);
  if (!autoM.o.visible) ubicar(autoM, 999, 0, 1, 0); if (!autoL.o.visible) ubicar(autoL, 999, 0, 1, 0);
  marcaM.position.set(autoM.o.position.x, 2.3, autoM.o.position.z); marcaL.position.set(autoL.o.position.x, 2.5, autoL.o.position.z);
  // tránsito en el carril de enfrente (vienen en sentido contrario)
  trafico.forEach((a, k) => { const L = 44, v = 6 + k * 1.3; const x = 22 - ((t * v + k * 15) % L); const enCalle = !r.sinTrafico && !r.estM && !r.estL && (P[1] !== null || PLANOS[i][0] === T.poreso);
    a.o.visible = enCalle; ubicar(a, enCalle ? x : 999, 1.9, -1, n); });
  // pasajera: espera en la vereda, camina al auto y sube (desaparece al llegar a la puerta)
  const tp = T.martin; const llega = tp + 2.6, sube = tp + 4.6;
  if (PLANOS[i][0] === T.martin && t < sube) { pasajera.o.visible = pasajera.blob.visible = true;
    if (t < llega) mover(pasajera, t, VEREDA, [1.9, 0.1], [1.9, 0.1], 0, 0.01, [1.9, 2], "parado", 0.3);
    else mover(pasajera, t, t < llega + 1.2 ? VEREDA : 0, [1.9, 0.1], [1.6, 1.1], llega, sube, [1.6, 2], "parado", 0.3); }
  else { pasajera.o.visible = pasajera.blob.visible = false; }
  // transeúntes por la vereda
  transeuntes.forEach((p, k) => { const L = 26, v = 1.1, s = ((t * v + k * 9) % L); const ida = k % 2 === 0; mover(p, s / v, VEREDA, [ida ? -13 : 13, -0.3 - k * 0.6], [ida ? 13 : -13, -0.3 - k * 0.6], 0, L / v, null, "parado", k * 0.7); });
  // playero junto al surtidor
  mover(playero, t, 0, [-64.2, 0.6], [-64.2, 0.6], 0, 0.01, [-61.6, 0.7], "parado", 0.4);
  // cámara (sigue al auto si el plano lo pide)
  let ox = 0; if (P[1] === "M") ox = autoM.o.position.x; else if (P[1] === "L") ox = autoL.o.position.x; else if (P[1] === ML) ox = (autoM.o.position.x + autoL.o.position.x) / 2;
  const pos = P[2].map((v, k) => mix(v, P[3][k], u)), mira = P[4].map((v, k) => mix(v, P[5][k], u)); pos[0] += ox; mira[0] += ox;
  // temblor de la frenada
  if (PLANOS[i][0] === T.ojo && t > T.chocas) { const a = Math.exp(-(t - T.chocas) * 5) * 0.12; pos[1] += Math.sin(t * 67) * a; pos[0] += Math.sin(t * 53) * a; }
  cam.position.set(...pos); cam.fov = P[6]; cam.aspect = W / H; cam.updateProjectionMatrix(); cam.lookAt(...mira);
  // día → noche
  const dia = 1 - n; const tinte = new THREE.Color().setRGB(mix(1, 0.42, n), mix(1, 0.48, n), mix(1, 0.72, n));
  MATS.forEach(([m, c, brilla]) => { m.color.copy(c); if (!brilla) m.color.multiply(tinte); else m.color.multiplyScalar(1 + n * 1.5); });
  hemi.intensity = mix(1.05, 0.28, n); hemi.color.set(n > 0.5 ? "#7C8FC4" : "#C6D6F2"); sol.intensity = 3.0 * Math.pow(dia, 1.5); sol.color.setRGB(1, mix(0.9, 0.62, n), mix(0.78, 0.45, n));
  PUNTOS.forEach(([p, i0]) => (p.intensity = i0 * (1 + n * 2)));
  FAROLES.forEach((p) => (p.intensity = n * 14)); HALOS.forEach((h) => { if (!h.userData.auto) h.material.opacity = h.material.opacity; });
  HALOS.slice(0, FAROLES.length).forEach((h) => { h.material.opacity = n; h.visible = n > 0.01; });
  VENT.userData.m.opacity = sstep(0.35, 0.9, n) * 0.95;
  SOMBRAS.forEach((s) => (s.material.opacity = 0.3 * dia));
  cielo.setRGB(mix(0.56, 0.02, n), mix(0.70, 0.035, n), mix(0.86, 0.09, n));
  // el sol sigue a la zona que se filma
  sol.target.position.set(mira[0], 0, mira[2]); sol.position.set(mira[0] + SOL_DIR.x, SOL_DIR.y, mira[2] + SOL_DIR.z);
  renderer.toneMappingExposure = mix(1.0, 1.25, n);
  renderer.setRenderTarget(rtA); renderer.render(scene, cam);
  const [foco, banda, radio] = [P[7], P[8], P[9]];
  blurH.uniforms.tex.value = rtA.texture; blurH.uniforms.dir.value.set(1 / W, 0); blurH.uniforms.foco.value = foco; blurH.uniforms.banda.value = banda; blurH.uniforms.radio.value = radio;
  quad.material = blurH; renderer.setRenderTarget(rtB); renderer.render(qScene, qCam);
  blurV.uniforms.tex.value = rtB.texture; blurV.uniforms.dir.value.set(0, 1 / H); blurV.uniforms.foco.value = foco; blurV.uniforms.banda.value = banda; blurV.uniforms.radio.value = radio; blurV.uniforms.vin.value = mix(0.45, 0.8, n); blurV.uniforms.oscuro.value = oscuro; blurV.uniforms.noche.value = n;
  quad.material = blurV; renderer.setRenderTarget(null); renderer.render(qScene, qCam);
  estado.plano = i; return { plano: i, noche: n };
}
