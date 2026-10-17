# 13 · Cómo añadir una campaña o un escenario

Guía rápida de las piezas genéricas. Todo vive en `packages/cards/src/`; el motor
(`packages/engine`) no sabe nada de campañas concretas.

## 1. Cartas de jugador

- Datos: un JSON por caja (como `data/core-2026.json`) cargado con
  `registerPlayerCards`. Los investigadores llevan en su carta `deckSize`,
  `deckOptions` (clases y nivel máximo) y `signatures` (cartas exclusivas).
- Comportamiento: `registerPlayerCard({ code, play, abilities, reactions, … })`.
  Las ayudas de `core-2026/player-cards.ts` (`fightAbility`, `investigateAbility`,
  `mayChoose`…) y de `core-2026/cards.ts` (`reaction`, `playFromHand`,
  `evadeEvent`…) sirven para cualquier caja.
- Una carta solo se puede comprar con experiencia si funciona en el motor
  (`isImplemented`: está en un mazo inicial o tiene comportamiento).

## 2. Un escenario

Un fichero por escenario que exporta una función que devuelve un
`ScenarioDefinition` y registra el comportamiento de sus cartas:

- **Datos**: `enemy()`, `treachery()` y `copies()` de `scenario-helpers.ts`.
  Las localizaciones llevan `position` (columna, fila en la mesa) y, si sus
  conexiones dependen de la cara visible, `symbol`, `connectsTo` y `unrevealed`.
  Otros campos útiles: `enterCost`, `investigateExtraActions`, `victory`,
  `beneath` (cartas boca abajo debajo).
- **Preparación**: `setup` (mensajes tras colocar a los investigadores: perdición
  inicial, apoyos en juego, fichas de la bolsa para el resto de la campaña…).
- **Comportamiento**: `registerScenario` (efectos de las fichas y textos de
  resolución), `registerAgenda`, `registerAct`, `registerLocation`,
  `registerEnemy` (habilidades, reacciones, forzados, auras) y
  `registerTreachery`.
- **Pruebas por efecto**: `effectTest` y `chooseSkillTest`.
- **Resoluciones**: `storyEntries('<claveDelEscenario>')` para los textos,
  `noteEffect`/`recordNote` para el registro, `earnExperience` y `endScenario`.
  Los textos de historia son resúmenes propios en `packages/i18n`.

## 3. La campaña

Un fichero `definition.ts` que llama a `registerCampaign`:

```ts
registerCampaign({
  id: 'mi-campana',
  name: 'campaign.names.mi-campana',        // clave i18n
  chaosBags: { easy: [...], standard: [...], hard: [...], expert: [...] },
  scenarios: [
    { id: 'escenario-1', build: ({ difficulty, log, seed, investigators }) => escenario1(...) },
    { id: 'escenario-2' },                    // sin build: "aún no implementado"
  ],
})
```

- `build` recibe el registro de campaña (notas, valores, trauma, apoyos de
  historia), la semilla y los investigadores: con eso cada escenario prepara sus
  variantes.
- `storyAssetsInPlay`: apoyos de historia que ese escenario pone en juego en lugar
  de barajarlos en el mazo.
- Importa el fichero desde `campaign.ts` (sección "Campañas registradas") y añade
  `campaign.names.<id>` y `campaign.scenario.<id>` a los textos.

La pantalla de inicio lista todas las campañas registradas y la de campaña lee
escenarios, resultados y mazos de la definición.

## 4. Comprobar

- Tests del escenario: preparación, reglas nuevas y resoluciones (ver los de
  Brethren of Ash).
- `brethren-of-ash/robustness.test.ts`: partidas con decisiones al azar y que cada
  localización tenga posición; conviene añadir cada escenario nuevo.
