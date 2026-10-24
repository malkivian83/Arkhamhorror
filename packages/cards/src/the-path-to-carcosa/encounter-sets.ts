/**
 * Conjuntos de encuentros que usa El camino a Carcosa: Portentos malignos, Delirios,
 * Apariciones, El regalo de Hastur, Secta del Signo Amarillo, Podredumbre e impurezas y
 * El Extranjero (03084–03105), y los de la caja básica original que pide su guía:
 * Miedo impactante, Ratas y Antiguos males (01159, 01163–01166).
 *
 * Solo datos y comportamiento; el texto de las cartas está en el catálogo EN/ES.
 */
import {
  actionsThisRound,
  activeInvestigators,
  distancesFrom,
  enemyMaxHealth,
  getInvestigator,
  getLocation,
  playerCardDef,
  registerEnemy,
  registerTreachery,
  shroudOf,
  shuffle,
  totalDoom,
  type AbilityOption,
  type Enemy,
  type GameState,
  type InvestigatorId,
  type LocationId,
  type Message,
  type TreacheryBehavior,
} from '@lcg/engine'
import { THE_MAN_IN_THE_PALLID_MASK } from './the-man-in-the-pallid-mask'
import { chooseSkillTest, copies, damage, effectTest, enemy, treachery } from '../scenario-helpers'

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
  // El regalo de Hastur
  maniac: '03095',
  youngPsychopath: '03096',
  danceOfTheYellowKing: '03097',
  // Podredumbre e impurezas
  oozeAndFilth: '03101',
  corrosion: '03102',
  roachSwarm: '03103',
  // El Extranjero
  markedByTheSign: '03104',
  thePaleMaskBeckons: '03105',
  // Secta del Signo Amarillo
  fanatic: '03098',
  agentOfTheKing: '03099',
  theKingsEdict: '03100',
  // Caja básica original: Ratas y Miedo impactante
  swarmOfRats: '01159',
  rottingRemains: '01163',
  frozenInFear: '01164',
  dissonantVoices: '01165',
  // Caja básica original: Antiguos males
  ancientEvils: '01166',
  // Caja básica original: Las máscaras de medianoche (solo sus traiciones), Secta oscura y
  // Puertas cerradas
  huntingShadow: '01135',
  falseLead: '01136',
  acolyte: '01169',
  wizardOfTheOrder: '01170',
  mysteriousChanting: '01171',
  lockedDoor: '01174',
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

const maniac = enemy({
  code: SETS.maniac,
  name: 'Maniac',
  traits: ['Humanoid', 'Lunatic'],
  fight: 3,
  health: 4,
  evade: 1,
  damage: 1,
  horror: 0,
  keywords: [],
})

const youngPsychopath = enemy({
  code: SETS.youngPsychopath,
  name: 'Young Psychopath',
  traits: ['Humanoid', 'Lunatic'],
  fight: 2,
  health: 2,
  evade: 3,
  damage: 1,
  horror: 1,
  keywords: [],
})

/** Combate X: el velo de su Lugar (se suma con `roachSwarmFight`). */
const roachSwarm = enemy({
  code: SETS.roachSwarm,
  name: 'Roach Swarm',
  traits: ['Creature'],
  fight: 0,
  health: 2,
  evade: 3,
  damage: 1,
  horror: 0,
  keywords: [],
})

const acolyte = enemy({
  code: SETS.acolyte,
  name: 'Acolyte',
  traits: ['Humanoid', 'Cultist'],
  fight: 3,
  health: 1,
  evade: 2,
  damage: 1,
  horror: 0,
  keywords: [],
})

const wizardOfTheOrder = enemy({
  code: SETS.wizardOfTheOrder,
  name: 'Wizard of the Order',
  traits: ['Humanoid', 'Cultist'],
  fight: 4,
  health: 2,
  evade: 2,
  damage: 1,
  horror: 0,
  keywords: ['retaliate'],
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
  hastursGift: [
    ...copies(maniac, 2),
    ...copies(youngPsychopath, 2),
    ...copies(card(SETS.danceOfTheYellowKing, 'Dance of the Yellow King', ['Pact']), 2),
  ],
  decayAndFilth: [
    ...copies(card(SETS.oozeAndFilth, 'Ooze and Filth', ['Hazard']), 2),
    ...copies(card(SETS.corrosion, 'Corrosion', ['Hazard']), 2),
    ...copies(roachSwarm, 2),
  ],
  theStranger: [
    ...copies(card(SETS.markedByTheSign, 'Marked by the Sign', ['Pact'], ['peril']), 2),
    card(SETS.thePaleMaskBeckons, 'The Pale Mask Beckons', ['Omen', 'Pact']),
  ],
  ancientEvils: copies(card(SETS.ancientEvils, 'Ancient Evils', ['Omen']), 3),
  /** Las máscaras de medianoche: solo sus 5 traiciones (guía de Carcosa p. 10). */
  midnightMasksTreacheries: [
    ...copies(card(SETS.falseLead, 'False Lead', []), 2),
    ...copies(card(SETS.huntingShadow, 'Hunting Shadow', ['Curse'], ['peril']), 3),
  ],
  lockedDoors: copies(card(SETS.lockedDoor, 'Locked Door', ['Obstacle']), 2),
  darkCult: [
    ...copies(acolyte, 3),
    { ...wizardOfTheOrder },
    ...copies(card(SETS.mysteriousChanting, 'Mysterious Chanting', ['Hex']), 2),
  ],
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

// ---------------------------------------------------------------------------
// El regalo de Hastur
// ---------------------------------------------------------------------------

export const isLunatic = (e: Enemy) => (e.traits ?? []).includes('Lunatic')

registerEnemy({
  code: SETS.maniac,
  // Forzado: después de enfrentarse a ti, recibes 1 daño y le infliges 1 daño.
  forced: (_state, trigger, self) =>
    trigger.type === 'afterEngage' && trigger.enemy === self.id
      ? [
          damage(trigger.investigator, 1),
          { type: 'DamageEnemy', enemy: self.id, amount: 1, source: { encounter: true } },
        ]
      : [],
})

export const PSYCHOPATH = 'carcosa:psychopath:'

/** Ronda cuya fase de investigación pone fin al +3 de combate de la Psicópata joven. */
const psychopathUntil = (state: GameState) =>
  state.phase === 'mythos' || state.phase === 'investigation' ? state.round : state.round + 1

registerEnemy({
  code: SETS.youngPsychopath,
  // Forzado: después de enfrentarse a ti, recibes 1 horror o gana +3 de combate hasta el
  // final de la fase de investigación.
  forced: (state, trigger, self) =>
    trigger.type === 'afterEngage' && trigger.enemy === self.id
      ? [
          {
            type: 'Ask',
            investigator: trigger.investigator,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.chooseEffect',
              promptParams: { card: self.name },
              choices: [
                { label: 'choice.takeHorror', then: [damage(trigger.investigator, 0, 1)] },
                {
                  label: 'choice.psychopathFight',
                  then: [
                    {
                      type: 'SetScenarioMeta',
                      key: `${PSYCHOPATH}${self.id}`,
                      value: psychopathUntil(state),
                    },
                  ],
                },
              ],
            },
          },
        ]
      : [],
})

/** Combate de la Psicópata joven (+3) y del Enjambre de cucarachas (velo de su Lugar). */
export function hastursGiftFight(state: GameState, e: Enemy, stat: 'fight' | 'evade'): number {
  if (stat !== 'fight') return 0
  if (e.code === SETS.roachSwarm)
    return state.locations[e.location] ? shroudOf(state, e.location) : 0
  if (e.code !== SETS.youngPsychopath) return 0
  const until = Number(state.scenarioMeta?.[`${PSYCHOPATH}${e.id}`] ?? 0)
  const active =
    state.round < until ||
    (state.round === until && (state.phase === 'mythos' || state.phase === 'investigation'))
  return active ? 3 : 0
}

/** Enemigos más cercanos a un Lugar entre los dados. */
function nearest(state: GameState, from: LocationId, enemies: Enemy[]): Enemy[] {
  const distances = distancesFrom(state, from)
  const distance = (e: Enemy) => distances.get(e.location) ?? Infinity
  const best = Math.min(...enemies.map(distance))
  return enemies.filter((e) => distance(e) === best)
}

registerTreachery({
  code: SETS.danceOfTheYellowKing,
  // Sin Lunáticos en juego: oleada. Si no, voluntad (3); si fallas, el Lunático más cercano
  // se prepara, va hasta tu Lugar, se enfrenta a ti y te ataca.
  revelation: (state, investigator) => {
    const lunatics = Object.values(state.enemies).filter(isLunatic)
    if (!lunatics.length) return [{ type: 'GainSurge' }]
    return [
      effectTest(investigator, 'Dance of the Yellow King', 'willpower', 3, {
        onFail: [{ type: 'ScenarioSpecific', key: 'carcosaDance', data: { investigator } }],
      }),
    ]
  },
})

/** La Danza del Rey de Amarillo: el Lunático más cercano viene a por ti y te ataca. */
export function danceOfTheYellowKing(state: GameState, investigator: InvestigatorId): Message[] {
  const here = getInvestigator(state, investigator).location
  const lunatics = Object.values(state.enemies).filter(isLunatic)
  if (here === null || !lunatics.length) return []
  const comes = (e: Enemy): Message[] => [
    { type: 'ReadyEnemy', enemy: e.id },
    // Se mueve de Lugar en Lugar hasta el tuyo (solo importa dónde llega) y se enfrenta.
    { type: 'EngageEnemy', enemy: e.id, investigator },
    { type: 'EnemyAttack', enemy: e.id, investigator, exhaustAfter: false },
  ]
  const candidates = nearest(state, here, lunatics)
  if (candidates.length === 1) return comes(candidates[0]!)
  return [
    {
      type: 'Ask',
      investigator,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.chooseEnemy',
        choices: candidates.map((e) => ({
          label: 'choice.enemy',
          params: { enemy: e.name },
          target: { type: 'enemy', id: e.id },
          then: comes(e),
        })),
      },
    },
  ]
}

// ---------------------------------------------------------------------------
// Podredumbre e impurezas
// ---------------------------------------------------------------------------

/** "Pon en juego junto al mazo de Plan. Forzado – Al final de la ronda: descártala." */
const nextToAgenda: Pick<TreacheryBehavior, 'revelation' | 'forced'> = {
  revelation: (_state, _investigator, self) => [
    { type: 'PlaceTreachery', treachery: self.id, placement: { type: 'agenda' } },
  ],
  forced: (_state, trigger, self) =>
    trigger.type === 'roundEnds' && self.placement.type === 'agenda'
      ? [{ type: 'DiscardTreachery', treachery: self.id }]
      : [],
}

registerTreachery({
  code: SETS.oozeAndFilth,
  // Cada Lugar recibe +1 a velo.
  shroudModifier: 1,
  ...nextToAgenda,
})

/** Traiciones junto al mazo de Plan con este código. */
export const nextToAgendaCount = (state: GameState, code: string) =>
  Object.values(state.treacheries).filter((t) => t.code === code && t.placement.type === 'agenda')
    .length

registerTreachery({
  code: SETS.corrosion,
  // Descarta Objetos de tu zona de juego y/o mano con un coste impreso total de al menos X
  // (velo de tu Lugar). Si no se descarta ninguno: oleada.
  revelation: (state, investigator) => {
    const here = getInvestigator(state, investigator).location
    const x = here === null ? 0 : shroudOf(state, here)
    return [
      {
        type: 'ScenarioSpecific',
        key: 'carcosaCorrosion',
        data: { investigator, remaining: x, discarded: 0 },
      },
    ]
  },
})

const isItem = (code: string) => (playerCardDef(code)?.traits ?? []).includes('Item')
const printedCost = (code: string) => playerCardDef(code)?.cost ?? 0

/** Un paso de Corrosión: elegir el siguiente Objeto que se descarta, hasta llegar a X. */
export function corrosionStep(
  state: GameState,
  investigator: InvestigatorId,
  remaining: number,
  discarded: number,
): Message[] {
  const me = getInvestigator(state, investigator)
  const inPlay = Object.values(state.assets).filter((a) => a.owner === me.id && isItem(a.code))
  const inHand = [...new Set(me.hand.filter(isItem))]
  if (remaining <= 0 || (!inPlay.length && !inHand.length))
    return discarded === 0 ? [{ type: 'GainSurge' }] : []
  const next = (cost: number): Message => ({
    type: 'ScenarioSpecific',
    key: 'carcosaCorrosion',
    data: { investigator, remaining: remaining - cost, discarded: discarded + 1 },
  })
  return [
    {
      type: 'Ask',
      investigator,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.corrosion',
        promptParams: { n: remaining },
        choices: [
          ...inPlay.map((a) => ({
            label: 'choice.card',
            params: { card: playerCardDef(a.code)?.name ?? a.code },
            target: { type: 'asset' as const, id: a.id },
            then: [{ type: 'DiscardAsset', asset: a.id } as Message, next(printedCost(a.code))],
          })),
          ...inHand.map((code) => ({
            label: 'choice.card',
            params: { card: playerCardDef(code)?.name ?? code },
            target: { type: 'hand' as const, code },
            then: [
              { type: 'DiscardFromHand', investigator, card: code } as Message,
              next(printedCost(code)),
            ],
          })),
        ],
      },
    },
  ]
}

// ---------------------------------------------------------------------------
// El Extranjero
// ---------------------------------------------------------------------------

const manInPlay = (state: GameState) =>
  Object.values(state.enemies).find((e) => e.code === THE_MAN_IN_THE_PALLID_MASK)

registerTreachery({
  code: SETS.markedByTheSign,
  // Peligro. Voluntad (2); si fallas, 2 horror. Con El hombre de la máscara pálida en
  // juego, la prueba tiene +2 y el horror es directo.
  revelation: (state, investigator) => {
    const man = !!manInPlay(state)
    return [
      effectTest(investigator, 'Marked by the Sign', 'willpower', man ? 4 : 2, {
        onFail: [
          {
            type: 'TakeDamage',
            investigator,
            damage: 0,
            horror: 2,
            ...(man ? { direct: true } : {}),
          },
        ],
      }),
    ]
  },
})

registerTreachery({
  code: SETS.thePaleMaskBeckons,
  // En juego: ataca a cada investigador en orden de jugadores, esté donde esté. Si no, su
  // portador lo roba de su mazo o su pila de descartes y baraja su mazo.
  revelation: (state) => {
    const man = manInPlay(state)
    if (man)
      return activeInvestigators(state).map((i): Message => ({
        type: 'EnemyAttack',
        enemy: man.id,
        investigator: i.id,
        exhaustAfter: false,
      }))
    return [{ type: 'ScenarioSpecific', key: 'carcosaBeckons' }]
  },
})

/** La invitación de la máscara pálida: el portador roba al Extranjero y baraja su mazo. */
export function paleMaskBeckons(state: GameState): GameState {
  const bearer = state.investigators.find(
    (i) =>
      i.deck.includes(THE_MAN_IN_THE_PALLID_MASK) || i.discard.includes(THE_MAN_IN_THE_PALLID_MASK),
  )
  if (!bearer) return state
  const without = (pile: string[]) => {
    const index = pile.indexOf(THE_MAN_IN_THE_PALLID_MASK)
    return index < 0 ? pile : pile.filter((_, n) => n !== index)
  }
  const fromDeck = bearer.deck.includes(THE_MAN_IN_THE_PALLID_MASK)
  const deck = fromDeck ? without(bearer.deck) : bearer.deck
  const discard = fromDeck ? bearer.discard : without(bearer.discard)
  const [shuffled, rng] = shuffle(deck, state.rng)
  return {
    ...state,
    rng,
    investigators: state.investigators.map((i) =>
      i.id === bearer.id
        ? { ...i, deck: shuffled, discard, hand: [...i.hand, THE_MAN_IN_THE_PALLID_MASK] }
        : i,
    ),
    queue: [
      {
        type: 'ResolveDrawnRevelations',
        investigator: bearer.id,
        cards: [THE_MAN_IN_THE_PALLID_MASK],
      },
      ...state.queue,
    ],
  }
}

// ---------------------------------------------------------------------------
// Caja básica original: Antiguos males
// ---------------------------------------------------------------------------

registerTreachery({
  code: SETS.ancientEvils,
  // 1 perdición en el plan en curso; puede hacerlo avanzar.
  revelation: () => [{ type: 'PlaceDoom', amount: 1 }, { type: 'CheckAgenda' }],
})

/**
 * Mensajes propios de estos conjuntos (Danza del Rey de Amarillo, Corrosión, La invitación de
 * la máscara pálida). Cada escenario que los usa los delega aquí; null si no es uno de ellos.
 */
export function encounterSpecific(
  state: GameState,
  key: string,
  data: Record<string, string | number | boolean>,
): GameState | null {
  const investigator = typeof data.investigator === 'string' ? data.investigator : null
  const push = (messages: Message[]): GameState => ({
    ...state,
    queue: [...messages, ...state.queue],
  })
  switch (key) {
    case 'carcosaDance':
      return investigator ? push(danceOfTheYellowKing(state, investigator)) : state
    case 'carcosaCorrosion':
      return investigator
        ? push(corrosionStep(state, investigator, Number(data.remaining), Number(data.discarded)))
        : state
    case 'carcosaBeckons':
      return paleMaskBeckons(state)
    case 'carcosaFindCultist':
      return investigator ? findCultist(state, investigator) : state
  }
  return null
}

/** Lunático con más salud restante (empates incluidos). */
export function mostRemainingHealth(state: GameState, enemies: Enemy[]): Enemy[] {
  const left = (e: Enemy) => enemyMaxHealth(state, e) - e.damageTaken
  const best = Math.max(...enemies.map(left))
  return enemies.filter((e) => left(e) === best)
}

// ---------------------------------------------------------------------------
// Caja básica original: Las máscaras de medianoche, Secta oscura y Puertas cerradas
// ---------------------------------------------------------------------------

/** Lugares vacíos (sin investigadores ni enemigos). */
export const emptyLocations = (state: GameState): LocationId[] =>
  Object.keys(state.locations).filter(
    (id) =>
      !activeInvestigators(state).some((i) => i.location === id) &&
      !Object.values(state.enemies).some((e) => e.location === id),
  )

registerTreachery({
  code: SETS.huntingShadow,
  // Peligro. Gastas 1 pista o recibes 2 daño.
  revelation: (state, investigator) => {
    const hurt: Message = damage(investigator, 2)
    if (getInvestigator(state, investigator).clues < 1) return [hurt]
    return [
      {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseEffect',
          choices: [
            {
              label: 'choice.spendClue',
              then: [{ type: 'SpendClues', investigator, amount: 1 }],
            },
            { label: 'choice.takeDamage', params: { n: 2 }, then: [hurt] },
          ],
        },
      },
    ]
  },
})

registerTreachery({
  code: SETS.falseLead,
  // Sin pistas: oleada. Si no, intelecto (4): por cada punto que falles, dejas 1 pista.
  revelation: (state, investigator) =>
    getInvestigator(state, investigator).clues < 1
      ? [{ type: 'GainSurge' }]
      : [
          effectTest(investigator, 'False Lead', 'intellect', 4, {
            onFailEach: [{ type: 'PlaceCluesOnLocation', investigator, amount: 1 }],
          }),
        ],
})

for (const code of [SETS.acolyte, SETS.wizardOfTheOrder])
  registerEnemy({
    code,
    // Aparición: cualquier Lugar vacío.
    spawn: emptyLocations,
    forced: (_state, trigger, self) => {
      // Acólito: después de entrar en juego, 1 perdición sobre él.
      if (code === SETS.acolyte && trigger.type === 'enemySpawned' && trigger.enemy === self.id)
        return [{ type: 'PlaceDoomOnEnemy', enemy: self.id, amount: 1 }, { type: 'CheckAgenda' }]
      // Mago de la Orden: al final de la fase de Mitos, 1 perdición sobre él.
      if (code === SETS.wizardOfTheOrder && trigger.type === 'mythosPhaseEnds')
        return [{ type: 'PlaceDoomOnEnemy', enemy: self.id, amount: 1 }, { type: 'CheckAgenda' }]
      return []
    },
  })

const isCultist = (e: { traits?: string[] }) => (e.traits ?? []).includes('Cultist')

registerTreachery({
  code: SETS.mysteriousChanting,
  // 2 perdiciones sobre el Sectario más cercano; sin Sectarios, busca uno en el mazo y la
  // pila de descartes de Encuentros y róbalo (se baraja el mazo).
  revelation: (state, investigator) => {
    const cultists = Object.values(state.enemies).filter(isCultist)
    if (!cultists.length)
      return [{ type: 'ScenarioSpecific', key: 'carcosaFindCultist', data: { investigator } }]
    const here = getInvestigator(state, investigator).location
    const targets = here === null ? cultists : nearest(state, here, cultists)
    const doom = (e: Enemy): Message[] => [
      { type: 'PlaceDoomOnEnemy', enemy: e.id, amount: 2 },
      { type: 'CheckAgenda' },
    ]
    if (targets.length === 1) return doom(targets[0]!)
    return [
      {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseEnemy',
          choices: targets.map((e) => ({
            label: 'choice.enemy',
            params: { enemy: e.name },
            target: { type: 'enemy', id: e.id },
            then: doom(e),
          })),
        },
      },
    ]
  },
})

/** Busca un Sectario en el mazo y los descartes de Encuentros, lo roba y baraja el mazo. */
export function findCultist(state: GameState, investigator: InvestigatorId): GameState {
  const inDeck = state.encounterDeck.findIndex((c) => c.kind === 'enemy' && isCultist(c))
  const inDiscard = state.encounterDiscard.findIndex((c) => c.kind === 'enemy' && isCultist(c))
  const card = inDeck >= 0 ? state.encounterDeck[inDeck] : state.encounterDiscard[inDiscard]
  const rest = state.encounterDeck.filter((_, n) => n !== inDeck)
  const [deck, rng] = shuffle(rest, state.rng)
  return {
    ...state,
    rng,
    encounterDeck: deck,
    encounterDiscard:
      inDeck >= 0
        ? state.encounterDiscard
        : state.encounterDiscard.filter((_, n) => n !== inDiscard),
    queue: [
      ...(card ? [{ type: 'ResolveEncounterCard', investigator, card } as Message] : []),
      ...state.queue,
    ],
  }
}

/** Puerta cerrada con llave: Lugar al que está unida. */
const doorOf = (t: { placement: { type: string; location?: LocationId } }) => attachedTo(t)

registerTreachery({
  code: SETS.lockedDoor,
  // Se une al Lugar en juego con más pistas que no tenga otra Puerta cerrada con llave.
  revelation: (state, investigator, self) => {
    const locked = new Set(
      Object.values(state.treacheries)
        .filter((t) => t.code === SETS.lockedDoor && t.id !== self.id)
        .map(doorOf),
    )
    const free = Object.values(state.locations).filter((l) => !locked.has(l.id))
    if (!free.length) return []
    const most = Math.max(...free.map((l) => l.clues))
    const options = free.filter((l) => l.clues === most)
    const attach = (location: LocationId): Message[] => [
      { type: 'PlaceTreachery', treachery: self.id, placement: { type: 'location', location } },
    ]
    if (options.length === 1) return attach(options[0]!.id)
    return [
      {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseLocation',
          choices: options.map((l) => ({
            label: 'choice.location',
            params: { location: l.name },
            target: { type: 'location', id: l.id },
            then: attach(l.id),
          })),
        },
      },
    ]
  },
  blocksInvestigation: true,
  // [action]: [combat] (4) para derribarla o [agility] (4) para forzar la cerradura.
  abilities: (state, self, investigator) => {
    const location = doorOf(self)
    if (location === null || getInvestigator(state, investigator).location !== location) return []
    return [
      {
        key: `${self.id}:open`,
        label: 'ability.lockedDoor',
        actions: 1,
        provokes: true,
        then: [
          chooseSkillTest(investigator, 'Locked Door', ['combat', 'agility'], 4, {
            onSuccess: [{ type: 'DiscardTreachery', treachery: self.id }],
          }),
        ],
      },
    ]
  },
})
