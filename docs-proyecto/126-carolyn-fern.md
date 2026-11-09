# 126 · Carolyn Fern

09/11/2026. Petición: incorporar la investigadora, sus cartas y el mazo inicial completos del
pack [Carolyn Fern](https://arkhamdb.com/set/car) (`60251`–`60282`).

## Alcance

El pack reúne **32 códigos**. El diagnóstico
(`node scripts/check-decklist.mjs --file <pack completo>`) daba 25 jugables, ya registrados en
lotes anteriores (Hechizos y herramientas, Utilidades de apoyos y otros), y 7 por implementar.
Este lote incorpora **7 códigos jugables / 7 cartas o niveles distintos nuevos / 0 reediciones**:

| Código  | Carta                                        | Notas                              |
| ------- | -------------------------------------------- | ---------------------------------- |
| `60251` | Carolyn Fern, La psicóloga                   | Investigadora                      |
| `60252` | Psicología experimental                      | Exclusiva                          |
| `60253` | Telaraña intacta                             | Debilidad exclusiva                |
| `60254` | Curiosidad letal                             | Debilidad básica                   |
| `60257` | Consulta privada                             | Límite de 1 por investigador       |
| `60272` | Máquina de escribir (2)                      | Usos prestados a Tomos             |
| `60279` | Pergamino de los faraones: Palabras de Bast (4) | Investigado                     |

El lote vive en `packages/cards/src/carolyn-fern/`. Los datos
(`packages/cards/src/data/carolyn-fern.json`) solo contienen esos 7 códigos y se reproducen con
`scripts/prepare-carolyn-fern.mjs` desde el inventario congelado `3c8ee4b5d8100766`, que no se
modifica. Las instantáneas EN/ES de la API (`source-en.json`, `source-es.json`) llevan sus SHA-256
en `approvals.json`.

El mazo inicial `carolyn` sigue la lista oficial del producto: sus dos exclusivas, Curiosidad letal y
dos copias de cada carta de nivel 0 (`60255`–`60269`); 30 cartas más 3 requisitos. Carolyn admite
Buscador y neutrales 0–5. El pack `car` se añade a los paquetes en línea con sus 32 códigos.

## Reglas y decisiones

- **Curar horror («después de que cures»).** Toda curación efectiva de horror (`Heal`,
  `HealAsset`, también de apoyos colocados) abre el disparador nuevo `afterHorrorHealed`, con quien
  cura, la cantidad y el objetivo. «Tú curas» es el investigador que controla el efecto: el que
  juega la carta o usa la capacidad (incluidas reacciones y capacidades rápidas). El motor propaga
  ese controlador junto al origen del efecto (`effectController`) a través de elecciones, pruebas
  y continuaciones; las capacidades obligadas no heredan el controlador del suceso que las
  dispara. Sin controlador conocido, cura el propio objetivo (o el dueño del apoyo), como ya hacía
  el disparador de daño, que no cambia.
- Carolyn solo reacciona si el objetivo es un investigador o un Apoyo Aliado, con límite de una vez
  por ronda y solo si hay pistas en su Lugar. Su signo arcano cura 1 de horror a un investigador de
  su Lugar al revelarse, sin depender del resultado.
- Psicología experimental: la acción permite la prueba aunque nadie tenga horror; si tiene éxito se
  elige un investigador o Aliado con horror de tu Lugar. Su reacción se limita a curaciones de
  investigadores y da +2 a la siguiente prueba de ese investigador en esta ronda.
- **Telaraña intacta.** Las traiciones en juego pueden tener reacciones. Antes de descubrir pistas
  (después de los efectos que cambian la cantidad) se abre la ventana de reemplazo
  `whenWouldDiscoverClues`: elegir la Telaraña coloca tanto horror como pistas se iban a descubrir
  (fichas de la carta) y la descubierta no ocurre; con 4 o más se descarta. Es opcional: omitirla
  descubre normalmente. Al terminar la partida o ser eliminado, su dueño gana 2 puntos menos de
  experiencia (`whenGameEnds`, como Dead Ends).
- Curiosidad letal: por cada punto de fallo se elige 1 daño o dejar 1 pista propia en el Lugar; sin
  pistas solo queda el daño.
- Consulta privada usa el límite de título por investigador existente.
- **Máquina de escribir.** Capacidad general `lendsUses`: los usos de un apoyo pueden gastarse como
  si estuvieran en otros apoyos del mismo controlador con un rasgo indicado y el mismo tipo de uso
  (secretos de Tomos). Las capacidades del Tomo ven los usos prestados como disponibles y, al gastar,
  su controlador elige de qué carta sale cada uso; si solo una tiene, se usa directamente. La
  Máquina se descarta al quedarse sin secretos. Los datos históricos escriben el tipo como `secret`
  o `secrets`; la comparación los trata como iguales.
- **Palabras de Bast.** Investigado: exige la anotación «you have unearthed the secrets of the
  Pharaohs» y se obtiene mejorando una copia de Sin traducir, como Palabras de Ra y de Set. Coste:
  recibir 1 de horror y gastar 1 o 2 secretos. Decisión: se revelan 3 cartas por secreto gastado en
  un único grupo (3 o 6), se elige y descarta **una** carta que no sea Peligro ni Élite (si la hay)
  y el resto vuelve arriba en el orden elegido. No hay FAQ en ArkhamDB que aclare la lectura
  alternativa (descartar una por cada grupo de 3).

## Presentación

`scripts/present-carolyn-fern.mjs` escribe nombres, subtítulos, rasgos, textos y reverso EN/ES de
los 7 códigos y las etiquetas nuevas (`ability.*`, `choice.pharaohsDiscard`,
`choice.spendUsesFrom`, `prompt.spendUsesFrom`); es idempotente. No se descargan escaneos ni
miniaturas en este lote (se añadieron al integrarlo). El horror sobre la Telaraña se muestra en la
zona de amenaza: las traiciones indican qué representan sus fichas (`TreacheryBehavior.tokenKind`)
y la mesa pinta fichas, horror y pistas sobre ellas. La revisión visual queda pendiente para la
persona usuaria.

Fuentes: API de ArkhamDB [`car` EN](https://arkhamdb.com/api/public/cards/car.json) y
[`car` ES](https://es.arkhamdb.com/api/public/cards/car.json) y las páginas de cada carta (sin FAQ
ni erratas publicadas el 09/11/2026).

## Validación

- Pruebas del lote (`carolyn-fern/*.test.ts`) y de reproducción
  (`scripts/cards-import/carolyn-fern.test.mjs`): investigadora, exclusivas, debilidades, curación
  desde distintas fuentes, Máquina de escribir, Palabras de Bast, mazo, campaña, compras y unicidad.
  29 pruebas del lote y 2 de reproducción, correctas.
- Por el cambio transversal del bucle del motor se ejecutó la suite completa: 7.483 correctas,
  26 omitidas y 13 fallos. Uno era propio: la expectativa exacta de Tótem macabro (`05194`) en
  `test-recovery` no incluía el nuevo `effectController`; se añadió y pasa. Diez eran timeouts
  bajo carga que pasaron al repetir solo sus archivos. Queda
  `apps/web/src/game/spanishImages.test.ts` («cubre cada carta con imagen local»): los 7 códigos
  nuevos aún no tienen escaneos ni miniaturas, que este lote no descarga.
- Formato y lint de los archivos tocados; tipos de `engine` y `cards`.
- `check-decklist` sobre el pack completo: 32 jugables, 0 por implementar.
