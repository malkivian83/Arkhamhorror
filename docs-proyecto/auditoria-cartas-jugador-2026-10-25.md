# Auditoría y colas de lotes de cartas de jugador

> Publicado el 26/10/2026 como instantánea histórica del commit 03f4fb6ee9000659afdf6d6cca791f0b597cf783. `main` avanzó durante la publicación hasta 57761b4e860bde8ae30ae1144c07f054c2fb7548, con trabajo parcial posterior de cartas. Antes de ejecutar cada lote, reconciliar el CSV con las definiciones y comportamientos actuales; sus recuentos no representan necesariamente el estado actual. No se ha sobrescrito ese trabajo.

Fecha: 25/10/2026. Repositorio: malkivian83/Arkhamhorror. Commit observado: `03f4fb6ee9000659afdf6d6cca791f0b597cf783`.
Inventario congelado: `3c8ee4b5d8100766` (sin modificar). Auditoría estática de datos y documentación; no se ha ejecutado el motor ni comprobado CI/Deploy.

## Resultado

- 1.983 códigos en el inventario; 582 códigos únicos presentes en los JSON de datos actuales. No se cuenta duplicates.json como una definición.
- 1.401 códigos sin definición local: 980 estándar, 95 investigadores, 120 exclusivas, 106 debilidades, 69 debilidades básicas, 22 enlazadas, 5 dependencias y 4 de revisión restringida.
- 1.336 familias con alguna impresión pendiente; 942 de ellas contienen cartas estándar pendientes. Se usa duplicateOf del inventario, con respaldo de duplicates.json, sin agrupar por nombre: no se mezclan niveles ni versiones diferentes solo por llamarse igual.
- 22 códigos pendientes pertenecen a 17 familias con otra impresión definida (17 códigos estándar y 5 debilidades básicas). Son candidatos a reedición; no se da por comprobada su equivalencia.
- 1.319 familias pendientes no tienen ninguna impresión definida. Las familias de esta auditoría no equivalen a los “470 familias” históricos: se documenta una regla de agrupación concreta y reproducible.
- El resumen de continuación registra 579 códigos y 1.404 pendientes. La diferencia actual son los 3 códigos de Lola Hayes (03006, 03018, 03019), visibles en data/lola-hayes.json y en el registro de index.ts. No sobrescribir la continuidad histórica sin reconciliarla.

**Definida no significa jugable.** La cifra exacta de cartas funcionales requiere ejecutar inspectRuntime/check-decklist y las pruebas. Esta auditoría identifica ausencia de datos locales, no certifica las 582 presentes ni detecta por sí sola comportamientos incompletos. Inventario histórico: tampoco cuenta cartas posteriores o ausentes de ese inventario.

## Orden de ejecución propuesto

1. Entrega A: combinar búsquedas (20 familias) e historial/acciones (12): objetivo de 32 familias, 39 códigos, con dos subgrupos internos. Es una selección de revisión, no 32 cartas prometidas como viables. Empezar con Daredevil 0/2 y Copycat 3; reutilizar la infraestructura 71 y la hipótesis de revelaciones de a9d016d. Pasar a historial con la infraestructura 80–82. Second Wind exige registrar traiciones robadas; Mind over Matter 2 exige suma de habilidades modificadas. Si bloquean, conservarlos pendientes y completar con familias compatibles revisadas, sin rellenar con reediciones.
2. Entrega B: descuentos y costes dinámicos (19 familias), con vinculadas/ranuras (10) solo donde compartan dependencias ya resueltas. Son 29 familias potenciales: no forzar 30 si no hay más trabajo compatible. “I'll take that!” tiene además dependencia de vinculación.
3. Entrega C: descarte/exilio (20 familias). Separar recuperación, permiso de jugar y retirar del juego. Conservar un sublote bloqueado si falta persistencia del exilio.
4. Entregas D/E: pruebas/fichas (22 familias) y combate avanzado (26). Revisar ventanas y soportes antes de habilitar; dividir combate por dependencia real, no por compartir tipo de carta.
5. Colas generales: habilidades (40 familias), armas (40), hechizos (34), aliados (64), otros apoyos (272) y eventos (244). Los tramos del CSV tienen hasta 40 familias; **son colas de lectura**, no lotes mecánicamente aprobados. Tras leer el texto completo, reasignar a las entregas anteriores o formar nuevos grupos de 30–50 familias compatibles.
6. Mantener separadas personalizables (16), cartas estándar enlazadas (27), incidencias del modelo (62), investigadores/exclusivas y debilidades. Las enlazadas y exclusivas se implementan con su paquete completo; no publicarlas aisladamente por seguir el orden numérico del CSV.
7. Reediciones al final o junto a su original, tras comprobar equivalencia; nunca usarlas para inflar los recuentos de cartas nuevas.

La unión de dos grupos no demuestra que todas las cartas puedan compartir implementación. El tamaño final debe salir de revisar reglas, no de cumplir el objetivo numérico.

## Grupos mecánicos priorizados

### 01-busqueda: Búsqueda, selección y revelaciones

26 códigos / 20 familias.

Dependencia: Revisar selección, zonas de búsqueda, límites, barajado y orden de revelaciones/debilidades. Daredevil y Copycat son el siguiente grupo indicado por continuación.

Validación propuesta: Objetivo elegible/inválido, búsqueda sin coincidencias, revelación de debilidad y destino de cada carta.

| Código | Carta | Nivel | Familia |
| --- | --- | --- | --- |
| 01031 | Old Book of Lore | 0 | 01031 |
| 01531 | Old Book of Lore | 0 | 01031 |
| 01061 | Scrying | 0 | 01061 |
| 01561 | Scrying | 0 | 01061 |
| 01063 | Arcane Initiate | 0 | 01063 |
| 01563 | Arcane Initiate | 0 | 01063 |
| 60455 | Arcane Initiate | 0 | 01063 |
| 03158 | Calling in Favors | 0 | 03158 |
| 01690 | Scrying | 3 | 03236 |
| 03236 | Scrying | 3 | 03236 |
| 03271 | Arcane Initiate | 3 | 03271 |
| 03307 | No Stone Unturned | 5 | 03307 |
| 04037 | Backpack | 0 | 04037 |
| 05153 | Mr. "Rook" | 0 | 05153 |
| 06197 | Practice Makes Perfect | 0 | 06197 |
| 06202 | Word of Command | 2 | 06202 |
| 06205 | Lucid Dreaming | 2 | 06205 |
| 06240 | Daredevil | 2 | 06240 |
| 01686 | Old Book of Lore | 3 | 06279 |
| 06279 | Old Book of Lore | 3 | 06279 |
| 08066 | Parallel Fates | 2 | 08066 |
| 09036 | Prepared for the Worst | 2 | 09036 |
| 53011 | Backpack | 2 | 53011 |
| 60318 | Daredevil | 0 | 60318 |
| 60330 | Copycat | 3 | 60330 |
| 60415 | Parallel Fates | 0 | 60415 |

### 02-costes: Costes dinámicos y descuentos

19 códigos / 19 familias.

Dependencia: Descuento calculado al pagar; coste aumentado, límites y pago con fuentes restringidas. No confundir coste impreso y coste efectivo.

Validación propuesta: Pago exacto/insuficiente, descuentos acumulados y mínimos, objetivos recalculados, acción y ataques de oportunidad.

| Código | Carta | Nivel | Familia |
| --- | --- | --- | --- |
| 03023 | Ever Vigilant | 1 | 03023 |
| 03033 | Uncage the Soul | 0 | 03033 |
| 03149 | Charles Ross, Esq. | 0 | 03149 |
| 04108 | Fence | 1 | 04108 |
| 05111 | Intel Report | 0 | 05111 |
| 05234 | Decoy | 0 | 05234 |
| 05277 | Small Favor | 0 | 05277 |
| 06198 | Extensive Research | 1 | 06198 |
| 08036 | Join the Caravan | 1 | 08036 |
| 08072 | Schoffner's Catalogue | 0 | 08072 |
| 09028 | Motivational Speech | 0 | 09028 |
| 09039 | Ever Vigilant | 4 | 09039 |
| 09067 | "I'll take that!" | 0 | 09067 |
| 09095 | Uncage the Soul | 3 | 09095 |
| 11116 | Motivational Speech | 4 | 11116 |
| 60216 | Extensive Research | 0 | 60216 |
| 60412 | Robes of Endless Night | 0 | 60412 |
| 60422 | Robes of Endless Night | 2 | 60422 |
| 60470 | Ceremonial Robes | 1 | 60470 |

### 03-descarte: Jugar desde descarte y retirar del juego

22 códigos / 20 familias.

Dependencia: Permisos por zona, recuperación frente a jugar, destino final y exilio diferenciados. No activar el grupo por disponer solo de recuperación.

Validación propuesta: Coste y permiso desde descarte, resolución una sola vez, retirar/exiliar sin volver al descarte, persistencia.

| Código | Carta | Nivel | Familia |
| --- | --- | --- | --- |
| 01073 | Scavenging | 0 | 01073 |
| 01573 | Scavenging | 0 | 01073 |
| 02270 | A Chance Encounter | 0 | 02270 |
| 03238 | A Chance Encounter | 2 | 03238 |
| 03273 | True Survivor | 3 | 03273 |
| 04033 | Improvised Weapon | 0 | 04033 |
| 04200 | Live and Learn | 0 | 04200 |
| 60516 | Live and Learn | 0 | 04200 |
| 04272 | Winging It | 0 | 04272 |
| 04312 | Impromptu Barrier | 0 | 04312 |
| 06245 | A Glimmer of Hope | 0 | 06245 |
| 06284 | Nothing Left to Lose | 3 | 06284 |
| 06332 | Scavenging | 2 | 06332 |
| 09103 | Improvised Shield | 0 | 09103 |
| 09116 | Salvage | 2 | 09116 |
| 11085 | Profane Idol | 0 | 11085 |
| 11090 | A Glimmer of Hope | 2 | 11090 |
| 11092 | Improvised Weapon | 2 | 11092 |
| 60419 | Prescient | 0 | 60419 |
| 60520 | Cherished Keepsake | 1 | 60520 |
| 60521 | Leather Coat | 1 | 60521 |
| 60561 | Same Old Thing | 0 | 60561 |

### 04-caos: Manipulación de fichas y pruebas anidadas

29 códigos / 22 familias.

Dependencia: Mantener separados fallo automático, cancelar/ignorar símbolos, éxito automático y sustitución de fichas; Lucky 2 tiene hipótesis nueva en a9d016d, sin validación.

Validación propuesta: Restauración de prueba exterior, pruebas de otro investigador, modificadores de símbolo, costes y ventanas legales.

| Código | Carta | Nivel | Familia |
| --- | --- | --- | --- |
| 01056 | Sure Gamble | 3 | 01056 |
| 01556 | Sure Gamble | 3 | 01056 |
| 01071 | Grotesque Statue | 4 | 01071 |
| 01571 | Grotesque Statue | 4 | 01071 |
| 01084 | Lucky! | 2 | 01084 |
| 01584 | Lucky! | 2 | 01084 |
| 01085 | Will to Survive | 3 | 01085 |
| 01585 | Will to Survive | 3 | 01085 |
| 02190 | Defiance | 0 | 02190 |
| 60418 | Defiance | 0 | 02190 |
| 02230 | Lucky Dice | 2 | 02230 |
| 03304 | "Eat lead!" | 2 | 03304 |
| 03311 | Time Warp | 2 | 03311 |
| 03312 | Seal of the Elder Sign | 5 | 03312 |
| 04032 | Dark Prophecy | 0 | 04032 |
| 60417 | Dark Prophecy | 0 | 04032 |
| 04110 | Counterspell | 2 | 04110 |
| 04197 | Olive McBride | 0 | 04197 |
| 04198 | Defiance | 2 | 04198 |
| 01692 | Eucatastrophe | 3 | 05324 |
| 05324 | Eucatastrophe | 3 | 05324 |
| 07161 | Third Time's a Charm | 2 | 07161 |
| 07307 | Lucky Dice | 3 | 07307 |
| 08026 | Dodge | 2 | 08026 |
| 10097 | Olive McBride | 2 | 10097 |
| 52002 | "Eat lead!" | 0 | 52002 |
| 60421 | Grotesque Statue | 2 | 60421 |
| 60512 | Will to Survive | 0 | 60512 |
| 60528 | Lucky! | 3 | 60528 |

### 05-vinculadas: Vinculadas, ranuras y control

10 códigos / 10 familias.

Dependencia: Controlador/propietario de vinculadas, ranuras añadidas o restringidas, alcance remoto y habilidades de otro investigador.

Validación propuesta: Entrada/salida del apoyo, cambio de control, descarte de vinculadas y cálculo de ranuras; probar cada variante.

| Código | Carta | Nivel | Familia |
| --- | --- | --- | --- |
| 05230 | Telescopic Sight | 3 | 05230 |
| 07261 | Enchant Weapon | 3 | 07261 |
| 08074 | Jury-Rig | 0 | 08074 |
| 08089 | Quickdraw Holster | 4 | 08089 |
| 09065 | Hidden Pocket | 0 | 09065 |
| 09091 | Astral Mirror | 2 | 09091 |
| 09120 | Tool Belt | 0 | 09120 |
| 10132 | Occult Reliquary | 3 | 10132 |
| 54008 | Sign Magick | 3 | 54008 |
| 54012 | Moon Pendant | 2 | 54012 |

### 06-combate: Combate avanzado y efectos tras éxito

26 códigos / 26 familias.

Dependencia: Límite por partida, decisiones tras éxito, contexto de negociación/traición, reacciones al ataque, alcance y éxito automático. Subdividir por dependencia tras revisar reglas.

Validación propuesta: Éxito/fallo, enemigo derrotado antes de continuar, daño opcional, no Élite, límites y ataques de oportunidad.

| Código | Carta | Nivel | Familia |
| --- | --- | --- | --- |
| 03153 | Storm of Spirits | 0 | 03153 |
| 04276 | Timeworn Brand | 5 | 04276 |
| 05117 | Tennessee Sour Mash | 0 | 05117 |
| 05118 | Enchanted Blade | 0 | 05118 |
| 05190 | Tennessee Sour Mash | 3 | 05190 |
| 05191 | Tennessee Sour Mash | 3 | 05191 |
| 05192 | Enchanted Blade | 3 | 05192 |
| 06114 | Followed | 0 | 06114 |
| 06117 | Read the Signs | 0 | 06117 |
| 06164 | Ethereal Form | 0 | 06164 |
| 08020 | Toe to Toe | 0 | 08020 |
| 09069 | Quick Getaway | 0 | 09069 |
| 10037 | Flurry of Blows | 5 | 10037 |
| 10047 | Testing Sprint | 0 | 10047 |
| 10065 | British Bull Dog | 0 | 10065 |
| 10077 | British Bull Dog | 2 | 10077 |
| 10100 | Ethereal Form | 2 | 10100 |
| 10101 | Read the Signs | 2 | 10101 |
| 50002 | Dynamite Blast | 2 | 50002 |
| 52008 | Storm of Spirits | 3 | 52008 |
| 53002 | Survival Knife | 2 | 53002 |
| 60112 | Counterpunch | 0 | 60112 |
| 60122 | Counterpunch | 2 | 60122 |
| 60129 | Dynamite Blast | 3 | 60129 |
| 60132 | One-Two Punch | 5 | 60132 |
| 60331 | Beretta M1918 | 4 | 60331 |

### 07-historial: Historial, acciones y valores modificados

13 códigos / 12 familias.

Dependencia: Reutilizar historial por fase/ronda y acciones inmediatas de 80–82; faltan traiciones robadas y suma tipada de habilidades para casos concretos.

Validación propuesta: Acción actual frente a completada, fin de ronda, turno ajeno, acciones gratuitas y base frente a habilidad modificada.

| Código | Carta | Nivel | Familia |
| --- | --- | --- | --- |
| 01027 | Police Badge | 2 | 01027 |
| 01527 | Police Badge | 2 | 01027 |
| 02266 | Ace in the Hole | 3 | 02266 |
| 02305 | The Gold Pocket Watch | 4 | 02305 |
| 03265 | Guidance | 0 | 03265 |
| 04149 | Second Wind | 0 | 04149 |
| 04308 | Borrowed Time | 3 | 04308 |
| 06239 | Haste | 2 | 06239 |
| 07024 | Plan of Action | 0 | 07024 |
| 09053 | Guidance | 1 | 09053 |
| 10030 | Hand-Eye Coordination | 1 | 10030 |
| 10032 | Second Wind | 2 | 10032 |
| 60226 | Mind over Matter | 2 | 60226 |

## Cobertura completa

| Cola | Códigos | Familias |
| --- | ---: | ---: |
| 00-reediciones | 22 | 17 |
| 01-busqueda | 26 | 20 |
| 02-costes | 19 | 19 |
| 03-descarte | 22 | 20 |
| 04-caos | 29 | 22 |
| 05-vinculadas | 10 | 10 |
| 06-combate | 26 | 26 |
| 07-historial | 13 | 12 |
| 70-apoyos-aliados | 66 | 64 |
| 70-apoyos-armas | 41 | 40 |
| 70-apoyos-hechizos | 35 | 34 |
| 70-apoyos-otros | 277 | 272 |
| 71-habilidades | 42 | 40 |
| 72-eventos | 252 | 244 |
| 80-personalizables | 16 | 16 |
| 81-enlazadas | 27 | 27 |
| 82-modelo | 62 | 62 |
| 90-basic-weakness | 64 | 58 |
| 90-bonded | 22 | 22 |
| 90-dependency | 5 | 5 |
| 90-investigator | 95 | 86 |
| 90-restricted-review | 4 | 4 |
| 90-signature | 120 | 115 |
| 90-weakness | 106 | 101 |

Todos los 1.401 códigos aparecen una sola vez en cartas-pendientes.csv y auditoria.json. Son 45 tramos de revisión, con un máximo de 40 familias por tramo y sin separar impresiones de una familia. La asignación prioriza: reedición de familia definida, clasificación especial, personalizable/enlazada, lista mecánica explícita, problema de modelo, tipo/rasgo. Las listas explícitas vienen del resumen y documentos 53–56/67 y conocimiento preliminar de las familias: no sustituyen revisar el texto oficial. Pueden conservar incidencias adicionales en modelIssues.

## Criterio de cierre de cada lote

- Actualizar main y comprobar trabajo ajeno antes de editar. Revisar reglas, códigos y variantes; relación breve comportamiento/restricción/prueba por familia.
- Implementación, datos, registro del motor y catálogo/tienda sin duplicados; EN/ES e imágenes necesarias. Conservar inventario y huellas históricos.
- Pruebas de efecto observable, costes, objetivos, ventanas y límites; controles compartidos para reediciones. Revisión visual representativa si aparece un caso nuevo.
- Actualizar main antes del estado final y pasar formato, lint, tipos, pruebas y build según AGENTS.md. Solo después publicar y actualizar el único resumen de continuación.
- No certificar CI/Deploy ni modificar automatizaciones basándose en la mención histórica del resumen; no se han consultado.

## Evidencia y límites

Se descargaron por el conector el catálogo congelado, los 53 JSON de data, index.ts, el registro base y documentos de continuidad/bloqueos. Los 55 archivos de inventario/datos/continuidad se cotejaron por SHA de blob contra el commit indicado: sin cambios respecto a las lecturas. La auditoría no modifica el repositorio y no publica cartas. El entorno local sigue sin acceso de red para clonar y ejecutar el proyecto.

El archivo `auditoria-cartas-pendientes-2026-10-25.csv` adjunto permite filtrar todos los códigos, familias, prioridades, dependencias y tramos. La cobertura, unicidad y límite de 40 familias por tramo se verificaron localmente con un script de Python. Los códigos deben importarse como texto en una hoja de cálculo para conservar los ceros iniciales.

Publicación documental autorizada expresamente por la persona usuaria, con excepción de los controles generales y usando el conector GitHub por fallo de red del entorno. No se han ejecutado formato, lint, tipos ni pruebas del proyecto. No cambia cartas ni código ejecutable.
