#!/usr/bin/env bash
# unir.sh <carpeta-tramos> <proyecto> <salida.mp4>: une los tramos (sin re-codificar) y suma voz + música + efectos a −14 LUFS.
set -euo pipefail
T="$1"; P="$2"; OUT="$3"; A="$P/assets/audio"
ls "$T"/tramo-*.mp4 | sort -t- -k2 -n | sed "s|^|file '$PWD/|; s|$|'|" > lista.txt
cat lista.txt
ffmpeg -v error -y -f concat -safe 0 -i lista.txt -an -c:v copy video.mp4
ffmpeg -v error -y -i "$A/voz.wav" -i "$A/musica.wav" -i "$A/efectos.wav" -filter_complex \
  "[0:a]aformat=sample_rates=48000:channel_layouts=stereo[v];[1:a]aformat=sample_rates=48000:channel_layouts=stereo[m];[2:a]aformat=sample_rates=48000:channel_layouts=stereo[e];[v][m][e]amix=inputs=3:normalize=0:duration=longest,loudnorm=I=-14:TP=-1.5:LRA=11[o]" \
  -map "[o]" -ar 48000 mezcla.wav
ffmpeg -v error -y -i video.mp4 -i mezcla.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT"
ffmpeg -i "$OUT" -af ebur128 -f null - 2>&1 | grep -E "^\s+(I|Peak):" | tail -2 || true
