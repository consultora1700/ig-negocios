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
  hook: 0.0, cuenta: 2.68, martin: 5.51, compras: 8.6, parrilla: 9.69, s120: 10.99, gazebo: 12.16, s290: 13.46, harina: 14.34, s22: 16.44, grasa: 17.42, carbon: 18.02, chicha: 18.42, s30: 19.32,
  total: 20.3, s463: 21.1, medio: 22.6, antesVender: 23.97,
  amasar: 26.17, ingred: 28.57, kilo: 30.67, ocho: 32.17, s200: 35.19, dias4: 35.81, cuesta: 37.39, s300: 40.39, comun: 41.28, s2500: 42.18, s2200: 43.68, todavia: 44.78, falta: 45.84,
  dia1: 49.16, v50: 50.64, mix: 52.04, op1: 56.62, op2: 58.7, entran: 59.79, gastos: 61.21, g1: 64.31, g2: 65.86, g3: 67.54, g4: 69.45, gasto: 70.37, resta: 71.63, quedan: 73.79, undia: 75.08,
  semana: 75.87, lunes: 78.66, martes: 80.16, viernes: 81.63, sabado: 83.33, llueve: 84.32, basura: 85.92, domingo: 87.92,
  mes: 90.11, d26: 91.7, d22: 94.39, mult: 98.71, fijo: 100.61, s80: 105.88, quedanM: 108.28, m40: 113.75, m60: 116.96, m100: 121.39,
  nadie: 122.88, seis: 125.68, h132: 128.86, div1: 134.98, antes: 137.54, cuatro: 143.04, h220: 145.52, div2: 150.37,
  decomiso: 152.52, pierde: 155.02, pgazebo: 155.92, pmerca: 156.42, metodo: 159.29, conta: 161.2, guarda: 163.81, mandaselo: 165.69, seguime: 167.37, fin: 172.77,
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
const PX = -0.2, PZ = -0.2;   // centro del puesto: entre los jacarandás (x −3,2 y 2,8), lejos de los faroles (x −8 y 5,2)
const caja = (w, h, d, mat, x, y, z, padre, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; (padre || scene).add(m); return m; };
const cil = (rt, rb, h, mat, x, y, z, padre, seg = 24) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; (padre || scene).add(m); return m; };
function rotulo(txt, sub, fondo, tinta, w = 512, h = 256) { return tex(w, h, (g) => { g.fillStyle = fondo; g.fillRect(0, 0, w, h); g.fillStyle = tinta; g.textAlign = "center"; g.font = `900 ${h * 0.3}px Montserrat`; g.fillText(txt, w / 2, h * 0.48); if (sub) { g.font = `800 ${h * 0.17}px Montserrat`; g.fillText(sub, w / 2, h * 0.78); } }); }
// puesto y cocina armados en Blender con modelos CC0 de Poly Haven (blender/puesto.py). Blender +Y queda hacia la calle al girar 180°.
const [gPuesto, gCocina] = await Promise.all([carga("assets/escena/puesto.glb"), carga("assets/escena/cocina.glb")]);
const puesto = gPuesto.scene; puesto.position.set(PX, VEREDA, PZ); puesto.rotation.y = Math.PI; scene.add(puesto);
const cocina = gCocina.scene; scene.add(cocina);
[puesto, cocina].forEach((g) => g.traverse((m) => { if (m.isMesh) { m.castShadow = m.name.indexOf("tiza") < 0; m.receiveShadow = true; if (m.material.map) m.material.map.anisotropy = 8; } }));
const nodo = (n) => puesto.getObjectByName(n);
export const parrilla = nodo("parrilla"), gazebo = nodo("gazebo"), mesa = nodo("mesa"), harina = nodo("harina"), carbon = nodo("carbon"), chicha = nodo("chicha");
const extras = ["canasta", "tabla", "cartel", "cajon", "silla"].map(nodo), basura = nodo("basura");
const tortiTex = tex(256, 256, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); r.addColorStop(0, "#E9C47C"); r.addColorStop(0.85, "#D2A057"); r.addColorStop(1, "#A8742E"); g.fillStyle = r; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 46; i++) { g.fillStyle = `rgba(70,35,10,${0.2 + rnd() * 0.45})`; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 5 + rnd() * 11, 3 + rnd() * 7, rnd() * 3, 0, 7); g.fill(); } });
const matTorti = new THREE.MeshStandardMaterial({ map: tortiTex, roughness: 0.75 });
function tortilla(r = 0.1) { const g = new THREE.CylinderGeometry(r, r, 0.016, 28, 1); const pos = g.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); const a = Math.atan2(z, x); const k = 1 + Math.sin(a * 5 + r * 40) * 0.035; pos.setX(i, x * k); pos.setZ(i, z * k); pos.setY(i, pos.getY(i) + Math.sin(x * 30) * Math.cos(z * 27) * 0.003); } g.computeVertexNormals(); const m = new THREE.Mesh(g, matTorti); m.castShadow = m.receiveShadow = true; return m; }
// tortillas sobre la rejilla del tambor (centro en el puesto: x −0,45, z +0,15, alto 0,83) y en la canasta
const GR_X = PX + 0.25, GR_Z = PZ - 0.1, GR_Y = VEREDA + 0.845;
const enParrilla = [[-0.1, -0.09], [0.11, -0.08], [0.0, 0.11]].map(([dx, dz], i) => { const t = tortilla(0.095); t.position.set(GR_X + dx, GR_Y, GR_Z + dz); t.rotation.y = i; scene.add(t); return t; });
const enCanasta = Array.from({ length: 6 }, (_, i) => { const t = tortilla(0.1); t.position.set(PX - 0.85 + (rnd() - 0.5) * 0.04, VEREDA + 0.83 + i * 0.016, PZ - 0.15); t.rotation.y = i; scene.add(t); return t; });
const luzBrasa = new THREE.PointLight("#FF7A2A", 2.4, 3.5, 2); luzBrasa.position.set(GR_X, VEREDA + 0.95, GR_Z); scene.add(luzBrasa);
const humoTex = tex(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); r.addColorStop(0, "rgba(235,235,235,.5)"); r.addColorStop(1, "rgba(235,235,235,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); });
const HUMO = Array.from({ length: 16 }, (_, i) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: humoTex, transparent: true, depthWrite: false })); scene.add(m); return { m, f: i / 16, dx: (rnd() - 0.5) * 0.5 }; });
// cocina de madrugada en x = 120 (girada: la pared con la ventana queda al fondo)
const MX = 120; cocina.position.set(MX, 0, 0); cocina.rotation.y = Math.PI;
const luzCocina = new THREE.SpotLight("#FFE2B8", 60, 9, 0.75, 0.6, 1.4); luzCocina.position.set(MX, 2.5, -0.3); luzCocina.target.position.set(MX, 0.85, -0.35); luzCocina.castShadow = true; luzCocina.shadow.mapSize.set(1024, 1024); scene.add(luzCocina, luzCocina.target);
const luzRelleno = new THREE.PointLight("#8FA8D8", 3, 6, 2); luzRelleno.position.set(MX + 1.5, 1.6, 1.8); scene.add(luzRelleno);
const marcaHarina = new THREE.Object3D(); marcaHarina.position.set(MX + 1.3, 0.6, -0.7); scene.add(marcaHarina);
// lluvia: líneas finas que caen (seek-safe)
const N_LL = 900; const lluvia = new THREE.InstancedMesh(new THREE.BoxGeometry(0.008, 0.35, 0.008), new THREE.MeshBasicMaterial({ color: "#BFD4F0", transparent: true, opacity: 0.55 }), N_LL); lluvia.frustumCulled = false; scene.add(lluvia);
const GOTA = Array.from({ length: N_LL }, () => [PX + (rnd() - 0.5) * 16, rnd() * 9, PZ + 3.5 + (rnd() - 0.5) * 7]);

// ---------- personajes ----------
const TIPOS = ["martin", "clienta", "vendedor", "vecina", "obrero", "repartidor"]; const PROTO = {};
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
const martin = persona("martin");
const clientes = [persona("vecina"), persona("obrero"), persona("clienta"), persona("vendedor")];
export const marcaMartin = new THREE.Object3D(); scene.add(marcaMartin);

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
const E = [PX, 1.0, PZ], G = [GR_X, 0.9, GR_Z];
const PLANOS = [
  [T.hook, [PX + 7.0, 3.2, PZ + 10.0], [PX + 5.6, 2.6, PZ + 8.0], [PX + 0.6, 1.0, PZ], [PX + 0.6, 1.0, PZ], 44, 0.55, 0.16, 8],
  [T.martin, [PX + 2.9, 1.65, PZ + 3.6], [PX + 2.5, 1.6, PZ + 3.0], [PX + 1.6, 1.2, PZ + 0.4], [PX + 1.6, 1.2, PZ + 0.4], 40, 0.55, 0.12, 9],
  [T.compras, [PX + 3.4, 2.2, PZ + 5.2], [PX + 2.8, 2.0, PZ + 4.4], [PX, 0.9, PZ], [PX, 0.9, PZ], 44, 0.6, 0.16, 8],
  [T.harina, [PX - 2.0, 1.25, PZ + 1.6], [PX - 1.8, 1.2, PZ + 1.3], [PX - 0.9, 0.25, PZ - 0.72], [PX - 0.9, 0.3, PZ - 0.7], 40, 0.6, 0.12, 9],
  [T.grasa, [PX - 0.9, 1.5, PZ + 2.6], [PX - 0.8, 1.45, PZ + 2.2], [PX - 0.6, 0.8, PZ - 0.15], [PX - 0.55, 0.8, PZ - 0.1], 40, 0.6, 0.12, 9],
  [T.total, [PX + 5.6, 2.6, PZ + 7.8], [PX + 4.6, 2.3, PZ + 6.4], E, E, 44, 0.56, 0.14, 8],
  [T.amasar, [MX + 1.3, 1.6, 1.9], [MX + 0.9, 1.5, 1.4], [MX, 0.95, -0.4], [MX, 0.95, -0.45], 40, 0.55, 0.12, 9],
  [T.kilo, [MX - 0.6, 1.7, 1.3], [MX - 0.4, 1.6, 1.0], [MX + 0.1, 0.85, -0.35], [MX + 0.1, 0.85, -0.35], 38, 0.58, 0.12, 10],
  [T.cuesta, [GR_X + 0.9, 1.5, GR_Z + 2.0], [GR_X + 0.7, 1.45, GR_Z + 1.6], G, G, 38, 0.58, 0.12, 10],
  [T.comun, [PX - 0.6, 1.3, PZ + 3.0], [PX - 0.8, 1.25, PZ + 2.6], [PX - 1.75, 0.85, PZ + 0.35], [PX - 1.75, 0.85, PZ + 0.35], 38, 0.6, 0.12, 10],
  [T.dia1, [PX + 3.6, 2.0, PZ + 5.4], [PX + 2.9, 1.9, PZ + 4.6], [PX, 1.0, PZ + 0.2], [PX, 1.0, PZ + 0.2], 44, 0.6, 0.16, 8],
  [T.gastos, [GR_X + 1.3, 1.45, GR_Z + 1.8], [GR_X + 1.0, 1.4, GR_Z + 1.5], G, G, 40, 0.6, 0.14, 9],
  [T.resta, [PX + 4.4, 2.2, PZ + 5.8], [PX + 3.6, 2.0, PZ + 4.8], E, E, 44, 0.6, 0.16, 8],
  [T.semana, [PX + 9, 7.5, PZ + 11], [PX + 8, 6.6, PZ + 9.6], E, E, 44, 0.6, 0.2, 6],
  [T.llueve, [PX + 3.2, 1.5, PZ + 4.6], [PX + 2.6, 1.45, PZ + 3.8], [PX, 1.2, PZ], [PX, 1.2, PZ], 42, 0.56, 0.14, 8],
  [T.domingo, [PX + 6.5, 3.0, PZ + 8.5], [PX + 6.0, 2.8, PZ + 7.8], E, E, 44, 0.56, 0.14, 8],
  [T.mes, [PX + 9, 7.5, PZ + 11], [PX + 7.6, 6.8, PZ + 9.6], E, E, 44, 0.6, 0.2, 6],
  [T.nadie, [PX + 1.8, 1.65, PZ + 3.4], [PX + 1.5, 1.6, PZ + 2.9], [GR_X, 1.25, PZ - 0.6], [GR_X, 1.25, PZ - 0.6], 40, 0.55, 0.12, 9],
  [T.antes, [MX - 1.2, 1.7, 1.9], [MX - 0.8, 1.6, 1.5], [MX, 0.95, -0.45], [MX, 0.95, -0.45], 40, 0.55, 0.12, 9],
  [T.cuatro, [PX + 5.2, 3.0, PZ + 7.2], [PX + 4.3, 2.6, PZ + 6.0], E, E, 44, 0.58, 0.16, 8],
  [T.decomiso, [PX + 2.8, 1.7, PZ + 4.4], [PX + 3.6, 2.2, PZ + 5.6], E, E, 44, 0.56, 0.14, 9],
  [T.metodo, [PX + 9, 7.5, PZ + 11], [PX + 8.4, 7.0, PZ + 10.2], E, E, 44, 0.6, 0.2, 6],
  [T.mandaselo, [PX + 6.6, 3.0, PZ + 9.2], [PX + 5.4, 2.6, PZ + 7.8], E, E, 44, 0.55, 0.16, 8],
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
const pop = (o, t, a, b = 1e9) => { if (!o) return; if (!o.userData.esc) o.userData.esc = o.scale.clone(); const u = clamp((t - a) / 0.45), v = clamp((b - t) / 0.35); const k = Math.min(u < 1 ? 1 - Math.pow(1 - u, 3) * Math.cos(u * 9) : 1, v); o.visible = k > 0.001; o.scale.copy(o.userData.esc).multiplyScalar(Math.max(0.001, k)); };   // conserva la escala no uniforme (la mesa)
const DETRAS = [PX + 0.25, PZ - 0.7];   // donde atiende Martín: detrás del tambor, a 30 cm de la pared
const INTRO = [PX + 1.6, PZ + 0.4];   // donde se presenta, al costado del puesto
function caminoMartin(t, t0) {   // entra por el costado del gazebo: dos tramos que esquivan el cajón, el carbón y el tambor
  const A = INTRO, B = [PX + 0.85, PZ - 0.55]; const t1 = t0 + 1.5, t2 = t1 + 1.1;
  if (t < t1) mover(martin, t, VEREDA, A, B, t0, t1, null, "parado", 0.3); else mover(martin, t, VEREDA, B, DETRAS, t1, t2, [GR_X, PZ + 2], "embalar", 0.3);
}
export function render(t, oscuro = 0) {
  const k = camAt(t); const cx = k.mira[0], cz = k.mira[2];
  sol.target.position.set(cx, 0, cz); sol.position.set(cx + SOL_DIR.x, SOL_DIR.y, cz + SOL_DIR.z);
  // las compras aparecen cuando la voz las nombra; el decomiso se las lleva
  pop(parrilla, t, T.parrilla + 0.3, T.pierde + 0.3); pop(gazebo, t, T.gazebo, T.pgazebo + 0.2); pop(mesa, t, T.gazebo + 0.5, T.pmerca + 0.2);
  pop(harina, t, T.harina + 0.2, T.pmerca + 0.3); pop(carbon, t, T.carbon, T.pierde + 0.3); pop(chicha, t, T.chicha, T.pmerca + 0.2);
  extras.forEach((o, i) => pop(o, t, T.s30 + 0.3 + i * 0.12, T.pmerca + 0.3)); pop(basura, t, T.basura, T.mes);
  const llueve = t >= T.llueve && t < T.domingo, domingo = t >= T.domingo && t < T.mes;
  const brasas = t >= T.antesVender && !llueve && !domingo && t < T.pierde;
  luzBrasa.intensity = brasas ? 2.4 + Math.sin(t * 7) * 0.4 : 0;
  enParrilla.forEach((m) => (m.visible = brasas)); enCanasta.forEach((m) => (m.visible = brasas && t < T.pmerca));
  HUMO.forEach((h) => { const u = (t * 0.33 + h.f) % 1; h.m.visible = brasas; h.m.position.set(GR_X + h.dx * (0.3 + u), GR_Y + 0.1 + u * 2.0, GR_Z + (u - 0.5) * 0.3); h.m.scale.setScalar(0.22 + u * 0.9); h.m.material.opacity = Math.sin(u * Math.PI) * 0.5; });
  lluvia.visible = llueve; if (llueve) { GOTA.forEach(([x, y, z], i) => { const yy = (((y - t * 9) % 9) + 9) % 9; _m.makeTranslation(x, yy, z); lluvia.setMatrixAt(i, _m); }); lluvia.instanceMatrix.needsUpdate = true; }
  scene.background.set(llueve ? "#0A0C10" : "#000000"); sol.intensity = llueve ? 0.6 : domingo ? 1.6 : 3.0;
  // Martín: se presenta en la vereda, entra al puesto, amasa de madrugada, atiende; el domingo no está
  const enCasa = (t >= T.amasar && t < T.cuesta) || (t >= T.antes && t < T.cuatro);
  martin.o.visible = martin.blob.visible = !domingo;
  if (enCasa) mover(martin, t, 0, [MX, -0.95], [MX, -0.95], 0, 0.01, [MX, 1], "embalar", 0.2);
  else if (t < T.antesVender) mover(martin, t, VEREDA, INTRO, INTRO, 0, 0.01, [PX + 3, PZ + 5], "parado", 0.3);
  else if (t < T.antesVender + 2.8) caminoMartin(t, T.antesVender);
  else if (t >= T.decomiso) mover(martin, t, VEREDA, DETRAS, DETRAS, 0, 0.01, [PX + 2.2, PZ + 2.2], "parado", 0.3);
  else mover(martin, t, VEREDA, DETRAS, DETRAS, 0, 0.01, [GR_X, PZ + 2], llueve ? "parado" : "embalar", 0.3);
  martin.o.updateWorldMatrix(true, true); marcaMartin.position.set(martin.o.position.x, martin.o.position.y + 2.05, martin.o.position.z);
  // clientes: cruzan la calle hasta el frente del puesto (entre los caños del gazebo), esperan y vuelven a cruzar.
  // Cada uno entra y sale por su propia línea, así nadie atraviesa a nadie ni a los árboles.
  clientes.forEach((p, i) => {
    const primerPlano = (t >= T.gastos && t < T.resta) || (t >= T.nadie && t < T.antes);   // planos cerrados de la parrilla: sin clientes delante
    const vis = i < 3 && t >= T.dia1 - 6 && !llueve && !domingo && !enCasa && !primerPlano && t < T.decomiso; p.o.visible = p.blob.visible = vis; if (!vis) return;
    const L = 21, c = ((t + (2 - i) * 7) % L); const sx = [PX - 0.7, PX, PX + 0.7][i], FR = PZ + 0.62, CALLE = 5.2;
    if (c < 5.0) mover(p, c, VEREDA, [sx + 0.4, CALLE], [sx, FR], 0, 5.0, null, "parado", i);
    else if (c < 9.5) mover(p, c, VEREDA, [sx, FR], [sx, FR], 0, 0.01, [GR_X, PZ - 0.5], "parado", i);
    else if (c < 14.5) mover(p, c, VEREDA, [sx, FR], [sx - 0.4, CALLE], 9.5, 14.5, null, "parado", i);
    else { p.o.visible = p.blob.visible = false; }
  });
  renderer.setRenderTarget(rtA); renderer.render(scene, cam);
  blurH.uniforms.tex.value = rtA.texture; blurH.uniforms.dir.value.set(1 / W, 0); blurH.uniforms.foco.value = k.foco; blurH.uniforms.banda.value = k.banda; blurH.uniforms.radio.value = k.radio;
  quad.material = blurH; renderer.setRenderTarget(rtB); renderer.render(qScene, qCam);
  blurV.uniforms.tex.value = rtB.texture; blurV.uniforms.dir.value.set(0, 1 / H); blurV.uniforms.foco.value = k.foco; blurV.uniforms.banda.value = k.banda; blurV.uniforms.radio.value = k.radio; blurV.uniforms.vin.value = 0.45; blurV.uniforms.oscuro.value = oscuro;
  quad.material = blurV; renderer.setRenderTarget(null); renderer.render(qScene, qCam);
  return k;
}
