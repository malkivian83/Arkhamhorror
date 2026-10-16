import type { EnemyCard, InvestigatorSetup, ScenarioDefinition } from '@lcg/engine'

/**
 * Escenario de demostración con contenido inventado (no pertenece a ningún
 * producto). Sirve para probar el motor de punta a punta hasta que se
 * introduzcan los datos del primer escenario real.
 */

const rat: EnemyCard = {
  kind: 'enemy',
  code: 'demo-rat',
  name: 'Swarm of Rats',
  fight: 1,
  health: 1,
  evade: 3,
  damage: 1,
  horror: 0,
  keywords: [],
}

const watcher: EnemyCard = {
  kind: 'enemy',
  code: 'demo-watcher',
  name: 'Hooded Watcher',
  fight: 3,
  health: 3,
  evade: 2,
  damage: 1,
  horror: 1,
  keywords: ['hunter', 'retaliate'],
  victory: 1,
}

const shade: EnemyCard = {
  kind: 'enemy',
  code: 'demo-shade',
  name: 'Restless Shade',
  fight: 2,
  health: 2,
  evade: 3,
  damage: 0,
  horror: 2,
  keywords: ['alert'],
}

export const demoScenario: ScenarioDefinition = {
  id: 'demo',
  locations: [
    {
      id: 'hall',
      name: 'Entrance Hall',
      shroud: 1,
      clueValue: 1,
      cluesPerInvestigator: true,
      connections: ['library', 'cellar'],
    },
    {
      id: 'library',
      name: 'Library',
      shroud: 3,
      clueValue: 2,
      cluesPerInvestigator: true,
      connections: ['hall', 'study'],
    },
    {
      id: 'study',
      name: 'Study',
      shroud: 2,
      clueValue: 1,
      cluesPerInvestigator: true,
      connections: ['library'],
    },
    {
      id: 'cellar',
      name: 'Cellar',
      shroud: 4,
      clueValue: 2,
      cluesPerInvestigator: false,
      connections: ['hall'],
    },
  ],
  startingLocation: 'hall',
  agendas: [
    { name: 'Whispers in the Walls', doomThreshold: 4 },
    { name: 'The House Awakens', doomThreshold: 6 },
  ],
  acts: [
    {
      name: 'Search the House',
      clueThreshold: 2,
      cluesPerInvestigator: true,
      advanceTiming: 'endOfRound',
    },
    {
      name: 'Find the Way Out',
      clueThreshold: 3,
      cluesPerInvestigator: true,
      advanceTiming: 'anytime',
    },
  ],
  encounterDeck: [rat, rat, rat, shade, shade, watcher],
  chaosBag: [
    1,
    0,
    0,
    -1,
    -1,
    -1,
    -2,
    -2,
    -3,
    -4,
    'skull',
    'skull',
    'cultist',
    'tablet',
    'autoFail',
    'elderSign',
  ],
  tokenValues: { skull: -1, cultist: -2, tablet: -2, elderThing: -3 },
}

export const demoInvestigators: InvestigatorSetup[] = [
  {
    id: 'scholar',
    name: 'The Scholar',
    skills: { willpower: 3, intellect: 4, combat: 2, agility: 3 },
    health: 7,
    sanity: 8,
    elderSignModifier: 1,
    deck: Array.from({ length: 30 }, (_, n) => `scholar-${n + 1}`),
  },
  {
    id: 'brawler',
    name: 'The Brawler',
    skills: { willpower: 2, intellect: 2, combat: 5, agility: 3 },
    health: 9,
    sanity: 6,
    elderSignModifier: 1,
    deck: Array.from({ length: 30 }, (_, n) => `brawler-${n + 1}`),
  },
]
