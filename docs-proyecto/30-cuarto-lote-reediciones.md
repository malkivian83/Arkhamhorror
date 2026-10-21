# 30 · Cuarto lote: treinta reediciones verificadas

21/10/2026. Continuación del [tercer lote](29-tercer-lote-cartas-jugador.md).
Se incorporan **30 registros** que comparten reglas y datos mecánicos con cartas
ya implementadas. Cada código conserva su identidad al importar, jugar, asignar,
descartar y guardar mazos. No se sustituyen ediciones automáticamente.

## Selección y evidencia

La selección compara el nombre inglés, el texto mecánico y los campos de clase,
tipo, nivel, coste, iconos, ranuras, rasgos, salud, cordura, unicidad, límites y
restricciones, entre otros. Solo se normalizan espacios del texto. Cambios de
efecto, nivel o restricciones impiden considerarlas equivalentes. No se incluyen
eventos de reacción desde la mano ni continuaciones que dependan de su código
original: requieren una adaptación y revisión separadas.

La instantánea inglesa se verifica contra la huella del inventario original.
El manifiesto guarda el código fuente de comportamiento y una huella de los
campos comparados por carta. **No se incorpora el texto oficial íntegro**: la
comparación se realiza en memoria y se conservan únicamente sus huellas.

La reutilización registra el comportamiento propio existente con el nuevo código.
No se copia código de la referencia externa. Solo se permiten las clases de
funciones revisadas para este lote, y la aprobación de cada código es explícita.

| Código | Carta | Comportamiento propio de referencia |
| --- | --- | --- |
| 60212 | Laboratory Assistant | 02020 |
| 60405 | Ritual Candles | 02029 |
| 60275 | Deduction | 02150 |
| 60218 | Preposterous Sketches | 02186 |
| 60263 | Preposterous Sketches | 02186 |
| 01693 | Emergency Cache | 02194 |
| 01025 | Vicious Blow | 12025 |
| 60119 | Vicious Blow | 12025 |
| 01525 | Vicious Blow | 12025 |
| 60169 | Vicious Blow | 12025 |
| 01030 | Magnifying Glass | 12034 |
| 01530 | Magnifying Glass | 12034 |
| 01037 | Working a Hunch | 12038 |
| 01537 | Working a Hunch | 12038 |
| 01039 | Deduction | 12039 |
| 60219 | Deduction | 12039 |
| 01539 | Deduction | 12039 |
| 60267 | Deduction | 12039 |
| 01088 | Emergency Cache | 12089 |
| 01588 | Emergency Cache | 12089 |
| 01089 | Guts | 12090 |
| 01589 | Guts | 12090 |
| 01092 | Manual Dexterity | 12091 |
| 01592 | Manual Dexterity | 12091 |
| 01091 | Overpower | 12092 |
| 01591 | Overpower | 12092 |
| 01090 | Perception | 12093 |
| 01590 | Perception | 12093 |
| 01093 | Unexpected Courage | 12094 |
| 01593 | Unexpected Courage | 12094 |

## Regeneración y auditoría

- Manifiesto y módulos: packages/cards/src/reprints-wave-1/.
- Datos: packages/cards/src/data/reprints-wave-1.json.
- Regenerar datos: node scripts/prepare-dunwich-pilot.mjs reprints-wave-1.
- Repetir comparación: node scripts/verify-reprint-equivalence.mjs RUTA_INSTANTANEA_EN_JSON.

La última orden necesita la instantánea original cuyo SHA-256 consta en el
inventario; rechaza una descarga distinta o modificada. Las pruebas normales
comprueban el adaptador, los datos generados, la identidad y cada comportamiento.
Se añaden nombres EN/ES y resúmenes propios, con presentación renderizada local.

## Cobertura

Un módulo y un archivo de pruebas por código. Las pruebas ejecutan los efectos
principales con cada reedición, los fracasos de las habilidades, la entrada en
mazos válidos o la compra con experiencia y el inicio real del escenario.
También contrastan datos y funciones con la fuente propia y verifican el límite
compartido por título al mezclar tres ediciones. Las pruebas del comparador
rechazan cambios de reglas, iconos, costes y restricciones.

## Recuento

Los cuatro lotes añaden **62 registros**, además de las 104 cartas anteriores:
166 registros de esa base y ampliación. Quedan **1.817 registros** del inventario
fuera de esa incorporación. El incremento de este lote corresponde a reediciones
con reglas verificadas, no a treinta efectos inéditos.

## Continuación autorizada

La persona usuaria autoriza continuar y subir automáticamente cada lote que pase
formato, lint, tipos, pruebas y compilación, sin incluir cambios ajenos. La
continuación programada de este chat revisa también CI y despliegue, y debe
avisar solo ante un bloqueo que requiera intervención humana o al terminar.

## Verificación

Formato, lint, tipos y compilación correctos. Suite completa: **1.159 pruebas
correctas y 15 omitidas**; las omitidas no acreditan cobertura. Se mantienen los
avisos anteriores de tamaño del paquete web y fuente externa durante la construcción.
La comparación de las 30 reediciones se ha repetido contra la instantánea original.
