# 74 · Transición de escenarios y mejoras online

La mesa compartida permite registrar el resultado del escenario, preparar los
mazos con experiencia y continuar la campaña. Se reutilizan `finishScenario`,
`purchaseOptions`, `purchase`, `activeMembers` y `startScenario`; el navegador
no calcula experiencia ni envía un mazo sustitutorio o un estado de campaña.

## Flujo

1. Tras la resolución, el anfitrión registra el resultado. Se guardan experiencia,
   trauma, recompensas y registro de campaña según el motor, una sola vez.
2. Cada miembro ve la experiencia y trauma del grupo, y solo su propio mazo y
   catálogo de compras. Puede conservar experiencia o comprar cartas/mejoras.
3. Las mejoras del mismo título usan el coste diferencial del motor; las compras
   que necesitan espacio exigen elegir una carta retirable. El servidor comprueba
   experiencia, restricciones y sustitución al ejecutar la compra.
4. Cada superviviente confirma que está listo. Una compra retira únicamente la
   confirmación de su comprador. Los jugadores muertos o enloquecidos permanecen
   como observadores y no bloquean las confirmaciones.
5. El anfitrión inicia el siguiente escenario cuando todos los supervivientes han
   confirmado. La preparación usa semilla del servidor y el registro persistido,
   incluidos mazos mejorados, trauma y recompensas.

El final de campaña o la falta de un escenario implementado impiden continuar.
Los resultados que solicitan repetir escenario conservan el índice conforme a
`finishScenario`. No se permite incorporar investigadores sustitutos todavía.

## Protocolo y almacenamiento

POST `/api/online/lobbies/:id/game/progress` acepta `commandId`, `revision` y:

| Acción | Datos | Propietario |
| --- | --- | --- |
| `finish` | Ninguno | Anfitrión |
| `purchase` | `card`, `upgrade`, `remove` cuando corresponde | Mazo del usuario autenticado |
| `ready` | `ready` booleano | Usuario autenticado superviviente |
| `next` | Ninguno | Anfitrión |

El bloqueo SQL, la revisión y el registro persistente de comandos son los mismos
de la sincronización de decisiones. La firma incluye la acción y sus parámetros.
Repetir un comando confirmado devuelve la vista actual sin duplicar experiencia,
compras ni preparación. Las respuestas ambiguas por pérdida de conexión conservan
el mismo identificador para reintentarlas. Una revisión obsoleta exige actualizar.

Se añaden `intermission` y `campaignReady` opcionales al JSON privado del lobby,
sin migración SQL nueva. Los lobbies anteriores pueden registrar su resultado al
terminar. No se modifica la biblioteca personal ni la asociación usuario/investigador.

## Verificación

Pruebas de servicio y HTTP: cierre único, compras propias y coste de XP,
sustitución obligatoria, experiencia insuficiente, rechazo de investigadores
ajenos/inactivos, confirmaciones, concurrencia, reinicio, siguiente escenario con
trauma, final de campaña y repetición de escenario. Pruebas del cliente:
reintentos de compra con el mismo identificador y controles de mejoras/espera.

Se ejecutó además la integración SQL contra MariaDB 10.4 local en una instancia
temporal: compras e inicios simultáneos, deduplicación persistente y recuperación
desde una nueva instancia del servicio. MySQL 8.4 y MariaDB 10.11 de CI no se han
consultado para esta entrega. No se ha probado una campaña completa en dos
navegadores reales. Los cambios quedan locales, sin commit ni push.

Resultado: 33 pruebas dirigidas aprobadas; las 19 pruebas SQL de cuentas y lobbies
también pasaron juntas contra la base temporal. Tipos del workspace, lint de los
archivos afectados, formato y compilación aprobados.
