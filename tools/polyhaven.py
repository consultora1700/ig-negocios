"""Baja modelos de Poly Haven (CC0) en glTF 1k. Uso: polyhaven.py id [id ...] (en la carpeta destino)"""
import json, sys, os, urllib.request
UA = {"User-Agent": "Mozilla/5.0"}
def get(u): return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60).read()
for i in sys.argv[1:]:
    if os.path.exists(f"{i}/{i}_1k.gltf"): print("ya", i); continue
    try: f = json.loads(get(f"https://api.polyhaven.com/files/{i}"))["gltf"]["1k"]["gltf"]
    except Exception as e: print("ERROR", i, e); continue
    os.makedirs(i, exist_ok=True); open(f"{i}/{i}_1k.gltf", "wb").write(get(f["url"]))
    for rel, d in f.get("include", {}).items():
        p = os.path.join(i, rel); os.makedirs(os.path.dirname(p), exist_ok=True); open(p, "wb").write(get(d["url"]))
    print("ok", i)
