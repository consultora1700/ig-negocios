#!/usr/bin/env python3
"""tramo.py index.html N i → "inicio fin" en segundos, cortados en cuadros enteros (30 fps)."""
import re, sys, math
html, n, i = open(sys.argv[1]).read(), int(sys.argv[2]), int(sys.argv[3])
dur = float(re.search(r'data-composition-id="main"[^>]*data-duration="([0-9.]+)"', html).group(1))
fps = 30; total = round(dur * fps); paso = math.ceil(total / n)
a, b = i * paso, min(total, (i + 1) * paso)
print(f"{a / fps:.4f} {b / fps:.4f}")
