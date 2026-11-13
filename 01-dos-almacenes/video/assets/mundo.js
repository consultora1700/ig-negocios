// Mundo 3D del reel «Dos almacenes». Todo lo visible es función de t (segundos).
// Pantalla partida: cámara de arriba (Martín) y de abajo (Lucas); el divisor d(t) es el alto de la de arriba, en px.
import * as THREE from "./lib/three.module.min.js";
import { RoundedBoxGeometry } from "./lib/RoundedBoxGeometry.js";

const W = 1080, H = 1920;
const C = {
  // Mundo con vida dentro del marco de marca: la cuadra de noche (negro/carbón de la marca) y los locales iluminados con color real.
  // Azul eléctrico = Lucas y lo que crece; plata = Martín. El color del local de Martín se apaga con cada mala decisión.
  cielo: "#1A2238", baldosa: "#8C8577", junta: "#6E685C", calle: "#23252B", tinta: "#000000",
  martin: "#9299A3", lucas: "#007BFF", oro: "#E5E7EB", carton: "#C49A6C", madera: "#A0703F",
  pared: "#F1E6D2", piso: "#E9E2D4", gris: "#9299A3", delantal: "#5B6470",
};
// ---------- tiempos (anclados a la voz) ----------
export const T = {
  // gancho
  cuadra: 1.52, plata: 2.57, dia: 3.85, cinco: 5.12, tres: 6.64, persiana: 8.72, suerte: 9.5, siete: 10.68,
  // 1 · ponerle el cuerpo
  d1: 12.87, contrato1: 14.02, lucas1: 15.64, anio: 17.49, contrato: 18.36, sabia: 19.37,
  // 2 · cuaderno o sistema
  d2: 21.54, cuaderno: 22.39, sistema: 23.62, venta: 26.32, compra: 27.16, fiado: 28.05,
  // 3 · qué deja plata
  d3: 28.89, veinte: 30.95, deTodo: 33.91, deposito: 35.49, parada: 36.71,
  // 4 · nunca decir «no hay»
  d4: 37.66, avisa: 38.4, pedian: 41.07, yerbaP: 41.76, nohay: 43.09, cruza: 43.61, deLucas: 45.13,
  // 5 · cerrar la caja todos los días
  d5: 45.87, cierra: 46.78, faltante: 49.68, finMes: 50.61, mes: 51.66, siSe: 52.31,
  // 6 · precio de reposición
  d6: 53.51, mPrecio: 54.16, lPrecio: 56.38, inflacion: 58.95, achica: 61.12,
  // 7 · sueldo fijo y reinversión
  d7: 62.34, casa: 62.99, sueldo: 65.23, reinv: 67.5, datos: 68.7, tercio: 69.0, abrio: 70.99, pedidos: 72.44,
  // giro y cierre
  loco: 73.51, primer: 74.86, mas: 75.1, dif: 76.86, anio3: 78.25, tarde: 79.3,
  cierre: 80.65, numero: 82.76, guarda: 84.39, revisa: 85.38, marca: 88.0, FIN: 91,
};

// ---------- utilidades ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const E = {
  lin: (x) => x, io: (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
  io3: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  o3: (x) => 1 - Math.pow(1 - x, 3), o5: (x) => 1 - Math.pow(1 - x, 5), i3: (x) => x * x * x,
  back: (x) => { const s = 1.9; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); },
  bounce: (x) => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; },
};
const P = (t, a, d, e = E.o3) => e(clamp((t - a) / d));
const lerp = (a, b, u) => a + (b - a) * u;
const lerp3 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let r = Math.imul(seed ^ (seed >>> 15), 1 | seed); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
// Valor por tramos: [[t, valor, dur, ease], ...] arrancando en v0
function track(t, v0, moves) {
  let v = v0;
  for (const [a, to, d = 0.6, e = E.io3] of moves) {
    if (t < a) break;
    const u = d > 0 ? e(clamp((t - a) / d)) : 1;
    v = typeof v === "number" ? lerp(v, to, u) : lerp3(v, to, u);
  }
  return v;
}
function camTrack(t, k0, moves) {
  let p = k0.p, l = k0.l, f = k0.f;
  for (const [a, k, d = 1.0, e = E.io3] of moves) {
    if (t < a) break;
    const u = e(clamp((t - a) / d));
    p = lerp3(p, k.p, u); l = lerp3(l, k.l, u); f = lerp(f, k.f, u);
  }
  return { p, l, f };
}

// ---------- texturas ----------
function tex(w, h, draw, rep) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}
const texBaldosa = tex(256, 256, (g, w, h) => {
  g.fillStyle = C.baldosa; g.fillRect(0, 0, w, h); g.strokeStyle = C.junta; g.lineWidth = 6;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
  g.fillStyle = "rgba(0,0,0,.06)";
  for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) g.fillRect(x * 64 + 10 + a * 18, y * 64 + 10 + b * 18, 8, 8);
}, [6, 2]);
const texPersiana = tex(128, 256, (g, w, h) => {
  for (let y = 0; y < h; y += 16) { const gr = g.createLinearGradient(0, y, 0, y + 16); gr.addColorStop(0, "#c9cbcd"); gr.addColorStop(0.55, "#9fa3a7"); gr.addColorStop(1, "#7e8287"); g.fillStyle = gr; g.fillRect(0, y, w, 16); }
}, [1, 4]);
function texCartel(nombre, color) {
  const azul = color === C.lucas;
  return tex(1024, 192, (g, w, h) => {
    const gr = azul ? g.createLinearGradient(0, h, w, 0) : g.createLinearGradient(0, 0, 0, h);
    (azul ? [[0, "#0057D9"], [0.35, "#007BFF"], [0.7, "#009DFF"], [1, "#00CFFF"]] : [[0, "#FFFFFF"], [0.35, "#E5E7EB"], [0.7, "#BFC4CC"], [1, "#9299A3"]]).forEach(([o, c]) => gr.addColorStop(o, c));
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = azul ? "#FFFFFF" : "#000000"; g.font = "900 92px Montserrat"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("ALMACÉN " + nombre, w / 2, h / 2 + 4);
  });
}
const texAlquila = tex(512, 320, (g, w, h) => {
  g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, w, h); g.strokeStyle = "#000000"; g.lineWidth = 18; g.strokeRect(9, 9, w - 18, h - 18);
  g.fillStyle = "#000000"; g.font = "900 104px Montserrat"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("SE", w / 2, 102); g.fillText("ALQUILA", w / 2, 216);
});
const texYerba = tex(256, 384, (g, w, h) => {
  g.fillStyle = "#1F7A3A"; g.fillRect(0, 0, w, h); g.fillStyle = "#F5C518"; g.fillRect(0, h * 0.34, w, h * 0.34);
  g.fillStyle = "#1F7A3A"; g.font = "900 68px Montserrat"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("YERBA", w / 2, h * 0.51);
  g.fillStyle = "#FFFFFF"; g.font = "800 34px Montserrat"; g.fillText("1 kg", w / 2, h * 0.82);
});
const texVencido = tex(256, 256, (g, w, h) => {
  g.fillStyle = C.carton; g.fillRect(0, 0, w, h); g.save(); g.translate(w / 2, h / 2); g.rotate(-0.35);
  g.strokeStyle = "#FFFFFF"; g.lineWidth = 12; g.strokeRect(-110, -40, 220, 80);
  g.fillStyle = "#FFFFFF"; g.font = "900 46px Montserrat"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("VENCIDO", 0, 3); g.restore();
});
const texCarton = tex(256, 256, (g, w, h) => {
  g.fillStyle = C.carton; g.fillRect(0, 0, w, h); g.fillStyle = "#B0865A"; g.fillRect(w * 0.42, 0, w * 0.16, h);
  g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4);
});
const texBillete = tex(256, 128, (g, w, h) => {
  g.fillStyle = "#E5E7EB"; g.fillRect(0, 0, w, h); g.strokeStyle = "#9299A3"; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = "#007BFF"; g.beginPath(); g.arc(w / 2, h / 2, 34, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#FFFFFF"; g.font = "900 44px Montserrat"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("$", w / 2, h / 2 + 2);
});

const texDamero = tex(256, 256, (g, w, h) => {
  for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) { g.fillStyle = (x + y) % 2 ? "#1E1E22" : "#EFEAE0"; g.fillRect(x * 32, y * 32, 32, 32); }
}, [2.5, 2]);
// ---------- materiales ----------
const mats = {};
function mat(color, o = {}) {
  const k = color + JSON.stringify(o);
  if (!mats[k]) mats[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });
  return mats[k];
}
function box(w, h, d, m, r = 0.04) {
  const g = r > 0 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d);
  const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; return o;
}

// ---------- escena ----------
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene(); scene.background = new THREE.Color(C.cielo);
scene.fog = new THREE.Fog(C.cielo, 55, 140);
scene.add(new THREE.HemisphereLight("#AFC2EE", "#2A2230", 1.15));
// luz de estudio dentro de cada local, para que la maqueta se lea sobre el negro
const luzLocal = [-4.6, 4.6].map((x) => { const lz = new THREE.PointLight("#FFF1DE", 14, 12, 1.5); lz.position.set(x, 3.3, 1.2); scene.add(lz); return lz; });
// faroles de la vereda
for (const x of [-13, 0, 13]) {
  const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.6, 10), new THREE.MeshStandardMaterial({ color: "#2A2D33", roughness: 0.6, metalness: 0.4 })); poste.position.set(x, 2.3, 4.7); scene.add(poste);
  const foco = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), new THREE.MeshStandardMaterial({ color: "#FFFFFF", emissive: "#FFF6E8", emissiveIntensity: 2 })); foco.position.set(x, 4.65, 4.7); scene.add(foco);
  const lf = new THREE.PointLight("#FFF6E8", 16, 13, 1.6); lf.position.set(x, 4.4, 5.0); scene.add(lf);
}
const sol = new THREE.DirectionalLight("#FFC9A0", 1.9); sol.position.set(-14, 26, 18); sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048); Object.assign(sol.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 90 }); sol.shadow.bias = -0.0006; sol.shadow.normalBias = 0.03;
scene.add(sol, sol.target);
const camTop = new THREE.PerspectiveCamera(40, 1, 0.1, 400), camBot = new THREE.PerspectiveCamera(40, 1, 0.1, 400);

// suelo: calles
const calle = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), mat(C.calle)); calle.rotation.x = -Math.PI / 2; calle.receiveShadow = true; scene.add(calle);
// líneas de calle
for (let i = -12; i <= 12; i++) { const l = box(2.2, 0.02, 0.22, mat("#3A3E46"), 0); l.position.set(i * 5, 0.01, 7.6); l.castShadow = false; scene.add(l); }

// ---------- barrio ----------
const BX = 30, BZ = 24; // paso entre manzanas
const rnd = rng(7);
const tonos = ["#C9785B", "#D8B26E", "#7FA7A1", "#B5A48B", "#9E6B5C", "#6E8CA0", "#D9CBB2", "#A6876A"];
function manzana(cx, cz, nuestra, plaza, hueco) {
  const base = box(BX - 7, 0.3, BZ - 7, mat(C.baldosa, { map: texBaldosa }), 0.05); base.position.set(cx, 0.15, cz); scene.add(base);
  const piezas = [];
  if (plaza) {
    const pasto = box(BX - 10, 0.12, BZ - 10, mat("#4E7D52"), 0.05); pasto.position.set(cx, 0.36, cz); scene.add(pasto);
    const ra = rng(3);
    for (let k = 0; k < 9; k++) {
      const x = cx + (k % 2 ? 1 : -1) * (8.5 + (ra() - 0.5) * 1.5), z = cz - 5.5 + Math.floor(k / 2) * 3 + (ra() - 0.5);
      if (k > 7) continue;
      const tronco = box(0.35, 1.4, 0.35, mat("#7A5A3E"), 0.05); tronco.position.set(x, 1.1, z); scene.add(tronco);
      const copa = new THREE.Mesh(new THREE.SphereGeometry(1.3 + ra() * 0.5, 18, 14), mat(ra() > 0.5 ? "#5E9E4A" : "#6FAE55")); copa.position.set(x, 2.7, z); copa.castShadow = true; scene.add(copa);
    }
    return piezas;
  }
  if (nuestra) {
    for (const sx of [-1, 1]) for (const [z0, dz] of [[-1.2, 6.2], [-8.6, 7.5]]) {
      const h = 4.2 + rnd() * 2.5; const b = box(2.4, h, dz, mat(tonos[Math.floor(rnd() * tonos.length)]), 0.12); b.position.set(cx + sx * 10.2, 0.3 + h / 2, cz + 4.5 + z0); scene.add(b);
    }
    for (let k = 0; k < 4; k++) { const h = 3.5 + rnd() * 3; const b = box(4.6, h, 3.6, mat(tonos[Math.floor(rnd() * tonos.length)]), 0.12); b.position.set(cx - 6.9 + k * 4.6, 0.3 + h / 2, cz - 6.2); scene.add(b); }
    return piezas;
  }
  const cols = 4, filas = 2, w = (BX - 9) / cols, d = (BZ - 9) / filas;
  for (let i = 0; i < cols; i++) for (let j = 0; j < filas; j++) {
    const x = cx - (BX - 9) / 2 + w * (i + 0.5), z = cz - (BZ - 9) / 2 + d * (j + 0.5);
    if (hueco && j === 1 && (i === 1 || i === 2)) continue; // lugar de una sucursal
    const h = 2.6 + rnd() * 5.5, col = tonos[Math.floor(rnd() * tonos.length)];
    const b = box(w - 0.8, h, d - 0.8, mat(col), 0.12); b.position.set(x, 0.3 + h / 2, z); scene.add(b);
    for (let k = 0; k < 3; k++) if (rnd() < 0.55) { const v = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), mat(rnd() < 0.5 ? "#FFF3E0" : "#DCE8FF", { emissive: rnd() < 0.5 ? "#FFE9C7" : "#CFE0FF", emissiveIntensity: 0.9 })); v.position.set(x - w / 3 + k * (w / 3), 0.3 + 1.4 + rnd() * (h - 2), z + (d - 0.8) / 2 + 0.02); scene.add(v); }
    const techo = box(w - 0.5, 0.25, d - 0.5, mat("#5B4E44"), 0.06); techo.position.set(x, 0.3 + h + 0.12, z); scene.add(techo);
    piezas.push(b, techo);
  }
  return piezas;
}
for (let i = -3; i <= 3; i++) for (let j = -3; j <= 2; j++) manzana(i * BX, j * BZ - 4.5, i === 0 && j === 0, i === 0 && j === 1, (i === 1 && j === -1) || (i === -1 && j === 0));

// ---------- personas ----------
const gente = [];
function persona(remera, delantal) {
  const g = new THREE.Group();
  const cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.62, 6, 16), mat(remera)); cuerpo.position.y = 0.68; cuerpo.castShadow = true; g.add(cuerpo);
  if (delantal) { const dl = box(0.5, 0.62, 0.08, mat(C.delantal), 0.03); dl.position.set(0, 0.62, 0.31); g.add(dl); }
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), mat("#E8B48F")); cabeza.position.y = 1.36; cabeza.castShadow = true; g.add(cabeza);
  const pelo = new THREE.Mesh(new THREE.SphereGeometry(0.31, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), mat("#3A2A22")); pelo.position.y = 1.38; g.add(pelo);
  const ojos = [];
  for (const s of [-1, 1]) { const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mat(C.tinta)); ojo.position.set(0.1 * s, 1.38, 0.27); g.add(ojo); ojos.push(ojo); }
  g.userData.ojos = ojos; g.userData.semilla = gente.length * 0.37 + 0.11; gente.push(g);
  return g;
}

// ---------- almacén ----------
function almacen(nombre, color, seed) {
  const g = new THREE.Group(); const r = rng(seed);
  const piso = box(7, 0.2, 5, mat("#FFFFFF", { map: texDamero }), 0.03); piso.position.set(0, 0.4, 0); g.add(piso);
  const fondo = box(7, 3.6, 0.25, mat(C.pared)); fondo.position.set(0, 2.1, -2.4); g.add(fondo);
  for (const s of [-1, 1]) { const lat = box(0.25, 3.6, 5, mat(C.pared)); lat.position.set(3.4 * s, 2.1, 0); g.add(lat); }
  // fachada: columnas + viga + cartel
  for (const s of [-1, 1]) { const col = box(0.45, 3.6, 0.45, mat(color)); col.position.set(3.3 * s, 2.1, 2.45); g.add(col); }
  const viga = box(7.2, 0.7, 0.5, mat(color)); viga.position.set(0, 3.95, 2.45); g.add(viga);
  const cartel = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.2), new THREE.MeshStandardMaterial({ map: texCartel(nombre, color), roughness: 0.7 }));
  cartel.position.set(0, 4.75, 2.55); g.add(cartel);
  const cartelBase = box(6.6, 1.35, 0.2, mat(color)); cartelBase.position.set(0, 4.75, 2.42); g.add(cartelBase);
  // persiana (se enrolla hacia arriba)
  const pers = new THREE.Group(); pers.position.set(0, 3.55, 2.62); g.add(pers);
  const lam = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 3.15), new THREE.MeshStandardMaterial({ map: texPersiana, roughness: 0.55, metalness: 0.35, side: THREE.DoubleSide }));
  lam.castShadow = true; pers.add(lam);
  const rollo = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 6.3, 20), mat("#8C9095", { metalness: 0.4, roughness: 0.5 })); rollo.rotation.z = Math.PI / 2; rollo.position.set(0, 3.55, 2.6); g.add(rollo);
  const alquila = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.19), new THREE.MeshStandardMaterial({ map: texAlquila, roughness: 0.8 }));
  const alqPiv = new THREE.Group(); alqPiv.position.set(0.4, 2.6, 2.66); alquila.position.y = -0.62; alqPiv.add(alquila); g.add(alqPiv);
  // góndola contra la pared del fondo: 3 estantes x 10 productos; el del medio es yerba
  const gond = new THREE.Group(); gond.position.set(-0.7, 0, -1.95); g.add(gond);
  const gx = 5.0;
  const lado = box(0.14, 3.0, 0.75, mat("#ECE6DA")); lado.position.set(-gx / 2, 2.0, 0); gond.add(lado);
  const lado2 = lado.clone(); lado2.position.x = gx / 2; gond.add(lado2);
  const prods = [];
  const colores = ["#E04F3F", "#F2B33D", "#2A9D8F", "#264653", "#3A86FF", "#F4F1E8", "#8E5BD0", "#E9724C"];
  [1.05, 1.95, 2.85].forEach((y, fila) => {
    const est = box(gx, 0.08, 0.75, mat("#ECE6DA"), 0.02); est.position.set(0, y - 0.04, 0); gond.add(est);
    for (let i = 0; i < 10; i++) {
      let p;
      if (fila === 1) { p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.62, 0.26), [mat("#1F7A3A"), mat("#1F7A3A"), mat("#1F7A3A"), mat("#1F7A3A"), new THREE.MeshStandardMaterial({ map: texYerba, roughness: 0.8 }), mat("#1F7A3A")]); p.position.set(-gx / 2 + 0.3 + i * 0.49, y + 0.31, 0.05); }
      else { const h = 0.35 + r() * 0.35; p = box(0.36, h, 0.36, mat(colores[Math.floor(r() * colores.length)]), 0.05); p.position.set(-gx / 2 + 0.3 + i * 0.49, y + h / 2, 0.02); }
      p.castShadow = true; p.userData.base = p.position.clone(); gond.add(p); prods.push({ m: p, fila, i });
    }
  });
  // mostrador + caja registradora
  const most = box(2.4, 1.0, 1.0, mat(C.madera)); most.position.set(2.0, 1.0, 0.7); g.add(most);
  const tapa = box(2.6, 0.08, 1.15, mat("#3A3E46"), 0.02); tapa.position.set(2.0, 1.53, 0.7); g.add(tapa);
  const caja = new THREE.Group(); caja.position.set(2.45, 1.57, 0.55); g.add(caja);
  const cb = box(0.8, 0.32, 0.6, mat("#3B3E45"), 0.05); cb.position.y = 0.16; caja.add(cb);
  const pant = box(0.5, 0.3, 0.06, mat("#2A2C31"), 0.02); pant.position.set(0, 0.5, -0.15); pant.rotation.x = -0.4; caja.add(pant);
  const cajon = box(0.7, 0.12, 0.5, mat("#50545C"), 0.02); cajon.position.set(0, 0.08, 0.1); caja.add(cajon);
  // billetes de la caja (pila)
  const billetes = [];
  for (let i = 0; i < 26; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.21), new THREE.MeshStandardMaterial({ map: texBillete, roughness: 0.8 }));
    b.castShadow = true; g.add(b); billetes.push(b);
  }
  // depósito (detrás)
  const depPiso = box(7, 0.2, 4, mat("#24272D"), 0.03); depPiso.position.set(0, 0.4, -4.6); g.add(depPiso);
  for (const s of [-1, 1]) { const l = box(0.25, 2.4, 4, mat(C.pared)); l.position.set(3.4 * s, 1.5, -4.6); g.add(l); }
  const dfondo = box(7, 2.4, 0.25, mat(C.pared)); dfondo.position.set(0, 1.5, -6.5); g.add(dfondo);
  // personas
  const dueno = persona(color); g.add(dueno);
  const emp = [persona("#ECE6DA", true), persona("#ECE6DA", true), persona("#ECE6DA", true)]; emp.forEach((e) => g.add(e));
  // monedas (capital) en la vereda
  const monedas = [];
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.11, 28), mat(C.oro, { metalness: 0.85, roughness: 0.3 }));
    m.castShadow = true; g.add(m); monedas.push(m);
  }
  return { g, pers, lam, alqPiv, prods, caja, cajon, billetes, dueno, emp, monedas, gond };
}

// Nuestra manzana: frentes de los almacenes mirando a la calle (z = 3.4 en mundo)
const ZF = 0.6; // centro del local en z
const M = almacen("MARTÍN", C.martin, 11); M.g.position.set(-4.6, 0, ZF); scene.add(M.g);
const apagables = [];
M.g.traverse((o) => { if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; const cl = ms.map((m) => { const c = m.clone(); apagables.push({ m: c, c0: c.color.clone() }); return c; }); o.material = Array.isArray(o.material) ? cl : cl[0]; } });
const L = almacen("LUCAS", C.lucas, 23); L.g.position.set(4.6, 0, ZF); scene.add(L.g);
// sucursales de Lucas
const S2 = almacen("LUCAS", C.lucas, 31); S2.g.position.set(BX + 2, 0, -BZ + 0.6); scene.add(S2.g);
const S3 = almacen("LUCAS", C.lucas, 37); S3.g.position.set(-BX - 1, 0, 0.6); scene.add(S3.g);
for (const s of [S2, S3]) { s.alqPiv.visible = false; s.emp.forEach((e) => (e.visible = false)); s.billetes.forEach((b) => (b.visible = false)); s.monedas.forEach((m) => (m.visible = false)); s.dueno.visible = false; }
// pedidos por chat (pines)
const pines = []; const rp = rng(99);
for (let i = 0; i < 27; i++) {
  const g = new THREE.Group();
  const cono = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.4, 20), mat("#009DFF")); cono.rotation.x = Math.PI; cono.position.y = 0.7; g.add(cono);
  const bola = new THREE.Mesh(new THREE.SphereGeometry(0.85, 24, 16), mat("#009DFF")); bola.position.y = 1.9; g.add(bola);
  const glob = box(0.9, 0.55, 0.1, mat("#FFFFFF"), 0.12); glob.position.set(0, 1.95, 0.8); g.add(glob);
  g.children.forEach((c) => (c.castShadow = true));
  const enZona = i % 3 === 0; // uno de cada tres
  let x, z;
  if (enZona) { x = BX + 2 + (rp() - 0.5) * 14; z = -BZ + 0.6 + (rp() - 0.5) * 10; }
  else { const a = rp() * Math.PI * 2, rr = 12 + rp() * 48; x = Math.cos(a) * rr; z = Math.sin(a) * rr * 0.8 - 4; }
  g.position.set(x, 0, z); g.scale.setScalar(2.2); g.userData = { enZona, t0: T.tercio + i * 0.06 }; scene.add(g); pines.push(g);
}
const anillo = new THREE.Mesh(new THREE.TorusGeometry(10, 0.35, 12, 64), mat("#00CFFF", { emissive: "#009DFF", emissiveIntensity: 0.5 }));
anillo.rotation.x = Math.PI / 2; anillo.position.set(BX + 2, 0.4, -BZ + 0.6); scene.add(anillo);
// polvo (persiana que cae)
const polvo = []; const rpo = rng(5);
for (let i = 0; i < 34; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.06 + rpo() * 0.09, 8, 6), new THREE.MeshStandardMaterial({ color: "#6B7079", transparent: true, opacity: 0.8, roughness: 1 })); p.userData = { a: rpo() * Math.PI, v: 0.6 + rpo() * 1.4 }; M.g.add(p); polvo.push(p); }


// ---------- estado por tiempo ----------
const posDueno = new THREE.Vector3(2.15, 0.5, -0.35);
const posCajero = new THREE.Vector3(1.6, 0.5, -0.35), posRepo = new THREE.Vector3(-2.4, 0.5, -1.0), posEmp3 = new THREE.Vector3(-0.2, 0.5, 0.2);
const LX = (S) => S.g.position.x, LZ = (S) => S.g.position.z;

function persianaAbierta(s, u) { // u: 0 abierta (enrollada) .. 1 cerrada
  s.lam.scale.y = Math.max(0.001, u); s.lam.position.y = -1.575 * u; s.lam.visible = u > 0.002;
}
function aparecer(o, t, a, d = 0.55) { const u = P(t, a, d, E.back); o.visible = t >= a; o.scale.setScalar(Math.max(0.001, u)); }
// caminar: rebote y balanceo mientras se mueve; mira hacia donde va
function caminar(o, x0, z0, x1, z1, u, y = 0.5) {
  const x = lerp(x0, x1, u), z = lerp(z0, z1, u);
  const mov = u > 0 && u < 1;
  o.position.set(x, y + (mov ? Math.abs(Math.sin(u * Math.hypot(x1 - x0, z1 - z0) * 4.2)) * 0.07 : 0), z);
  o.rotation.z = mov ? Math.sin(u * Math.hypot(x1 - x0, z1 - z0) * 4.2) * 0.07 : 0;
  if (mov) o.rotation.y = Math.atan2(x1 - x0, z1 - z0);
}

// cuánto se "apagó" el almacén de Martín (0 = vivo, 1 = gris y sin luz)
export const apagado = (t) => track(t, 0, [[T.tres, 1, 2.0, E.io], [T.suerte + 0.1, 0, 1.0, E.io], [T.contrato1, 0.1, 1.0], [T.cuaderno, 0.2, 1.0], [T.deTodo, 0.35, 1.0], [T.nohay, 0.5, 0.8], [T.finMes, 0.6, 1.0], [T.achica - 1, 0.75, 1.0], [T.casa, 0.85, 1.0], [T.loco, 0, 0.8], [T.anio3, 0.9, 1.0], [T.cierre, 1, 1.0]]);
const gris = new THREE.Color();
function apagar(t) {
  const d = apagado(t);
  for (const { m, c0 } of apagables) { const l = c0.r * 0.3 + c0.g * 0.59 + c0.b * 0.11; gris.setRGB(l * 0.7, l * 0.7, l * 0.72); m.color.copy(c0).lerp(gris, d); }
  luzLocal[0].intensity = 14 * (1 - 0.75 * d);
}
// timelapse: cuando corren los años, el cielo pasa por día y noche
const cielos = [[T.cinco, 1.2, 5], [T.suerte + 0.1, 1.0, 5], [T.anio, 0.6, 1], [T.abrio + 0.2, 0.8, 2], [T.primer - 0.3, 0.6, 2], [T.anio3, 0.6, 2], [T.cierre, 0.8, 2]];
const cNoche = new THREE.Color(C.cielo), cDia = new THREE.Color("#7DB0E0"), cTmp = new THREE.Color();
const hemi = scene.children.find((o) => o.isHemisphereLight);
function cielo(t) {
  let dia = 0;
  for (const [a, d, n] of cielos) if (t >= a && t < a + d) dia = 0.5 - 0.5 * Math.cos(((t - a) / d) * n * Math.PI * 2);
  cTmp.copy(cNoche).lerp(cDia, dia); scene.background.copy(cTmp); scene.fog.color.copy(cTmp);
  hemi.intensity = 1.15 + dia * 0.9; sol.intensity = 1.9 + dia * 1.6;
}
function parpadeo(t) {
  for (const g of gente) { const f = (t / 3.1 + g.userData.semilla) % 1; const s = f < 0.035 ? 0.15 : 1; g.userData.ojos.forEach((o) => (o.scale.y = s)); }
}

function estado(t) {
  apagar(t); cielo(t); parpadeo(t);
  const futuro = t >= T.cinco && t < T.suerte + 0.15;                 // gancho en el año 5
  const rew = P(t, T.suerte + 0.1, 1.0, E.io3);                         // rebobinado
  const fin = t >= T.cierre;
  // persianas: suben al inicio; la de Martín cae en el año 5 y al final
  const subir = 1 - P(t, 0.25, 1.1, E.io3);
  let pM = subir;
  if (futuro || fin) { const a = fin ? T.cierre + 0.15 : T.persiana - 0.35; pM = Math.max(pM, P(t, a, 0.38, E.bounce)); }
  if (t >= T.suerte + 0.1 && !fin) pM = Math.max(subir, 1 - rew);
  persianaAbierta(M, pM); persianaAbierta(L, subir);
  const golpe = fin ? T.cierre + 0.5 : T.persiana;
  polvo.forEach((p) => { const u = clamp((t - golpe) / 1.3); const ok = u > 0 && u < 1 && (fin || futuro); p.visible = ok; if (ok) { const r = 0.4 + E.o3(u) * 2.4 * p.userData.v; p.position.set(Math.cos(p.userData.a) * r * 1.6, 0.3 + E.o3(u) * 0.9, 3.0 + Math.sin(p.userData.a) * 0.8); p.material.opacity = 0.85 * (1 - u); p.scale.setScalar(1 + u * 0.6); } });
  const ta = fin ? T.cierre + 0.7 : T.persiana + 0.35;
  const alqOn = (futuro || fin) && t >= ta && !(t >= T.suerte + 0.1 && !fin);
  M.alqPiv.visible = alqOn; if (alqOn) { const u = t - ta; M.alqPiv.rotation.z = Math.sin(u * 6) * 0.35 * Math.exp(-u * 1.6); M.alqPiv.scale.setScalar(P(t, ta, 0.3, E.back)); }
  L.alqPiv.visible = false;
  // sucursales de Lucas
  const s3 = futuro ? P(t, T.tres + 0.4, 0.6, E.back) * (1 - rew) : fin ? P(t, T.cierre + 0.3, 0.6, E.back) : 0;
  S3.g.visible = s3 > 0.001; S3.g.scale.setScalar(Math.max(0.001, s3));
  if (futuro) { const s2 = P(t, T.tres + 0.1, 0.6, E.back) * (1 - rew); S2.g.visible = s2 > 0.001; S2.g.position.y = 0; S2.g.scale.setScalar(Math.max(0.001, s2)); }
  else if (t >= T.abrio - 0.4) { const u = P(t, T.abrio - 0.4, 0.55, E.i3); S2.g.visible = true; S2.g.position.y = 30 * (1 - u); S2.g.scale.setScalar(1); }
  else S2.g.visible = false;
  persianaAbierta(S2, 0); persianaAbierta(S3, 0);
  // Martín: detrás del mostrador; contrata y se va; vuelve a sacar plata «para la casa»
  const sale = P(t, T.contrato1 + 0.5, 1.3, E.lin);
  const enCasa = t >= T.casa - 0.3 && t < T.sueldo;
  if (t < T.contrato1 + 0.5 || fin) { M.dueno.visible = true; M.dueno.position.copy(posDueno); M.dueno.rotation.set(0, 0, 0); }
  else if (sale < 1) { M.dueno.visible = true; caminar(M.dueno, posDueno.x, posDueno.z, 4.4, 4.6, sale); }
  else if (enCasa) { M.dueno.visible = true; M.dueno.position.set(2.9, 0.5, -0.2); M.dueno.rotation.set(0, -0.4, 0); }
  else M.dueno.visible = false;
  if (t < T.contrato1) { M.emp[0].visible = false; M.emp[1].visible = false; }
  else { M.emp[0].position.copy(posCajero); aparecer(M.emp[0], t, T.contrato1 + 0.05); M.emp[1].position.copy(posRepo); aparecer(M.emp[1], t, T.contrato1 + 0.45); }
  if (enCasa) M.emp[0].position.set(1.2, 0.5, -0.35);
  M.emp[2].position.copy(posEmp3); if (t >= T.mas && t < T.dif + 0.2) aparecer(M.emp[2], t, T.mas); else M.emp[2].visible = false;
  // Lucas
  L.dueno.position.copy(posDueno); L.dueno.visible = true; L.dueno.rotation.set(0, 0, 0);
  L.emp[0].position.set(0.9, 0.5, -0.1); if (t >= T.contrato + 0.25) aparecer(L.emp[0], t, T.contrato + 0.25); else L.emp[0].visible = false;
  L.emp[1].visible = false; L.emp[2].visible = false;
  // monedas: solo en el gancho («misma plata», año 5) y en el final
  let nM = 10, nL = 10;
  if (futuro) { const u = P(t, T.cinco, 1.2, E.io); nM = Math.round(lerp(10, 0, u)); nL = Math.round(lerp(10, 24, u)); }
  if (t >= T.suerte + 0.1) { nM = Math.round(lerp(0, 10, rew)); nL = Math.round(lerp(24, 10, rew)); }
  if (fin) { nM = 0; nL = 24; }
  const showCoins = t < T.d1 || fin;
  coins(M, nM, showCoins, t); coins(L, nL, showCoins, t);
  yerbaM(t); yerbaL(t);
  billetesM(t); billetesL(t);
  // cajón de Martín: se abre y se escapa la plata («si se enteraba»)
  M.cajon.position.z = 0.1 + 0.35 * (P(t, T.finMes + 0.5, 0.35) * (1 - P(t, T.d6 - 0.3, 0.3)));
  // pedidos del barrio
  pines.forEach((p) => { const a = p.userData.t0; const u = P(t, a, 0.45, E.bounce); p.visible = t >= a && t < T.loco; p.position.y = 14 * (1 - u); let z = t > T.tercio + 1.7 && !p.userData.enZona ? 1.3 : 2.2; if (p.userData.enZona) z *= 1 - P(t, T.abrio - 0.5, 0.35, E.i3); p.visible = p.visible && z > 0.01; p.scale.setScalar(Math.max(0.001, z)); });
  anillo.visible = t >= T.tercio + 1.5 && t < T.loco; anillo.scale.setScalar(Math.max(0.001, P(t, T.tercio + 1.5, 0.5, E.back)));
  deposito(t);
  clientesG(t); flujo(t); elCliente(t); autos(t);
}
function coins(S, n, show, t) {
  S.monedas.forEach((m, i) => {
    m.visible = show && i < n;
    const col = Math.floor(i / 13), k = i % 13;
    m.position.set(-4.6 + col * 0.95, 0.36 + k * 0.115, 2.9 - col * 0.2);
  });
  const u = P(t, T.plata - 0.1, 0.5, E.back);
  S.monedas.forEach((m) => m.scale.setScalar(t < T.cinco ? Math.max(0.001, u) : 1));
  if (t < T.plata - 0.1) S.monedas.forEach((m) => (m.visible = false));
}
// Yerba de Martín: vacía cuando le piden («no hay»); en el 6, vende 10 y repone 8 → 6 → 5
export function yerbaEnEstanteM(t) {
  if (t >= T.pedian - 0.3 && t < T.d5) return 0;
  if (t >= T.inflacion - 0.2 && t < T.loco) {
    let n = 10; for (let i = 0; i < 10; i++) { if (t >= T.inflacion + 0.35 + i * 0.05 + 0.25) n--; if (i < 8 && t >= T.inflacion + 1.35 + i * 0.05 + 0.2) n++; }
    if (t >= T.achica - 0.2) n = Math.min(n, 6); if (t >= T.achica + 0.35) n = Math.min(n, 5);
    return n;
  }
  return 10;
}
function yerbaM(t) {
  const fila = M.prods.filter((p) => p.fila === 1);
  fila.forEach(({ m }, i) => {
    const b = m.userData.base; let x = b.x, y = b.y, z = b.z, s = 1, vis = true;
    if (t >= T.pedian - 0.3 && t < T.d5) vis = false;
    if (t >= T.inflacion - 0.2 && t < T.loco) {
      const vende = T.inflacion + 0.35 + i * 0.05, vuelve = T.inflacion + 1.35 + i * 0.05;
      const sale2 = i === 7 || i === 6 ? T.achica - 0.25 + (7 - i) * 0.08 : i === 5 ? T.achica + 0.3 : 1e9;
      if (t >= vende) {
        const u = P(t, vende, 0.35, E.io);
        if (u < 1) { x = lerp(b.x, 3.3, u); y = b.y + Math.sin(u * Math.PI) * 1.0; z = lerp(b.z, 2.6, u); s = 1 - u * 0.7; } else vis = false;
        if (i < 8 && t >= vuelve) { const v = P(t, vuelve, 0.3, E.bounce); vis = true; x = b.x; z = b.z; y = b.y + 1.4 * (1 - v); s = 1; }
        if (t >= sale2) { const w = P(t, sale2, 0.28, E.io); if (w < 1) { x = b.x; y = b.y + w * 0.9; z = b.z + w * 1.5; s = 1 - w; } else vis = false; }
      }
    }
    m.position.set(x, y, z); m.scale.setScalar(Math.max(0.001, s)); m.visible = vis;
  });
}
// Yerba de Lucas: el sistema avisa que quedan 3 y repone
function yerbaL(t) {
  L.prods.forEach(({ m, fila, i }) => {
    const b = m.userData.base; m.position.copy(b); m.scale.setScalar(1); m.visible = true;
    if (fila === 1 && i >= 3 && t >= T.avisa - 0.3 && t < T.pedian) {
      const a = T.avisa + 1.55 + (i - 3) * 0.07; // reposición
      if (t < a) m.visible = false; else { const v = P(t, a, 0.3, E.bounce); m.position.y = b.y + 1.3 * (1 - v); }
    }
  });
}
const enCaja = (i) => [2.45 + ((i * 37) % 7 - 3) * 0.04, 1.93 + Math.floor(i / 3) * 0.03, 0.6 + ((i * 53) % 5 - 2) * 0.05];
function billetesM(t) {
  M.billetes.forEach((b, i) => {
    let vis = false, p = [0, 0, 0], ry = (i * 0.7) % 1.2 - 0.6, rx = 0;
    // 5: la plata se escapa del cajón y nadie se entera
    const esc = T.finMes + 0.8 + i * 0.12;
    if (i < 8 && t >= esc && t < T.d6) { const u = P(t, esc, 0.9, E.i3); vis = u < 1; p = [2.45 + Math.sin(i) * 0.2, 1.7 - u * 1.4, 0.95 + u * 0.8]; ry = u * 4 + i; rx = 0.6; }
    // 7: la caja se llena y la plata se va «para la casa»
    const llega = T.casa - 0.2 + i * 0.03, va = T.casa + 0.7 + i * 0.06;
    if (i < 14 && t >= llega && t < T.sueldo) {
      const u = P(t, llega, 0.25, E.bounce); vis = true; const k = enCaja(i); p = [k[0], k[1] + 0.2 + 0.6 * (1 - u) + i * 0.012, k[2]];
      if (t >= va) { const w = P(t, va, 0.7, E.i3); p = lerp3(p, [9.5, 3.2, 3.5], w); vis = w < 1; ry = w * 5 + i; }
    }
    b.visible = vis; b.position.set(...p); b.rotation.set(rx, ry, 0);
  });
}
function billetesL(t) {
  L.billetes.forEach((b, i) => {
    let vis = false, p = [0, 0, 0], ry = (i * 0.7) % 1.2 - 0.6;
    const llega = T.sueldo - 0.1 + i * 0.03;
    if (i < 14 && t >= llega && t < T.datos) {
      const u = P(t, llega, 0.25, E.bounce); vis = true; const k = enCaja(i); p = [k[0], k[1] + 0.2 + 0.6 * (1 - u) + i * 0.012, k[2]];
      if (i < 3) { const w = P(t, T.sueldo + 0.9 + i * 0.08, 0.5, E.io); p = lerp3(p, [2.15, 1.25 + i * 0.03, -0.1], w); }        // sueldo fijo
      else { const w = P(t, T.reinv - 0.3 + i * 0.05, 0.7, E.io); p = lerp3(p, [-0.7 + ((i % 5) - 2) * 0.6, 3.4, -1.9], w); vis = w < 0.98; ry += w * 4; } // reinversión
    }
    b.visible = vis; b.position.set(...p); b.rotation.set(0, ry, 0);
  });
}
// Depósitos: Martín compra de todo (las cajas llueven) y se llena de plata parada
const cajasM = [];
{
  const r = rng(41);
  for (let i = 0; i < 16; i++) {
    const v = i === 2 || i === 7 || i === 11;
    const m = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.75, 0.75, 2, 0.04), [0, 1, 2, 3, 4, 5].map((f) => new THREE.MeshStandardMaterial({ map: f === 2 && v ? texVencido : texCarton, roughness: 0.9 })));
    m.castShadow = m.receiveShadow = true;
    const col = i % 6, row = Math.floor(i / 6);
    m.position.set(-2.7 + col * 1.05 + (r() - 0.5) * 0.4, 0.88 + row * 0.76 - (row ? 0.02 : 0), -4.6 + (r() - 0.5) * 1.8);
    m.rotation.y = (r() - 0.5) * 0.9; m.userData = { v, base: m.position.clone() };
    M.g.add(m); cajasM.push(m);
  }
}
function deposito(t) {
  cajasM.forEach((m, i) => {
    const b = m.userData.base; const a = T.deTodo + 0.15 + i * 0.1;
    if (t >= T.deTodo - 0.2 && t < T.d4) { const u = P(t, a, 0.4, E.bounce); m.visible = t >= a; m.position.set(b.x, b.y + 5 * (1 - u), b.z); }
    else { m.visible = true; m.position.copy(b); }
    const pulse = m.userData.v && t >= T.parada ? 1 + 0.12 * Math.sin(clamp((t - T.parada) / 0.5) * Math.PI) : 1; m.scale.setScalar(pulse);
  });
}
// Bloque «el año 1 engaña»: el de Martín se llena de gente
const clientes3 = [persona("#5FA8D3"), persona("#D9644A"), persona("#9C89B8")]; clientes3.forEach((c) => M.g.add(c));
function clientesG(t) {
  clientes3.forEach((c, i) => { const a = T.mas + 0.2 + i * 0.25; const u = P(t, a, 1.0, E.lin); c.visible = t >= a && t < T.dif + 0.2; caminar(c, -6 + i * 1.2, 4.8, -1.5 + i * 1.3, 1.2 + (i % 2) * 0.6, u); if (u >= 1) c.rotation.y = Math.PI; });
}
// Flujo de clientes: a lo de Lucas entra cada vez más gente; a lo de Martín, cada vez menos
const flujoL = [persona("#E9724C"), persona("#2A9D8F"), persona("#8E5BD0")].map((g, k) => ({ g, k, S: L }));
const flujoM = [persona("#F2B33D"), persona("#264653")].map((g, k) => ({ g, k, S: M }));
[...flujoL, ...flujoM].forEach((c) => c.S.g.add(c.g));
const cuantosL = (t) => (t < T.d1 || t >= T.datos - 0.3 ? 0 : t < T.d3 ? 1 : t < T.d5 ? 2 : 3);
const cuantosM = (t) => (t < T.d1 || t >= T.loco - 0.1 ? 0 : t < T.d3 ? 2 : t < T.pedian - 0.6 ? 1 : 0);
// en los planos de adentro de cada local, el flujo de clientes no pasa por delante de la cámara
const adentroM = [[T.d1 - 0.5, T.d2 - 0.2], [T.pedian - 1.0, T.cruza - 0.1], [T.finMes - 0.4, T.d6 - 0.1], [T.inflacion - 0.5, T.loco]];
const adentroL = [[T.lucas1 - 0.4, T.d2 - 0.2], [T.d4 - 0.3, T.pedian - 0.3], [T.d5 - 0.3, T.d6 - 0.1], [T.sueldo - 0.4, T.datos]];
const dentro = (t, w) => w.some(([a, b]) => t >= a && t < b);
function flujo(t) {
  const paso = (c, n) => {
    const { g, k } = c; if (k >= n) { g.visible = false; return; }
    const ph = (((t - T.d1) / 7.0 + k * 0.37) % 1 + 1) % 1; g.visible = ph < 0.95;
    const sx = -2.2 + k * 1.6, B = [0.6 + k * 0.45, 1.85];
    if (ph < 0.35) caminar(g, sx, 4.7, B[0], B[1], ph / 0.35);
    else if (ph < 0.6) { g.position.set(B[0], 0.5, B[1]); g.rotation.set(0, Math.PI, 0); }
    else caminar(g, B[0], B[1], sx + 1.2, 4.9, (ph - 0.6) / 0.35);
  };
  flujoL.forEach((c) => paso(c, dentro(t, adentroL) ? 0 : cuantosL(t))); flujoM.forEach((c) => paso(c, dentro(t, adentroM) ? 0 : cuantosM(t)));
}
// «Cuatro»: el cliente que pide yerba a Martín, escucha «no hay» y se va a lo de Lucas
const cliente = persona("#C9785B"); scene.add(cliente);
function elCliente(t) {
  const mx = LX(M), mz = LZ(M), lx = LX(L), lz = LZ(L);
  if (t < T.pedian - 0.9 || t >= T.d5 + 0.5) { cliente.visible = false; return; }
  cliente.visible = true;
  if (t < T.pedian) caminar(cliente, mx + 1.6, mz + 4.4, mx + 1.6, mz + 1.75, P(t, T.pedian - 0.9, 0.9, E.lin));
  else if (t < T.cruza + 0.1) { cliente.position.set(mx + 1.6, 0.5, mz + 1.75); cliente.rotation.set(0, Math.PI, 0); }
  else if (t < T.cruza + 0.9) caminar(cliente, mx + 1.6, mz + 1.75, mx + 2.6, mz + 4.3, P(t, T.cruza + 0.1, 0.8, E.lin));
  else if (t < T.deLucas) caminar(cliente, mx + 2.6, mz + 4.3, lx + 1.0, lz + 4.3, P(t, T.cruza + 0.9, T.deLucas - T.cruza - 0.9, E.lin));
  else caminar(cliente, lx + 1.0, lz + 4.3, lx + 1.2, lz + 1.9, P(t, T.deLucas, 0.8, E.lin));
}
// Autos con faros que pasan por la calle (en los planos abiertos)
const autos_ = [];
{
  const cols = ["#3A86FF", "#E04F3F", "#ECE6DA", "#2A9D8F"];
  for (let k = 0; k < 4; k++) {
    const g = new THREE.Group();
    const cuerpo = box(2.4, 0.6, 1.15, mat(cols[k], { metalness: 0.3, roughness: 0.4 }), 0.15); cuerpo.position.y = 0.55; g.add(cuerpo);
    const cab = box(1.3, 0.5, 1.0, mat("#1B1E23", { metalness: 0.5, roughness: 0.2 }), 0.12); cab.position.set(-0.15, 1.05, 0); g.add(cab);
    for (const [x, z] of [[0.8, 0.55], [-0.8, 0.55], [0.8, -0.55], [-0.8, -0.55]]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 14), mat("#111111")); r.rotation.x = Math.PI / 2; r.position.set(x, 0.26, z); g.add(r); }
    for (const z of [0.35, -0.35]) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshStandardMaterial({ color: "#FFFFFF", emissive: "#FFF6E8", emissiveIntensity: 2.5 })); f.position.set(1.21, 0.62, z); g.add(f); }
    g.userData = { carril: k % 2 ? 8.7 : 6.5, dir: k % 2 ? -1 : 1, off: k * 31 };
    scene.add(g); autos_.push(g);
  }
}
const ventanasAutos = [[0, T.cinco - 0.2], [T.cruza - 0.4, T.d5]];
function autos(t) {
  const activo = ventanasAutos.some(([a, b]) => t >= a && t < b);
  autos_.forEach((g) => {
    const { carril, dir, off } = g.userData; const x = ((t * 11 + off) % 120) - 60;
    g.visible = activo; g.position.set(dir * x, 0, carril); g.rotation.y = dir > 0 ? 0 : Math.PI;
  });
}

// ---------- cámaras ----------
const cxM = -4.6, cxL = 4.6;
const front = (cx) => ({ p: [cx, 5.6, 14.5], l: [cx, 1.9, 0.6], f: 46 });
const frontB = (cx) => ({ p: [cx, 4.3, 14.5], l: [cx, 4.5, 0.6], f: 46 });
const kTop0 = { p: [0, 6.2, 19.5], l: [0, 2.5, 1.5], f: 52 };
const interiorM = { p: [cxM - 0.2, 2.9, 4.2], l: [cxM + 0.1, 1.5, -1.0], f: 70 };
const cajaL = { p: [cxL + 0.6, 2.7, 3.4], l: [cxL + 1.5, 1.4, -0.5], f: 70 };
const aereo = { p: [14, 40, 26], l: [16, 0, -12], f: 62 };
const topMoves = [
  [T.cuadra - 0.3, { p: [0, 7.4, 17.5], l: [0, 1.6, 2.5], f: 56 }, 2.6],
  [T.cinco - 0.1, front(cxM), 0.9],
  [T.persiana - 0.9, { p: [cxM, 3.4, 10.5], l: [cxM, 2.0, 2.6], f: 52 }, 0.7],
  [T.suerte + 0.1, front(cxM), 1.0],
  [T.d1 - 0.4, interiorM, 0.9],
  [T.d2 - 0.2, front(cxM), 0.8],
  [T.deTodo - 0.3, { p: [cxM, 13.5, 1.2], l: [cxM, 0.6, -4.4], f: 50 }, 1.0],
  [T.d4 - 0.2, front(cxM), 0.8],
  [T.pedian - 0.9, { p: [cxM - 0.9, 2.4, 3.6], l: [cxM + 0.9, 1.45, -0.2], f: 70 }, 0.8],
  [T.nohay - 0.05, { p: [cxM + 0.2, 2.3, 4.0], l: [cxM + 1.5, 1.6, -0.2], f: 50 }, 0.3, E.o5],
  [T.cruza - 0.1, { p: [0, 6.5, 17.0], l: [0, 1.2, 3.2], f: 60 }, 0.9],
  [T.d5 - 0.2, front(cxM), 0.8],
  [T.finMes - 0.3, { p: [cxM + 2.0, 2.7, 3.4], l: [cxM + 2.4, 1.5, 0.4], f: 56 }, 0.8],
  [T.d6 - 0.1, front(cxM), 0.8],
  [T.inflacion - 0.4, { p: [cxM - 0.7, 1.9, 3.0], l: [cxM - 0.7, 1.35, -2.0], f: 62 }, 0.8],
  [T.d7 - 0.1, { p: [cxM + 1.0, 2.6, 3.4], l: [cxM + 2.2, 1.6, 0.2], f: 62 }, 0.8],
  [T.loco - 0.1, front(cxM), 0.9],
  [T.mas - 0.4, { p: [cxM - 0.3, 4.0, 10.0], l: [cxM - 0.3, 1.7, 0.6], f: 58 }, 0.9],
  [T.cierre - 0.3, { p: [cxM, 5.0, 13.0], l: [cxM, 2.0, 1.5], f: 46 }, 0.8],
];
const kBot0 = frontB(cxL);
const botMoves = [
  [T.tres - 0.5, { p: [14, 46, 38], l: [2, 0, -10], f: 62 }, 1.2],
  [T.suerte + 0.1, frontB(cxL), 1.0],
  [T.lucas1 - 0.3, { p: [cxL + 0.9, 2.5, 2.9], l: [cxL + 2.0, 1.55, -0.4], f: 62 }, 0.9],
  [T.contrato - 0.1, cajaL, 0.8],
  [T.d2 - 0.2, frontB(cxL), 0.8],
  [T.d4 - 0.2, { p: [cxL - 0.7, 2.2, 2.6], l: [cxL - 0.7, 1.95, -2.0], f: 58 }, 0.8],
  [T.pedian - 0.3, frontB(cxL), 0.6],
  [T.d5 - 0.2, { p: [cxL + 1.0, 2.6, 3.2], l: [cxL + 2.2, 1.6, 0.2], f: 60 }, 0.8],
  [T.d6 - 0.1, frontB(cxL), 0.8],
  [T.sueldo - 0.3, cajaL, 0.8],
  [T.datos - 0.2, aereo, 1.6],
  [T.abrio - 0.7, { p: [BX + 2, 30, 8], l: [BX + 2, 1, -BZ + 1.5], f: 50 }, 0.9],
  [T.loco - 0.1, frontB(cxL), 0.9],
  [T.cierre - 0.3, { p: [-4, 40, 44], l: [0, 0, -6], f: 62 }, 1.2],
];
// divisor: alto en px de la cámara de arriba
const divMoves = [
  [T.cinco - 0.1, 960, 0.6], [T.d1 - 0.4, 1120, 0.5], [T.lucas1 - 0.25, 760, 0.5], [T.d2 - 0.2, 960, 0.5],
  [T.deTodo - 0.3, 1120, 0.5], [T.d4 - 0.25, 760, 0.5], [T.pedian - 0.9, 1920, 0.6], [T.d5 - 0.25, 960, 0.6],
  [T.finMes - 0.3, 1120, 0.5], [T.d6 - 0.15, 960, 0.5], [T.inflacion - 0.4, 1920, 0.6], [T.d7 - 0.1, 1120, 0.5],
  [T.sueldo - 0.3, 760, 0.5], [T.datos - 0.2, 0, 0.8], [T.loco - 0.15, 960, 0.6],
];
export const divisor = (t) => track(t, 1920, divMoves);
export const anio = (t) => track(t, 0, [[T.cinco, 5, 1.1, E.io], [T.suerte + 0.1, 0, 1.0, E.io], [T.anio, 1, 0.6, E.io], [T.abrio + 0.2, 3, 0.8, E.io], [T.primer - 0.3, 1, 0.6, E.io], [T.anio3, 3, 0.6, E.io], [T.cierre, 5, 0.8, E.io]]);
export const dimTop = (t) => track(t, 0, [[T.lucas1 - 0.25, 0.42, 0.4], [T.d2 - 0.2, 0, 0.4], [T.d4 - 0.25, 0.42, 0.4], [T.pedian - 0.9, 0, 0.4], [T.sueldo - 0.3, 0.42, 0.4], [T.datos, 0, 0.3]]);
export const dimBot = (t) => track(t, 0, [[T.d1 - 0.4, 0.42, 0.4], [T.lucas1 - 0.25, 0, 0.4], [T.deTodo - 0.3, 0.42, 0.4], [T.d4 - 0.25, 0, 0.4], [T.finMes - 0.3, 0.42, 0.4], [T.d6 - 0.15, 0, 0.4], [T.d7 - 0.1, 0.42, 0.4], [T.sueldo - 0.3, 0, 0.4]]);
// decisión que se está contando (0 = ninguna)
export const decision = (t) => (t < T.d1 - 0.1 || t >= T.loco - 0.1 ? 0 : t < T.d2 - 0.1 ? 1 : t < T.d3 - 0.1 ? 2 : t < T.d4 - 0.1 ? 3 : t < T.d5 - 0.1 ? 4 : t < T.d6 - 0.1 ? 5 : t < T.d7 - 0.1 ? 6 : 7);

function aplicaCam(cam, k, h) {
  cam.position.set(...k.p); cam.lookAt(...k.l);
  const aspect = W / Math.max(1, h);
  const hf = (k.f * Math.PI) / 180; // campo horizontal fijo: el ancho del cuadro no cambia con el divisor
  cam.fov = (2 * Math.atan(Math.tan(hf / 2) / aspect) * 180) / Math.PI; cam.aspect = aspect; cam.updateProjectionMatrix();
}
export function render(t) {
  estado(t);
  const d = Math.round(divisor(t));
  aplicaCam(camTop, camTrack(t, kTop0, topMoves), d);
  aplicaCam(camBot, camTrack(t, kBot0, botMoves), H - d);
  renderer.setScissorTest(true);
  renderer.shadowMap.needsUpdate = true;
  if (d > 1) { renderer.setViewport(0, H - d, W, d); renderer.setScissor(0, H - d, W, d); renderer.render(scene, camTop); }
  if (H - d > 1) { renderer.setViewport(0, 0, W, H - d); renderer.setScissor(0, 0, W, H - d); renderer.render(scene, camBot); }
  return { d };
}
const v = new THREE.Vector3();
export function aPantalla(obj, local, mitad, t) {
  const d = Math.round(divisor(t));
  const cam = mitad === "top" ? camTop : camBot; const h = mitad === "top" ? d : H - d; const y0 = mitad === "top" ? 0 : d;
  obj.updateWorldMatrix(true, false); v.set(...local).applyMatrix4(obj.matrixWorld).project(cam);
  return { x: (v.x * 0.5 + 0.5) * W, y: y0 + (-v.y * 0.5 + 0.5) * h, vis: h > 40 && v.z < 1, y0, h };
}
export const objetos = { M, L, S2, S3, scene, anillo, cliente, mundo: scene };
