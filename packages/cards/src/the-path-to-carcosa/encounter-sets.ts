/**
 * Conjuntos de encuentros que usa El camino a Carcosa: Portentos malignos, Delirios,
 * Apariciones y Secta del Signo Amarillo (03084–03100), y los de la caja básica
 * original que pide su guía: Miedo impactante y Ratas (01159, 01163–01165).
 *
 * Solo datos y comportamiento; el texto de las cartas está en el catálogo EN/ES.
 */
import {
  actionsThisRound,
  activeInvestigators,
  getInvestigator,
  getLocation,
  registerEnemy,
  registerTreachery,
  shroudOf,
  totalDoom,
  type AbilityOption,
  type Enemy,
  type GameState,
  type InvestigatorId,
  type LocationId,
  type Message,
  type TreacheryBehavior,
} from '@lcg/engine'
import { copies, damage, effectTest, enemy, treachery } from '../scenario-helpers'

export const SETS = {
  // Delirios
  whispersDismay: '03084a',
  whispersDread: '03084b',
  whispersAnxiety: '03084c',
  whispersDoubt: '03084d',
  descentIntoMadness: '03085',
  // Portentos malignos
  blackStarsRise: '03090',
  spiresOfCarcosa: '03091',
  twistedToHisWill: '03092',
  // Apariciones
  poltergeist: '03093',
  spiritsTorment: '03094',
  // Secta del Signo Amarillo
  fanatic: '03098',
  agentOfTheKing: '03099',
  theKingsEdict: '03100',
  // Caja básica original: Ratas y Miedo impactante
  swarmOfRats: '01159',
  rottingRemains: '01163',
  frozenInFear: '01164',
  dissonantVoices: '01165',
} as const

// ---------------------------------------------------------------------------
// Datos de las cartas
// ---------------------------------------------------------------------------

const whispers = (code: string, subname: string) =>
  treachery({
    code,
    name: `Whispers in Your Head (${subname})`,
    traits: ['Terror'],
    keywords: ['peril', 'hidden'],
  })

export const swarmOfRats = enemy({
  code: SETS.swarmOfRats,
  name: 'Swarm of Rats',
  traits: ['Creature'],
  fight: 1,
  health: 1,
  evade: 3,
  damage: 1,
  horror: 0,
  keywords: ['hunter'],
})

const poltergeist = enemy({
  code: SETS.poltergeist,
  name: 'Poltergeist',
  traits: ['Monster', 'Geist'],
  fight: 3,
  health: 2,
  evade: 4,
  damage: 0,
  horror: 2,
  keywords: [],
})

const fanatic = enemy({
  code: SETS.fanatic,
  name: 'Fanatic',
  traits: ['Humanoid', 'Cultist'],
  fight: 3,
  health: 2,
  evade: 3,
  damage: 1,
  horror: 0,
  keywords: [],
})

const agentOfTheKing = enemy({
  code: SETS.agentOfTheKing,
  name: 'Agent of the King',
  traits: ['Humanoid', 'Cultist'],
  fight: 4,
  health: 4,
  evade: 2,
  damage: 1,
  horror: 2,
  keywords: ['hunter'],
  prey: { type: 'mostClues' },
  victory: 1,
})

const card = (code: string, name: string, traits: string[], keywords: ('surge' | 'peril')[] = []) =>
  treachery({ code, name, traits, keywords })

/** Cartas de cada conjunto, con sus copias. */
export const ENCOUNTER_SETS = {
  evilPortents: [
    ...copies(card(SETS.blackStarsRise, 'Black Stars Rise', ['Omen']), 2),
    ...copies(card(SETS.spiresOfCarcosa, 'Spires of Carcosa', ['Omen']), 2),
    ...copies(card(SETS.twistedToHisWill, 'Twisted to His Will', ['Pact']), 2),
  ],
  delusions: [
    whispers(SETS.whispersDismay, 'Dismay'),
    whispers(SETS.whispersDread, 'Dread'),
    whispers(SETS.whispersAnxiety, 'Anxiety'),
    whispers(SETS.whispersDoubt, 'Doubt'),
    ...copies(card(SETS.descentIntoMadness, 'Descent into Madness', ['Terror'], ['surge']), 2),
  ],
  hauntings: [
    ...copies(poltergeist, 2),
    ...copies(card(SETS.spiritsTorment, "Spirit's Torment", ['Curse', 'Geist']), 2),
  ],
  cultOfTheYellowSign: [
    ...copies(fanatic, 3),
    { ...agentOfTheKing },
    ...copies(card(SETS.theKingsEdict, "The King's Edict", ['Pact']), 2),
  ],
  strikingFear: [
    ...copies(card(SETS.rottingRemains, 'Rotting Remains', ['Terror']), 3),
    ...copies(card(SETS.frozenInFear, 'Frozen in Fear', ['Terror']), 2),
    ...copies(card(SETS.dissonantVoices, 'Dissonant Voices', ['Terror']), 2),
  ],
  rats: copies(swarmOfRats, 3),
}

// ---------------------------------------------------------------------------
// Ayudas
// ---------------------------------------------------------------------------

/** "Pierde 1 acción": de este turno si es el suyo; si no, de su siguiente turno. */
export function loseAction(state: GameState, investigator: InvestigatorId): Message {
  return state.activeTurn === investigator
    ? { type: 'LoseActions', investigator, amount: 1 }
    : { type: 'LoseNextTurnActions', investigator, amount: 1 }
}

const toThreatArea = (investigator: InvestigatorId, id: string, hidden = false): Message => ({
  type: 'PlaceTreachery',
  treachery: id,
  placement: { type: 'threatArea', investigator },
  ...(hidden ? { hidden } : {}),
})

const attachHere = (state: GameState, investigator: InvestigatorId, id: string): Message[] => {
  const here = getInvestigator(state, investigator).location
  return here === null
    ? []
    : [{ type: 'PlaceTreachery', treachery: id, placement: { type: 'location', location: here } }]
}

/** Lugar al que está unida la traición (null si no lo está). */
const attachedTo = (t: { placement: { type: string; location?: LocationId } }) =>
  t.placement.type === 'location' ? (t.placement.location ?? null) : null

// ---------------------------------------------------------------------------
// Delirios: Whispers in Your Head (Oculto) y Descent into Madness
// ---------------------------------------------------------------------------

const WHISPERS: [string, NonNullable<TreacheryBehavior['restricts']>][] = [
  [SETS.whispersDismay, { commit: ['skill'] }],
  [SETS.whispersDread, { moveOncePerTurn: true }],
  [SETS.whispersAnxiety, { fastAbilities: true }],
  [SETS.whispersDoubt, { play: ['event'] }],
]

for (const [code, restricts] of WHISPERS) {
  registerTreachery({
    code,
    restricts,
    // Oculto: en secreto a tu mano; se trata como si estuviera en tu zona de amenaza.
    revelation: (_state, investigator, self) => [toThreatArea(investigator, self.id, true)],
    // [action] [action]: descartarla de tu mano (lo único que la descarta).
    abilities: (_state, self, investigator) =>
      self.placement.type === 'threatArea' && self.placement.investigator === investigator
        ? [
            {
              key: `${self.id}:discard`,
              label: 'ability.discardHidden',
              params: { card: self.name },
              actions: 2,
              provokes: true,
              then: [{ type: 'DiscardTreachery', treachery: self.id, own: true }],
            },
          ]
        : [],
  })
}

registerTreachery({
  code: SETS.descentIntoMadness,
  // Oleada. Si tienes al menos 3 de horror, pierdes 1 acción.
  revelation: (state, investigator) =>
    getInvestigator(state, investigator).horror >= 3 ? [loseAction(state, investigator)] : [],
})

// ---------------------------------------------------------------------------
// Portentos malignos
// ---------------------------------------------------------------------------

registerTreachery({
  code: SETS.blackStarsRise,
  // Intelecto (4). Si fallas: 1 perdición en el plan (puede avanzarlo) o 1 horror por punto.
  revelation: (_state, investigator) => [
    effectTest(investigator, 'Black Stars Rise', 'intellect', 4, {
      onFail: [
        {
          type: 'Ask',
          investigator,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.chooseEffect',
            choices: [
              {
                label: 'choice.placeDoom',
                then: [{ type: 'PlaceDoom', amount: 1 }, { type: 'CheckAgenda' }],
              },
              {
                label: 'choice.horrorPerPointFailed',
                then: [{ type: 'ForEachPointFailed', then: [damage(investigator, 0, 1)] }],
              },
            ],
          },
        },
      ],
    }),
  ],
})

registerTreachery({
  code: SETS.spiresOfCarcosa,
  // Se une a tu Lugar y coloca 2 perdiciones en él. Se descarta si el Lugar no tiene perdición.
  revelation: (state, investigator, self) => {
    const here = getInvestigator(state, investigator).location
    if (here === null) return []
    return [
      ...attachHere(state, investigator, self.id),
      { type: 'PlaceLocationTokens', location: here, doom: 2 },
      { type: 'CheckAgenda' },
    ]
  },
  persistsWhile: (state, self) => {
    const location = attachedTo(self)
    return location !== null && (state.locations[location]?.doom ?? 0) > 0
  },
  // [action] Investigar: si tienes éxito, en vez de descubrir pistas retiras 1 perdición.
  abilities: (state, self, investigator) => {
    const location = attachedTo(self)
    if (location === null || getInvestigator(state, investigator).location !== location) return []
    return [
      {
        key: `${self.id}:investigate`,
        label: 'ability.spiresInvestigate',
        actions: 1,
        provokes: true,
        then: [
          {
            type: 'BeginSkillTest',
            investigator,
            skill: 'intellect',
            difficulty: shroudOf(state, location),
            tags: ['investigate'],
            kind: {
              type: 'investigate',
              location,
              replaceClue: true,
              onSuccess: [{ type: 'PlaceLocationTokens', location, doom: -1 }],
            },
          },
        ],
      },
    ]
  },
})

registerTreachery({
  code: SETS.twistedToHisWill,
  // Sin perdición en juego: oleada. Si no, voluntad (X = perdición en juego);
  // si fallas, descartas 2 cartas de tu mano al azar.
  revelation: (state, investigator) => {
    const doom = totalDoom(state)
    if (doom === 0) return [{ type: 'GainSurge' }]
    return [
      effectTest(investigator, 'Twisted to His Will', 'willpower', doom, {
        onFail: [{ type: 'DiscardRandomFromHand', investigator, amount: 2 }],
      }),
    ]
  },
})

// ---------------------------------------------------------------------------
// Apariciones
// ---------------------------------------------------------------------------

const BANISHING = ['Spell', 'Relic']

registerEnemy({
  code: SETS.poltergeist,
  // Solo recibe daño de cartas [[Spell]], [[Relic]] o de Encuentro.
  damageTaken: (_state, _self, amount, source) =>
    source.encounter || (source.traits ?? []).some((t) => BANISHING.includes(t))
      ? { amount }
      : { amount: 0 },
  // [action] Negociar: intelecto (3); si tienes éxito, 1 daño.
  abilities: (_state, self, investigator): AbilityOption[] => [
    {
      key: `${self.id}:parley`,
      label: 'ability.banishGeist',
      actions: 1,
      provokes: false,
      parley: true,
      then: [
        {
          type: 'BeginSkillTest',
          investigator,
          skill: 'intellect',
          difficulty: 3,
          tags: ['parley'],
          kind: {
            type: 'effect',
            source: 'Poltergeist',
            onSuccess: [
              { type: 'DamageEnemy', enemy: self.id, amount: 1, source: { encounter: true } },
            ],
            onFail: [],
            onFailEach: [],
          },
        },
      ],
    },
  ],
})

registerTreachery({
  code: SETS.spiritsTorment,
  revelation: (state, investigator, self) => attachHere(state, investigator, self.id),
  // Forzado: después de salir del Lugar: 1 horror o perder 1 acción.
  forced: (state, trigger, self) => {
    if (trigger.type !== 'afterMove' || trigger.from == null) return []
    if (trigger.from !== attachedTo(self)) return []
    const who = trigger.investigator
    return [
      {
        type: 'Ask',
        investigator: who,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseEffect',
          promptParams: { card: self.name },
          choices: [
            { label: 'choice.takeHorror', then: [damage(who, 0, 1)] },
            { label: 'choice.loseAction', then: [loseAction(state, who)] },
          ],
        },
      },
    ]
  },
  // [action] Colocar 1 de tus pistas en el Lugar: descartarla.
  abilities: (state, self, investigator) => {
    const location = attachedTo(self)
    const me = getInvestigator(state, investigator)
    if (location === null || me.location !== location || me.clues < 1) return []
    return [
      {
        key: `${self.id}:discard`,
        label: 'ability.spiritsTorment',
        actions: 1,
        provokes: true,
        costs: [{ type: 'PlaceCluesOnLocation', investigator, amount: 1 }],
        then: [{ type: 'DiscardTreachery', treachery: self.id }],
      },
    ]
  },
})

// ---------------------------------------------------------------------------
// Secta del Signo Amarillo
// ---------------------------------------------------------------------------

/** "Al derrotarlo: toma el control de todas sus pistas." */
const takeItsClues = (trigger: { enemy: Enemy; by?: InvestigatorId }): Message[] =>
  trigger.by && (trigger.enemy.clues ?? 0) > 0
    ? [{ type: 'GainClues', investigator: trigger.by, amount: trigger.enemy.clues ?? 0 }]
    : []

registerEnemy({
  code: SETS.fanatic,
  // Aparición: Lugar revelado con más pistas.
  spawn: (state) => {
    const revealed = Object.values(state.locations).filter((l) => l.revealed)
    const most = Math.max(...revealed.map((l) => l.clues))
    return revealed.filter((l) => l.clues === most).map((l) => l.id)
  },
  forced: (_state, trigger, self) => {
    // Después de entrar en juego: mueve 1 pista de su Lugar a él.
    if (trigger.type === 'enemySpawned' && trigger.enemy === self.id)
      return [
        {
          type: 'MoveClues',
          from: { type: 'location', id: self.location },
          to: { type: 'enemy', id: self.id },
          amount: 1,
        },
      ]
    if (trigger.type === 'enemyDefeated' && trigger.enemy.id === self.id)
      return takeItsClues(trigger)
    return []
  },
})

registerEnemy({
  code: SETS.agentOfTheKing,
  forced: (_state, trigger, self) => {
    // Después de atacarte: mueve 1 de tus pistas a él.
    if (trigger.type === 'afterEnemyAttack' && trigger.enemy === self.id)
      return [
        {
          type: 'MoveClues',
          from: { type: 'investigator', id: trigger.investigator },
          to: { type: 'enemy', id: self.id },
          amount: 1,
        },
      ]
    if (trigger.type === 'enemyDefeated' && trigger.enemy.id === self.id)
      return takeItsClues(trigger)
    return []
  },
})

export const EDICT = 'carcosa:edict:'

registerTreachery({
  code: SETS.theKingsEdict,
  // Cada enemigo Cultist toma 1 pista de su Lugar; hasta el final de la ronda tiene +1
  // de combate por cada pista o perdición sobre él. Sin pistas movidas: oleada.
  revelation: (state) => {
    const cultists = Object.values(state.enemies).filter((e) =>
      (e.traits ?? []).includes('Cultist'),
    )
    const moved = cultists.filter((e) => (state.locations[e.location]?.clues ?? 0) > 0)
    return [
      ...cultists.flatMap((e): Message[] => [
        {
          type: 'MoveClues',
          from: { type: 'location', id: e.location },
          to: { type: 'enemy', id: e.id },
          amount: 1,
        },
        {
          type: 'SetScenarioMeta',
          key: `${EDICT}${e.id}`,
          value: `${state.round}:${edictCount(state, e.id) + 1}`,
        },
      ]),
      ...(moved.length === 0 ? [{ type: 'GainSurge' } as Message] : []),
    ]
  },
})

/** Edictos del Rey que afectan a este enemigo en la ronda actual. */
function edictCount(state: GameState, enemy: string): number {
  const [round, count] = String(state.scenarioMeta?.[`${EDICT}${enemy}`] ?? '').split(':')
  return Number(round) === state.round ? Number(count) || 0 : 0
}

/** Modificador de combate de los Edictos del Rey (para el `enemyStat` del escenario). */
export function kingsEdictFight(state: GameState, e: Enemy, stat: 'fight' | 'evade'): number {
  if (stat !== 'fight') return 0
  return edictCount(state, e.id) * ((e.clues ?? 0) + (e.doom ?? 0))
}

// ---------------------------------------------------------------------------
// Caja básica original: Miedo impactante y Ratas
// ---------------------------------------------------------------------------

registerTreachery({
  code: SETS.rottingRemains,
  // Voluntad (3): 1 horror por cada punto por el que falles.
  revelation: (_state, investigator) => [
    effectTest(investigator, 'Rotting Remains', 'willpower', 3, {
      onFailEach: [damage(investigator, 0, 1)],
    }),
  ],
})

const ROUND_FIRST: string[] = ['move', 'fight', 'evade']

registerTreachery({
  code: SETS.frozenInFear,
  revelation: (_state, investigator, self) => [toThreatArea(investigator, self.id)],
  // La primera vez que te mueves, atacas o evitas cada ronda cuesta 1 acción adicional.
  actionCost: (state, self, action) => {
    if (self.placement.type !== 'threatArea' || !ROUND_FIRST.includes(action.kind)) return 0
    const done = actionsThisRound(state, self.placement.investigator)
    return done.some((kind) => ROUND_FIRST.includes(kind)) ? 0 : 1
  },
  // Forzado: al final de tu turno, voluntad (3); si tienes éxito, la descartas.
  forced: (_state, trigger, self) =>
    trigger.type === 'turnEnds' &&
    self.placement.type === 'threatArea' &&
    self.placement.investigator === trigger.investigator
      ? [
          effectTest(trigger.investigator, 'Frozen in Fear', 'willpower', 3, {
            onSuccess: [{ type: 'DiscardTreachery', treachery: self.id }],
          }),
        ]
      : [],
})

registerTreachery({
  code: SETS.dissonantVoices,
  restricts: { play: ['asset', 'event'] },
  revelation: (_state, investigator, self) => [toThreatArea(investigator, self.id)],
  // Forzado: al final de la ronda, se descarta.
  forced: (_state, trigger, self) =>
    trigger.type === 'roundEnds' ? [{ type: 'DiscardTreachery', treachery: self.id }] : [],
})

/** Investigadores no eliminados de un Lugar o de los conectados con él. */
export function atOrConnected(state: GameState, location: LocationId) {
  const near = new Set([location, ...getLocation(state, location).connections])
  return activeInvestigators(state).filter((i) => i.location !== null && near.has(i.location))
}
