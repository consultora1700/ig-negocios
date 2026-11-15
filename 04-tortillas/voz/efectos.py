"""Efectos del reel 04 (tortillas) (suaves, guía EDICION.md): whoosh en cada cambio de plano, tic en cada ficha, golpe grave en la regla.
Salida: voz/efectos-crudos.wav (86,3 s)."""
import numpy as np, wave
SR = 48000; DUR = 182.02; N = int(SR * DUR); x = np.zeros(N); rng = np.random.default_rng(5)
def add(t, s):
    i = int(t * SR); s = s[: max(0, N - i)]; x[i:i + len(s)] += s
def banda(n, lo, hi):
    X = np.fft.rfft(rng.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / SR); X[(f < lo) | (f > hi)] = 0; y = np.fft.irfft(X, n); return y / (np.abs(y).max() + 1e-9)
def whoosh(d=0.42, a=0.5):
    n = int(d * SR); t = np.linspace(0, 1, n); return a * banda(n, 300, 5000) * np.sin(np.pi * t) ** 2.5
def tic(a=0.4):
    n = int(0.08 * SR); t = np.arange(n) / SR; return a * (banda(n, 2500, 7000) * np.exp(-t * 400) + 0.7 * np.sin(2 * np.pi * 140 * t) * np.exp(-t * 45))
def golpe(a=0.6):
    n = int(0.6 * SR); t = np.arange(n) / SR; return a * (np.sin(2 * np.pi * 70 * t) * np.exp(-t * 7) + 0.25 * banda(n, 2000, 9000) * np.exp(-t * 18))
def caja(a=0.45):
    n = int(0.18 * SR); t = np.arange(n) / SR; return a * (banda(n, 150, 1200) * np.exp(-t * 35) + 0.6 * np.sin(2 * np.pi * 95 * t) * np.exp(-t * 30))
def moneda(a=0.3):
    n = int(0.7 * SR); t = np.arange(n) / SR; return a * (np.sin(2 * np.pi * 2350 * t) + 0.5 * np.sin(2 * np.pi * 3520 * t)) * np.exp(-t * 9) * (1 - np.exp(-t * 300))
def papel(a=0.35):
    n = int(0.35 * SR); t = np.linspace(0, 1, n); return a * banda(n, 1500, 9000) * np.exp(-t * 6) * (0.5 + 0.5 * np.sin(np.pi * t))
for t in (5.8, 9.1, 15.2, 18.4, 21.4, 27.5, 32.2, 39.2, 43.3, 51.6, 64.3, 75.4, 79.9, 88.8, 92.6, 95.0, 130.21, 145.65, 151.15, 160.92, 168.12, 174.82): add(t - 0.2, whoosh())
for t in (11.6, 14.2, 17.3, 20.3, 33.7, 36.8, 37.5, 44.2, 44.8, 59.3, 61.6, 67.5, 69.2, 71.0, 73.0, 82.9, 84.4, 85.4, 86.0, 87.7, 96.7, 99.5, 111.66, 118.35, 118.35, 136.51, 153.75, 146.65, 147.25, 147.84, 149.34): add(t, tic(0.3))
add(22.2, golpe(0.45)); add(45.8, tic(0.4)); add(46.9, golpe(0.5)); add(62.8, moneda()); add(74.0, tic(0.4)); add(77.6, moneda()); add(89.3, golpe(0.5)); add(100.95, moneda()); add(111.66, moneda())
add(128.61, moneda()); add(137.86, tic(0.45)); add(154.59, golpe(0.5)); add(163.52, golpe(0.55)); add(168.12, golpe())
for k in range(16): add(11.4 + k * 0.05, tic(0.05))   # contador de compras
n = int(4.0 * SR); tt = np.linspace(0, 1, n); add(88.8, 0.22 * banda(n, 2500, 12000) * np.minimum(1, np.minimum(tt * 8, (1 - tt) * 8)))   # lluvia
x = x / max(1e-9, np.abs(x).max()) * 0.8
y = (np.repeat(x[:, None], 2, 1) * 32767).astype(np.int16)
w = wave.open("voz/efectos-crudos.wav", "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes()); w.close(); print("ok")
