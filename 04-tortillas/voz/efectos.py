"""Efectos del reel 04 (tortillas) (suaves, guía EDICION.md): whoosh en cada cambio de plano, tic en cada ficha, golpe grave en la regla.
Salida: voz/efectos-crudos.wav (86,3 s)."""
import numpy as np, wave
SR = 48000; DUR = 107.3; N = int(SR * DUR); x = np.zeros(N); rng = np.random.default_rng(5)
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
for t in (3.9, 6.4, 11.7, 17.1, 20.9, 27.9, 34.4, 45.6, 50.5, 54.5, 69.1, 75.5, 82.8, 85.8, 92.2, 100.1): add(t - 0.2, whoosh())
for t in (7.6, 10.6, 14.1, 15.2, 15.7, 16.3, 21.3, 24.9, 28.6, 30.5, 32.5, 35.4, 36.6, 41.1, 47.4, 48.6, 58.4, 60.6, 62.5, 66.0, 71.3, 74.0, 76.3, 76.65, 77.0, 77.35): add(t, tic(0.3))
add(18.5, golpe(0.45)); add(42.4, moneda()); add(52.2, golpe(0.5)); add(66.2, moneda()); add(84.6, golpe(0.4)); add(88.1, golpe(0.55)); add(92.2, golpe())
for k in range(12): add(7.2 + k * 0.05, tic(0.05))   # contador de compras
n = int(4.0 * SR); tt = np.linspace(0, 1, n); add(50.5, 0.22 * banda(n, 2500, 12000) * np.minimum(1, np.minimum(tt * 8, (1 - tt) * 8)))   # lluvia
x = x / max(1e-9, np.abs(x).max()) * 0.8
y = (np.repeat(x[:, None], 2, 1) * 32767).astype(np.int16)
w = wave.open("voz/efectos-crudos.wav", "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes()); w.close(); print("ok")
