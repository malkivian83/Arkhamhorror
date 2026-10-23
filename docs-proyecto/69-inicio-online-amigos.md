# 69 · Correcciones de reglas e inicio de mesas online

23/10/2026. Continuación del informe 68 sobre `6d5898d`. Cambios locales sin commit
ni despliegue.

## Reglas corregidas

- R1: `DrawCards` acumula también las debilidades de encuentro y enemigos en el
  lote. Se roban todas las cartas antes de resolver sus revelaciones y se ofrece
  el orden de resolución. Pruebas con Amnesia al inicio/final y dos debilidades;
  se conserva el límite compartido de Dilemas. Fuente: FAQ v2.5A, p. 39.
- R2: proponer una carta de un compañero abre una pregunta a ese investigador.
  Puede aceptar o rechazar antes de retirar la carta de su mano. Las pruebas
  compartidas de efectos aceptan explícitamente; la regresión comprueba también
  rechazo y conservación de mano. Fuente: Skill Tests, Step 2.

La confirmación resuelve el compromiso unilateral, pero aún no es un protocolo
completo de prioridad online: faltan ventanas por propietario, barrera de pasar
antes de revelar ficha y revisión de capacidades ajenas. No publicar el motor
como multijugador hasta implementar esos puntos y las proyecciones privadas.

## Primera entrega de servidor

Migración `004_online_lobbies.sql` y servicio `online/lobbies.ts`, registrado solo
cuando están configuradas las cuentas. La autenticación existente exige cuenta
verificada y protege mutaciones mediante Origin/CSRF.

| Método y ruta | Resultado |
| --- | --- |
| POST `/api/online/lobbies` | Crea mesa privada con su anfitrión |
| GET `/api/online/lobbies/:id` | Devuelve metadatos únicamente a miembros |
| POST `/api/online/lobbies/:id/invite` | Anfitrión genera o rota invitación de 24 horas |
| DELETE `/api/online/lobbies/:id/invite` | Anfitrión revoca invitación |
| POST `/api/online/lobbies/:id/join` | Acepta `{ token }`, con máximo de cuatro cuentas |

La invitación se devuelve solo al generarla, se guarda como hash y se transmite
en cuerpo JSON, nunca como parámetro de URL. Repetir una unión no duplica miembros.
Rotación, revocación y unión bloquean la misma fila con `FOR UPDATE` dentro de una
transacción. La lectura pública excluye el hash. El servicio no acepta estados
de juego del cliente.

En esta fase los miembros e invitación viven en el JSON privado de una fila;
antes de habilitar investigadores/control de plazas conviene migrarlos a tablas
normalizadas conforme al informe 68. El cupo actual es de cuentas, no un modelo
definitivo de varios investigadores por cuenta. Borrar el anfitrión elimina el
lobby por FK; aún no hay transferencia de anfitrión ni expulsiones.

No hay interfaz de lobby, selección de mazos, inicio de escenario, comandos
autoritativos, outbox, difusión ni reconexión. El WebSocket existente continúa
siendo un esqueleto. Esta entrega inicia la infraestructura; no permite jugar
online todavía. La migración no se ha aplicado a producción.

## Pruebas y continuación

Pruebas del servicio: acceso ajeno, privilegio de anfitrión, hash/proyección,
invitaciones erróneas, rotadas, caducadas y revocadas, unión repetida y competencia
por la última plaza. Las pruebas HTTP cubren autenticación y esquemas; la protección
de mutaciones reutiliza el hook global de cuentas. El adaptador de memoria no
demuestra semántica SQL: se incluye prueba real con `MYSQL_TEST_URL` para concurrencia
y persistencia entre instancias, omitida cuando esa variable no está disponible.

321 pruebas dirigidas y 44 de matriz de escenarios superadas. La matriz se ha
aislado de compromisos opcionales para no repetir propuestas rechazadas con su
estrategia automática. Comprobación de tipos del servidor superada. Suite completa: `pnpm exec vitest run --testTimeout 15000`, con permisos de red
local para SMTP: 421 archivos correctos, 2 omitidos; 2.724 pruebas correctas,
18 omitidas. Build y tipos de servidor/web superados. Lint y formato dirigidos
a todos los archivos TypeScript cambiados y al módulo online superados.
`pnpm lint` global encuentra tres errores en el archivo temporal ajeno
`.card-import-tmp/check-investigator-back.cjs`, que no se ha modificado.
La primera ejecución global de formato señaló `auth.ts`; se normalizó su formato
sin cambio semántico y la comprobación dirigida posterior pasó.

Siguiente tramo: normalizar plazas, elegir mazos válidos y confirmar preparación;
después ejecutor autoritativo con deduplicación, revisión/pregunta estables y
proyección por usuario. Mantener separadas las partidas personales del lobby.
