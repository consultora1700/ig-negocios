#!/usr/bin/env python3
"""Gemini TTS (endpoint interactions). Uso: tts.py VOZ salida.wav "texto" [estilo]
La clave se lee de ../.env.gemini (permisos 600); nunca se imprime."""
import json, base64, sys, time, urllib.request, urllib.error, pathlib
MODELO = "gemini-3.8-flash-tts"
ESTILO = ("locutor publicitario argentino de Buenos Aires, acento rioplatense marcado con voseo; "
          "cálido, seguro y cercano; ritmo ágil de anuncio de Instagram")
env = pathlib.Path("/root/campana-turnolink/.env.gemini")
KEY = dict(l.split("=", 1) for l in env.read_text().split() if "=" in l)["GEMINI_API_KEY"].strip()
voz, salida, texto = sys.argv[1], sys.argv[2], sys.argv[3]
estilo = sys.argv[4] if len(sys.argv) > 4 else ESTILO
body = {"model": MODELO,
        "input": [{"type": "user_input", "content": [{"type": "text", "text": texto,
                   "annotations": [{"type": "speech_metadata", "style": estilo}]}]}],
        "response_format": {"type": "audio"},
        "generation_config": {"speech_config": [{"voice": voz}]}}
for intento in range(6):
    req = urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/interactions",
          data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": KEY})
    try:
        d = json.load(urllib.request.urlopen(req, timeout=180)); break
    except urllib.error.HTTPError as e:
        msg = e.read().decode(errors="replace")[:400]
        if e.code == 503: print(f"503 alta demanda, reintento {intento+1}", file=sys.stderr); time.sleep(20 * (intento + 1)); continue
        sys.exit(f"HTTP {e.code}: {msg}")
else:
    sys.exit("sin respuesta tras 6 intentos")
audio = [c["data"] for s in d.get("steps", []) for c in s.get("content", []) if isinstance(c, dict) and c.get("data")][-1]
open(salida, "wb").write(base64.b64decode(audio))  # ya viene como WAV con encabezado
print("ok", salida)
