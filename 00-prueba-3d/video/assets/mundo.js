// Prueba 3D de 10 s: el hall de un cine en maqueta (corte abierto, efecto miniatura).
// Capa del mundo con color real; la capa de marca (fichas, títulos, subtítulos) vive en el HUD de index.html.
import * as THREE from "./lib/three.module.min.js";
import { GLTFLoader } from "./lib/GLTFLoader.js";
import * as SkeletonUtils from "./lib/SkeletonUtils.js";
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
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#000000");
const cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 200);

// ---------- materiales y texturas ----------
const std = (c, r = 0.75, m = 0, e) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...(e ? { emissive: e, emissiveIntensity: 1 } : {}) });
function tex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const alfombra = tex(1024, 1024, (g, w, h) => {
  g.fillStyle = "#5B1A28"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#7A2A3A"; g.lineWidth = 10;
  for (let i = -8; i < 16; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128 + h, h); g.stroke(); g.beginPath(); g.moveTo(i * 128, h); g.lineTo(i * 128 + h, 0); g.stroke(); }
  g.fillStyle = "#C98A4B"; for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) { g.beginPath(); g.arc(x * 128 + 64, y * 128 + 64, 7, 0, 7); g.fill(); }
});
alfombra.wrapS = alfombra.wrapT = THREE.RepeatWrapping; alfombra.repeat.set(3, 2.4);
const rayas = tex(256, 256, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#F4EFE6" : "#C8202E"; g.fillRect((i * w) / 8, 0, w / 8 + 1, h); } });
rayas.wrapS = THREE.RepeatWrapping; rayas.repeat.set(2, 1);
function cartel(txt, sub, fondo, tinta) {
  return tex(512, 160, (g, w, h) => {
    g.fillStyle = fondo; g.fillRect(0, 0, w, h);
    g.fillStyle = tinta; g.textAlign = "center"; g.font = "900 70px Montserrat"; g.fillText(txt, w / 2, sub ? 82 : 104);
    if (sub) { g.font = "700 34px Montserrat"; g.globalAlpha = 0.85; g.fillText(sub, w / 2, 132); }
  });
}
function afiche(a, b, titulo) {
  return tex(400, 600, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,.18)"; g.beginPath(); g.arc(w * 0.62, h * 0.38, 120, 0, 7); g.fill();
    g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.moveTo(0, h * 0.62); g.lineTo(w, h * 0.5); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    g.fillStyle = "#FFFFFF"; g.textAlign = "center"; g.font = "900 54px Montserrat"; titulo.split("\n").forEach((l, i) => g.fillText(l, w / 2, h * 0.76 + i * 58));
    g.font = "700 22px Montserrat"; g.fillText("ESTRENO", w / 2, h * 0.94);
  });
}

// ---------- maqueta: base, piso, paredes ----------
const mundo = new THREE.Group(); scene.add(mundo);
const AN = 12, PR = 9; // ancho (x) y profundidad (z) del hall
const base = new THREE.Mesh(new RoundedBoxGeometry(AN + 0.6, 0.5, PR + 0.6, 4, 0.12), std("#202228", 0.9));
base.position.set(0, -0.26, 0); base.receiveShadow = true; mundo.add(base);
const piso = new THREE.Mesh(new THREE.PlaneGeometry(AN, PR), new THREE.MeshStandardMaterial({ map: alfombra, roughness: 0.95 }));
piso.rotation.x = -Math.PI / 2; piso.position.y = 0.005; piso.receiveShadow = true; mundo.add(piso);
const pared = (w, h, d, x, y, z, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), std(c, 0.85)); m.position.set(x, y, z); m.receiveShadow = true; m.castShadow = true; mundo.add(m); return m; };
pared(AN, 4.2, 0.25, 0, 2.1, -PR / 2 + 0.12, "#2A3560");           // fondo
pared(0.25, 4.2, PR, -AN / 2 + 0.12, 2.1, 0, "#2E3A68");            // izquierda
pared(AN, 0.35, 0.27, 0, 4.2, -PR / 2 + 0.12, "#11152A");           // cornisa
const zocalo = pared(AN, 0.18, 0.3, 0, 0.09, -PR / 2 + 0.3, "#0E1020");
// franja de luz cálida en la pared del fondo
const franja = new THREE.Mesh(new THREE.BoxGeometry(AN - 0.4, 0.06, 0.04), std("#FFD9A0", 0.4, 0, "#FFB868")); franja.material.emissiveIntensity = 2.2;
franja.position.set(0, 3.86, -PR / 2 + 0.27); mundo.add(franja);

// afiches iluminados en la pared izquierda y el fondo izquierdo
const AF = [["#1E5BD6", "#0A1030", "ÓRBITA\nCERO"], ["#D6452F", "#2A0A10", "LA ÚLTIMA\nCUENTA"], ["#16A27A", "#06221B", "DOS\nVERANOS"]];
AF.forEach((a, i) => {
  const marco = new THREE.Mesh(new THREE.BoxGeometry(1.36, 1.96, 0.08), std("#0A0A0C", 0.4, 0.6)); marco.castShadow = true;
  const cara = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.8), new THREE.MeshStandardMaterial({ map: afiche(...a), emissiveMap: afiche(...a), emissive: "#FFFFFF", emissiveIntensity: 0.55, roughness: 0.5 }));
  cara.position.z = 0.045; marco.add(cara);
  if (i < 2) { marco.position.set(-AN / 2 + 0.3, 2.2, -2.6 + i * 2.1); marco.rotation.y = Math.PI / 2; }
  else { marco.position.set(-4.3, 2.2, -PR / 2 + 0.3); }
  mundo.add(marco);
});

// ---------- candy bar ----------
const candy = new THREE.Group(); candy.position.set(1.6, 0, -3.0); mundo.add(candy);
const mostrador = new THREE.Mesh(new RoundedBoxGeometry(5.2, 1.05, 0.9, 3, 0.06), std("#2B1A1E", 0.6)); mostrador.position.set(0, 0.525, 0); mostrador.castShadow = mostrador.receiveShadow = true; candy.add(mostrador);
const tapa = new THREE.Mesh(new RoundedBoxGeometry(5.4, 0.08, 1.0, 3, 0.03), std("#EDE6DA", 0.25, 0.05)); tapa.position.set(0, 1.09, 0); tapa.castShadow = tapa.receiveShadow = true; candy.add(tapa);
const luzFrente = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.07, 0.02), std("#FFE2B0", 0.3, 0, "#FFB060")); luzFrente.material.emissiveIntensity = 2.4; luzFrente.position.set(0, 0.86, 0.46); candy.add(luzFrente);
const panel = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 0.5), new THREE.MeshStandardMaterial({ map: rayas, roughness: 0.6 })); panel.position.set(0, 0.45, 0.452); candy.add(panel);
// mueble de atrás
const atras = new THREE.Mesh(new RoundedBoxGeometry(5.4, 1.0, 0.6, 3, 0.04), std("#3A2228", 0.6)); atras.position.set(0, 0.5, -1.15); atras.castShadow = atras.receiveShadow = true; candy.add(atras);
// carteles de menú iluminados
[["POCHOCLO", "BALDE · MEDIANO · CHICO"], ["COMBOS", "BALDE + GASEOSA"], ["BEBIDAS", "GRANDE · MEDIANA"]].forEach((m, i) => {
  const t = cartel(m[0], m[1], i === 1 ? "#C8202E" : "#14161C", "#FFF4E2");
  const c = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.52, 0.06), new THREE.MeshStandardMaterial({ color: "#000" }));
  const f = new THREE.Mesh(new THREE.PlaneGeometry(1.56, 0.48), new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: "#FFFFFF", emissiveIntensity: 0.9 }));
  f.position.z = 0.032; c.add(f); c.position.set(-1.75 + i * 1.75, 2.75, -1.4); candy.add(c);
});
// máquina de pochoclo
const maquina = new THREE.Group(); maquina.position.set(-1.6, 1.0, -1.15); candy.add(maquina);
const vidrio = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.95, 0.6), new THREE.MeshPhysicalMaterial({ color: "#FFF6E8", roughness: 0.05, transmission: 0, transparent: true, opacity: 0.22, metalness: 0 }));
vidrio.position.y = 0.6; maquina.add(vidrio);
const techo = new THREE.Mesh(new RoundedBoxGeometry(1.08, 0.22, 0.68, 3, 0.05), std("#C8202E", 0.45)); techo.position.y = 1.18; techo.castShadow = true; maquina.add(techo);
const pie = new THREE.Mesh(new RoundedBoxGeometry(1.08, 0.14, 0.68, 3, 0.04), std("#C8202E", 0.45)); pie.position.y = 0.07; maquina.add(pie);
[[-0.5, -0.32], [0.5, -0.32], [-0.5, 0.32], [0.5, 0.32]].forEach(([x, z]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.95), std("#D8D8D8", 0.3, 0.9)); p.position.set(x, 0.6, z); maquina.add(p); });
const luzMaq = new THREE.PointLight("#FFC27A", 3.2, 2.5, 2); luzMaq.position.y = 0.95; maquina.add(luzMaq);

// pochoclo: varias formas de "flor" hechas con esferitas fusionadas
function geoPochoclo(n) {
  const gs = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.IcosahedronGeometry(1, 2); const p = s.attributes.position;
    const nn = new Float32Array(p.count * 3);
    for (let k = 0; k < p.count; k++) { const v = new THREE.Vector3(p.getX(k), p.getY(k), p.getZ(k)).normalize(); nn.set([v.x, v.y, v.z], k * 3);
      const f = 0.9 + 0.12 * Math.sin(v.x * 7 + i) * Math.cos(v.y * 6 + v.z * 5); p.setXYZ(k, v.x * f, v.y * f, v.z * f); }
    s.setAttribute("normal", new THREE.BufferAttribute(nn, 3));
    const r = 0.45 + rnd() * 0.35; s.scale(r, r, r);
    s.translate((rnd() - 0.5) * 0.9, (rnd() - 0.5) * 0.7, (rnd() - 0.5) * 0.9); gs.push(s);
  }
  const pos = [], nor = [];
  gs.forEach((g) => { const gi = g.index ? g.toNonIndexed() : g; pos.push(...gi.attributes.position.array); nor.push(...gi.attributes.normal.array); });
  const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  return out;
}
const POCH = [geoPochoclo(5), geoPochoclo(6), geoPochoclo(4), geoPochoclo(7)];
const matPoch = new THREE.MeshStandardMaterial({ color: "#F6E7C1", roughness: 0.85, emissive: "#3A2A10", emissiveIntensity: 0.25 });
// montaña dentro de la máquina (instanciada)
const monte = new THREE.InstancedMesh(POCH[0], matPoch, 260); monte.castShadow = true;
{ const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < 260; i++) {
    const x = (rnd() - 0.5) * 0.9, z = (rnd() - 0.5) * 0.5, h = 0.42 - (Math.abs(x) * 0.35 + Math.abs(z) * 0.3);
    const y = 0.16 + rnd() * Math.max(0.05, h); e.set(rnd() * 6, rnd() * 6, rnd() * 6); q.setFromEuler(e);
    m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(0.045, 0.045, 0.045)); monte.setMatrixAt(i, m);
  } }
maquina.add(monte);
// pochoclos que saltan dentro de la máquina (animados)
const saltan = Array.from({ length: 14 }, (_, i) => { const m = new THREE.Mesh(POCH[i % 4], matPoch); m.scale.setScalar(0.045); maquina.add(m); return { m, f: 0.7 + rnd() * 0.9, p: rnd() * 10, x: (rnd() - 0.5) * 0.7, z: (rnd() - 0.5) * 0.4 }; });

// balde de pochoclo con rayas
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
// dispenser de gaseosa
const disp = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.8, 0.5, 3, 0.05), std("#14161C", 0.35, 0.3)); disp.position.set(1.95, 1.4, -1.15); disp.castShadow = true; candy.add(disp);
const dispF = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.32), new THREE.MeshStandardMaterial({ color: "#1E5BD6", emissive: "#1E5BD6", emissiveIntensity: 0.8 })); dispF.position.set(1.95, 1.55, -0.89); candy.add(dispF);
// lámparas colgantes
for (let i = 0; i < 3; i++) {
  const l = new THREE.Group(); l.position.set(-1.6 + i * 1.6, 3.3, -0.1); candy.add(l);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.9), std("#111", 0.5)); cable.position.y = 0.45; l.add(cable);
  const pant = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.3, 28, 1, true), std("#151515", 0.4, 0.6)); pant.material.side = THREE.DoubleSide; l.add(pant);
  const foco = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), std("#FFF1D6", 0.3, 0, "#FFD39A")); foco.material.emissiveIntensity = 3; foco.position.y = -0.1; l.add(foco);
  const pl = new THREE.PointLight("#FFC98A", 7, 6, 2); pl.position.y = -0.25; l.add(pl);
}

// ---------- boletería ----------
const bol = new THREE.Group(); bol.position.set(-3.9, 0, -3.3); mundo.add(bol);
const caseta = new THREE.Mesh(new RoundedBoxGeometry(2.0, 2.5, 1.2, 3, 0.06), std("#26304F", 0.6)); caseta.position.y = 1.25; caseta.castShadow = caseta.receiveShadow = true; bol.add(caseta);
const ventana = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8), new THREE.MeshStandardMaterial({ color: "#FFE7C2", emissive: "#FFB866", emissiveIntensity: 0.9 })); ventana.position.set(0, 1.45, 0.605); bol.add(ventana);
const tBol = cartel("BOLETERÍA", "", "#C8202E", "#FFF4E2");
const sBol = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.42), new THREE.MeshStandardMaterial({ map: tBol, emissiveMap: tBol, emissive: "#FFFFFF", emissiveIntensity: 0.9 })); sBol.position.set(0, 2.25, 0.61); bol.add(sBol);
export const ticket = new THREE.Object3D(); ticket.position.set(0, 2.55, 0.6); bol.add(ticket);

// puerta a la sala con cartel
const puerta = pared(0.1, 2.5, 1.8, -AN / 2 + 0.3, 1.25, 1.6, "#0B0D16");
const tSala = cartel("SALA 3", "", "#0B0D16", "#7FD3FF");
const sSala = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.44), new THREE.MeshStandardMaterial({ map: tSala, emissiveMap: tSala, emissive: "#FFFFFF", emissiveIntensity: 1.2 })); sSala.position.set(-AN / 2 + 0.37, 2.9, 1.6); sSala.rotation.y = Math.PI / 2; mundo.add(sSala);
// postes con cordón
const postes = [];
for (let i = 0; i < 4; i++) {
  const p = new THREE.Group(); p.position.set(-1.2 + i * 1.3, 0, -1.0); mundo.add(p); postes.push(p);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.05, 24), std("#C9CCD2", 0.25, 0.9)); b.position.y = 0.025; p.add(b);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.95, 16), std("#C9CCD2", 0.25, 0.9)); c.position.y = 0.5; c.castShadow = true; p.add(c);
  const k = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), std("#C9CCD2", 0.25, 0.9)); k.position.y = 0.98; p.add(k);
}
for (let i = 0; i < 3; i++) {
  const a = postes[i].position, b = postes[i + 1].position;
  const curva = new THREE.QuadraticBezierCurve3(new THREE.Vector3(a.x, 0.95, a.z), new THREE.Vector3((a.x + b.x) / 2, 0.7, a.z), new THREE.Vector3(b.x, 0.95, b.z));
  const cord = new THREE.Mesh(new THREE.TubeGeometry(curva, 20, 0.025, 8), std("#8E1622", 0.6)); cord.castShadow = true; mundo.add(cord);
}

// muebles KayKit (CC0) en el frente izquierdo
const kk = await Promise.all(["couch_pillows", "cactus_medium_A", "lamp_standing"].map((n) => new Promise((ok, mal) => new GLTFLoader().load(`assets/modelos/kk/${n}.gltf`, ok, undefined, mal))));
[[kk[0], -3.6, 3.4, 0.6, 1.35], [kk[1], -5.2, 3.9, 0, 1.4], [kk[2], -1.9, 3.9, 0, 1.3]].forEach(([g, x, z, r, e]) => {
  const o = g.scene; o.position.set(x, 0, z); o.rotation.y = r; o.scale.setScalar(e); o.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } }); mundo.add(o); });

// ---------- luces ----------
scene.add(new THREE.HemisphereLight("#8A9AC8", "#3A2026", 1.5));
const sol = new THREE.DirectionalLight("#FFE6C8", 2.2); sol.position.set(-6, 12, 9); sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048); Object.assign(sol.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 }); sol.shadow.bias = -0.0004; sol.shadow.radius = 4;
scene.add(sol);
const contra = new THREE.DirectionalLight("#7FB2FF", 0.8); contra.position.set(6, 6, -10); scene.add(contra);
const luzBol = new THREE.PointLight("#FFB866", 4, 4, 2); luzBol.position.set(-3.9, 1.6, -2.2); mundo.add(luzBol);
const luzAf = new THREE.SpotLight("#FFFFFF", 30, 9, 0.6, 0.6, 2); luzAf.position.set(-2.5, 4.5, 0); luzAf.target.position.set(-6, 2, -1.5); mundo.add(luzAf, luzAf.target);

// ---------- personajes (Quaternius, CC0) ----------
const loader = new GLTFLoader();
const carga = (u) => new Promise((ok, mal) => loader.load(u, ok, undefined, mal));
const [gWorker, gCasual, gFormal, gSuit, gPunk] = await Promise.all(["Worker", "Casual", "Formal", "Suit", "Punk"].map((n) => carga(`assets/modelos/${n}.gltf`)));
const ALTO = 1.62;
function persona(g) {
  const o = SkeletonUtils.clone(g.scene);
  const bb = new THREE.Box3().setFromObject(o); const s = ALTO / (bb.max.y - bb.min.y); o.scale.setScalar(s);
  o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; if (m.material) m.material.roughness = 0.8; } });
  const mixer = new THREE.AnimationMixer(o);
  const acc = {}; g.animations.forEach((c) => { const a = mixer.clipAction(c); a.play(); a.setEffectiveWeight(0); acc[c.name] = a; });
  mundo.add(o);
  return { o, mixer, acc, dur: Object.fromEntries(g.animations.map((c) => [c.name, c.duration])) };
}
// pose: lista de [clip, tiempo, peso]
function pose(p, lista) {
  Object.values(p.acc).forEach((a) => a.setEffectiveWeight(0));
  lista.forEach(([n, tt, w]) => { const a = p.acc[n]; a.setEffectiveWeight(w); a.time = tt % p.dur[n]; });
  p.mixer.update(0);
}
const cajera = persona(gWorker), c1 = persona(gCasual), c2 = persona(gFormal), c3 = persona(gSuit), c4 = persona(gPunk), c5 = persona(gCasual), c6 = persona(gPunk), c7 = persona(gFormal);
export const P = { cajera, c1, c2, c3, c4, c5, c6, c7 };
// recorrido a velocidad constante de a → b entre t0 y t1, mirando hacia donde camina; después queda quieto mirando "mira"
const PASO = 1.15; // metros por ciclo de Walk (ajustado a ojo para que no patinen los pies)
function caminar(p, t, a, b, t0, t1, mira, fase = 0) {
  const u = clamp((t - t0) / (t1 - t0));
  const x = a[0] + (b[0] - a[0]) * u, z = a[1] + (b[1] - a[1]) * u;
  p.o.position.set(x, 0, z);
  const anda = t > t0 && t < t1;
  const ang = anda || !mira ? Math.atan2(b[0] - a[0], b[1] - a[1]) : Math.atan2(mira[0] - x, mira[1] - z);
  p.o.rotation.y = ang;
  const dist = Math.hypot(b[0] - a[0], b[1] - a[1]) * u;
  const w = anda ? clamp(Math.min((t - t0) / 0.25, (t1 - t) / 0.25)) : 0;
  pose(p, [["Walk", (dist / PASO) * p.dur.Walk + fase, w], ["Idle", t + fase, 1 - w]]);
}

// ---------- cuadrícula de 100 pochoclos (plano 3) ----------
const grilla = new THREE.Group(); grilla.position.set(40, 0, 0); scene.add(grilla);
const mesa = new THREE.Mesh(new RoundedBoxGeometry(7.4, 0.3, 7.4, 4, 0.1), std("#121418", 0.6)); mesa.position.y = -0.15; mesa.receiveShadow = true; grilla.add(mesa);
const baldosaGeo = new RoundedBoxGeometry(0.56, 0.04, 0.56, 2, 0.02);
export const granos = [];
for (let i = 0; i < 100; i++) {
  const fila = Math.floor(i / 10), col = i % 10;
  const x = (col - 4.5) * 0.66, z = (fila - 4.5) * 0.66;
  const bal = new THREE.Mesh(baldosaGeo, new THREE.MeshStandardMaterial({ color: "#1A1D22", roughness: 0.5, emissive: "#000000" })); bal.position.set(x, 0.02, z); bal.receiveShadow = true; grilla.add(bal);
  const m = new THREE.Mesh(POCH[i % 4], matPoch.clone()); m.scale.setScalar(0.17); m.castShadow = true; grilla.add(m);
  granos.push({ m, bal, x, z, d: 0.012 * i + rnd() * 0.12, rx: rnd() * 6, ry: rnd() * 6, gris: fila < 2 });
}
const luzGrilla = new THREE.PointLight("#FFE2B8", 18, 14, 2); luzGrilla.position.set(40 - 2, 4.5, 3); luzGrilla.castShadow = true; luzGrilla.shadow.mapSize.set(1024, 1024); scene.add(luzGrilla);
const azulBajo = new THREE.PointLight("#009DFF", 0, 8, 2); azulBajo.position.set(40, 0.8, 0.6); scene.add(azulBajo);

// ---------- efecto miniatura (tilt-shift) ----------
const rtA = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const rtB = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
const qScene = new THREE.Scene(); qScene.add(quad); const qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const blurMat = (final) => new THREE.ShaderMaterial({
  uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() }, foco: { value: 0.5 }, banda: { value: 0.12 }, radio: { value: 9 }, vin: { value: 0.0 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
  fragmentShader: `uniform sampler2D tex; uniform vec2 dir; uniform float foco, banda, radio, vin; varying vec2 vUv;
    void main(){
      float d = abs(vUv.y - foco); float k = smoothstep(banda, banda + 0.28, d) * radio;
      vec4 acc = vec4(0.0); float wsum = 0.0;
      for (int i = -6; i <= 6; i++) { float fi = float(i); float w = exp(-fi*fi/18.0); acc += texture2D(tex, vUv + dir * fi * k / 6.0) * w; wsum += w; }
      vec4 col = acc / wsum;
      ${final ? "vec2 q = vUv - 0.5; col.rgb *= 1.0 - vin * dot(q, q) * 1.6; gl_FragColor = col;\n#include <tonemapping_fragment>\n#include <colorspace_fragment>" : "gl_FragColor = col;"}
    }`,
  toneMapped: final, depthTest: false, depthWrite: false,
});
const blurH = blurMat(false), blurV = blurMat(true);

// ---------- cámara por plano ----------
function camara(t) {
  if (t < T.plano2) {           // plano general del hall
    const u = ease(clamp(t / T.plano2)); const a = 0.3 - 0.12 * u, r = 9.6 - 1.0 * u;
    return { pos: [0.2 + Math.sin(a) * r, 5.6 - 0.5 * u, -1.6 + Math.cos(a) * r], mira: [-0.4, 0.9, -2.2], fov: 56, foco: 0.56, banda: 0.14, radio: 8 };
  }
  if (t < T.plano3) {           // el candy de cerca
    const u = ease(clamp((t - T.plano2) / (T.plano3 - T.plano2)));
    return { pos: [3.9 - 0.7 * u, 2.6 - 0.15 * u, 2.4 - 0.6 * u], mira: [2.0, 1.45, -3.0], fov: 46, foco: 0.5, banda: 0.09, radio: 11 };
  }
  const u = ease(clamp((t - T.plano3) / (T.fin - T.plano3)));   // la cuadrícula de pochoclos
  const a = 0.5 - 0.35 * u, r = 9.2 - 1.0 * u;
  return { pos: [40 + Math.sin(a) * r, 10.2 - 0.6 * u, Math.cos(a) * r], mira: [40, 0.0, -1.9], fov: 46, foco: 0.62, banda: 0.16, radio: 6 };
}
export function camAt(t) { const k = camara(t); cam.position.set(...k.pos); cam.fov = k.fov; cam.aspect = W / H; cam.updateProjectionMatrix(); cam.lookAt(...k.mira); return k; }

// proyecta un objeto 3D a coordenadas de pantalla del HUD
const _v = new THREE.Vector3();
export function aPantalla(obj, local = [0, 0, 0]) {
  _v.set(...local); obj.localToWorld(_v); _v.project(cam);
  return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H, vis: _v.z < 1 };
}

// ---------- estado del mundo en el tiempo t ----------
export function render(t) {
  // pochoclos saltando en la máquina
  saltan.forEach((s) => { const c = ((t * s.f + s.p) % 1); const y = 0.2 + Math.sin(c * Math.PI) * 0.62; s.m.position.set(s.x + c * 0.05, y, s.z); s.m.rotation.set(t * 3 + s.p, t * 2, 0); });
  // personas: fila al candy, una entrando, una en la boletería
  pose(cajera, [["Interact", t * 0.9, 0.7], ["Idle", t, 0.3]]); cajera.o.position.set(2.1, 0, -3.75); cajera.o.rotation.y = 0;
  caminar(c1, t, [2.1, -1.95], [2.1, -1.95], 0, 0.01, [2.1, -4]);
  caminar(c2, t, [2.0, -0.95], [2.0, -0.95], 0, 0.01, [2.1, -4], 0.6);
  caminar(c6, t, [2.15, 0.05], [2.15, 0.05], 0, 0.01, [2.1, -4], 0.2);
  caminar(c7, t, [1.95, 1.05], [1.95, 1.05], 0, 0.01, [2.1, -4], 1.4);
  caminar(c3, t, [5.4, 4.2], [2.2, 2.1], 0.0, 3.6, [2.1, -4], 0.3);
  caminar(c4, t, [-3.9, -1.75], [-3.9, -1.75], 0, 0.01, [-3.9, -3.3], 1.1);
  caminar(c5, t, [0.6, 4.2], [-4.6, 1.7], 0.0, 4.6, [-6, 1.6], 0.8);
  // cuadrícula: caen, se acomodan y después se separan los que son costo (gris) de los que quedan (azul)
  const tc = t - T.plano3;
  granos.forEach((g) => {
    const u = clamp((tc - g.d) / 0.55);
    const rebote = u < 1 ? (1 - eo(u)) * 3.2 + Math.abs(Math.sin(u * Math.PI * 2)) * (1 - u) * 0.18 : 0;
    g.m.position.set(g.x, 0.2 + rebote, g.z); g.m.rotation.set(g.rx + (1 - u) * 3, g.ry, 0); g.m.visible = tc > g.d - 0.02;
    const ug = clamp((t - T.cuesta - (g.gris ? g.d * 0.4 : 0)) / 0.35), ua = clamp((t - T.quedan - g.d * 0.35) / 0.4);
    if (g.gris) { g.m.material.color.set("#F6E7C1").lerp(new THREE.Color("#5A5E66"), ug); g.m.material.emissiveIntensity = 0.25 * (1 - ug); g.m.position.y -= 0.08 * ug; g.bal.material.color.set("#1A1D22").lerp(new THREE.Color("#2A2D33"), ug); }
    else { g.bal.material.emissive.set("#007BFF").multiplyScalar(0.9 * ua); g.bal.material.color.set("#1A1D22").lerp(new THREE.Color("#0B2A55"), ua); }
  });
  azulBajo.intensity = 22 * clamp((t - T.quedan) / 0.6);

  const k = camAt(t);
  renderer.setRenderTarget(rtA); renderer.render(scene, cam);
  blurH.uniforms.tex.value = rtA.texture; blurH.uniforms.dir.value.set(1 / W, 0); Object.assign(blurH.uniforms.foco, { value: k.foco }); blurH.uniforms.banda.value = k.banda; blurH.uniforms.radio.value = k.radio;
  quad.material = blurH; renderer.setRenderTarget(rtB); renderer.render(qScene, qCam);
  blurV.uniforms.tex.value = rtB.texture; blurV.uniforms.dir.value.set(0, 1 / H); blurV.uniforms.foco.value = k.foco; blurV.uniforms.banda.value = k.banda; blurV.uniforms.radio.value = k.radio; blurV.uniforms.vin.value = 0.55;
  quad.material = blurV; renderer.setRenderTarget(null); renderer.render(qScene, qCam);
  return k;
}
