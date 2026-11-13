#!/usr/bin/env python3
"""Genera video/compositions/subtitulos.html: una palabra por vez, texto del guion + tiempos de Whisper."""
import json, re, difflib, unicodedata, html
G = open("voz/guion-v3.txt").read().split()
W = json.load(open("voz/voz-v3-palabras.json"))
norm = lambda s: re.sub(r"[^a-z0-9ñ]", "", unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode())
a = [norm(x) for x in G]; b = [norm(w["text"]) for w in W]
T = [None] * len(G)
for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
    if op == "equal":
        for k in range(i2 - i1): T[i1 + k] = (W[j1 + k]["start"], W[j1 + k]["end"])
    else:  # repartir el tramo de Whisper entre las palabras del guion
        if j2 > j1: s, e = W[j1]["start"], W[j2 - 1]["end"]
        else: s = T[i1 - 1][1] if i1 else 0; e = s + 0.3 * (i2 - i1)
        n = i2 - i1
        for k in range(n): T[i1 + k] = (s + (e - s) * k / n, s + (e - s) * (k + 1) / n)
        print("ajuste:", G[i1:i2], "<-", [w["text"] for w in W[j1:j2]])
EM = {"Martín", "Lucas", "Martín.", "Martín,", "Lucas,", "persiana.", "suerte.", "cuaderno.", "ocho.", "llena.", "tarde.", "hoy:", "negocio?"}
els, js = [], []
for i, (w, (s, e)) in enumerate(zip(G, T)):
    s = max(0.0, s - 0.03)
    nxt = T[i + 1][0] - 0.03 if i + 1 < len(G) else e + 1.6
    end = max(e, min(nxt, e + 0.45))
    if i + 1 < len(G): end = min(end, nxt)
    end = max(end, s + 0.08)  # nunca un clip de duración 0: quedaría visible para siempre
    cls = "w" + (" em-m" if "Martín" in w else " em-l" if "Lucas" in w else "")
    txt = w.strip("—").replace("…", "").replace("«", "").replace("»", "")
    if not txt: continue
    els.append(f'    <div id="w{i}" class="clip {cls}" data-start="{s:.3f}" data-duration="{end - s:.3f}"><span>{html.escape(txt)}</span></div>')
    js.append(f'tl.fromTo("#w{i} span",{{scale:0.82,opacity:0}},{{scale:1,opacity:1,duration:0.09,ease:"back.out(2.5)"}},{s:.3f});')
doc = f'''<template>
  <style>
    #root {{ position:absolute; inset:0; pointer-events:none; }}
    .w {{ position:absolute; left:0; right:0; top:1200px; text-align:center; overflow:visible; }}
    .w span {{ display:inline-block; font-family:"Montserrat"; font-weight:800; font-size:66px; letter-spacing:-0.01em; color:#fff;
      -webkit-text-stroke:12px #000000; paint-order:stroke fill; }}
    .em-m span {{ color:#BFC4CC; }}
    .em-l span {{ color:#00CFFF; }}
  </style>
  <div id="root" data-composition-id="subtitulos" data-width="1080" data-height="1920">
{chr(10).join(els)}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    {chr(10).join(js)}
    window.__timelines["subtitulos"] = tl;
  </script>
</template>
'''
open("video/compositions/subtitulos.html", "w").write(doc)
print(len(els), "palabras; última termina en", T[-1][1])
