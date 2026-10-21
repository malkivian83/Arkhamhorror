# 37 · Décimo lote: habilidades con compromiso condicionado

21/10/2026. CI y despliegue de 078735f comprobados antes de comenzar. Se incorporan **seis códigos, seis cartas o niveles distintos nuevos y cero reediciones**. No se rellena el lote con impresiones de cartas ya representadas.

| Código | Carta | Nivel | Condición revisada |
| --- | --- | ---: | --- |
| 03116 | Say Your Prayers | 0 | Cordura restante del propietario ≤ 3; máximo una por prueba |
| 03117 | Desperate Search | 0 | Igual; cuatro iconos de intelecto |
| 03118 | Reckless Assault | 0 | Igual; cuatro iconos de combate |
| 03119 | Run For Your Life | 0 | Igual; cuatro iconos de agilidad |
| 02227 | Inquiring Mind | 0 | Hay alguna pista en la localización del investigador que la compromete |
| 02192 | Rise to the Occasion | 0 | Prueba propia; dificultad al menos dos puntos mayor que la habilidad básica |

## Comportamiento y pruebas

El motor dispone ahora de una restricción adicional de compromiso por carta, consultada al ofrecer cartas propias, aportaciones de otros investigadores, compromiso tardío y efectos desde otras zonas. También se valida al resolver el mensaje de compromiso: una opción obsoleta o un mensaje directo no omiten la condición. El camino especial desde descartes aplica la misma restricción.

Las regresiones reprodujeron primero que se ofrecían cartas sin cumplir sus condiciones. Tras la corrección, las pruebas de cada carta cubren el umbral permitido y el prohibido, la aportación por otro investigador, los mensajes directos y desde descartes, los iconos y la inclusión en un mazo legal que llega al inicio de un escenario. Las cuatro habilidades desesperadas comprueban además el límite compartido entre investigadores. Rise to the Occasion compara con la habilidad básica, sin sumar modificadores temporales. La cordura restante usa los valores efectivos del investigador.

Los nombres y resúmenes propios están disponibles en EN/ES y las seis cartas se presentan mediante el renderizador existente. El inventario importado no activa otras cartas. La prueba de unicidad contrasta todos los lotes anteriores y el básico por código y familia canónica.

## Trazabilidad y recuentos

- Fuente inmutable: packages/cards/src/catalog/imports/3c8ee4b5d8100766, sin reescribir manifiestos ni huellas históricas.
- Aprobaciones: packages/cards/src/conditional-commit/approvals.json; reglas, módulos y pruebas individuales junto al manifiesto.
- Datos reproducibles: node scripts/prepare-dunwich-pilot.mjs conditional-commit.
- Acumulado añadido: **177 códigos = 96 cartas o niveles distintos nuevos + 81 impresiones adicionales**.
- Con los 104 registros originales: **281 registros y 200 familias canónicas**.
- Del inventario histórico de 1983 códigos quedan **1702 códigos sin incorporar**. Incluyen reediciones; no equivalen a 1702 cartas distintas pendientes.

El lote se limita a las restricciones revisadas. Las habilidades con iconos variables, costes adicionales o ventanas especiales quedan pendientes de su comportamiento y pruebas específicos.
