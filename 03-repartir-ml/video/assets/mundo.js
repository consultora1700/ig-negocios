// Reel 03 v2 «Repartir para Mercado Libre: facturar no es ganar» — mundo 3D.
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
  hasta: 0.0, mitad: 6.7, primero: 8.0, notiene: 9.6, paquete: 11.9, escobar: 14.0, mil130: 15.0, ultima: 17.3, vos: 19.1,
  caminos: 21.6, uno: 23.0, semana: 26.7, dos: 27.6, pesos: 30.3, deeso: 33.1, piden: 34.5, auto: 34.9, celular: 35.6, seguro: 36.6, mono: 37.0,
  cuenta: 38.0, ml: 39.3, fact: 41.7, mismo: 43.6, cobra: 44.7, gnc: 46.1, km130: 47.5, snafta: 49.8, cubiertas: 52.1, s300: 53.6, valor: 54.9, s150: 56.2,
  seg: 57.2, s260: 59.4, quedan: 60.7, s1660: 61.6, s45: 65.4, lucas: 67.5, s190: 68.3, cuota: 70.0, quedanL: 71.4, s2030: 72.0, s370: 74.0,
  loco: 76.9, dosrutas: 78.9, mitad2: 83.0, regla: 84.9, mandaselo: 90.3, seguime: 92.3, fin: 97.7,
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
await Promise.all([["sedan", "assets/props/sedan.glb"], ["delivery", "assets/props/delivery.glb"], ["caja", "assets/props/cardboard_box_01/cardboard_box_01.gltf"],
  ["zorra", "assets/props/hand_truck/hand_truck.gltf"], ["carro", "assets/props/industrial_storage_cart/industrial_storage_cart.gltf"],
  ["lampara", "assets/props/hanging_industrial_lamp/hanging_industrial_lamp.gltf"], ["hidrante", "assets/props/fire_hydrant/fire_hydrant.gltf"], ["tacho", "assets/props/metal_trash_can/metal_trash_can.gltf"]]
  .map(async ([k, u]) => { props[k] = (await carga(u)).scene; }));
function poner(k, x, y, z, ry = 0, esc = 1) { const o = props[k].clone(true); o.position.set(x, y, z); o.rotation.y = ry; o.scale.setScalar(esc); o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); scene.add(o); return o; }
// calle: auto del repartidor estacionado (baúl con cajas), camión de reparto que pasa, hidrante y tacho
export const auto = poner("sedan", 1.2, 0, 2.0, Math.PI / 2, 1.75);
export const camion = poner("delivery", 30, 0, 4.6, -Math.PI / 2, 1.75);
poner("hidrante", 4.2, 0.15, 0.4, 0, 1.0); poner("tacho", -6.4, 0.15, -1.6, 0, 0.8);
// estación: el mismo modelo de auto, cargando nafta
export const autoNafta = poner("sedan", -61.6, 0, 0.7, Math.PI / 2, 1.75);
// centro logístico: carros, zorras, lámparas colgantes y cajas en los racks
for (const [x, z, r] of [[52, 1.0, 0.4], [66, -2.0, -0.6], [57, -11.5, 0.2]]) poner("carro", x, 0, z, r, 1.1);
for (const [x, z, r] of [[55.6, 0.6, 0.8], [70, 1.5, -0.3]]) poner("zorra", x, 0, z, r, 1.1);
for (const x of [52, 60, 68]) for (const z of [-9, -1]) poner("lampara", x, 5.2, z, 0, 1.6);
const cajaGeo = []; props.caja.traverse((m) => { if (m.isMesh) cajaGeo.push(m); });
function instanciar(n, frustum = false) { const g = cajaGeo[0]; const im = new THREE.InstancedMesh(g.geometry, g.material, n); im.castShadow = im.receiveShadow = true; im.frustumCulled = frustum; scene.add(im); return im; }
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const RACK = [];   // cajas apiladas sobre los pallets
for (const zr of [-5, -9]) for (let c = 0; c < 5; c++) for (const nivel of [0.15, 1.75, 3.35]) for (const p of [0.7, 2.0]) for (let k = 0; k < 4; k++)
  if (rnd() > 0.15) RACK.push([60 - 11 + c * 2.9 + p + ((k % 2) - 0.5) * 0.5, nivel + 0.28 + Math.floor(k / 2) * 0.36 + 0.17, zr + (((k >> 1) & 1) - 0.5) * 0.5 + (rnd() - 0.5) * 0.08, rnd() * 0.3]);
const rack = instanciar(RACK.length);
RACK.forEach(([x, y, z, r], i) => { _e.set(0, r, 0); _q.setFromEuler(_e); _m.compose(new THREE.Vector3(x, y - 0.17, z), _q, new THREE.Vector3(1.25, 1.25, 1.25)); rack.setMatrixAt(i, _m); });
const CINTAS = [[64, 1.04, -1.5, 16], [58, 1.04, 2.5, 12]];   // x centro, alto, z, largo
const N_CINTA = 18; const enCinta = instanciar(N_CINTA * 2);
export const cajaMano = props.caja.clone(true); cajaMano.scale.setScalar(1.3); cajaMano.traverse((m) => { if (m.isMesh) m.castShadow = true; }); scene.add(cajaMano);
const baul = instanciar(5); [[-0.7, 0.62, 0.0], [-0.25, 0.62, 0.05], [-0.5, 0.95, 0.02], [0.2, 0.62, -0.02], [-0.1, 0.95, 0.0]].forEach(([dx, y, dz], i) => {
  _e.set(0, i * 0.4, 0); _q.setFromEuler(_e); _m.compose(new THREE.Vector3(1.2 - 1.4 + dx, y, 2.0 + dz), _q, new THREE.Vector3(1.1, 1.1, 1.1)); baul.setMatrixAt(i, _m); });

// logos oficiales (Wikimedia Commons, dominio público) sobre el amarillo de la marca
const placaML = new THREE.TextureLoader().load("assets/logos/ml-placa.png"); placaML.colorSpace = THREE.SRGBColorSpace; placaML.anisotropy = 8;
const matPlaca = new THREE.MeshStandardMaterial({ map: placaML, roughness: 0.5 });
function placa(w, h) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), matPlaca); m.castShadow = false; m.receiveShadow = true; return m; }
[-1, 1].forEach((s) => { const p = placa(1.5, 0.7); p.position.set(s * 0.765, 0.95, -0.35); p.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2; camion.add(p); });   // costados del camión (unidades del modelo)
{ const p = placa(5.2, 2.4); p.position.set(60 - 9.5, 4.6, -12.97); scene.add(p); }
export const marcaLogoNave = new THREE.Object3D(); marcaLogoNave.position.set(60 - 9.5, 6.0, -12.9); scene.add(marcaLogoNave);

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
const chofer = persona("repartidor");
const operarios = [persona("vecino"), persona("vendedor"), persona("vecino"), persona("clienta")];
const transeuntes = [persona("clienta"), persona("vecino")];

// ---------- mesa de las dos rutas (giro) ----------
const MX = 120;
const mesa = new THREE.Mesh(new RoundedBoxGeometry(9, 0.3, 11, 4, 0.12), std("#15171B", 0.6)); mesa.position.set(MX, -0.15, 0); mesa.receiveShadow = true; scene.add(mesa);
const luzMesa = new THREE.SpotLight("#FFF1DE", 140, 30, 0.75, 0.6, 1.6); luzMesa.position.set(MX - 2, 10, 6); luzMesa.target.position.set(MX, 0, 0); luzMesa.castShadow = true; scene.add(luzMesa, luzMesa.target);
function mapaCanvas() { const c = document.createElement("canvas"); c.width = 1024; c.height = 1024; return c; }
const RUTAS = [0, 1].map((k) => {
  const c = mapaCanvas(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 })); m.rotation.x = -Math.PI / 2; m.position.set(MX + (k ? 2.1 : -2.1), 0.01, -0.6); m.receiveShadow = true; scene.add(m);
  const pts = []; const r = (s) => { let v = s; return () => ((v = (v * 16807) % 2147483647) / 2147483647); }; const rr = r(k ? 777 : 333);
  for (let i = 0; i < 20; i++) pts.push(k ? [520 + (rr() - 0.5) * 220, 520 + (rr() - 0.5) * 220] : [120 + rr() * 780, 120 + rr() * 780]);
  // ordenar para un recorrido razonable (vecino más cercano)
  const orden = [[512, 980]]; const resto = pts.slice(); while (resto.length) { const [ux, uy] = orden[orden.length - 1]; let bi = 0, bd = 1e9; resto.forEach((p, i) => { const d = Math.hypot(p[0] - ux, p[1] - uy); if (d < bd) { bd = d; bi = i; } }); orden.push(resto.splice(bi, 1)[0]); }
  return { c, t, m, orden };
});
export const marcaRuta = [new THREE.Object3D(), new THREE.Object3D()]; marcaRuta[0].position.set(MX - 2.1, 0.2, -2.6); marcaRuta[1].position.set(MX + 2.1, 0.2, -2.6); scene.add(...marcaRuta);
function dibujarRuta(R, u, k) {
  const g = R.c.getContext("2d"); g.fillStyle = "#E9E5DC"; g.fillRect(0, 0, 1024, 1024);
  g.strokeStyle = "#CFC9BD"; g.lineWidth = 14; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 1024); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(1024, i * 128); g.stroke(); }
  g.fillStyle = "#B9D3A8"; g.fillRect(140, 150, 230, 210); g.fillRect(660, 640, 200, 220);
  const n = R.orden.length - 1; const hasta = u * n; g.strokeStyle = "#007BFF"; g.lineWidth = 12; g.lineJoin = "round"; g.beginPath(); g.moveTo(...R.orden[0]);
  for (let i = 1; i <= n; i++) { if (i - 1 > hasta) break; const f = Math.min(1, hasta - (i - 1)); const [ax, ay] = R.orden[i - 1], [bx, by] = R.orden[i]; g.lineTo(ax + (bx - ax) * f, ay + (by - ay) * f); }
  g.stroke();
  R.orden.slice(1).forEach(([x, y], i) => { g.fillStyle = i < hasta ? "#007BFF" : "#C08E5A"; g.beginPath(); g.arc(x, y, 16, 0, 7); g.fill(); });
  g.fillStyle = "#1E2430"; g.beginPath(); g.arc(...R.orden[0], 22, 0, 7); g.fill(); R.t.needsUpdate = true;
}
export function kmRuta(k, u) { return Math.round((k === 0 ? 50 : 25) * u); }

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
const PLANOS = [
  // [desde, pos0, pos1, mira0, mira1, fov, foco, banda, radio]
  [T.hasta, [5.6, 2.3, 8.6], [4.4, 2.0, 7.4], [0.0, 1.1, 0.2], [-0.2, 1.0, 0.0], 46, 0.55, 0.13, 9],
  [T.primero, [0.0, 9.0, 18.0], [-1.0, 8.0, 15.5], [0.0, 2.2, -1.0], [-0.6, 2.0, -1.2], 46, 0.52, 0.16, 7],
  [T.paquete, [60 + 9, 11, 13], [60 + 6, 9.5, 11], [60, 1.5, -4], [60 + 1, 1.2, -3], 48, 0.5, 0.18, 6],
  [T.ultima, [60 + 9.0, 3.2, 6.0], [60 + 7.2, 2.8, 4.6], [60 + 3, 1.2, -1.5], [60 + 2, 1.1, -1.5], 46, 0.52, 0.12, 9],
  [T.vos, [-1.6, 1.7, 5.4], [-1.2, 1.6, 4.6], [0.4, 1.0, 0.8], [0.2, 1.0, 0.6], 46, 0.55, 0.12, 9],
  [T.caminos, [3.2, 1.7, 7.5], [2.4, 1.6, 6.6], [0.6, 1.1, 0.8], [0.4, 1.1, 0.6], 46, 0.55, 0.14, 9],
  [T.dos, [60 - 6, 2.6, 7.0], [60 - 4.5, 2.4, 6.0], [60 - 1, 1.2, -2], [60 - 0.5, 1.1, -2], 46, 0.52, 0.12, 9],
  [T.piden, [6.8, 3.0, 8.8], [5.8, 2.7, 7.8], [1.6, 0.9, 1.2], [1.4, 0.9, 1.2], 46, 0.58, 0.14, 9],
  [T.cuenta, [-6.0, 2.4, 8.5], [-2.0, 2.2, 8.5], [-3.0, 0.9, 3.5], [1.0, 0.9, 3.5], 46, 0.55, 0.12, 9],
  [T.cobra, [-60 + 4.0, 2.0, 6.0], [-60 + 2.6, 1.8, 4.6], [-60 - 1.2, 1.2, -1.2], [-60 - 1.4, 1.2, -1.4], 46, 0.55, 0.12, 9],
  [T.quedan, [-60 + 9.0, 5.0, 13.0], [-60 + 7.0, 4.4, 11.0], [-60, 2.0, -1.0], [-60, 2.0, -1.0], 46, 0.52, 0.16, 7],
  [T.loco, [MX, 11.5, 7.5], [MX, 10.0, 5.6], [MX, 0, -0.4], [MX, 0, -0.6], 46, 0.5, 0.25, 5],
  [T.regla, [MX, 9.5, 5.5], [MX, 9.0, 5.0], [MX, 0, -0.6], [MX, 0, -0.6], 46, 0.5, 0.25, 5],
  [T.mandaselo, [5.6, 2.3, 8.6], [4.6, 2.0, 7.6], [0.0, 1.1, 0.2], [-0.2, 1.0, 0.0], 46, 0.55, 0.13, 9],
];
function camara(t) {
  let i = 0; while (i + 1 < PLANOS.length && t >= PLANOS[i + 1][0]) i++;
  const [t0, p0, p1, m0, m1, fov, foco, banda, radio] = PLANOS[i]; const t1 = i + 1 < PLANOS.length ? PLANOS[i + 1][0] : T.fin; const u = ease(clamp((t - t0) / (t1 - t0)));
  return { pos: p0.map((v, k) => mix(v, p1[k], u)), mira: m0.map((v, k) => mix(v, m1[k], u)), fov, foco, banda, radio, plano: i };
}
export function camAt(t) { const k = camara(t); cam.position.set(...k.pos); cam.fov = k.fov; cam.aspect = W / H; cam.updateProjectionMatrix(); cam.lookAt(...k.mira); return k; }
const _v = new THREE.Vector3();
export function aPantalla(obj, local = [0, 0, 0]) { obj.updateWorldMatrix(true, false); _v.set(...local); obj.localToWorld(_v); _v.project(cam); return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H, vis: _v.z < 1 && _v.z > -1 }; }
export const marcaSurtidor = new THREE.Object3D(); marcaSurtidor.position.set(-61.6, 2.4, -1.7); scene.add(marcaSurtidor);
export const marcaAuto = new THREE.Object3D(); marcaAuto.position.set(1.2, 1.9, 2.0); scene.add(marcaAuto);
export const marcaNave = new THREE.Object3D(); marcaNave.position.set(60, 6.5, -5); scene.add(marcaNave);

// ---------- estado del mundo en el tiempo t ----------
const VEREDA = 0.15;
export function render(t, oscuro = 0) {
  // el sol sigue a la zona que se filma, para que la sombra nítida caiga donde mira la cámara
  const k = camAt(t); const cx = k.mira[0], cz = k.mira[2];
  sol.target.position.set(cx, 0, cz); sol.position.set(cx + SOL_DIR.x, SOL_DIR.y, cz + SOL_DIR.z);
  // chofer: baja la caja del baúl y la lleva a la puerta del local (y lo repite en la vuelta del final)
  const ciclo = t < T.cuenta ? t % 12 : (t - T.cuenta) % 12;
  const enAuto = t >= T.cuenta && t < T.cobra;
  if (enAuto) { chofer.o.visible = false; chofer.blob.visible = false; }
  else { chofer.o.visible = chofer.blob.visible = true;
    if (ciclo < 1.2) mover(chofer, t, 0, [-1.75, 2.0], [-1.75, 2.0], 0, 0.01, [1, 2.0], "entregar", 0.2);
    else if (ciclo < 5.0) mover(chofer, t, 0, [-1.75, 2.0], [-1.6, -1.4], 1.2 + (t - ciclo), 5.0 + (t - ciclo), [-1.6, -3], "entregar", 0.2, "cargar");
    else if (ciclo < 7.0) mover(chofer, t, VEREDA, [-1.6, -1.4], [-1.6, -1.4], 0, 0.01, [-1.6, -3], "entregar", 0.2);
    else mover(chofer, t, 0, [-1.6, -1.4], [-1.75, 2.0], 7.0 + (t - ciclo), 11.6 + (t - ciclo), null, "parado", 0.2); }
  const sosteniendo = !enAuto && (ciclo < 7.0); chofer.o.updateWorldMatrix(true, true);
  if (sosteniendo) { cajaMano.visible = true; const f = new THREE.Vector3(0, 1.12, 0.42).applyQuaternion(chofer.o.quaternion); cajaMano.position.copy(chofer.o.position).add(f); cajaMano.rotation.y = chofer.o.rotation.y; } else cajaMano.visible = false;
  // auto: estacionado; en «la cuenta» circula por la calle
  if (enAuto) { const u = clamp((t - T.cuenta) / (T.cobra - T.cuenta)); auto.position.set(mix(-12, 10, u), 0, 2.0); } else auto.position.set(1.2, 0, 2.0);
  baul.visible = false;
  // camión de reparto que pasa por la calle
  camion.visible = t >= T.primero && t < T.paquete; camion.position.set(mix(16, -16, clamp((t - T.primero) / (T.paquete - T.primero))), 0, 5.2);
  // transeúntes por la vereda
  transeuntes.forEach((p, i) => { const L = 26, v = 1.1, s = ((t * v + i * 13) % L); const x = i ? -13 + s : 13 - s; mover(p, s / v, VEREDA, [i ? -13 : 13, -0.2 - i * 0.8], [i ? 13 : -13, -0.2 - i * 0.8], 0, L / v, null, "parado", i * 0.7); });
  // centro logístico: cajas que avanzan por las cintas y operarios
  let n = 0; CINTAS.forEach(([x, y, z, L], c) => { for (let i = 0; i < N_CINTA; i++) { const s = ((i / N_CINTA) * L + t * 0.9) % L; _e.set(0, i * 0.7, 0); _q.setFromEuler(_e); _m.compose(new THREE.Vector3(x - L / 2 + s, y, z), _q, new THREE.Vector3(1.15, 1.15, 1.15)); enCinta.setMatrixAt(n++, _m); } });
  enCinta.instanceMatrix.needsUpdate = true;
  mover(operarios[0], t, 0, [61, -0.4], [61, -0.4], 0, 0.01, [61, -1.5], "embalar", 0.3);
  mover(operarios[1], t, 0, [66, -0.4], [66, -0.4], 0, 0.01, [66, -1.5], "embalar", 1.1);
  mover(operarios[2], t, 0, [50, -3.0], [71, -3.0], 0, 40, null, "parado", 0.5, "cargar");
  mover(operarios[3], t, 0, [54.5, -1.6], [54.5, -1.6], 0, 0.01, [56, -1.6], "embalar", 2.0);
  // estación: el chofer al lado del auto, cargando nafta
  // (en ese plano se reusa el mismo chofer: se lo ubica junto al surtidor)
  if (t >= T.cobra && t < T.loco) { chofer.o.visible = chofer.blob.visible = true; mover(chofer, t, 0, [-64.6, 0.2], [-64.6, 0.2], 0, 0.01, [-61.6, -2], "parado", 0.4); cajaMano.visible = false; }
  // mesa de las rutas
  const ur = clamp((t - T.loco - 0.6) / 5.5);
  RUTAS.forEach((R, i) => dibujarRuta(R, t < T.loco ? 0 : ur, i));
  renderer.setRenderTarget(rtA); renderer.render(scene, cam);
  blurH.uniforms.tex.value = rtA.texture; blurH.uniforms.dir.value.set(1 / W, 0); blurH.uniforms.foco.value = k.foco; blurH.uniforms.banda.value = k.banda; blurH.uniforms.radio.value = k.radio;
  quad.material = blurH; renderer.setRenderTarget(rtB); renderer.render(qScene, qCam);
  blurV.uniforms.tex.value = rtB.texture; blurV.uniforms.dir.value.set(0, 1 / H); blurV.uniforms.foco.value = k.foco; blurV.uniforms.banda.value = k.banda; blurV.uniforms.radio.value = k.radio; blurV.uniforms.vin.value = 0.45; blurV.uniforms.oscuro.value = oscuro;
  quad.material = blurV; renderer.setRenderTarget(null); renderer.render(qScene, qCam);
  return k;
}
