# 134 · Candidatas sin motor nuevo

Lote `reused-capabilities`: 7 códigos nuevos, 7 cartas o niveles distintos nuevos y 0
reediciones, sobre `5cc146c9`. Origen: las 40 candidatas «sin motor nuevo» del
[inventario 132](132-inventario-bloqueos-motor.md). Fuentes EN/ES de ArkhamDB y SHA-256 en
`packages/cards/src/reused-capabilities/approvals.json`; conversión con `approvedDefinition`
(`scripts/prepare-reused-capabilities.mjs`). Adaptadores: El reloj rojo (2) usa
`reviewed-exceptional-v1` (Excepcional, límite 1) y Martillo ciclópeo
`reviewed-dual-faction-v1` (Guardián/Místico).

| Código | Carta                   | Nivel | Tipo   | Capacidades reutilizadas                                  |
| ------ | ----------------------- | ----- | ------ | --------------------------------------------------------- |
| 07308  | Rito de equilibrio      | 5     | Evento | Reserva de Bendición/Maldición, `RemoveChaosTokens`, curar |
| 10072  | «¡Te lo devolveré!»     | 0     | Evento | `MoveResourcesToPool`, `AtEndOfRound`                     |
| 10104  | La llave de Salomon     | 4     | Apoyo  | Habilidades rápidas, recuento de la bolsa, curar          |
| 11078  | Reliquia arcana perdida | 3     | Apoyo  | `lendsUses` (cargas), `afterDiscoverClues` con `last`     |
| 08053  | El reloj rojo           | 2     | Apoyo  | Patrón de El reloj rojo de André (60384)                  |
| 04035  | Yaotl                   | 1     | Apoyo  | `BoostSkillTest`, `MillDeck`, límite por fase             |
| 08093  | Martillo ciclópeo       | 5     | Apoyo  | `fightOptions`, `damageIfSuccessBy`, `MoveEnemy`          |

Sin cambios en el motor. Etiquetas nuevas EN/ES en `choice.*` (Llave de Salomon, Rito de
equilibrio, «¡Te lo devolveré!», Reliquia arcana perdida, El reloj rojo y Yaotl).

## Reglas

- La llave de Salomon: cada habilidad exige más Bendiciones que Maldiciones (o al revés) en la
  bolsa; retirar la ficha y agotar son costes. La curación solo se ofrece si hay un investigador o
  Aliado herido en tu Lugar (no se inicia una habilidad sin efecto posible); se elige el reparto de
  hasta 2 entre daño y horror de un único objetivo.
- Rito de equilibrio: para añadir, X va de 1 a las Maldiciones libres en la reserva (añadirlas es
  el coste); las Bendiciones se añaden hasta donde permita la reserva, con al menos una libre. Para
  retirar, X va de 1 a los pares en la bolsa y solo si hay horror que curar en tu Lugar. La curación
  se reparte de 1 en 1 entre investigadores y apoyos con horror en tu Lugar; X puede superar el
  horror curable.
- Textos ES: Yaotl (una vez por fase) y La llave de Salomón (título y texto) se presentan con la
  errata vigente (revisión en [143](143-revision-reglas-lotes-129-136.md)).
- «¡Te lo devolveré!»: solo en tu turno y con otro investigador en tu Lugar. Mover recursos no es
  ganarlos (no dispara reacciones a ganar recursos). Al final de la ronda se mueven todos los que
  tengas en ese momento, si el otro investigador sigue en la partida.
- Reliquia arcana perdida: presta sus cargas a apoyos de Hechizo y Ritual propios mediante
  `lendsUses`; la reacción exige que la última pista se descubra en tu Lugar actual.
- El reloj rojo (2): «o bien… o bien»: si tomas las cargas como recursos no colocas ninguna y no
  hay efecto (quedan 0). Con 1 carga, +3 a la siguiente prueba; 2, hasta 2 movimientos; 3, 1 acción
  adicional este turno.
- Yaotl: la bonificación se calcula al activarla con los iconos de la habilidad de la prueba en la
  carta superior de tu pila de descartes (sin comodines) y solo en tus pruebas. FAQ: la erratum de
  la segunda habilidad (límite una vez por fase) ya está en el texto; solo se activa dentro de una
  fase.
- Martillo ciclópeo: suma tu valor de [willpower] a la habilidad del ataque, +1 daño (+2 si se
  supera por 3 o más). Tras el éxito, un Enemigo no Élite que siga en tu Lugar puede moverse a un
  Lugar a distancia 1 (o hasta 2 con margen ≥ 3) según el grafo de movimiento de Enemigos; se
  desenfrenta al moverse.

FAQ de ArkhamDB consultadas para los 7 códigos: solo Yaotl tiene entradas (recogidas arriba).

## Candidatas no activadas

Necesitan una capacidad que el motor no tiene:

- Escape por los pelos (03267): bonificación «a tu siguiente prueba de este turno» (solo hay
  límites de fase o ronda).
- Sicario ejecutor (04155): daño adicional diferido «la próxima vez que el enemigo evadido reciba
  daño este turno».
- Queroseno (04304): registro de «un enemigo fue derrotado en este Lugar esta ronda».
- Fortuna o destino (05237): ventana «cuando se fuese a colocar perdición» en cualquier carta de
  escenario (`afterDoomPlaced` solo existe para el plan y después de colocarla).
- Seguimiento (06114): investigación que no provoca ataques de oportunidad solo de un enemigo.
- Interpretar las señales (06117, 10101) e Influencia hipnótica (10096): ignorar efectos y palabras
  clave del Lugar que se dispararían durante la prueba.
- Piedra lunar (06203): jugar un apoyo desde la pila de descartes pagando su coste tras
  descartarlo de la mano.
- La verdad te llama (07154): movimiento repetido por el camino más corto con condiciones de fin.
- Tristan Botley (07194): +1 a dos habilidades hasta el inicio de tu siguiente turno y jugarlo
  desde la mano sin coste tras una prueba con 3 Bendiciones/Maldiciones.
- El hilo de Ariadna (07304): gastar secretos como si estuvieran en apoyos de otros investigadores
  y mover secretos entre apoyos y recursos.
- Jacob Morrison (07309): un apoyo que no se prepara en la fase de Mantenimiento.
- Exploración avanzada (08047): moverse sin que los enemigos se enfrenten durante ese movimiento.
- Quemar después de leer (08076): exiliar una carta de la mano.
- Profesor William Webb (08104, 08106): sustituir el descubrimiento de una pista al investigar con
  éxito por recuperar un Objeto o descubrir en un Lugar conectado.
- Una en la recámara (09029): ventana al gastar la última munición y bonificación al siguiente
  ataque con ese apoyo concreto.
- Notas de investigación (09045): reacción a que una habilidad de carta de jugador coloque tus
  pistas en tu Lugar.
- Kit de cirugía (09056) y Anatomía de Gray (09058): modificar una curación en curso o la siguiente
  curación/daño de una carta.
- Agitar el avispero (09068): engendrar un enemigo del mazo de Encuentros enfrentado contigo en
  lugar de en su lugar normal.
- Abrigo elegante (09071): distinguir recursos ganados «mediante otro efecto de carta de jugador».
- Pelear sucio (09073): la prueba de Negociar no registra el Enemigo objetivo (bonificación contra
  enemigos agotados).
- Salvaguarda explosiva (09087): coste X y descartar cartas de ranuras Arcanas antes de jugarla.
- Kit de limpieza (10020, 10033): prestar suministros como suministros o munición de cualquier
  apoyo (`lendsUses` exige el mismo tipo y un rasgo).
- Athame siniestro (10092): «reponer» cargas u ofrendas en otro apoyo.
- Llamar al más allá (10099): resolver una habilidad [action] o [fast] de otro apoyo sin su coste.
- Remington Modelo 1858 (11022, 11032): disparar su habilidad de ataque al salir (o entrar) en
  juego, en todos los caminos de salida del apoyo.
- Vacile (11052): no desenfrentarse tras evadir con éxito.
- Buen tiempo (11091): carta junto al plan con bonificación global y Miríada.
- Hoja encantada (05192): reclasificada desde reimpresiones (ver lote 133); pendiente de revisión.

## Verificación

`rules.test.ts`: 20 casos de reglas (registro y estadísticas, ambas habilidades de la Llave, ambos
modos del Rito y su restricción, movimiento y devolución de recursos, préstamo y recarga de la
Reliquia, los tres umbrales y la opción de tomar cargas del Reloj, bonificación y descarte con
límite de Yaotl, ataque, empuje y Élite del Martillo). `apps/web/src/game/reused-capabilities.test.ts`:
7 de compra/inicio/presentación EN/ES (las cartas Excepcionales cuestan el doble de experiencia).

Comprobaciones de los lotes 133 y 134: suite de `packages/engine`, `packages/cards` y `scripts`
(622 archivos, 6706 casos) correcta; pruebas web de ambos lotes (42); tipos de engine, cards y
web; ESLint y Prettier de lo tocado; verificador de imágenes y miniaturas. Sin navegador ni build.

Recuentos: 7 códigos incorporados; 7 cartas o niveles distintos nuevos; 0 reediciones. Imágenes:
7 escaneos EN, 7 ES y sus miniaturas. Acumulado tras 133 y 134: 1375 jugables; 742 históricos
pendientes, incluidos 367 estándar con impresión.
