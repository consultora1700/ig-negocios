"""Efectos del reel 04 (tortillas) (suaves, guía EDICION.md): whoosh en cada cambio de plano, tic en cada ficha, golpe grave en la regla.
Salida: voz/efectos-crudos.wav (86,3 s)."""
import numpy as np, wave
SR = 48000; DUR = 172.77; N = int(SR * DUR); x = np.zeros(N); rng = np.random.default_rng(5)
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
for t in (5.51, 8.6, 14.34, 17.42, 20.3, 26.17, 30.67, 37.39, 41.28, 49.16, 61.21, 71.63, 75.87, 84.32, 87.92, 90.11, 122.88, 137.54, 143.04, 152.52, 159.29, 165.69): add(t - 0.2, whoosh())
for t in (10.99, 13.46, 16.44, 19.32, 32.17, 35.19, 35.81, 42.18, 42.78, 56.62, 58.7, 64.31, 65.86, 67.54, 69.45, 78.66, 80.16, 81.16, 81.63, 83.33, 91.7, 94.39, 105.74, 112.13, 112.13, 128.86, 145.52, 138.54, 139.14, 139.73, 141.23): add(t, tic(0.3))
add(21.1, golpe(0.45)); add(43.68, tic(0.4)); add(44.78, golpe(0.5)); add(59.79, moneda()); add(70.37, tic(0.4)); add(73.79, moneda()); add(84.82, golpe(0.5)); add(95.73, moneda()); add(105.74, moneda())
add(121.39, moneda()); add(130.09, tic(0.45)); add(146.36, golpe(0.5)); add(155.02, golpe(0.55)); add(159.29, golpe())
for k in range(16): add(10.79 + k * 0.05, tic(0.05))   # contador de compras
n = int(3.88 * SR); tt = np.linspace(0, 1, n); add(84.32, 0.22 * banda(n, 2500, 12000) * np.minimum(1, np.minimum(tt * 8, (1 - tt) * 8)))   # lluvia
x = x / max(1e-9, np.abs(x).max()) * 0.8
y = (np.repeat(x[:, None], 2, 1) * 32767).astype(np.int16)
w = wave.open("voz/efectos-crudos.wav", "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes()); w.close(); print("ok")
