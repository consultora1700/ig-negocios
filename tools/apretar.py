#!/usr/bin/env python3
"""Acorta silencios largos y reajusta los tiempos por palabra.
Uso: apretar.py in.wav palabras.json out.wav out-palabras.json [max_silencio=0.4] [tempo=1.0]"""
import sys, json, subprocess, re, numpy as np, wave
src, pj, out, oj = sys.argv[1:5]
MAX = float(sys.argv[5]) if len(sys.argv) > 5 else 0.4
TEMPO = float(sys.argv[6]) if len(sys.argv) > 6 else 1.0
log = subprocess.run(["ffmpeg","-i",src,"-af","silencedetect=noise=-35dB:d=0.3","-f","null","-"],capture_output=True,text=True).stderr
starts = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", log)]
ends = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", log)]
pcm = subprocess.run(["ffmpeg","-v","error","-i",src,"-ac","1","-ar","24000","-f","s16le","-"],capture_output=True,check=True).stdout
x = np.frombuffer(pcm, np.int16).astype(np.float32); SR = 24000
cuts = []  # (start, end) de lo que se quita
for s, e in zip(starts, ends):
    if s < 0.05: continue
    if e - s > MAX:
        mid = (s + e) / 2; quitar = (e - s) - MAX
        cuts.append((mid - quitar / 2, mid + quitar / 2))
segs, pos = [], 0.0
for a, b in cuts:
    segs.append((pos, a)); pos = b
segs.append((pos, len(x) / SR))
F = int(0.01 * SR); y = []
for a, b in segs:
    seg = x[int(a*SR):int(b*SR)].copy()
    if len(seg) > 2*F: seg[:F] *= np.linspace(0,1,F); seg[-F:] *= np.linspace(1,0,F)
    y.append(seg)
y = np.concatenate(y)
def mapt(t):
    q = t
    for a, b in cuts:
        if t >= b: q -= (b - a)
        elif t > a: q -= (t - a)
    return q / TEMPO
tmp = out + ".tmp.wav"
with wave.open(tmp, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(np.clip(y, -32768, 32767).astype(np.int16).tobytes())
subprocess.run(["ffmpeg","-v","error","-y","-i",tmp,"-af",f"atempo={TEMPO}","-ar","48000",out],check=True)
import os; os.remove(tmp)
W = json.load(open(pj))
for w in W: w["start"] = round(mapt(w["start"]),3); w["end"] = round(mapt(w["end"]),3)
json.dump(W, open(oj,"w"), ensure_ascii=False, indent=0)
print(f"{len(cuts)} silencios acortados; duración {len(y)/SR/TEMPO:.1f}s")
