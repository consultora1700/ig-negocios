# REVIEW — Reel 01 «Dos almacenes» (v1, 2026-11-13)

## Decisiones creativas
- Mundo 3D real (Three.js) con los dos almacenes en la misma cuadra; pantalla partida con una cámara por mitad y divisor que se mueve hacia el protagonista. Contador AÑO 0–5 en el divisor.
- Gráficos 2D encima solo donde el 3D no alcanza: cuaderno contra celular, ranking 20/40, reglas de precio, tijera, checklist.
- Subtítulos de una palabra por vez (como la referencia), con el texto del guion y no el de Whisper.
- Voz: Gemini TTS «Puck» rioplatense, silencios acortados a 0,4 s y tempo ×1,04 (110 s → 95 s).
- Música: Mixkit 22 (117 BPM, sin voz), con ducking bajo la voz (~11 dB debajo). 119 efectos rotando tomas.

## Qué se midió y qué solo se miró
- Medido: loudness de cada pista (voz −19,6 LUFS, música −30,4, efectos −29,3); tiempos de cada palabra (Whisper medium).
- Mirado en cuadros fijos: unos 60 momentos. El render completo y el audio NO se escucharon: verificar a oído
  (sobre todo si la IA dijo «Hacé» y «fijate» con voseo: Whisper transcribió «Haz»/«fíjate»).

## Lo más flojo / qué cambiaría con más tiempo
- Primer plano de la yerba: mucho piso vacío debajo del estante.
- Los muñecos no caminan (se deslizan); el de Martín se va "flotando" en el bloque B.
- El mapa del barrio: los pedidos se leen chicos en el plano general.

## Advertencias conservadas
- subtitulos.html largo (609 líneas): generado por ../tools-subtitulos.py, no se edita a mano.
- `check` completo no termina en este VPS (el 3D muestrea lento): se usó `lint` + snapshots.
