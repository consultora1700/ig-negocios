"""Efectos del reel 05 (Uber/DiDi), suaves según EDICION.md: whoosh en cada cambio de plano, tic en fichas y líneas,
«ding» de la app en cada viaje, moneda en los contadores, golpe grave en las cifras clave. Salida: voz/efectos-crudos.wav"""
import numpy as np, wave, json, re
SR = 48000; DUR = 171.0; N = int(SR * DUR); x = np.zeros(N); rng = np.random.default_rng(5)
T = {k: float(v) for k, v in re.findall(r"(\w+): ([0-9.]+)", open("video/assets/mundo.js").read().split("export const T = {")[1].split("};")[0])}
def add(t, s):
    i = int(t * SR); s = s[: max(0, N - i)]; x[i:i + len(s)] += s
def banda(n, lo, hi):
    X = np.fft.rfft(rng.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / SR); X[(f < lo) | (f > hi)] = 0; y = np.fft.irfft(X, n); return y / (np.abs(y).max() + 1e-9)
def whoosh(d=0.42, a=0.5): n = int(d * SR); t = np.linspace(0, 1, n); return a * banda(n, 300, 5000) * np.sin(np.pi * t) ** 2.5
def tic(a=0.3): n = int(0.08 * SR); t = np.arange(n) / SR; return a * (banda(n, 2500, 7000) * np.exp(-t * 400) + 0.7 * np.sin(2 * np.pi * 140 * t) * np.exp(-t * 45))
def golpe(a=0.55): n = int(0.6 * SR); t = np.arange(n) / SR; return a * (np.sin(2 * np.pi * 70 * t) * np.exp(-t * 7) + 0.25 * banda(n, 2000, 9000) * np.exp(-t * 18))
def moneda(a=0.28): n = int(0.7 * SR); t = np.arange(n) / SR; return a * (np.sin(2 * np.pi * 2350 * t) + 0.5 * np.sin(2 * np.pi * 3520 * t)) * np.exp(-t * 9) * (1 - np.exp(-t * 300))
def ding(a=0.3):   # aviso de la app: dos notas suaves
    n = int(0.55 * SR); t = np.arange(n) / SR; e = lambda t0: np.where(t >= t0, np.exp(-(t - t0) * 9) * (1 - np.exp(-(t - t0) * 400)), 0)
    return a * (np.sin(2 * np.pi * 1318.5 * t) * e(0) + np.sin(2 * np.pi * 1760 * t) * e(0.12))
# cambios de plano (todos los cortes de PL en mundo.js)
import re as _re
cortes = [k for k in _re.findall(r"\[T\.(\w+), \"", open("video/assets/mundo.js").read().split("const PL = [")[1].split("];")[0])]
for k in cortes[1:]: add(T[k] - 0.2, whoosh())
# placas de capítulo: golpe grave
for k in ["cap1", "cap2", "cap3"]: add(T[k], golpe(0.75))
# líneas de los tickets y fichas
for k in ["alq", "gas", "mono", "cel", "h312", "service", "seguro", "monoD", "patente", "s206", "pone318", "noPaga", "caja", "noAlq", "maneja8", "entra", "menos", "tambien", "dividido"]: add(T[k], tic())
for i in range(6): add(T["app2496"] + 0.9 + i * 0.3, tic(0.2))
for i in range(7): add(T["lunes"] + 0.2 + i * 0.12, tic(0.18))
# la app: viajes que entran
for base in [T["gancho"], T["dia"], T["maneja8"]]:
    for k in range(3): add(base + 0.9 + k * 1.1, ding())
for k in range(9): add(T["div"] + 0.3 + k * 0.25, ding(0.14))
# contadores y fajos
for k in ["mes", "cobra", "app2496"]: add(T[k] + 0.3, moneda())
for i in range(10): add(T["bolsillo"] + i * 0.24, moneda(0.12))
for i in range(15): add(T["igual"] + i * 0.11, moneda(0.08)); add(T["masQue"] + i * 0.1, moneda(0.08))
# golpes en las cifras clave
for k in ["s360", "h30", "quedan", "m4800", "s159", "bolsillo", "s206", "ganancia", "recupera", "m1500", "igual", "cero", "quedaL", "h104", "m7340", "m2360"]: add(T[k], golpe())
add(T["rechazar"] + 0.2, golpe(0.8)); add(T["s360"] + 0.25, tic(0.5))
x = x / max(1e-9, np.abs(x).max()) * 0.8
y = (np.repeat(x[:, None], 2, 1) * 32767).astype(np.int16)
w = wave.open("voz5/efectos-crudos.wav", "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes()); w.close(); print("ok", len(T))
