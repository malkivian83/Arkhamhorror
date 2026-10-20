# 28 · Segundo lote de cartas de jugador

Continuación del [piloto de 24 cartas](27-cierre-piloto-cartas-jugador.md), subido
a main en el commit `772d3e8`.

## Incorporación

| Código | Carta | Nivel | Comportamiento |
| --- | --- | ---: | --- |
| 02035 | Peter Sylvestre | 2 | Suma voluntad y agilidad; curación opcional de su horror al terminar el turno del controlador. Comparte la condición de único con el nivel cero. |
| 02149 | Estudiante de arte | 0 | Pista opcional al entrar en juego, también mediante un efecto. No ofrece la reacción si no hay pistas. |
| 02194 | Alijo de emergencia | 2 | Obtiene tres recursos y después roba una carta. |

Se eligen por aprovechar reglas ya verificadas, sin añadir nuevas ventanas al
motor. Las dos mejoras se compran con experiencia y se comprueba que llegan al
escenario siguiente. Estudiante de arte se prueba en un mazo inicial válido.

## Procedencia y regeneración

El lote usa el mismo inventario inmutable, con un manifiesto separado:

- `packages/cards/src/dunwich-followup/approvals.json`.
- `packages/cards/src/data/dunwich-followup.json`.
- Módulo y prueba por carta en `packages/cards/src/dunwich-followup/`.

El generador admite el nombre del lote, conservando su invocación anterior:

```powershell
node scripts/prepare-dunwich-pilot.mjs
node scripts/prepare-dunwich-pilot.mjs dunwich-followup
```

Se verifica la misma huella de origen y se exige aprobación por carta. Las
pruebas del adaptador comparan ambos archivos generados con sus manifiestos.
No se descarga de nuevo ni se modifica el inventario histórico.

Los nombres y resúmenes propios están disponibles en español e inglés. Las tres
cartas se presentan con datos locales, sin escaneos. Se mantiene la política sin
tabú opcional y sin sustitución automática de ediciones al importar mazos.

## Recuento

El piloto conserva sus 24 cartas. Este lote añade 3: **27 incorporadas**, además
de las 104 básicas anteriores, para **131 registros** de esa base y ampliación.
Quedan **1.852 registros** del inventario fuera de esa incorporación. El recuento
incluye reediciones y variantes, no solo efectos únicos.

## Verificación

Suite completa: **1.016 pruebas correctas y 15 omitidas**, incluidas las pruebas
de comportamiento y disponibilidad del lote y su regeneración desde el inventario.
Las omitidas no acreditan cobertura. El commit inicial del piloto pasó además
la CI de GitHub antes de incorporar este lote.

Formato, lint, tipos y compilación correctos. Se conservan los avisos anteriores
de tamaño del paquete web y de fuente externa no resuelta durante la construcción.
