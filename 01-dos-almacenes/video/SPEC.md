# SPEC — Reel 01 «Dos almacenes»

GOAL:    que el emprendedor se reconozca en Martín, entienda el precio de reposición y comente "¿cuál sos vos?".
OUTPUT:  HyperFrames, 1080 x 1920, 30 fps.
TIME:    97 s x 30 = 2910 frames. La voz (voz/voz.wav, 95,2 s) es el reloj; la música va de fondo, sin grilla.

LOOK:    maqueta de arcilla bajo luz de estudio (la "maqueta" es el medio).
         Fondo #EFE6D6 (cielo cálido), vereda de baldosa #D9CBB2 con juntas #C4B496, calle #3E3F45.
         Tinta #17161A. Martín = #E0482F (rojo tomate). Lucas = #12A06B (verde). Dinero = #F2B630 (oro).
         Un solo acento por cuadro: el color del protagonista del momento.
         Materiales: MeshStandardMaterial con rugosidad 0,85 (arcilla), sombras suaves PCF 2048, hemisférica 1,1 + sol 2,4 desde arriba a la izquierda.
         Display: Montserrat 900, títulos al 5–8 % del alto (96–150 px), tracking −2 %. Etiquetas: Montserrat 800 a 34–44 px.
         Subtítulos: Montserrat 800 a 64 px, blancos con contorno #17161A de 10 px, una palabra por vez, centrados en y = 1235.
OBJECTS: almacén = local de barrio con persiana metálica ondulada, cartel "ALMACÉN <NOMBRE>", góndola de 3 estantes con productos,
         mostrador con caja registradora, vereda de baldosas. Personas = muñecos de arcilla (cuerpo cápsula, cabeza esfera, ojos de punto),
         con remera del color de su almacén; empleados con delantal gris. Plata = pila de monedas doradas al lado del local.
         Yerba = paquete rectangular verde y amarillo con la palabra YERBA (sin marca real).
MOTION:  llegadas expo.out 0,5–0,7 s; cámaras power2.inOut 0,9–1,6 s; salidas power3.in a mitad de duración de la entrada;
         resortes back.out(1.6) solo en posición y escala (personas y locales que aparecen). Escalonado de palabras 70 ms y de ítems 60 ms.
SHOTS:   A 0–11,5 gancho · B 11,8–31 ponerle el cuerpo · C 31–43 cuaderno contra sistema · D 43–49,7 depósito ·
         E 49,9–55,8 segunda sucursal (mapa) · F 56,1–75,5 la yerba (giro) · G 75,6–85,2 el año 1 engaña (gráfico tijera) · H 85,7–97 cierre.
         La pantalla partida (Martín arriba, Lucas abajo) es la base; el divisor se mueve para dar el cuadro completo al protagonista.
BANNED:  vacío oscuro con brillos; todo centrado y apareciendo a la vez; pastillas/chips; tres tarjetas en fila; texto que se mueve mientras se lee;
         gradientes violetas; íconos Sparkles; marcas reales (yerba, WhatsApp solo como "pedidos por chat" con globo verde genérico).
QA:      0,2 s (el gancho ya se lee), 7,9 (persiana cae), 13,0 (empleados), 21,5 (íconos de Lucas), 39 (ranking), 44 (depósito),
         54 (mapa), 68,5 (10 → 8), 74,5 (caja llena y estante vacío), 83,5 (tijera), 92 ("sos Martín"), 96 (pregunta final).
