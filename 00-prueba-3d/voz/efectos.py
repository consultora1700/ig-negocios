"""Efectos suaves y naturales para la prueba (sin pitidos sintéticos): whoosh en los cortes, tic en las fichas,
pochoclos que caen como ruido filtrado corto, golpe grave suave en la cifra final. Salida: voz/efectos-crudos.wav (10 s)."""
import numpy as np, wave
SR = 48000; N = SR * 10; x = np.zeros(N); rng = np.random.default_rng(3)
def add(t, s):
    i = int(t * SR); s = s[: max(0, N - i)]; x[i:i + len(s)] += s
def banda(n, lo, hi):
    X = np.fft.rfft(rng.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / SR); X[(f < lo) | (f > hi)] = 0; y = np.fft.irfft(X, n); return y / (np.abs(y).max() + 1e-9)
def pop(a=0.5):
    n = int(0.05 * SR); t = np.arange(n) / SR
    return a * (banda(n, 1200, 4500) * np.exp(-t * 160) + 0.5 * np.sin(2 * np.pi * (170 + rng.random() * 60) * t) * np.exp(-t * 70))
def whoosh(d=0.42, a=0.5):
    n = int(d * SR); t = np.linspace(0, 1, n); y = banda(n, 300, 5000) * np.sin(np.pi * t) ** 2.5; return a * y
def tic(a=0.4):
    n = int(0.08 * SR); t = np.arange(n) / SR
    return a * (banda(n, 2500, 7000) * np.exp(-t * 400) + 0.7 * np.sin(2 * np.pi * 140 * t) * np.exp(-t * 45))
def golpe(a=0.6):
    n = int(0.6 * SR); t = np.arange(n) / SR
    return a * (np.sin(2 * np.pi * 70 * t) * np.exp(-t * 7) + 0.25 * banda(n, 2000, 9000) * np.exp(-t * 18))
add(3.15, whoosh()); add(5.15, whoosh())
add(1.2, tic()); add(4.35, tic()); add(5.5, tic(0.3)); add(6.88, tic(0.35))
seed = 7
def r():
    global seed; seed = (seed * 16807) % 2147483647; return seed / 2147483647
for i in range(100):
    d = 0.012 * i + r() * 0.12
    if i % 2 == 0: add(5.3 + d + 0.5, pop(0.22 + rng.random() * 0.12))
add(7.94, golpe())
x = x / max(1e-9, np.abs(x).max()) * 0.8
y = (np.repeat(x[:, None], 2, 1) * 32767).astype(np.int16)
w = wave.open("voz/efectos-crudos.wav", "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes()); w.close(); print("ok")
