# 36 · Noveno lote: herramientas de combate

21/10/2026. Se comprobó la CI y el despliegue de 5da2323 antes de empezar. Este lote incorpora **ocho cartas o mejoras distintas y cero reediciones adicionales**.

## Cartas revisadas

| Código | Carta | Nivel | Coste |
| --- | --- | ---: | ---: |
| 03190 | .45 Automatic | 2 | 4 |
| 60171 | M1911 | 2 | 3 |
| 02226 | Springfield M1903 | 4 | 4 |
| 04204 | Ornate Bow | 3 | 4 |
| 04229 | M1918 BAR | 4 | 5 |
| 60505 | .18 Derringer | 0 | 3 |
| 03110 | Knuckleduster | 0 | 2 |
| 06280 | Garrote Wire | 2 | 2 |

Las dos pistolas de nivel dos comparten el comportamiento de ataque, pero tienen nombres y costes distintos en la fuente: .45 Automatic cuesta cuatro y M1911 cuesta tres. Cada registro conserva sus datos. La prueba de familias comprueba que ninguna impresión canónica estaba ya representada.

- Las pistolas ignoran Represalia solo durante su propio ataque, sin eliminar la palabra clave del enemigo para ataques posteriores.
- Springfield no puede atacar a enemigos enfrentados con su controlador. Esto incluye enemigos Masivos preparados en el mismo lugar; sí permite atacar a un enemigo enfrentado con otro investigador, con el daño correspondiente si se falla.
- Ornate Bow utiliza agilidad, gasta una flecha e inflige daño adicional. Recargar cuesta una acción y provoca ataques de oportunidad. El límite de una munición también se aplica cuando otro efecto añade usos al arco.
- M1918 BAR permite gastar de una a cinco municiones. La bonificación de combate y el daño estándar corresponden a la cantidad pagada. Las opciones se ajustan a la munición disponible tras cada ataque.
- .18 Derringer devuelve una munición si el ataque falla y no la devuelve al tener éxito. Se prueba que la devolución ya se ha producido al abrirse la ventana de un posible ataque de Represalia.
- Knuckleduster concede Represalia solo para ese ataque. No duplica un ataque de Represalia que el enemigo ya tuviera y respeta efectos vinculados que eliminan esa palabra clave.
- Garrote Wire se agota para atacar sin gastar acción durante el turno del controlador. Exige exactamente una salud restante, incluyendo modificadores de salud por cartas vinculadas. Se excluye cuando está agotado o no es el turno del controlador.

## Ampliaciones del motor

Se añaden campos serializables opcionales al ataque para ignorar o conceder Represalia y resolver efectos al fallar. Las palabras clave se consultan de forma efectiva, teniendo en cuenta las vinculadas. Los efectos de fallo se procesan antes de la respuesta de Represalia. Una propiedad opcional del comportamiento limita los usos máximos al añadir fichas, sin limitar las cartas que no declaran ese máximo.

Las tres pruebas iniciales fallaron antes de ampliar el motor: la pistola aún recibía Represalia, el arco excedía una flecha y Derringer perdía la munición al fallar. Pasan después de la implementación. Las pruebas adicionales cubren límites, agotamiento, turnos, usos, daño, ataque básico posterior, enemigo Masivo y salud modificada.

## Integración y alcance

Manifiesto, módulos y pruebas: packages/cards/src/combat-tools/. Datos: packages/cards/src/data/combat-tools.json. Regeneración: node scripts/prepare-dunwich-pilot.mjs combat-tools.

Cada código tiene módulo y prueba del comportamiento principal, juego con su coste impreso e integración en mazo legal o compra de experiencia seguida de inicio real de escenario. Se añaden nombres EN/ES y resúmenes propios. No se añaden imágenes ni textos oficiales íntegros.

No se completa el lote con impresiones adicionales para alcanzar el objetivo orientativo de 30–50. Se dejan para otras entregas las armas que exigen mecánicas no cubiertas aquí, como acciones múltiples, referencias completas a pruebas de eventos Hechizo o ventanas rápidas más amplias. Sus datos de inventario no se consideran cartas jugables.

## Recuento

- Este lote: 8 códigos, 8 cartas o mejoras nuevas y 0 reediciones.
- Nueve lotes: **171 códigos incorporados = 90 cartas o niveles nuevos + 81 impresiones adicionales**.
- Con los 104 registros iniciales: 275 registros de esta base y ampliación, correspondientes a 194 familias de impresión.
- Quedan **1.708 códigos** del inventario histórico fuera de la incorporación. Incluyen reediciones pendientes; no son 1.708 cartas distintas nuevas.

La fuente inmutable sigue siendo 3c8ee4b5d8100766, con instantánea inglesa SHA-256 36bdf57ced256a33c3145b1562eea5f8ea6146d38e6a600cb04e27d43ef5749e. Se conservan los inventarios históricos y sus huellas. Una prueba comprueba que los códigos y familias de este lote no repiten ninguno de los ocho anteriores o la caja inicial; las pruebas del catálogo mantienen una sola impresión visible por carta y nivel.

## Validación de la entrega

Comprobaciones correctas: pnpm format:check, pnpm lint, pnpm typecheck, pnpm test y pnpm build. Suite completa: **1.622 pruebas correctas y 15 omitidas**; las omitidas no se cuentan como cobertura. Se verifican 912 imágenes y miniaturas existentes, sin añadir escaneos en este lote. Se mantienen los avisos previos de fuente externa y tamaño del paquete web.

Se conservan y excluyen del commit el workflow local modificado y los archivos temporales ajenos a la importación.

Antes de subir se integró fa131ff (listado y editor de mazos e iconos). Se conservaron esas modificaciones y se repitieron correctamente las cinco comprobaciones sobre el resultado combinado.
