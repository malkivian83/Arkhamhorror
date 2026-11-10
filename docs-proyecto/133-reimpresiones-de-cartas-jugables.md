# 133 · Reimpresiones de cartas jugables

Lote `reprints-wave-3`: 35 códigos nuevos, 0 cartas o niveles distintos nuevos y 35 reediciones,
sobre `5cc146c9`. Origen: las 36 reimpresiones del [inventario 132](132-inventario-bloqueos-motor.md).
Fuentes EN/ES de ArkhamDB y SHA-256 en `packages/cards/src/reprints-wave-3/approvals.json`
(`source-*` para las reimpresiones y `originals-*` para las impresiones jugables de referencia);
conversión con `approvedDefinition` (`scripts/prepare-reprints-wave-3.mjs`).

## Equivalencia y registro

- Cada reimpresión se compara con su impresión jugable con `assertEquivalent`
  (`canonical-mechanical-fields-v1`, mismos campos que las oleadas 1 y 2) y además se exige el
  mismo nombre, texto y rasgos en español. La huella queda en `equivalenceSha256` y la impresión de
  origen en `behaviorSource`, igual que Pata de conejo (60560→01075) en el lote de Miguel.
- `registerReprint` (`reprints-wave-3/register.ts`) solo acepta códigos aprobados con huella y
  origen coincidente, y enlaza el comportamiento revisado del original a su propio código
  (`rebindCard`). Usos y Rápido se copian de la definición del original.
- La web ofrece cada reimpresión a través de su impresión original (`duplicates.json`), como en
  los lotes anteriores. 08057 y 08058 son los originales de El abanico negro y El reloj rojo de
  André Patel (60379 y 60384): se registran con el adaptador `reviewed-exceptional-v1`
  (Excepcional, límite 1).

| Código | Carta | Nivel | Original |
| --- | --- | --- | --- |
| 01523 | Esquivar | 0 | 01023 |
| 01524 | Explosión de dinamita | 0 | 01024 |
| 01527 | Placa de policía | 2 | 01027 |
| 01531 | Viejo libro de conocimiento | 0 | 01031 |
| 01533 | Dr. Milan Christopher | 0 | 01033 |
| 01536 | La mente sobre la materia | 0 | 01036 |
| 01541 | Disco de Itzamna | 2 | 01041 |
| 01542 | Enciclopedia | 2 | 01042 |
| 01546 | Carterista | 0 | 01046 |
| 01548 | Leo De Luca | 0 | 01048 |
| 01550 | Escurridizo | 0 | 01050 |
| 01556 | Jugar sobre seguro | 3 | 01056 |
| 01558 | Conocimiento prohibido | 0 | 01058 |
| 01561 | Videncia | 0 | 01061 |
| 01563 | Iniciada en lo arcano | 0 | 01063 |
| 01564 | Atracción por la llama | 0 | 01064 |
| 01573 | Reutilizar | 0 | 01073 |
| 01575 | Pata de conejo | 0 | 01075 |
| 01580 | ¡Qué suerte! | 0 | 01080 |
| 01581 | Instinto de supervivencia | 0 | 01081 |
| 01583 | Por los pelos | 2 | 01083 |
| 01584 | ¡Qué suerte! | 2 | 01084 |
| 01585 | Voluntad de supervivencia | 3 | 01085 |
| 01684 | "Me las he visto en peores…" | 4 | 02261 |
| 01686 | Viejo libro de conocimiento | 3 | 06279 |
| 01688 | Derringer del .41 | 2 | 03234 |
| 01689 | Rito de búsqueda | 2 | 51007 |
| 01690 | Videncia | 3 | 03236 |
| 01692 | Eucatástrofe | 3 | 05324 |
| 08057 | El abanico negro | 3 | 60379 |
| 08058 | El reloj rojo | 5 | 60384 |
| 60313 | Maniobra osada | 0 | 03030 |
| 60413 | Viaje astral | 0 | 03034 |
| 60414 | Mirada hipnótica | 0 | 02153 |
| 60418 | Desafío | 0 | 02190 |

## Decisiones

- `deck-divination`: el coste de una acción y el ataque de oportunidad de Videncia (0) se
  comprobaban por código (`01061`); ahora incluyen su reimpresión `01561`. Se revisaron los
  registradores de los 35 originales buscando comparaciones con su propio código: el resto
  compara el código del cierre (que sigue siendo el del original) o devuelve mensajes que
  `rebindCard` traduce.
- Hoja encantada (05192) figuraba como reimpresión en el inventario 132, pero su texto difiere de
  05193 (versión de Guardián: 3 cargas, potenciar al tener éxito, robar y curar al derrotar). Pasa
  a candidata; no se activa en este lote.
- Las reimpresiones 015xx/016xx (caja básica revisada) no tienen escaneo español en el CDN: la web
  muestra el inglés con el texto español original, como 01571 en el lote 129.

## Verificación

`reprints.test.ts`: 2 casos por reimpresión (texto EN/ES y huella; definición y claves de
comportamiento idénticas al original) y comportamientos representativos (Esquivar, ¡Qué suerte!,
Videncia con acción y ataque de oportunidad, Leo De Luca y El abanico negro).
`apps/web/src/game/reprints-wave-3.test.ts`: compra/inicio/presentación EN/ES de las 35.
Comprobaciones comunes con el lote 134 en su documento.

Recuentos: 35 códigos incorporados; 0 cartas o niveles distintos nuevos; 35 reediciones. Imágenes:
35 escaneos EN y 6 ES nuevos (las 29 de la caja revisada sin escaneo ES) y sus miniaturas.
