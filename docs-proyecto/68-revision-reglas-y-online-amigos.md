# 68 · Revisión de reglas y propuesta de partidas online con amigos

Fecha: 23/10/2026. Base revisada: `main`, commit `6d5898d`, después de
`git pull --rebase` (árbol inicialmente limpio). Referencia: copia local de
`E:\referencia\ArkhamHorror`; no se ha actualizado esa copia ni se presupone
que coincida con su producción.

## Resultado y alcance

El juego compartido online todavía no está implementado. Las cuentas y los
guardados en servidor son una base útil, pero sincronizar un documento personal
no equivale a coordinar una mesa. Hay un error de orden de resolución de robos
múltiples y un obstáculo concreto de propiedad de decisiones para multijugador.

Revisión estática dirigida del motor, guardados, servidor y referencia. Se han
extraído los PDF locales para consultar reglas; no se ha hecho una partida en
navegadores separados, probado producción ni auditado cada carta o escenario.
Las auditorías 15, 16 y 18 permanecen como antecedentes, no como certificación
del contenido añadido posteriormente. Este informe no declara que las demás
reglas sean correctas ni que todo el catálogo importado sea jugable.

## Reglas: hallazgos y comprobaciones

### R1 · Alta: revelaciones de debilidades antes de completar un robo múltiple

Fuente normativa: `reglas/FAQ v2.5A.pdf`, página PDF 39, pregunta sobre Patrice
y Amnesia. Salvo indicación de robar de una en una, el robo es simultáneo y las
revelaciones se resuelven después de robar todas las cartas, en el orden elegido.

Evidencia: `packages/engine/src/handlers.ts`, caso `DrawCards`, líneas 921–983.
Las revelaciones de ciertos apoyos se acumulan, pero `resolvesWhenDrawn` deriva
traiciones y enemigos a `ResolveWeakness` **antes** de `...more`. Este último
mensaje continúa robando. `ResolveWeakness` encola inmediatamente la revelación.
`packages/cards/src/core-2026/weaknesses.ts:221` calcula el descarte de Amnesia
según el tamaño de mano en ese momento.

Reproducción propuesta: mano inicial de dos cartas normales; mazo con Amnesia
y una carta normal; robar dos mediante un solo efecto. Actualmente Amnesia
obliga a dejar una carta antes del segundo robo, por lo que se termina con dos;
debería completarse el robo y terminar con una. Hallazgo confirmado por el flujo
de código; esta reproducción específica no se ha ejecutado como test nuevo.

Corrección: representar un lote de robo, completar sus cartas y luego ofrecer
el orden de todas las revelaciones, incluidas traiciones y enemigos. Mantener
por separado los efectos que explícitamente roban de una en una. Añadir regresión
con Amnesia al principio/final, dos debilidades, enemigo, mazo agotado y derrota
durante revelaciones. No cambiar únicamente el orden de dos mensajes sin revisar
las zonas de las cartas y los disparadores de robo.

### R2 · Alta para online: el investigador activo decide compromisos ajenos

Fuente: `reglas/ahc100_rulebook-web.pdf`, sección Skill Tests, Step 2: cada otro
investigador en el mismo lugar puede comprometer una carta propia.
`handlers.ts:2185–2264` construye opciones de todas las manos y las pregunta
únicamente a `investigator.id`. `engine.ts:applyInput` verifica ese identificador,
pero no representa usuarios. El jugador activo podría elegir la carta del amigo;
no basta con autorizar al dueño de `pending.investigator` en el servidor.

En una mesa local controlada por una sola persona esto permite manejar todos
los investigadores. En online debe existir decisión del propietario para aportar
o pasar, y barrera antes de revelar la ficha. Las ventanas de capacidades de
otros investigadores necesitan la misma revisión. No confundir jefe de mesa,
investigador jefe y propietario de una decisión.

### Áreas contrastadas sin discrepancia demostrada en esta revisión

- Cazador: `HuntersMove` excluye agotados/enfrentados y ofrece desempate de rutas.
- Mantenimiento: `UpkeepPhase` prepara, roba/gana recurso y revisa límite de mano.
- Compromiso: limita contribuciones de ayudantes y contempla Peligro.
- Mazo vacío: `DrawCards` baraja descarte y aplica horror cuando hay que robar
  sin cartas; el reglamento 2026 describe ese supuesto. No debe confundirse con
  aplicar horror automáticamente al robar la última carta.

Esto es contraste del camino principal, no cobertura exhaustiva de interacciones.
Falta una matriz completa de ventanas, reemplazos, efectos simultáneos, trauma,
campañas, restricciones de mazos y cartas incorporadas desde auditorías previas.
La referencia es evidencia de implementación, nunca autoridad por encima del PDF.

## Qué aporta la referencia

Rutas relativas a `E:\referencia\ArkhamHorror`:

| Área | Evidencia inspeccionada | Aplicación a nuestro diseño |
| --- | --- | --- |
| Entrada y preparación | `backend/arkham-api/library/Api/Handler/Arkham/PendingGames.hs` | Usuarios, plazas, selección de mazo y entrada entre escenarios; modificación atómica |
| Decisiones por jugador | `backend/arkham-api/library/Entity/Answer.hs` | Identidad de jugador y preguntas pendientes; reaparcar preguntas de otros jugadores |
| Transporte y persistencia | `backend/arkham-api/library/Api/Handler/Arkham/Games/Shared.hs` | Salas, colas por suscriptor, keepalive, bloqueo de fila, publicación tras persistencia |
| Recuperación | `frontend/src/arkham/api.ts` | GET de recuperación de transiciones WebSocket perdidas, acceso de espectador y unión a partida |

La referencia separa comandos y difusión: los sockets de sala transmiten
actualizaciones, y su infraestructura contempla Redis y eventos épicos. Conviene
reutilizar los principios, no trasladar toda esa complejidad a una primera mesa
privada. El código observado añade el token al URL del socket; proponemos evitar
tokens persistentes en URLs. No se ha realizado una auditoría de seguridad de
la referencia ni se afirma que carezca de controles adicionales.

## Arquitectura propuesta

Conservar TypeScript, Fastify, motor determinista y MySQL/MariaDB de Plesk.
Ejecutar `applyInput` en servidor. El navegador renderiza una proyección y envía
intenciones; nunca entrega un `GameState` autoritativo. Mantener el modo local
mediante un adaptador separado, sin permitir que el guardado personal sobrescriba
una mesa online.

Situación actual: `apps/server/src/app.ts:91` abre `/api/ws`, envía `hello` y
responde `not_implemented`. `packages/shared/src/index.ts` solo define join,
answer y estado íntegro. `apps/web/src/stores/game.ts` ejecuta y persiste localmente.
`packages/saves/src/session.ts` ofrece historial y replay aprovechables, pero su
versión de contenido no constituye un hash de todas las reglas de cartas.

### Persistencia y transacciones

- `games`: estado lobby/active/paused/finished, anfitrión, revisión monotónica,
  snapshot privado, versión de motor, hash de contenido, fecha de actualización.
- `game_members`: usuario, rol, plaza e investigadores controlados. Restricciones
  únicas para evitar doble ocupación; máximo cuatro investigadores, no necesariamente
  cuatro cuentas. Identidad del jefe de investigación separada del anfitrión.
- `game_invites`: hash del token, caducidad, revocación y límite de usos.
- `game_commands`: actor, commandId, revisión esperada, respuesta, decisión aceptada;
  unicidad por partida y commandId para deduplicación duradera.
- `game_events`: secuencia/revisión, evento y versión; snapshots periódicos para
  limitar coste de replay. `game_outbox` para publicaciones pendientes.

En una transacción: bloquear fila de partida, comprobar pertenencia y duplicado,
validar revisión/pregunta/opción/propietario, ejecutar motor con límite de trabajo,
guardar snapshot, comando, evento y outbox, confirmar. Solo entonces difundir.
Si se cae el proceso tras confirmar, outbox/reconexión recuperan el cambio. Un
mutex en memoria no basta cuando hay varios procesos o un reinicio.

### Contrato de red

REST autenticado para crear mesa, aceptar invitación, elegir mazo, estar listo,
comenzar y enviar comandos. WebSocket autenticado para notificaciones y presencia.

Comando: `{ commandId, expectedRevision, questionId, choiceId }`; el servidor
deduce usuario e investigador autorizado. Evitar índices de opciones sin versión.
Respuesta: revisión aceptada o error estable (`stale_revision`, `not_member`,
`not_your_choice`, `invalid_choice`, `incompatible_content`). Una repetición del
mismo commandId devuelve el resultado anterior, no vuelve a aplicar el efecto.

Al reconectar: solicitar estado desde última revisión; usar snapshot cuando no
haya eventos suficientes. Ignorar revisiones antiguas y detectar huecos. Resync
también tras suspensión móvil. No reenviar automáticamente decisiones sobre una
pregunta distinta. Serializar inicialmente las decisiones del motor; simultaneidad
visual no requiere ejecutar mutaciones concurrentes.

### Información y seguridad

Proyección explícita por usuario. No enviar semilla, orden de mazos, cola interna,
opciones ajenas ni futuros resultados. Ocultar únicamente por CSS no protege la
información. Compartir manos opcionalmente según política de mesa; los mazos y
contenido no revelado permanecen privados. Historial y replay también deben
proyectarse. Espectadores desactivados por defecto y sujetos a permisos explícitos.

Reutilizar sesiones de cuentas existentes, verificar Origin en handshake,
protección CSRF en mutaciones, esquemas de entrada, límites de tamaño y frecuencia.
Revocar acceso al expulsar/cerrar sesión. No usar UUID de partida como permiso.
Tokens de invitación aleatorios, almacenados como hash y nunca incluidos en logs.

### Experiencia con amigos

Crear mesa privada → compartir invitación → escoger investigador/mazo → confirmar
listos → empezar. Mostrar quién debe decidir, quién está conectado y qué se ha
guardado. La desconexión pausa decisiones de esa persona sin sustituirlas por IA.
Delegación de control explícita, temporal y registrada. No exigir al anfitrión
mantener el navegador abierto. Soportar reanudar días después.

Undo mediante solicitud y consentimiento de participantes afectados, sin borrar
el historial: nueva revisión que restaura checkpoint. Avisar de información ya
revelada y no prometer que pueda olvidarse. No reutilizar el undo local unilateral.
Admitir entrada/salida de campaña entre escenarios; no insertar un investigador
en mitad del escenario alterando el recuento inicial.

## Plan de implementación y aceptación

1. Corregir R1 con regresiones y separar decisiones de colaboradores (R2).
   Añadir identificadores estables de pregunta y opción, ventanas de aportar/pasar
   y tests con dos propietarios. Mantener compatibilidad del modo local.
2. Migraciones de mesas, miembros e invitaciones; lobby con cupo, mazos legales,
   investigadores únicos y confirmación de todos. Pruebas de unión concurrente,
   invitación caducada/revocada e inicio repetido.
3. Ejecutor autoritativo y contrato REST. Pruebas con dos comandos a la misma
   revisión, duplicación, acceso ajeno, caída antes/después de commit y rollback.
4. Proyecciones y WebSocket; reconexión con pérdida, duplicación y desorden de
   mensajes. Verificar que ninguna respuesta revele RNG, mazos o decisiones ajenas.
5. Adaptador web online, dos navegadores con cuentas distintas y hasta cuatro
   investigadores. Completar escenario y reanudar tras reiniciar servidor.
6. Campaña, delegación, undo consensuado y recuperación. Después, espectador
   opcional. Chat, eventos épicos y matchmaking quedan fuera del primer alcance.

Para Plesk: validar proxy Upgrade, timeouts mayores que heartbeat, TLS, cierre
ordenado y drenaje antes de reiniciar. Inicialmente un proceso y difusión local
con recuperación persistente; añadir Redis/pubsub solo al desplegar varias
instancias, conservando MySQL como autoridad. Probar backup y restauración real.

Medir tiempo de comando, rechazos por revisión, reconexiones, retraso de outbox
y tamaño de snapshots sin registrar cartas privadas. Objetivo inicial de producto:
confirmación visible en menos de un segundo en condiciones normales, a validar
con carga y red reales; no es una medición obtenida en esta revisión.

Las mejoras propuestas frente al patrón observado son privacidad por diseño,
invitaciones revocables, recuperación explícita, deduplicación y consentimiento
para controlar cartas ajenas/deshacer. No se afirma que todas estén ausentes de
la referencia: son criterios verificables para nuestra implementación.

## Validación y límites

Pruebas dirigidas ejecutadas: engine.test.ts, mechanics.test.ts y app.test.ts: 3 archivos y 56 pruebas superadas. No se han modificado reglas ni implementado online en esta
entrega. No se ha consultado CI ni Deploy. Antes de implementar deberá añadirse
la reproducción automatizada R1 y una prueba de propiedad de decisiones R2.
