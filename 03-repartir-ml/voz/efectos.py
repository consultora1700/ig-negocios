"""Efectos del reel 03 v2 (suaves, guía EDICION.md): whoosh en cada cambio de plano, tic en cada ficha, golpe grave en la regla.
Salida: voz/efectos-crudos.wav (86,3 s)."""
import numpy as np, wave
SR = 48000; DUR = 131.0; N = int(SR * DUR); x = np.zeros(N); rng = np.random.default_rng(5)
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
for t in (8.0, 15.9, 21.6, 25.2, 29.2, 35.9, 42.3, 45.7, 52.4, 68.7, 84.8, 101.1, 109.2, 123.6): add(t - 0.2, whoosh())
for t in (0.9, 18.7, 25.2, 26.8, 35.9, 38.0, 40.8, 42.7, 43.3, 44.3, 44.7, 49.5, 61.2, 63.6, 66.9, 92.5, 94.4, 94.55, 94.7, 96.7): add(t, tic(0.3))
for k in range(11): add(69.3 + k * 0.12, tic(0.08))   # barras de los meses
add(0.3, caja()); add(6.7, golpe(0.4)); add(45.1, golpe(0.35)); add(80.4, golpe(0.55)); add(86.2, moneda()); add(96.2, moneda()); add(97.9, golpe(0.45))
for k in range(18): add(57.0 + k * 0.1, tic(0.06))   # surtidor que cuenta
add(109.2, golpe()); add(121.3, golpe(0.5))
x = x / max(1e-9, np.abs(x).max()) * 0.8
y = (np.repeat(x[:, None], 2, 1) * 32767).astype(np.int16)
w = wave.open("voz/efectos-crudos.wav", "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes()); w.close(); print("ok")
