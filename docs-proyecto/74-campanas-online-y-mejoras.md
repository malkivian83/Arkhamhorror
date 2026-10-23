# 74 · Transición de escenarios y mejoras online

La mesa compartida permite registrar el resultado del escenario, preparar los
mazos con experiencia y continuar la campaña. Se reutilizan `finishScenario`,
`purchaseOptions`, `purchase`, `activeMembers` y `startScenario`; el navegador
no calcula experiencia ni envía un mazo sustitutorio o un estado de campaña.

## Requisito de interfaz confirmado · 23 de octubre de 2026

La persona usuaria ha aclarado que las partidas online deben jugarse en **la
mesa de juego normal de la aplicación**, tanto en solitario como con amigos.
La vista simplificada anterior de «Mesa compartida», con una lista de botones de
acciones y cartas debajo del lobby, **no es la experiencia solicitada**. Las
pruebas anteriores acreditan el funcionamiento del protocolo, pero no satisfacen
este requisito de interfaz.

El lobby debe servir para reunir a los jugadores, invitar, elegir mazos,
configurar la partida y confirmar que están listos. Al iniciar o reabrir una
partida activa, se debe acceder a la mesa habitual: mapa de lugares, zona de
investigadores, mano, apoyos, enemigos, acto y plan, referencia del escenario,
inspección de cartas y controles y diálogos de decisiones ya existentes.
Las acciones sobre cartas y lugares deben funcionar desde esos mismos controles.

### Criterios de aceptación de la integración

- Reutilizar la presentación y las interacciones de la mesa normal (`GameView`
  y sus componentes), evitando mantener una segunda mesa simplificada online.
- Enviar las acciones y decisiones al servidor autoritativo; no resolver una
  partida local independiente ni sustituir el guardado local al abrir una mesa online.
- Mostrar el estado público compartido y únicamente la información privada
  autorizada para cada jugador. La integración visual no puede enviar al
  navegador manos ajenas, órdenes ocultos de mazos ni el estado completo del motor.
- Permitir decidir solo al jugador correspondiente y mostrar la espera a los demás.
  Conservar las revisiones, la deduplicación y la recuperación tras recargar.
- Mantener el cierre del escenario, las mejoras individuales, la confirmación
  del grupo y la entrada al siguiente escenario dentro del flujo de la mesa normal.
- Verificar en dos navegadores que ambos usan la mesa normal y ven los cambios
  públicos sincronizados; probar también el inicio en solitario, las decisiones
  desde cartas y mapa, la privacidad, la recarga y la transición con mazos mejorados.
- Añadir pruebas para los cambios de integración y las regresiones encontradas,
  conservando el funcionamiento de las partidas locales.

**Estado:** integración implementada. El lobby activo redirige
a `/online/:id/play`, servido también al recargar directamente. `OnlineGame`
proporciona un controlador a `GameView` y a sus componentes: lugares, mano,
apoyos, pruebas de habilidad, historia y decisiones usan la misma interfaz.

El controlador local sigue siendo `useGameStore`. El controlador online no
llama al motor, no importa partidas en ese almacén y no escribe el guardado
local; usa las decisiones y revisiones del servidor. No ofrece deshacer ni
exportar el estado compartido como si fuera una partida local.

`tableView` construye una proyección mediante listas explícitas de campos.
Solo incluye la mano propia; las demás muestran reversos y cantidades. Los
mazos ocultos tienen reversos anónimos, no identidades ni orden. No transmite
semillas reales, colas de mensajes, efectos pendientes, futuras cartas de acto
o plan ni metadatos privados del escenario. Los valores de habilidad, velo,
probabilidad y modificadores del caos se calculan en el servidor. Los registros
públicos también filtran sus claves y parámetros.

La sincronización consulta cada dos segundos mientras la pestaña está visible.
Las lecturas no bloquean los clics; las decisiones conservan revisión e ID de
comando, impiden doble envío y permiten reintentar una respuesta perdida. Una
respuesta antigua no sustituye otra reciente. Perder autorización vacía la
vista privada; cambiar de cuenta o de mesa desmonta el controlador y limpia
las cartas abiertas.

Al concluir se muestra el resultado y la preparación entre escenarios sobre
la mesa normal. Cada jugador mejora su propio mazo y confirma; el anfitrión
inicia el siguiente escenario cuando corresponde. El cambio de escenario
renueva los componentes de la mesa y mantiene los datos autoritativos.

### Validación de la mesa normal

- Proyección del servidor: mano propia, reversos ajenos, límites de información
  oculta, efectos anidados, destinos de habilidades y valores calculados.
- Controlador y componentes: decisiones de la mesa, reintentos, respuestas fuera
  de orden, autorización perdida, privacidad visual, transición y conservación
  del estado y almacenamiento locales.
- Regresión encontrada en navegadores: una lectura periódica bloqueaba clics.
  Las lecturas y escrituras ahora se coordinan por separado; una respuesta antigua
  no restaura una revisión ni un error ya superados.
- Suite completa: 439 archivos y 2.952 pruebas aprobados; 19 pruebas SQL omitidas
  al no configurar `MYSQL_TEST_URL` para esa ejecución. Formato, tipos y build
  aprobados. Lint aprobado excluyendo `.card-import-tmp/**`, carpeta temporal
  que contiene un script ajeno con errores preexistentes.
- Aceptación real con Chrome 155 y Edge 155, sesiones independientes y MariaDB
  10.4 temporal: inicio desde el lobby, acción de investigar desde el mapa, mano
  propia y reversos ajenos al cambiar de investigador, decisiones compartidas,
  cierre del primer escenario, mejoras `12037 → 12041` y `12016 → 12027`,
  persistencia tras recarga y entrada a Smoke and Mirrors con ambos jugadores.
  También se inició una mesa en solitario con Jenny y se confirmó una decisión.
  Sin errores JavaScript. La prueba usa el motor y experiencia obtenida en juego.

La aceptación se ejecuta con `scripts/test-online-browsers.mjs`, actualizado
para los controles reales de la mesa. No se ha probado una campaña completa,
una conexión por internet ni dispositivos móviles.

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

| Acción     | Datos                                          | Propietario                       |
| ---------- | ---------------------------------------------- | --------------------------------- |
| `finish`   | Ninguno                                        | Anfitrión                         |
| `purchase` | `card`, `upgrade`, `remove` cuando corresponde | Mazo del usuario autenticado      |
| `ready`    | `ready` booleano                               | Usuario autenticado superviviente |
| `next`     | Ninguno                                        | Anfitrión                         |

El bloqueo SQL, la revisión y el registro persistente de comandos son los mismos
de la sincronización de decisiones. La firma incluye la acción y sus parámetros.
Repetir un comando confirmado devuelve la vista actual sin duplicar experiencia,
compras ni preparación. Las respuestas ambiguas por pérdida de conexión conservan
el mismo identificador para reintentarlas. Una revisión obsoleta exige actualizar.

Se añaden `intermission` y `campaignReady` opcionales al JSON privado del lobby,
sin migración SQL nueva. Los lobbies anteriores pueden registrar su resultado al
terminar. No se modifica la biblioteca personal ni la asociación usuario/investigador.

## Verificación previa del protocolo

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

## Aceptación anterior con la vista simplificada (23 de octubre de 2026)

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
