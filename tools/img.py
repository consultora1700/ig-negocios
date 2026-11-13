#!/usr/bin/env python3
"""Genera una imagen con Gemini. Uso: img.py salida.png "prompt" [modelo] [ref1.png ref2.png ...]
Clave en /root/campana-turnolink/.env.gemini (no se imprime)."""
import json, base64, sys, urllib.request, urllib.error, pathlib, time
env = pathlib.Path("/root/campana-turnolink/.env.gemini")
KEY = dict(l.split("=", 1) for l in env.read_text().split() if "=" in l)["GEMINI_API_KEY"].strip()
out, prompt = sys.argv[1], sys.argv[2]
modelo = sys.argv[3] if len(sys.argv) > 3 else "gemini-3.1-flash-image"
parts = [{"text": prompt}]
for r in sys.argv[4:]:
    parts.append({"inline_data": {"mime_type": "image/png", "data": base64.b64encode(open(r, "rb").read()).decode()}})
body = {"contents": [{"parts": parts}], "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "1:1"}}}
url = f"https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent"
for i in range(4):
    try:
        req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": KEY})
        d = json.load(urllib.request.urlopen(req, timeout=240)); break
    except urllib.error.HTTPError as e:
        msg = e.read().decode(errors="replace")[:500]
        if e.code in (500, 503): time.sleep(15 * (i + 1)); continue
        sys.exit(f"HTTP {e.code}: {msg}")
else:
    sys.exit("sin respuesta")
for c in d["candidates"][0]["content"]["parts"]:
    if "inlineData" in c or "inline_data" in c:
        x = c.get("inlineData") or c.get("inline_data")
        open(out, "wb").write(base64.b64decode(x["data"])); print("ok", out); break
else:
    sys.exit("sin imagen: " + json.dumps(d)[:400])
