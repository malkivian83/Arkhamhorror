# 141 · Pruebas avanzadas y apoyos

Lote `advanced-tests`, sobre `ea7cf287`: **20 códigos, 20 diseños o niveles nuevos,
0 reediciones**. Comparte infraestructura de pruebas, fichas y costes; no incluye
impresiones adicionales para completar el tamaño.

| Código | Carta | Nivel |
| --- | --- | ---: |
| 02310 | El hombre de los guantes rojos | 5 |
| 07225 | Ojo del djinn | 2 |
| 04307 | Manuscritos pnakóticos | 5 |
| 07220 | Rosario sagrado | 2 |
| 03312 | Sello del símbolo arcano | 5 |
| 60406 | Espejo de videncia | 0 |
| 02230 | Dados de la suerte | 2 |
| 07307 | Dados de la suerte | 3 |
| 07161 | A la tercera va la vencida | 2 |
| 08112 | «¡Una más!» | 0 |
| 03304 | «¡Traga plomo!» | 2 |
| 52002 | «¡Traga plomo!» | 0 |
| 11039 | Espécimen imposible | 0 |
| 11038 | Oculus mortuum | 0 |
| 11103 | Sutra prohibido | 2 |
| 06241 | Llenarse de poder: Resistencia | 2 |
| 06242 | Llenarse de poder: Presteza | 2 |
| 06243 | Llenarse de poder: Agudeza | 2 |
| 10020 | Kit de limpieza | 0 |
| 10033 | Kit de limpieza | 3 |

## Reglas y diferencias

- El hombre elige dos habilidades distintas, eleva sus bases mientras permanezca
  en juego y se descarta al terminar el Mito. El Ojo fija la base de su prueba en
  cinco; sus consecuencias por Bendición/Maldición son efectos duraderos, se
  resuelven una vez por condición y sobreviven a que el apoyo salga de juego.
- Los Manuscritos distinguen una prueba durante una Revelación de una prueba
  corriente, también para cartas de jugador y Lugares. Su acción reserva la siguiente prueba sin fichas hasta terminar la
  ronda. El Rosario exige una prueba de voluntad superada sobre una Traición;
  respeta el máximo de Bendiciones de la reserva.
- El Sello crea un símbolo arcano virtual que no sale de la bolsa ni añade otra
  ficha al devolverlas. Se retira al terminar la prueba. El Espejo adelanta ST.3,
  conserva la ficha durante el compromiso y aplaza sus efectos a ST.4. Se prueban
  conjuntamente, también después de guardar/cargar.
- Los Dados ignoran sin devolver anticipadamente la ficha. El nivel 2 paga dos
  recursos y sale de la partida al revelar fallo automático mediante su efecto;
  el nivel 3 paga una Maldición y vuelve a la mano al revelar Maldición o fallo
  automático. La consecuencia se aplica antes de nuevas cancelaciones, incluso
  fuera de una prueba. A la tercera concede dos cancelaciones con devolución y
  nuevo robo. «¡Una más!» conserva la ficha anterior y añade una nueva: invierte
  su modificador negativo y la Calavera hace fracasar automáticamente.
- «¡Traga plomo!» exige un ataque de un Arma de fuego. El nivel 0 gasta una
  munición adicional; el 2 permite elegir cuántas. Las sustituciones de
  revelación pueden declararse sobre una revelación futura de otra capacidad,
  antes de sacar fichas. Cada grupo mantiene su restricción de elección. Se
  comprueba la combinación con Estatua grotesca, las preferencias de grupo y la
  combinación preexistente de Katarina con Ojos del soñador.
- Espécimen cancela un símbolo permitido en una prueba local y roba para su
  controlador solo si se supera. Tres copias comparten una ranura Arcana. Oculus
  atribuye sellado/cancelación/ignorancia a quien controla el efecto; su segunda
  reacción paga evidencia y agotamiento, descubre una pista y daña a un Geist.
- Sutra conserva la restricción impresa por rasgos del investigador; solo
  bonifica pruebas de eventos Hechizo y paga horror para revelar más fichas.
  Llenarse de poder permite ignorar la sustitución por voluntad, conserva los
  modificadores del efecto y agota para bonificar su habilidad. Sus tres
  subtítulos ocupan una ranura, comparten la experiencia de Miríada y mantienen
  el límite de una copia de cada subtítulo.
- Kit de limpieza presta suministros como suministros o munición, sin convertirlos
  en cargas o secretos ni prestarlos a otros controladores. El nivel 3 modifica
  la prueba pendiente del apoyo que gastó el suministro, antes de iniciarla; no
  entrega una bonificación genérica a otra prueba que aparezca entre medias.

La regresión amplia detectó también una llamada innecesaria al cálculo de turno
cuando no existe bonificación diferida. Se evita esa llamada sin cambiar las
pruebas anteriores de efectos duraderos.

Las cartas del lote respetan Peligro: durante esa Revelación solo puede jugar,
activar capacidades y comprometer cartas quien robó la carta de Encuentro.
Las revelaciones anidadas conservan el contexto exterior al terminar la interior.

## Fuentes y trazabilidad

Fuentes EN/ES, SHA-256, módulos y pruebas en
[el manifiesto](../packages/cards/src/advanced-tests/approvals.json).
Regeneración: `node scripts/prepare-advanced-tests.mjs`. Inventario histórico
inmutable; unicidad entre lotes comprobada automáticamente. Los adaptadores
comprueban los modelos Miríada y Excepcional revisados.

Referencias: [reglamento oficial](https://cdn.svc.asmodee.net/production-fantasyflightgames/uploads/2026/09/ahc60_rules_reference_eng-compressed.pdf),
[FAQ de sustituciones simultáneas](https://arkhamdb.com/card/04197),
[Dados y errata](https://arkhamdb.com/card/02230),
[Sello](https://arkhamdb.com/card/03312) y
[Llenarse de poder](https://arkhamdb.com/card/06241).

Se incorporan **40 escaneos y 40 miniaturas EN/ES**. Seis caras representativas
inspeccionadas sin navegador, cubriendo bases, ficha virtual, revelación
anticipada, Miríada, dados y préstamo de usos.

## Verificación

La suite de motor, cartas y scripts pasa 633 archivos y 6972 casos. Las últimas
correcciones se verifican con 129 casos dirigidos, incluidos los 65 del lote y
las conexiones de revelaciones, dilemas y fichas. Pasan también 35 casos web de
registro, compra e idiomas de los lotes recientes, incluida la compra conjunta
por 2 XP de las tres variantes de Llenarse de poder y la restricción de Sutra.
Tipos de engine/cards, ESLint, Prettier y compilación web correctos. Fuentes EN/ES
y sus huellas comprobadas; verificador de 5851 imágenes y 5851 miniaturas correcto.
Sin navegador ni seguimiento de workflows.

## Continuidad

Acumulado: **1451 jugables, 666 históricos pendientes, 291 estándar con impresión**.
Olive McBride sigue pendiente de resolver dos fichas de un grupo y de sus
combinaciones con otras sustituciones; el árbol de este lote resuelve una.
Quedan también las capacidades pendientes del inventario 132, incluidos
reparto privado de Encuentros, habilidades desde la mano y cartas vinculadas.
