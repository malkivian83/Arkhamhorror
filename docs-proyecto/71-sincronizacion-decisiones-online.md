# 71 · Sincronización de decisiones online

La mesa compartida se abre dentro del lobby iniciado. La partida permanece en el
servidor; la web envía índices de opciones, nunca mensajes del motor ni estados
modificados. Las acciones, reacciones, mulligan y decisiones de otros jugadores
usan la pregunta pendiente del mismo motor que el modo local.

## Contrato y concurrencia

- GET `/api/online/lobbies/:id/game`: instantánea filtrada para el miembro autenticado.
- POST `/api/online/lobbies/:id/game/decisions`: `commandId` UUID, `revision`,
  `questionId` y `choice`. No acepta identidad del investigador enviada por cliente.
- La transacción bloquea la fila del lobby. Comprueba pertenencia, revisión,
  pregunta, investigador asignado al usuario e índice antes de llamar `applyInput`.
- La revisión identifica también la pregunta: cada decisión aceptada incrementa
  la revisión. Dos respuestas distintas sobre la misma revisión no pueden aplicarse.
- El identificador y la firma del comando se persisten en el JSON del lobby junto
  con el estado. Repetir exactamente el comando devuelve la instantánea actual sin
  ejecutarlo otra vez; reutilizarlo con otro contenido o usuario devuelve conflicto.
  El registro se conserva durante toda la partida.

## Privacidad y recuperación

La proyección enumera campos permitidos. Solo incluye la mano del usuario y las
opciones de su investigador cuando le corresponde decidir. Los demás reciben el
investigador que debe actuar. No entrega RNG, cola, efectos de opciones, orden de
mazos, cartas apartadas, actos/planes futuros ni registro interno del motor.

La vista muestra cartas públicas, investigadores, recursos, heridas, acciones,
pruebas de habilidad y la carta de referencia del escenario. Las decisiones se
presentan como botones traducidos; no dependen del almacén de partidas locales.

El sondeo cada dos segundos, mientras la pestaña está visible, recupera una
instantánea completa. No hay peticiones solapadas ni aplicación de revisiones
anteriores. Al abandonar la mesa o cambiar de cuenta se invalidan las respuestas
pendientes. Si se pierde una confirmación, se conserva el mismo comando y se
ofrece reintentarlo. Un conflicto definitivo requiere actualizar y decidir de nuevo.

## Verificación y límites

Las pruebas cubren API HTTP, privacidad, propietario de decisiones, índices
inválidos, pregunta obsoleta, comandos simultáneos y duplicados, reinicio del
servicio, preparación real seguida de una acción, recuperación del cliente,
conexión interrumpida y renderizado de decisión/espera/final del escenario.

La mesa usa instantáneas y sondeo, no WebSocket ni historial de eventos. No se
implementa todavía transición online entre escenarios, mejora de mazos, cesión
de asiento ni sustitución de jugadores desconectados. Al terminar se muestra el
final del escenario. El registro de comandos crece durante la partida; antes de
ampliar a campañas largas conviene trasladarlo a una tabla con retención definida.
Las comprobaciones con adaptador transaccional de memoria no sustituyen una
sesión contra MySQL y dos navegadores reales.

Validación de esta entrega: 24 pruebas dirigidas aprobadas y una omitida
(`MYSQL_TEST_URL` no disponible), comprobación de tipos del workspace, ESLint
de los archivos afectados y compilación web aprobados. No se ha ejecutado una
partida completa en dos navegadores ni se ha hecho commit, push o despliegue.
