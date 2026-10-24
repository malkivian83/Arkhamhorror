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
