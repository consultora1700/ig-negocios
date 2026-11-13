// Mundo 3D del reel «Dos almacenes». Todo lo visible es función de t (segundos).
// Pantalla partida: cámara de arriba (Martín) y de abajo (Lucas); el divisor d(t) es el alto de la de arriba, en px.
import * as THREE from "./lib/three.module.min.js";
import { RoundedBoxGeometry } from "./lib/RoundedBoxGeometry.js";

const W = 1080, H = 1920;
const C = {
  // EL MÉTODO EMPRESARIAL: negro dominante, plata para la materia, azul eléctrico solo para Lucas y el crecimiento
  cielo: "#000000", baldosa: "#1A1C21", junta: "#272A31", calle: "#07080A", tinta: "#000000",
  martin: "#9299A3", lucas: "#007BFF", oro: "#E5E7EB", carton: "#3A3E46", madera: "#2A2D33",
  pared: "#2E3138", piso: "#1E2126", gris: "#9299A3", delantal: "#2A2D33",
};
// ---------- tiempos (anclados a la voz) ----------
export const T = {
  cuadra: 1.48, plata: 2.32, dia: 3.28, cinco: 4.8, tres: 6.36, persiana: 8.55, suerte: 10.3,
  cajero: 12.42, repositor: 13.02, desde: 13.4, lucasNo: 14.48, atendio: 15.33, anio: 16.77, noLoEs: 18.73,
  vende: 20.35, fiarle: 21.33, escapa: 22.37, contrato: 24.01, sabia: 24.97, sueldos: 26.77, nunca: 29.14,
  cuaderno: 31.02, deposito: 43.02, parada: 44.27, vencidas: 45.75, repetidas: 46.79, lucasCompra: 47.66,
  segunda: 49.94, tercio: 52.26, abrio: 55.41, pero: 56.11, diez: 66.36, plataY: 67.57, ocho: 69.46,
  cadaVez: 70.05, sentia: 72.48, llena: 74.27, loco: 75.64, primer: 76.55, mas1: 79.07, mas2: 80.14, mas3: 81.13,
  dif: 82.22, cual: 93.97, FIN: 97,
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
  g.fillStyle = "#0E0F12"; g.fillRect(0, 0, w, h);
  const gr = g.createLinearGradient(0, h * 0.34, 0, h * 0.68); gr.addColorStop(0, "#FFFFFF"); gr.addColorStop(0.35, "#E5E7EB"); gr.addColorStop(0.7, "#BFC4CC"); gr.addColorStop(1, "#9299A3");
  g.fillStyle = gr; g.fillRect(0, h * 0.34, w, h * 0.34);
  g.fillStyle = "#000000"; g.font = "900 68px Montserrat"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("YERBA", w / 2, h * 0.51);
  g.fillStyle = "#E5E7EB"; g.font = "800 34px Montserrat"; g.fillText("1 kg", w / 2, h * 0.82);
  g.fillStyle = "#009DFF"; g.fillRect(w * 0.2, h * 0.16, w * 0.6, 10);
});
const texVencido = tex(256, 256, (g, w, h) => {
  g.fillStyle = C.carton; g.fillRect(0, 0, w, h); g.save(); g.translate(w / 2, h / 2); g.rotate(-0.35);
  g.strokeStyle = "#FFFFFF"; g.lineWidth = 12; g.strokeRect(-110, -40, 220, 80);
  g.fillStyle = "#FFFFFF"; g.font = "900 46px Montserrat"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("VENCIDO", 0, 3); g.restore();
});
const texCarton = tex(256, 256, (g, w, h) => {
  g.fillStyle = C.carton; g.fillRect(0, 0, w, h); g.fillStyle = "#9299A3"; g.fillRect(w * 0.42, 0, w * 0.16, h);
  g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4);
});
const texBillete = tex(256, 128, (g, w, h) => {
  g.fillStyle = "#E5E7EB"; g.fillRect(0, 0, w, h); g.strokeStyle = "#9299A3"; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = "#007BFF"; g.beginPath(); g.arc(w / 2, h / 2, 34, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#FFFFFF"; g.font = "900 44px Montserrat"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("$", w / 2, h / 2 + 2);
});

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
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
const scene = new THREE.Scene(); scene.background = new THREE.Color(C.cielo);
scene.fog = new THREE.Fog(C.cielo, 55, 140);
scene.add(new THREE.HemisphereLight("#E5E7EB", "#1B1E23", 1.25));
// luz de estudio dentro de cada local, para que la maqueta se lea sobre el negro
for (const x of [-4.6, 4.6]) { const lz = new THREE.PointLight("#FFFFFF", 22, 11, 1.6); lz.position.set(x, 3.4, 1.4); scene.add(lz); }
const sol = new THREE.DirectionalLight("#FFFFFF", 3.0); sol.position.set(-14, 26, 18); sol.castShadow = true;
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
const tonos = ["#16181C", "#1B1E23", "#202328", "#26292F", "#1D2025", "#23262C"];
function manzana(cx, cz, nuestra, plaza, hueco) {
  const base = box(BX - 7, 0.3, BZ - 7, mat(C.baldosa, { map: texBaldosa }), 0.05); base.position.set(cx, 0.15, cz); scene.add(base);
  const piezas = [];
  if (plaza) {
    const pasto = box(BX - 10, 0.12, BZ - 10, mat("#101215"), 0.05); pasto.position.set(cx, 0.36, cz); scene.add(pasto);
    const ra = rng(3);
    for (let k = 0; k < 9; k++) {
      const x = cx + (k % 2 ? 1 : -1) * (8.5 + (ra() - 0.5) * 1.5), z = cz - 5.5 + Math.floor(k / 2) * 3 + (ra() - 0.5);
      if (k >= 0) continue; // sin árboles: la marca no admite verdes
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
    const techo = box(w - 0.5, 0.25, d - 0.5, mat("#33373E"), 0.06); techo.position.set(x, 0.3 + h + 0.12, z); scene.add(techo);
    piezas.push(b, techo);
  }
  return piezas;
}
for (let i = -3; i <= 3; i++) for (let j = -3; j <= 2; j++) manzana(i * BX, j * BZ - 4.5, i === 0 && j === 0, i === 0 && j === 1, (i === 1 && j === -1) || (i === -1 && j === 0));

// ---------- personas ----------
function persona(remera, delantal) {
  const g = new THREE.Group();
  const cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.62, 6, 16), mat(remera)); cuerpo.position.y = 0.68; cuerpo.castShadow = true; g.add(cuerpo);
  if (delantal) { const dl = box(0.5, 0.62, 0.08, mat(C.delantal), 0.03); dl.position.set(0, 0.62, 0.31); g.add(dl); }
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), mat("#E5E7EB", { metalness: 0.25, roughness: 0.45 })); cabeza.position.y = 1.36; cabeza.castShadow = true; g.add(cabeza);
  const pelo = new THREE.Mesh(new THREE.SphereGeometry(0.31, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), mat("#0E0F12")); pelo.position.y = 1.38; g.add(pelo);
  for (const s of [-1, 1]) { const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mat(C.tinta)); ojo.position.set(0.1 * s, 1.38, 0.27); g.add(ojo); }
  return g;
}

// ---------- almacén ----------
function almacen(nombre, color, seed) {
  const g = new THREE.Group(); const r = rng(seed);
  const piso = box(7, 0.2, 5, mat(C.piso), 0.03); piso.position.set(0, 0.4, 0); g.add(piso);
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
  const lado = box(0.14, 3.0, 0.75, mat("#9299A3", { metalness: 0.5, roughness: 0.4 })); lado.position.set(-gx / 2, 2.0, 0); gond.add(lado);
  const lado2 = lado.clone(); lado2.position.x = gx / 2; gond.add(lado2);
  const prods = [];
  const colores = ["#E5E7EB", "#BFC4CC", "#9299A3", "#FFFFFF", "#BFC4CC", "#9299A3", "#E5E7EB", "#0057D9"];
  [1.05, 1.95, 2.85].forEach((y, fila) => {
    const est = box(gx, 0.08, 0.75, mat("#9299A3", { metalness: 0.5, roughness: 0.4 }), 0.02); est.position.set(0, y - 0.04, 0); gond.add(est);
    for (let i = 0; i < 10; i++) {
      let p;
      if (fila === 1) { p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.62, 0.26), [mat("#0E0F12"), mat("#0E0F12"), mat("#0E0F12"), mat("#0E0F12"), new THREE.MeshStandardMaterial({ map: texYerba, roughness: 0.8 }), mat("#0E0F12")]); p.position.set(-gx / 2 + 0.3 + i * 0.49, y + 0.31, 0.05); }
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
  const emp = [persona("#BFC4CC", true), persona("#BFC4CC", true), persona("#BFC4CC", true)]; emp.forEach((e) => g.add(e));
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
  g.position.set(x, 0, z); g.scale.setScalar(2.2); g.userData = { enZona, t0: T.tercio + 0.05 + i * 0.085 }; scene.add(g); pines.push(g);
}
const anillo = new THREE.Mesh(new THREE.TorusGeometry(10, 0.35, 12, 64), mat("#00CFFF", { emissive: "#009DFF", emissiveIntensity: 0.5 }));
anillo.rotation.x = Math.PI / 2; anillo.position.set(BX + 2, 0.4, -BZ + 0.6); scene.add(anillo);
// polvo (persiana que cae)
const polvo = []; const rpo = rng(5);
for (let i = 0; i < 34; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.06 + rpo() * 0.09, 8, 6), new THREE.MeshStandardMaterial({ color: "#6B7079", transparent: true, opacity: 0.8, roughness: 1 })); p.userData = { a: rpo() * Math.PI, v: 0.6 + rpo() * 1.4 }; M.g.add(p); polvo.push(p); }

// ---------- estado por tiempo ----------
const posDueno = new THREE.Vector3(2.15, 0.5, -0.35);
const posCajero = new THREE.Vector3(1.6, 0.5, -0.35), posRepo = new THREE.Vector3(-2.4, 0.5, -1.0), posEmp3 = new THREE.Vector3(-0.2, 0.5, 0.2);
const BILL_CAJA = new THREE.Vector3(2.45, 1.95, 0.6);

function persianaAbierta(s, u) { // u: 0 abierta (enrollada) .. 1 cerrada
  s.lam.scale.y = Math.max(0.001, u); s.lam.position.y = -1.575 * u; s.lam.visible = u > 0.002;
}
function aparecer(o, t, a, d = 0.55) { const u = P(t, a, d, E.back); o.visible = t >= a; o.scale.setScalar(Math.max(0.001, u)); }

function estado(t) {
  // AÑO (para la HUD y estados de “futuro”)
  const futuro = t >= T.cinco && t < T.suerte + 0.15;                 // gancho en el año 5
  const rew = P(t, T.suerte + 0.1, 1.1, E.io3);                         // rebobinado
  const fin = t >= T.cual;
  // persianas: suben al inicio; la de Martín cae en el año 5 y al final
  const subir = 1 - P(t, 0.25, 1.1, E.io3);
  let pM = subir, pL = subir;
  if (futuro || fin) { const a = fin ? T.cual + 0.15 : T.persiana - 0.35; pM = Math.max(pM, P(t, a, 0.38, E.bounce)); }
  if (t >= T.suerte + 0.1 && !fin) pM = Math.max(subir, 1 - rew);
  persianaAbierta(M, pM); persianaAbierta(L, pL);
  // golpe + polvo
  const golpe = fin ? T.cual + 0.5 : T.persiana;
  polvo.forEach((p) => { const u = clamp((t - golpe) / 1.3); const ok = u > 0 && u < 1 && (fin || futuro); p.visible = ok; if (ok) { const r = 0.4 + E.o3(u) * 2.4 * p.userData.v; p.position.set(Math.cos(p.userData.a) * r * 1.6, 0.3 + E.o3(u) * 0.9, 3.0 + Math.sin(p.userData.a) * 0.8); p.material.opacity = 0.85 * (1 - u); p.scale.setScalar(1 + u * 0.6); } });
  // cartel SE ALQUILA (se balancea)
  const ta = fin ? T.cual + 0.7 : T.persiana + 0.35;
  const alqOn = (futuro || fin) && t >= ta && !(t >= T.suerte + 0.1 && !fin);
  M.alqPiv.visible = alqOn; if (alqOn) { const u = t - ta; M.alqPiv.rotation.z = Math.sin(u * 6) * 0.35 * Math.exp(-u * 1.6); M.alqPiv.scale.setScalar(P(t, ta, 0.3, E.back)); }
  L.alqPiv.visible = false;
  // sucursales de Lucas
  const s3 = (futuro ? P(t, T.tres + 0.4, 0.6, E.back) : 0) * (1 - rew * (t < T.cual ? 1 : 0)) + (fin ? P(t, T.cual + 0.3, 0.6, E.back) : 0);
  const s2 = futuro ? P(t, T.tres + 0.1, 0.6, E.back) * (1 - rew) : t >= T.abrio - 0.4 ? 1 : 0;
  S3.g.visible = s3 > 0.001; S3.g.scale.setScalar(Math.max(0.001, s3));
  S2.g.visible = s2 > 0.001;
  if (!futuro && t >= T.abrio - 0.4 && t < T.abrio + 0.6) { const u = P(t, T.abrio - 0.4, 0.55, E.i3); S2.g.position.y = 30 * (1 - u); S2.g.scale.setScalar(1); }
  else { S2.g.position.y = 0; S2.g.scale.setScalar(Math.max(0.001, futuro ? s2 : 1)); }
  persianaAbierta(S2, 0); persianaAbierta(S3, 0);
  // dueños / empleados de Martín
  const sale = P(t, T.desde, 1.0, E.io);
  const vuelve = t >= T.loco; // año 1 en el bloque G: Martín no está, sí 3 empleados
  M.dueno.visible = t < T.desde + 1.0 || fin;
  const pd = lerp3([posDueno.x, posDueno.y, posDueno.z], [6.5, 0.5, 4.2], sale);
  M.dueno.position.set(...pd); M.dueno.rotation.y = sale > 0 && sale < 1 ? 0.9 : 0;
  if (t < T.cajero) { M.emp[0].visible = false; M.emp[1].visible = false; }
  else { M.emp[0].position.copy(posCajero); aparecer(M.emp[0], t, T.cajero); M.emp[1].position.copy(posRepo); aparecer(M.emp[1], t, T.repositor); }
  M.emp[2].position.copy(posEmp3); aparecer(M.emp[2], t, T.mas1 + 0.2);
  if (t < T.mas1) M.emp[2].visible = false;
  if (t < T.loco && t > T.cual) {}
  // Lucas
  L.dueno.position.copy(posDueno); L.dueno.visible = true;
  L.emp[0].position.set(0.9, 0.5, -0.1); aparecer(L.emp[0], t, T.contrato + 0.3); if (t < T.contrato + 0.3) L.emp[0].visible = false;
  L.emp[1].visible = false; L.emp[2].visible = false;
  // Lucas atiende: producto que cruza el mostrador
  // monedas (capital)
  const nM0 = 10, nL0 = 10;
  let nM = nM0, nL = nL0;
  if (futuro) { const u = P(t, T.cinco, 1.2, E.io); nM = Math.round(lerp(10, 0, u)); nL = Math.round(lerp(10, 24, u)); }
  if (t >= T.suerte + 0.1 && t < T.sueldos) { nM = Math.round(lerp(0, 10, rew)); nL = Math.round(lerp(24, 10, rew)); }
  if (t >= T.sueldos + 0.4) { const k = Math.min(3, Math.floor((t - T.sueldos - 0.4) / 0.5) + 1); nM = 10 - 2 * k; }
  const showCoins = t < T.cuaderno || fin;
  if (fin) { nM = 0; nL = 24; }
  coins(M, nM, showCoins, t); coins(L, nL, showCoins, t);
  // yerba de Martín (fila 1)
  yerba(M, t); yerbaLucas(L, t);
  // billetes de la caja de Martín
  billetesM(t); L.billetes.forEach((b) => (b.visible = false));
  // pines
  pines.forEach((p) => { const a = p.userData.t0; const u = P(t, a, 0.45, E.bounce); p.visible = t >= a && t < T.pero + 0.5; p.position.y = 14 * (1 - u); let z = t > T.tercio + 2.6 && !p.userData.enZona ? 1.3 : 2.2; if (p.userData.enZona) z *= 1 - P(t, T.abrio - 0.5, 0.35, E.i3); p.visible = p.visible && z > 0.01; p.scale.setScalar(Math.max(0.001, z)); });
  anillo.visible = t >= T.tercio + 2.4 && t < T.pero + 0.5; anillo.scale.setScalar(Math.max(0.001, P(t, T.tercio + 2.4, 0.5, E.back)));
  // cajón de Martín abierto y billetes que se escapan (B)
  M.cajon.position.z = 0.1 + 0.35 * (P(t, T.nunca, 0.35) * (1 - P(t, T.cuaderno - 0.3, 0.3)));
  // depósitos
  deposito(t);
  // clientes (movimiento, bloque G)
  clientes(t);
}
function coins(S, n, show, t) {
  S.monedas.forEach((m, i) => {
    const vis = show && i < n; m.visible = vis;
    const col = Math.floor(i / 13), k = i % 13;
    m.position.set(-4.6 + col * 0.95, 0.36 + k * 0.115, 2.9 - col * 0.2);
  });
  // aparición inicial al decir «misma plata»
  const u = P(t, T.plata - 0.1, 0.5, E.back);
  S.monedas.forEach((m) => m.scale.setScalar(t < T.cinco ? Math.max(0.001, u) : 1));
  if (t < T.plata - 0.1) S.monedas.forEach((m) => (m.visible = false));
}
// Yerba de Martín: 10 → vendidas → vuelven 8 → 6 → 5 → 4
function yerba(S, t) {
  const fila = S.prods.filter((p) => p.fila === 1);
  fila.forEach(({ m }, i) => {
    const b = m.userData.base; let x = b.x, y = b.y, z = b.z, s = 1, vis = true;
    const vende = T.diez - 0.3 + i * 0.1;               // se van al mostrador
    const vuelve = T.plataY + 1.25 + i * 0.09;          // 8 vuelven
    const sale2 = i >= 6 ? T.cadaVez + 0.3 + (9 - i) * 0.12 : i === 5 ? T.cadaVez + 0.85 : i === 4 ? T.cadaVez + 1.35 : 1e9;
    const enG = t >= T.loco; // año 1: estante lleno otra vez
    if (!enG && t >= vende) {
      const u = P(t, vende, 0.4, E.io);
      if (u < 1) { x = lerp(b.x, 3.3, u); y = b.y + Math.sin(u * Math.PI) * 1.2; z = lerp(b.z, 2.6, u); s = 1 - u * 0.7; }
      else vis = false;
      if (i < 8 && t >= vuelve) { const v = P(t, vuelve, 0.35, E.bounce); vis = true; x = b.x; z = b.z; y = b.y + 1.6 * (1 - v); s = 1; }
      if (t >= sale2) { const w = P(t, sale2, 0.3, E.io); if (w < 1) { x = b.x; y = b.y + w * 0.9; z = b.z + w * 1.5; s = 1 - w; } else vis = false; }
    }
    m.position.set(x, y, z); m.scale.setScalar(Math.max(0.001, s)); m.visible = vis;
  });
}
function yerbaLucas(S, t) { S.prods.forEach(({ m }) => { m.position.copy(m.userData.base); m.scale.setScalar(1); m.visible = true; }); }
function billetesM(t) {
  const enCaja = (i) => [2.45 + ((i * 37) % 7 - 3) * 0.04, 1.93 + Math.floor(i / 3) * 0.03, 0.6 + ((i * 53) % 5 - 2) * 0.05];
  M.billetes.forEach((b, i) => {
    let vis = false, p = [0, 0, 0], ry = (i * 0.7) % 1.2 - 0.6;
    // F: entran 10 billetes al vender
    const entra = T.diez - 0.1 + i * 0.1, salen = T.plataY + 0.15 + i * 0.05;
    if (i < 10 && t >= entra && t < T.loco) {
      const u = P(t, entra, 0.35, E.o3); vis = true; p = lerp3([2.45, 3.0, 1.4], enCaja(i), u);
      if (t >= salen && t < T.sentia) { const w = P(t, salen, 0.5, E.i3); p = lerp3(enCaja(i), [9, 3.5, 3], w); vis = w < 1; }
    }
    // caja llena (ilusión): se apilan 26 billetes
    const llena = T.sentia + 0.1 + i * 0.07;
    if (t >= llena && t < T.loco) { const u = P(t, llena, 0.3, E.bounce); vis = true; const k = enCaja(i); p = [k[0], k[1] + 0.25 + 0.8 * (1 - u) + i * 0.012, k[2]]; }
    // B: billetes que se escapan del cajón
    const esc = T.nunca + 0.45 + i * 0.12;
    if (i < 8 && t >= esc && t < T.cuaderno) { const u = P(t, esc, 0.9, E.i3); vis = u < 1; p = [2.45 + Math.sin(i) * 0.2, 1.7 - u * 1.4, 0.95 + u * 0.8]; ry = u * 4 + i; }
    b.visible = vis; b.position.set(...p); b.rotation.set(vis && t < T.cuaderno ? 0.6 : 0, ry, 0);
  });
}
// Depósitos: Martín desordenado (vencidas + repetidas), Lucas ordenado (poco y seguido)
const cajasM = [], cajasL = [];
{
  const r = rng(41);
  for (let i = 0; i < 16; i++) {
    const v = i === 2 || i === 7 || i === 11; // vencidas
    const m = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.75, 0.75, 2, 0.04), [0, 1, 2, 3, 4, 5].map((f) => new THREE.MeshStandardMaterial({ map: f === 2 && v ? texVencido : texCarton, roughness: 0.9 })));
    m.castShadow = m.receiveShadow = true;
    const col = i % 6, row = Math.floor(i / 6);
    m.position.set(-2.7 + col * 1.05 + (r() - 0.5) * 0.4, 0.88 + row * 0.76 - (row ? 0.02 : 0), -4.6 + (r() - 0.5) * 1.8);
    m.rotation.y = (r() - 0.5) * 0.9; m.userData = { v, base: m.position.clone(), rep: i === 4 || i === 9 };
    M.g.add(m); cajasM.push(m);
  }
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.75, 0.75, 2, 0.04), new THREE.MeshStandardMaterial({ map: texCarton, roughness: 0.9 }));
    m.castShadow = m.receiveShadow = true; m.position.set(-2.4 + (i % 3) * 1.1, 0.88 + Math.floor(i / 3) * 0.78, -5.6); m.userData = { base: m.position.clone() };
    L.g.add(m); cajasL.push(m);
  }
  for (let i = 0; i < 3; i++) { // entregas chicas y seguidas
    const m = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.55, 0.55, 2, 0.04), new THREE.MeshStandardMaterial({ map: texCarton, roughness: 0.9 }));
    m.castShadow = true; m.userData = { base: new THREE.Vector3(1.4 + i * 0.85, 0.78, -4.3) }; L.g.add(m); cajasL.push(m);
  }
}
function deposito(t) {
  cajasM.forEach((m) => { const pulse = m.userData.v && t >= T.vencidas ? 1 + 0.12 * Math.sin(clamp((t - T.vencidas) / 0.5) * Math.PI) : 1; m.scale.setScalar(pulse); });
  cajasL.slice(6).forEach((m, i) => { const a = T.lucasCompra + 0.5 + i * 0.55; const u = P(t, a, 0.45, E.o3); m.visible = t >= a; const b = m.userData.base; m.position.set(b.x, b.y, lerp(b.z + 6, b.z, u)); });
}
const clientes3 = [persona("#E5E7EB"), persona("#9299A3"), persona("#BFC4CC")]; clientes3.forEach((c) => M.g.add(c));
function clientes(t) {
  clientes3.forEach((c, i) => { const a = T.mas3 + i * 0.25; const u = P(t, a, 1.1, E.io); c.visible = t >= a && t < T.dif + 0.2; c.position.set(lerp(-6 + i * 1.2, -1.5 + i * 1.3, u), 0.5, lerp(4.8, 1.2 + (i % 2) * 0.6, u)); c.rotation.y = Math.PI * (u < 1 ? -0.15 : 1); });
}

// ---------- cámaras ----------
const cxM = -4.6, cxL = 4.6;
const front = (cx) => ({ p: [cx, 5.6, 14.5], l: [cx, 1.9, 0.6], f: 46 });
const kTop0 = { p: [0, 6.2, 19.5], l: [0, 2.5, 1.5], f: 52 };
const topMoves = [
  [T.cuadra - 0.3, { p: [0, 7.4, 17.5], l: [0, 1.6, 2.5], f: 56 }, 2.6],
  [T.cinco - 0.1, front(cxM), 0.9],
  [T.persiana - 0.9, { p: [cxM, 3.4, 10.5], l: [cxM, 2.0, 2.6], f: 52 }, 0.7],
  [T.suerte + 0.1, front(cxM), 1.1],
  [T.cajero - 0.6, { p: [cxM - 0.2, 2.9, 4.2], l: [cxM + 0.1, 1.5, -1.0], f: 70 }, 0.9],
  [T.sueldos - 0.3, { p: [cxM - 1.6, 3.6, 8.6], l: [cxM - 1.4, 1.3, 1.6], f: 62 }, 0.9],
  [T.nunca, { p: [cxM + 2.4, 3.6, 5.6], l: [cxM + 2.4, 1.6, 0.6], f: 46 }, 0.8],
  [T.cuaderno, front(cxM), 0.8],
  [T.deposito - 0.2, { p: [cxM, 13.5, 1.2], l: [cxM, 0.6, -4.4], f: 50 }, 1.2],
  [T.pero - 0.1, front(cxM), 1.2],
  [T.diez - 0.75, { p: [cxM - 0.7, 1.9, 3.0], l: [cxM - 0.7, 1.35, -2.0], f: 62 }, 0.9],
  [T.sentia - 0.1, { p: [cxM + 0.4, 2.9, 3.4], l: [cxM + 0.7, 1.55, -0.8], f: 74 }, 0.9],
  [T.loco, front(cxM), 1.0],
  [T.mas1 - 0.4, { p: [cxM - 0.3, 4.0, 10.0], l: [cxM - 0.3, 1.7, 0.6], f: 58 }, 0.9],
  [T.cual - 0.3, { p: [cxM, 5.0, 13.0], l: [cxM, 2.0, 1.5], f: 46 }, 0.8],
];
const frontB = (cx) => ({ p: [cx, 4.3, 14.5], l: [cx, 4.5, 0.6], f: 46 });
const kBot0 = frontB(cxL);
const botMoves = [
  [T.tres - 0.5, { p: [14, 46, 38], l: [2, 0, -10], f: 62 }, 1.2],
  [T.suerte + 0.1, frontB(cxL), 1.1],
  [T.lucasNo - 0.3, { p: [cxL + 0.9, 2.5, 2.9], l: [cxL + 2.0, 1.55, -0.4], f: 62 }, 0.9],
  [T.noLoEs, { p: [cxL + 1.4, 2.2, 1.9], l: [cxL + 2.1, 1.75, -0.4], f: 50 }, 0.35, E.o5],
  [T.vende - 0.3, { p: [cxL + 0.2, 2.5, 3.0], l: [cxL + 1.7, 1.7, -0.6], f: 66 }, 0.8],
  [T.contrato, { p: [cxL + 0.6, 2.7, 3.4], l: [cxL + 1.5, 1.4, -0.5], f: 70 }, 0.8],
  [T.cuaderno, frontB(cxL), 0.8],
  [T.lucasCompra - 0.2, { p: [cxL, 13.5, 1.2], l: [cxL, 0.6, -4.4], f: 50 }, 1.0],
  [T.segunda - 0.1, { p: [14, 40, 26], l: [16, 0, -12], f: 62 }, 1.8],
  [T.abrio - 0.7, { p: [BX + 2, 30, 8], l: [BX + 2, 1, -BZ + 1.5], f: 50 }, 0.9],
  [T.pero - 0.1, frontB(cxL), 1.2],
  [T.llena - 0.3, { p: [cxL - 0.7, 2.2, 2.6], l: [cxL - 0.7, 1.95, -2.0], f: 58 }, 0.8],
  [T.loco, frontB(cxL), 1.0],
  [T.cual - 0.3, { p: [-4, 40, 44], l: [0, 0, -6], f: 62 }, 1.2],
];
// divisor: alto en px de la cámara de arriba
const divMoves = [
  [T.cinco - 0.1, 960, 0.6], [T.cajero - 0.7, 1120, 0.5], [T.lucasNo - 0.25, 760, 0.5], [T.sueldos - 0.3, 1120, 0.5],
  [T.cuaderno - 0.2, 960, 0.5], [T.deposito - 0.2, 1120, 0.5], [T.lucasCompra - 0.25, 760, 0.5], [T.segunda - 0.1, 0, 0.8],
  [T.pero - 0.2, 960, 0.7], [T.diez - 0.75, 1920, 0.6], [T.llena - 0.3, 1060, 0.5], [T.loco - 0.1, 960, 0.6],
];
export const divisor = (t) => track(t, 1920, divMoves);
// año que muestra el contador
export const anio = (t) => track(t, 0, [[T.cinco, 5, 1.1, E.io], [T.suerte + 0.1, 0, 1.1, E.io], [T.anio, 1, 0.6, E.io], [T.segunda + 0.3, 3, 0.8, E.io], [T.primer - 0.3, 1, 0.6, E.io], [T.cual, 5, 0.8, E.io]]);
// atenuación de la mitad que no protagoniza (0..1)
export const dimTop = (t) => track(t, 0, [[T.lucasNo - 0.25, 0.42, 0.4], [T.sueldos - 0.3, 0, 0.4], [T.lucasCompra - 0.25, 0.42, 0.4], [T.segunda, 0, 0.3]]);
export const dimBot = (t) => track(t, 0, [[T.cajero - 0.7, 0.42, 0.4], [T.lucasNo - 0.25, 0, 0.4], [T.sueldos - 0.3, 0.42, 0.4], [T.cuaderno - 0.2, 0, 0.4], [T.deposito - 0.2, 0.42, 0.4], [T.lucasCompra - 0.25, 0, 0.4]]);

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
// proyección de un punto local de un objeto a px de pantalla en su mitad
const v = new THREE.Vector3();
export function aPantalla(obj, local, mitad, t) {
  const d = Math.round(divisor(t));
  const cam = mitad === "top" ? camTop : camBot; const h = mitad === "top" ? d : H - d; const y0 = mitad === "top" ? 0 : d;
  obj.updateWorldMatrix(true, false); v.set(...local).applyMatrix4(obj.matrixWorld).project(cam);
  return { x: (v.x * 0.5 + 0.5) * W, y: y0 + (-v.y * 0.5 + 0.5) * h, vis: h > 40 && v.z < 1, y0, h };
}
export const objetos = { M, L, S2, S3, scene, anillo, mundo: scene };
