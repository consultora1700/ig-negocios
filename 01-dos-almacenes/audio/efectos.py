#!/usr/bin/env python3
"""Pista de efectos del reel 01 → video/assets/audio/efectos.wav (estéreo 48 kHz). Tiempos en segundos del video."""
import subprocess, pathlib, numpy as np
A = pathlib.Path(__file__).resolve().parent; SR = 48000; DUR = 91.0
def leer(n):
    pcm = subprocess.run(["ffmpeg","-v","error","-i",str(A/"sfx"/f"{n}.wav"),"-f","s16le","-ac","1","-ar",str(SR),"-"],capture_output=True,check=True).stdout
    return np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
X = {}
def x(n):
    if n not in X: X[n] = leer(n)
    return X[n]
ev = []
def e(n, t, g=1.0): ev.append((n, t, g))
W = ["whoosh", "whoosh2", "whoosh3"]; Pp = ["pop", "pop2", "pop3"]; k = [0]
def wh(t, g=0.8): e(W[k[0] % 3], t, g); k[0] += 1
def po(t, g=0.8): e(Pp[k[0] % 3], t, g); k[0] += 1
# Gancho
wh(0.25, 0.6); po(1.5); po(2.55); po(3.82); wh(5.05, 0.9)
for i in range(5): e("tick", 5.15 + i * 0.22, 0.7)
po(6.75); po(7.05); e("stamp2", 8.5, 1.0); po(9.1, 0.7)
e("buzz", 9.5, 0.7); wh(9.65, 0.7); e("stamp", 9.85, 0.8)
wh(10.65, 0.7); e("stamp2", 11.2, 1.0); e("ding", 11.8, 0.5)
for i in range(7): e("tick", 11.9 + i * 0.06, 0.5)
# contador de decisiones (golpe en cada número)
for t in (12.8, 21.48, 28.83, 37.6, 45.8, 53.45, 62.28): e("stamp", t, 0.55)
# 1 · ponerle el cuerpo
wh(12.5, 0.5); po(14.1); po(14.5); wh(15.4, 0.5); po(17.4); po(18.6); wh(19.3, 0.6)
# 2 · cuaderno o sistema
wh(22.2, 0.7); e("scribble", 22.6, 0.6); e("scribble", 23.2, 0.5); wh(23.55, 0.6)
for t in (26.3, 27.15, 28.05, 28.35, 28.5): e("tap" if t % 2 else "tap1", t, 0.9)
# 3 · qué deja plata
wh(28.85, 0.7); e("ding", 30.95, 0.6); e("buzz", 32.4, 0.4); wh(33.6, 0.7)
for i in range(16): e("tap2", 34.1 + i * 0.1, 0.6)
po(36.6)
# 4 · nunca decir «no hay»
wh(37.4, 0.6); e("ding", 38.4, 0.6); for_ = [e("tap", 39.95 + q * 0.07, 0.7) for q in range(7)]; po(40.0)
wh(40.2, 0.6); po(41.7); e("buzz", 43.05, 0.9); wh(43.5, 0.7); e("ding", 45.05, 0.7); po(45.1)
# 5 · cerrar la caja
wh(46.5, 0.6); e("tap", 47.25, 0.8); e("tap1", 47.6, 0.8); e("stamp", 49.65, 0.9); wh(50.5, 0.6)
for d in range(30): e("tick", 50.78 + d * 0.03, 0.35)
e("buzz", 52.25, 0.7)
for i in range(6): e("coin" if i % 2 else "coin2", 51.4 + i * 0.12, 0.45)
# 6 · precio de reposición
wh(54.15, 0.6); wh(56.35, 0.6); po(58.95); wh(58.6, 0.7)
for i in range(10): e("tap" if i % 2 else "tap1", 59.35 + i * 0.05, 0.8)
e("stamp", 60.3, 0.9); po(60.88, 0.7); po(61.45, 0.7)
# 7 · sueldo fijo y reinversión
wh(62.25, 0.7)
for i in range(8): e("coin" if i % 2 else "coin2", 63.0 + i * 0.1, 0.5)
wh(63.7, 0.7); po(65.25); e("coin", 66.1); e("coin2", 66.2); po(67.45); wh(67.2, 0.5)
wh(68.5, 0.9)
for i in range(0, 27, 3): po(69.0 + i * 0.06, 0.45)
e("ding", 70.5, 0.6); e("stamp2", 71.0, 1.0)
# giro
wh(73.4, 0.8); po(75.2); po(75.45); po(75.7)
wh(76.65, 0.7); e("stamp", 78.25, 0.9); e("buzz", 79.3, 0.7)
# cierre
wh(80.45, 0.7); po(80.65)
for q in range(7): e("tick", 80.95 + q * 0.16, 0.6)
e("stamp2", 82.85, 0.9); po(83.25); po(84.4); e("ding", 85.4, 0.5)
wh(87.95, 0.6); e("ding", 88.75, 0.45); po(88.95, 0.7)
fx = np.zeros(int(DUR * SR), np.float32)
for n, t, g in ev:
    s = x(n) * g; a = int((t + 1 / 30) * SR)   # el sonido llega un cuadro después de la imagen
    fx[a:a + len(s)] += s[: max(0, len(fx) - a)]
fx *= 0.5 / max(1e-6, np.abs(fx).max())
out = A.parent / "video/assets/audio/efectos.wav"
st = np.stack([fx, fx], 1)
subprocess.run(["ffmpeg","-v","error","-y","-f","f32le","-ar",str(SR),"-ac","2","-i","-",str(out)], input=st.astype(np.float32).tobytes(), check=True)
print(len(ev), "efectos →", out)
