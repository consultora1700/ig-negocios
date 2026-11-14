#!/usr/bin/env python3
"""Transcribe con tiempos por palabra. Uso: palabras.py audio.wav salida.json [modelo]"""
import os, sys, json, subprocess, numpy as np
os.environ.setdefault("HF_HOME", "/root/campana-turnolink/.modelos")
from faster_whisper import WhisperModel
a, out = sys.argv[1], sys.argv[2]; mod = sys.argv[3] if len(sys.argv) > 3 else "medium"
pcm = subprocess.run(["ffmpeg","-v","error","-i",a,"-ac","1","-ar","16000","-f","s16le","-"],capture_output=True,check=True).stdout
audio = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
m = WhisperModel(mod, device="cpu", compute_type="int8")
segs, info = m.transcribe(audio, language="es", word_timestamps=True, initial_prompt=os.environ.get("PISTA", "Martín, Lucas, almacén, yerba, WhatsApp, fiarle."))
W = []
for s in segs:
    for w in s.words: W.append({"text": w.word.strip(), "start": round(w.start,3), "end": round(w.end,3)})
json.dump(W, open(out,"w"), ensure_ascii=False, indent=0)
print(len(W), "palabras")
print(" ".join(w["text"] for w in W))
