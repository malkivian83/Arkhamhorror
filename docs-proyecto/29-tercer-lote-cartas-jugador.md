# 29 · Tercer lote de cartas de jugador

Continuación del [segundo lote](28-segundo-lote-cartas-jugador.md). Su commit
`d754791` pasó CI y despliegue antes de empezar esta incorporación.

## Cartas

| Código | Carta | Nivel | Contrato comprobado |
| --- | --- | ---: | --- |
| 02148 | Resistir juntos | 3 | Selecciona a otro investigador activo del mismo Lugar. Ambos roban dos cartas y obtienen dos recursos. No puede jugarse sin un compañero válido. |
| 02150 | Deducción | 2 | Una investigación exitosa obtiene una pista adicional; dos si el margen es al menos dos. No actúa en otras pruebas de intelecto. |
| 02186 | Bocetos absurdos | 0 | Roba tres cartas si queda alguna pista en el Lugar. Las pistas del investigador no sustituyen ese requisito. |
| 02268 | Intrépido | 2 | Con éxito, cura uno o dos puntos de horror de quien asignó la habilidad, según el margen. También se prueba la asignación como ayuda a otro investigador. |
| 02273 | Un respiro momentáneo | 3 | Cura tres puntos de horror y roba una carta. Cualquier enemigo en el Lugar impide jugarla, aunque no esté enfrentado. |

Se implementan usando mensajes y ventanas ya verificados. Deducción se comprueba
también con Doble o nada: se repiten tanto las pistas normales de investigación
como las adicionales de la habilidad. Las pruebas incluyen éxitos por distinto
margen, fracasos, objetivos inválidos, costes, mazos y compras con experiencia.

## Datos y presentación

Manifiesto separado: `packages/cards/src/dunwich-support/approvals.json`.
Los módulos y sus pruebas están en el mismo directorio; los datos mecánicos,
en `packages/cards/src/data/dunwich-support.json`.

```powershell
node scripts/prepare-dunwich-pilot.mjs dunwich-support
```

El adaptador verifica el lote inmutable de origen y las aprobaciones. Sus pruebas
comparan ahora los tres lotes con los datos generados y exigen módulo y prueba
por carta. La presentación utiliza nombres EN/ES y resúmenes propios, sin
escaneos ni texto oficial íntegro, y no necesita consultar ArkhamDB al jugar.

La política continúa sin tabú opcional y sin reemplazar ediciones automáticamente.

## Recuento actualizado

**32 cartas incorporadas** en estos tres lotes, además de las 104 anteriores:
136 registros de esa base y ampliación. Quedan **1.847 registros** del inventario
fuera de la incorporación. Son registros con reediciones, variantes y dependencias,
no una cuenta de efectos únicos ni de todo el contenido propio de escenarios.

## Verificación

Formato, lint, tipos y compilación correctos. Suite completa: **1.037 pruebas
correctas y 15 omitidas**. Las omitidas no acreditan cobertura. Se conservan los
avisos anteriores de tamaño del paquete web y fuente externa durante la construcción.

La comprobación local detectó además valores por defecto `undefined` redundantes
en dos componentes de interfaz ajenos a este lote. Se retiraron para resolver
los errores de tipos; esos ajustes se conservan con el trabajo local de interfaz
y no forman parte del commit de cartas.
