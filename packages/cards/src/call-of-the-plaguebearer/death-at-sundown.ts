import {
  activeInvestigators,
  distancesFrom,
  enemyMaxHealth,
  getInvestigator,
  placedLocation,
  playerCardDef,
  push,
  registerAct,
  registerAgenda,
  registerEnemy,
  registerPlayerCard,
  registerPlayerCards,
  registerScenario,
  registerTreachery,
  shuffle,
  skillTestValue,
  type AbilityOption,
  type CampaignLog,
  type ChaosToken,
  type Choice,
  type Difficulty,
  type GameState,
  type Message,
  type ReactionOption,
  type ScenarioBehavior,
  type ScenarioDefinition,
  type SkillType,
} from '@lcg/engine'
import { copies, effectTest, endScenario, recordNote } from '../scenario-helpers'
import { plaguebearerChaosBag } from './campaign'
import { C, ask, bloodInVeins, chooseLocation, damage, lead, on, run, specific } from './helpers'
import { devoted, thrall, treacheries } from './data'
import { lifeAndDeath } from './noon-data'
import { D } from './dawn-data'
import { confrontation, CONFRONTATION } from './confrontation'
import {
  FLOOR,
  KEY_RITUALS,
  RITUAL,
  VICTORY_SITE,
  Z,
  firstAmongMany,
  floorOf,
  pickman,
  pickmansMemory,
  sundownDeck,
  sundownLocations,
  tendrils,
} from './sundown-data'

export const DEATH_AT_SUNDOWN = 'death-at-sundown'
const RITUAL_DECK = 'sundownRitual'
const KILLED = 'sundownKilled'
const hard = (s: GameState) => s.difficulty === 'hard' || s.difficulty === 'expert'
const note = (s: GameState, key: string) => !!s.campaignLog?.notes.includes(key)
const meta = (s: GameState, key: string) => s.scenarioMeta?.[key]
const at = (s: GameState, id: string) => getInvestigator(s, id).location
const act = (s: GameState) => s.acts[s.actIndex]?.code
const players = (s: GameState) => s.startingInvestigatorCount || s.investigators.length
const enemyOf = (s: GameState, code: string) =>
  Object.values(s.enemies).find((e) => e.code === code)
const RITUAL_NAMES: Record<string, string> = {
  [Z.runes]: 'Binding Runes',
  [Z.blessing]: 'Blessing of Tomorrow',
  [Z.exol]: 'EX.O.L',
  [Z.bag]: 'Hedge Mage’s Bag',
  [Z.words]: 'Killing Words',
  [Z.blade]: 'Rusted Blade',
}

export function deathAtSundown({
  difficulty = 'standard',
  log,
}: {
  difficulty?: Difficulty
  log?: CampaignLog
  seed?: number
} = {}): ScenarioDefinition {
  return {
    id: DEATH_AT_SUNDOWN,
    intro: {
      title: 'story.plaguebearer.sundown.introTitle',
      body: 'story.plaguebearer.sundown.intro1',
    },
    setupInstructions: {
      title: 'story.plaguebearer.sundown.setupTitle',
      body: 'story.plaguebearer.sundown.setup',
    },
    locations: sundownLocations(),
    setAsideLocations: [pickmansMemory()],
    startingLocation: Z.square,
    agendas: [
      { code: Z.agendas[0], name: 'The Calm Before', doomThreshold: 2 },
      { code: Z.agendas[1], name: 'It Just Won’t Die', doomThreshold: 3 },
      { code: Z.agendas[2], name: 'Final Breath', doomThreshold: 3 },
    ],
    acts: [
      {
        code: Z.acts[0],
        name: 'Know the Unknowable',
        clueThreshold: 2,
        cluesPerInvestigator: true,
        advanceTiming: 'anytime',
      },
      { code: Z.acts[1], name: 'Fight the Unfightable', ...objective },
      { code: Z.acts[2], name: 'Kill the Unkillable', ...objective },
    ],
    encounterDeck: [
      ...sundownDeck(),
      // Supervivientes de la Agencia sin enemigos, Vida y muerte y Esclavos del miasma.
      ...treacheries
        .filter((t) => t.code === C.evidence || t.code === C.suppression)
        .flatMap((t) => copies(t, t.code === C.suppression ? 3 : 2)),
      ...lifeAndDeath.flatMap((t) => copies(t, 2)),
      ...copies(thrall, 3),
      { ...devoted },
    ],
    setAside: [firstAmongMany, tendrils, pickman],
    chaosBag: plaguebearerChaosBag(difficulty, log),
    tokenValues: { skull: 0, cultist: -5, tablet: -2, elderThing: -3 },
    setup: [specific('sundown.intro'), specific('sundown.setup')],
  }
}
const objective = {
  clueThreshold: 0,
  cluesPerInvestigator: false,
  advanceTiming: 'objective' as const,
}

// ---------------------------------------------------------------------------
// Introducción y preparación (guía ES p. 18 / EN p. 21)
// ---------------------------------------------------------------------------

const story = (key: string): Message => ({
  type: 'Story',
  entry: {
    title: 'story.plaguebearer.sundown.introTitle',
    body: `story.plaguebearer.sundown.${key}`,
  },
})
// 1 → 2 → 6 (West recuperó el reactivo), 1 → 3 → 5 → 6 (Greyson cortó lazos), 1 → 4 → 5 → 6.
// La Introducción 4 no indica destino: West aparece en la 5, así que se continúa con ella.
on('sundown.intro', (s) =>
  push(
    s,
    ...(note(s, 'plaguebearerWestReagent')
      ? [story('intro2')]
      : note(s, 'plaguebearerGreysonCutTies')
        ? [story('intro3'), story('intro5')]
        : [story('intro4'), story('intro5')]),
    story('intro6'),
  ),
)
on('sundown.setup', (s) => {
  const learned = note(s, 'plaguebearerKillingWords')
  const [middle, rng1] = shuffle([Z.exol, Z.bag, Z.blessing], s.rng)
  const [top, rng] = learned ? [[Z.blade], rng1] : shuffle([Z.blade, Z.words], rng1)
  return push(
    {
      ...s,
      rng,
      scenarioDecks: { ...s.scenarioDecks, [RITUAL_DECK]: [...top, ...middle, Z.runes] },
    },
    ...(learned
      ? [{ type: 'PutAssetIntoPlay' as const, investigator: lead(s), code: Z.words }]
      : []),
  )
})

// ---------------------------------------------------------------------------
// Planes
// ---------------------------------------------------------------------------

const agendaStory = (n: number): Message => ({
  type: 'Story',
  entry: {
    title: `story.plaguebearer.sundown.agenda${n}bTitle`,
    body: `story.plaguebearer.sundown.agenda${n}b`,
  },
})
registerAgenda({
  code: Z.agendas[0],
  onAdvance: () => [
    agendaStory(1),
    { type: 'SpawnSetAsideEnemy', code: Z.first, location: Z.square },
    { type: 'SpawnSetAsideEnemy', code: Z.tendrils, location: Z.square },
  ],
})
// Siempre arriba: el plan 2 vuelve a su cara a hasta que el Primero llega al Piso 5.
registerAgenda({
  code: Z.agendas[1],
  repeats: true,
  onAdvance: () => [agendaStory(2), specific('sundown.upwards')],
})
registerAgenda({
  code: Z.agendas[2],
  onAdvance: (s) => [
    agendaStory(3),
    ...activeInvestigators(s).flatMap((i) => kill(i.id)),
    { type: 'EndScenario', outcome: { type: 'resolution', resolution: 2 } },
  ],
})
const kill = (investigator: string): Message[] => [
  { type: 'KillInvestigators', investigator },
  specific('sundown.killed', { investigator }),
  { type: 'DefeatInvestigator', investigator },
]
on('sundown.killed', (s, d) => {
  const list = String(meta(s, KILLED) ?? '')
    .split(',')
    .filter(Boolean)
  return {
    ...s,
    scenarioMeta: {
      ...s.scenarioMeta,
      [KILLED]: [...new Set([...list, String(d.investigator)])].join(','),
    },
  }
})
on('sundown.upwards', (s) => {
  const first = enemyOf(s, Z.first)
  if (!first) return s
  const floor = floorOf(first.location)
  const removed = Object.keys(s.locations).filter((id) => id !== Z.memory && FLOOR[id] === floor)
  const out: Message[] = []
  for (const i of activeInvestigators(s).filter((i) => removed.includes(i.location ?? '')))
    out.push(...kill(i.id))
  for (const placed of Object.values(s.placedAssets ?? {})) {
    const where = placedLocation(s, placed)
    if (!where || !removed.includes(where)) continue
    out.push(
      RITUAL.includes(placed.code as (typeof RITUAL)[number])
        ? {
            type: 'MovePlacedAsset',
            placed: placed.id,
            placement: { type: 'location', location: Z.deck },
          }
        : { type: 'RemovePlacedAsset', placed: placed.id },
    )
  }
  for (const t of Object.values(s.treacheries))
    if (t.placement.type === 'location' && removed.includes(t.placement.location))
      out.push({ type: 'DiscardTreachery', treachery: t.id })
  for (const e of Object.values(s.enemies)) {
    if (e.id === first.id || !removed.includes(e.location)) continue
    // Los Zarcillos «descartados» van a la zona de victoria, donde siguen en juego.
    if (e.code === Z.tendrils)
      out.push({ type: 'SetScenarioMeta', key: 'sundownTendrilsVictory', value: 1 })
    else out.push({ type: 'DiscardEnemy', enemy: e.id })
  }
  out.push(
    ...removed.map((location): Message => ({ type: 'RemoveLocation', location })),
    specific('sundown.climb', { floor: floor + 1 }),
  )
  return push(s, ...out)
})
on('sundown.climb', (s, d) => {
  const floor = Number(d.floor)
  const first = enemyOf(s, Z.first)
  if (!first) return s
  const options = Object.keys(s.locations).filter((id) => id !== Z.memory && FLOOR[id] === floor)
  const move = (id: string): Message[] => [
    { type: 'MoveEnemy', enemy: first.id, location: id },
    specific('sundown.tendrilsBack'),
    specific('sundown.reached'),
  ]
  if (options.length <= 1)
    return push(
      s,
      ...(options[0] ? move(options[0]) : []),
      ...(options[0] ? [] : [specific('sundown.reached')]),
    )
  return ask(
    s,
    lead(s),
    options.map((id) => ({
      label: 'choice.location',
      params: { location: s.locations[id]!.name },
      target: { type: 'location' as const, id },
      then: move(id),
    })),
    'prompt.plaguebearer.sundown.climb',
  )
})
/**
 * Los Zarcillos en la zona de victoria siguen en juego y el Lugar del Primero está conectado
 * con ella: se representan junto al Primero (o en la Memoria de Pickman, si está en juego).
 */
on('sundown.tendrilsBack', (s) => {
  const t = enemyOf(s, Z.tendrils)
  const first = enemyOf(s, Z.first)
  if (!t || meta(s, 'sundownTendrilsVictory') !== 1) return s
  const target = s.locations[Z.memory] ? Z.memory : first?.location
  return target && t.location !== target
    ? push(s, { type: 'MoveEnemy', enemy: t.id, location: target })
    : s
})
on('sundown.reached', (s) => {
  const floor = floorOf(enemyOf(s, Z.first)?.location)
  if (floor === 4 && !(s.victoryDisplay.includes(Z.blade) && s.victoryDisplay.includes(Z.words)))
    return push(s, { type: 'EndScenario', outcome: { type: 'resolution', resolution: 2 } })
  if (floor >= 5) return push(s, { type: 'AgendaAdvanced', from: Z.agendas[1] })
  return s
})

// ---------------------------------------------------------------------------
// Actos y mazo de Ritual
// ---------------------------------------------------------------------------

const actStory = (n: number): Message => ({
  type: 'Story',
  entry: {
    title: `story.plaguebearer.sundown.act${n}bTitle`,
    body: `story.plaguebearer.sundown.act${n}b`,
  },
})
registerAct({ code: Z.acts[0], onAdvance: () => [actStory(1)] })
registerAct({
  code: Z.acts[1],
  objectiveMet: (s) => KEY_RITUALS.every((code) => s.victoryDisplay.includes(code)),
  onAdvance: () => [
    { type: 'PutLocationIntoPlay', location: Z.memory },
    { type: 'RevealLocation', location: Z.memory },
    specific('sundown.memory'),
  ],
})
// Memoria de Pickman (revelación): los Apoyos de la zona de victoria se vinculan a ella.
on('sundown.memory', (s) => {
  const inVictory = RITUAL.filter((code) => s.victoryDisplay.includes(code))
  return push(
    { ...s, victoryDisplay: s.victoryDisplay.filter((c) => !inVictory.includes(c as never)) },
    ...inVictory.map((code): Message => ({
      type: 'PlaceAsset',
      code,
      name: RITUAL_NAMES[code]!,
      placement: { type: 'location', location: Z.memory },
    })),
    { type: 'SpawnSetAsideEnemy', code: Z.pickman, location: Z.memory },
    specific('sundown.tendrilsBack'),
  )
})
registerAct({
  code: Z.acts[2],
  objectiveMet: () => false,
  onAdvance: () => [
    actStory(3),
    { type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 } },
  ],
})
const ransacked = (s: GameState, id: string) => meta(s, `sundownRansacked:${id}`) === 1
on('sundown.ransack', (s, d) => {
  const location = String(d.location)
  if (location === Z.deck)
    return push(s, { type: 'PlaceCluesOnLocationFromPool', location, amount: players(s) })
  const [code, ...rest] = s.scenarioDecks?.[RITUAL_DECK] ?? []
  const next: GameState = {
    ...s,
    scenarioDecks: { ...s.scenarioDecks, [RITUAL_DECK]: rest },
    scenarioMeta: { ...s.scenarioMeta, [`sundownRansacked:${location}`]: 1 },
  }
  return code
    ? push(next, {
        type: 'PlaceAsset',
        code,
        name: RITUAL_NAMES[code]!,
        placement: { type: 'location', location },
        ...(code === Z.exol ? { uses: 3 } : {}),
      })
    : next
})
on('sundown.toVictory', (s, d) => {
  const placed = s.placedAssets?.[String(d.placed)]
  if (!placed) return s
  return push(
    { ...s, victoryDisplay: [...s.victoryDisplay, placed.code] },
    { type: 'RemovePlacedAsset', placed: placed.id },
    { type: 'CheckActObjective' },
  )
})

// ---------------------------------------------------------------------------
// Capacidades del escenario (Lugares y acto 2)
// ---------------------------------------------------------------------------

const groupHere = (s: GameState, location: string) =>
  activeInvestigators(s).filter((i) => i.location === location)
function scenarioAbilities(s: GameState, by: string): AbilityOption[] {
  const here = at(s, by)
  if (!here || here === Z.square || !s.locations[here]?.revealed) return []
  const out: AbilityOption[] = []
  const l = s.locations[here]!
  // Acto 2: cada Lugar no «saqueado» gana la capacidad [free].
  if (act(s) === Z.acts[1] && here !== Z.memory && !ransacked(s, here)) {
    const group = groupHere(s, here)
    const clues = group.reduce((n, i) => n + i.clues, 0)
    const deckLeft = (s.scenarioDecks?.[RITUAL_DECK] ?? []).length > 0
    if (clues >= players(s) && (deckLeft || here === Z.deck))
      out.push({
        key: `sundown:ransack:${here}`,
        label:
          here === Z.deck
            ? 'ability.plaguebearer.sundown.ransackDeck'
            : 'ability.plaguebearer.sundown.ransack',
        params: { amount: players(s) },
        actions: 0,
        provokes: false,
        costs: [{ type: 'PayGroupClues', amount: players(s), from: group.map((i) => i.id) }],
        then: [specific('sundown.ransack', { location: here })],
      })
  }
  // Observatorio, Taller del manitas y Plataforma: [free] a la zona de victoria.
  if (l.clues === 0)
    for (const placed of Object.values(s.placedAssets ?? {}))
      if (VICTORY_SITE[placed.code] === here && placedLocation(s, placed) === here)
        out.push({
          key: `sundown:victory:${placed.code}`,
          label: 'ability.plaguebearer.sundown.toVictory',
          params: { card: RITUAL_NAMES[placed.code]! },
          actions: 0,
          provokes: false,
          then: [specific('sundown.toVictory', { placed: placed.id })],
        })
  const action = (
    key: string,
    then: Message[],
    extra: Partial<AbilityOption> = {},
  ): AbilityOption => ({
    key: `sundown:${key}`,
    label: `ability.plaguebearer.sundown.${key}`,
    actions: 1,
    provokes: true,
    then,
    ...extra,
  })
  const i = getInvestigator(s, by)
  if (here === Z.campaign && i.deck.length)
    out.push(action('campaign', [specific('sundown.campaign', { investigator: by })]))
  if (here === Z.north)
    out.push(
      action('north', [
        effectTest(by, Z.north, 'intellect', 2, { onSuccess: [specific('sundown.southTick')] }),
      ]),
    )
  if (here === Z.south) out.push(action('south', [effectTest(by, Z.south, 'combat', 1, {})]))
  if (here === Z.makeshift && (s.scenarioDecks?.[RITUAL_DECK] ?? []).length)
    out.push(action('makeshift', [specific('sundown.makeshift', { investigator: by })]))
  if (here === Z.organizer && s.encounterDeck.length)
    out.push(
      action('organizer', [specific('sundown.organizer', { investigator: by })], {
        limit: { per: 'round', group: true },
      }),
    )
  if (here === Z.tinkerer && tinkererOptions(s, by).length)
    out.push(action('tinkerer', [specific('sundown.tinkerer', { investigator: by })]))
  // El acechador acecha: [action][action] descártalo.
  for (const t of Object.values(s.treacheries))
    if (t.code === Z.stalks && t.placement.type === 'threatArea' && t.placement.investigator === by)
      out.push({
        key: `${t.id}:discard`,
        label: 'ability.plaguebearer.sundown.stalks',
        actions: 2,
        provokes: true,
        then: [
          { type: 'DiscardTreachery', treachery: t.id },
          ...(Object.values(s.assets).some(
            (a) => a.owner === by && playerCardDef(a.code)?.traits.includes('Melee'),
          )
            ? [{ type: 'GainActions' as const, investigator: by, amount: 1 }]
            : []),
        ],
      })
  return out
}
// Oficina de campaña: busca entre las 3 primeras cartas, róbala; si es debilidad, +3 recursos.
on('sundown.campaign', (s, d) => {
  const by = String(d.investigator)
  const top = [...new Set(getInvestigator(s, by).deck.slice(0, 3))]
  return ask(
    s,
    by,
    top.map((code) => ({
      label: 'choice.plaguebearer.sundown.take',
      params: { card: playerCardDef(code)?.name ?? code },
      then: [
        { type: 'TakeFromDeck', investigator: by, code, to: 'hand', drawFound: true } as Message,
        ...(playerCardDef(code)?.weakness
          ? [{ type: 'GainResources' as const, investigator: by, amount: 3 }]
          : []),
        { type: 'ShuffleDeck', investigator: by } as Message,
      ],
    })),
    'prompt.plaguebearer.sundown.campaign',
  )
})
// Cámara del reloj sur: 1 daño a cada investigador y enemigo allí y 1 pista en ella.
on('sundown.southTick', (s) => {
  const l = s.locations[Z.south]
  if (!l?.revealed) return s
  return push(
    s,
    ...activeInvestigators(s)
      .filter((i) => i.location === Z.south)
      .map((i) => damage(i.id, 1)),
    ...Object.values(s.enemies)
      .filter((e) => e.location === Z.south)
      .map((e): Message => ({
        type: 'DamageEnemy',
        enemy: e.id,
        amount: 1,
        source: { encounter: true },
      })),
    { type: 'PlaceCluesOnLocationFromPool', location: Z.south, amount: 1 },
  )
})
on('sundown.slowNorth', (s, d) => {
  const l = s.locations[Z.north]
  if (!l) return s
  return {
    ...s,
    locations: {
      ...s.locations,
      [Z.north]: { ...l, shroudModifier: (l.shroudModifier ?? 0) - Number(d.amount) },
    },
  }
})
// Laboratorio improvisado: mira la carta superior del mazo de Ritual.
on('sundown.makeshift', (s, d) => {
  const by = String(d.investigator)
  const [top, ...rest] = s.scenarioDecks?.[RITUAL_DECK] ?? []
  if (!top) return s
  const briefcase = Object.values(s.assets).some((a) => a.owner === by && a.code === C.briefcase)
  const extra: Message[] = briefcase ? [{ type: 'GainActions', investigator: by, amount: 1 }] : []
  return ask(
    s,
    by,
    [
      {
        label: 'choice.plaguebearer.sundown.keepTop',
        params: { card: RITUAL_NAMES[top]! },
        then: extra,
      },
      ...(getInvestigator(s, by).resources >= 2
        ? [
            {
              label: 'choice.plaguebearer.sundown.toBottom',
              params: { card: RITUAL_NAMES[top]! },
              then: [
                { type: 'SpendResources' as const, investigator: by, amount: 2 },
                {
                  type: 'SetScenarioMeta' as const,
                  key: 'sundownRitualOrder',
                  value: [...rest, top].join(','),
                },
                specific('sundown.ritualOrder'),
                ...extra,
              ],
            },
          ]
        : []),
    ],
    'prompt.plaguebearer.sundown.makeshift',
  )
})
on('sundown.ritualOrder', (s) => ({
  ...s,
  scenarioDecks: {
    ...s.scenarioDecks,
    [RITUAL_DECK]: String(meta(s, 'sundownRitualOrder') ?? '')
      .split(',')
      .filter(Boolean),
  },
}))
// Oficina del organizador: mira 3 cartas de Encuentro; con Terror, 1 horror; arriba o abajo.
on('sundown.organizer', (s, d) => {
  const by = String(d.investigator)
  const top = s.encounterDeck.slice(0, 3)
  const terror = top.some((c) => c.traits?.includes('Terror'))
  return push(
    s,
    ...(terror ? [damage(by, 0, 1)] : []),
    specific('sundown.organizerPlace', { investigator: by, count: top.length }),
  )
})
on('sundown.organizerPlace', (s, d) => {
  const n = Number(d.count)
  return ask(
    s,
    String(d.investigator),
    [
      { label: 'choice.plaguebearer.sundown.keepEncounter', then: [] },
      {
        label: 'choice.plaguebearer.sundown.bottomEncounter',
        then: [specific('sundown.encounterBottom', { count: n })],
      },
    ],
    'prompt.plaguebearer.sundown.organizer',
  )
})
on('sundown.encounterBottom', (s, d) => {
  const n = Number(d.count)
  return { ...s, encounterDeck: [...s.encounterDeck.slice(n), ...s.encounterDeck.slice(0, n)] }
})
// Taller del manitas: gasta X recursos (coste de un Apoyo Objeto de tu descarte) y recupéralo.
const tinkererOptions = (s: GameState, by: string) => {
  const i = getInvestigator(s, by)
  return [...new Set(i.discard)].filter((code) => {
    const def = playerCardDef(code)
    return def?.type === 'asset' && def.traits.includes('Item') && (def.cost ?? 0) <= i.resources
  })
}
on('sundown.tinkerer', (s, d) => {
  const by = String(d.investigator)
  return ask(
    s,
    by,
    tinkererOptions(s, by).map((code) => ({
      label: 'choice.plaguebearer.sundown.recover',
      params: { card: playerCardDef(code)?.name ?? code, amount: playerCardDef(code)?.cost ?? 0 },
      then: [
        { type: 'SpendResources', investigator: by, amount: playerCardDef(code)?.cost ?? 0 },
        specific('sundown.recover', { investigator: by, code }),
      ],
    })),
    'prompt.plaguebearer.sundown.tinkerer',
  )
})
on('sundown.recover', (s, d) => {
  const by = String(d.investigator),
    code = String(d.code)
  return {
    ...s,
    investigators: s.investigators.map((i) => {
      if (i.id !== by) return i
      const index = i.discard.lastIndexOf(code)
      return index < 0
        ? i
        : { ...i, discard: i.discard.filter((_, n) => n !== index), hand: [...i.hand, code] }
    }),
  }
})

// ---------------------------------------------------------------------------
// Apoyos de historia Ritual
// ---------------------------------------------------------------------------

registerPlayerCards([
  {
    code: Z.runes,
    name: 'Binding Runes',
    type: 'asset',
    class: 'neutral',
    story: true,
    traits: ['Item', 'Charm', 'Ritual'],
    slots: ['hand'],
    icons: {},
  },
  {
    code: Z.blessing,
    name: 'Blessing of Tomorrow',
    type: 'asset',
    class: 'neutral',
    story: true,
    traits: ['Spell', 'Ritual'],
    slots: ['hand', 'arcane'],
    icons: {},
  },
  {
    code: Z.exol,
    name: 'EX.O.L',
    subname: 'Experimental Ordinance Launcher',
    type: 'asset',
    class: 'neutral',
    story: true,
    unique: true,
    traits: ['Item', 'Weapon', 'Firearm', 'Agency', 'Ritual'],
    slots: ['hand', 'hand'],
    uses: { count: 3, type: 'ammo' },
    icons: {},
  },
  {
    code: Z.bag,
    name: 'Hedge Mage’s Bag',
    type: 'asset',
    class: 'neutral',
    story: true,
    traits: ['Item', 'Clothing', 'Ritual'],
    slots: ['body'],
    icons: {},
  },
  {
    code: Z.words,
    name: 'Killing Words',
    type: 'asset',
    class: 'neutral',
    story: true,
    traits: ['Spell', 'Ritual'],
    slots: ['arcane'],
    icons: {},
  },
  {
    code: Z.blade,
    name: 'Rusted Blade',
    type: 'asset',
    class: 'neutral',
    story: true,
    traits: ['Item', 'Weapon', 'Melee', 'Ritual'],
    slots: ['hand'],
    icons: {},
  },
])
const ritualLimit = { per: 'round' as const, group: true }
const ritualKey = (code: string) => `sundown:ritual:${code}`
/** Enemigos de tu Lugar que se pueden atacar (sin el Primero de muchos). */
const targets = (s: GameState, by: string) =>
  Object.values(s.enemies).filter((e) => e.location === at(s, by) && e.code !== Z.first)
const fight = (
  s: GameState,
  by: string,
  asset: string,
  code: string,
  skills: SkillType[],
  extra: { modifier?: number; damage: number; cost?: Message[] },
): AbilityOption[] =>
  targets(s, by).flatMap((e) =>
    skills.map((skill) => ({
      key: `${asset}:fight:${skill}`,
      label: 'ability.plaguebearer.sundown.fight',
      params: { card: RITUAL_NAMES[code]!, enemy: e.name, skill },
      target: { type: 'enemy' as const, id: e.id },
      actions: 1,
      provokes: false,
      costs: extra.cost ?? [],
      then: [
        {
          type: 'BeginSkillTest' as const,
          investigator: by,
          skill,
          skillSelected: true,
          difficulty: e.fight,
          modifier: extra.modifier ?? 0,
          source: asset,
          kind: { type: 'fight' as const, enemy: e.id, extraDamage: extra.damage, onSuccess: [] },
        },
      ],
    })),
  )
for (const code of RITUAL)
  registerPlayerCard({
    code,
    ...(code === Z.bag ? { extraSlots: { hand: 2 } } : {}),
    // Aproximación: la acción adicional de la Bendición no se restringe a capacidades [action].
    ...(code === Z.blessing ? { additionalTurnActions: 1 } : {}),
    abilities: (s, a, by) => {
      if (a.owner !== by) return []
      const here = at(s, by)
      const out: AbilityOption[] = []
      if (here && here !== Z.square)
        out.push({
          key: ritualKey(code),
          label: 'ability.plaguebearer.sundown.attach',
          params: { card: RITUAL_NAMES[code]! },
          actions: 1,
          provokes: true,
          limit: ritualLimit,
          then: [
            { type: 'ReleaseAsset', asset: a.id, placement: { type: 'location', location: here } },
          ],
        })
      if (code === Z.blade)
        out.push(
          ...fight(s, by, a.id, code, ['willpower', 'intellect', 'combat', 'agility'], {
            damage: 1,
          }),
        )
      if (code === Z.exol && a.uses > 0)
        out.push(
          ...fight(s, by, a.id, code, ['combat'], {
            modifier: 4,
            damage: 4,
            cost: [{ type: 'SpendUses', asset: a.id, amount: 1 }],
          }),
        )
      if (code === Z.words)
        for (const e of targets(s, by)) {
          const remaining = Math.max(0, enemyMaxHealth(s, e) - e.damageTaken)
          out.push({
            key: `${a.id}:words`,
            label: 'ability.plaguebearer.sundown.words',
            params: { enemy: e.name, amount: remaining },
            target: { type: 'enemy', id: e.id },
            actions: 1,
            provokes: false,
            parley: true,
            then: [
              { type: 'TakeDamage', investigator: by, damage: 0, horror: remaining, direct: true },
              { type: 'SetScenarioMeta', key: 'sundownWords', value: 1 },
              { type: 'DefeatEnemy', enemy: e.id, by },
              { type: 'SetScenarioMeta', key: 'sundownWords', value: 0 },
            ],
          })
        }
      return out
    },
    placedAbilities: (s, self, by) => {
      const here = at(s, by)
      if (!here || here === Z.square || placedLocation(s, self) !== here) return []
      return [
        {
          key: ritualKey(code),
          label: 'ability.plaguebearer.sundown.takeControl',
          params: { card: RITUAL_NAMES[code]! },
          actions: 1,
          provokes: true,
          limit: ritualLimit,
          then: [{ type: 'TakeControlOfPlaced', placed: self.id, investigator: by, noSlot: false }],
        },
      ]
    },
    // Runas de atadura: antes de preparar a los enemigos, recibe 1 daño directo y uno no se prepara.
    ...(code === Z.runes
      ? {
          fastOptions: (s: GameState, a: { id: string; owner: string }): ReactionOption[] =>
            s.phaseStep !== 'upkeepBegins'
              ? []
              : Object.values(s.enemies)
                  .filter((e) => e.exhausted && e.location === at(s, a.owner))
                  .map((e) => ({
                    key: `${a.id}:runes:${e.id}`,
                    investigator: a.owner,
                    label: 'ability.plaguebearer.sundown.runes',
                    params: { enemy: e.name },
                    target: { type: 'enemy' as const, id: e.id },
                    then: [
                      {
                        type: 'TakeDamage',
                        investigator: a.owner,
                        damage: 1,
                        horror: 0,
                        direct: true,
                      },
                      { type: 'EnemyStaysExhausted', enemy: e.id },
                    ],
                  })),
        }
      : {}),
  })

// ---------------------------------------------------------------------------
// Enemigos
// ---------------------------------------------------------------------------

registerEnemy({ code: Z.first, canBeAttacked: () => false })
registerEnemy({
  code: Z.pickman,
  healthModifier: (s) => s.locations[Z.memory]?.clues ?? 0,
  // Cualquier daño que no sea de la Hoja oxidada se reduce a 1.
  damageTaken: (s, _self, amount, source) => {
    const from = s.skillTest?.source ? s.assets[s.skillTest.source]?.code : undefined
    return { amount: source.code === Z.blade || from === Z.blade ? amount : Math.min(1, amount) }
  },
})

/** Un paso desde `from` hacia el más cercano de `targets` (empates: el primero). */
function stepToward(s: GameState, from: string, targets: string[]): string | undefined {
  const goals = targets.filter((id) => s.locations[id])
  if (!goals.length || goals.includes(from)) return undefined
  const distance = (id: string) =>
    Math.min(...goals.map((to) => distancesFrom(s, id).get(to) ?? Infinity))
  const options = (s.locations[from]?.connections ?? []).filter((id) => s.locations[id])
  const best = Math.min(...options.map(distance))
  return Number.isFinite(best) ? options.find((id) => distance(id) === best) : undefined
}
const moveTendrilsToward = (s: GameState, targets: string[]): Message[] => {
  const t = enemyOf(s, Z.tendrils)
  if (!t) return []
  const to = stepToward(s, t.location, targets)
  return to ? [{ type: 'MoveEnemy', enemy: t.id, location: to }] : []
}
const nearestInvestigators = (s: GameState) =>
  activeInvestigators(s)
    .map((i) => i.location!)
    .filter(Boolean)

// ---------------------------------------------------------------------------
// Traiciones
// ---------------------------------------------------------------------------

registerTreachery({
  code: Z.crash,
  revelation: (s, by) => [effectTest(by, Z.crash, 'agility', 1 + floorOf(at(s, by)), {})],
})
on('sundown.crash', (s, d) => {
  const by = String(d.investigator),
    left = Number(d.left)
  if (left <= 0) return s
  const next = specific('sundown.crash', { investigator: by, left: left - 1 })
  const i = getInvestigator(s, by)
  const choices: Choice[] = [
    ...(i.resources > 0
      ? [
          {
            label: 'choice.plaguebearer.sundown.loseResource',
            then: [{ type: 'LoseResources' as const, investigator: by, amount: 1 }, next],
          },
        ]
      : []),
    ...(i.hand.length
      ? [
          {
            label: 'choice.plaguebearer.sundown.discardCard',
            then: [{ type: 'ChooseDiscardFromHand' as const, investigator: by, amount: 1 }, next],
          },
        ]
      : []),
  ]
  return choices.length ? ask(s, by, choices, 'prompt.plaguebearer.sundown.crash') : s
})
registerTreachery({
  code: Z.youOrMe,
  revelation: (s, by) => {
    const first = enemyOf(s, Z.first)
    if (!first) return []
    return [
      {
        type: 'Ask',
        investigator: by,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.plaguebearer.sundown.youOrMe',
          choices: activeInvestigators(s).map((i) => ({
            label: 'choice.investigator',
            params: { name: i.name },
            target: { type: 'investigator' as const, id: i.id },
            then: [{ type: 'MoveTo', investigator: i.id, location: first.location } as Message],
          })),
        },
      },
    ]
  },
})
registerTreachery({
  code: Z.stalks,
  revelation: (_s, by, self) => [
    effectTest(by, Z.stalks, 'agility', 3, {
      onFail: [
        {
          type: 'PlaceTreachery',
          treachery: self.id,
          placement: { type: 'threatArea', investigator: by },
        },
      ],
    }),
  ],
  forced: (s, t, self) =>
    t.type === 'afterMove' &&
    self.placement.type === 'threatArea' &&
    t.investigator === self.placement.investigator
      ? moveTendrilsToward(s, nearestInvestigators(s))
      : [],
})
const filledHands = (s: GameState, by: string) =>
  Object.values(s.assets)
    .filter((a) => a.owner === by)
    .reduce(
      (n, a) => n + (playerCardDef(a.code)?.slots?.filter((x) => x === 'hand').length ?? 0),
      0,
    )
registerTreachery({
  code: Z.shrieking,
  revelation: (s, by) => [effectTest(by, Z.shrieking, 'willpower', 2 + filledHands(s, by), {})],
})
registerTreachery({
  code: Z.hatred,
  revelation: (s, by) => {
    const t = enemyOf(s, Z.tendrils)
    const here = at(s, by)
    const doom: Message[] = [{ type: 'PlaceDoom', amount: 1 }, { type: 'CheckAgenda' }]
    if (!t || !here) return doom
    return [
      {
        type: 'Ask',
        investigator: by,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.plaguebearer.sundown.hatred',
          choices: [
            {
              label: 'choice.plaguebearer.sundown.tendrilsHere',
              then: [
                { type: 'ReadyEnemy', enemy: t.id },
                ...(t.location !== here
                  ? [{ type: 'MoveEnemy' as const, enemy: t.id, location: here }]
                  : []),
              ],
            },
            { label: 'choice.plaguebearer.sundown.doom', then: doom },
          ],
        },
      },
    ]
  },
})
registerTreachery({
  code: Z.writhing,
  revelation: (s) => {
    const t = enemyOf(s, Z.tendrils)
    if (!t) return []
    const engaged = activeInvestigators(s).filter(
      (i) => t.engagedWith === i.id || (i.location === t.location && !!t.engagedWith),
    )
    return engaged.length
      ? engaged.map((i): Message => ({
          type: 'EnemyAttack',
          enemy: t.id,
          investigator: i.id,
          exhaustAfter: false,
        }))
      : moveTendrilsToward(s, nearestInvestigators(s))
  },
})

// ---------------------------------------------------------------------------
// Fichas del caos (carta de referencia; ES ya incorpora la errata de la tablilla Difícil)
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
on('sundown.elderThing', (s, d) => {
  const times = d.perPoint ? failedBy(s) : 1
  const first = enemyOf(s, Z.first)
  if (!first) return s
  const each = activeInvestigators(s).filter((i) => heeded(s, i.id))
  return push(
    s,
    ...Array.from({ length: times }, () =>
      each.map((i) => specific('sundown.towardFirst', { investigator: i.id })),
    ).flat(),
  )
})
on('sundown.towardFirst', (s, d) => {
  const by = String(d.investigator),
    first = enemyOf(s, Z.first),
    here = at(s, by)
  if (!first || !here) return s
  const to = stepToward(s, here, [first.location])
  return to ? push(s, { type: 'MoveTo', investigator: by, location: to }) : s
})
on('sundown.tendrilsToward', (s, d) => {
  const here = at(s, String(d.investigator))
  return here ? push(s, ...moveTendrilsToward(s, [here])) : s
})
on('sundown.discoverAnywhere', (s, d) => {
  const by = String(d.investigator)
  return chooseLocation(
    s,
    by,
    Object.values(s.locations)
      .filter((l) => l.revealed && l.clues > 0)
      .map((l) => l.id),
    (location) => [{ type: 'DiscoverClues', investigator: by, amount: 1, location }],
    true,
  )
})
const sundownTokens: NonNullable<ScenarioBehavior['tokenEffect']> = (s, token, by) => {
  if (token === 'skull') return { modifier: -(floorOf(at(s, by)) + (hard(s) ? 2 : 0)) }
  if (token === 'cultist' && bloodInVeins(s)) return { modifier: 0, autoFail: true }
  if (token === 'cultist')
    return {
      modifier: hard(s) ? -7 : -5,
      onSuccess: [specific('sundown.discoverAnywhere', { investigator: by })],
    }
  if (token === 'tablet')
    return {
      modifier: hard(s) ? -4 : -2,
      onFail: [specific('sundown.tendrilsToward', { investigator: by })],
    }
  if (token === 'elderThing')
    return { modifier: -3, onFail: [specific('sundown.elderThing', { perPoint: hard(s) })] }
  throw new Error(`Death at Sundown: token ${token} is not implemented`)
}

// ---------------------------------------------------------------------------
// Forzados del escenario
// ---------------------------------------------------------------------------

function sundownForced(
  s: GameState,
  t: Parameters<NonNullable<ScenarioBehavior['forced']>>[1],
): Message[] {
  switch (t.type) {
    case 'afterRevealLocation':
      return t.location === Z.north && s.locations[Z.south] && !s.locations[Z.south]!.revealed
        ? [{ type: 'RevealLocation', location: Z.south }]
        : []
    case 'roundEnds':
      return s.locations[Z.south]?.revealed ? [specific('sundown.southTick')] : []
    case 'enemyDefeated':
      return t.enemy.code === Z.pickman && act(s) === Z.acts[2] ? [{ type: 'AdvanceAct' }] : []
    case 'afterSkillTest': {
      const test = s.skillTest
      const source = test?.kind.type === 'effect' ? test.kind.source : undefined
      if (t.succeeded && source === Z.south)
        return [specific('sundown.slowNorth', { amount: t.margin })]
      if (!t.succeeded && source === Z.crash)
        return [specific('sundown.crash', { investigator: t.investigator, left: -t.margin })]
      if (!t.succeeded && source === Z.shrieking)
        return [damage(t.investigator, 0, Math.min(3, -t.margin))]
      return []
    }
    default:
      return []
  }
}

registerScenario({
  id: DEATH_AT_SUNDOWN,
  rulesVersion: 1,
  simultaneousAssetAssignment: true,
  sequentialEnemyMovement: true,
  specific: (s, key, data) => run(s, key, data),
  abilities: (s, _self, by) => scenarioAbilities(s, by),
  // Plaza de la Independencia: no se pueden activar capacidades [action].
  actionAllowed: (s, by, kind) => kind !== 'activate' || at(s, by) !== Z.square,
  // El Lugar del Primero está conectado con la zona de victoria para los Zarcillos.
  enemyConnections: (s, location, e) => {
    if (e?.code !== Z.tendrils || !s.locations[Z.memory]) return []
    const first = enemyOf(s, Z.first)?.location
    return location === first ? [Z.memory] : location === Z.memory && first ? [first] : []
  },
  // Plan 1: en vez de robar del mazo de Encuentros, robas de tu mazo.
  insteadOfEncounterDraw: (s, by) =>
    s.agendas[s.agendaIndex]?.code === Z.agendas[0]
      ? [{ type: 'DrawCards', investigator: by, amount: 1 }]
      : null,
  // Planes 2 y 3: un Apoyo Ritual que fuese a ser descartado se vincula a la Plataforma.
  assetLeavesPlay: (s, asset) =>
    s.agendaIndex >= 1 && RITUAL.includes(asset.code as never) && s.locations[Z.deck]
      ? [
          {
            type: 'ReleaseAsset',
            asset: asset.id,
            placement: { type: 'location', location: Z.deck },
          },
        ]
      : null,
  enemyStat: (s, e, stat) =>
    e.location === Z.lobby && (stat === 'fight' || stat === 'evade') ? -1 : 0,
  enemyImmune: (_s, e) => e.code === Z.first,
  // Acto 3: un enemigo de la zona de victoria que fuese a ser derrotado por daño se agota y
  // se cura 1 daño; el Dr. Pickman no puede ser derrotado por daño; el Primero, nunca.
  enemyWouldBeDefeated: (s, e) => {
    if (e.code === Z.first) return []
    if (meta(s, 'sundownWords') === 1) return null
    if (e.location === Z.memory)
      return [
        { type: 'ExhaustEnemy', enemy: e.id },
        { type: 'HealEnemy', enemy: e.id, amount: 1 },
      ]
    return e.code === Z.pickman ? [] : null
  },
  forced: (s, t) => sundownForced(s, t),
  tokenEffect: sundownTokens,
  resolution: (s, outcome) => sundownResolution(s, outcome),
})

// ---------------------------------------------------------------------------
// Resoluciones (guía ES p. 19 / EN p. 22)
// ---------------------------------------------------------------------------

const resolutionStory = (n: number, effects = true): Message => ({
  type: 'Story',
  entry: {
    title: `story.plaguebearer.sundown.resolution${n}Title`,
    body: `story.plaguebearer.sundown.resolution${n}`,
    ...(effects ? { effects: [{ key: `story.plaguebearer.sundown.resolution${n}Effect` }] } : {}),
  },
})
/** «Victoria X de cada carta en juego»: lo que el motor no cuenta ya en la zona de victoria. */
export function inPlayVictory(s: GameState): number {
  const locations = Object.values(s.locations).reduce(
    (n, l) => n + (l.revealed && l.clues === 0 ? 0 : (l.victory ?? 0)),
    0,
  )
  const enemies = Object.values(s.enemies).reduce((n, e) => n + (e.victory ?? 0), 0)
  return locations + enemies
}
function sundownResolution(
  s: GameState,
  outcome: Parameters<NonNullable<ScenarioBehavior['resolution']>>[1],
): Message[] {
  const n = outcome.type === 'resolution' ? outcome.resolution : 2
  if (n === 2)
    return [
      resolutionStory(2),
      recordNote('campaignLost'),
      endScenario({ type: 'resolution', resolution: 2 }),
    ]
  const killed = new Set([
    ...String(meta(s, KILLED) ?? '')
      .split(',')
      .filter(Boolean),
    ...s.investigators.filter((i) => i.eliminated && !i.resigned).map((i) => i.id),
  ])
  return [
    resolutionStory(1),
    { type: 'EarnExperience', amount: inPlayVictory(s), victory: true },
    ...[...killed].map((id): Message => ({ type: 'KillInvestigators', investigator: id })),
    ...(killed.size
      ? [
          {
            type: 'Story' as const,
            entry: {
              title: 'story.plaguebearer.sundown.defeatedTitle',
              body: 'story.plaguebearer.sundown.defeated',
              effects: [{ key: 'story.plaguebearer.sundown.defeatedEffect' }],
            },
          },
          ...[...killed].map((id) => specific('sundown.revive', { investigator: id })),
        ]
      : []),
    specific('sundown.warned', { index: 0 }),
    // Interludio V: La confrontación, antes de cerrar el escenario.
    ...confrontation(endScenario({ type: 'resolution', resolution: 1 })),
  ]
}
// Investigador derrotado: ya no está Muerto; Voluntad inquebrantable pasa a Fuerza de la carne.
on('sundown.revive', (s, d) => {
  const id = String(d.investigator)
  const log = s.campaignLog
  const r = log?.investigators[id]
  if (!log || !r) return s
  const swap = r.storyAssets.includes(D.will)
  const assets = swap
    ? [...r.storyAssets.filter((c) => c !== D.will && c !== D.folly), D.strength, D.deathsHold]
    : r.storyAssets
  const reagent = JSON.parse(log.values.plaguebearerReagent ?? '[]') as string[]
  return push(
    {
      ...s,
      campaignLog: {
        ...log,
        investigators: { ...log.investigators, [id]: { ...r, killed: false, storyAssets: assets } },
      },
    },
    ...(reagent.includes(id)
      ? []
      : [
          {
            type: 'RecordNote' as const,
            note: 'plaguebearerReagent',
            value: JSON.stringify([...reagent, id]),
          },
        ]),
  )
})
/**
 * Resolución [tablilla]: la guía no indica cómo se llega. Es un texto oculto (voz de
 * Baalshandor, como los Susurros del VI) que se ofrece tras la R1: el primero que lo lea anota
 * «habéis sido advertidos» y añade la ficha según la dificultad.
 */
const WARNING_TOKEN: Record<Difficulty, ChaosToken> = {
  easy: -3,
  standard: -5,
  hard: -6,
  expert: -7,
}
on('sundown.warned', (s, d) => {
  const index = Number(d.index),
    i = s.investigators[index]
  if (!i || note(s, CONFRONTATION.warned)) return s
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
              title: 'story.plaguebearer.sundown.tabletTitle',
              body: 'story.plaguebearer.sundown.tablet',
              effects: [{ key: 'story.plaguebearer.sundown.tabletEffect' }],
            },
          },
          recordNote(CONFRONTATION.warned),
          { type: 'AddChaosTokens', tokens: [WARNING_TOKEN[s.difficulty ?? 'standard']] },
        ],
      },
      { label: 'choice.skip', then: [specific('sundown.warned', { index: index + 1 })] },
    ],
    'prompt.plaguebearer.sundown.tablet',
  )
})
