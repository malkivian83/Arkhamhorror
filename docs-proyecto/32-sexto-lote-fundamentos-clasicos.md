# 32 · Sexto lote: fundamentos clásicos y habilidades de nivel dos

Recuento histórico de esta entrega. La continuación se documenta en el [séptimo lote](34-septimo-lote-equipo-y-efectos-directos.md).

21/10/2026. Se ha verificado la CI y el despliegue del [quinto lote](31-quinto-lote-reacciones-permanentes.md) antes de empezar.
Este lote incorpora **34 registros** por familias mecánicas y corrige el
comportamiento ya existente de Meat Cleaver en la caja de 2026.

## Familias implementadas

- Talentos clásicos de nivel cero y dos: cinco parejas de habilidades distintas.
  Pagan un recurso por cada punto de bonificación, pueden repetirse mientras
  queden recursos y se restringen a las dos habilidades revisadas. El nivel dos
  conserva su coste de juego cero; no se habilitan aquí versiones de nivel cuatro
  con recursos renovables.
- Leather Coat y Cherished Keepsake absorben daño u horror según sus datos.
  Holy Rosary añade voluntad y puede absorber horror.
- Fearless de nivel cero cura horror de quien asignó la habilidad tras un éxito.
- Knife permite atacar sin descartarla o pagar su descarte por una bonificación
  mayor y daño adicional.
- Flashlight gasta suministros y reduce el velo en dos para su investigación,
  con mínimo cero. Se prueba una habilidad cero con ficha negativa para
  distinguir la reducción de dificultad de una bonificación de habilidad.
- First Aid cura daño o bien horror de un investigador cercano y se descarta
  al consumir el último suministro. Flashlight, en cambio, permanece sin usos.
- Guts, Perception, Overpower y Manual Dexterity de nivel dos roban una o dos
  cartas según el margen de éxito, con un máximo por título en cada prueba.

Los datos de cada edición, incluidos coste, nivel, iconos y ranuras, permanecen
separados. La implementación se comparte solo entre los comportamientos revisados.

| Código | Carta | Nivel | Familia de comportamiento |
| --- | --- | ---: | --- |
| 01077 | Dig Deep | 0 | pump |
| 01087 | Flashlight | 0 | flashlight |
| 01086 | Knife | 0 | knife |
| 01017 | Physical Training | 0 | pump |
| 01059 | Holy Rosary | 0 | rosary |
| 01034 | Hyperawareness | 0 | pump |
| 01072 | Leather Coat | 0 | soak |
| 01019 | First Aid | 0 | first-aid |
| 01049 | Hard Knocks | 0 | pump |
| 01062 | Arcane Studies | 0 | pump |
| 01067 | Fearless | 0 | fearless |
| 03114 | Cherished Keepsake | 0 | soak |
| 50001 | Physical Training | 2 | pump |
| 50003 | Hyperawareness | 2 | pump |
| 50005 | Hard Knocks | 2 | pump |
| 50007 | Arcane Studies | 2 | pump |
| 50009 | Dig Deep | 2 | pump |
| 05114 | Meat Cleaver | 0 | cleaver |
| 60325 | Manual Dexterity | 2 | draw-skill |
| 60228 | Perception | 2 | draw-skill |
| 60424 | Guts | 2 | draw-skill |
| 60126 | Overpower | 2 | draw-skill |
| 60108 | Physical Training | 0 | pump |
| 01517 | Physical Training | 0 | pump |
| 01519 | First Aid | 0 | first-aid |
| 01534 | Hyperawareness | 0 | pump |
| 01549 | Hard Knocks | 0 | pump |
| 01559 | Holy Rosary | 0 | rosary |
| 01562 | Arcane Studies | 0 | pump |
| 01567 | Fearless | 0 | fearless |
| 01572 | Leather Coat | 0 | soak |
| 01577 | Dig Deep | 0 | pump |
| 01586 | Knife | 0 | knife |
| 01587 | Flashlight | 0 | flashlight |

## Corrección de Meat Cleaver

Las pruebas reprodujeron antes de corregirlo la ausencia del coste opcional y la
curación. El horror se paga antes de calcular la bonificación según la cordura
restante. Si el coste se asigna a un aliado, no se incrementa el horror del
investigador ni se obtiene indebidamente la bonificación mayor. La curación se
ofrece solo si ese ataque derrota al enemigo y también funciona sin haber
pagado horror adicional. La carta 05114 aplazada en el lote anterior queda
incorporada tras verificar estas reglas para su comportamiento compartido.

La corrección vive en un módulo propio de la caja: core-2026/meat-cleaver.ts.
Los ataques y curaciones se resuelven mediante continuaciones serializables; el
código de la carta y el estado posterior al coste se conservan.

## Máximos de asignación por título

Se reprodujo también que el máximo de una habilidad solo contaba copias del
mismo código. Ahora se consulta el título entre las ediciones asignadas y la
nueva candidata, aplicando el máximo más restrictivo. Esto impide eludir el
máximo mezclando versiones de distinto nivel o impresión, tanto en las opciones
de la interfaz como al procesar un mensaje de asignación atrasado. Las pruebas
cubren los dos órdenes de asignación.

## Datos y verificación

- Manifiesto, módulos y pruebas: packages/cards/src/classic-foundations/.
- Datos: packages/cards/src/data/classic-foundations.json.
- Regeneración: node scripts/prepare-dunwich-pilot.mjs classic-foundations.

Los datos se generan a partir del inventario inmutable y sus aprobaciones.
Cada registro tiene módulo y prueba, efecto principal, restricciones relevantes,
entrada en mazos legales o compra con experiencia e inicio real de escenario.
Se añaden nombres EN/ES y resúmenes propios, sin escaneos ni texto oficial íntegro.
No se habilitan tabúes opcionales ni sustituciones automáticas de ediciones.

## Recuento

Los seis lotes suman **121 registros incorporados**, además de los 104 anteriores:
225 registros de esa base y ampliación. Quedan **1.758 registros** del inventario
fuera de la incorporación. La corrección de 12077 no se cuenta como una nueva
incorporación; el recuento de registros incluye reediciones y mejoras.

## Comprobaciones de la entrega

Formato, lint, tipos y compilación correctos. Suite completa: **1.353 pruebas
correctas y 15 omitidas**; las omitidas no acreditan cobertura. Las tres pruebas
iniciales de regresión fallaron antes de implementar las correcciones y pasan
después, junto a las pruebas adicionales de costes, curación y derrota.

Se mantienen los avisos anteriores de tamaño del paquete web y fuente externa
durante la construcción. Los cambios locales ajenos a la importación se conservan
y se excluyen del commit de este lote.
