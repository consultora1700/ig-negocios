// Prueba 3D de 10 s: el hall de un cine en maqueta.
// El escenario trae la luz horneada en Blender/Cycles (horneado/set.glb + horneado/luz/*.hdr): se ve como un render de trazado de rayos.
// Los personajes (horneado/personas.glb, hechos en tools/blender/personaje.py) y los objetos chicos se iluminan en tiempo real
// con luces que copian las del horneado (horneado/luces.json). La capa de marca vive en el HUD de index.html.
import * as THREE from "./lib/three.module.min.js";
import { GLTFLoader } from "./lib/GLTFLoader.js";
import { RGBELoader } from "./lib/RGBELoader.js";
import { RoundedBoxGeometry } from "./lib/RoundedBoxGeometry.js";

export const W = 1080, H = 1920;
// Tiempos anclados a la voz (voz/voz-palabras.json)
export const T = { entrada: 1.28, plano2: 3.3, combo: 4.42, plano3: 5.3, cada: 5.56, cuesta: 6.9, quedan: 7.94, fin: 10 };

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const eo = (u) => 1 - Math.pow(1 - clamp(u), 3);
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#000000");
const cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 200);

const std = (c, r = 0.75, m = 0, e) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...(e ? { emissive: e, emissiveIntensity: 1 } : {}) });
function tex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const rayas = tex(256, 256, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#F4EFE6" : "#C8202E"; g.fillRect((i * w) / 8, 0, w / 8 + 1, h); } });
rayas.wrapS = THREE.RepeatWrapping; rayas.repeat.set(2, 1);

// ---------- escenario horneado ----------
const gl = new GLTFLoader(), hdr = new RGBELoader();
const carga = (u) => new Promise((ok, mal) => gl.load(u, ok, undefined, mal));
const [gSet, gPer, luces, indice] = await Promise.all([carga("assets/horneado/set.glb"), carga("assets/horneado/personas.glb"),
  fetch("assets/horneado/luces.json").then((r) => r.json()), fetch("assets/horneado/luz/indice.json").then((r) => r.json())]);
const mapas = {};
await Promise.all(Object.keys(indice).map((n) => new Promise((ok) => hdr.load(`assets/horneado/luz/${encodeURIComponent(n)}.hdr`, (t) => { t.flipY = false; t.colorSpace = THREE.LinearSRGBColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true; mapas[n] = t; ok(); }, undefined, () => ok()))));
const mundo = gSet.scene; scene.add(mundo);
mundo.traverse((o) => {
  if (!o.isMesh) return;
  const m = mapas[o.name] || mapas[o.parent?.name];
  o.material = new THREE.MeshBasicMaterial({ map: m || null, color: m ? "#FFFFFF" : "#333333" });
  o.receiveShadow = false; o.castShadow = true;
});

// sombra de la gente sobre el escenario horneado: un piso transparente que solo recibe sombra
const piso = new THREE.Mesh(new THREE.PlaneGeometry(12, 9), new THREE.ShadowMaterial({ opacity: 0.38, color: "#1A0A0E" }));
piso.rotation.x = -Math.PI / 2; piso.position.y = 0.006; piso.receiveShadow = true; scene.add(piso);

// ---------- luces en tiempo real (copian las del horneado) ----------
const b2t = (p) => new THREE.Vector3(p[0], p[2], -p[1]);   // Blender → Three
const col = (c) => new THREE.Color(c[0], c[1], c[2]);
scene.add(new THREE.HemisphereLight("#8796C8", "#4A2028", 0.38));
for (const l of luces.luces) {
  const pos = b2t(l.pos);
  if (l.nombre === "principal") {
    const d = new THREE.DirectionalLight(col(l.color), 3.4); d.position.copy(pos); d.target.position.set(0, 0, -1.5); scene.add(d, d.target);
    d.castShadow = true; d.shadow.mapSize.set(2048, 2048); Object.assign(d.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
    d.shadow.radius = 10; d.shadow.blurSamples = 16; d.shadow.bias = -0.0005;
  } else if (l.tipo === "AREA") {
    const d = new THREE.DirectionalLight(col(l.color), l.nombre === "relleno" ? 0.55 : l.nombre === "contra" ? 1.8 : 0.2); d.position.copy(pos); d.target.position.set(0, 1, -2); scene.add(d, d.target);
  } else if (l.tipo === "SPOT") {
    const s = new THREE.SpotLight(col(l.color), l.energia * 0.06, 7, 0.85, 0.7, 2); s.position.copy(pos); s.target.position.copy(pos).add(new THREE.Vector3(0, -3, 0)); scene.add(s, s.target);
  } else {
    const p = new THREE.PointLight(col(l.color), l.energia * 0.05, 4, 2); p.position.copy(pos); scene.add(p);
  }
}

// ---------- objetos chicos en tiempo real ----------
const candy = new THREE.Group(); candy.position.set(1.6, 0, -3.0); scene.add(candy);
function geoPochoclo(n) {
  const pos = [], nor = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.IcosahedronGeometry(1, 2), p = s.attributes.position; const r = 0.45 + rnd() * 0.35;
    const off = [(rnd() - 0.5) * 0.9, (rnd() - 0.5) * 0.7, (rnd() - 0.5) * 0.9];
    for (let k = 0; k < p.count; k++) {
      const v = new THREE.Vector3(p.getX(k), p.getY(k), p.getZ(k)).normalize(); const f = (0.9 + 0.12 * Math.sin(v.x * 7 + i) * Math.cos(v.y * 6 + v.z * 5)) * r;
      pos.push(v.x * f + off[0], v.y * f + off[1], v.z * f + off[2]); nor.push(v.x, v.y, v.z);
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); return g;
}
const POCH = [geoPochoclo(5), geoPochoclo(6), geoPochoclo(4), geoPochoclo(7)];
const matPoch = new THREE.MeshStandardMaterial({ color: "#F6E7C1", roughness: 0.85, emissive: "#3A2A10", emissiveIntensity: 0.2 });
// máquina: vidrio + montaña de pochoclo + pochoclos que saltan (la base y el techo vienen horneados)
const maquina = new THREE.Group(); maquina.position.set(-1.6, 1.0, -1.15); candy.add(maquina);
const vidrio = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.95, 0.62), new THREE.MeshPhysicalMaterial({ color: "#FFF6E8", roughness: 0.05, transparent: true, opacity: 0.16 }));
vidrio.position.y = 0.6; maquina.add(vidrio);
[[-0.5, -0.32], [0.5, -0.32], [-0.5, 0.32], [0.5, 0.32]].forEach(([x, z]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.95), std("#D8D8D8", 0.3, 0.9)); p.position.set(x, 0.6, z); maquina.add(p); });
const monte = new THREE.InstancedMesh(POCH[0], matPoch, 260); monte.castShadow = true;
{ const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < 260; i++) {
    const x = (rnd() - 0.5) * 0.9, z = (rnd() - 0.5) * 0.5, h = 0.42 - (Math.abs(x) * 0.35 + Math.abs(z) * 0.3);
    e.set(rnd() * 6, rnd() * 6, rnd() * 6); q.setFromEuler(e); m.compose(new THREE.Vector3(x, 0.16 + rnd() * Math.max(0.05, h), z), q, new THREE.Vector3(0.045, 0.045, 0.045)); monte.setMatrixAt(i, m);
  } }
maquina.add(monte);
const luzMaq = new THREE.PointLight("#FFC27A", 2.2, 1.6, 2); luzMaq.position.y = 0.95; maquina.add(luzMaq);
const saltan = Array.from({ length: 14 }, (_, i) => { const m = new THREE.Mesh(POCH[i % 4], matPoch); m.scale.setScalar(0.045); maquina.add(m); return { m, f: 0.7 + rnd() * 0.9, p: rnd() * 10, x: (rnd() - 0.5) * 0.7, z: (rnd() - 0.5) * 0.4 }; });
function balde(esc = 1) {
  const g = new THREE.Group();
  const perfil = [new THREE.Vector2(0.0, 0), new THREE.Vector2(0.15, 0), new THREE.Vector2(0.21, 0.42), new THREE.Vector2(0.215, 0.43)];
  const cuerpo = new THREE.Mesh(new THREE.LatheGeometry(perfil, 40), new THREE.MeshStandardMaterial({ map: rayas, roughness: 0.55, side: THREE.DoubleSide }));
  cuerpo.castShadow = true; g.add(cuerpo);
  for (let i = 0; i < 26; i++) { const p = new THREE.Mesh(POCH[i % 4], matPoch); const a = rnd() * 6.28, r = rnd() * 0.17; p.position.set(Math.cos(a) * r, 0.43 + (0.17 - r) * 0.5 + rnd() * 0.05, Math.sin(a) * r); p.scale.setScalar(0.042); p.rotation.set(rnd() * 6, rnd() * 6, 0); p.castShadow = true; g.add(p); }
  g.scale.setScalar(esc); return g;
}
function vaso(esc = 1) {
  const g = new THREE.Group();
  const v = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.085, 0.36, 28), new THREE.MeshStandardMaterial({ map: rayas, roughness: 0.5 })); v.position.y = 0.18; v.castShadow = true; g.add(v);
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.03, 28), std("#F2F2F2", 0.4)); t.position.y = 0.37; g.add(t);
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3), std("#1E5BD6", 0.4)); s.position.set(0.03, 0.5, 0); s.rotation.z = -0.15; g.add(s);
  g.scale.setScalar(esc); return g;
}
export const comboBalde = balde(1.25); comboBalde.position.set(0.55, 1.13, 0.12); candy.add(comboBalde);
const comboVaso = vaso(1.15); comboVaso.position.set(1.05, 1.13, 0.16); candy.add(comboVaso);
[[-2.25, 0.05], [2.2, 0.1]].forEach(([x, z]) => { const b = balde(0.9); b.position.set(x, 1.13, z); candy.add(b); });
for (let i = 0; i < 5; i++) { const v = vaso(0.9); v.position.set(0.6 + i * 0.28, 1.0, -1.15); candy.add(v); }
export const ticket = new THREE.Object3D(); ticket.position.set(-3.9, 2.55, -2.7); scene.add(ticket);

// ---------- personajes (Blender → glTF, huesos como nodos) ----------
const PROTO = {};
// Three.js quita los puntos de los nombres: "cajera.raiz" llega como "cajeraraiz"
const TIPOS = ["cajera", "campera", "rulos", "canoso", "verde", "azul"];
gPer.scene.traverse((o) => { for (const v of TIPOS) if (o.name === v + "raiz") PROTO[v] = o; });
gPer.scene.traverse((o) => {
  if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
  const m = o.material; if ("sheen" in m) m.sheen = 0; m.envMapIntensity = 0.6;   // el brillo de tela del glTF lava los colores
});
const sombraTex = tex(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); r.addColorStop(0, "rgba(0,0,0,.55)"); r.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); });
function persona(tipo) {
  const o = PROTO[tipo].clone(true); o.position.set(0, 0, 0); scene.add(o);
  const H = {}; o.traverse((n) => { if (!n.isMesh && n !== o && n.name.startsWith(tipo)) H[n.name.slice(tipo.length).replace(/_\d+$/, "")] = n; });
  H.raiz = o; Object.values(H).forEach((n) => { n.userData.p0 = n.position.clone(); });
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75), new THREE.MeshBasicMaterial({ map: sombraTex, transparent: true, depthWrite: false, toneMapped: false }));
  blob.rotation.x = -Math.PI / 2; scene.add(blob);
  return { o, H, blob };
}
// rotación en ejes de Blender (x, y, z) → Three; orden equivalente al XYZ de Blender
function rot(p, h, x = 0, y = 0, z = 0) { const n = p.H[h]; if (n) n.rotation.set(x, z, -y, "YZX"); }
function caminar(p, fase, amp = 1) {
  const s = Math.sin(fase * 2 * Math.PI), a = s * 0.42 * amp;
  rot(p, "caderaI", a); rot(p, "caderaD", -a);
  rot(p, "rodillaI", Math.max(0, -Math.sin(fase * 2 * Math.PI + 1.2)) * 0.7 * amp); rot(p, "rodillaD", Math.max(0, Math.sin(fase * 2 * Math.PI + 1.2)) * 0.7 * amp);
  rot(p, "hombroI", -a * 0.8, 0, 0.08); rot(p, "hombroD", a * 0.8, 0, -0.08); rot(p, "codoI", -0.25); rot(p, "codoD", -0.25);
  p.H.pelvis.position.y = p.H.pelvis.userData.p0.y + Math.abs(Math.cos(fase * 2 * Math.PI)) * 0.025 * amp;
  rot(p, "pecho", 0, 0, a * 0.12);
}
function parado(p, t) {
  rot(p, "caderaI"); rot(p, "caderaD"); rot(p, "rodillaI", 0.04); rot(p, "rodillaD", 0.02);
  rot(p, "hombroI", Math.sin(t * 0.9) * 0.03, 0, 0.06); rot(p, "hombroD", Math.sin(t * 0.9 + 1) * 0.03, 0, -0.06); rot(p, "codoI", -0.14); rot(p, "codoD", -0.14);
  rot(p, "pecho", Math.sin(t * 1.3) * 0.015, 0, Math.sin(t * 0.7) * 0.02); rot(p, "cuello", 0, 0, Math.sin(t * 0.5) * 0.08);
  p.H.pelvis.position.y = p.H.pelvis.userData.p0.y + Math.sin(t * 1.3) * 0.004;
}
const PASO = 1.3; // metros por ciclo de caminata
function mover(p, t, a, b, t0, t1, mira, fase = 0) {
  const u = clamp((t - t0) / (t1 - t0)); const x = a[0] + (b[0] - a[0]) * u, z = a[1] + (b[1] - a[1]) * u;
  const anda = t > t0 && t < t1; p.o.position.set(x, 0, z);
  p.o.rotation.y = anda || !mira ? Math.atan2(b[0] - a[0], b[1] - a[1]) : Math.atan2(mira[0] - x, mira[1] - z);
  const dist = Math.hypot(b[0] - a[0], b[1] - a[1]) * u; const w = anda ? clamp(Math.min((t - t0) / 0.25, (t1 - t) / 0.25)) : 0;
  if (w > 0.5) caminar(p, dist / PASO + fase, w); else parado(p, t + fase * 3);
  p.blob.position.set(x, 0.008, z);
}
const cajera = persona("cajera");
const fila = [persona("campera"), persona("rulos"), persona("verde"), persona("azul")];
const entra = persona("canoso"), sala = persona("rulos"), bol = persona("verde");
export const P = { cajera, fila, entra, sala, bol };

// ---------- cuadrícula de 100 pochoclos (plano 3) ----------
const grilla = new THREE.Group(); grilla.position.set(40, 0, 0); scene.add(grilla);
const mesa = new THREE.Mesh(new RoundedBoxGeometry(7.4, 0.3, 7.4, 4, 0.1), std("#121418", 0.6)); mesa.position.y = -0.15; mesa.receiveShadow = true; grilla.add(mesa);
const baldosaGeo = new RoundedBoxGeometry(0.56, 0.04, 0.56, 2, 0.02);
export const granos = [];
for (let i = 0; i < 100; i++) {
  const fi = Math.floor(i / 10), co = i % 10; const x = (co - 4.5) * 0.66, z = (fi - 4.5) * 0.66;
  const bal = new THREE.Mesh(baldosaGeo, new THREE.MeshStandardMaterial({ color: "#1A1D22", roughness: 0.5, emissive: "#000000" })); bal.position.set(x, 0.02, z); bal.receiveShadow = true; grilla.add(bal);
  const m = new THREE.Mesh(POCH[i % 4], matPoch.clone()); m.scale.setScalar(0.17); m.castShadow = true; grilla.add(m);
  granos.push({ m, bal, x, z, d: 0.012 * i + rnd() * 0.12, rx: rnd() * 6, ry: rnd() * 6, gris: fi < 2 });
}
const luzGrilla = new THREE.PointLight("#FFE2B8", 40, 14, 2); luzGrilla.position.set(40 - 2, 4.5, 3); luzGrilla.castShadow = true; luzGrilla.shadow.mapSize.set(1024, 1024); luzGrilla.shadow.radius = 6; scene.add(luzGrilla);
const azulBajo = new THREE.PointLight("#009DFF", 0, 8, 2); azulBajo.position.set(40, 0.8, 0.6); scene.add(azulBajo);

// ---------- efecto miniatura (tilt-shift) + viñeta ----------
const rtA = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const rtB = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); const qScene = new THREE.Scene(); qScene.add(quad); const qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const blurMat = (final) => new THREE.ShaderMaterial({
  uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() }, foco: { value: 0.5 }, banda: { value: 0.12 }, radio: { value: 9 }, vin: { value: 0.0 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
  fragmentShader: `uniform sampler2D tex; uniform vec2 dir; uniform float foco, banda, radio, vin; varying vec2 vUv;
    void main(){
      float d = abs(vUv.y - foco); float k = smoothstep(banda, banda + 0.28, d) * radio;
      vec4 acc = vec4(0.0); float wsum = 0.0;
      for (int i = -6; i <= 6; i++) { float fi = float(i); float w = exp(-fi*fi/18.0); acc += texture2D(tex, vUv + dir * fi * k / 6.0) * w; wsum += w; }
      vec4 col = acc / wsum;
      ${final ? "vec2 q = vUv - 0.5; col.rgb *= 1.0 - vin * dot(q, q) * 1.6; gl_FragColor = col;\n#include <tonemapping_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * gl_FragColor.rgb * (3.0 - 2.0 * gl_FragColor.rgb), 0.45);\nfloat lum = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722)); gl_FragColor.rgb = mix(vec3(lum), gl_FragColor.rgb, 1.18);\n#include <colorspace_fragment>" : "gl_FragColor = col;"}
    }`,
  toneMapped: final, depthTest: false, depthWrite: false,
});
const blurH = blurMat(false), blurV = blurMat(true);

// ---------- cámara por plano ----------
function camara(t) {
  if (t < T.plano2) {
    const u = ease(clamp(t / T.plano2)); const a = 0.3 - 0.12 * u, r = 9.6 - 1.0 * u;
    return { pos: [0.2 + Math.sin(a) * r, 5.6 - 0.5 * u, -1.6 + Math.cos(a) * r], mira: [-0.4, 0.9, -2.2], fov: 56, foco: 0.56, banda: 0.14, radio: 8 };
  }
  if (t < T.plano3) {
    const u = ease(clamp((t - T.plano2) / (T.plano3 - T.plano2)));
    return { pos: [3.9 - 0.7 * u, 2.6 - 0.15 * u, 2.4 - 0.6 * u], mira: [2.0, 1.45, -3.0], fov: 46, foco: 0.5, banda: 0.09, radio: 11 };
  }
  const u = ease(clamp((t - T.plano3) / (T.fin - T.plano3))); const a = 0.5 - 0.35 * u, r = 9.2 - 1.0 * u;
  return { pos: [40 + Math.sin(a) * r, 10.2 - 0.6 * u, Math.cos(a) * r], mira: [40, 0.0, -1.9], fov: 46, foco: 0.62, banda: 0.16, radio: 6 };
}
export function camAt(t) { const k = camara(t); cam.position.set(...k.pos); cam.fov = k.fov; cam.aspect = W / H; cam.updateProjectionMatrix(); cam.lookAt(...k.mira); return k; }
const _v = new THREE.Vector3();
export function aPantalla(obj, local = [0, 0, 0]) { _v.set(...local); obj.localToWorld(_v); _v.project(cam); return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H, vis: _v.z < 1 }; }

// ---------- estado del mundo en el tiempo t ----------
export function render(t) {
  saltan.forEach((s) => { const c = (t * s.f + s.p) % 1; s.m.position.set(s.x + c * 0.05, 0.2 + Math.sin(c * Math.PI) * 0.62, s.z); s.m.rotation.set(t * 3 + s.p, t * 2, 0); });
  // cajera atendiendo
  mover(cajera, t, [2.1, -3.7], [2.1, -3.7], 0, 0.01, [2.1, 0]); rot(cajera, "hombroD", -0.9 - Math.sin(t * 1.6) * 0.15, 0, -0.1); rot(cajera, "codoD", -0.8); rot(cajera, "hombroI", -0.45, 0, 0.1); rot(cajera, "codoI", -0.9);
  // fila al candy, hacia la cámara
  [[2.1, -2.0], [2.0, -1.05], [2.15, -0.1], [1.95, 0.85]].forEach((q, i) => mover(fila[i], t, q, q, 0, 0.01, [2.1, -4], i * 0.37));
  rot(fila[0], "hombroD", -0.55, 0, -0.05); rot(fila[0], "codoD", -0.9);
  mover(entra, t, [5.4, 4.2], [2.2, 1.8], 0.0, 3.6, [2.1, -4], 0.3);
  mover(sala, t, [0.6, 4.2], [-4.6, 1.7], 0.0, 4.6, [-6, 1.6], 0.8);
  mover(bol, t, [-3.9, -1.75], [-3.9, -1.75], 0, 0.01, [-3.9, -3.3], 1.1);
  // cuadrícula
  const tc = t - T.plano3;
  granos.forEach((g) => {
    const u = clamp((tc - g.d) / 0.55); const reb = u < 1 ? (1 - eo(u)) * 3.2 + Math.abs(Math.sin(u * Math.PI * 2)) * (1 - u) * 0.18 : 0;
    g.m.position.set(g.x, 0.2 + reb, g.z); g.m.rotation.set(g.rx + (1 - u) * 3, g.ry, 0); g.m.visible = tc > g.d - 0.02;
    const ug = clamp((t - T.cuesta - (g.gris ? g.d * 0.4 : 0)) / 0.35), ua = clamp((t - T.quedan - g.d * 0.35) / 0.4);
    if (g.gris) { g.m.material.color.set("#F6E7C1").lerp(new THREE.Color("#5A5E66"), ug); g.m.material.emissiveIntensity = 0.2 * (1 - ug); g.m.position.y -= 0.08 * ug; g.bal.material.color.set("#1A1D22").lerp(new THREE.Color("#2A2D33"), ug); }
    else { g.bal.material.emissive.set("#007BFF").multiplyScalar(0.9 * ua); g.bal.material.color.set("#1A1D22").lerp(new THREE.Color("#0B2A55"), ua); }
  });
  azulBajo.intensity = 22 * clamp((t - T.quedan) / 0.6);

  const k = camAt(t);
  renderer.setRenderTarget(rtA); renderer.render(scene, cam);
  blurH.uniforms.tex.value = rtA.texture; blurH.uniforms.dir.value.set(1 / W, 0); blurH.uniforms.foco.value = k.foco; blurH.uniforms.banda.value = k.banda; blurH.uniforms.radio.value = k.radio;
  quad.material = blurH; renderer.setRenderTarget(rtB); renderer.render(qScene, qCam);
  blurV.uniforms.tex.value = rtB.texture; blurV.uniforms.dir.value.set(0, 1 / H); blurV.uniforms.foco.value = k.foco; blurV.uniforms.banda.value = k.banda; blurV.uniforms.radio.value = k.radio; blurV.uniforms.vin.value = 0.5;
  quad.material = blurV; renderer.setRenderTarget(null); renderer.render(qScene, qCam);
  return k;
}
