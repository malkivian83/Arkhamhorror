# 08 · El motor de reglas (`packages/engine`)

Estado a 2026-10-16 (tarde). Basado en el reglamento de la caja básica de 2026
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
  mensajes que se ejecutan al elegirla. Una opción puede tener requisitos
  (`requires`); si solo queda una válida, se aplica sin preguntar.
- **Contenido registrado**: el comportamiento de escenarios, traiciones y
  enemigos vive en código (`content.ts`: `registerScenario`, `registerTreachery`,
  `registerEnemy`) y se busca por código de carta. El estado solo guarda datos.

| Fichero | Contenido |
|---|---|
| `types.ts` | Estado, entidades, mensajes, preguntas |
| `content.ts` | Registro del comportamiento del contenido (fichas de escenario, revelaciones, forzados) |
| `setup.ts` | `ScenarioDefinition`, `InvestigatorSetup`, preparación |
| `handlers.ts` | Un caso por mensaje: fases, acciones, pruebas, enemigos, plan/acto |
| `actions.ts` | Acciones disponibles y avance del acto |
| `state.ts` | Utilidades de consulta/actualización y camino más corto |
| `engine.ts` | `createGame`, `applyInput`, `dispatch`, bucle `run` |
| `testing.ts` | Escenario de prueba y ayudas para tests (`@lcg/engine/testing`) |

## Reglas implementadas

| Regla (RR) | Notas |
|---|---|
| Preparación | 5 recursos, 5 cartas, investigadores en la localización inicial (se revela) |
| Secuencia de ronda | Sin fase de mitos en la ronda 1 |
| Fase de investigación | El jefe elige quién juega cada turno; 3 acciones; fin de turno manual o automático |
| Robar / Recurso / Moverse / Investigar / Luchar / Evadir / Enfrentarse | Mover revela y coloca pistas (con "por investigador") |
| Mazo vacío al robar | 1 horror y se baraja el descarte |
| Ataques de oportunidad | Todas las acciones salvo luchar/evadir; no agotan |
| Prueba de habilidad | La ficha sale de la bolsa hasta el final; efectos de símbolo del escenario (modificador variable, "revela otra ficha", consecuencias al fallar o al fallar por N); signo arcano (modificador); fallo automático = 0 |
| Pruebas por efecto | Exigidas por cartas: elegir habilidad, dificultad calculada, resultados al acertar/fallar y "por cada punto de fallo" |
| Luchar | 1 daño; fallo contra enemigo enfrentado con otro → ese investigador recibe el daño |
| Evadir | Agota y rompe el enfrentamiento |
| Enemigos | Aparecen enfrentados a quien los roba; instrucciones de aparición; se enfrentan al entrar/aparecer/prepararse |
| Palabras clave | Cazador (camino más corto), distante, represalia, alerta, condenado, presa (mayor/menor habilidad), victoria X; rasgo Élite |
| Traiciones | Revelación, oleada (palabra clave o ganada), peligro (marcado), quedarse en la zona de amenaza o unirse a una localización, descarte |
| Mazo de encuentros | Robar del descarte ("la copia superior de X"); cartas apartadas |
| Habilidades forzadas | Tras descubrir pistas, al terminar la fase de investigación, al ser derrotado un enemigo, tras atacar en la fase de enemigos |
| Efectos varios | Descartar al azar, perder recursos, dejar pistas en la localización, curar |
| Habilidades activadas | De localización, plan, acto, traiciones y apoyos; coste en acciones (0 = rápida), límites por ronda/partida (individual o de grupo); parlamento y retirarse sin ataques de oportunidad |
| Plan y acto | Efectos del reverso al avanzar; actos con objetivo de condición o de pistas en una localización |
| Escenario | Localizaciones apartadas que entran y salen del juego, enemigos y traiciones apartados, buscar en el mazo de encuentros |
| Cartas de jugador | Jugar apoyos y eventos (coste, ranuras, cartas rápidas), habilidades de apoyos con usos y agotamiento, modificadores constantes |
| Comprometer cartas | El investigador que hace la prueba compromete cartas con iconos de la habilidad o comodín; límite "máx. 1"; efectos según el resultado |
| Asignar daño | El jugador reparte daño y horror entre su investigador y apoyos con salud/cordura; el daño directo va al investigador |
| Registro | Entradas con clave i18n y parámetros (rondas, fases, acciones, pruebas, daño, encuentros…) |
| Mesa | Cada opción puede llevar el elemento de la mesa al que se refiere (`target`) |
| Fase de enemigos | Cazadores se mueven; los enfrentados atacan y se agotan |
| Daño/horror y eliminación | Pistas a la localización, enemigos se quedan desenfrentados; sin investigadores → sin resolución |
| Fase de mitos | 1 perdición, comprobar plan, cada investigador roba un encuentro |
| Plan | Avanza al alcanzar su umbral; el último → sin resolución |
| Acto | Gastar pistas en cualquier turno o "al final de la ronda" (objetivo); el último → resolución 1 |
| Mantenimiento | Preparar todo, robar 1, +1 recurso, descartar hasta 8 |

## Inicio de la partida

Sigue el orden del reglamento ("Setup") y del proyecto de referencia
(`prepareGame` en `setup.ts`):

1. **Prólogo** de la campaña (solo en su primer escenario).
2. **Elegir jefe** (`ChooseLead`): con varios investigadores, el grupo lo elige y
   pasa a ser el primero en orden de jugadores (`SetLead`).
3. **Introducción** del escenario (una o varias partes, según el registro).
4. **Investigadores**: apoyos permanentes en juego, 5 recursos (más bonificaciones) y
   **mano inicial** (`DrawOpeningHand`): las debilidades se apartan y se roba otra.
5. **Mulligan** (`InvestigatorsMulligan`), en orden de jugadores: cada uno aparta las
   cartas que quiera de una en una, roba otras tantas (apartando también las
   debilidades) y las apartadas se barajan en el mazo.
6. **Pasos de preparación** de la guía (texto), colocación en la localización inicial
   y efectos de preparación del escenario; empieza la ronda 1.

Fuera de la mesa (tests, partidas automáticas) no hay textos, el jefe es el primero
y nadie cambia cartas.

## Decisiones del jefe (FAQ 1.5)

Lo que el reglamento deja "a elección del jefe" se pregunta en la mesa; fuera de
ella se resuelve en orden de jugadores:

- Con quién se enfrenta un enemigo si varios investigadores cumplen igual su presa.
- Por dónde va un cazador con varios caminos igual de cortos (`huntingSteps`, que
  también tiene en cuenta la presa entre los investigadores más cercanos).
- Quién gasta cada pista al avanzar el acto o al pagar "como grupo"
  (`PayGroupClues`); si solo hay una forma de pagar, se paga sin preguntar.
- En la fase de enemigos, cada investigador elige en qué orden le atacan sus
  enemigos (`AttacksAgainst`); los masivos atacan a cada investigador en orden de
  jugadores, que el jefe encabeza.

## Pruebas de habilidad (FAQ, orden de resolución)

- Paso 6: "después de tener éxito / fallar (por X)" (`afterSkillTest`) se resuelve
  **antes** de aplicar los resultados (paso 7).
- Paso 8: lo que ocurre "después de esta prueba" (`skillTestEnded`), como el segundo
  disparo de Twin .45s o repetir con Old Compass.
- El fallo automático prevalece sobre el éxito automático.
- Una prueba que empieza durante otra espera a que esta termine.

## Permanentes

No cuentan para el tamaño del mazo, empiezan en juego, no pueden abandonarlo (ni
descartarse, ni volver a la mano, ni hacer sitio en una ranura) y, una vez
compradas, no se pueden quitar del mazo.

## Cómo añadir una regla

1. Localizar la sección en el reglamento.
2. Escribir primero el test en `engine.test.ts` o `mechanics.test.ts` (usa `newTestGame`, `during`, `choose`).
3. Añadir el mensaje a `types.ts` y su caso en `handlers.ts`, citando la sección RR.
4. `pnpm test` y `pnpm lint`.
