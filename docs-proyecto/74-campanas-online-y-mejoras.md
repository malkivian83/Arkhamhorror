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

## Aceptación con dos navegadores (23 de octubre de 2026)

Se ha probado el servidor que sirve la web compilada, con MariaDB 10.4 temporal,
Chrome 155 y Edge 155 en procesos y sesiones independientes. Son navegadores
reales en modo headless, en la misma máquina; no una simulación de peticiones.

Se encontró un fallo de despliegue: `/online` y `/online/:id` devolvían 404 al
entrar directamente, abrir una invitación o recargar. Se añaden estas rutas
al servidor, validando el UUID de la mesa y manteniendo los 404 de rutas
desconocidas y API. La regresión en `web.test.ts` falló antes de la corrección
y pasó después.

El recorrido final con Trish y Daniela completó 87 decisiones hasta terminar
Spreading Flames, registró el resultado, compró mejoras para ambos y llegó a
la primera ronda de Smoke and Mirrors. No se modificó el estado del motor ni
se concedió experiencia artificialmente. Se comprobaron:

- Invitación, selección de mazos, confirmaciones e inicio compartido.
- Decisiones desde el navegador del investigador al que le corresponde.
- Mejoras `12037 → 12041` y `12016 → 12027`, con descuento de 2 XP cada una,
  sustitución de carta y retirada de la confirmación del comprador.
- Persistencia de los mazos tras recargar y ausencia de cambios en el mazo ajeno.
- Espera hasta la confirmación de ambos y continuación reservada al anfitrión.
- Mismo escenario/revisión/cartas públicas, trauma conservado y mano privada.
- Preparación y primeras decisiones del segundo escenario, sin errores JavaScript.

Una primera sesión con Joe y Daniela también llegó al segundo escenario.
Una confirmación con revisión obsoleta recibió 409, sin aplicar el cambio;
actualizar y confirmar de nuevo permitió continuar, conforme al protocolo.

### Repetición local

Usar una base **temporal** local cuyo nombre termine en `_test`, con permiso
para migrarla, Chrome y Edge instalados y Playwright disponible. El ejecutor
acepta `PLAYWRIGHT_MODULE` para reutilizar una instalación externa; no añade
dependencias a la aplicación. Nunca usar cuentas ni bases de producción.

1. Ejecutar `pnpm --filter @lcg/web build`.
2. En una terminal, definir `MYSQL_TEST_URL` apuntando a esa base y ejecutar
   `pnpm --filter @lcg/server exec tsx e2e/online-browser-server.ts`.
   Este servidor de prueba escucha solo en `127.0.0.1:3187` y crea dos cuentas
   verificadas de prueba. No se importa desde el servidor de producción.
3. En otra terminal, ejecutar `node scripts/test-online-browsers.mjs`.
   Si Playwright no está en la resolución de módulos, definir previamente
   `PLAYWRIGHT_MODULE` con la ruta absoluta a su paquete instalado.
4. El script imprime el resultado y la carpeta temporal con capturas de ambos
   navegadores, cierra los navegadores y no guarda cookies ni invitaciones.
   Detener el servidor de prueba y eliminar la base temporal al terminar.

El recorrido termina el primer escenario dejando pasar turnos: verifica el
ciclo online, no una estrategia para ganar. La semilla es la normal del servidor;
el número de decisiones puede variar. No cubre una campaña completa, internet
real, pérdidas de red ni dispositivos móviles. Las pruebas de servicio/SQL
mantienen la cobertura de concurrencia, permisos y deduplicación.

Validación de esta revisión: 34 pruebas dirigidas aprobadas (1 de rutas web,
17 de servicio online, 2 con MariaDB real y 14 de cliente), tipos del servidor,
lint de los archivos cambiados y formato. Cambios locales sin commit ni push;
no se ha consultado CI ni despliegue.
