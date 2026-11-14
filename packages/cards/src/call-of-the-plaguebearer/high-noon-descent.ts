import {
  activeInvestigators,
  canPlayByEffect,
  distancesFrom,
  getInvestigator,
  nextInt,
  playerCardDef,
  push,
  registerAct,
  registerAgenda,
  registerEnemy,
  registerPlayerCard,
  registerPlayerCards,
  registerScenario,
  registerTreachery,
  shroudOf,
  skillTestValue,
  type AbilityOption,
  type CampaignLog,
  type Choice,
  type Difficulty,
  type EncounterCard,
  type GameState,
  type Message,
  type ReactionOption,
  type ScenarioBehavior,
  type ScenarioDefinition,
  type SkillType,
} from '@lcg/engine'
import { AGENTS_OF_YOG } from '../the-dunwich-legacy/remaining-encounters'
import { copies, effectTest, endScenario, recordNote } from '../scenario-helpers'
import { PLAGUEBEARER_CHAOS_BAGS } from './campaign'
import { C, ask, bloodInVeins, chooseLocation, damage, lead, on, run, specific } from './helpers'
import { panicked, supplicant, treacheries, troubleshooter } from './data'
import { D } from './dawn-data'
import { historyLesson } from './history-lesson'
import {
  ALPHA_SUBLABS,
  DELTA_RULES,
  DELTA_SUBLABS,
  DELTA_TRAIT,
  MIASMA_LOCATIONS,
  OMEGA_SUBLEVELS,
  REMEMBER,
  S,
  SUB_LEVEL,
  V,
  crispin,
  directlyBelow,
  fireVampire,
  firstAmongMany,
  isAlpha,
  lifeAndDeath,
  livingFlame,
  noonDeck,
  noonLocations,
  prototype,
  security,
} from './noon-data'

export const HIGH_NOON_DESCENT = 'high-noon-descent'
const hard = (s: GameState) => s.difficulty === 'hard' || s.difficulty === 'expert'
const note = (s: GameState, key: string) => !!s.campaignLog?.notes.includes(key)
const meta = (s: GameState, key: string) => s.scenarioMeta?.[key]
const setMeta = (s: GameState, key: string, value: string | number): GameState => ({
  ...s,
  scenarioMeta: { ...s.scenarioMeta, [key]: value },
})
const act = (s: GameState) => s.acts[s.actIndex]?.code
const alphaId = (s: GameState) => (s.locations[V.alphaKnowledge] ? V.alphaKnowledge : V.alphaBurned)
const at = (s: GameState, id: string) => getInvestigator(s, id).location
const players = (s: GameState) => s.startingInvestigatorCount || s.investigators.length
const AGENTS = 'noonAgents'

/** Enemigos que pueden acabar en la zona de victoria y robarse con el Círculo de invocación. */
const yogEnemies = AGENTS_OF_YOG.filter((c) => c.kind === 'enemy')
const DRAWABLE: EncounterCard[] = [
  fireVampire,
  ...yogEnemies,
  prototype,
  security,
  troubleshooter,
  panicked,
  supplicant,
]

export function highNoonDescent({
  difficulty = 'standard',
  log,
  seed = 1,
}: {
  difficulty?: Difficulty
  log?: CampaignLog
  seed?: number
} = {}): ScenarioDefinition {
  const saved = !!log?.notes.includes('plaguebearerCollection')
  const alpha = saved ? V.alphaKnowledge : V.alphaBurned
  const { start, omega, alphaRow } = noonLocations(alpha, seed)
  const agents = saved ? AGENTS_OF_YOG : [...copies(fireVampire, 2), ...copies(livingFlame, 2)]
  return {
    id: HIGH_NOON_DESCENT,
    intro: { title: 'story.plaguebearer.noon.introTitle', body: 'story.plaguebearer.noon.intro1' },
    setupInstructions: {
      title: 'story.plaguebearer.noon.setupTitle',
      body: saved ? 'story.plaguebearer.noon.setupSaved' : 'story.plaguebearer.noon.setup',
    },
    locations: start,
    setAsideLocations: [...omega, ...alphaRow],
    startingLocation: V.saferoom,
    agendas: [
      { code: V.agendas[0], name: 'Into The Brook', doomThreshold: 5 },
      { code: V.agendas[1], name: 'Tightening Security', doomThreshold: 4 },
      { code: V.agendas[2], name: 'Active Leadership', doomThreshold: 4 },
      { code: V.agendas[3], name: 'Dread Return', doomThreshold: 5 },
    ],
    acts: [
      { code: V.acts[0], name: 'Delta Delving', ...objective },
      { code: V.acts[1], name: 'Omega Occupation', ...objective },
      { code: V.acts[2], name: 'Alpha Assault', ...objective },
    ],
    encounterDeck: [
      ...noonDeck(),
      ...copies(supplicant, 2),
      ...treacheries
        .filter(
          (t) =>
            t.code === C.hands || t.code === C.skin || t.code === C.urge || t.code === C.another,
        )
        .flatMap((t) => copies(t, t.code === C.urge ? 3 : 2)),
      ...lifeAndDeath.flatMap((t) => copies(t, 2)),
    ],
    setAside: [
      crispin,
      firstAmongMany,
      ...copies(security, 2),
      ...copies(troubleshooter, 2),
      ...copies(panicked, 2),
      ...agents,
    ],
    chaosBag: [...PLAGUEBEARER_CHAOS_BAGS[difficulty]],
    tokenValues: { skull: 0, cultist: -4, tablet: -2, elderThing: -3 },
    setup: [
      { type: 'SetScenarioMeta', key: AGENTS, value: saved ? 'yog' : 'cthugha' },
      specific('noon.intro'),
      specific('noon.setup'),
    ],
  }
}
const objective = {
  clueThreshold: 0,
  cluesPerInvestigator: false,
  advanceTiming: 'objective' as const,
}

// ---------------------------------------------------------------------------
// Introducción y preparación
// ---------------------------------------------------------------------------

const story = (key: string): Message => ({
  type: 'Story',
  entry: { title: 'story.plaguebearer.noon.introTitle', body: `story.plaguebearer.noon.${key}` },
})
on('noon.intro', (s) => {
  const respect = note(s, 'plaguebearerRespect')
  const offer = note(s, 'plaguebearerWestLeading') || note(s, 'plaguebearerFirstDead')
  return push(
    s,
    ...(note(s, 'plaguebearerMotel') ? [] : [story('intro2')]),
    story('intro3'),
    ...(respect
      ? [
          story('intro4'),
          recordNote('plaguebearerGreysonCutTies'),
          ...(offer ? [specific('noon.offerGreyson')] : []),
        ]
      : [story('intro5')]),
    story('intro6'),
  )
})
// Introducción 4: un investigador puede añadir a la Agente Greyson (Ya no sigue órdenes).
on('noon.offerGreyson', (s) =>
  ask(
    s,
    lead(s),
    [
      ...s.investigators.map((i): Choice => ({
        label: 'choice.investigator',
        params: { name: i.name },
        target: { type: 'investigator', id: i.id },
        then: [{ type: 'AddStoryAsset', investigator: i.id, code: V.greyson }],
      })),
      { label: 'choice.skip', then: [] },
    ],
    'prompt.plaguebearer.noon.greyson',
  ),
)
const ownsCopy = (s: GameState, id: string, code: string) => {
  const i = getInvestigator(s, id)
  return i.deck.includes(code) || i.hand.includes(code) || i.discard.includes(code)
}
on('noon.setup', (s) => {
  const greyson = note(s, 'plaguebearerGreysonCutTies')
  const steps = (code: string, prompt: string): Message[] => {
    const owners = s.investigators.filter(
      (i) =>
        ownsCopy(s, i.id, code) || !!s.campaignLog?.investigators[i.id]?.storyAssets.includes(code),
    )
    if (owners.length)
      return owners.map((i) => specific('noon.fromDeck', { investigator: i.id, code }))
    return s.investigators.length === 1
      ? [{ type: 'PutAssetIntoPlay', investigator: s.investigators[0]!.id, code, noSlot: true }]
      : [specific('noon.giveAsset', { code, prompt })]
  }
  return push(
    s,
    ...steps(D.west, 'prompt.plaguebearer.noon.west'),
    ...(greyson ? steps(V.greyson, 'prompt.plaguebearer.noon.greysonAlly') : []),
  )
})
on('noon.fromDeck', (s, d) => {
  const by = String(d.investigator),
    code = String(d.code)
  const i = getInvestigator(s, by)
  const without = (cards: string[]) => {
    const index = cards.indexOf(code)
    return index < 0 ? cards : cards.filter((_, n) => n !== index)
  }
  const inHand = i.hand.includes(code)
  return push(
    {
      ...s,
      investigators: s.investigators.map((x) =>
        x.id !== by
          ? x
          : inHand
            ? { ...x, hand: without(x.hand) }
            : { ...x, deck: without(x.deck), discard: without(x.discard) },
      ),
    },
    { type: 'PutAssetIntoPlay', investigator: by, code },
    ...(inHand ? [{ type: 'DrawCards' as const, investigator: by, amount: 1 }] : []),
  )
})
// Alianzas frágiles: el apoyo no ocupa espacios y sale de la partida al terminar.
on('noon.giveAsset', (s, d) =>
  ask(
    s,
    lead(s),
    s.investigators.map((i) => ({
      label: 'choice.investigator',
      params: { name: i.name },
      target: { type: 'investigator' as const, id: i.id },
      then: [{ type: 'PutAssetIntoPlay', investigator: i.id, code: String(d.code), noSlot: true }],
    })),
    String(d.prompt),
  ),
)

// ---------------------------------------------------------------------------
// Conexiones, entrada y velo
// ---------------------------------------------------------------------------

const subLevelsInPlay = (s: GameState) => Object.keys(s.locations).filter((id) => SUB_LEVEL.has(id))
const below = (s: GameState, id: string) =>
  Object.values(s.locations)
    .filter((o) => directlyBelow(s.locations[id]!, o))
    .map((o) => o.id)
const above = (s: GameState, id: string) =>
  Object.values(s.locations)
    .filter((o) => directlyBelow(o, s.locations[id]!))
    .map((o) => o.id)
const topDelta = (s: GameState) =>
  DELTA_SUBLABS.filter((id) => s.locations[id]?.position?.[1] === 2)

export const noonConnections: NonNullable<ScenarioBehavior['connections']> = (s, l) => [
  // Planes: cada Subnivel está conectado (en una dirección) a la Guarida.
  ...(SUB_LEVEL.has(l.id) ? [V.saferoom] : []),
  // Acto 1: cada Subnivel conecta (en una dirección) con cada Lugar directamente debajo.
  ...(SUB_LEVEL.has(l.id) && act(s) === V.acts[0] ? below(s, l.id) : []),
  ...(l.id === V.delta ? topDelta(s) : []),
]
/** El Sub-laboratorio deja bajar a un Subnivel inferior (lo que pide su texto ya se ha hecho). */
const descentOpen = (s: GameState, from: string) => {
  const needs = DELTA_RULES[from]?.needs
  return !needs || !s.locations[from]?.revealed || meta(s, needs) === 1
}
export const noonCanEnter: NonNullable<ScenarioBehavior['canEnter']> = (s, by, from, to) => {
  if (to === V.robison) return reasonAndFaith(s)
  if (to === V.holding && activeInvestigators(s).some((i) => i.id !== by && i.location === to))
    return false
  if (!from || !SUB_LEVEL.has(from) || !SUB_LEVEL.has(to)) return true
  if (directlyBelow(s.locations[from] ?? {}, s.locations[to] ?? {}) && !descentOpen(s, from))
    return false
  // Acto 2: no se puede subir de un Subnivel al Subnivel directamente encima.
  if (act(s) === V.acts[1] && directlyBelow(s.locations[to] ?? {}, s.locations[from] ?? {}))
    return false
  return true
}
const reasonAndFaith = (s: GameState) => meta(s, 'noonReason') === 1 && meta(s, 'noonFaith') === 1
const controlsWest = (s: GameState, id: string) =>
  Object.values(s.assets).some((a) => a.code === D.west && a.owner === id)
export const noonShroud: NonNullable<ScenarioBehavior['shroudModifier']> = (s, l) => {
  if (l.id === V.office) {
    const ups = above(s, l.id)
    const open =
      ups.length === 2 && ups.every((id) => s.locations[id]?.revealed && descentOpen(s, id))
    const west = activeInvestigators(s).some((i) => i.location === l.id && controlsWest(s, i.id))
    return (open ? -3 : 0) + (west ? -2 : 0)
  }
  if (l.id === V.chamber)
    return -subLevelsInPlay(s).filter((id) => id !== l.id && s.locations[id]!.revealed).length
  return 0
}

// ---------------------------------------------------------------------------
// Guarida, Laboratorios y Subniveles
// ---------------------------------------------------------------------------

/** Guarida: un enemigo que fuese a entrar deja de estar enfrentado y va a un Lugar conectado. */
on('noon.expel', (s, d) => {
  const e = s.enemies[String(d.enemy)]
  if (!e || e.location !== V.saferoom) return s
  const targets = s.locations[V.saferoom]!.connections.filter((id) => s.locations[id])
  const move = (id: string): Message[] => [
    { type: 'DisengageEnemy', enemy: e.id },
    { type: 'MoveEnemy', enemy: e.id, location: id },
  ]
  if (targets.length <= 1) return targets[0] ? push(s, ...move(targets[0])) : s
  return chooseLocation(s, lead(s), targets, move)
})
const expelAll = (s: GameState): Message[] =>
  Object.values(s.enemies)
    .filter((e) => e.location === V.saferoom)
    .map((e) => specific('noon.expel', { enemy: e.id }))

/** Recompensas de entrar en cada Sub-laboratorio (sus [reaction]). */
function enterReactions(s: GameState, by: string, location: string): ReactionOption[] {
  const option = (key: string, then: Message[]): ReactionOption => ({
    key: `noon:${key}:${location}`,
    investigator: by,
    label: `ability.plaguebearer.noon.${key}`,
    target: { type: 'location', id: location },
    then,
  })
  const i = getInvestigator(s, by)
  if (location === V.saferoom && i.clues > 0) {
    const withClues = Object.values(s.locations).filter((l) => l.revealed && l.clues > 0)
    return withClues.length
      ? [
          option('saferoom', [
            { type: 'SpendClues', investigator: by, amount: 1 },
            specific('noon.returnClue', { investigator: by }),
          ]),
        ]
      : []
  }
  if (isAlpha(location)) {
    const hidden = subLevelsInPlay(s).filter((id) => !s.locations[id]!.revealed)
    return hidden.length
      ? [
          option(location === V.alphaKnowledge ? 'alphaHorror' : 'alphaDamage', [
            location === V.alphaKnowledge ? damage(by, 0, 1) : damage(by, 1),
            specific('noon.revealSubLevel', { investigator: by }),
          ]),
        ]
      : []
  }
  if (location === V.autopsy)
    return [option('autopsy', [specific('noon.autopsy', { investigator: by })])]
  if (location === V.cold) {
    const cards = i.hand.filter((c) =>
      canPlayByEffect(s, by, c, 'hand', false, 0, false, true, true),
    )
    return cards.length ? [option('cold', [specific('noon.cold', { investigator: by })])] : []
  }
  if (location === V.hall)
    return [
      option('hall', [
        { type: 'DrawCards', investigator: by, amount: 1 },
        { type: 'GainResources', investigator: by, amount: 1 },
      ]),
    ]
  if (location === V.serum)
    return [
      option('serum', [{ type: 'NextTestBonus', investigator: by, amount: 2, thisRound: true }]),
    ]
  return []
}
on('noon.returnClue', (s, d) =>
  chooseLocation(
    s,
    String(d.investigator),
    Object.values(s.locations)
      .filter((l) => l.revealed && l.clues > 0)
      .map((l) => l.id),
    (id) => [specific('noon.removeClue', { location: id })],
  ),
)
on('noon.removeClue', (s, d) => {
  const l = s.locations[String(d.location)]
  return l && l.clues > 0
    ? { ...s, locations: { ...s.locations, [l.id]: { ...l, clues: l.clues - 1 } } }
    : s
})
on('noon.revealSubLevel', (s, d) =>
  chooseLocation(
    s,
    String(d.investigator),
    subLevelsInPlay(s).filter((id) => !s.locations[id]!.revealed),
    (id) => [{ type: 'RevealLocation', location: id, investigator: String(d.investigator) }],
  ),
)
// Sala de autopsias: investiga; si tienes éxito, la pista puede salir de cualquier Lugar revelado.
on('noon.autopsy', (s, d) => {
  const by = String(d.investigator)
  if (at(s, by) !== V.autopsy) return s
  return push(s, {
    type: 'BeginSkillTest',
    investigator: by,
    skill: 'intellect',
    difficulty: shroudOf(s, V.autopsy),
    modifier: 0,
    source: V.autopsy,
    kind: {
      type: 'investigate',
      location: V.autopsy,
      extraClues: -1,
      onSuccess: [specific('noon.autopsyClue', { investigator: by })],
    },
  } as Message)
})
on('noon.autopsyClue', (s, d) => {
  const by = String(d.investigator)
  const ids = Object.values(s.locations)
    .filter((l) => l.revealed && l.clues > 0)
    .map((l) => l.id)
  return chooseLocation(s, by, ids, (id) => [
    { type: 'DiscoverClues', investigator: by, amount: 1, location: id },
  ])
})
// Despensa: juega una carta de tu mano.
on('noon.cold', (s, d) => {
  const by = String(d.investigator)
  const cards = [
    ...new Set(
      getInvestigator(s, by).hand.filter((c) =>
        canPlayByEffect(s, by, c, 'hand', false, 0, false, true, true),
      ),
    ),
  ]
  return ask(
    s,
    by,
    [
      ...cards.map((code): Choice => ({
        label: 'ability.playCard',
        params: { card: playerCardDef(code)?.name ?? code },
        target: { type: 'hand', code },
        then: [{ type: 'PlayCard', investigator: by, code, asFast: true }],
      })),
      { label: 'choice.skip', then: [] },
    ],
    'prompt.plaguebearer.noon.cold',
  )
})

/** Al empezar el turno en un Lugar Miasma del ala Omega. */
function startOfTurn(s: GameState, by: string): Message[] {
  const here = at(s, by)
  if (here === V.omega)
    return [
      specific('noon.choose', {
        investigator: by,
        prompt: 'prompt.plaguebearer.noon.omega',
        a: 'damage',
        b: 'terror',
      }),
    ]
  if (here === V.leftArtery)
    return [{ type: 'TakeDamage', investigator: by, damage: 0, horror: 1, direct: true }]
  if (here === V.rightArtery)
    return [{ type: 'TakeDamage', investigator: by, damage: 1, horror: 0, direct: true }]
  if (here === V.leftVentricle)
    return [
      specific('noon.choose', {
        investigator: by,
        prompt: 'prompt.plaguebearer.noon.leftVentricle',
        a: 'noPlay',
        b: 'leftCrest',
      }),
    ]
  if (here === V.rightVentricle)
    return [
      specific('noon.choose', {
        investigator: by,
        prompt: 'prompt.plaguebearer.noon.rightVentricle',
        a: 'noDamage',
        b: 'rightCrest',
      }),
    ]
  return []
}
const OPTION: Record<string, (s: GameState, by: string) => Message[]> = {
  damage: (_s, by) => [damage(by, 1)],
  terror: (_s, by) => [specific('plaguebearer.discardTerror', { investigator: by })],
  noPlay: (s, by) => [{ type: 'SetScenarioMeta', key: `noonNoPlay:${by}`, value: s.round }],
  noDamage: (s, by) => [{ type: 'SetScenarioMeta', key: `noonNoDamage:${by}`, value: s.round }],
  leftCrest: () => [specific('noon.crestStep', { code: V.leftCrest, toward: V.leftVentricle })],
  rightCrest: () => [specific('noon.crestStep', { code: V.rightCrest, toward: V.rightVentricle })],
}
on('noon.choose', (s, d) => {
  const by = String(d.investigator)
  return ask(
    s,
    by,
    [String(d.a), String(d.b)].map((key) => ({
      label: `choice.plaguebearer.noon.${key}`,
      then: OPTION[key]!(s, by),
    })),
    String(d.prompt),
  )
})

/** Lugares descubiertos con la última pista: lo que «recuerdas». */
function discoverForced(
  s: GameState,
  t: Extract<
    Parameters<NonNullable<ScenarioBehavior['forced']>>[1],
    { type: 'afterDiscoverClues' }
  >,
): Message[] {
  const out: Message[] = []
  const gives = DELTA_RULES[t.location]?.gives
  if (gives && t.last && meta(s, gives) !== 1)
    out.push({ type: 'SetScenarioMeta', key: gives, value: 1 })
  if (t.location === V.exaltation && (t.amount ?? 1) > 0)
    out.push(damage(t.investigator, 0, t.amount ?? 1))
  return out
}

// ---------------------------------------------------------------------------
// Blasones (acto 2)
// ---------------------------------------------------------------------------

const crestOf = (s: GameState, code: string) =>
  Object.values(s.placedAssets ?? {}).find((p) => p.code === code)
const crestAt = (s: GameState, code: string) => {
  const p = crestOf(s, code)
  return p?.placement.type === 'location' ? p.placement.location : null
}
/** Paso de un Blasón hacia un Ventrículo, por el camino más corto. */
on('noon.crestStep', (s, d) => {
  const code = String(d.code),
    toward = String(d.toward)
  const p = crestOf(s, code),
    from = crestAt(s, code)
  if (!p || !from || from === toward || !s.locations[toward]) return s
  const neighbours = [
    ...new Set([
      ...s.locations[from]!.connections,
      ...Object.values(s.locations)
        .filter((l) => l.connections.includes(from))
        .map((l) => l.id),
    ]),
  ]
  const distance = (id: string) =>
    id === toward ? 0 : (distancesFrom(s, id).get(toward) ?? Infinity)
  const best = Math.min(...neighbours.map(distance))
  const next = neighbours.find((id) => distance(id) === best && Number.isFinite(best))
  if (!next) return s
  return push(
    s,
    { type: 'MovePlacedAsset', placed: p.id, placement: { type: 'location', location: next } },
    ...(d.again
      ? [specific('noon.crestAgain', { code, location: next, investigator: String(d.again) })]
      : []),
  )
})
on('noon.crestAgain', (s, d) => {
  const l = s.locations[String(d.location)]
  if (!l || !l.revealed || l.clues > 0) return s
  const by = String(d.investigator)
  return ask(
    s,
    by,
    [
      {
        label: 'choice.plaguebearer.noon.crestAgain',
        then: [specific('noon.crestTest', { code: String(d.code), investigator: by })],
      },
      { label: 'choice.skip', then: [] },
    ],
    'prompt.plaguebearer.noon.crestAgain',
  )
})
const CREST: Record<string, { skills: SkillType[]; toward: string }> = {
  [V.leftCrest]: { skills: ['willpower', 'intellect'], toward: V.rightVentricle },
  [V.rightCrest]: { skills: ['combat', 'agility'], toward: V.leftVentricle },
}
on('noon.crestTest', (s, d) => {
  const code = String(d.code),
    by = String(d.investigator)
  const where = crestAt(s, code)
  if (!where) return s
  const x = 3 * (s.locations[where]?.clues ?? 0)
  const { skills, toward } = CREST[code]!
  return ask(
    s,
    by,
    skills.map((skill) => ({
      label: `choice.plaguebearer.noon.skill.${skill}`,
      then: [
        effectTest(by, code, skill, x, {
          onSuccess: [specific('noon.crestStep', { code, toward, again: by })],
        }),
      ],
    })),
    'prompt.plaguebearer.noon.crestSkill',
  )
})
for (const code of [V.leftCrest, V.rightCrest])
  registerPlayerCard({
    code,
    placedAbilities: (s, p, by): AbilityOption[] =>
      p.placement.type === 'location' && at(s, by) === p.placement.location
        ? [
            {
              key: `${p.id}:crest`,
              label: 'ability.plaguebearer.noon.crest',
              actions: 0,
              provokes: false,
              target: { type: 'location', id: p.placement.location },
              then: [specific('noon.crestTest', { code, investigator: by })],
            },
          ]
        : [],
  })

// ---------------------------------------------------------------------------
// Ala Alfa: Razón, Fe y Círculo de invocación
// ---------------------------------------------------------------------------

on('noon.mark', (s, d) => {
  const key = String(d.key),
    alpha = alphaId(s),
    l = s.locations[alpha]
  if (meta(s, key) === 1) return s
  const next = setMeta(s, key, 1)
  return l
    ? {
        ...next,
        locations: { ...next.locations, [alpha]: { ...l, resources: (l.resources ?? 0) + 1 } },
      }
    : next
})
const groupHere = (s: GameState, location: string) =>
  activeInvestigators(s).filter((i) => i.location === location)
function groupAbility(
  s: GameState,
  by: string,
  location: string,
  key: 'reason' | 'faith',
  count: number,
  actions: number,
): AbilityOption[] {
  if (at(s, by) !== location || meta(s, key === 'reason' ? 'noonReason' : 'noonFaith') === 1)
    return []
  const here = groupHere(s, location)
  const amount = count * players(s)
  if (here.reduce((sum, i) => sum + i.clues, 0) < amount) return []
  return [
    {
      key: `noon:${key}`,
      label: `ability.plaguebearer.noon.${key}`,
      params: { amount },
      actions,
      provokes: actions > 0,
      ...(key === 'reason' ? { limit: { per: 'game' as const, group: true } } : {}),
      target: { type: 'location', id: location },
      then: [
        ...(amount > 0
          ? [{ type: 'PayGroupClues' as const, amount, from: here.map((i) => i.id) }]
          : []),
        specific('noon.mark', { key: key === 'reason' ? 'noonReason' : 'noonFaith' }),
      ],
    },
  ]
}
on('noon.summon', (s, d) => {
  const by = String(d.investigator),
    code = String(d.code)
  const index = s.victoryDisplay.indexOf(code)
  const card = DRAWABLE.find((c) => c.code === code)
  if (index < 0 || !card) return s
  const clues = s.locations[V.summoning]?.clues ?? 0
  return push(
    { ...s, victoryDisplay: s.victoryDisplay.filter((_, n) => n !== index) },
    { type: 'ResolveEncounterCard', investigator: by, card: { ...card } },
    ...(clues
      ? [{ type: 'DiscoverClues' as const, investigator: by, amount: clues, location: V.summoning }]
      : []),
    { type: 'MoveTo', investigator: by, location: alphaId(s) },
  )
})

function scenarioAbilities(s: GameState, by: string): AbilityOption[] {
  const here = at(s, by)
  if (!here) return []
  const out: AbilityOption[] = []
  // Actos: [free] durante tu turno, gasta 1 pista: muévete a un Lugar conectado (una vez por ronda).
  if (s.activeTurn === by && getInvestigator(s, by).clues > 0) {
    const targets = s.locations[here]!.connections.filter((id) => s.locations[id])
    if (targets.length)
      out.push({
        key: 'noon:actMove',
        label: 'ability.plaguebearer.noon.actMove',
        actions: 0,
        provokes: false,
        limit: { per: 'round' },
        costs: [{ type: 'SpendClues', investigator: by, amount: 1 }],
        then: [specific('noon.actMove', { investigator: by })],
      })
  }
  if (here === V.hall && meta(s, REMEMBER.breakers) !== 1) {
    const cost = players(s)
    if (getInvestigator(s, by).resources >= cost)
      out.push({
        key: 'noon:breakers',
        label: 'ability.plaguebearer.noon.breakers',
        params: { amount: cost },
        actions: 1,
        provokes: true,
        target: { type: 'location', id: here },
        costs: [{ type: 'SpendResources', investigator: by, amount: cost }],
        then: [{ type: 'SetScenarioMeta', key: REMEMBER.breakers, value: 1 }],
      })
  }
  if (here === V.catalyst && s.locations[here]?.revealed)
    out.push(
      ...groupAbility(
        s,
        by,
        here,
        'reason',
        subLevelsInPlay(s).filter((id) => !s.locations[id]!.revealed).length,
        1,
      ),
    )
  if (here === V.stabilization && s.locations[here]?.revealed)
    out.push(
      ...groupAbility(
        s,
        by,
        here,
        'faith',
        subLevelsInPlay(s).filter((id) => s.locations[id]!.clues > 0).length,
        0,
      ),
    )
  if (here === V.summoning && s.locations[here]?.revealed) {
    const codes = [
      ...new Set(
        s.victoryDisplay.filter((c) =>
          DRAWABLE.some((e) => e.code === c && !e.traits?.includes('Elite')),
        ),
      ),
    ]
    for (const code of codes)
      out.push({
        key: `noon:summon:${code}`,
        label: 'ability.plaguebearer.noon.summon',
        params: { enemy: DRAWABLE.find((e) => e.code === code)!.name },
        actions: 0,
        provokes: false,
        target: { type: 'location', id: here },
        then: [specific('noon.summon', { investigator: by, code })],
      })
  }
  return out
}
on('noon.actMove', (s, d) => {
  const by = String(d.investigator),
    here = at(s, by)
  if (!here) return s
  return chooseLocation(
    s,
    by,
    s.locations[here]!.connections.filter((id) => s.locations[id]),
    (id) => [{ type: 'MoveTo', investigator: by, location: id }],
  )
})

// ---------------------------------------------------------------------------
// Fichas del caos
// ---------------------------------------------------------------------------

const heeded = (s: GameState, id: string) => {
  try {
    return (JSON.parse(s.campaignLog?.values.plaguebearerHeeded ?? '[]') as string[]).includes(id)
  } catch {
    return false
  }
}
const failedBy = (s: GameState) =>
  s.skillTest
    ? Math.max(
        1,
        s.skillTest.difficulty -
          (skillTestValue(s).total +
            (s.skillTest.tokenModifier ?? 0) +
            (s.skillTest.successMarginModifier ?? 0)),
      )
    : 1
on('noon.elderThing', (s, d) => {
  const times = d.perPoint ? failedBy(s) : 1
  const each = activeInvestigators(s).filter((i) => heeded(s, i.id))
  return push(
    s,
    ...Array.from({ length: times }, () =>
      each.map((i) => specific('noon.clueOrHorror', { investigator: i.id })),
    ).flat(),
  )
})
on('noon.clueOrHorror', (s, d) => {
  const by = String(d.investigator)
  if (getInvestigator(s, by).clues < 1) return push(s, damage(by, 0, 1))
  return ask(
    s,
    by,
    [
      {
        label: 'choice.plaguebearer.noon.spendClue',
        then: [{ type: 'SpendClues', investigator: by, amount: 1 }],
      },
      { label: 'choice.plaguebearer.noon.takeHorror', then: [damage(by, 0, 1)] },
    ],
    'prompt.plaguebearer.noon.elderThing',
  )
})
const noonTokens: NonNullable<ScenarioBehavior['tokenEffect']> = (s, token, by) => {
  if (token === 'skull') {
    const here = at(s, by)
    const distance = here ? (distancesFrom(s, here).get(V.saferoom) ?? 0) : 0
    return { modifier: -(Number.isFinite(distance) ? distance : 0) - (hard(s) ? 2 : 0) }
  }
  if (token === 'cultist' && bloodInVeins(s)) return { modifier: 0, autoFail: true }
  if (token === 'cultist')
    return {
      modifier: hard(s) ? -5 : -4,
      onSuccess: [specific('noon.cultistMove', { investigator: by })],
    }
  if (token === 'tablet') {
    const here = at(s, by)
    return {
      modifier: hard(s) ? -4 : -2,
      onFail: here ? [{ type: 'PlaceCluesOnLocationFromPool', location: here, amount: 1 }] : [],
    }
  }
  if (token === 'elderThing')
    return { modifier: -3, onFail: [specific('noon.elderThing', { perPoint: hard(s) })] }
  throw new Error(`High Noon Descent: token ${token} is not implemented`)
}
on('noon.cultistMove', (s, d) => {
  const by = String(d.investigator),
    here = at(s, by)
  if (!here) return s
  return chooseLocation(
    s,
    by,
    s.locations[here]!.connections.filter((id) => s.locations[id]),
    (id) => [{ type: 'MoveTo', investigator: by, location: id }],
    true,
  )
})

// ---------------------------------------------------------------------------
// Forzados y reacciones del escenario
// ---------------------------------------------------------------------------

function noonForced(
  s: GameState,
  t: Parameters<NonNullable<ScenarioBehavior['forced']>>[1],
): Message[] {
  switch (t.type) {
    case 'enemyEntersLocation':
    case 'enemySpawned':
      return t.location === V.saferoom ? [specific('noon.expel', { enemy: t.enemy })] : []
    case 'afterMove':
      return at(s, t.investigator) === V.saferoom ? expelAll(s) : []
    case 'turnBegins':
      return startOfTurn(s, t.investigator)
    case 'afterDiscoverClues':
      return discoverForced(s, t)
    case 'afterRevealLocation': {
      const first = Object.values(s.enemies).find((e) => e.code === V.first)
      return first && first.location !== t.location
        ? [
            { type: 'ReadyEnemy', enemy: first.id },
            { type: 'MoveEnemy', enemy: first.id, location: t.location },
          ]
        : first
          ? [{ type: 'ReadyEnemy', enemy: first.id }]
          : []
    }
    case 'whenEncounterDrawn':
      return s.agendaIndex >= 1 && meta(s, 'noonAgencyRound') !== s.round
        ? [specific('noon.agencyDraw', { draw: t.draw })]
        : []
    case 'enemyExhausted': {
      const e = s.enemies[t.enemy]
      return e?.code === V.prototype
        ? [{ type: 'DamageEnemy', enemy: e.id, amount: 1, source: { encounter: true } } as Message]
        : []
    }
    case 'roundEnds': {
      const out: Message[] = []
      const alpha = s.locations[alphaId(s)]
      const target = players(s)
      if (alpha && alpha.revealed && alpha.clues < target)
        out.push({
          type: 'PlaceCluesOnLocationFromPool',
          location: alpha.id,
          amount: target - alpha.clues,
        })
      if (
        act(s) === V.acts[0] &&
        s.locations[V.office]?.revealed &&
        s.locations[V.office]!.clues === 0 &&
        activeInvestigators(s).some((i) => i.location === V.office)
      )
        out.push({ type: 'AdvanceAct' })
      return out
    }
    default:
      return []
  }
}
// Planes 2–4: el primer enemigo Agencia robado cada ronda gana Oleada y entra con 1 daño.
on('noon.agencyDraw', (s, d) => {
  const index = s.queue.findIndex(
    (m) => m.type === 'ResolveEncounterCard' && m.draw?.id === String(d.draw),
  )
  const m = s.queue[index]
  if (!m || m.type !== 'ResolveEncounterCard' || m.card.kind !== 'enemy') return s
  if (!m.card.traits?.includes('Agency')) return s
  const queue = [...s.queue]
  queue[index] = {
    ...m,
    card: { ...m.card, keywords: [...new Set([...m.card.keywords, 'surge' as const])] },
  }
  return setMeta(
    setMeta({ ...s, queue }, 'noonAgencyRound', s.round),
    'noonAgencyDamage',
    m.card.code,
  )
})
on('noon.agencyDamage', (s, d) => {
  const e = s.enemies[String(d.enemy)]
  if (!e) return s
  return setMeta(
    { ...s, enemies: { ...s.enemies, [e.id]: { ...e, damageTaken: e.damageTaken + 1 } } },
    'noonAgencyDamage',
    '',
  )
})

function noonReactions(
  s: GameState,
  t: Parameters<NonNullable<ScenarioBehavior['reactions']>>[1],
): ReactionOption[] {
  if (t.type === 'afterMove') {
    const here = at(s, t.investigator)
    return here ? enterReactions(s, t.investigator, here) : []
  }
  if (t.type === 'enemyEntersLocation' && t.location === V.delta) {
    const e = s.enemies[t.enemy]
    if (!e || e.exhausted || !(e.traits ?? []).some((x) => x === 'Re-Animated' || x === 'Infected'))
      return []
    return activeInvestigators(s)
      .filter((i) => i.location === V.delta)
      .map((i) => ({
        key: `noon:delta:${e.id}`,
        investigator: i.id,
        label: 'ability.plaguebearer.noon.delta',
        params: { enemy: e.name },
        target: { type: 'location' as const, id: V.delta },
        then: [{ type: 'ExhaustEnemy', enemy: e.id } as Message],
      }))
  }
  return []
}

// ---------------------------------------------------------------------------
// Planes y actos
// ---------------------------------------------------------------------------

const agendaStory = (n: number, extra?: string): Message => ({
  type: 'Story',
  entry: {
    title: `story.plaguebearer.noon.agenda${n}bTitle`,
    body: `story.plaguebearer.noon.agenda${n}b${extra ?? ''}`,
  },
})
registerAgenda({
  code: V.agendas[0],
  onAdvance: () => [
    agendaStory(1),
    { type: 'ShuffleSetAsideIntoEncounter', codes: [C.troubleshooter, C.panicked, V.security] },
  ],
})
registerAgenda({
  code: V.agendas[1],
  onAdvance: (s) => {
    const westGone =
      Object.values(s.assets).some((a) => a.code === D.west) || note(s, 'plaguebearerWestReagent')
    return [
      agendaStory(2),
      { type: 'SpawnSetAsideEnemy', code: V.crispin, location: alphaId(s) },
      specific('noon.crispinDamage'),
      ...(westGone ? [agendaStory(2, 'West'), specific('noon.removeWest')] : []),
    ]
  },
})
on('noon.crispinDamage', (s) => {
  const e = Object.values(s.enemies).find((x) => x.code === V.crispin)
  if (!e) return s
  const missing = ['plaguebearerRespect', 'plaguebearerFirstDead'].filter((k) => !note(s, k)).length
  const amount = missing * players(s)
  return amount
    ? { ...s, enemies: { ...s.enemies, [e.id]: { ...e, damageTaken: e.damageTaken + amount } } }
    : s
})
// Herbert West desaparece durante el resto de la campaña.
on('noon.removeWest', (s) => {
  const strip = (cards: string[]) => cards.filter((c) => c !== D.west)
  const log = s.campaignLog
  return push(
    {
      ...s,
      investigators: s.investigators.map((i) => ({
        ...i,
        deck: strip(i.deck),
        hand: strip(i.hand),
        discard: strip(i.discard),
      })),
      ...(log
        ? {
            campaignLog: {
              ...log,
              investigators: Object.fromEntries(
                Object.entries(log.investigators).map(([id, x]) => [
                  id,
                  { ...x, storyAssets: x.storyAssets.filter((c) => c !== D.west) },
                ]),
              ),
            },
          }
        : {}),
    },
    ...Object.values(s.assets)
      .filter((a) => a.code === D.west)
      .map((a): Message => ({ type: 'RemoveAssetFromGame', asset: a.id })),
  )
})
registerAgenda({
  code: V.agendas[2],
  onAdvance: (s) => [
    agendaStory(3),
    { type: 'SpawnSetAsideEnemy', code: V.first, location: alphaId(s) },
  ],
})
registerAgenda({
  code: V.agendas[3],
  onAdvance: (s) => [
    agendaStory(4),
    ...activeInvestigators(s).flatMap((i): Message[] => [
      { type: 'SufferTrauma', investigator: i.id, physical: 1 },
      { type: 'DefeatInvestigator', investigator: i.id },
    ]),
  ],
})

const actStory = (key: string): Message => ({
  type: 'Story',
  entry: { title: `story.plaguebearer.noon.${key}Title`, body: `story.plaguebearer.noon.${key}` },
})
registerAct({
  code: V.acts[0],
  objectiveMet: () => false,
  onAdvance: (s) => [
    ...(Object.values(s.assets).some((a) => a.code === C.briefcase)
      ? [actStory('act1bBriefcase')]
      : []),
    actStory('act1b'),
    ...activeInvestigators(s).map((i): Message => ({
      type: 'MoveTo',
      investigator: i.id,
      location: V.saferoom,
      unpreventable: true,
    })),
    specific('noon.clearWing', { wing: 'delta' }),
    ...OMEGA_SUBLEVELS.map((location): Message => ({ type: 'PutLocationIntoPlay', location })),
    {
      type: 'PlaceAsset',
      code: V.leftCrest,
      name: 'The Left Crest',
      placement: { type: 'location', location: V.leftVentricle },
    },
    {
      type: 'PlaceAsset',
      code: V.rightCrest,
      name: 'The Right Crest',
      placement: { type: 'location', location: V.rightVentricle },
    },
  ],
})
/** Retira un ala: descarta enemigos (Delta) o los lleva al Laboratorio Omega (Miasma). */
on('noon.clearWing', (s, d) => {
  const delta = d.wing === 'delta'
  const ids = delta
    ? Object.keys(s.locations).filter((id) => DELTA_TRAIT.has(id) && id !== V.delta)
    : Object.keys(s.locations).filter((id) => MIASMA_LOCATIONS.has(id) && id !== V.omega)
  const enemies = Object.values(s.enemies).filter((e) => ids.includes(e.location))
  return push(
    s,
    ...enemies.map((e): Message =>
      delta
        ? { type: 'DiscardEnemy', enemy: e.id }
        : { type: 'MoveEnemy', enemy: e.id, location: V.omega },
    ),
    ...ids.map((location): Message => ({ type: 'RemoveLocation', location })),
  )
})
registerAct({
  code: V.acts[1],
  objectiveMet: (s) => {
    const l = crestAt(s, V.leftCrest)
    return !!l && l === crestAt(s, V.rightCrest)
  },
  onAdvance: (s) => [
    actStory('act2b'),
    ...activeInvestigators(s).map((i): Message => ({
      type: 'MoveTo',
      investigator: i.id,
      location: alphaId(s),
      unpreventable: true,
    })),
    specific('noon.clearWing', { wing: 'omega' }),
    ...[...ALPHA_SUBLABS, V.robison].map((location): Message => ({
      type: 'PutLocationIntoPlay',
      location,
    })),
    specific('noon.spawnAgent'),
  ],
})
// Acto 2b: un enemigo de Agentes de Cthugha o de Yog-Sothoth en un Sub-laboratorio Alfa al azar.
on('noon.spawnAgent', (s) => {
  const aside = s.setAside.filter(
    (c) =>
      c.kind === 'enemy' && (c.code === S.fireVampire || yogEnemies.some((y) => y.code === c.code)),
  )
  const rest = s.setAside.filter(
    (c) =>
      c.code === S.fireVampire ||
      c.code === S.livingFlame ||
      AGENTS_OF_YOG.some((y) => y.code === c.code),
  )
  const hidden = ALPHA_SUBLABS.filter((id) => s.locations[id] && !s.locations[id]!.revealed)
  const enemy = aside[0]
  const [index, rng] = nextInt(s.rng, Math.max(1, hidden.length))
  const location = hidden[index]
  const others = rest.filter((c) => c !== enemy).map((c) => c.code)
  return push(
    { ...s, rng },
    ...(enemy && location
      ? [{ type: 'SpawnSetAsideEnemy' as const, code: enemy.code, location }]
      : []),
    ...(others.length
      ? [{ type: 'ShuffleSetAsideIntoEncounter' as const, codes: [...new Set(others)] }]
      : []),
  )
})
registerAct({
  code: V.acts[2],
  objectiveMet: (s) => {
    const active = activeInvestigators(s)
    return active.length > 0 && active.every((i) => i.location === V.robison)
  },
  onAdvance: () => [
    actStory('act3b'),
    { type: 'EndScenario', outcome: { type: 'resolution', resolution: 2 } },
  ],
})

// ---------------------------------------------------------------------------
// Encuentros
// ---------------------------------------------------------------------------

registerEnemy({
  code: V.crispin,
  abilities: (s, e, by) =>
    at(s, by) === e.location
      ? [
          {
            key: `${e.id}:parley`,
            label: 'ability.plaguebearer.noon.parley',
            actions: 0,
            provokes: false,
            parley: true,
            then: [
              { type: 'EnemyAttack', enemy: e.id, investigator: by, exhaustAfter: false },
              { type: 'DisengageEnemy', enemy: e.id },
              { type: 'SetScenarioMeta', key: `noonParley:${by}`, value: s.round },
            ],
          },
        ]
      : [],
})
registerEnemy({
  code: V.security,
  forced: (s, t, e) => {
    if (t.type !== 'afterEngage' || t.enemy !== e.id) return []
    const here = e.location
    const others = Object.values(s.enemies).filter(
      (x) => x.location === here && !(x.traits ?? []).includes('Agency'),
    )
    if (!others.length) return []
    return [
      ...Object.values(s.enemies)
        .filter((x) => x.location === here)
        .map(
          (x): Message =>
            ({
              type: 'DamageEnemy',
              enemy: x.id,
              amount: 1,
              source: { encounter: true },
            }) as Message,
        ),
      ...activeInvestigators(s)
        .filter((i) => i.location === here)
        .map((i) => damage(i.id, 1)),
      { type: 'EvadeEnemy', enemy: e.id, by: t.investigator },
      { type: 'MoveTo', investigator: t.investigator, location: V.saferoom },
    ]
  },
})
registerEnemy({
  code: S.fireVampire,
  forced: (s, t, e) =>
    t.type === 'whenEnemyAttacks' && t.enemy === e.id && s.phase === 'enemy'
      ? [specific('noon.discardAsset', { investigator: t.investigator })]
      : [],
})
on('noon.discardAsset', (s, d) => {
  const by = String(d.investigator)
  const owned = Object.values(s.assets).filter((a) => a.owner === by)
  return ask(
    s,
    by,
    owned.map((a) => ({
      label: 'choice.plaguebearer.noon.discard',
      params: { card: playerCardDef(a.code)?.name ?? a.code },
      target: { type: 'asset' as const, id: a.id },
      then: [{ type: 'DiscardAsset', asset: a.id } as Message],
    })),
    'prompt.plaguebearer.noon.discardAsset',
  )
})

const discard = (id: string): Message => ({ type: 'DiscardTreachery', treachery: id })
const threat = (id: string, investigator: string): Message => ({
  type: 'PlaceTreachery',
  treachery: id,
  placement: { type: 'threatArea', investigator },
})
registerTreachery({
  code: V.cover,
  revelation: (_s, by, self) => [threat(self.id, by)],
  forced: (s, t, self) =>
    t.type === 'roundEnds' && self.placement.type === 'threatArea'
      ? [
          ...(at(s, self.placement.investigator) !== V.saferoom
            ? [{ type: 'PlaceDoom' as const, amount: 1 }]
            : []),
          discard(self.id),
        ]
      : [],
})
const STRATEGIES = [V.caution, V.completionist] as const
for (const code of STRATEGIES)
  registerTreachery({
    code,
    revelation: (s, _by, self) =>
      Object.values(s.treacheries).some(
        (t) =>
          t.id !== self.id && STRATEGIES.includes(t.code as never) && t.placement.type !== 'limbo',
      )
        ? [discard(self.id), { type: 'GainSurge' }]
        : [{ type: 'PlaceTreachery', treachery: self.id, placement: { type: 'agenda' } }],
    beforeMove: (s, self, move) => {
      if (self.placement.type !== 'agenda') return null
      const from = at(s, move.investigator)
      const extra =
        code === V.caution
          ? SUB_LEVEL.has(move.location) && !s.locations[move.location]?.revealed
          : !!from && SUB_LEVEL.has(from) && (s.locations[from]?.clues ?? 0) > 0
      return extra && s.activeTurn === move.investigator
        ? [{ type: 'SpendAdditionalAction', investigator: move.investigator, then: [move] }]
        : null
    },
    forced: (_s, t, self) =>
      t.type === 'roundEnds' && self.placement.type === 'agenda' ? [discard(self.id)] : [],
  })
registerTreachery({
  code: V.taphephobia,
  revelation: (_s, by, self) => [
    effectTest(by, V.taphephobia, 'willpower', 3, { onFail: [threat(self.id, by)] }),
  ],
  forced: (s, t, self) => {
    if (t.type !== 'afterMove' || self.placement.type !== 'threatArea') return []
    if (t.investigator !== self.placement.investigator) return []
    const here = at(s, t.investigator)
    const key = `noonTapho:${self.id}`
    return here && SUB_LEVEL.has(here) && meta(s, key) !== s.round
      ? [{ type: 'SetScenarioMeta', key, value: s.round }, damage(t.investigator, 0, 1)]
      : []
  },
  abilities: (s, self, by) =>
    self.placement.type === 'threatArea' &&
    self.placement.investigator === by &&
    at(s, by) === V.saferoom
      ? [
          {
            key: `${self.id}:discard`,
            label: 'ability.plaguebearer.noon.taphephobia',
            actions: 0,
            provokes: false,
            then: [discard(self.id)],
          },
        ]
      : [],
})
registerTreachery({
  code: S.livingFlame,
  revelation: (s, by) => {
    const owned = Object.values(s.assets).filter((a) => a.owner === by)
    const top = Math.max(-1, ...owned.map((a) => playerCardDef(a.code)?.cost ?? 0))
    const highest = owned.filter((a) => (playerCardDef(a.code)?.cost ?? 0) === top)
    return highest.length ? [specific('noon.livingFlame', { investigator: by })] : []
  },
})
on('noon.livingFlame', (s, d) => {
  const by = String(d.investigator)
  const owned = Object.values(s.assets).filter((a) => a.owner === by)
  const top = Math.max(-1, ...owned.map((a) => playerCardDef(a.code)?.cost ?? 0))
  const highest = owned.filter((a) => (playerCardDef(a.code)?.cost ?? 0) === top)
  return ask(
    s,
    by,
    highest.flatMap((a): Choice[] => {
      const name = playerCardDef(a.code)?.name ?? a.code
      return [
        {
          label: 'choice.plaguebearer.noon.discard',
          params: { card: name },
          target: { type: 'asset', id: a.id },
          then: [{ type: 'DiscardAsset', asset: a.id }],
        },
        {
          label: 'choice.plaguebearer.noon.doomOnAsset',
          params: { card: name },
          target: { type: 'asset', id: a.id },
          then: [{ type: 'PlaceDoomOnAsset', asset: a.id, amount: 1, checkAgenda: true }],
        },
      ]
    }),
    'prompt.plaguebearer.noon.livingFlame',
  )
})
/** Llamada de la tumba y Daños acumulados: el daño (o horror) del apoyo pasa al investigador. */
const lifeAndDeathTreachery = (code: string, asset: string, kind: 'damage' | 'horror') =>
  registerTreachery({
    code,
    revelation: (s) => {
      const holders = Object.values(s.assets).filter((a) => a.code === asset)
      return holders.length ? [specific('noon.lifeAndDeath', { asset, kind })] : []
    },
  })
lifeAndDeathTreachery(S.grave, D.strength, 'damage')
lifeAndDeathTreachery(S.injuries, D.will, 'horror')
on('noon.lifeAndDeath', (s, d) => {
  const kind = String(d.kind) as 'damage' | 'horror'
  const holders = Object.values(s.assets).filter((a) => a.code === String(d.asset))
  const resolve = (a: (typeof holders)[number]): Message[] => {
    const amount = kind === 'damage' ? a.damage : a.horror
    return [
      ...(amount ? [kind === 'damage' ? damage(a.owner, 0, amount) : damage(a.owner, amount)] : []),
      {
        type: 'HealAsset',
        asset: a.id,
        damage: kind === 'damage' ? a.damage : 0,
        horror: kind === 'horror' ? a.horror : 0,
      },
    ]
  }
  if (holders.length === 1) return push(s, ...resolve(holders[0]!))
  return ask(
    s,
    lead(s),
    holders.map((a) => ({
      label: 'choice.investigator',
      params: { name: getInvestigator(s, a.owner).name },
      target: { type: 'investigator' as const, id: a.owner },
      then: resolve(a),
    })),
    'prompt.plaguebearer.noon.chooseInvestigator',
  )
})

// ---------------------------------------------------------------------------
// Carta de jugador: Agente Greyson (Ya no sigue órdenes)
// ---------------------------------------------------------------------------

registerPlayerCards([
  {
    code: V.greyson,
    name: 'Agent Greyson',
    subname: 'Not Following Orders',
    type: 'asset',
    class: 'neutral',
    cost: 5,
    story: true,
    traits: ['Ally', 'Humanoid', 'Agency', 'Drifter'],
    slots: ['ally'],
    health: 2,
    sanity: 2,
    icons: { combat: 1, agility: 1, wild: 1 },
  },
  {
    code: V.leftCrest,
    name: 'The Left Crest',
    type: 'asset',
    class: 'neutral',
    story: true,
    traits: ['Item'],
  },
  {
    code: V.rightCrest,
    name: 'The Right Crest',
    type: 'asset',
    class: 'neutral',
    story: true,
    traits: ['Item'],
  },
])
registerPlayerCard({
  code: V.greyson,
  skillModifier: (_s, a, t) =>
    t.investigator === a.owner && (t.skill === 'intellect' || t.skill === 'combat') ? 1 : 0,
  reactions: (s, t, a) => {
    if (t.type !== 'turnEnds' || t.investigator !== a.owner) return []
    const here = at(s, a.owner)
    if (!here || getInvestigator(s, a.owner).resources < 1) return []
    return [
      {
        key: `${a.id}:move`,
        investigator: a.owner,
        label: 'ability.plaguebearer.noon.greyson',
        then: [
          { type: 'SpendResources', investigator: a.owner, amount: 1 },
          specific('noon.greysonMove', { investigator: a.owner }),
        ],
      },
    ]
  },
})
on('noon.greysonMove', (s, d) => {
  const by = String(d.investigator),
    here = at(s, by)
  if (!here) return s
  const people = activeInvestigators(s).filter((i) => i.location === here)
  return ask(
    s,
    by,
    people.map((i) => ({
      label: 'choice.investigator',
      params: { name: i.name },
      target: { type: 'investigator' as const, id: i.id },
      then: [specific('noon.greysonTarget', { investigator: i.id, by })],
    })),
    'prompt.plaguebearer.noon.chooseInvestigator',
  )
})
on('noon.greysonTarget', (s, d) => {
  const who = String(d.investigator),
    here = at(s, who)
  if (!here) return s
  return chooseLocation(
    s,
    String(d.by),
    s.locations[here]!.connections.filter((id) => s.locations[id]),
    (id) => [{ type: 'MoveTo', investigator: who, location: id }],
  )
})

// ---------------------------------------------------------------------------
// Escenario y resoluciones (guía ES pp. 13–14 / EN pp. 15–17)
// ---------------------------------------------------------------------------

registerScenario({
  id: HIGH_NOON_DESCENT,
  rulesVersion: 1,
  simultaneousAssetAssignment: true,
  sequentialEnemyMovement: true,
  specific: (s, key, data) => run(s, key, data),
  connections: noonConnections,
  canEnter: noonCanEnter,
  shroudModifier: noonShroud,
  abilities: (s, _self, by) => scenarioAbilities(s, by),
  forced: (s, t) => {
    const pending = meta(s, 'noonAgencyDamage')
    if (t.type === 'enemySpawned' && pending && s.enemies[t.enemy]?.code === pending)
      return [specific('noon.agencyDamage', { enemy: t.enemy }), ...noonForced(s, t)]
    return noonForced(s, t)
  },
  reactions: (s, t) => noonReactions(s, t),
  canEnemyEngage: (s, e, by) => !(e.code === V.crispin && meta(s, `noonParley:${by}`) === s.round),
  cannotPlay: (s, by, code) => {
    const type = playerCardDef(code)?.type
    return meta(s, `noonNoPlay:${by}`) === s.round && (type === 'asset' || type === 'event')
  },
  // Ventrículo derecho: quien eligió no infligir daño no lo hace en sus pruebas ni en su turno.
  enemyImmune: (s) => {
    const by = s.skillTest?.investigator ?? s.activeTurn
    return !!by && meta(s, `noonNoDamage:${by}`) === s.round
  },
  enemyPrey: (s, e) => {
    if (e.code !== S.fireVampire) return undefined
    const active = activeInvestigators(s)
    const count = (id: string) => Object.values(s.assets).filter((a) => a.owner === id).length
    const fewest = Math.min(...active.map((i) => count(i.id)))
    return {
      type: 'onlyInvestigators',
      investigators: active.filter((i) => count(i.id) === fewest).map((i) => i.id),
    }
  },
  tokenEffect: noonTokens,
  resolution: (s, outcome) => noonResolution(s, outcome),
})

function noonResolution(
  s: GameState,
  outcome: Parameters<NonNullable<ScenarioBehavior['resolution']>>[1],
): Message[] {
  const n = outcome.type === 'resolution' ? outcome.resolution : 1
  const defeated = s.investigators.filter((i) => i.eliminated && !i.resigned)
  const noResolution = outcome.type !== 'resolution'
  return [
    ...(defeated.length
      ? [
          {
            type: 'Story' as const,
            entry: {
              title: 'story.plaguebearer.noon.defeatedTitle',
              body: 'story.plaguebearer.noon.defeated',
            },
          },
        ]
      : []),
    ...(noResolution || defeated.length ? [specific('noon.threshold', { index: 0 })] : []),
    {
      type: 'Story',
      entry: {
        title: `story.plaguebearer.noon.resolution${n}Title`,
        body: `story.plaguebearer.noon.resolution${n}`,
      },
    },
    { type: 'EarnExperience', amount: 0, victory: true },
    recordNote(n === 1 ? 'plaguebearerLurkersRealm' : 'plaguebearerHiddenPaths'),
    ...(s.victoryDisplay.includes(V.first) ? [recordNote('plaguebearerBuried')] : []),
    // Ambas resoluciones pasan al Interludio IV: Lección de historia.
    ...historyLesson(endScenario({ type: 'resolution', resolution: n })),
  ]
}
// En el Umbral (texto oculto): cada investigador que lo lea sufre 1 trauma físico.
on('noon.threshold', (s, d) => {
  const index = Number(d.index),
    i = s.investigators[index]
  if (!i) return s
  const next = specific('noon.threshold', { index: index + 1 })
  return ask(
    s,
    i.id,
    [
      {
        label: 'choice.plaguebearer.friends.read',
        then: [
          {
            type: 'Story',
            entry: {
              title: 'story.plaguebearer.noon.thresholdTitle',
              body: 'story.plaguebearer.noon.threshold',
              effects: [{ key: 'story.plaguebearer.noon.thresholdEffect' }],
            },
          },
          { type: 'SufferTrauma', investigator: i.id, physical: 1 },
          next,
        ],
      },
      { label: 'choice.skip', then: [next] },
    ],
    'prompt.plaguebearer.noon.threshold',
  )
})
