# Recursos 3D gratis para el reel (relevado el 18/11/2026)

Criterio: solo fuentes donde el autor publica gratis el modelo (nada de warez). La columna «¿VPS?» se probó en vivo desde este servidor (curl HEAD o `curl -r 0-1000`, sin bajar el archivo completo):

- **sí**: devuelve 200/206 sin cuenta. El tamaño es el Content-Length real.
- **sí (itch)**: itch.io gratis o «name your own price». No hay link estático: el CDN firmado se resuelve con `python3 -I /root/tools/itchprobe/probe.py <url_itch>` (hace el POST que hace el botón «No thanks, just take me to the downloads» y lee solo 1 KB). Para bajarlo, se usa la URL firmada que devuelve el script (vence en 60 s).
- **gdown**: carpeta de Google Drive. Se lista con `/root/tools/venv-assets/bin/python -c "import gdown; gdown.download_folder(id='<ID>', skip_download=True)"`.
- **necesita cuenta**: la API de descarga de Sketchfab devuelve 401 sin token.
- **403**: el sitio bloquea al VPS.

Licencias: CC0 = sin atribución. CC-BY = hay que acreditar en el caption del reel. CC-BY-NC = solo uso no comercial. **Ojo:** el reel es para una cuenta de negocios; si se monetiza o promociona algo, evitar NC.

## 1. Sedán compacto

| categoría | nombre | autor | licencia | formato | tamaño | página | descarga directa | ¿VPS? | calidad / comentario |
|---|---|---|---|---|---|---|---|---|---|
| sedán | Car Kit 3.1 (sedan, sedan-sports, taxi, police, hatchback, SUV, van… + ruedas sueltas) | Kenney (subida a OGA por un tercero) | CC0 | GLB, FBX, OBJ | 4,8 MB zip | https://opengameart.org/content/car-kit | https://opengameart.org/sites/default/files/kenney_car-kit_3.1.zip | **sí** (kenney.nl da 403; este espejo en OGA anda) | Estilizado-prolijo, lowpoly limpio con colores planos. Ruedas separadas en todos los autos. Rinde bien en Three.js. Es el estilo «juguete premium» |
| sedán | Lowpoly Cars / «Realistic Car Pack» (NormalCar1 = sedán 4 puertas, NormalCar2, Taxi sedán, SportsCar, SUV) | Quaternius | CC0 (el Cop SUV es solo para Patreon) | FBX, OBJ, Blend | 2,6 MB zip | https://quaternius.itch.io/lowpoly-cars · https://quaternius.com/packs/cars.html | itch (probe.py) · Drive: https://drive.google.com/drive/folders/1fKlbDry77iY8KlEoxzUxIAZQL_XhzWlA | **sí (itch)** / **gdown** (listado OK) | El sedán celeste del preview es el más parecido a un Cronos/Voyage genérico. Lowpoly facetado con buen sombreado. Es de 2018: verificar si las ruedas vienen separadas (no está documentado). Sin GLB: exportar desde el .blend |
| sedán | Free Low Poly Vehicles Pack (1 sedán, 1 hatchback, taxi, policía sedán… 20 vehículos) | rgsdev | CC0 | FBX (zip) | 1,4 MB | https://rgsdev.itch.io/free-low-poly-vehicles-pack | itch (probe.py) | **sí (itch)** | Ruedas separadas y colores por material (fácil recolorear). Más «de juguete» y caricaturesco que Kenney |
| sedán | Red mid-sized four-door sedan (90s/2000s) | TopoSphere / Sloyd | CC-BY 4.0 | GLB | 5,9 MB | https://www.sloyd.ai/free-3d-models/model/a-red-mid-sized-four-door-sedan-1990s-to-early-2000s-04dtwkw5 | https://storage.googleapis.com/ai-services-quality/jobs/04dtwkw5.glb | **sí** (200, magic `glTF`) | Generado con IA (Sloyd). Aspecto semi-realista con textura horneada, estilo sedán GM de los 80/90 (no moderno). Casi seguro es una malla única sin ruedas separadas. Sirve como plan B «realista» bajable ya |
| sedán | PSX Style Cars (Car 02 saloon, Car 05 sedán/taxi/policía, etc.) | GGBot | CC0 | FBX/OBJ (zip) | 2,6 MB | https://ggbot.itch.io/psx-style-cars | itch (probe.py) | **sí (itch)** | Estética PS1 retro (300-470 tris, texturas de 128 px). Solo sirve si el reel busca ese look |
| sedán | Low Poly Car Randomness A02 City | Kaytomasu | CC0 | OBJ, FBX, GLB | 4,7 MB zip | https://kaytomasu.itch.io/low-poly-car-randomness-a02-city | itch (probe.py) | **sí (itch)** | **No es sedán**: es un hatch tipo Fiat Panda. Lowpoly prolijo con UV. Útil como auto de fondo |
| sedán | Simple lowpoly car | Daniel Dormin | sin CC explícita («feel free to use it in your projects or change it») | GLB, FBX, Blend | 385 KB glb | https://daniel-dormin.itch.io/simple-lowpoly-car | itch (probe.py) | **sí (itch)** | Ruedas separadas. Licencia informal: mejor no usarlo como protagonista |
| sedán | car-model | jaspior | CC0 | GLB, DAE | 265 KB | https://jaspior.itch.io/car-model | itch (probe.py) | **sí (itch)** (probado con navegador y con script) | Muy simple. El autor avisa que los materiales de ruedas y vidrios están rotos |
| sedán | Low Poly Car Pack (3 autos, 2 pickups, bus) | Devil's Work.shop | CC0 | FBX, OBJ, DAE | 2,2 MB | https://devilsworkshop.itch.io/3d-low-poly-car-game-asset-pack-vehicles-free | itch (probe.py) | **sí (itch)** | Lowpoly texturado (2018), calidad media |
| sedán | Low poly vehicles pack (Bus, Jeep, Pickup, Sedan) | Daniel Quevedo (OGA) | CC0 | FBX, Blend | 74 KB fbx / 590 KB blend | https://opengameart.org/content/low-poly-vehicles-pack | https://opengameart.org/sites/default/files/VehiclesFBXformat.zip · https://opengameart.org/sites/default/files/VehiclesLowPoly.blend | **sí** | Muy básico, sin texturas |
| sedán (no es sedán) | CarConcept (Khronos sample) | Eric Chadwick / Khronos, sobre un CC0 de «Unity Fan» | CC-BY 4.0 | GLB | 11,8 MB | https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept | https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CarConcept/glTF-Binary/CarConcept.glb | **sí** | Calidad alta, con materiales clearcoat y variantes. Pero es un concept car deportivo, no un sedán compacto |
| sedán | Generic passenger car pack (varios sedanes y hatch genéricos sin marca, <8k tris c/u) | comrade1280 | CC-BY | GLB, Blend… | 26,7 MB glb | https://sketchfab.com/3d-models/20f9af9b8a404d5cb022ac6fe87f21f5 | — | **necesita cuenta** | **El mejor sedán genérico «realista-limpio» que encontré.** 2.300 likes. Sin marcas, ideal para un Cronos/Voyage genérico. Hay que bajarlo con cuenta de Sketchfab |
| sedán | Voyage GL 1.8 (VW Voyage 1992, 2 puertas, con interior) | lael.eugenio | CC-BY | GLB… | 12 MB | https://sketchfab.com/3d-models/d5527fb1aff24ba0bc785370ffb14fba | — | **necesita cuenta** | Modelado propio, con interior. Es el Voyage viejo y el autor admite errores |
| sedán | Volkswagen Voyage | niev | CC-BY | GLB… | 31 MB | https://sketchfab.com/3d-models/ea1eaa6d28334669aa3a4c5abfd39bf1 | — | **necesita cuenta** | 1M de tris, pesado. Sin descripción de origen: verificar que no sea un rip |
| sedán | Chevrolet Onix 2024 / chevrolet onix | Uzbek3D / uzbek_supra | CC-BY | GLB… | 21,7 / 13,9 MB | https://sketchfab.com/3d-models/bcc8987606db4088b039e55fe70fa379 · https://sketchfab.com/3d-models/bfd798c2695847b28ab681d42abc7056 | — | **necesita cuenta** | ⚠️ Sin descripción y de cuentas que suben autos de marca en serie: **probable rip de un juego**. No lo recomiendo aunque diga CC-BY. Además, mostrar el Onix pone una marca registrada en el reel |
| sedán | Fiat Cronos / Toyota Etios / Fiat Siena | — | — | — | — | (búsqueda en la API de Sketchfab) | — | — | **No hay ninguno descargable con licencia CC** |

## 2. Interior de auto

| categoría | nombre | autor | licencia | formato | tamaño | página | descarga directa | ¿VPS? | calidad / comentario |
|---|---|---|---|---|---|---|---|---|---|
| interior | Retro Car With Interior (sedán de los 80, 4 colores, interior detallado, puertas con pivote) | Bruno Bricchi (bricchi-games) | CC-BY (comercial OK con atribución) | FBX (zip/rar) | 3,0 MB | https://bricchi-games.itch.io/retro-car-with-interior | itch (probe.py) | **sí (itch)** | Estilo PSX/retro. Es el único sedán bajable con tablero, asientos y volante. Puertas y capó abren |
| interior | Ultimate 3D Car Assets Pack (20 autos con interior y animación) | lyricsz (OGA) | CC0 | Blend, glTF, FBX | 1,7 MB | https://opengameart.org/content/ultimate-3d-car-assets-pack-w-interiors-and-animations | https://opengameart.org/sites/default/files/cars20withanimation_0.zip | **sí** | Calidad muy baja (cajas). Descartable salvo apuro |
| interior | Rigged Car (volante y ruedas que giran, puertas que abren, interior básico) | eracoon | CC-BY 3.0 | Blend (zip) | 2,6 MB | https://opengameart.org/content/rigged-car | https://opengameart.org/sites/default/files/rigged_car.zip | **sí** | Rig útil para animar el volante. Calidad modesta |
| interior | Steering wheel (alta, baja, control) | OGA | CC0 | OBJ | chico | https://opengameart.org/content/steering-wheel | https://opengameart.org/sites/default/files/high_6.obj | **sí** | Volante suelto sin texturas: sirve para un primer plano con material propio |
| interior | Car Concept (interior visible) | Khronos | CC-BY 4.0 | GLB | 11,8 MB | ver sección 1 | ver sección 1 | **sí** | Tiene cabina, pero de concept car |
| interior | Toyota AE86 Sprinter Trueno (con interior) | TinoD2 | CC-BY | GLB | 87 MB | https://sketchfab.com/3d-models/a5737bf3cc9b4179a6e5ebe173ff70d9 | — | necesita cuenta | Muy bueno pero pesado, y es un coupé de marca |
| interior | soporte de celular | — | — | — | — | — | — | — | **No encontré ninguno libre**: conviene modelarlo (son 3 primitivas) |

## 3. Taller mecánico

| categoría | nombre | autor | licencia | formato | tamaño | página | descarga directa | ¿VPS? | calidad / comentario |
|---|---|---|---|---|---|---|---|---|---|
| taller | Car Lift (elevador) | rdt (OGA) | CC-BY 3.0 | zip (Blend/OBJ) | 565 KB | https://opengameart.org/content/car-lift | https://opengameart.org/sites/default/files/CarLift.zip | **sí** | El único elevador bajable sin cuenta. Lowpoly simple: revisar en Blender si es de dos columnas |
| taller | Car lift (elevador de 2 columnas, 21k tris) | Sargone | CC-BY | GLB… | 3,5 MB | https://sketchfab.com/3d-models/1b4ae76820294373bc19ee16b9a4db61 | — | necesita cuenta | Mejor calidad: elevador de 2 columnas realista |
| taller | Carlift | roughdominator | CC-BY | GLB… | 16,8 MB | https://sketchfab.com/3d-models/2dfad5340895423b8ec58fc392e4af32 | — | necesita cuenta | 348 likes, lowpoly texturado |
| taller | Poly Haven: metal_tool_chest, tool_cart, metal_toolbox, combination_wrench, ratchet_wrench, adjustable_wrench, pliers, screwdrivers_02, tire_pump, lubricant_spray, oil_tin, steel_frame_shelves_01, old_military_compressor, **old_tyre**, rusted_wheel_rim_02, covered_car | Poly Haven | CC0 | glTF, Blend, FBX (1k/2k/4k) | 1,5–3,2 MB c/u a 1k | https://polyhaven.com/models | patrón: https://dl.polyhaven.org/file/ph-assets/Models/gltf/1k/<id>/<id>_1k.gltf (+ .bin y texturas listados en https://api.polyhaven.com/files/<id>) | **sí** (200) | **Calidad fotorrealista, la mejor de todo el relevamiento.** Para apilar cubiertas, duplicar `old_tyre` (la cubierta es vieja/gastada) |
| taller | Old, dirty, stacked tires (escaneo) | ZiemniaQ | CC-BY | GLB | 8,1 MB | https://sketchfab.com/3d-models/f9d64bd1fdde49fe8571f83f59114663 | — | necesita cuenta | Pila de cubiertas ya armada, fotogrametría, 1,2k caras |
| taller | Big Tire | OGA | CC-BY 3.0 | Blend | 522 KB | https://opengameart.org/content/big-tire | https://opengameart.org/sites/default/files/big_tire.blend | **sí** | Cubierta de taco grueso (todo terreno), no de auto de calle |
| taller | Mechanic's Tool-set (8 herramientas) | Devil's Work.shop | CC0 | FBX, OBJ, DAE | 134 KB | https://opengameart.org/content/low-poly-pixel3d-mechanics-toolset-asset-pack-devils-workshop | https://opengameart.org/sites/default/files/Low_Poly_Pixel3D_Mechanics_Tool_Set_Asset_Pack_devilsworkshop_v02.zip | **sí** | Lowpoly pixel-art, estilizado |
| taller | Mechanics Auto workshop and Cars | JohanMangu | **sin licencia declarada** | zip | 296 KB | https://johanjimenex.itch.io/mechanics-auto-workshop-and-cars | itch (probe.py) | sí (itch) | Voxel/pixel. Al no tener licencia, no usar |

## 4. Surtidor / estación de servicio

| categoría | nombre | autor | licencia | formato | tamaño | página | descarga directa | ¿VPS? | calidad / comentario |
|---|---|---|---|---|---|---|---|---|---|
| surtidor | Gas Station (escenario completo: surtidores, techo, tienda) | elbolilloduro | CC0 | FBX (rar) | 32 MB | https://elbolilloduro.itch.io/gas-station | itch (probe.py) | **sí (itch)** | Autor latino. La versión de Sketchfab tiene 910 likes: escenario semi-realista y prolijo. Viene en .rar (hace falta `unrar`/`7z`). Algunas texturas salen de Pexels/Textures.com |
| surtidor | Post-Apocalyptic Gas Station [FREE] (75 piezas) | Atomic Realm | gratis **con atribución obligatoria** (licencia propia, no CC) | FBX, OBJ, glTF | 18,5 MB | https://atomicrealm.itch.io/post-apocalyptic-gas-station | itch (probe.py) | **sí (itch)** | Lowpoly con una sola textura. Look abandonado/apocalíptico: no encaja con una estación moderna |
| surtidor | Retro Gas Pump | Guardian5 | licencia propia: uso personal y comercial, sin reventa | FBX + texturas 2k | 7,9 MB | https://guardian5.itch.io/retro-gas-pump | itch (probe.py) | **sí (itch)** | Surtidor vintage rojo/amarillo, PBR. No es moderno |
| surtidor | 3 fuel dispensers (3 variantes modernas) | Bansheeva | CC-BY | GLB… | 4,7 MB | https://sketchfab.com/3d-models/0f33ac7f1d0b4e8ab6127cb50f7f5963 | — | necesita cuenta | Surtidores modernos: lo más cercano a uno de YPF/Shell genérico |
| surtidor | gas pump (PBR 4k) | youoyouyou | CC-BY | GLB… | 15,2 MB | https://sketchfab.com/3d-models/add0f902b9164718bd0540e88bf9927e | — | necesita cuenta | 454 likes, PBR de buena calidad |
| surtidor | Gas station Props | Elbolilloduro | CC-BY | GLB… | 4,8 MB | https://sketchfab.com/3d-models/8fcd52f1b12e4b4296589b4c6328b777 | — | necesita cuenta | Props sueltos del mismo autor (en itch están bajo CC0) |
| surtidor GNC | — | — | — | — | — | — | — | — | **No existe ninguno libre.** Opción: tomar un surtidor moderno y retexturarlo con la calcomanía «GNC» y una manguera más gruesa |

## 5. Escritorio de oficina / trámites

| categoría | nombre | autor | licencia | formato | tamaño | página | descarga directa | ¿VPS? | calidad / comentario |
|---|---|---|---|---|---|---|---|---|---|
| oficina | Poly Haven: metal_office_desk, office_notepads, clipboard, stationery_supplies, binder_notebook, vintage_stapler, classic_laptop, drawer_cabinet, modern_arm_chair_01, desk_lamp_arm_01 | Poly Haven | CC0 | glTF/Blend/FBX | 1,3–2,3 MB c/u a 1k | https://polyhaven.com/models | mismo patrón dl.polyhaven.org | **sí** (200) | Fotorrealista. El escritorio es metálico de oficina pública (muy «trámite»). Se completan bien con anotadores y carpetas |
| oficina | Smartphone (alta calidad, texturas 4k) | OGA (nisu) | CC0 | zip | 3,7 MB | https://opengameart.org/content/smartphone-2 | https://opengameart.org/sites/default/files/phone.zip | **sí** | Smartphone moderno genérico. Es el mejor celular libre que se puede bajar sin cuenta |
| oficina | Smartphone (Samsung viejo, 300 tris) | OGA | CC0 | OBJ, Blend | chico | https://opengameart.org/content/smartphone-1 | https://opengameart.org/sites/default/files/samsung-sgh-i677_1.blend | **sí** | Viejo: no sirve como celular moderno |
| oficina | Apple iPhone 13 Pro Max | DatSketch | CC-BY | GLB | 1,8 MB | https://sketchfab.com/3d-models/4328dea00e47497dbeac73c556121bc9 | — | necesita cuenta | Muy bueno, pero es una marca: mejor un celular genérico |
| oficina | Money (fajos de billetes) | yughues (OGA) | CC0 | 7z | 13,9 MB | https://opengameart.org/content/money | https://opengameart.org/sites/default/files/money.7z | **sí** | Billetes genéricos (no pesos). Para pesos: reemplazar la textura con un diseño propio, evitando reproducir billetes reales |
| oficina | Old Victorian Rubber Stamp (sello) | lux87 | CC-BY | GLB | 2,2 MB | https://sketchfab.com/3d-models/be402a8d73c74fd6b9ca5acc057a208d | — | necesita cuenta | Sello de madera clásico. No encontré un sello libre bajable sin cuenta |
| oficina | Office Props Lowpoly (papeles, porta-papeles, laptop, tazas…) | lakawaka | CC-BY | GLB | 2,4 MB | https://sketchfab.com/3d-models/36b97aeac9fc46499262c036eea265f3 | — | necesita cuenta | Estilizado plano |
| oficina | Office Desk and Chair Set | OGA | CC0 | zip | 8,8 MB | https://opengameart.org/content/office-desk-and-chair-set | https://opengameart.org/sites/default/files/OfficeSetcc0.zip | **sí** | Escritorio de madera lowpoly, viejo |
| oficina | 3TD Office Starter Pack | Ron Kapaun | CC0 | DAE | 5,2 MB | https://opengameart.org/content/3td-office-starter-pack | https://opengameart.org/sites/default/files/3TD_Office%20Starter.zip | **sí** | Calidad mediocre (era Torque3D) |
| oficina | Low Poly Office Props (+230 modelos) | rrfreelance | **sin licencia clara** | FBX, unitypackage | 3,7 MB fbx | https://rrfreelance.itch.io/low-poly-office-props | itch (probe.py) | sí (itch) | Gran variedad, pero la licencia no está clara: no usar |
| oficina | DeskIt (libros, taza, lapicero, monitor, lámpara) | paderunt | gratis, sin CC explícita | GLB, Blend | 1,5 MB | https://paderunt.itch.io/deskit-props | itch (probe.py) | **sí (itch)** | Estilo cozy/estilizado |
| oficina | ⚠️ Cash Pile / Money Stacks | 3D_Crackhouse | dice CC-BY | — | — | https://sketchfab.com/3d-models/87fa8f53ad404b1487ecf85fb1404eeb | — | — | **Descartado: extraído de GTA V** (lo dice la descripción). Es material de terceros |

## 6. Personajes con rig

| categoría | nombre | autor | licencia | formato | tamaño | página | descarga directa | ¿VPS? | calidad / comentario |
|---|---|---|---|---|---|---|---|---|---|
| personajes | Cartoon City Massive Pack – Characters (versión Free: 17 personajes urbanos, mismo esqueleto y animaciones) | RG Poly | CC0 | FBX, glTF | 15,3 MB | https://rg-poly.itch.io/cartoon-city-massive-pack-characters | itch (probe.py, URL canónica con «-characters») | **sí (itch)** | **Gente común de ciudad (oficinistas, trabajadores)**: encaja mejor que Quaternius para mecánico, cliente o empleado |
| personajes | Universal Base Characters (6 bases, 20 peinados, rig humanoide retargeteable) | Quaternius | CC0 | glTF/FBX/Blend | 129 MB | https://quaternius.itch.io/universal-base-characters | itch (probe.py) | **sí (itch)** (pesa: con el disco al 95 % conviene mover algo antes) | Más moderno y prolijo que el UACP. Rig estándar para animaciones de Mixamo |
| personajes | Ultimate Animated Character Pack (50+: chef, doctor, casual, etc.) | Quaternius | CC0 | Blend/FBX/glTF | carpeta | https://quaternius.com/packs/ultimatedanimatedcharacter.html | Drive: https://drive.google.com/drive/folders/1sNi1AfenfPRrvRt5yfaj5QMMd6KKcUJ5 | **gdown** (listado OK) | Ya conocido. Lowpoly, ya animado |
| personajes | KayKit Adventurers 2.0 (5 personajes, rig + animaciones) | Kay Lousberg | CC0 | glTF/FBX | 13 MB | https://kaylousberg.itch.io/kaykit-adventurers | itch (probe.py) | **sí (itch)** | Estilizado y muy prolijo, pero de temática fantasía (no sirve para taller ni oficina) |
| ciudad (extra) | KayKit City Builder Bits (incluye autitos y calles) | Kay Lousberg | CC0 | glTF, FBX, OBJ | 4,9 MB | https://kaylousberg.itch.io/city-builder-bits | itch (probe.py) | **sí (itch)** | Para planos aéreos de ciudad estilizada |

## Fuentes revisadas sin resultado útil

- **kenney.nl**: la página carga, pero los archivos dan **403** desde el VPS. El Car Kit se baja del espejo en OGA (ver arriba).
- **poly.pizza**: **403**.
- **Free3D**: **403**.
- **CGTrader free**: devuelve 202 con desafío anti-bot y además pide cuenta para descargar.
- **TurboSquid free**: pide cuenta (no lo probé).
- **BlenderKit**: requiere cuenta y el add-on, incluso para los gratis.
- **ambientCG**: solo materiales y HDRIs, sin modelos de estas categorías.
- **Smithsonian 3D**: nada relevante.
- **3dmodelscc0.com** (citado en OGA): el dominio fue secuestrado y redirige a otro sitio.
- **Sketchfab**: la API de búsqueda funciona; la de descarga da **401** sin token, así que todo lo de Sketchfab figura como «necesita cuenta». Todo lo «Free Standard» de Sketchfab NO es CC y lo dejé afuera.

## Recomendación

**Mejor sedán bajable hoy, sin cuenta: Kenney Car Kit 3.1** (CC0, GLB con ruedas separadas, 4,8 MB, espejo en OGA). Su `sedan` es un sedán compacto estilizado-prolijo, coherente para Blender y Three.js. Alternativa del mismo estilo: **Quaternius NormalCar1** (CC0, itch/gdown, hay que exportar a GLB desde el .blend). Si se necesita look semi-realista ya: el **sedán de Sloyd** (CC-BY, GLB 5,9 MB, IA, estética 80/90). Si alguien puede bajarlo con su cuenta de Sketchfab desde otra máquina, el mejor realista-genérico es **«Generic passenger car pack» de comrade1280** (CC-BY, 26,7 MB).

Mejor juego por categoría que SÍ se baja:

1. **Interior:** Retro Car With Interior (Bricchi, CC-BY) si sirve lo retro. Si no, el auto de Kenney más una cabina armada a mano con el volante CC0 de OGA. El soporte de celular, modelarlo.
2. **Taller:** **Poly Haven** (CC0, fotorrealista): tool_cart, metal_tool_chest, llaves, old_tyre duplicado en pila, steel_frame_shelves, oil_tin, lubricant_spray. Elevador: Car Lift de OGA (CC-BY 3.0). Si se consigue cuenta, el de Sargone en Sketchfab.
3. **Surtidor:** Gas Station de **elbolilloduro** (CC0, 32 MB rar). Para GNC, retexturar uno de sus surtidores.
4. **Oficina:** **Poly Haven** (metal_office_desk, office_notepads, clipboard, binder_notebook, stationery_supplies, vintage_stapler), Smartphone CC0 de OGA (phone.zip) y Money CC0 de OGA (retexturar a pesos ficticios). El sello solo está en Sketchfab: modelarlo es trivial.
5. **Personajes:** **RG Poly Cartoon City Characters Free** (CC0, 17 personajes urbanos con animaciones compartidas). Para un look más moderno: Quaternius Universal Base Characters (CC0, rig humanoide para Mixamo).

Créditos obligatorios si se usan los CC-BY: Sloyd/TopoSphere, Bricchi, OGA rdt (Car Lift), eracoon (Rigged Car), Khronos (CarConcept) y Atomic Realm (licencia propia).
