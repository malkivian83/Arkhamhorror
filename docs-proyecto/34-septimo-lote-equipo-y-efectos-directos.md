# 34 · Séptimo lote: equipo clásico y efectos directos

21/10/2026. La CI y el despliegue del sexto lote (3c8192f) terminaron correctamente antes de iniciar esta entrega.

Se incorporan **32 registros jugables**, cada uno con módulo, prueba, datos revisados, nombre EN/ES y resumen propio. Compartir una familia no habilita otras versiones automáticamente.

## Comportamientos revisados

- Armas de munición: bonificación de combate y daño propios, pago por ataque, indisponibles sin munición, permanecen en juego al agotarse.
- Switchblade y .41 Derringer: el daño adicional requiere éxito por al menos dos. Las pruebas cubren márgenes cero, uno y dos, y enemigos distantes no enfrentados.
- Backstab usa agilidad, causa tres daños en total y no provoca ataques de oportunidad por ser un ataque.
- Sneak Attack distingue la versión de nivel cero (enemigo agotado) y nivel dos (enemigo no enfrentado al controlador). El daño directo puede afectar a enemigos distantes; no inicia una prueba de combate.
- Bulletproof Vest, Elder Sign Amulet y Leather Jacket absorben daño u horror con sus valores y ranuras impresos. La chaqueta mantiene Rápido. Bloodstone aumenta voluntad; Trench Coat aumenta agilidad solo al evitar.
- Medical Texts permite elegir a cualquier investigador en el mismo lugar, incluso sano: prueba de intelecto de dificultad dos, cura un daño al tener éxito o inflige uno al fallar. Healing Words gasta cargas para curar y permanece en juego sin cargas.
- Hot Streak conserva los costes de sus niveles dos y cuatro y concede diez recursos.
- Cryptic Research es Rápido durante el turno del controlador y hace robar tres cartas al investigador cercano elegido.
- Prepared for the Worst busca un apoyo Arma entre las nueve primeras cartas propias. No Stone Unturned deja elegir a un investigador cercano y una carta válida entre sus seis primeras cartas. Ambas búsquedas barajan después, sin alcanzar cartas fuera del límite ni robar debilidades solo por haberlas encontrado.

| Código | Carta | Nivel | Familia |
| --- | --- | ---: | --- |
| 01016 | .45 Automatic | 0 | firearm |
| 01516 | .45 Automatic | 0 | firearm |
| 02301 | Lightning Gun | 5 | firearm |
| 03020 | .32 Colt | 0 | firearm |
| 01044 | Switchblade | 0 | threshold |
| 01544 | Switchblade | 0 | threshold |
| 60307 | Switchblade | 0 | threshold |
| 02152 | Switchblade | 2 | threshold |
| 01047 | .41 Derringer | 0 | threshold |
| 01547 | .41 Derringer | 0 | threshold |
| 01094 | Bulletproof Vest | 3 | soak |
| 01594 | Bulletproof Vest | 3 | soak |
| 01095 | Elder Sign Amulet | 3 | soak |
| 01595 | Elder Sign Amulet | 3 | soak |
| 01052 | Sneak Attack | 0 | sneak |
| 01552 | Sneak Attack | 0 | sneak |
| 03152 | Sneak Attack | 2 | sneak |
| 01057 | Hot Streak | 4 | resources |
| 01557 | Hot Streak | 4 | resources |
| 50006 | Hot Streak | 2 | resources |
| 01043 | Cryptic Research | 4 | draw |
| 01543 | Cryptic Research | 4 | draw |
| 01035 | Medical Texts | 0 | medical |
| 01535 | Medical Texts | 0 | medical |
| 06163 | Healing Words | 0 | healing |
| 04203 | Trench Coat | 0 | trench |
| 60457 | Bloodstone | 0 | willpower |
| 60310 | Leather Jacket | 0 | soak |
| 02184 | Prepared for the Worst | 0 | weapon-search |
| 03026 | No Stone Unturned | 0 | search |
| 01051 | Backstab | 0 | backstab |
| 01551 | Backstab | 0 | backstab |

## Corrección de daño al fallar un ataque

Una prueba de regresión reprodujo primero que un ataque con daño adicional contra un enemigo enfrentado con otro investigador infligía siempre un solo daño a ese investigador al fallar. Se utiliza ahora el cálculo común de daño, conservando los modificadores incondicionales del arma. El daño que exige éxito por un margen determinado sigue excluido al fallar. Las reglas existentes que calculan daño según el margen de fallo conservan su cálculo específico.

Las regresiones cubren .45 Automatic (dos daños al otro investigador), Backstab (tres), .41 Derringer (solo uno al fallar) y la posibilidad de elegir un objetivo sano con Medical Texts. Se añaden límites de búsqueda y una debilidad encontrada que permanece en el mazo.

## Datos e inventarios

Manifiesto y módulos: packages/cards/src/classic-equipment/. Datos: packages/cards/src/data/classic-equipment.json. Regeneración: node scripts/prepare-dunwich-pilot.mjs classic-equipment.

La fuente sigue siendo el inventario inmutable 3c8ee4b5d8100766. La instantánea inglesa conserva SHA-256 36bdf57ced256a33c3145b1562eea5f8ea6146d38e6a600cb04e27d43ef5749e. Los inventarios históricos y sus huellas permanecen intactos. Se ha consultado el comportamiento del programa de referencia sin copiar su código ni incorporar textos oficiales íntegros.

## Recuento acumulado

Siete lotes: **153 registros incorporados** más los 104 anteriores, **257 registros** de esta base y ampliación. Quedan **1.726 registros** del inventario fuera de la incorporación. Son registros, incluidos mejoras y reediciones, no un recuento de comportamientos distintos. Los registros pendientes no se presentan como jugables.

## Validación

Cada edición dispone de prueba del efecto principal y de entrada en un mazo legal o compra con experiencia seguida de inicio real de escenario. Las pruebas de familia añaden costes, márgenes de éxito, usos y restricciones de objetivo.

Comprobaciones locales correctas: pnpm format:check, pnpm lint, pnpm typecheck, pnpm test y pnpm build. Suite completa: **1.532 pruebas correctas y 15 omitidas**; las omitidas no acreditan cobertura. La regresión del daño al fallar falló antes de corregir el motor y ahora pasa. Verificación de imágenes y miniaturas: 643 recursos existentes; no se incorporan escaneos. Persisten los avisos previos de fuente externa y tamaño del paquete web durante la construcción.

La prueba de importación de mazos reconoce ahora la .45 Automatic original recién incorporada y sigue conservando una carta desconocida sintética con sus cantidades. Los cambios ajenos a este lote se mantienen fuera del commit.

Antes de subir se integró main hasta 7a8007e mediante rebase, conservando los cambios ajenos. Se repitieron las cinco comprobaciones sobre el resultado integrado y todas terminaron correctamente.

Se integró después 03b8a1a (escenario Excelsior), conservando su documentación y traducciones. La documentación de este lote pasa al número 34. Las cinco comprobaciones y la verificación de recursos se repitieron correctamente sobre la integración final.
