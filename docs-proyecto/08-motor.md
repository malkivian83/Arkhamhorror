# 08 · El motor de reglas (`packages/engine`)

Estado a 2026-10-15. Basado en el reglamento de la caja básica de 2026
(`reglas/`). Las citas "RR" del código remiten a sus secciones.

## Cómo funciona

```
createGame(opciones)  ─┐
applyInput(estado, {investigator, choice}) ─┤──► run(): procesa la cola de mensajes
                                            │      handle(estado, mensaje) → estado
                                            │      (cada manejador puede encolar más)
                                            └──► se detiene en una pregunta (pending)
                                                 o al terminar el escenario (outcome)
```

- **Puro y determinista**: misma semilla + mismas decisiones = mismo estado.
  Una regla de ESLint impide usar `Math.random`, `Date.now`, red o disco.
- **Estado serializable**: `GameState` es JSON plano. Una partida se puede
  guardar como *semilla + lista de decisiones* y reconstruirse.
- **Preguntas**: cada `Choice` lleva la clave i18n que verá el jugador y los
  mensajes que se ejecutan al elegirla.

| Fichero | Contenido |
|---|---|
| `types.ts` | Estado, entidades, mensajes, preguntas |
| `setup.ts` | `ScenarioDefinition`, `InvestigatorSetup`, preparación |
| `handlers.ts` | Un caso por mensaje: fases, acciones, pruebas, enemigos, plan/acto |
| `actions.ts` | Acciones disponibles y avance del acto |
| `state.ts` | Utilidades de consulta/actualización y camino más corto |
| `engine.ts` | `createGame`, `applyInput`, `dispatch`, bucle `run` |
| `testing.ts` | Escenario de prueba y ayudas para tests |

## Reglas implementadas

| Regla (RR) | Notas |
|---|---|
| Preparación | 5 recursos, 5 cartas, investigadores en la localización inicial (se revela) |
| Secuencia de ronda | Sin fase de mitos en la ronda 1 |
| Fase de investigación | El jefe elige quién juega cada turno; 3 acciones; fin de turno manual o automático |
| Robar / Recurso / Moverse / Investigar / Luchar / Evadir / Enfrentarse | Mover revela y coloca pistas (con "por investigador") |
| Mazo vacío al robar | 1 horror y se baraja el descarte |
| Ataques de oportunidad | Todas las acciones salvo luchar/evadir; no agotan |
| Prueba de habilidad | Ficha del caos, símbolos de escenario, signo arcano (modificador), fallo automático = 0 |
| Luchar | 1 daño; fallo contra enemigo enfrentado con otro → ese investigador recibe el daño |
| Evadir | Agota y rompe el enfrentamiento |
| Enemigos | Aparecen enfrentados a quien los roba; instrucciones de aparición; se enfrentan al entrar/aparecer/prepararse |
| Palabras clave | Cazador (camino más corto), distante, represalia, alerta, victoria X |
| Fase de enemigos | Cazadores se mueven; los enfrentados atacan y se agotan |
| Daño/horror y eliminación | Pistas a la localización, enemigos se quedan desenfrentados; sin investigadores → sin resolución |
| Fase de mitos | 1 perdición, comprobar plan, cada investigador roba un encuentro |
| Plan | Avanza al alcanzar su umbral; el último → sin resolución |
| Acto | Gastar pistas en cualquier turno o "al final de la ronda" (objetivo); el último → resolución 1 |
| Mantenimiento | Preparar todo, robar 1, +1 recurso, descartar hasta 8 |

## Simplificaciones conocidas

Decisiones que el reglamento deja al grupo o al jefe y que ahora se toman por
defecto (se convertirán en preguntas):

- Con varios investigadores en la localización, un enemigo se enfrenta al primero en orden de jugadores.
- Empates de camino del cazador: primera conexión listada.
- Al avanzar el acto, las pistas se pagan en orden de jugadores.
- Orden de ataques cuando un investigador está enfrentado a varios enemigos: orden de aparición.
- No hay mulligan ni debilidades en la preparación.
- El final del escenario usa solo "resolución 1" (acto) o "sin resolución" (plan / todos eliminados).

## Pendiente (ver [hoja de ruta](05-hoja-de-ruta.md), fase 1)

Comprometer cartas, jugar cartas, traiciones, ventanas de tiempo y habilidades,
efectos de investigador, resto de palabras clave y los datos reales del escenario.

## Cómo añadir una regla

1. Localizar la sección en el reglamento.
2. Escribir primero el test en `engine.test.ts` (usa `newTestGame`, `during`, `choose`).
3. Añadir el mensaje a `types.ts` y su caso en `handlers.ts`, citando la sección RR.
4. `pnpm test` y `pnpm lint`.
