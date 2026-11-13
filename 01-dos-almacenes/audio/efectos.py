#!/usr/bin/env python3
"""Pista de efectos del reel 01 → video/assets/audio/efectos.wav (estéreo 48 kHz). Tiempos en segundos del video."""
import subprocess, pathlib, numpy as np
A = pathlib.Path(__file__).resolve().parent; SR = 48000; DUR = 97.0
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
# A · gancho
wh(0.25, 0.6); po(1.45); po(2.29); po(3.25); wh(4.75, 0.9)
for i in range(5): e("tick", 4.85 + i * 0.2, 0.7)
po(6.45); po(6.75); e("stamp2", 8.5, 1.0); po(8.9, 0.7)
e("buzz", 10.3, 0.8); wh(10.45, 0.7); e("stamp", 10.86, 0.8)
# B · ponerle el cuerpo
wh(11.6, 0.5); po(12.45); po(13.05); wh(14.3, 0.5); wh(18.7, 0.6)
po(20.3); po(21.3); po(22.35); po(24.3); wh(24.9, 0.6)
e("coin", 27.6); e("coin2", 28.1); e("coin", 28.6); e("buzz", 29.6, 0.6)
# C · cuaderno / sistema / ranking
wh(31.0, 0.7); e("scribble", 31.35, 0.6); e("scribble", 32.3, 0.5)
wh(33.1, 0.6)
for i in range(6): e("tap" if i % 2 else "tap1", 33.47 + i * 0.25, 0.9)
e("stamp", 35.12, 0.9); wh(37.6, 0.7); e("ding", 38.3, 0.6); e("buzz", 41.2, 0.4)
# D · depósito
wh(42.85, 0.7); po(44.2); e("buzz", 45.8, 0.6); po(46.75)
wh(47.45, 0.6)
for i in range(3): e("tap2", 48.17 + i * 0.55, 1.0)
# E · mapa
wh(49.9, 0.9)
for i in range(0, 27, 3): po(52.33 + i * 0.085, 0.45)
e("ding", 54.7, 0.6); e("stamp2", 55.42, 1.0)
# F · el giro
wh(56.0, 0.6); po(58.97, 0.9); po(59.88); wh(60.95, 0.6); wh(63.25, 0.6)
wh(65.1, 0.7)
for i in range(10): e("tap" if i % 2 else "tap1", 66.15 + i * 0.1, 0.8)
po(66.4); e("coin", 67.75); e("coin2", 67.95); e("tick", 68.0, 0.6); e("stamp", 69.4, 0.9)
for t in (70.4, 70.95, 71.45): po(t, 0.6)
for i in range(9): e("coin" if i % 2 else "coin2", 72.6 + i * 0.2, 0.55)
e("ding", 74.3, 0.6)
# G · el año 1 engaña / tijera
wh(75.6, 0.8); po(79.3); po(80.25); po(81.25)
wh(81.95, 0.7); e("stamp", 83.8, 0.9); e("buzz", 84.5, 0.7)
# H · cierre
wh(85.55, 0.7); po(85.7)
for i in range(5): e("tick", 87.15 + i * 0.18, 0.7)
wh(90.95, 0.6); e("stamp2", 92.42, 1.0); e("stamp2", 94.0, 0.9); po(94.35); po(94.6); e("ding", 95.0, 0.6)
fx = np.zeros(int(DUR * SR), np.float32)
for n, t, g in ev:
    s = x(n) * g; a = int((t + 1 / 30) * SR)   # el sonido llega un cuadro después de la imagen
    fx[a:a + len(s)] += s[: max(0, len(fx) - a)]
fx *= 0.5 / max(1e-6, np.abs(fx).max())
out = A.parent / "video/assets/audio/efectos.wav"
st = np.stack([fx, fx], 1)
subprocess.run(["ffmpeg","-v","error","-y","-f","f32le","-ar",str(SR),"-ac","2","-i","-",str(out)], input=st.astype(np.float32).tobytes(), check=True)
print(len(ev), "efectos →", out)
