import {
  activeInvestigators,
  distancesFrom,
  getInvestigator,
  nextInt,
  placedLocation,
  push,
  registerAct,
  registerAgenda,
  registerEnemy,
  registerLocation,
  registerPlayerCard,
  registerPlayerCards,
  registerScenario,
  registerTreachery,
  shuffle,
  skillTestValue,
  type CampaignLog,
  type ChaosToken,
  type Choice,
  type Difficulty,
  type EncounterCard,
  type Enemy,
  type GameState,
  type Message,
  type ScenarioBehavior,
  type ScenarioDefinition,
  type SkillTest,
  type SkillType,
} from '@lcg/engine'
import {
  ENCOUNTER_SETS,
  SETS,
  byakheeStat,
  encounterSpecific,
} from '../the-path-to-carcosa/encounter-sets'
import { copies, effectTest, endScenario, recordNote } from '../scenario-helpers'
import { plaguebearerChaosBag } from './campaign'
import { ask, bloodInVeins, damage, lead, on, run, specific } from './helpers'
import { TOWN, grinningVictim } from './night-data'
import { townReactions } from './night-citizens'
import { defendMetric, isDefend } from './night-helpers'
import { FALLEN, chorusLocations, elites } from './chorus-data'
import {
  arkhamStatus,
  fallenEliteDamage,
  fallenEliteForced,
  fallenEliteHorror,
} from './mourning-chorus'
import { S, fireVampire, livingFlame } from './noon-data'
import { D } from './dawn-data'
import {
  FLAME_CARDS,
  KING_CARDS,
  RALLY_ASSETS,
  RALLY_TRAITS,
  W,
  acolyte,
  candlejack,
  crater,
  messengerFlame,
  messengerKing,
  molten,
  portals,
  protagonist,
  siteOfUnbinding,
  warDeck,
  warPosition,
} from './war-data'

export const AFTERNOON_WAR = 'the-afternoon-war'
const HIBBS_ROW = '78026'
const HIBBS_HELPING = '78039'
const hard = (s: GameState) => s.difficulty === 'hard' || s.difficulty === 'expert'
const note = (s: GameState, key: string) => !!s.campaignLog?.notes.includes(key)
const meta = (s: GameState, key: string) => s.scenarioMeta?.[key]
const at = (s: GameState, id: string) => getInvestigator(s, id).location
const act = (s: GameState) => s.acts[s.actIndex]?.code
const byakhee = ENCOUNTER_SETS.agentsOfHastur.find((c) => c.code === SETS.screechingByakhee)!
const yellowSign = ENCOUNTER_SETS.agentsOfHastur.filter((c) => c.code === SETS.theYellowSign)

// ---------------------------------------------------------------------------
// Fichas sobre los Lugares (daño en scenarioMeta, horror y pistas en el Lugar)
// ---------------------------------------------------------------------------

export type TokenKind = 'damage' | 'horror' | 'clue'
const DAMAGE = (id: string) => `locationDamage:${id}`
export const locationDamage = (s: GameState, id: string) => Number(meta(s, DAMAGE(id)) ?? 0)
export const locationHorror = (s: GameState, id: string) => s.locations[id]?.horror ?? 0
const amountOf = (s: GameState, id: string, kind: TokenKind) =>
  kind === 'damage'
    ? locationDamage(s, id)
    : kind === 'horror'
      ? locationHorror(s, id)
      : (s.locations[id]?.clues ?? 0)
/** «Fichas» de un Lugar: daño, horror, pistas y perdición. */
export const tokensOn = (s: GameState, id: string) => {
  const l = s.locations[id]
  return l ? locationDamage(s, id) + (l.horror ?? 0) + l.clues + (l.doom ?? 0) : 0
}
const nonClueTokens = (s: GameState, id: string) => tokensOn(s, id) - (s.locations[id]?.clues ?? 0)
const kindsOn = (s: GameState, id: string): TokenKind[] =>
  (['damage', 'horror', 'clue'] as TokenKind[]).filter((k) => amountOf(s, id, k) > 0)
const tokens = (location: string, kind: TokenKind, amount: number): Message =>
  specific('war.tokens', { location, kind, amount })
on('war.tokens', (s, d) => {
  const id = String(d.location),
    l = s.locations[id],
    n = Number(d.amount)
  if (!l || !n) return s
  if (d.kind === 'damage')
    return {
      ...s,
      scenarioMeta: { ...s.scenarioMeta, [DAMAGE(id)]: Math.max(0, locationDamage(s, id) + n) },
    }
  const next =
    d.kind === 'horror'
      ? { ...l, horror: Math.max(0, (l.horror ?? 0) + n) }
      : { ...l, clues: Math.max(0, l.clues + n) }
  return { ...s, locations: { ...s.locations, [id]: next } }
})
const totals = (s: GameState) =>
  Object.keys(s.locations).reduce(
    (t, id) => ({
      damage: t.damage + locationDamage(s, id),
      horror: t.horror + locationHorror(s, id),
    }),
    { damage: 0, horror: 0 },
  )

// ---------------------------------------------------------------------------
// Lugares
// ---------------------------------------------------------------------------

const rowOf = (id: string) => TOWN.find((r) => r.id === id || r.stable === id || r.ruin === id)
const inPlay = (s: GameState, rowId: string) => {
  const row = TOWN.find((r) => r.id === rowId)!
  return [row.stable, row.ruin, row.id].find((id) => s.locations[id])
}
const isPortal = (id: string) => id === W.flame || id === W.king
const siteLocation = (s: GameState) => {
  const site = Object.values(s.treacheries).find(
    (t) => t.code === W.site && t.placement.type === 'location',
  )
  return site?.placement.type === 'location' ? site.placement.location : undefined
}
/** Lugares Liberación: el Cráter o el Lugar vinculado al Lugar de la Liberación. */
export const unbindingLocations = (s: GameState) =>
  [s.locations[W.crater] ? W.crater : undefined, siteLocation(s)].filter(
    (id): id is string => !!id && !!s.locations[id],
  )
export const isMiasma = (s: GameState, id: string) =>
  id === W.crater ||
  TOWN.some((r) => r.ruin === id) ||
  (isPortal(id) && !!s.locations[id]?.revealed)
const isStable = (id: string) => TOWN.some((r) => r.stable === id)
const fallback = (s: GameState, rowId: string) => inPlay(s, rowId) ?? W.crater

export function afternoonWar({
  difficulty = 'standard',
  log,
  seed = 1,
  investigators = 1,
}: {
  difficulty?: Difficulty
  log?: CampaignLog
  seed?: number
  investigators?: number
} = {}): ScenarioDefinition {
  const has = (key: string) => !!log?.notes.includes(key)
  const town = arkhamStatus(log, seed)
  const { stable, ruins } = chorusLocations()
  // Sin registro del IV se toma el Motel Hibb como Lugar de la Liberación (como en el IV).
  const craterRow = TOWN.find((r) => has(`plaguebearerTown${r.id}Crater`))
  const siteRow =
    TOWN.find((r) => has(`plaguebearerTown${r.id}Site`)) ??
    (craterRow ? undefined : TOWN.find((r) => r.id === HIBBS_ROW))
  const locations = TOWN.map((row) => {
    const position = warPosition(row.id)
    if (row === craterRow) return crater(position)
    const card =
      town[row.id] === 'Infected'
        ? ruins.find((l) => l.id === row.ruin)!
        : stable.find((l) => l.id === row.stable)!
    return { ...card, position }
  })
  const flameAndKing = portals()
  const defended = TOWN.filter((r) => town[r.id] === 'Defended').map((r) => r.id)
  const eliminated = elites
    .map((e) => e.code)
    .filter((code) => has(`plaguebearerEliminated${code}`))
  const remaining = elites.filter(
    (e) => !defended.some((id) => FALLEN[id]!.elite === e.code) && !eliminated.includes(e.code),
  )
  const [shuffled] = shuffle([...remaining], seed + 7)
  const chosen = shuffled.slice(0, 2)
  const crowd = investigators >= 3
  const start =
    craterRow?.id === HIBBS_ROW
      ? W.crater
      : town[HIBBS_ROW] === 'Infected'
        ? TOWN.find((r) => r.id === HIBBS_ROW)!.ruin
        : TOWN.find((r) => r.id === HIBBS_ROW)!.stable
  const deck: EncounterCard[] = [
    ...warDeck().filter((c, n, all) => {
      // Una copia del Acólito infernal (y del Protagonista con 3–4 jugadores) empieza en juego.
      const before = all.slice(0, n).filter((x) => x.code === c.code).length
      if (c.code === W.acolyte) return before >= 1
      if (c.code === W.protagonist && crowd) return before >= 1
      return true
    }),
    ...copies(livingFlame, 2),
    ...copies(grinningVictim, 3),
    ...yellowSign,
    ...chosen,
  ]
  return {
    id: AFTERNOON_WAR,
    intro: {
      title: 'story.plaguebearer.war.introTitle',
      body: has('plaguebearerWestReagent')
        ? 'story.plaguebearer.war.intro1'
        : 'story.plaguebearer.war.intro2',
      ...(has('plaguebearerWestReagent')
        ? { effects: [{ key: 'story.plaguebearer.war.intro1Effect' }] }
        : {}),
    },
    setupInstructions: {
      title: 'story.plaguebearer.war.setupTitle',
      body: 'story.plaguebearer.war.setup',
    },
    locations: [...locations, ...flameAndKing],
    startingLocation: start,
    agendas: [
      { code: W.agendas[0], name: 'Arkham in Flames', doomThreshold: 3 },
      { code: W.agendas[1], name: 'Fiery Portents', doomThreshold: 3 },
      { code: W.agendas[2], name: 'Maddening Fires', doomThreshold: 10 },
    ],
    acts: [
      {
        code: W.acts[0],
        name: 'The First Portal',
        clueThreshold: 4,
        cluesPerInvestigator: true,
        advanceTiming: 'anytime',
      },
      { code: W.acts[1], name: 'Closing the Gate', ...objective },
      {
        code: W.acts[2],
        name: 'The Second Portal',
        clueThreshold: 4,
        cluesPerInvestigator: true,
        advanceTiming: 'anytime',
      },
      { code: W.acts[3], name: 'The Final Gate', ...objective },
    ],
    encounterDeck: deck,
    setAside: [
      messengerFlame,
      messengerKing,
      ...copies(candlejack, 2),
      ...copies(molten, 2),
      ...copies(fireVampire, 2),
      ...copies(byakhee, 2),
      { ...acolyte },
      ...(crowd ? [{ ...protagonist }] : []),
      ...(siteRow ? [siteOfUnbinding] : []),
      ...remaining.filter((e) => !chosen.includes(e)),
    ],
    chaosBag: plaguebearerChaosBag(difficulty, log),
    tokenValues: { skull: 0, cultist: -4, tablet: -2, elderThing: -3 },
    setup: [
      ...TOWN.filter((r) => !log?.values[`plaguebearerTown${r.id}`]).flatMap((r) => [
        specific('night.recordTown', { location: r.id, status: town[r.id]! }),
        recordNote(`plaguebearerTown${r.id}${town[r.id]}`),
      ]),
      specific('war.intro'),
      ...(siteRow
        ? [
            {
              type: 'PlaceSetAsideTreachery' as const,
              code: W.site,
              placement: { type: 'location' as const, location: siteLocationId(siteRow.id, town) },
            },
          ]
        : []),
      ...(has('plaguebearerVisionOfPortals') ? [specific('war.vision')] : []),
      specific('war.rally'),
      specific('war.spread', { group: 'miasma', kind: 'horror' }),
      specific('war.spread', { group: 'miasma', kind: 'damage' }),
      specific('war.spread', { group: 'stable', kind: 'horror' }),
      specific('war.spread', { group: 'stable', kind: 'damage' }),
      specific('war.spawnAt', { code: W.acolyte, kind: 'damage' }),
      ...(crowd ? [specific('war.spawnAt', { code: W.protagonist, kind: 'horror' })] : []),
      ...Array.from({ length: 2 - chosen.length }, () => specific('war.replaceElite')),
    ],
  }
}
const siteLocationId = (rowId: string, town: Record<string, 'Defended' | 'Infected'>) => {
  const row = TOWN.find((r) => r.id === rowId)!
  return town[rowId] === 'Infected' ? row.ruin : row.stable
}
const objective = {
  clueThreshold: 0,
  cluesPerInvestigator: false,
  advanceTiming: 'objective' as const,
}

// ---------------------------------------------------------------------------
// Introducción y preparación (guía ES p. 16 / EN pp. 19–20)
// ---------------------------------------------------------------------------

const story = (key: string, effects: { key: string }[] = []): Message => ({
  type: 'Story',
  entry: {
    title: 'story.plaguebearer.war.introTitle',
    body: `story.plaguebearer.war.${key}`,
    ...(effects.length ? { effects } : {}),
  },
})
// Guerra al atardecer 1 → (Herbert West) → 3; la 2 no indica destino y lleva también a la 3.
on('war.intro', (s) =>
  push(
    s,
    ...(note(s, 'plaguebearerWestReagent') ? [specific('war.offerWest')] : []),
    story('intro3'),
  ),
)
on('war.offerWest', (s) =>
  ask(
    s,
    lead(s),
    [
      ...s.investigators.map((i): Choice => ({
        label: 'choice.investigator',
        params: { name: i.name },
        target: { type: 'investigator', id: i.id },
        then: [
          { type: 'AddStoryAsset', investigator: i.id, code: D.west },
          specific('war.shuffleIn', { investigator: i.id, code: D.west }),
        ],
      })),
      { label: 'choice.skip', then: [] },
    ],
    'prompt.plaguebearer.war.west',
  ),
)
// La carta entra en el mazo ya en este escenario (no cuenta para su tamaño).
on('war.shuffleIn', (s, d) => {
  const by = String(d.investigator)
  const i = getInvestigator(s, by)
  const [index, rng] = nextInt(s.rng, i.deck.length + 1)
  const deck = [...i.deck]
  deck.splice(index, 0, String(d.code))
  return {
    ...s,
    rng,
    investigators: s.investigators.map((x) => (x.id === by ? { ...x, deck } : x)),
  }
})
on('war.vision', (s) =>
  push(
    s,
    ...s.investigators.map((i): Message => ({ type: 'GainClues', investigator: i.id, amount: 2 })),
  ),
)
/** Apoyos de historia en los Lugares Protegidos y Hibb (Ya ha tenido suficiente). */
on('war.rally', (s) => {
  const out: Message[] = []
  for (const row of TOWN) {
    if (!note(s, `plaguebearerTown${row.id}Rallied`) || row.id === HIBBS_ROW) continue
    const location = inPlay(s, row.id)
    const asset = RALLY_ASSETS[row.id]!
    if (location)
      out.push({
        type: 'PlaceAsset',
        code: asset.code,
        name: asset.name,
        placement: { type: 'location', location },
      })
  }
  if (note(s, `plaguebearerTown${HIBBS_ROW}Rallied`)) out.push(specific('war.hibbs', { index: 0 }))
  return push(s, ...out)
})
// Cada investigador puede poner en juego a Hibb (Listo para ayudar) desde su mazo; si nadie
// lo hace, Hibb (Ya ha tenido suficiente) espera en el Motel. Cada versión de Hibb es única.
on('war.hibbs', (s, d) => {
  const index = Number(d.index)
  const helping = Object.values(s.assets).some((a) => a.code === HIBBS_HELPING)
  if (helping) return s
  const i = s.investigators[index]
  if (!i) {
    const location = inPlay(s, HIBBS_ROW)
    return location
      ? push(s, {
          type: 'PlaceAsset',
          code: W.hibbs,
          name: 'Hibbs',
          placement: { type: 'location', location },
        })
      : s
  }
  const next = specific('war.hibbs', { index: index + 1 })
  if (!i.deck.includes(HIBBS_HELPING)) return push(s, next)
  return ask(
    s,
    i.id,
    [
      {
        label: 'choice.plaguebearer.war.hibbs',
        then: [specific('noon.fromDeck', { investigator: i.id, code: HIBBS_HELPING }), next],
      },
      { label: 'choice.skip', then: [next] },
    ],
    'prompt.plaguebearer.war.hibbs',
  )
})
/**
 * «Coloca 1 horror y 1 daño entre los Lugares Miasma (o Seguros), divididos de la manera más
 * equitativa posible»: cada ficha va a un Lugar del grupo con menos fichas; decide el jefe.
 */
on('war.spread', (s, d) => {
  const group = Object.keys(s.locations).filter((id) =>
    d.group === 'stable' ? isStable(id) : isMiasma(s, id),
  )
  if (!group.length) return s
  // Solo cuentan el daño y el horror que reparte esta preparación (no las pistas).
  const placed = (id: string) => locationDamage(s, id) + locationHorror(s, id)
  const fewest = Math.min(...group.map(placed))
  const options = group.filter((id) => placed(id) === fewest)
  const kind = String(d.kind) as TokenKind
  if (options.length === 1) return push(s, tokens(options[0]!, kind, 1))
  return ask(
    s,
    lead(s),
    options.map((id) => ({
      label: 'choice.location',
      params: { location: s.locations[id]!.name },
      target: { type: 'location' as const, id },
      then: [tokens(id, kind, 1)],
    })),
    `prompt.plaguebearer.war.spread.${kind}`,
  )
})
/** Lugares con más daño u horror (instrucciones de aparición de los enemigos del VI). */
export const mostTokens = (s: GameState, kind: 'damage' | 'horror') => {
  const ids = Object.keys(s.locations)
  const top = Math.max(0, ...ids.map((id) => amountOf(s, id, kind)))
  return ids.filter((id) => amountOf(s, id, kind) === top)
}
on('war.spawnAt', (s, d) => {
  const code = String(d.code)
  const options = mostTokens(s, d.kind === 'horror' ? 'horror' : 'damage')
  if (options.length === 1)
    return push(s, { type: 'SpawnSetAsideEnemy', code, location: options[0]! })
  return ask(
    s,
    lead(s),
    options.map((id) => ({
      label: 'choice.location',
      params: { location: s.locations[id]!.name },
      target: { type: 'location' as const, id },
      then: [{ type: 'SpawnSetAsideEnemy' as const, code, location: id }],
    })),
    'prompt.plaguebearer.war.spawn',
  )
})
// Por cada Élite Infectado que falte, el jefe baraja un Vampiro de fuego o un Byakhee chillador.
on('war.replaceElite', (s) => {
  const options = [S.fireVampire, SETS.screechingByakhee].filter((code) =>
    s.setAside.some((c) => c.code === code),
  )
  return ask(
    s,
    lead(s),
    options.map((code) => ({
      label: `choice.plaguebearer.war.replace.${code === S.fireVampire ? 'vampire' : 'byakhee'}`,
      then: [specific('war.shuffleOne', { code })],
    })),
    'prompt.plaguebearer.war.replaceElite',
  )
})
on('war.shuffleOne', (s, d) => {
  const index = s.setAside.findIndex((c) => c.code === String(d.code))
  if (index < 0) return s
  const [deck, rng] = shuffle([...s.encounterDeck, s.setAside[index]!], s.rng)
  return { ...s, rng, encounterDeck: deck, setAside: s.setAside.filter((_, n) => n !== index) }
})

// ---------------------------------------------------------------------------
// Conexiones, velo y Portales
// ---------------------------------------------------------------------------

const warConnections: NonNullable<ScenarioBehavior['connections']> = (s, l) =>
  l.id === W.crater
    ? Object.keys(s.locations).filter((id) => id !== W.crater && isMiasma(s, id))
    : isMiasma(s, l.id) && s.locations[W.crater]
      ? [W.crater]
      : []
const warShroud: NonNullable<ScenarioBehavior['shroudModifier']> = (s, l) =>
  l.id === W.flame && l.revealed
    ? 2 * locationDamage(s, l.id)
    : l.id === W.king && l.revealed
      ? 2 * locationHorror(s, l.id)
      : 0
// «No sabes dónde se encuentra el Portal»: sin revelar no se puede entrar.
const warCanEnter: NonNullable<ScenarioBehavior['canEnter']> = (s, _by, _from, to) =>
  !isPortal(to) || !!s.locations[to]?.revealed
for (const [code, kind] of [
  [W.flame, 'damage'],
  [W.king, 'horror'],
] as const)
  registerLocation({
    code,
    forced: (s, t, self) =>
      self.revealed && t.type === 'turnBegins' && at(s, t.investigator) === self.id
        ? [specific('war.portalTurn', { investigator: t.investigator, location: self.id, kind })]
        : [],
  })
on('war.portalTurn', (s, d) => {
  const by = String(d.investigator),
    location = String(d.location),
    kind = String(d.kind) as 'damage' | 'horror'
  return ask(
    s,
    by,
    [
      {
        label: `choice.plaguebearer.war.take.${kind}`,
        then: [kind === 'damage' ? damage(by, 1) : damage(by, 0, 1)],
      },
      {
        label: `choice.plaguebearer.war.place.${kind}`,
        params: { location: s.locations[location]?.name ?? '' },
        then: [tokens(location, kind, 1)],
      },
    ],
    'prompt.plaguebearer.war.portal',
  )
})

// ---------------------------------------------------------------------------
// Planes
// ---------------------------------------------------------------------------

const agendaStory = (n: number, branch = ''): Message => ({
  type: 'Story',
  entry: {
    title: `story.plaguebearer.war.agenda${n}bTitle`,
    body: `story.plaguebearer.war.agenda${n}b${branch}`,
  },
})
/** Ataque efectivo: incluye los Mensajeros (+1) y los Élite de Arkham caído. */
const attackOf = (s: GameState, e: Enemy) => ({
  damage: e.damage + warDamageModifier(s, e),
  horror: e.horror + warHorrorModifier(s, e),
})
const messengerOut = (s: GameState, code: string) =>
  Object.values(s.enemies).some((e) => e.code === code)
const warDamageModifier = (s: GameState, e: Enemy) =>
  (e.code !== W.messengerFlame && messengerOut(s, W.messengerFlame) ? 1 : 0) +
  fallenEliteDamage(s, e)
const warHorrorModifier = (s: GameState, e: Enemy) =>
  (e.code !== W.messengerKing && messengerOut(s, W.messengerKing) ? 1 : 0) + fallenEliteHorror(s, e)
// Forzado de los tres planes al final de la ronda.
on('war.enemyTokens', (s) => {
  const target = unbindingLocations(s)[0]
  const out: Message[] = []
  for (const e of Object.values(s.enemies)) {
    if (!e.location || !s.locations[e.location]) continue
    const { damage: d, horror: h } = attackOf(s, e)
    if (d === h) continue
    const kind = d > h ? 'damage' : 'horror'
    // Mensajeros: su propia ficha va a un Lugar Liberación en vez de a su Lugar.
    const redirect =
      (kind === 'damage' && e.code === W.messengerFlame) ||
      (kind === 'horror' && e.code === W.messengerKing)
    out.push(tokens(redirect && target ? target : e.location, kind, 1))
  }
  return push(s, ...out)
})
on('war.unbindingDoom', (s) => {
  const crater = s.locations[W.crater] ? Math.floor(tokensOn(s, W.crater) / 4) : 0
  const site = siteLocation(s)
  const fromSite = site ? Math.floor(nonClueTokens(s, site) / 4) : 0
  const doom = crater + fromSite
  return doom ? push(s, { type: 'PlaceDoom', amount: doom }) : s
})
on('war.objective', (s) => {
  if (act(s) !== W.acts[1] && act(s) !== W.acts[3]) return s
  const open = [W.flame, W.king].filter((id) => s.locations[id]?.revealed)
  return open.some((id) => tokensOn(s, id) === 0) ? push(s, { type: 'AdvanceAct' }) : s
})
// Planes 2 y 3: al final de tu turno, con 4+ daño u horror aquí, mueve 1 ficha a la Liberación.
on('war.overflow', (s, d) => {
  const by = String(d.investigator),
    here = at(s, by)
  const target = unbindingLocations(s).find((id) => id !== here)
  if (!here || !target) return s
  if (locationDamage(s, here) < 4 && locationHorror(s, here) < 4) return s
  const kinds = kindsOn(s, here)
  const move = (kind: TokenKind) => [tokens(here, kind, -1), tokens(target, kind, 1)]
  if (kinds.length === 1) return push(s, ...move(kinds[0]!))
  return ask(
    s,
    by,
    kinds.map((kind) => ({
      label: `choice.plaguebearer.war.kind.${kind}`,
      then: move(kind),
    })),
    'prompt.plaguebearer.war.overflow',
  )
})
registerAgenda({
  code: W.agendas[0],
  onAdvance: () => [
    agendaStory(1),
    specific('war.reinforce', { codes: [W.candlejack, W.molten].join(',') }),
  ],
})
// Plan 1b: añade las copias apartadas y la pila de descartes al mazo de encuentros.
on('war.reinforce', (s, d) => {
  const codes = String(d.codes).split(',')
  const added = s.setAside.filter((c) => codes.includes(c.code))
  const [deck, rng] = shuffle([...s.encounterDeck, ...added, ...s.encounterDiscard], s.rng)
  return {
    ...s,
    rng,
    encounterDeck: deck,
    encounterDiscard: [],
    setAside: s.setAside.filter((c) => !codes.includes(c.code)),
  }
})
registerAgenda({
  code: W.agendas[1],
  onAdvance: (s) => {
    const { damage: d, horror: h } = totals(s)
    // EN: más horror que daño → Byakhee (ES invierte la condición; se aplica EN).
    return h > d
      ? [agendaStory(2), specific('war.spawnFoe', { code: SETS.screechingByakhee, row: '78024' })]
      : [agendaStory(2), specific('war.spawnFoe', { code: S.fireVampire, row: '78028' })]
  },
})
on('war.spawnFoe', (s, d) =>
  s.setAside.some((c) => c.code === String(d.code))
    ? push(s, {
        type: 'SpawnSetAsideEnemy',
        code: String(d.code),
        location: fallback(s, String(d.row)),
      })
    : s,
)
registerAgenda({
  code: W.agendas[2],
  onAdvance: (s) => {
    const { damage: d, horror: h } = totals(s)
    return [
      agendaStory(3, h > d ? 'Horror' : 'Flame'),
      { type: 'EndScenario', outcome: { type: 'resolution', resolution: h > d ? 1 : 2 } },
    ]
  },
})

// ---------------------------------------------------------------------------
// Actos
// ---------------------------------------------------------------------------

const actStory = (n: number, branch = ''): Message => ({
  type: 'Story',
  entry: {
    title: `story.plaguebearer.war.act${n}bTitle`,
    body: `story.plaguebearer.war.act${n}b${branch}`,
  },
})
const revealPortal = (portal: string, amount: number): Message[] => [
  { type: 'RevealLocation', location: portal },
  tokens(portal, portal === W.flame ? 'damage' : 'horror', amount),
]
registerAct({
  code: W.acts[0],
  onAdvance: () => [specific('war.split')],
})
on('war.split', (s) =>
  ask(
    s,
    lead(s),
    (['Flame', 'King'] as const).map((side) => ({
      label: `choice.plaguebearer.war.split${side}`,
      then: [
        { type: 'SetScenarioMeta', key: 'warChose', value: side } as Message,
        actStory(1, side),
        ...revealPortal(side === 'Flame' ? W.flame : W.king, 1),
      ],
    })),
    'prompt.plaguebearer.war.split',
  ),
)
registerAct({
  code: W.acts[1],
  objectiveMet: () => false,
  onAdvance: (s) => closePortal(s, 2),
})
registerAct({
  code: W.acts[2],
  onAdvance: (s) =>
    [W.flame, W.king]
      .filter((id) => s.locations[id] && !s.locations[id]!.revealed)
      .flatMap((id) => [actStory(3, id === W.flame ? 'Flame' : 'King'), ...revealPortal(id, 2)]),
})
registerAct({
  code: W.acts[3],
  objectiveMet: () => false,
  onAdvance: (s) => closePortal(s, 4),
})
/** Actos 2b y 4b: se cierra el Portal revelado que no tiene fichas. */
function closePortal(s: GameState, n: 2 | 4): Message[] {
  const closed = [W.flame, W.king].find((id) => s.locations[id]?.revealed && tokensOn(s, id) === 0)
  if (!closed) return []
  const side = closed === W.flame ? 'Flame' : 'King'
  if (n === 4)
    return [
      actStory(4, side),
      { type: 'EndScenario', outcome: { type: 'resolution', resolution: 3 } },
    ]
  return [actStory(2, side), specific('war.close', { portal: closed })]
}
on('war.close', (s, d) => {
  const portal = String(d.portal)
  const flame = portal === W.flame
  const codes: readonly string[] = flame ? FLAME_CARDS : KING_CARDS
  const exit = fallback(s, flame ? '78028' : '78024')
  const other = flame ? W.king : W.flame
  const strip = (cards: EncounterCard[]) => cards.filter((c) => !codes.includes(c.code))
  const next: GameState = {
    ...s,
    encounterDeck: strip(s.encounterDeck),
    encounterDiscard: strip(s.encounterDiscard),
    // También las copias apartadas: el plan 1b no debe devolverlas al mazo.
    setAside: strip(s.setAside),
  }
  return push(
    next,
    ...Object.values(s.enemies)
      .filter((e) => codes.includes(e.code))
      .map((e): Message => ({ type: 'RemoveEnemyFromGame', enemy: e.id })),
    ...Object.values(s.treacheries)
      .filter((t) => codes.includes(t.code) && t.placement.type !== 'limbo')
      .map((t): Message => ({ type: 'DiscardTreachery', treachery: t.id })),
    specific('war.stripDiscard', { codes: codes.join(',') }),
    ...activeInvestigators(s)
      .filter((i) => i.location === portal)
      .map((i): Message => ({
        type: 'MoveTo',
        investigator: i.id,
        location: exit,
        unpreventable: true,
      })),
    specific('war.toVictory', { location: portal }),
    {
      type: 'SpawnSetAsideEnemy',
      code: flame ? W.messengerKing : W.messengerFlame,
      location: other,
    },
  )
})
on('war.stripDiscard', (s, d) => {
  const codes = String(d.codes).split(',')
  return { ...s, encounterDiscard: s.encounterDiscard.filter((c) => !codes.includes(c.code)) }
})
on('war.toVictory', (s, d) => {
  const id = String(d.location),
    l = s.locations[id]
  if (!l) return s
  return push(
    {
      ...s,
      victoryDisplay: [...s.victoryDisplay, id],
      victoryPoints: (s.victoryPoints ?? 0) + (l.victory ?? 0),
      locations: { ...s.locations, [id]: { ...l, victory: 0 } },
    },
    { type: 'RemoveLocation', location: id },
  )
})

/** Capacidad [action] de los cuatro actos: prueba de [willpower] o [agility] (X), X ≤ 4. */
function actAbility(s: GameState, by: string) {
  if (!at(s, by) || meta(s, `warActBlocked:${by}`) === s.round) return []
  return [
    {
      key: 'war:act',
      label: 'ability.plaguebearer.war.act',
      actions: 1,
      provokes: true,
      then: [specific('war.actX', { investigator: by })],
    },
  ]
}
on('war.actX', (s, d) => {
  const by = String(d.investigator)
  return ask(
    s,
    by,
    [1, 2, 3, 4].flatMap((x) =>
      (['willpower', 'agility'] as SkillType[]).map((skill) => ({
        label: `choice.plaguebearer.war.actTest.${skill}`,
        params: { amount: x },
        then: [
          effectTest(by, W.acts[0], skill, x, {
            onSuccess: [specific('war.actSuccess', { investigator: by, amount: x })],
          }),
        ],
      })),
    ),
    'prompt.plaguebearer.war.actX',
  )
})
on('war.actSuccess', (s, d) => {
  const by = String(d.investigator),
    here = at(s, by),
    x = Number(d.amount)
  if (!here) return s
  const clue: Message = { type: 'PlaceCluesOnLocationFromPool', location: here, amount: 1 }
  const kinds = kindsOn(s, here)
  if (!kinds.length) return push(s, clue)
  return ask(
    s,
    by,
    kinds.map((kind) => ({
      label: `choice.plaguebearer.war.return.${kind}`,
      params: { amount: Math.min(x, amountOf(s, here, kind)) },
      then: [tokens(here, kind, -x), clue],
    })),
    'prompt.plaguebearer.war.return',
  )
})

// ---------------------------------------------------------------------------
// Apoyos de historia: Defender (límite de grupo de una vez por partida)
// ---------------------------------------------------------------------------

const RALLY = Object.values(RALLY_ASSETS)
registerPlayerCards(
  RALLY.map((a) => ({
    code: a.code,
    name: a.name,
    subname: a.subname,
    type: 'asset' as const,
    class: 'neutral' as const,
    story: true,
    unique: true,
    traits: RALLY_TRAITS[a.code] ?? ['Arkham', 'Human'],
    slots: [],
    icons: {},
  })),
)
const DEFEND_TAG = 'plaguebearer:defend'
for (const asset of RALLY)
  registerPlayerCard({
    code: asset.code,
    placedAbilities: (s, self, by) => {
      if (self.faceDown || placedLocation(s, self) !== at(s, by)) return []
      if (meta(s, `warDefended:${asset.code}`) === 1) return []
      const skills: SkillType[] =
        asset.metric === 'skill' ? ['willpower', 'intellect', 'combat', 'agility'] : ['intellect']
      return skills.map((skill) => ({
        key: `${self.id}:defend:${skill}`,
        label:
          asset.metric === 'skill'
            ? `ability.plaguebearer.war.defendSkill.${skill}`
            : 'ability.plaguebearer.war.defend',
        params: { name: asset.name, difficulty: asset.difficulty },
        actions: 1,
        provokes: true,
        then: [
          { type: 'SetScenarioMeta' as const, key: `warDefended:${asset.code}`, value: 1 },
          {
            type: 'BeginSkillTest' as const,
            investigator: by,
            skill,
            skillSelected: asset.metric !== 'skill',
            difficulty: asset.difficulty,
            tags: [DEFEND_TAG],
            kind: {
              type: 'effect' as const,
              source: asset.code,
              onSuccess: [],
              onFail: [],
              onFailEach: [],
            },
          },
        ],
      }))
    },
  })
const fixedWarDefend = (test: SkillTest | null | undefined) =>
  isDefend(test) &&
  test?.kind.type === 'effect' &&
  test.kind.source !== W.hibbs &&
  RALLY.some((a) => a.code === (test.kind as { source: string }).source)
const warDefendValue = (s: GameState, test: SkillTest) => {
  if (!fixedWarDefend(test) || test.kind.type !== 'effect') return undefined
  const source = test.kind.source
  const asset = RALLY.find((a) => a.code === source)
  return asset ? defendMetric(s, test.investigator, asset.metric) : undefined
}
/** Por cada punto de éxito, retira 1 ficha de cualquier Lugar (máximo 6). */
on('war.remove', (s, d) => {
  const by = String(d.investigator),
    left = Number(d.left)
  if (left <= 0) return s
  const options = Object.keys(s.locations).flatMap((id) =>
    kindsOn(s, id).map((kind) => ({
      label: `choice.plaguebearer.war.remove.${kind}`,
      params: { location: s.locations[id]!.name },
      target: { type: 'location' as const, id },
      then: [tokens(id, kind, -1), specific('war.remove', { investigator: by, left: left - 1 })],
    })),
  )
  return options.length
    ? ask(
        s,
        by,
        [...options, { label: 'choice.plaguebearer.war.stop', then: [] }],
        'prompt.plaguebearer.war.remove',
      )
    : s
})

// ---------------------------------------------------------------------------
// Enemigos
// ---------------------------------------------------------------------------

for (const [enemy, kind] of [
  [acolyte, 'damage'],
  [molten, 'damage'],
  [protagonist, 'horror'],
  [candlejack, 'horror'],
] as const)
  registerEnemy({ code: enemy.code, spawn: (s) => mostTokens(s, kind) })
// Asesino fundente: tras atacarte, pierdes recursos o descartas cartas igual al horror del Lugar.
on('war.molten', (s, d) => {
  const by = String(d.investigator),
    x = Number(d.amount)
  if (x <= 0) return s
  const i = getInvestigator(s, by)
  return ask(
    s,
    by,
    [
      {
        label: 'choice.plaguebearer.war.loseResources',
        params: { amount: x },
        then: [{ type: 'LoseResources', investigator: by, amount: x }],
      },
      {
        label: 'choice.plaguebearer.war.discardCards',
        params: { amount: x },
        then: i.hand.length
          ? [
              {
                type: 'ChooseDiscardFromHand',
                investigator: by,
                amount: Math.min(x, i.hand.length),
              },
            ]
          : [],
      },
    ],
    'prompt.plaguebearer.war.molten',
  )
})
// Acólito infernal: al ser derrotado, X daño repartido entre los investigadores de su Lugar.
on('war.acolyte', (s, d) => {
  const left = Number(d.left),
    location = String(d.location),
    by = String(d.by)
  const here = activeInvestigators(s).filter((i) => i.location === location)
  if (left <= 0 || !here.length) return s
  if (here.length === 1) return push(s, damage(here[0]!.id, left))
  return ask(
    s,
    here.some((i) => i.id === by) ? by : lead(s),
    here.map((i) => ({
      label: 'choice.investigator',
      params: { name: i.name },
      target: { type: 'investigator' as const, id: i.id },
      then: [damage(i.id, 1), specific('war.acolyte', { left: left - 1, location, by })],
    })),
    'prompt.plaguebearer.war.acolyte',
  )
})
registerEnemy({
  code: W.protagonist,
  forced: (s, t, e) =>
    t.type === 'enemyPhaseEnds' && !e.exhausted && locationHorror(s, e.location) > 0
      ? activeInvestigators(s)
          .filter((i) => i.location === e.location)
          .map((i): Message => ({
            type: 'EnemyAttack',
            enemy: e.id,
            investigator: i.id,
            exhaustAfter: false,
          }))
      : [],
})

// ---------------------------------------------------------------------------
// Traiciones
// ---------------------------------------------------------------------------

const discard = (id: string): Message => ({ type: 'DiscardTreachery', treachery: id })
registerTreachery({
  code: W.burst,
  revelation: (_s, by) => [effectTest(by, W.burst, 'agility', 5, {})],
})
registerTreachery({
  code: W.dread,
  revelation: (_s, by) => [effectTest(by, W.dread, 'willpower', 5, {})],
})
// Por cada punto de fallo: recibe 1 (daño u horror) o colócalo en tu Lugar.
on('war.share', (s, d) => {
  const by = String(d.investigator),
    n = Number(d.amount),
    kind = String(d.kind) as 'damage' | 'horror'
  const here = at(s, by)
  if (!here || n <= 0) return s
  return ask(
    s,
    by,
    Array.from({ length: n + 1 }, (_, placed) => ({
      label: `choice.plaguebearer.war.share.${kind}`,
      params: { placed, taken: n - placed },
      then: [
        ...(placed ? [tokens(here, kind, placed)] : []),
        ...(n - placed
          ? [kind === 'damage' ? damage(by, n - placed) : damage(by, 0, n - placed)]
          : []),
      ],
    })),
    `prompt.plaguebearer.war.share.${kind}`,
  )
})
for (const [code, kind] of [
  [W.unreal, 'horror'],
  [W.flaming, 'damage'],
] as const)
  registerTreachery({
    code,
    revelation: (s, by) => {
      const here = at(s, by)
      if (!here) return []
      return amountOf(s, here, kind) >= 4
        ? [{ type: 'PlaceDoom', amount: 1 }, { type: 'CheckAgenda' }]
        : [tokens(here, kind, 2)]
    },
  })
registerTreachery({
  code: W.site,
  // No puede abandonar el juego: se queda en el Lugar al que está vinculado.
  revelation: () => [],
})
// Escucha la llamada: [willpower] (3); quien ha escuchado la llamada revela una ficha más.
registerTreachery({
  code: W.heed,
  revelation: (_s, by) => [effectTest(by, W.heed, 'willpower', 3, {})],
})
on('war.heed', (s, d) => {
  const by = String(d.investigator),
    left = Number(d.left)
  if (left <= 0) return s
  const next = specific('war.heed', { investigator: by, left: left - 1 })
  const here = at(s, by)
  const targets = unbindingLocations(s)
  const choices: Choice[] = []
  if (here && !targets.includes(here)) {
    const distance = (id: string) =>
      Math.min(...targets.map((to) => distancesFrom(s, id).get(to) ?? Infinity))
    const current = distance(here)
    for (const id of s.locations[here]!.connections.filter(
      (id) => s.locations[id] && distance(id) < current,
    ))
      choices.push({
        label: 'choice.plaguebearer.war.heedMove',
        params: { location: s.locations[id]!.name },
        target: { type: 'location', id },
        then: [{ type: 'MoveTo', investigator: by, location: id }, next],
      })
  }
  for (const id of Object.keys(s.locations).filter(
    (id) => s.locations[id]!.revealed && isMiasma(s, id),
  )) {
    const effect: Message | undefined = TOWN.some((r) => r.ruin === id)
      ? specific('night.ruinedTurn', { investigator: by, location: id })
      : isPortal(id)
        ? specific('war.portalTurn', {
            investigator: by,
            location: id,
            kind: id === W.flame ? 'damage' : 'horror',
          })
        : undefined
    if (effect)
      choices.push({
        label: 'choice.plaguebearer.war.heedForced',
        params: { location: s.locations[id]!.name },
        target: { type: 'location', id },
        then: [effect, next],
      })
  }
  return choices.length ? ask(s, by, choices, 'prompt.plaguebearer.war.heed') : s
})
// La ira del Desatado: mueve 1 daño u horror de tu Lugar a una carta que controles.
registerTreachery({
  code: W.ire,
  revelation: (_s, by, self) => [
    {
      type: 'PlaceTreachery',
      treachery: self.id,
      placement: { type: 'threatArea', investigator: by },
    },
  ],
  forced: (s, t, self) => {
    if (self.placement.type !== 'threatArea') return []
    const owner = self.placement.investigator
    if ((t.type === 'afterMove' || t.type === 'turnBegins') && t.investigator === owner) {
      const here = at(s, owner)
      return here && (locationDamage(s, here) > 0 || locationHorror(s, here) > 0)
        ? [specific('war.ire', { investigator: owner, location: here })]
        : []
    }
    if (t.type === 'turnEnds' && t.investigator === owner && meta(s, `warIre:${owner}`) !== s.round)
      return [discard(self.id)]
    return []
  },
})
on('war.ire', (s, d) => {
  const by = String(d.investigator),
    here = String(d.location)
  const kinds = (['damage', 'horror'] as const).filter((k) => amountOf(s, here, k) > 0)
  const move = (kind: 'damage' | 'horror'): Message[] => [
    tokens(here, kind, -1),
    kind === 'damage' ? damage(by, 1) : damage(by, 0, 1),
  ]
  if (kinds.length === 1) return push(s, ...move(kinds[0]!))
  return ask(
    s,
    by,
    kinds.map((kind) => ({ label: `choice.plaguebearer.war.kind.${kind}`, then: move(kind) })),
    'prompt.plaguebearer.war.ire',
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
on('war.elderThing', (s, d) => {
  const times = d.perPoint ? failedBy(s) : 1
  const each = activeInvestigators(s).filter((i) => heeded(s, i.id))
  return push(
    s,
    ...Array.from({ length: times }, () =>
      each.map((i) => specific('war.placeOne', { investigator: i.id })),
    ).flat(),
  )
})
on('war.placeOne', (s, d) => {
  const by = String(d.investigator),
    here = at(s, by)
  if (!here) return s
  return ask(
    s,
    by,
    (['horror', 'damage'] as const).map((kind) => ({
      label: `choice.plaguebearer.war.place.${kind}`,
      params: { location: s.locations[here]!.name },
      then: [tokens(here, kind, 1)],
    })),
    'prompt.plaguebearer.war.elderThing',
  )
})
on('war.cultist', (s, d) => {
  const by = String(d.investigator),
    here = at(s, by)
  if (!here) return s
  const kinds = kindsOn(s, here)
  return ask(
    s,
    by,
    [
      ...kinds.map((kind) => ({
        label: `choice.plaguebearer.war.return.${kind}`,
        params: { amount: 1 },
        then: [tokens(here, kind, -1)],
      })),
      { label: 'choice.skip', then: [] },
    ],
    'prompt.plaguebearer.war.cultist',
  )
})
const warTokens: NonNullable<ScenarioBehavior['tokenEffect']> = (s, token, by) => {
  if (token === 'skull') {
    const most = Math.max(
      0,
      ...Object.keys(s.locations).map((id) =>
        Math.max(locationDamage(s, id), locationHorror(s, id)),
      ),
    )
    return { modifier: -Math.min(hard(s) ? 6 : 4, most) }
  }
  if (token === 'cultist' && bloodInVeins(s)) return { modifier: 0, autoFail: true }
  if (token === 'cultist')
    return {
      modifier: hard(s) ? -5 : -4,
      onSuccess: [specific('war.cultist', { investigator: by })],
    }
  if (token === 'tablet')
    return {
      modifier: hard(s) ? -3 : -2,
      onFail: [{ type: 'SetScenarioMeta', key: `warActBlocked:${by}`, value: s.round }],
    }
  if (token === 'elderThing')
    return { modifier: -3, onFail: [specific('war.elderThing', { perPoint: hard(s) })] }
  throw new Error(`The Afternoon War: token ${token} is not implemented`)
}

// ---------------------------------------------------------------------------
// Forzados del escenario
// ---------------------------------------------------------------------------

function warForced(
  s: GameState,
  t: Parameters<NonNullable<ScenarioBehavior['forced']>>[1],
): Message[] {
  const elite = fallenEliteForced(s, t)
  if (elite.length) return elite
  switch (t.type) {
    case 'roundEnds':
      return [specific('war.enemyTokens'), specific('war.unbindingDoom'), specific('war.objective')]
    case 'turnEnds':
      return s.agendaIndex >= 1 ? [specific('war.overflow', { investigator: t.investigator })] : []
    case 'afterDealDamage':
      return s.activeTurn === t.investigator
        ? [{ type: 'SetScenarioMeta', key: `warIre:${t.investigator}`, value: s.round }]
        : []
    case 'afterDiscoverClues':
      return [{ type: 'SetScenarioMeta', key: `warIre:${t.investigator}`, value: s.round }]
    case 'afterRevealChaosToken': {
      const test = s.skillTest
      const source = test?.kind.type === 'effect' ? test.kind.source : undefined
      return source === W.heed && test?.tokens.length === 1 && heeded(s, t.investigator)
        ? [{ type: 'RevealChaosToken' }]
        : []
    }
    case 'afterSkillTest': {
      const test = s.skillTest
      const source = test?.kind.type === 'effect' ? test.kind.source : undefined
      if (t.succeeded && source && isDefend(test) && RALLY.some((a) => a.code === source))
        return [
          specific('war.remove', { investigator: t.investigator, left: Math.min(6, t.margin) }),
        ]
      if (!t.succeeded && source === W.burst)
        return [
          specific('war.share', {
            investigator: t.investigator,
            amount: -t.margin,
            kind: 'damage',
          }),
        ]
      if (!t.succeeded && source === W.dread)
        return [
          specific('war.share', {
            investigator: t.investigator,
            amount: -t.margin,
            kind: 'horror',
          }),
        ]
      if (!t.succeeded && source === W.heed)
        return [specific('war.heed', { investigator: t.investigator, left: -t.margin })]
      const e = t.enemy ? s.enemies[t.enemy] : undefined
      if (
        t.succeeded &&
        e?.code === W.candlejack &&
        (t.kind === 'fight' || t.kind === 'evade') &&
        locationDamage(s, e.location) > 0
      )
        return [damage(t.investigator, 0, 1)]
      return []
    }
    case 'enemyDefeated': {
      const e = t.enemy
      if (e.code === W.acolyte)
        return [
          specific('war.acolyte', {
            left: locationDamage(s, e.location),
            location: e.location,
            by: t.by ?? lead(s),
          }),
        ]
      // Portacirios pesado derrotado con el ataque: sigue siendo un combate con éxito.
      if (
        e.code === W.candlejack &&
        t.by &&
        s.skillTest?.kind.type === 'fight' &&
        locationDamage(s, e.location) > 0
      )
        return [damage(t.by, 0, 1)]
      return []
    }
    case 'afterEnemyAttack': {
      const e = s.enemies[t.enemy]
      return e?.code === W.molten
        ? [
            specific('war.molten', {
              investigator: t.investigator,
              amount: locationHorror(s, e.location),
            }),
          ]
        : []
    }
    default:
      return []
  }
}

registerScenario({
  id: AFTERNOON_WAR,
  rulesVersion: 1,
  simultaneousAssetAssignment: true,
  sequentialEnemyMovement: true,
  specific: (s, key, data) => encounterSpecific(s, key, data) ?? run(s, key, data),
  connections: warConnections,
  canEnter: warCanEnter,
  shroudModifier: warShroud,
  abilities: (s, _self, by) => actAbility(s, by),
  skillBase: warDefendValue,
  skillUnmodified: (_s, test) => fixedWarDefend(test),
  cannotCommit: (s) => fixedWarDefend(s.skillTest),
  reactions: (s, t) => townReactions(s, t),
  forced: (s, t) => warForced(s, t),
  enemyDamageModifier: warDamageModifier,
  enemyHorrorModifier: warHorrorModifier,
  enemyStat: (s, e) => byakheeStat(s, e),
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
  tokenEffect: warTokens,
  resolution: (s, outcome) => warResolution(s, outcome),
})

// ---------------------------------------------------------------------------
// Resoluciones (guía ES p. 17 / EN p. 20) y Susurros insidiosos (ES p. 17 / EN p. 21)
// ---------------------------------------------------------------------------

const resolutionStory = (n: number): Message => ({
  type: 'Story',
  entry: {
    title: `story.plaguebearer.war.resolution${n}Title`,
    body: `story.plaguebearer.war.resolution${n}`,
    effects: [{ key: `story.plaguebearer.war.resolution${n}Effect` }],
  },
})
function warResolution(
  s: GameState,
  outcome: Parameters<NonNullable<ScenarioBehavior['resolution']>>[1],
): Message[] {
  // Sin resolución porque todos fueron derrotados: Resolución 2.
  const n = outcome.type === 'resolution' ? outcome.resolution : 2
  if (n === 1 || n === 2)
    return [
      resolutionStory(n),
      specific('war.lose', { fate: n === 1 ? 'insane' : 'killed' }),
      recordNote('campaignLost'),
      endScenario({ type: 'resolution', resolution: n }),
    ]
  const eliminated = s.victoryDisplay.filter((code) => elites.some((e) => e.code === code))
  return [
    resolutionStory(3),
    { type: 'EarnExperience', amount: 0, victory: true },
    ...(s.victoryDisplay.includes(W.messengerFlame)
      ? []
      : [specific('war.touched', { kind: 'damage' })]),
    ...(s.victoryDisplay.includes(W.messengerKing)
      ? []
      : [specific('war.touched', { kind: 'horror' })]),
    ...eliminated.map((code) => recordNote(`plaguebearerEliminated${code}`)),
    specific('war.whispers', { index: 0 }),
    endScenario({ type: 'resolution', resolution: 3 }),
  ]
}
on('war.lose', (s, d) =>
  s.campaignLog
    ? {
        ...s,
        campaignLog: {
          ...s.campaignLog,
          investigators: Object.fromEntries(
            Object.entries(s.campaignLog.investigators).map(([id, r]) => [
              id,
              s.investigators.some((i) => i.id === id)
                ? d.fate === 'insane'
                  ? { ...r, insane: true }
                  : { ...r, killed: true }
                : r,
            ]),
          ),
        },
      }
    : s,
)
/**
 * Tocado por la Llama / por la Locura: el Lugar de Arkham (no Liberación) con más daño u
 * horror. Solo los ocho Lugares de Arkham tienen entrada en el registro; empates, el jefe.
 */
on('war.touched', (s, d) => {
  const kind = d.kind === 'horror' ? 'horror' : 'damage'
  const unbinding = unbindingLocations(s)
  const ids = Object.keys(s.locations).filter((id) => rowOf(id) && !unbinding.includes(id))
  if (!ids.length) return s
  const top = Math.max(...ids.map((id) => amountOf(s, id, kind)))
  const options = ids.filter((id) => amountOf(s, id, kind) === top)
  const mark = (id: string) =>
    recordNote(`plaguebearerTown${rowOf(id)!.id}${kind === 'damage' ? 'Flame' : 'Madness'}Touched`)
  if (options.length === 1) return push(s, mark(options[0]!))
  return ask(
    s,
    lead(s),
    options.map((id) => ({
      label: 'choice.location',
      params: { location: s.locations[id]!.name },
      target: { type: 'location' as const, id },
      then: [mark(id)],
    })),
    `prompt.plaguebearer.war.touched.${kind}`,
  )
})
// Texto oculto: cualquiera puede leer un recuadro; solo el primero puede cambiar una ficha.
on('war.whispers', (s, d) => {
  const index = Number(d.index),
    i = s.investigators[index]
  if (!i) return s
  const next = specific('war.whispers', { index: index + 1 })
  const first = meta(s, 'warWhispersRead') !== 1
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
              title: 'story.plaguebearer.war.whispersTitle',
              body: 'story.plaguebearer.war.whispers',
              effects: [{ key: 'story.plaguebearer.war.whispersEffect' }],
            },
          },
          ...(first
            ? [
                { type: 'SetScenarioMeta', key: 'warWhispersRead', value: 1 } as Message,
                specific('war.swap', { investigator: i.id }),
              ]
            : []),
          next,
        ],
      },
      { label: 'choice.skip', then: [next] },
    ],
    'prompt.plaguebearer.war.whispers',
  )
})
/** Bolsa de la campaña: la base, las fichas añadidas y sin las retiradas por los Susurros. */
const campaignBag = (s: GameState): ChaosToken[] => [
  ...plaguebearerChaosBag(s.difficulty ?? 'standard', s.campaignLog),
  ...(s.campaignLog?.chaosTokens ?? []),
]
on('war.swap', (s, d) => {
  const by = String(d.investigator)
  const bag = campaignBag(s)
  const count = (token: ChaosToken) => bag.filter((x) => x === token).length
  const most = Math.max(count('skull'), count('tablet'))
  const options = (['skull', 'tablet'] as const).filter((t) => most > 0 && count(t) === most)
  return ask(
    s,
    by,
    [
      ...options.map((token) => ({
        label: `choice.plaguebearer.war.swap.${token}`,
        then: [
          specific('war.swapToken', { token }),
          ...s.investigators.map((i) => specific('war.healTrauma', { investigator: i.id })),
        ],
      })),
      { label: 'choice.skip', then: [] },
    ],
    'prompt.plaguebearer.war.swap',
  )
})
on('war.swapToken', (s, d) => {
  const log = s.campaignLog
  if (!log) return s
  const removed = [
    ...(log.values.plaguebearerRemovedTokens ?? '').split(',').filter(Boolean),
    String(d.token),
  ]
  return push(
    {
      ...s,
      campaignLog: {
        ...log,
        values: { ...log.values, plaguebearerRemovedTokens: removed.join(',') },
      },
    },
    { type: 'AddChaosTokens', tokens: ['cultist'] },
  )
})
on('war.healTrauma', (s, d) => {
  const by = String(d.investigator)
  const r = s.campaignLog?.investigators[by]
  if (!r) return s
  const kinds = (['physical', 'mental'] as const).filter((k) =>
    k === 'physical' ? r.physicalTrauma > 0 : r.mentalTrauma > 0,
  )
  const heal = (kind: 'physical' | 'mental'): Message =>
    specific('war.healOne', { investigator: by, kind })
  if (!kinds.length) return s
  if (kinds.length === 1) return push(s, heal(kinds[0]!))
  return ask(
    s,
    by,
    kinds.map((kind) => ({ label: `choice.plaguebearer.war.trauma.${kind}`, then: [heal(kind)] })),
    'prompt.plaguebearer.war.trauma',
  )
})
on('war.healOne', (s, d) => {
  const by = String(d.investigator)
  const log = s.campaignLog
  const r = log?.investigators[by]
  if (!log || !r) return s
  const next =
    d.kind === 'physical'
      ? { ...r, physicalTrauma: Math.max(0, r.physicalTrauma - 1) }
      : { ...r, mentalTrauma: Math.max(0, r.mentalTrauma - 1) }
  return { ...s, campaignLog: { ...log, investigators: { ...log.investigators, [by]: next } } }
})
