#!/usr/bin/env python3
"""Pista de efectos del reel 01 → video/assets/audio/efectos.wav (estéreo 48 kHz). Tiempos en segundos del video."""
import subprocess, pathlib, numpy as np
A = pathlib.Path(__file__).resolve().parent; SR = 48000; DUR = 102.0
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
wh(0.25, 0.6); po(1.33); po(2.32); po(3.36); wh(4.65, 0.9)
for i in range(5): e("tick", 4.75 + i * 0.22, 0.7)
po(6.35); po(6.65); e("stamp2", 8.2, 1.0); po(8.75, 0.7)
e("buzz", 9.02, 0.7); wh(9.15, 0.7); e("stamp", 9.36, 0.8)
wh(9.9, 0.7); e("stamp2", 10.17, 1.0); po(11.32, 0.8)
for i in range(7): e("tick", 10.7 + i * 0.06, 0.5)
# contador de decisiones
for t in (13.28, 22.41, 33.54, 42.0, 50.96, 60.82, 72.18): e("stamp", t, 0.55)
# 1 · margen
wh(13.0, 0.5); po(14.05); po(16.15); wh(17.62, 0.6); e("tick", 17.95, 0.6); e("coin", 19.6, 0.7); e("tick", 21.05, 0.6); e("ding", 22.05, 0.6)
# 2 · capital de trabajo
wh(22.2, 0.7)
for i in range(16): e("tap2", 23.65 + i * 0.09, 0.6)
po(25.85); e("buzz", 28.15, 0.6); wh(29.9, 0.6)
for i in range(3): e("tap", 30.6 + i * 0.65, 0.9)
po(32.1)
# 3 · reposición
wh(34.45, 0.6); wh(36.85, 0.6); po(38.89); wh(38.5, 0.7)
for i in range(10): e("tap" if i % 2 else "tap1", 39.25 + i * 0.05, 0.8)
e("stamp", 40.25, 0.9); po(40.65, 0.7); po(41.2, 0.7)
# 4 · fiado
wh(42.6, 0.6); po(43.0); po(43.3)
for d in range(0, 30, 3): e("tick", 44.8 + d * 0.06, 0.4)
e("stamp2", 46.95, 0.9); e("buzz", 47.65, 0.6); wh(48.6, 0.6); po(48.7)
# 5 · sueldo
wh(50.75, 0.6)
for i in range(7): e("coin" if i % 2 else "coin2", 52.9 + i * 0.12, 0.5)
e("buzz", 54.8, 0.6); wh(57.5, 0.6); e("coin", 58.5); e("coin2", 58.6); po(58.4)
# 6 · costos fijos
wh(60.7, 0.6); po(62.85); po(63.2); wh(63.5, 0.9); e("stamp", 65.25, 0.7)
wh(65.45, 0.6); e("tick", 65.9, 0.6); e("buzz", 67.25, 0.6); wh(69.45, 0.9); e("stamp2", 71.0, 1.0)
# 7 · productos que traen gente
wh(72.1, 0.6); po(73.55); e("buzz", 74.45, 0.9); po(75.85); wh(77.25, 0.7); po(79.2); e("ding", 80.9, 0.7)
# giro
wh(82.35, 0.8); po(83.95); po(84.3)
wh(85.35, 0.7); e("stamp", 86.4, 0.9); e("buzz", 87.1, 0.7)
# regla y cierre
wh(87.95, 0.7); e("tick", 88.08, 0.6); po(88.98); e("stamp2", 90.45, 0.9); po(91.6)
wh(93.25, 0.6)
for q in range(7): e("tick", 93.45 + q * 0.12, 0.55)
e("stamp2", 95.08, 0.9); po(95.4)
wh(96.55, 0.6); e("ding", 96.9, 0.5); po(96.95, 0.8)
for q in range(6): e("tick", 97.8 + q * 0.7, 0.3)
fx = np.zeros(int(DUR * SR), np.float32)
for n, t, g in ev:
    s = x(n) * g; a = int((t + 1 / 30) * SR)   # el sonido llega un cuadro después de la imagen
    fx[a:a + len(s)] += s[: max(0, len(fx) - a)]
fx *= 0.5 / max(1e-6, np.abs(fx).max())
out = A.parent / "video/assets/audio/efectos.wav"
st = np.stack([fx, fx], 1)
subprocess.run(["ffmpeg","-v","error","-y","-f","f32le","-ar",str(SR),"-ac","2","-i","-",str(out)], input=st.astype(np.float32).tobytes(), check=True)
print(len(ev), "efectos →", out)
