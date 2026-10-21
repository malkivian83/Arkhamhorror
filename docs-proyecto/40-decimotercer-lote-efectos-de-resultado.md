# 40 · Decimotercer lote: efectos del resultado de habilidades

21/10/2026. Se trajo main y se comprobó la CI de 0c49b0c, que incorpora imágenes desde otra tarea; se conservaron sus cambios. El lote anterior de cartas, cc1ca07, tiene CI y despliegue correctos. Este lote añade **seis códigos, seis cartas o niveles distintos nuevos y cero reediciones**.

| Código | Carta | Nivel | Efecto revisado |
| --- | --- | ---: | --- |
| 03231 | Eureka! | 0 | El investigador que realiza la prueba busca entre sus tres primeras cartas, roba la elegida y baraja tras un éxito |
| 03228 | Inspiring Presence | 0 | Prepara un Aliado en la localización de quien compromete y cura un daño o un horror |
| 11029 | Inspiring Presence | 2 | Prepara ese Aliado y cura tanto un daño como un horror |
| 04112 | Stunning Blow | 0 | Evita automáticamente al enemigo de un ataque exitoso |
| 04157 | Enraptured | 0 | Tras investigar con éxito, añade una carga o secreto a un apoyo propio válido |
| 04201 | Take Heart | 0 | Se compromete sin iconos coincidentes, máximo una copia; si falla, el investigador que realiza la prueba roba dos cartas y gana dos recursos |

## Comportamiento y pruebas

Se distingue al investigador que realiza la prueba de quien compromete la carta. Las pruebas individuales cubren las dos posiciones y el resultado opuesto al requerido, además de un mazo o compra legal y el inicio de un escenario real.

Eureka usa una búsqueda de tres cartas, excluye debilidades conforme a las reglas de búsqueda y roba la seleccionada mediante el mecanismo de robo real. Una regresión comprueba el disparador de robo y que no se ofrece la cuarta carta. Enraptured filtra apoyos controlados con usos de cargas o secretos, incluyendo las formas singular y plural del dato; excluye munición y apoyos de otros investigadores. No se dispara fuera de una investigación.

Inspiring Presence permite elegir qué curar en nivel cero y cura ambas clases de daño en nivel dos. El objetivo puede ser un Aliado controlado por otro investigador presente o un Aliado colocado boca arriba en la localización. El motor incorpora preparación individual y extiende la curación a apoyos colocados, sin cambiar sus demás datos. Se excluyen objetivos lejanos, boca abajo y aquellos a los que el efecto no cambiaría nada. Las decisiones se construyen al resolver cada copia, con el estado actualizado.

Stunning Blow conserva el daño del ataque y emite la evasión automática para su investigador. Si el ataque ya derrotó al objetivo, la evasión no hace nada, sin errores ni disparadores de evasión para un enemigo inexistente.

La regresión combinada con Vicious Blow reprodujo que su daño adicional se aplicaba como un efecto separado, después de comprobar la derrota y de resolver Stunning Blow. El motor incorpora ahora ese daño al propio ataque antes de comprobar la derrota. Se corrige el comportamiento básico y se conserva en sus reediciones mediante el adaptador revisado, sin incorporar códigos nuevos. La prueba comprueba tanto el efecto de derrota como la ausencia de evasión de un enemigo derrotado; otra comprueba que el bono no aumenta el daño de un ataque fallido que alcanza a otro investigador.

Take Heart tiene un permiso explícito para comprometer sin iconos, aplicado por la comprobación común de legalidad. No concede iconos adicionales ni elude límites por título. Se prueban las cuatro habilidades, ayuda ajena, límite compartido y selección desde descartes con Isabelle. Las pruebas iniciales mostraron la ausencia de este permiso y de la preparación individual antes de incorporarlos al motor.

Se añaden nombres, resúmenes propios y cuatro opciones de decisión EN/ES. La presentación utiliza el renderizador y la activación no afecta al resto del inventario.

## Trazabilidad y recuentos

- Fuente inmutable: packages/cards/src/catalog/imports/3c8ee4b5d8100766. Se conservan inventarios, manifiestos y huellas históricos.
- Aprobaciones: packages/cards/src/result-skills/approvals.json; un módulo y prueba por carta y regresiones en la misma carpeta.
- Regeneración: node scripts/prepare-dunwich-pilot.mjs result-skills.
- Unicidad comprobada por código y familia canónica frente a todos los lotes anteriores y el básico.
- Acumulado añadido: **202 códigos = 121 cartas o niveles distintos nuevos + 81 impresiones adicionales**.
- Con los 104 registros originales: **306 registros y 225 familias canónicas**.
- Del inventario histórico de 1983 códigos quedan **1677 códigos sin incorporar**. Incluyen reediciones y no equivalen al número de cartas distintas pendientes.
