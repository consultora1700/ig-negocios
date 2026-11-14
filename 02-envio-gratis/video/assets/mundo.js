// Reel 02 «Envío gratis: ¿quién lo paga?» — mundo 3D.
// La cuadra trae la luz horneada en Blender/Cycles (horneado/set.glb + luz/*.hdr). Personajes MPFB animados (personas/*.glb,
// pistas: parado, caminar, entregar, embalar) y objetos chicos (camioneta, cajas, billetes, imán) en tiempo real.
// Ejes Three: X derecha, Y arriba, +Z hacia la cámara. Blender (x, y, z) → Three (x, z, -y).
import * as THREE from "./lib/three.module.min.js";
import { GLTFLoader } from "./lib/GLTFLoader.js";
import { RGBELoader } from "./lib/RGBELoader.js";
import * as SkeletonUtils from "./lib/SkeletonUtils.js";
import { RoundedBoxGeometry } from "./lib/RoundedBoxGeometry.js";

export const W = 1080, H = 1920;
// Tiempos anclados a la voz (voz/voz-palabras.json)
export const T = {
  compra: 1.0, gratis: 2.4, quien: 3.8, creemos: 5.7, regalo: 7.6, alguien: 10.1,
  septiembre: 11.7, quince: 17.0, antes: 18.1, empresa: 20.3,
  pero: 21.9, treinta: 22.6, vendedor: 23.5, mitad: 25.9, paquete: 26.7, siete: 28.5,
  regala: 30.8, facturo: 33.2, gano: 35.7, vendio: 37.3, centavos: 40.1, margen: 42.9,
  porque: 46.1, iman: 49.7, compras: 50.8, vuelve: 52.1, publicidad: 53.3, crecio: 54.7,
  regla: 56.9, repite: 58.9, perdiste: 61.6, mandaselo: 63.0, seguime: 64.9, fin: 70.3,
};
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const eo = (u) => 1 - Math.pow(1 - clamp(u), 3);
const mix = (a, b, u) => a + (b - a) * u;
let seed = 21;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene(); scene.background = new THREE.Color("#000000");
const cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 300);
const std = (c, r = 0.75, m = 0, e) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...(e ? { emissive: e, emissiveIntensity: 1 } : {}) });
function tex(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

// ---------- cuadra horneada ----------
const gl = new GLTFLoader(), hdr = new RGBELoader();
const carga = (u) => new Promise((ok, mal) => gl.load(u, ok, undefined, mal));
const [gSet, luces, indice] = await Promise.all([carga("assets/horneado/set.glb"), fetch("assets/horneado/luces.json").then((r) => r.json()), fetch("assets/horneado/luz/indice.json").then((r) => r.json())]);
const mapas = {};
await Promise.all(Object.keys(indice).map((n) => new Promise((ok) => hdr.load(`assets/horneado/luz/${encodeURIComponent(n)}.hdr`, (t) => {
  t.flipY = false; t.colorSpace = THREE.LinearSRGBColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true; mapas[n.replace(/[.:\/\[\]]/g, "")] = t; ok(); }, undefined, () => ok()))));
const cuadra = gSet.scene; scene.add(cuadra);
cuadra.traverse((o) => { if (!o.isMesh) return; const m = mapas[o.name] || mapas[o.parent?.name]; o.material = new THREE.MeshBasicMaterial({ map: m || null, color: m ? "#FFFFFF" : "#555555" }); o.castShadow = true; });
const sombraPiso = (w, d, y, x = 0, z = 0) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.ShadowMaterial({ opacity: 0.32, color: "#1A1410" })); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); p.receiveShadow = true; scene.add(p); };
sombraPiso(18, 3.5, 0.006, 0, 2.75); sombraPiso(18, 2.3, 0.146, 0, -0.2); sombraPiso(4.2, 4.0, 0.186, -0.6, -3.6);

// ---------- luces en tiempo real (copian el horneado: sol de tarde + cielo) ----------
const b2t = (p) => new THREE.Vector3(p[0], p[2], -p[1]);
scene.add(new THREE.HemisphereLight("#BBD0F0", "#8A7A66", 1.1));
for (const l of luces.luces) {
  const c = new THREE.Color(l.color[0], l.color[1], l.color[2]);
  if (l.tipo === "SUN") {
    const d = new THREE.DirectionalLight(c, 3.2); d.position.copy(b2t(l.pos)).multiplyScalar(1.6); d.target.position.set(0, 0, -1); scene.add(d, d.target);
    d.castShadow = true; d.shadow.mapSize.set(2048, 2048); Object.assign(d.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 }); d.shadow.radius = 8; d.shadow.blurSamples = 16; d.shadow.bias = -0.0005;
  } else { const p = new THREE.PointLight(c, l.energia * 0.04, 6, 2); p.position.copy(b2t(l.pos)); scene.add(p); }
}

// ---------- personajes ----------
const TIPOS = ["repartidor", "clienta", "vendedor", "vecino"];
const PROTO = {}; await Promise.all(TIPOS.map(async (n) => { PROTO[n] = await carga(`assets/personas/${n}.glb`); }));
const blobTex = tex(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); r.addColorStop(0, "rgba(0,0,0,.5)"); r.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); });
function persona(tipo) {
  const g = PROTO[tipo]; const o = SkeletonUtils.clone(g.scene); scene.add(o);
  o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; if ("sheen" in m.material) m.material.sheen = 0; } });
  const mixer = new THREE.AnimationMixer(o); const acc = {};
  g.animations.forEach((c) => { const a = mixer.clipAction(c); a.play(); a.setEffectiveWeight(0); acc[c.name] = a; });
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, toneMapped: false })); blob.rotation.x = -Math.PI / 2; scene.add(blob);
  return { o, mixer, acc, blob };
}
function pose(p, lista) { Object.values(p.acc).forEach((a) => a.setEffectiveWeight(0)); for (const [n, t, w] of lista) { const a = p.acc[n]; if (!a) continue; a.setEffectiveWeight(w); a.time = t % a.getClip().duration; } p.mixer.update(0); }
// camina de a → b (x, z) entre t0 y t1 sobre el piso y; quieto mira hacia "mira"; "accion" es la pista cuando está quieto
const PASO = 1.35;
function mover(p, t, y, a, b, t0, t1, mira, accion = "parado", fase = 0) {
  const u = clamp((t - t0) / Math.max(0.001, t1 - t0)); const x = mix(a[0], b[0], u), z = mix(a[1], b[1], u);
  const anda = t > t0 && t < t1; p.o.position.set(x, y, z);
  p.o.rotation.y = anda || !mira ? Math.atan2(b[0] - a[0], b[1] - a[1]) : Math.atan2(mira[0] - x, mira[1] - z);
  const w = anda ? clamp(Math.min((t - t0) / 0.3, (t1 - t) / 0.3)) : 0; const dist = Math.hypot(b[0] - a[0], b[1] - a[1]) * u;
  pose(p, [["caminar", (dist / PASO) * 1.333 + fase, w], [accion, t + fase, 1 - w]]);
  p.blob.position.set(x, y + 0.004, z);
}
const repartidor = persona("repartidor"), clienta = persona("clienta"), vendedor = persona("vendedor");
const vecinos = [persona("vecino"), persona("clienta"), persona("vecino"), persona("repartidor")];

// ---------- objetos en tiempo real ----------
const carton = std("#C08E5A", 0.85), cintaM = std("#D9C7A0", 0.4);
function caja(s = 0.4) { const g = new THREE.Group(); const b = new THREE.Mesh(new RoundedBoxGeometry(s, s * 0.7, s * 0.8, 3, 0.015), carton); b.castShadow = b.receiveShadow = true; g.add(b);
  const c = new THREE.Mesh(new THREE.BoxGeometry(s + 0.004, s * 0.7 + 0.004, 0.06), cintaM); g.add(c); return g; }
export const cajaCompra = caja(0.42); scene.add(cajaCompra);
// camioneta de reparto genérica (sin marcas)
function camioneta() {
  const g = new THREE.Group(); const blanco = std("#EDEDEA", 0.45, 0.1), vidrio = std("#2B3440", 0.15, 0.4), goma = std("#1C1C1E", 0.8);
  const caja_ = new THREE.Mesh(new RoundedBoxGeometry(2.6, 1.7, 1.6, 4, 0.12), blanco); caja_.position.set(-0.35, 1.25, 0); g.add(caja_);
  const cab = new THREE.Mesh(new RoundedBoxGeometry(1.2, 1.25, 1.6, 4, 0.18), blanco); cab.position.set(1.45, 1.02, 0); g.add(cab);
  const par = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.6, 1.4, 2, 0.04), vidrio); par.position.set(2.04, 1.32, 0); g.add(par);
  [-1, 1].forEach((s) => { const v = new THREE.Mesh(new RoundedBoxGeometry(0.75, 0.5, 0.05, 2, 0.03), vidrio); v.position.set(1.55, 1.35, s * 0.8); g.add(v); });
  const franja = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.22, 1.62), std("#3E5C8A", 0.5)); franja.position.set(-0.35, 0.72, 0); g.add(franja);
  g.ruedas = [];
  [[-1.1, -0.72], [-1.1, 0.72], [1.3, -0.72], [1.3, 0.72]].forEach(([x, z]) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 24), goma); r.rotation.x = Math.PI / 2; r.position.set(x, 0.34, z); g.add(r); g.ruedas.push(r); });
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return g;
}
const van = camioneta(); scene.add(van);
// billete para partir al medio en el garage
const billeteTex = tex(512, 220, (g, w, h) => { g.fillStyle = "#7E9F7C"; g.fillRect(0, 0, w, h); g.strokeStyle = "#5C7D5A"; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28);
  g.fillStyle = "#4A6A48"; g.font = "900 96px Montserrat"; g.textAlign = "center"; g.fillText("$", w / 2, h / 2 + 34); g.beginPath(); g.arc(100, h / 2, 46, 0, 7); g.stroke(); g.beginPath(); g.arc(w - 100, h / 2, 46, 0, 7); g.stroke(); });
const mitadI = new THREE.Group(), mitadD = new THREE.Group(); scene.add(mitadI, mitadD);
[[mitadI, 0], [mitadD, 0.5]].forEach(([g, off]) => { const t = billeteTex.clone(); t.repeat.set(0.5, 1); t.offset.set(off, 0); t.needsUpdate = true;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.22), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7, side: THREE.DoubleSide })); m.position.x = off ? 0.13 : -0.13; m.castShadow = true; g.add(m); });

// ---------- escenario de los números (aparte, sobre mesa negra) ----------
const NX = 60;
const mesa = new THREE.Mesh(new RoundedBoxGeometry(10, 0.3, 8, 4, 0.1), std("#121418", 0.6)); mesa.position.set(NX, -0.15, 0); mesa.receiveShadow = true; scene.add(mesa);
const luzN = new THREE.SpotLight("#FFF1DE", 120, 30, 0.7, 0.6, 1.6); luzN.position.set(NX - 3, 9, 6); luzN.target.position.set(NX, 0, 0); luzN.castShadow = true; luzN.shadow.mapSize.set(1024, 1024); luzN.shadow.radius = 6; scene.add(luzN, luzN.target);
const azulN = new THREE.PointLight("#009DFF", 0, 10, 2); azulN.position.set(NX + 1.6, 1.5, 1.5); scene.add(azulN);
const fajoGeo = new RoundedBoxGeometry(0.62, 0.028, 0.28, 2, 0.008);
const fajoMat = new THREE.MeshStandardMaterial({ color: "#7E9F7C", roughness: 0.75 }), fajoMat2 = new THREE.MeshStandardMaterial({ color: "#B4C8B0", roughness: 0.75 });
// pila alta: facturación (US$ 10.750 M) · pila baja: ganancia (US$ 448 M) → 4,2 %
const N_ALTA = 96, N_BAJA = 4;
export const pilaAlta = new THREE.InstancedMesh(fajoGeo, fajoMat, N_ALTA), pilaBaja = new THREE.InstancedMesh(fajoGeo, fajoMat2, N_BAJA);
pilaAlta.castShadow = pilaBaja.castShadow = true; pilaAlta.frustumCulled = pilaBaja.frustumCulled = false; scene.add(pilaAlta, pilaBaja);
export const marcaAlta = new THREE.Object3D(), marcaBaja = new THREE.Object3D(); scene.add(marcaAlta, marcaBaja);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(1, 1, 1);
function pila(im, n, x, z, visibles, salto) {
  for (let i = 0; i < n; i++) {
    const vis = i < visibles; const y = 0.015 + i * 0.03 + (vis ? 0 : 40); _e.set(0, (((i * 7919) % 13) - 6) * 0.012, 0); _q.setFromEuler(_e);
    _m.compose(new THREE.Vector3(NX + x + (((i * 31) % 7) - 3) * 0.006, y + (i === visibles - 1 ? salto : 0), z), _q, _s); im.setMatrixAt(i, _m);
  }
  im.instanceMatrix.needsUpdate = true;
}
// muro de cajas: 867 M de productos (cada caja chica representa muchos)
const cajaChica = new RoundedBoxGeometry(0.18, 0.13, 0.15, 2, 0.01);
const N_CAJAS = 30 * 18;
export const muro = new THREE.InstancedMesh(cajaChica, carton, N_CAJAS); muro.castShadow = true; muro.receiveShadow = true; muro.frustumCulled = false; scene.add(muro);
export const cajaSola = caja(0.6); scene.add(cajaSola);
const moneda = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 48), std("#D9DDE3", 0.35, 0.25, "#3A3E46")); moneda.castShadow = true; scene.add(moneda);
export const marcaMoneda = new THREE.Object3D(); scene.add(marcaMoneda);
// imán (mundo real: rojo y plata) que atrae a la gente de vuelta
function iman() { const g = new THREE.Group(); const rojo = std("#C8202E", 0.4, 0.1), plata = std("#D9DCE1", 0.25, 0.9);
  const arco = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.32, 24, 48, Math.PI), rojo); g.add(arco);
  [-0.9, 0.9].forEach((x) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.9, 32), rojo); b.position.set(x, -0.45, 0); g.add(b);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.35, 32), plata); p.position.set(x, -1.07, 0); g.add(p); });
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; }); return g; }
const elIman = iman(); scene.add(elIman);
export const marcaIman = new THREE.Object3D(); elIman.add(marcaIman); marcaIman.position.set(0, -1.6, 0);
export const marcaDeposito = new THREE.Object3D(); marcaDeposito.position.set(5.6, 4.9, -1.3); scene.add(marcaDeposito);
export const marcaGarage = new THREE.Object3D(); marcaGarage.position.set(-0.6, 3.0, -1.6); scene.add(marcaGarage);
export const marcaMesa = new THREE.Object3D(); marcaMesa.position.set(-1.2, 1.25, -3.0); scene.add(marcaMesa);

// ---------- efecto miniatura (tilt-shift) + curva de contraste ----------
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
      gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * gl_FragColor.rgb * (3.0 - 2.0 * gl_FragColor.rgb), 0.4);
      float lum = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722)); gl_FragColor.rgb = mix(vec3(lum), gl_FragColor.rgb, 1.12);
      #include <colorspace_fragment>` : "gl_FragColor = col;"} }`,
  toneMapped: final, depthTest: false, depthWrite: false });
const blurH = blurMat(false), blurV = blurMat(true);

// ---------- cámara por plano (pos, mira, fov, foco del tilt-shift) ----------
const PLANOS = [
  // [desde, pos0, pos1, mira0, mira1, fov, foco, banda, radio]
  [0, [-6.7, 1.4, 2.2], [-6.2, 1.35, 1.55], [-4.9, 1.55, -0.8], [-4.9, 1.5, -0.85], 48, 0.55, 0.12, 9],
  [T.creemos, [-1.0, 7.5, 14.5], [0.2, 6.8, 12.8], [-1.0, 1.0, -1.0], [-0.4, 1.0, -1.2], 48, 0.52, 0.16, 7],
  [T.septiembre, [3.6, 9.2, 9.8], [4.6, 8.4, 8.6], [5.6, 2.2, -1.4], [4.6, 1.6, 0.2], 46, 0.55, 0.16, 7],
  [T.pero, [0.6, 2.1, 1.6], [-0.2, 1.9, 0.6], [-0.9, 1.1, -3.0], [-1.0, 1.0, -3.1], 44, 0.52, 0.1, 10],
  [T.regala, [NX - 0.6, 2.8, 8.8], [NX - 0.2, 2.4, 7.6], [NX, 1.55, 0], [NX, 1.45, 0], 44, 0.5, 0.2, 6],
  [T.vendio, [NX + 0.4, 2.3, 7.4], [NX + 0.4, 1.7, 6.2], [NX + 0.4, 1.3, -1.0], [NX + 0.4, 0.45, 0.6], 44, 0.5, 0.2, 6],
  [T.porque, [2.0, 8.5, 15.0], [0.8, 7.6, 13.2], [0.5, 2.0, -1.0], [0.0, 1.8, -1.0], 48, 0.5, 0.16, 7],
  [T.regla, [0.0, 8.0, 14.0], [-0.4, 7.6, 13.4], [0.0, 1.8, -1.0], [-0.2, 1.8, -1.0], 48, 0.5, 0.2, 7],
  [T.mandaselo, [-3.2, 2.2, 4.0], [-3.8, 1.9, 3.0], [-4.9, 1.1, -0.6], [-4.9, 1.0, -0.7], 44, 0.5, 0.12, 9],
];
function camara(t) {
  let i = 0; while (i + 1 < PLANOS.length && t >= PLANOS[i + 1][0]) i++;
  const [t0, p0, p1, m0, m1, fov, foco, banda, radio] = PLANOS[i]; const t1 = i + 1 < PLANOS.length ? PLANOS[i + 1][0] : T.fin;
  const u = ease(clamp((t - t0) / (t1 - t0)));
  return { pos: p0.map((v, k) => mix(v, p1[k], u)), mira: m0.map((v, k) => mix(v, m1[k], u)), fov, foco, banda, radio, plano: i };
}
export function camAt(t) { const k = camara(t); cam.position.set(...k.pos); cam.fov = k.fov; cam.aspect = W / H; cam.updateProjectionMatrix(); cam.lookAt(...k.mira); return k; }
const _v = new THREE.Vector3();
export function aPantalla(obj, local = [0, 0, 0]) { obj.updateWorldMatrix(true, false); _v.set(...local); obj.localToWorld(_v); _v.project(cam); return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H, vis: _v.z < 1 && _v.z > -1 }; }

// ---------- estado del mundo en el tiempo t ----------
const VEREDA = 0.14, GARAGE = 0.18;
export function render(t, oscuro = 0) {
  // puerta de la casa: el repartidor entrega la caja, la clienta la recibe y después él vuelve a la camioneta
  if (t < T.creemos + 1.2) mover(repartidor, t, VEREDA, [-4.9, -0.45], [-4.9, -0.45], 0, 0.01, [-4.9, -1.5], "entregar", 0.2);
  else mover(repartidor, t, VEREDA, [-4.9, -0.45], [-3.0, 1.0], T.creemos + 1.2, T.creemos + 4.0, [-2, 2], "parado", 0.2);
  mover(clienta, t, 0.26, [-4.9, -1.12], [-4.9, -1.12], 0, 0.01, [-4.9, 0], "parado", 1.1);
  const entrega = clamp((t - (T.creemos + 0.6)) / 0.6);   // la caja pasa de las manos del repartidor a las de la clienta
  cajaCompra.position.set(-4.9, mix(1.22, 1.18, entrega) + VEREDA - 0.14, mix(-0.85, -0.82, entrega)); cajaCompra.rotation.y = 0;
  cajaCompra.visible = t < T.septiembre + 6;
  // camioneta: estacionada frente a la casa; sale del depósito hacia la casa en el plano de la empresa
  const uv = clamp((t - (T.septiembre + 1.0)) / 9.0);
  const vx = t < T.septiembre ? -2.2 : t < T.pero ? mix(6.5, -2.2, ease(uv)) : -2.2;
  van.position.set(vx, 0, 2.2); van.rotation.y = t >= T.septiembre && t < T.pero ? Math.PI : 0;
  van.ruedas.forEach((r) => (r.rotation.y = 0)); van.ruedas.forEach((r) => (r.rotation.z = -vx / 0.34));
  // vendedor en el garage, embalando
  mover(vendedor, t, GARAGE, [-1.2, -3.55], [-1.2, -3.55], 0, 0.01, [-1.2, 0], "embalar", 0.5);
  const parte = clamp((t - T.mitad) / 0.5);
  mitadI.position.set(-1.2 - 0.02 - parte * 0.18, 0.99 + 0.01 + parte * 0.06, -2.75); mitadD.position.set(-1.2 + 0.02 + parte * 0.18, 0.99 + 0.01 + parte * 0.06, -2.75);
  mitadI.rotation.set(-Math.PI / 2 + parte * 0.3, 0, -parte * 0.25); mitadD.rotation.set(-Math.PI / 2 + parte * 0.3, 0, parte * 0.25);
  // vecinos caminando por la vereda (vida) y, desde el imán, volviendo hacia la casa y el garage
  const atrae = clamp((t - T.vuelve) / 4.0);
  const rutas = [[[8, 0.6], [-8, 0.6], 0.0, 30, 0.4], [[-8.5, 0.2], [8.5, 0.2], 3.0, 34, 1.3], [[7.5, -0.2], [-1.0, -0.2], 18, 30, 0.8], [[-8, 0.8], [6, 0.8], 40, 56, 2.1]];
  vecinos.forEach((p, i) => { const [a, b, t0, t1, f] = rutas[i];
    if (t >= T.porque && i < 2) mover(p, t, VEREDA, [i ? 8 : -8, 0.4], [i ? -0.5 : -4.2, -0.4], T.vuelve - 1.0, T.vuelve + 3.2, [i ? -0.6 : -4.9, -2], "parado", f);
    else mover(p, t, VEREDA, a, b, t0, t1, null, "parado", f); });
  // imán sobre la cuadra
  const ui = clamp((t - T.iman) / 0.8);
  elIman.position.set(-0.6, mix(14, 4.3, eo(ui)) + Math.sin(t * 2) * 0.06, 0.2); elIman.visible = t > T.iman - 0.1 && t < T.regla; elIman.scale.setScalar(1.2);
  // números: pilas, muro de cajas, una caja con su moneda
  const ua = clamp((t - T.facturo) / 1.6), ub = clamp((t - T.gano) / 0.5);
  pila(pilaAlta, N_ALTA, -0.9, 0, t < T.facturo ? 0 : Math.max(1, Math.round(N_ALTA * eo(ua))), 0);
  pila(pilaBaja, N_BAJA, 0.9, 0, t < T.gano ? 0 : Math.max(1, Math.round(N_BAJA * eo(ub))), 0);
  marcaAlta.position.set(NX - 0.9, 0.015 + N_ALTA * 0.03 * eo(ua) + 0.1, 0); marcaBaja.position.set(NX + 0.9, 0.015 + N_BAJA * 0.03 + 0.1, 0);
  const um = clamp((t - T.vendio) / 1.4);
  for (let i = 0; i < N_CAJAS; i++) { const c = i % 30, f = Math.floor(i / 30); const d = (c + f) / 48; const u2 = clamp((um - d * 0.6) / 0.4);
    _m.compose(new THREE.Vector3(NX - 2.9 + c * 0.2 + 0.4, 0.07 + f * 0.135 + (1 - eo(u2)) * 3 + (u2 > 0 ? 0 : 50), -1.6), _q.identity(), _s); muro.setMatrixAt(i, _m); }
  muro.instanceMatrix.needsUpdate = true; muro.visible = t >= T.vendio;
  const uc = clamp((t - T.centavos) / 0.5);
  cajaSola.position.set(NX + 0.4, 0.21 + (1 - eo(uc)) * 2, 1.6); cajaSola.visible = t >= T.centavos;
  moneda.position.set(NX + 0.4, 0.49 + (1 - eo(clamp((t - T.centavos - 0.35) / 0.4))) * 2.5, 1.6); moneda.rotation.set(0, t * 2.2, 0); moneda.visible = t >= T.centavos + 0.3;
  marcaMoneda.position.set(NX + 0.4, 0.9, 1.6);
  pilaAlta.visible = pilaBaja.visible = t < T.vendio;
  azulN.intensity = t > T.gano ? 0 : 0;

  const k = camAt(t);
  renderer.setRenderTarget(rtA); renderer.render(scene, cam);
  blurH.uniforms.tex.value = rtA.texture; blurH.uniforms.dir.value.set(1 / W, 0); blurH.uniforms.foco.value = k.foco; blurH.uniforms.banda.value = k.banda; blurH.uniforms.radio.value = k.radio;
  quad.material = blurH; renderer.setRenderTarget(rtB); renderer.render(qScene, qCam);
  Object.assign(blurV.uniforms, {}); blurV.uniforms.tex.value = rtB.texture; blurV.uniforms.dir.value.set(0, 1 / H); blurV.uniforms.foco.value = k.foco; blurV.uniforms.banda.value = k.banda; blurV.uniforms.radio.value = k.radio; blurV.uniforms.vin.value = 0.45; blurV.uniforms.oscuro.value = oscuro;
  quad.material = blurV; renderer.setRenderTarget(null); renderer.render(qScene, qCam);
  return k;
}
