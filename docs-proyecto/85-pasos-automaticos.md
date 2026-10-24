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
- Solo partidas locales; no se guarda: al recargar no se repite. En línea
  todavía no se muestra porque el servidor no envía los pasos.

## Validación

- `apps/web/src/game/autoSteps.test.ts`: final de ronda completo (cazador,
  ataque, mantenimiento, perdición y encuentro, en orden y con motivo), acción
  del jugador sin modal y continuación a mitad de paso.
- `apps/web/src/stores/game.test.ts`: terminar el turno rellena el modal, no
  lo guarda y aceptarlo lo cierra.
- Revisión visual en escritorio y a 390 px de ancho con La gala de mitad de invierno.

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
