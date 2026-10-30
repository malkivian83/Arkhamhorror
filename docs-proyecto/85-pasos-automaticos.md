# 85 · Pasos automáticos

## Objetivo

Que nada parezca ocurrir solo. Tras cada decisión, si el juego resuelve pasos
sin preguntar (final de turno, fases de enemigos, mantenimiento y mitos, efectos
de inicio o final de turno), la mesa abre el modal **Pasos automáticos** con
cada paso del reglamento, su motivo y los cambios que ha producido.

## Funcionamiento

- `apps/web/src/game/autoSteps.ts` observa el motor con el mismo
  `EngineObserver` que la revisión de avance de actos y planes, sin cambiar
  el estado ni las partidas guardadas.
- Cada mensaje `Step` abre un paso (`log.step.*`, el mismo texto que el
  registro) con su motivo (`table.autoSteps.reason.*`). Los cambios entre
  mensajes se atribuyen al paso en curso: entradas del registro, recursos,
  pistas, daño, horror, cartas robadas o descartadas, acciones disponibles,
  perdición, lugares revelados, enemigos que aparecen, se mueven, se enfrentan,
  atacan, se agotan o se preparan, apoyos preparados y cartas que salen de la mesa.
- `log.round` se muestra como separador de ronda.
- Lo que ocurre durante `takeActions` lo decide el jugador y no se recoge. Si la
  decisión llega a mitad de un paso automático (orden de ataques, una prueba
  de un encuentro), los cambios siguientes siguen en ese paso.
- El modal descubre los pasos de uno en uno (**Siguiente paso**) o todos a la
  vez (**Ver todos los pasos**) y termina con la decisión que detiene la
  secuencia. Espera a que se acepte la revisión de avance de acto o plan.
- Se puede desactivar con **Desactivar este visor** en el propio modal o con el
  botón pequeño **Pasos ●/○** de la barra de controles del mapa, tanto en partidas
  locales como en línea, que también lo vuelve a activar.
  La preferencia se guarda en el navegador (`lcg:autoSteps`) y está activada por
  defecto; desactivado, el juego resuelve los mismos pasos sin abrir el modal.
- Al entrar o recargar no se repiten los pasos anteriores. El visor es individual:
  abrirlo, cerrarlo o desactivarlo no detiene a los demás jugadores.

## Partidas en línea

- El recolector común vive en `packages/shared/src/autoSteps.ts`; la mesa local
  conserva el mismo comportamiento a través de su exportación anterior.
- El servidor observa los mensajes reales de cada decisión y genera una revisión
  para cada miembro desde su proyección de mesa. Las manos ajenas solo aportan
  cantidades; las identidades enmascaradas, traiciones ocultas, registros privados
  y preguntas de otros jugadores siguen filtrados antes de construir los efectos.
- La sala conserva los últimos 32 lotes de revisiones automáticas, asociados a
  la revisión autoritativa. Cada respuesta incluye únicamente los resúmenes del
  miembro autenticado. Los reintentos de un comando no duplican los lotes; al
  cambiar de escenario se retiran los del escenario anterior.
- El cliente encola los lotes nuevos en orden, incluso si hubo varias decisiones
  entre consultas. No vuelve a mostrar revisiones ya recibidas ni reproduce las
  anteriores a la entrada en la sala. Tras una desconexión que supere la retención
  del servidor solo estarán disponibles los 32 lotes más recientes.
- La preferencia se aplica en cada navegador con la misma clave `lcg:autoSteps`.
  Desactivar descarta también la cola pendiente; reactivar empieza con los nuevos
  pasos. Aceptar un resumen es una operación local y no cambia el estado de juego.

## Validación

- `apps/web/src/game/autoSteps.test.ts`: final de ronda completo (cazador,
  ataque, mantenimiento, perdición y encuentro, en orden y con motivo), acción
  del jugador sin modal y continuación a mitad de paso.
- `apps/web/src/stores/game.test.ts`: terminar el turno rellena el modal, no
  lo guarda y aceptarlo lo cierra.
- Revisión visual en escritorio y a 390 px de ancho con La gala de mitad de invierno.
- Ampliación en línea: pruebas dirigidas de salas, proyección privada, cliente,
  controlador de mesa, recolector y almacén local. Cubren orden, efectos, cantidades
  públicas de robo, ocultación de identidades y decisiones, persistencia y límite de
  lotes, reintentos, consultas repetidas, activación/desactivación, cambio de escenario
  y limpieza al salir de la cuenta. Tipos de shared, servidor y web, formato y lint
  sobre los archivos modificados. Sin pruebas de navegador para esta ampliación.

## Presentación de cartas que entran en juego

El foco central recoge también las entradas directas y las caras descubiertas,
no solo los robos de encuentros. `packages/shared/src/cardEntries.ts` observa los
mensajes del motor para conservar entradas intermedias aunque la carta salga de
juego en la misma decisión. Incluye enemigos, apoyos controlados y colocados,
traiciones en juego, Lugares, Historias y nuevas cartas activas de acto/plan.

Al descubrir un enmascarado se presenta su cara pública desde la cara común.
La carta de destino permanece oculta hasta aceptar el modal; entonces aparece
allí, con traslado animado si el destino está visible y se permiten animaciones.
Las copias se distinguen por destino, no por código. Tomar control de una carta
ya revelada no es otra entrada; un encuentro robado que después aparece se
presenta una sola vez. Los avances de acto/plan que ya muestran esas cartas
conservan su propia revisión, sin repetir después el foco central.

La presentación funciona con el visor de pasos desactivado y con movimiento
reducido. Es transitoria: deshacer, cargar o cambiar de escenario limpia la cola.
En línea se envían únicamente las caras visibles para cada miembro, con los
últimos 32 lotes para recuperar actualizaciones entre consultas; los reintentos
no duplican entradas. Aceptar la presentación no envía una decisión al servidor.

Pruebas dirigidas de revelación real de servidores/inocentes, entradas directas,
entradas intermedias, deduplicación del robo, control de apoyos, caras ocultas,
orden de copias, persistencia/reintentos, aceptación y deshacer local. La prueba
de renderizado por consola comprueba que el destino siga oculto hasta aceptar.
Tipos, lint y formato sobre este alcance; revisión visual pendiente, sin abrir
sesiones de navegador.

## Elecciones sobre la mesa

Cuando hay que elegir un elemento de la mesa (por ejemplo, en qué Lugar se
pone una carta), no se abre ninguna ventana: el mapa resalta las opciones.

- `TargetPrompt.vue` muestra sobre el tapete qué se elige, la carta de
  encuentro que se resuelve y quién decide, también en móvil, donde el panel
  lateral está oculto.
- El genérico «Elige un Lugar» se sustituye por enunciados con la carta y el
  motivo del empate: Puerta secreta (más investigadores), Puerta cerrada con
  llave (más pistas), Prueba incriminatoria (más cercano sin Escena del crimen),
  debilidades que aparecen en el Lugar vacío más alejado o según su texto,
  persecución de La gala (`prompt.chooseHunterPath`), 05036, Voluntad del
  cosmos y Sr. Peabody.
- El foco de la carta de encuentro robada indica dónde ha acabado
  («Se pone en…», «Aparece en…») cuando solo hay una copia en la mesa.
- Los pasos automáticos incluyen los apoyos sin dueño que entran en un Lugar.

## Por qué no se puede jugar una carta

- `playRestriction` (motor) da el motivo con las mismas comprobaciones que
  `playableCards`: habilidades (se comprometen), traición que impide jugar
  Apoyos o Eventos (Susurros en tu cabeza (Duda), Voces disonantes, también
  Ocultas), carta única en juego, tipo bloqueado esta ronda, coste (normal o
  modificado, p. ej. Cabina de luces), condiciones de la carta o carta aún no
  jugable en la aplicación.
- `handReason` (web) añade el momento de juego: acción en tu turno, sin
  acciones o carta rápida fuera de una ventana.
- Al pulsar una carta de la mano sin opciones se muestra el motivo en un
  globo (escritorio, también como `title`) o bajo la carta ampliada (móvil).

## De dónde viene el daño

- `TakeDamage` y `AssignDamage` aceptan `source`: nombre de carta o
  `token:<ficha>`. Si falta, el motor lo deduce al aplicarlo: enemigo que
  ataca, carta que exige la prueba de efecto, traición que se está revelando,
  apoyo cuya habilidad se resuelve o evento de la prueba. Sin un origen claro
  no se inventa ninguno.
- Los efectos obligados llevan su carta (traición, enemigo, plan, acto, Lugar,
  apoyo, Historia o apoyo sin dueño) y los efectos de las fichas del caos, la
  ficha.
- Las claves no cambian (`log.damage`, `prompt.assignDamage`,
  `prompt.assignHorror`): solo añaden el parámetro `source`, y la web usa el
  texto `…From` («Roland recibe 1 daño y 0 horror de Necrófago», «Asigna 1
  horror de la ficha de Calavera») en el diario, los pasos automáticos y el
  reparto entre apoyos. En línea, `source` es público en el registro.
