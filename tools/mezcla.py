#!/usr/bin/env python3
"""Prepara la cama de música y los efectos con los niveles de la guía (/root/reels-ref/EDICION.md §1).
Uso: mezcla.py voz.wav musica.mp3 inicio_musica duracion salida_musica.wav [efectos_crudos.wav salida_efectos.wav]
- Música: 22 dB por debajo de la voz (medido en LUFS), pasa-altos 60 Hz, hueco de −5 dB en 1–4 kHz,
  baja 4 dB más cuando habla la voz (sidechain suave, ataque 30 ms / salida 500 ms), fundido de entrada y salida.
- Efectos: 14 dB por debajo de la voz.
unir.sh después suma todo y normaliza a −14 LUFS: las diferencias entre pistas se mantienen."""
import subprocess, sys, re

def lufs(f, filtro=""):
    o = subprocess.run(["ffmpeg", "-nostats", "-i", f, "-af", (filtro + "," if filtro else "") + "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float(re.findall(r"I:\s+(-?[0-9.]+) LUFS", o)[-1])

voz, mus, ini, dur, out = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
lv = lufs(voz)
recorte = f"atrim=start={ini}:duration={dur},asetpts=PTS-STARTPTS"
lm = lufs(mus, recorte)
g = (lv - 22) - lm
fil = (f"[0:a]{recorte},aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=60,"
       f"equalizer=f=2500:width_type=o:width=1.6:g=-5,volume={g:.2f}dB,afade=t=in:d=0.4,afade=t=out:st={dur - 1.0}:d=1.0[m];"
       f"[1:a]aformat=sample_rates=48000:channel_layouts=stereo,apad[v];"
       f"[m][v]sidechaincompress=threshold=0.02:ratio=3:attack=30:release=500:makeup=1[o]")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mus, "-i", voz, "-filter_complex", fil, "-map", "[o]", "-t", str(dur), out], check=True)
print(f"voz {lv:.1f} LUFS · música {lm:.1f} → {lm + g:.1f} LUFS (−22 dB) · ganancia {g:+.1f} dB")
if len(sys.argv) > 7:
    ef, eo = sys.argv[6], sys.argv[7]
    le = lufs(ef); ge = (lv - 14) - le
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", ef, "-af", f"aformat=sample_rates=48000:channel_layouts=stereo,volume={ge:.2f}dB", eo], check=True)
    print(f"efectos {le:.1f} → {le + ge:.1f} LUFS (−14 dB)")
