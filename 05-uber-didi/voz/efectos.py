"""Efectos del reel 05 (Uber/DiDi), suaves según EDICION.md: whoosh en cada cambio de plano, tic en fichas y líneas,
«ding» de la app en cada viaje, moneda en los contadores, golpe grave en las cifras clave. Salida: voz/efectos-crudos.wav"""
import numpy as np, wave, json, re
SR = 48000; DUR = 167.64; N = int(SR * DUR); x = np.zeros(N); rng = np.random.default_rng(5)
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
# cambios de plano (los mismos de mundo.js)
for k in ["uno", "tranq", "martin", "div", "poreso", "mes", "gas", "quedan", "lucas", "mesL", "gasL", "gasto", "quedanL", "comp", "porque", "escritorio", "claro", "ojo", "entonces", "vos"]:
    add(T[k] - 0.2, whoosh())
# fichas y líneas de las tarjetas
for k in ["alq", "gas", "mono", "cel", "h312", "gasL", "service", "seguro", "impuestos", "patente", "km", "s33", "alquilaG", "manejaG", "uso", "chocas", "lo", "menos", "incluido", "dividido", "s40", "s800", "mpaga"]:
    add(T[k], tic())
for i in range(7): add(T["primeros"] + 0.2 + i * 0.18, tic(0.18))
# la app: viajes que entran
for a in [T["tranq"] + 1.2, T["tranq"] + 3.4, T["tranq"] + 5.6, T["viaje"]]: add(a, ding())
for k in range(9): add(T["div"] + 0.3 + k * 0.32, ding(0.14))
# contadores y resultados
for k in ["m3744", "quedan", "m2496", "m1466", "m2262", "s6070"]: add(T[k], moneda())
for k in ["apenas", "pasaj", "h30", "dueno", "m4830", "casi900", "s137", "m7050", "s386", "s755", "dif", "golpe", "rechazar", "sueldo"]: add(T[k], golpe())
add(T["chocas"], golpe(0.7))
x = x / max(1e-9, np.abs(x).max()) * 0.8
y = (np.repeat(x[:, None], 2, 1) * 32767).astype(np.int16)
w = wave.open("voz/efectos-crudos.wav", "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes()); w.close(); print("ok", len(T))
