import {
  activeInvestigators,
  distancesFrom,
  getInvestigator,
  nextInt,
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
  isPermanent,
  shuffle,
  type AbilityOption,
  type CampaignLog,
  type Choice,
  type Difficulty,
  type EncounterCard,
  type Enemy,
  type GameState,
  type Message,
  type ReactionOption,
  type ScenarioBehavior,
  type ScenarioDefinition,
  type SkillType,
} from '@lcg/engine'
import { basicWeaknessPool } from '../decks'
import { copies, effectTest, endScenario, recordNote } from '../scenario-helpers'
import { plaguebearerChaosBag } from './campaign'
import { C, ask, bloodInVeins, damage, lead, on, run, specific } from './helpers'
import { devoted, supplicant, thrall, treacheries } from './data'
import { TOWN } from './night-data'
import { D } from './dawn-data'
import { V, lifeAndDeath } from './noon-data'
import { CONFRONTATION } from './confrontation'
import { W } from './war-data'
import {
  BAAL_SIDES,
  CRADLE,
  M,
  TOWN_SIDES,
  baalLocation,
  baalshandor,
  craterLocation,
  fleshUnbound,
  midnightLater,
  sideEnemy,
  townLocation,
  type EnemySide,
} from './midnight-data'

export const MIDNIGHT_HOUR = 'the-midnight-hour'
const hard = (s: GameState) => s.difficulty === 'hard' || s.difficulty === 'expert'
const note = (s: GameState, key: string) => !!s.campaignLog?.notes.includes(key)
const meta = (s: GameState, key: string) => s.scenarioMeta?.[key]
const setMeta = (s: GameState, key: string, value: string | number): GameState => ({
  ...s,
  scenarioMeta: { ...s.scenarioMeta, [key]: value },
})
const at = (s: GameState, id: string) => getInvestigator(s, id).location
const act = (s: GameState) => s.acts[s.actIndex]?.code
const players = (s: GameState) => s.startingInvestigatorCount || s.investigators.length
const enemyOf = (s: GameState, code: string) =>
  Object.values(s.enemies).find((e) => e.code === code)
const BINDING = 'midnightBinding'
const SIDE = (id: string) => `midnightSide:${id}`
/** Notas de este escenario (registro de campaña). */
export const MIDNIGHT = {
  boundAnew: 'plaguebearerBoundAnew',
  destroyed: 'plaguebearerDestroyed',
  youConquered: 'plaguebearerYouConqueredDeath',
  westConquered: 'plaguebearerWestConqueredDeath',
  twistedGift: 'plaguebearerTwistedGift',
} as const

// ---------------------------------------------------------------------------
// Caras de los Lugares
// ---------------------------------------------------------------------------

type Side = 'stable' | 'enemy' | 'bound' | 'rallied'
const townOf = (id: string) => TOWN_SIDES.find((t) => t.normal === id || t.rallied === id)
const enemySide = (id: string): EnemySide | undefined =>
  townOf(id)?.normal === id
    ? townOf(id)!.enemy
    : BAAL_SIDES[id]
      ? BAAL_SIDES[id]
      : id === M.crater
        ? CRADLE
        : undefined
export const sideOf = (s: GameState, id: string): Side =>
  (meta(s, SIDE(id)) as Side | undefined) ??
  (townOf(id)?.rallied === id ? 'rallied' : BAAL_SIDES[id] ? 'enemy' : 'stable')
const locationEnemy = (s: GameState, id: string) => {
  const code = enemySide(id)?.code
  return code
    ? Object.values(s.enemies).find((e) => e.code === code && e.location === id)
    : undefined
}
const isLocationEnemy = (e: Enemy) =>
  TOWN_SIDES.some((t) => t.enemy.code === e.code) || !!BAAL_SIDES[e.code] || e.code === CRADLE.code
const horrorOn = (s: GameState, id: string) => s.locations[id]?.horror ?? 0
/** Lugares Miasma: caras de enemigo, Atado (Miasma) y el Lugar de Baalshandor en el acto 1. */
export const isMiasma = (s: GameState, id: string) => {
  const side = sideOf(s, id)
  if (side === 'enemy' || BAAL_SIDES[id]) return true
  const b = enemyOf(s, M.baalshandor)
  return act(s) === M.acts.death && !!b && b.location === id
}
const isStable = (s: GameState, id: string) =>
  sideOf(s, id) === 'stable' && (!!townOf(id) || id === M.crater)
const nearest = (s: GameState, from: string, ids: string[]) => {
  const d = distancesFrom(s, from)
  const reach = ids.filter((id) => d.has(id))
  const best = Math.min(...reach.map((id) => d.get(id)!))
  return reach.filter((id) => d.get(id) === best)
}

export function midnightHour({
  difficulty = 'standard',
  log,
}: {
  difficulty?: Difficulty
  log?: CampaignLog
  seed?: number
} = {}): ScenarioDefinition {
  const has = (key: string) => !!log?.notes.includes(key)
  const craterRow = TOWN.find((r) => has(`plaguebearerTown${r.id}Crater`))
  const locations = TOWN_SIDES.flatMap((side) => {
    const base = townLocation(side, false)
    if (side.row === craterRow?.id) return [craterLocation(base.position!)]
    return [townLocation(side, has(`plaguebearerTown${side.row}Rallied`))]
  })
  return {
    id: MIDNIGHT_HOUR,
    intro: [
      {
        title: 'story.plaguebearer.midnight.introTitle',
        body: 'story.plaguebearer.midnight.intro1',
      },
      ...(has('plaguebearerCrypticRiddle')
        ? [
            {
              title: 'story.plaguebearer.midnight.introTitle',
              body: 'story.plaguebearer.midnight.intro2',
              effects: [{ key: 'story.plaguebearer.midnight.intro2Effect' }],
            },
          ]
        : []),
    ],
    setupInstructions: {
      title: 'story.plaguebearer.midnight.setupTitle',
      body: 'story.plaguebearer.midnight.setup',
    },
    locations,
    setAsideLocations: [M.body, M.mind, M.soul].map((id, n) =>
      baalLocation(
        id,
        (
          [
            [0, 0],
            [2, 0],
            [1, 1],
          ] as [number, number][]
        )[n]!,
      ),
    ),
    startingLocation: null,
    agendas: [
      { code: M.agendas[0], name: 'The Plaguebearer Unbound', doomThreshold: 3 },
      { code: M.agendas[1], name: 'Arkham Infected', doomThreshold: 7 },
      { code: M.agendas[2], name: 'Monstrous City', doomThreshold: 11 },
    ],
    acts: [
      { code: M.acts.death, name: 'Death of the Plaguebearer', ...objective },
      { code: M.acts.reagent, name: 'The Reagent', ...objective },
      { code: M.acts.doctor, name: 'The Doctor', ...objective },
      { code: M.acts.stunt, name: 'Stunt the Growth', ...objective },
      { code: M.acts.life, name: 'Life of the Plaguebearer', ...objective },
    ],
    encounterDeck: [
      // Dones del Portador, Confusión del miasma, Vida y muerte y Esclavos del miasma.
      ...copies(supplicant, 2),
      ...treacheries
        .filter(
          (t) =>
            t.code === C.hands || t.code === C.skin || t.code === C.urge || t.code === C.another,
        )
        .flatMap((t) => copies(t, t.code === C.urge ? 3 : 2)),
      ...lifeAndDeath.flatMap((t) => copies(t, 2)),
      ...copies(thrall, 3),
      { ...devoted },
    ],
    setAside: [baalshandor, fleshUnbound, ...midnightLater(), ...unboundPowerCards()],
    chaosBag: plaguebearerChaosBag(difficulty, log),
    tokenValues: { skull: 0, cultist: -4, tablet: -4, elderThing: -3 },
    setup: [
      ...(has('plaguebearerCrypticRiddle')
        ? [{ type: 'SetScenarioMeta' as const, key: BINDING, value: 1 }]
        : []),
      specific('midnight.setup'),
      ...(has(CONFRONTATION.baalshandorFirst) || has(CONFRONTATION.deathConqueredWest)
        ? [specific('midnight.wounds', { index: 0 })]
        : []),
      specific('midnight.west'),
      specific('midnight.start'),
    ],
  }
}
const objective = {
  clueThreshold: 0,
  cluesPerInvestigator: false,
  advanceTiming: 'objective' as const,
}
/** Poder desatado (VI): se aparta y el plan 2b lo baraja. */
function unboundPowerCards(): EncounterCard[] {
  return [W.heed, W.ire].flatMap((code) =>
    copies(
      {
        kind: 'treachery' as const,
        code,
        name: code === W.heed ? 'Heed the Call' : 'Ire of the Unbound',
        traits: code === W.heed ? ['Power'] : ['Terror', 'Tactic'],
        keywords: [],
      },
      2,
    ),
  )
}

// ---------------------------------------------------------------------------
// Preparación (guía ES p. 21 / EN pp. 24–25)
// ---------------------------------------------------------------------------

on('midnight.setup', (s) => {
  const crater = s.locations[M.crater]
  const siteRow = TOWN.find((r) => note(s, `plaguebearerTown${r.id}Site`))
  const siteId = siteRow ? TOWN_SIDES.find((t) => t.row === siteRow.id) : undefined
  const site = siteId && (s.locations[siteId.normal] ? siteId.normal : siteId.rallied)
  // Sin registro (partida suelta): el Motel Hibb hace de Lugar de la Liberación.
  const target = crater ? M.crater : site && s.locations[site] ? site : fallbackSite(s)
  const hibbs = TOWN_SIDES.find((t) => t.row === '78026')!
  const hibbsHere = [hibbs.normal, hibbs.rallied].find((id) => s.locations[id])
  return push(
    setMeta(s, 'midnightSite', !crater && target ? target : ''),
    { type: 'SpawnSetAsideEnemy', code: M.baalshandor, location: target },
    ...(note(s, 'plaguebearerGreysonCutTies') && hibbsHere
      ? [
          {
            type: 'PlaceAsset' as const,
            code: M.loyalists,
            name: 'Greyson’s Loyalists',
            placement: { type: 'location' as const, location: hibbsHere },
          },
        ]
      : []),
  )
})
const fallbackSite = (s: GameState) => {
  const hibbs = TOWN_SIDES.find((t) => t.row === '78026')!
  return [hibbs.normal, hibbs.rallied].find((id) => s.locations[id]) ?? Object.keys(s.locations)[0]!
}
// Baalshandor golpeó primero o la Muerte conquistó a Herbert West: 2 daño y 2 horror o una debilidad.
on('midnight.wounds', (s, d) => {
  const index = Number(d.index),
    i = s.investigators[index]
  if (!i) return s
  const next = specific('midnight.wounds', { index: index + 1 })
  return ask(
    s,
    i.id,
    [
      {
        label: 'choice.plaguebearer.midnight.wounds',
        then: [
          { type: 'TakeDamage', investigator: i.id, damage: 2, horror: 2, direct: true },
          next,
        ],
      },
      {
        label: 'choice.plaguebearer.midnight.weakness',
        then: [specific('midnight.weakness', { investigator: i.id }), next],
      },
    ],
    'prompt.plaguebearer.midnight.wounds',
  )
})
on('midnight.weakness', (s, d) => {
  const by = String(d.investigator)
  const pool = basicWeaknessPool().filter((code) =>
    playerCardDef(code)?.traits.some((t) => ['Injury', 'Flaw', 'Curse', 'Endtimes'].includes(t)),
  )
  if (!pool.length) return s
  const [index, rng] = nextInt(s.rng, pool.length)
  const code = pool[index]!
  return push(
    { ...s, rng },
    { type: 'AddStoryAsset', investigator: by, code },
    specific('war.shuffleIn', { investigator: by, code }),
  )
})
// Herbert West en juego: desde un mazo o, si la Muerte no le conquistó, con Alianzas frágiles.
on('midnight.west', (s) => {
  const owner = s.investigators.find((i) => i.deck.includes(D.west) || i.hand.includes(D.west))
  if (owner) return push(s, specific('noon.fromDeck', { investigator: owner.id, code: D.west }))
  if (note(s, CONFRONTATION.deathConqueredWest)) return s
  return push(
    s,
    s.investigators.length === 1
      ? {
          type: 'PutAssetIntoPlay',
          investigator: s.investigators[0]!.id,
          code: D.west,
          noSlot: true,
        }
      : specific('noon.giveAsset', { code: D.west, prompt: 'prompt.plaguebearer.noon.west' }),
  )
})
on('midnight.start', (s) =>
  ask(
    s,
    lead(s),
    Object.values(s.locations).map((l) => ({
      label: 'choice.location',
      params: { location: l.name },
      target: { type: 'location' as const, id: l.id },
      then: [{ type: 'PlaceAtStart', lead: l.id, others: l.id } as Message],
    })),
    'prompt.chooseStartingLocation',
  ),
)

// ---------------------------------------------------------------------------
// Lugares enemigo y dar la vuelta
// ---------------------------------------------------------------------------

const cluesFor = (s: GameState, side: EnemySide) => side.clues * players(s)
const withLocation = (
  s: GameState,
  id: string,
  f: (l: GameState['locations'][string]) => GameState['locations'][string],
) => (s.locations[id] ? { ...s, locations: { ...s.locations, [id]: f(s.locations[id]!) } } : s)
/** Da la vuelta a un Lugar (de su cara Segura/Atado a la de enemigo o al revés). */
on('midnight.flip', (s, d) => {
  const id = String(d.location),
    l = s.locations[id]
  if (!l) return s
  const side = sideOf(s, id)
  // Planes 2 y 3: los Lugares con horror no pueden darse la vuelta.
  if (s.agendaIndex >= 1 && horrorOn(s, id) > 0 && d.force !== 1) return s
  if (side === 'rallied')
    return push(s, specific('midnight.rallyStory', { location: id, by: String(d.by ?? lead(s)) }))
  // Uno de muchos cancela la vuelta de su Lugar.
  const one = Object.values(s.enemies).find((e) => e.code === M.oneOfMany && e.location === id)
  if (one && d.force !== 1)
    return push(
      withLocation(setMeta(s, `locationDamage:${id}`, 0), id, (x) => ({
        ...x,
        clues: 0,
        doom: 0,
        horror: 0,
      })),
      ...activeInvestigators(s)
        .filter((i) => i.location === id)
        .map((i) => damage(i.id, 0, 1)),
    )
  const toEnemy = side === 'stable' || side === 'bound'
  const es = enemySide(id)
  if (!es) return s
  const fear = Object.values(s.treacheries).filter(
    (t) =>
      t.code === M.fear &&
      t.placement.type === 'threatArea' &&
      at(s, t.placement.investigator) === id,
  )
  const hurt = fear.map((t) => damage((t.placement as { investigator: string }).investigator, 2))
  if (toEnemy) {
    const next = withLocation(setMeta(s, SIDE(id), 'enemy'), id, (x) => ({
      ...x,
      shroud: es.shroud,
      clues: Math.max(x.clues, cluesFor(s, es)),
    }))
    return push(
      next,
      { type: 'SpawnEnemy', card: sideEnemy(es), location: id, engageWith: null },
      ...hurt,
      specific('midnight.enemyEntered'),
    )
  }
  // Cara de enemigo → Lugar: retira las fichas que no sean horror y quita al enemigo.
  const e = locationEnemy(s, id)
  const town = townOf(id)
  const back: Side = BAAL_SIDES[id] ? 'bound' : 'stable'
  const shroud = town ? town.stableShroud : BAAL_SIDES[id] ? BAAL_SIDES[id]!.boundShroud : 3
  const next = withLocation(
    setMeta(setMeta(s, SIDE(id), back), `locationDamage:${id}`, 0),
    id,
    (x) => ({
      ...x,
      shroud,
      clues: 0,
      doom: 0,
    }),
  )
  return push(
    next,
    ...(e ? [{ type: 'RemoveEnemyFromGame' as const, enemy: e.id }] : []),
    ...hurt,
    ...(town ? [specific('midnight.stableBenefit', { location: id })] : []),
  )
})
// Acto 4: un Lugar enemigo entra en juego → Baalshandor se cura 1 [per_investigator].
on('midnight.enemyEntered', (s) => {
  const b = enemyOf(s, M.baalshandor)
  return act(s) === M.acts.life && b
    ? push(s, { type: 'HealEnemy', enemy: b.id, amount: players(s) })
    : s
})
/** Derrota de un Lugar enemigo: se da la vuelta en vez de descartarse. */
function locationDefeated(s: GameState, e: Enemy): Message[] {
  const id = e.location
  const by = s.skillTest?.investigator ?? s.activeTurn ?? lead(s)
  const b = enemyOf(s, M.baalshandor)
  return [
    specific('midnight.flip', { location: id, by, force: 1 }),
    // Acto 4: inflige 1 [per_investigator] daño a Baalshandor.
    ...(act(s) === M.acts.life && b
      ? [
          {
            type: 'DamageEnemy' as const,
            enemy: b.id,
            amount: players(s),
            source: { encounter: true },
          },
        ]
      : []),
    ...Object.values(s.treacheries)
      .filter(
        (t) =>
          t.code === M.fear && t.placement.type === 'threatArea' && t.placement.investigator === by,
      )
      .map((t): Message => ({ type: 'DiscardTreachery', treachery: t.id })),
    ...(act(s) === M.acts.stunt && meta(s, BINDING) === 1
      ? [specific('midnight.purify', { location: id, by, cost: 1 })]
      : []),
  ]
}
// Actos 2a y 3a: gasta 2 [per_investigator] pistas como grupo para colocar 1 horror en el Lugar.
on('midnight.purify', (s, d) => {
  const id = String(d.location),
    by = String(d.by)
  const group = activeInvestigators(s)
  const cost = 2 * players(s)
  if (group.reduce((n, i) => n + i.clues, 0) < cost) return s
  return ask(
    s,
    by,
    [
      {
        label: 'choice.plaguebearer.midnight.purify',
        params: { amount: cost, location: s.locations[id]?.name ?? '' },
        then: [
          { type: 'PayGroupClues', amount: cost, from: group.map((i) => i.id) },
          { type: 'PlaceLocationTokens', location: id, horror: 1 },
        ],
      },
      { label: 'choice.skip', then: [] },
    ],
    'prompt.plaguebearer.midnight.purify',
  )
})
// Reacción de la cara Segura: «Cada investigador en este Lugar puede...».
on('midnight.stableBenefit', (s, d) => {
  const id = String(d.location)
  const town = townOf(id)
  if (!town) return s
  const here = activeInvestigators(s).filter((i) => i.location === id)
  const out: Message[] = []
  for (const i of here) {
    switch (town.row) {
      case '78023':
        out.push(specific('midnight.recover', { investigator: i.id, kind: 'event' }))
        break
      case '78024':
        out.push({ type: 'GainResources', investigator: i.id, amount: 2 })
        break
      case '78025':
        // Aproximación: el descuento de 1 se da como 1 recurso.
        out.push({ type: 'GainResources', investigator: i.id, amount: 1 })
        break
      case '78026':
        for (const skill of ['willpower', 'intellect', 'combat', 'agility'] as SkillType[])
          out.push({
            type: 'UntilPhaseSkillBonus',
            investigator: i.id,
            skill,
            amount: 1,
            code: id,
            phase: s.phase,
            round: s.round,
          })
        break
      case '78027':
        out.push(specific('midnight.recover', { investigator: i.id, kind: 'ally' }))
        break
      case '78028':
        out.push({ type: 'DrawCards', investigator: i.id, amount: 2 })
        break
      case '78029':
        out.push(specific('midnight.recover', { investigator: i.id, kind: 'skill' }))
        break
      case '78030':
        out.push(specific('midnight.recover', { investigator: i.id, kind: 'costly' }))
        break
    }
  }
  return push(s, ...out)
})
/** Devuelve una carta de la pila de descartes a la mano (evento, Aliado, habilidad o Apoyo caro). */
on('midnight.recover', (s, d) => {
  const by = String(d.investigator),
    kind = String(d.kind)
  const i = getInvestigator(s, by)
  const def = (c: string) => playerCardDef(c)
  let options = [...new Set(i.discard)].filter((c) => {
    const x = def(c)
    if (!x || x.weakness) return false
    if (kind === 'event') return x.type === 'event'
    if (kind === 'skill') return x.type === 'skill'
    if (kind === 'ally') return x.type === 'asset' && x.traits.includes('Ally')
    return x.type === 'asset'
  })
  if (kind === 'costly') {
    const top = Math.max(-1, ...options.map((c) => def(c)?.cost ?? 0))
    options = options.filter((c) => (def(c)?.cost ?? 0) === top)
  }
  const limit = Number(d.left ?? 1)
  if (!options.length || limit <= 0) return s
  return ask(
    s,
    by,
    [
      ...options.map((code) => ({
        label: 'choice.plaguebearer.midnight.recover',
        params: { card: def(code)?.name ?? code },
        then: [
          { type: 'DiscardToHand' as const, investigator: by, code },
          ...(limit > 1
            ? [specific('midnight.recover', { investigator: by, kind, left: limit - 1 })]
            : []),
        ],
      })),
      { label: 'choice.skip', then: [] },
    ],
    'prompt.plaguebearer.midnight.recover',
  )
})

// ---------------------------------------------------------------------------
// Lugares Protegidos: [free] gasta 2 [per_investigator] pistas y resuelve su historia
// ---------------------------------------------------------------------------

on('midnight.rallyStory', (s, d) => {
  const id = String(d.location),
    by = String(d.by)
  const town = townOf(id)
  if (!town) return s
  const shown = push(s, {
    type: 'Story',
    entry: {
      title: 'story.plaguebearer.midnight.rallyTitle',
      body: `story.plaguebearer.midnight.rally.${town.row}`,
    },
  })
  return ask(
    shown,
    by,
    [
      {
        label: `choice.plaguebearer.midnight.rally.${town.row}`,
        then: [specific('midnight.rallyGift', { row: town.row })],
      },
      {
        label: 'choice.plaguebearer.midnight.flipAny',
        then: [specific('midnight.flipAny', { by })],
      },
      {
        label: 'choice.plaguebearer.midnight.placeHorror',
        then: [specific('midnight.placeHorror', { by })],
      },
    ].map((c) => ({
      ...c,
      then: [...c.then, { type: 'PlaceLocationTokens' as const, location: id, horror: 1 }],
    })),
    'prompt.plaguebearer.midnight.rally',
  )
})
on('midnight.rallyGift', (s, d) => {
  const out: Message[] = []
  for (const i of activeInvestigators(s)) {
    switch (String(d.row)) {
      case '78023':
        out.push({
          type: 'SearchDeck',
          investigator: i.id,
          traits: [],
          anyCard: true,
          cardType: 'event',
          to: 'hand',
          optional: true,
        })
        break
      case '78024':
        out.push({ type: 'GainResources', investigator: i.id, amount: 10 })
        break
      case '78025':
        out.push({
          type: 'SearchDeck',
          investigator: i.id,
          traits: [],
          anyCard: true,
          cardType: 'asset',
          to: 'put',
          optional: true,
        })
        break
      case '78026': {
        const hibbs = Object.values(s.assets).some((a) => a.owner === i.id && a.code === '78039')
        out.push({
          type: 'Heal',
          investigator: i.id,
          damage: hibbs ? i.damage : 3,
          horror: hibbs ? i.horror : 3,
        })
        break
      }
      case '78027':
        out.push({
          type: 'SearchDeck',
          investigator: i.id,
          traits: ['Ally'],
          to: 'put',
          optional: true,
        })
        break
      case '78028':
        out.push({ type: 'DrawCards', investigator: i.id, amount: Math.max(0, 8 - i.hand.length) })
        break
      case '78029':
        out.push(specific('midnight.recover', { investigator: i.id, kind: 'skill', left: 3 }))
        break
      case '78030':
        out.push({
          type: 'SearchDeck',
          investigator: i.id,
          traits: [],
          anyCard: true,
          cardType: 'asset',
          to: 'put',
          optional: true,
        })
        break
    }
  }
  return push(s, ...out)
})
on('midnight.flipAny', (s, d) => {
  const by = String(d.by)
  const ids = Object.keys(s.locations).filter(
    (id) =>
      sideOf(s, id) !== 'rallied' &&
      !(s.agendaIndex >= 1 && horrorOn(s, id) > 0) &&
      !!enemySide(id),
  )
  if (!ids.length) return s
  return ask(
    s,
    by,
    [
      ...ids.map((id) => ({
        label: 'choice.location',
        params: { location: s.locations[id]!.name },
        target: { type: 'location' as const, id },
        then: [
          specific('midnight.flip', { location: id, by }),
          specific('midnight.flipAny', { by }),
        ],
      })),
      { label: 'choice.plaguebearer.midnight.done', then: [] },
    ],
    'prompt.plaguebearer.midnight.flipAny',
  )
})
on('midnight.placeHorror', (s, d) =>
  ask(
    s,
    String(d.by),
    Object.values(s.locations).map((l) => ({
      label: 'choice.location',
      params: { location: l.name },
      target: { type: 'location' as const, id: l.id },
      then: [{ type: 'PlaceLocationTokens' as const, location: l.id, horror: 1 }],
    })),
    'prompt.plaguebearer.midnight.placeHorror',
  ),
)

// ---------------------------------------------------------------------------
// Capacidades del escenario
// ---------------------------------------------------------------------------

function scenarioAbilities(s: GameState, by: string): AbilityOption[] {
  const here = at(s, by)
  if (!here) return []
  const out: AbilityOption[] = []
  // Lugar Protegido: si no es el acto 1, [free] gasta 2 [per_investigator] pistas.
  if (sideOf(s, here) === 'rallied' && act(s) !== M.acts.death && horrorOn(s, here) === 0) {
    const cost = 2 * players(s)
    if (getInvestigator(s, by).clues >= cost)
      out.push({
        key: `midnight:rally:${here}`,
        label: 'ability.plaguebearer.midnight.rally',
        params: { amount: cost },
        actions: 0,
        provokes: false,
        costs: [{ type: 'SpendClues', investigator: by, amount: cost }],
        then: [specific('midnight.flip', { location: here, by })],
      })
  }
  // Acto 1: el Lugar de Baalshandor gana «[fast]: Negociar. Investigar. Si tienes éxito,
  // inflige 1 daño a Baalshandor».
  const b = enemyOf(s, M.baalshandor)
  if (act(s) === M.acts.death && b && b.location === here)
    out.push({
      key: 'midnight:baalParley',
      label: 'ability.plaguebearer.midnight.baalParley',
      actions: 0,
      provokes: false,
      parley: true,
      limit: { per: 'turn' },
      then: [
        effectTest(by, M.acts.death, 'intellect', s.locations[here]?.shroud ?? 0, {
          onSuccess: [
            { type: 'DamageEnemy', enemy: b.id, amount: 1, by, source: { code: M.acts.death } },
          ],
        }),
      ],
    })
  // Cuerpo, Mente y Alma: [fast] Negociar y moverse.
  const e = locationEnemy(s, here)
  if (e && BAAL_SIDES[here]) {
    const move = (to: string): Message => ({ type: 'MoveTo', investigator: by, location: to })
    if (here === M.body && getInvestigator(s, by).resources >= 1 && s.locations[M.soul])
      out.push({
        key: 'midnight:body',
        label: 'ability.plaguebearer.midnight.body',
        actions: 0,
        provokes: false,
        parley: true,
        costs: [{ type: 'SpendResources', investigator: by, amount: 1 }],
        then: [move(M.soul)],
      })
    if (here === M.mind && getInvestigator(s, by).hand.length && s.locations[M.body])
      out.push({
        key: 'midnight:mind',
        label: 'ability.plaguebearer.midnight.mind',
        actions: 0,
        provokes: false,
        parley: true,
        then: [{ type: 'ChooseDiscardFromHand', investigator: by, amount: 1 }, move(M.body)],
      })
    if (here === M.soul && s.locations[M.mind])
      out.push({
        key: 'midnight:soul',
        label: 'ability.plaguebearer.midnight.soul',
        actions: 0,
        provokes: false,
        parley: true,
        then: [move(M.mind)],
      })
  }
  return out
}

// ---------------------------------------------------------------------------
// Planes
// ---------------------------------------------------------------------------

const story = (key: string, effects?: string): Message => ({
  type: 'Story',
  entry: {
    title: `story.plaguebearer.midnight.${key}Title`,
    body: `story.plaguebearer.midnight.${key}`,
    ...(effects ? { effects: [{ key: `story.plaguebearer.midnight.${effects}` }] } : {}),
  },
})
registerAgenda({
  code: M.agendas[0],
  onAdvance: (s) => [
    { type: 'SetScenarioMeta', key: 'midnightCarry', value: s.doom },
    story('agenda1b'),
    ...(enemyOf(s, M.baalshandor) ? [{ type: 'SetAsideEnemy' as const, code: M.baalshandor }] : []),
    { type: 'ShuffleSetAsideIntoEncounter', codes: [M.growing, M.oneOfMany, M.fear] },
    specific('midnight.unleash'),
    specific('midnight.act1b'),
  ],
  // «No retires perdición de este plan cuando avance»: pasa al plan 2a.
  afterAdvance: (s) => {
    const carry = Number(meta(s, 'midnightCarry') ?? 0)
    return carry ? [{ type: 'PlaceDoom', amount: carry }] : []
  },
})
// Plan 1b: los Infectados se dan la vuelta y los Mensajeros entran en los Lugares tocados.
on('midnight.unleash', (s) => {
  const out: Message[] = []
  for (const t of TOWN_SIDES) {
    const id = s.locations[t.normal] ? t.normal : undefined
    if (id && note(s, `plaguebearerTown${t.row}Infected`) && sideOf(s, id) === 'stable')
      out.push(specific('midnight.flip', { location: id, force: 1 }))
    const where =
      [t.normal, t.rallied].find((x) => s.locations[x]) ??
      (s.locations[M.crater] ? M.crater : undefined)
    if (!where) continue
    if (note(s, `plaguebearerTown${t.row}FlameTouched`))
      out.push({
        type: 'PlaceAsset',
        code: M.flame,
        name: 'Messenger of the Flame',
        placement: { type: 'location', location: where },
      })
    if (note(s, `plaguebearerTown${t.row}MadnessTouched`))
      out.push({
        type: 'PlaceAsset',
        code: M.king,
        name: 'Messenger of the King',
        placement: { type: 'location', location: where },
      })
  }
  return push(s, ...out)
})
for (const code of [M.agendas[1], M.agendas[2]])
  registerAgenda({
    code,
    onAdvance: (s) =>
      code === M.agendas[1]
        ? [story('agenda2b'), specific('midnight.unbound')]
        : act(s) === M.acts.life
          ? [
              story('agenda3bAct4'),
              { type: 'EndScenario', outcome: { type: 'resolution', resolution: 2 } },
            ]
          : [
              story('agenda3b'),
              { type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 } },
            ],
  })
on('midnight.unbound', (s) => {
  const codes = [W.heed, W.ire]
  const added = s.setAside.filter((c) => codes.includes(c.code as never))
  const [deck, rng] = shuffle([...s.encounterDeck, ...added, ...s.encounterDiscard], s.rng)
  const site = String(meta(s, 'midnightSite') ?? '')
  return push(
    {
      ...s,
      rng,
      encounterDeck: deck,
      encounterDiscard: [],
      setAside: s.setAside.filter((c) => !codes.includes(c.code as never)),
    },
    ...(site && s.locations[site]
      ? [
          {
            type: 'PlaceSetAsideTreachery' as const,
            code: M.flesh,
            placement: { type: 'location' as const, location: site },
          },
        ]
      : []),
  )
})
// Planes 2 y 3, al final de la ronda: por cada investigador en un Lugar no Miasma sin horror.
on('midnight.agendaRound', (s, d) => {
  const index = Number(d.index)
  const list = activeInvestigators(s).filter(
    (i) => i.location && !isMiasma(s, i.location) && horrorOn(s, i.location) === 0,
  )
  const i = list[index]
  if (!i || s.agendaIndex < 1) return s
  const next = specific('midnight.agendaRound', { index: index + 1 })
  const stable = nearest(
    s,
    i.location!,
    Object.keys(s.locations).filter((id) => isStable(s, id) && horrorOn(s, id) === 0),
  )
  const doomed = Object.values(s.enemies).filter(
    (e) => isMiasma(s, e.location) && isLocationEnemy(e) && horrorOn(s, e.location) === 0,
  )
  const near = nearest(
    s,
    i.location!,
    doomed.map((e) => e.location),
  )
  const choices: Choice[] = [
    ...stable.map((id) => ({
      label: 'choice.plaguebearer.midnight.flipStable',
      params: { location: s.locations[id]!.name },
      target: { type: 'location' as const, id },
      then: [specific('midnight.flip', { location: id }), next],
    })),
    ...doomed
      .filter((e) => near.includes(e.location))
      .map((e) => ({
        label: 'choice.plaguebearer.midnight.doomEnemy',
        params: { enemy: e.name },
        target: { type: 'enemy' as const, id: e.id },
        then: [{ type: 'PlaceDoomOnEnemy' as const, enemy: e.id, amount: 1 }, next],
      })),
  ]
  return choices.length
    ? ask(s, i.id, choices, 'prompt.plaguebearer.midnight.agenda')
    : push(s, next)
})

// ---------------------------------------------------------------------------
// Actos
// ---------------------------------------------------------------------------

for (const code of Object.values(M.acts)) registerAct({ code, objectiveMet: () => false })
const ACT_INDEX = [M.acts.death, M.acts.reagent, M.acts.doctor, M.acts.stunt, M.acts.life]
on('midnight.toAct', (s, d) => ({ ...s, actIndex: ACT_INDEX.indexOf(String(d.code) as never) }))
// Acto 1b: el Maletín y el acertijo (El Reactivo), Herbert West (El Doctor) o Detener el crecimiento.
on('midnight.act1b', (s) => {
  const controls = (code: string) => Object.values(s.assets).some((a) => a.code === code)
  const reagent = controls(C.briefcase) && note(s, 'plaguebearerCrypticRiddle')
  const doctor = !reagent && controls(D.west)
  const to = reagent ? M.acts.reagent : doctor ? M.acts.doctor : M.acts.stunt
  return push(
    s,
    story(reagent ? 'act1bReagent' : doctor ? 'act1bDoctor' : 'act1bStunt'),
    specific('midnight.toAct', { code: to }),
  )
})
// Final de la ronda: objetivos de los actos 2a y 3a.
on('midnight.actRound', (s) => {
  const code = act(s)
  const all = Object.keys(s.locations).every((id) => horrorOn(s, id) > 0)
  if (code === M.acts.stunt) return all ? push(s, specific('midnight.fury')) : s
  if (code !== M.acts.reagent && code !== M.acts.doctor) return s
  const branch = code === M.acts.reagent ? 'Reagent' : 'Doctor'
  if (all)
    return push(
      s,
      story(`act2b${branch}`),
      {
        type: 'SetScenarioMeta',
        key: code === M.acts.reagent ? 'midnightYou' : 'midnightWest',
        value: 1,
      },
      ...(code === M.acts.doctor && enemyOf(s, M.baalshandor)
        ? activeInvestigators(s).map((i): Message => ({
            type: 'MoveTo',
            investigator: i.id,
            location: enemyOf(s, M.baalshandor)!.location,
          }))
        : []),
      specific('midnight.fury'),
    )
  // «Esto no está funcionando»: al final de la ronda, los investigadores pueden avanzar.
  return ask(
    s,
    lead(s),
    [
      {
        label: 'choice.plaguebearer.midnight.giveUp',
        then: [specific('midnight.giveUp', { branch })],
      },
      { label: 'choice.plaguebearer.midnight.keepTrying', then: [] },
    ],
    'prompt.plaguebearer.midnight.giveUp',
  )
})
on('midnight.giveUp', (s, d) => {
  const lost = d.branch === 'Reagent' ? C.briefcase : D.west
  return push(
    s,
    story(`act2bFail${String(d.branch)}`),
    ...Object.values(s.assets)
      .filter((a) => a.code === lost)
      .map((a): Message => ({ type: 'RemoveAssetFromGame', asset: a.id })),
    specific('midnight.toAct', { code: M.acts.stunt }),
  )
})
/** Acto 3b: el Cuerpo, la Mente y el Alma sustituyen a Arkham; Baalshandor fuera de todo Lugar. */
on('midnight.fury', (s) => {
  const ids = Object.keys(s.locations)
  return push(
    s,
    story('act3b'),
    ...Object.values(s.placedAssets ?? {}).map((p): Message => ({
      type: 'RemovePlacedAsset',
      placed: p.id,
    })),
    ...Object.values(s.enemies).map((e): Message => ({ type: 'RemoveEnemyFromGame', enemy: e.id })),
    ...[M.body, M.mind, M.soul].map((location): Message => ({
      type: 'PutLocationIntoPlay',
      location,
    })),
    ...[M.body, M.mind, M.soul].map((location) => specific('midnight.baalSide', { location })),
    ...activeInvestigators(s).map((i): Message => ({
      type: 'MoveTo',
      investigator: i.id,
      location: M.soul,
      unpreventable: true,
    })),
    ...ids.map((location): Message => ({ type: 'RemoveLocation', location })),
    specific('midnight.baalBack'),
    specific('midnight.toAct', { code: M.acts.life }),
  )
})
on('midnight.baalSide', (s, d) => {
  const id = String(d.location)
  const side = BAAL_SIDES[id]!
  return push(
    withLocation(setMeta(s, SIDE(id), 'enemy'), id, (l) => ({
      ...l,
      revealed: true,
      clues: cluesFor(s, side),
    })),
    { type: 'SpawnEnemy', card: sideEnemy(side), location: id, engageWith: null },
  )
})
// Baalshandor vuelve «junto al mazo de acto»: se representa en el Alma, sin poder ser atacado.
on('midnight.baalBack', (s) =>
  s.locations[M.soul]
    ? push(s, { type: 'SpawnEnemy', card: baalshandor, location: M.soul, engageWith: null })
    : s,
)

// ---------------------------------------------------------------------------
// Apoyos de historia: Leales de Greyson y los Mensajeros
// ---------------------------------------------------------------------------

registerPlayerCards([
  {
    code: M.loyalists,
    name: 'Greyson’s Loyalists',
    type: 'asset',
    class: 'neutral',
    story: true,
    traits: ['Human', 'Agency'],
    slots: [],
    icons: {},
  },
  {
    code: M.flame,
    name: 'Messenger of the Flame',
    type: 'asset',
    class: 'neutral',
    story: true,
    unique: true,
    traits: ['Monster', 'Servitor'],
    slots: [],
    icons: {},
  },
  {
    code: M.king,
    name: 'Messenger of the King',
    type: 'asset',
    class: 'neutral',
    story: true,
    unique: true,
    traits: ['Monster', 'Servitor'],
    slots: [],
    icons: {},
  },
])
registerPlayerCard({
  code: M.loyalists,
  placedAbilities: (s, self, by) => {
    const here = placedLocation(s, self)
    if (!here || !Object.values(s.assets).some((a) => a.owner === by && a.code === V.greyson))
      return []
    return (s.locations[here]?.connections ?? []).map((to) => ({
      key: `${self.id}:move:${to}`,
      label: 'ability.plaguebearer.midnight.loyalistsMove',
      params: { location: s.locations[to]?.name ?? '' },
      actions: 0,
      provokes: false,
      then: [
        {
          type: 'MovePlacedAsset',
          placed: self.id,
          placement: { type: 'location', location: to },
        } as Message,
      ],
    }))
  },
})
for (const [code, flame] of [
  [M.flame, true],
  [M.king, false],
] as const)
  registerPlayerCard({
    code,
    placedAbilities: (s, self, by) => {
      if (act(s) === M.acts.death || meta(s, `midnightMessenger:${code}`) === 1) return []
      const cost = 3 * players(s)
      const group = activeInvestigators(s)
      if (group.reduce((n, i) => n + i.clues, 0) < cost) return []
      return [
        {
          key: `${self.id}:bargain`,
          label: `ability.plaguebearer.midnight.${flame ? 'flame' : 'king'}`,
          params: { amount: cost },
          actions: 0,
          provokes: false,
          parley: true,
          costs: [{ type: 'PayGroupClues', amount: cost, from: group.map((i) => i.id) }],
          then: [specific('midnight.bargain', { code, placed: self.id, by })],
        },
      ]
    },
  })
on('midnight.bargain', (s, d) => {
  const code = String(d.code),
    flame = code === M.flame
  const by = String(d.by)
  const exiled = flame ? D.strength : D.will
  return push(
    setMeta(
      setMeta(setMeta(s, BINDING, 1), flame ? 'midnightCthugha' : 'midnightHastur', 1),
      `midnightMessenger:${code}`,
      1,
    ),
    {
      type: 'Story',
      entry: {
        title: `story.plaguebearer.midnight.${flame ? 'flame' : 'king'}Title`,
        body: `story.plaguebearer.midnight.${flame ? 'flame' : 'king'}`,
        effects: [{ key: `story.plaguebearer.midnight.${flame ? 'flame' : 'king'}Effect` }],
      },
    },
    ...Object.values(s.assets)
      .filter((a) => a.code === exiled)
      .map((a): Message => ({ type: 'RemoveAssetFromGame', asset: a.id })),
    specific('midnight.exileCopies', { code: exiled }),
    specific('midnight.chooseTwo', { by, left: 2 }),
    // EN: el del Rey se retira de la partida; el de la Llama vuelve a su cara con 1 horror.
    ...(flame ? [] : [{ type: 'RemovePlacedAsset' as const, placed: String(d.placed) }]),
  )
})
on('midnight.exileCopies', (s, d) => {
  const code = String(d.code)
  const strip = (cards: string[]) => cards.filter((c) => c !== code)
  return {
    ...s,
    investigators: s.investigators.map((i) => ({
      ...i,
      deck: strip(i.deck),
      hand: strip(i.hand),
      discard: strip(i.discard),
    })),
  }
})
on('midnight.chooseTwo', (s, d) => {
  const by = String(d.by),
    left = Number(d.left)
  if (left <= 0) return s
  const next = specific('midnight.chooseTwo', { by, left: left - 1 })
  return ask(
    s,
    by,
    [
      ...Object.values(s.locations).map((l) => ({
        label: 'choice.location',
        params: { location: l.name },
        target: { type: 'location' as const, id: l.id },
        then: [
          ...(isMiasma(s, l.id) && sideOf(s, l.id) === 'enemy'
            ? [specific('midnight.flip', { location: l.id, by, force: 1 })]
            : []),
          { type: 'PlaceLocationTokens' as const, location: l.id, horror: 1 },
          next,
        ],
      })),
      { label: 'choice.plaguebearer.midnight.done', then: [] },
    ],
    'prompt.plaguebearer.midnight.chooseTwo',
  )
})
// Mensajeros, al comienzo de la fase de enemigos.
on('midnight.messengers', (s) => {
  const out: Message[] = []
  for (const p of Object.values(s.placedAssets ?? {})) {
    if (p.code !== M.flame && p.code !== M.king) continue
    const here = placedLocation(s, p)
    if (!here) continue
    if (isMiasma(s, here) && horrorOn(s, here) === 0 && locationEnemy(s, here)) {
      out.push(specific('midnight.flip', { location: here, force: 1 }))
      continue
    }
    const targets = Object.keys(s.locations).filter(
      (id) => isMiasma(s, id) && horrorOn(s, id) === 0,
    )
    const goal = nearest(s, here, targets)
    if (!goal.length || goal.includes(here)) continue
    const d = (id: string) => Math.min(...goal.map((g) => distancesFrom(s, id).get(g) ?? Infinity))
    const step = (s.locations[here]?.connections ?? [])
      .filter((id) => s.locations[id])
      .sort((a, b) => d(a) - d(b))[0]
    if (step)
      out.push({
        type: 'MovePlacedAsset',
        placed: p.id,
        placement: { type: 'location', location: step },
      })
  }
  return push(s, ...out)
})
// Leales de Greyson, al final de la ronda: 2 daño a cada enemigo en su Lugar; y su historia.
on('midnight.loyalists', (s) => {
  const out: Message[] = []
  for (const p of Object.values(s.placedAssets ?? {})) {
    if (p.code !== M.loyalists) continue
    const here = placedLocation(s, p)
    if (!here) continue
    for (const e of Object.values(s.enemies).filter((e) => e.location === here))
      out.push({ type: 'DamageEnemy', enemy: e.id, amount: 2, source: { encounter: true } })
    const greyson = Object.values(s.assets).find((a) => a.code === V.greyson)
    if (greyson && act(s) !== M.acts.death)
      out.push(
        specific('midnight.finestHour', { placed: p.id, asset: greyson.id, by: greyson.owner }),
      )
  }
  return push(s, ...out)
})
on('midnight.finestHour', (s, d) =>
  ask(
    s,
    String(d.by),
    [
      {
        label: 'choice.plaguebearer.midnight.finestHour',
        then: [
          { type: 'RemoveAssetFromGame', asset: String(d.asset) },
          {
            type: 'Story',
            entry: {
              title: 'story.plaguebearer.midnight.loyalistsTitle',
              body: 'story.plaguebearer.midnight.loyalists',
              effects: [{ key: 'story.plaguebearer.midnight.loyalistsEffect' }],
            },
          },
          { type: 'SetScenarioMeta', key: BINDING, value: 1 },
          specific('midnight.defeatMiasma', { by: String(d.by) }),
          specific('midnight.placeHorror', { by: String(d.by) }),
          { type: 'RemovePlacedAsset', placed: String(d.placed) },
        ],
      },
      { label: 'choice.skip', then: [] },
    ],
    'prompt.plaguebearer.midnight.finestHour',
  ),
)
on('midnight.defeatMiasma', (s, d) => {
  const options = Object.values(s.enemies).filter(
    (e) => isMiasma(s, e.location) && e.code !== M.baalshandor,
  )
  return ask(
    s,
    String(d.by),
    [
      ...options.map((e) => ({
        label: 'choice.plaguebearer.midnight.defeat',
        params: { enemy: e.name },
        target: { type: 'enemy' as const, id: e.id },
        then: [{ type: 'DefeatEnemy' as const, enemy: e.id, by: String(d.by) }],
      })),
      { label: 'choice.skip', then: [] },
    ],
    'prompt.plaguebearer.midnight.defeatMiasma',
  )
})

// ---------------------------------------------------------------------------
// Encuentros
// ---------------------------------------------------------------------------

registerEnemy({
  code: M.baalshandor,
  // Actos 3b–4: «se considera en juego, pero no está en ningún Lugar».
  canBeAttacked: (s) => act(s) !== M.acts.life,
})
registerTreachery({
  code: M.flesh,
  revelation: (s, _by, self) => {
    const site = String(meta(s, 'midnightSite') ?? '')
    return site && s.locations[site]
      ? [
          {
            type: 'PlaceTreachery',
            treachery: self.id,
            placement: { type: 'location', location: site },
          },
        ]
      : []
  },
})
registerTreachery({
  code: M.fear,
  revelation: (_s, by, self) => [
    effectTest(by, M.fear, 'willpower', 3, {
      onFail: [
        {
          type: 'PlaceTreachery',
          treachery: self.id,
          placement: { type: 'threatArea', investigator: by },
        },
      ],
    }),
  ],
})
registerTreachery({
  code: M.growing,
  revelation: (s, by) => {
    const here = at(s, by)
    if (!here) return []
    const ids = Object.keys(s.locations).filter(
      (id) => sideOf(s, id) !== 'rallied' && sideOf(s, id) !== 'enemy' && !!enemySide(id),
    )
    const target = nearest(s, here, ids)[0]
    return target
      ? [
          specific('midnight.flip', { location: target }),
          specific('midnight.growing', { investigator: by, location: target }),
        ]
      : []
  },
})
on('midnight.growing', (s, d) => {
  const by = String(d.investigator),
    id = String(d.location)
  const e = locationEnemy(s, id)
  if (!e) return s
  const attack: Message[] = [
    { type: 'EnemyAttack', enemy: e.id, investigator: by, exhaustAfter: false },
  ]
  return ask(
    s,
    by,
    [
      {
        label: 'choice.plaguebearer.midnight.growingWill',
        params: { amount: s.locations[id]?.shroud ?? 0 },
        then: [
          effectTest(by, M.growing, 'willpower', s.locations[id]?.shroud ?? 0, { onFail: attack }),
        ],
      },
      {
        label: 'choice.plaguebearer.midnight.growingCombat',
        params: { amount: e.fight },
        then: [effectTest(by, M.growing, 'combat', e.fight, { onFail: attack })],
      },
    ],
    'prompt.plaguebearer.midnight.growing',
  )
})
registerEnemy({
  code: M.oneOfMany,
  reactions: (s, t, self) => {
    void self
    if (t.type !== 'enemyDefeated' || t.enemy.code !== M.oneOfMany || !t.by) return []
    const id = t.enemy.location
    return s.locations[id] && enemySide(id)
      ? [
          {
            key: `oneOfMany:${t.enemy.id}`,
            investigator: t.by,
            label: 'ability.plaguebearer.midnight.oneOfMany',
            then: [specific('midnight.flip', { location: id, by: t.by, force: 1 })],
          } as ReactionOption,
        ]
      : []
  },
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
on('midnight.towardMiasma', (s, d) => {
  const by = String(d.investigator),
    here = at(s, by)
  if (!here) return s
  const goals = Object.keys(s.locations).filter((id) => isMiasma(s, id))
  const goal = nearest(s, here, goals)
  if (!goal.length || goal.includes(here)) return s
  const dist = (id: string) => Math.min(...goal.map((g) => distancesFrom(s, id).get(g) ?? Infinity))
  const options = (s.locations[here]?.connections ?? []).filter((id) => s.locations[id])
  const best = Math.min(...options.map(dist))
  const to = options.find((id) => dist(id) === best)
  return to ? push(s, { type: 'MoveTo', investigator: by, location: to }) : s
})
on('midnight.elderThing', (s, d) => {
  const each = activeInvestigators(s).filter((i) => heeded(s, i.id))
  const miasma = Object.keys(s.locations).filter((id) => isMiasma(s, id) && locationEnemy(s, id))
  const out: Message[] = []
  for (const i of each)
    if (d.all)
      for (const id of miasma)
        out.push(specific('midnight.turnForced', { investigator: i.id, location: id }))
    else if (miasma.length) out.push(specific('midnight.pickForced', { investigator: i.id }))
  return push(s, ...out)
})
on('midnight.pickForced', (s, d) => {
  const by = String(d.investigator)
  const miasma = Object.keys(s.locations).filter((id) => isMiasma(s, id) && locationEnemy(s, id))
  return ask(
    s,
    by,
    miasma.map((id) => ({
      label: 'choice.location',
      params: { location: s.locations[id]!.name },
      target: { type: 'location' as const, id },
      then: [specific('midnight.turnForced', { investigator: by, location: id })],
    })),
    'prompt.plaguebearer.midnight.elderThing',
  )
})
on('midnight.cultist', (s, d) => {
  const by = String(d.investigator)
  return ask(
    s,
    by,
    [
      ...Object.values(s.enemies)
        .filter((e) => !(e.code === M.baalshandor && act(s) === M.acts.life))
        .map((e) => ({
          label: 'choice.plaguebearer.midnight.damageEnemy',
          params: { enemy: e.name },
          target: { type: 'enemy' as const, id: e.id },
          then: [
            {
              type: 'DamageEnemy' as const,
              enemy: e.id,
              amount: 1,
              by,
              source: { code: M.reference },
            },
          ],
        })),
      ...Object.values(s.locations)
        .filter((l) => l.clues > 0)
        .map((l) => ({
          label: 'choice.plaguebearer.midnight.discover',
          params: { location: l.name },
          target: { type: 'location' as const, id: l.id },
          then: [{ type: 'DiscoverClues' as const, investigator: by, amount: 1, location: l.id }],
        })),
      { label: 'choice.skip', then: [] },
    ],
    'prompt.plaguebearer.midnight.cultist',
  )
})
const midnightTokens: NonNullable<ScenarioBehavior['tokenEffect']> = (s, token, by) => {
  if (token === 'skull') {
    const n = Object.keys(s.locations).filter((id) => horrorOn(s, id) > 0).length
    return { modifier: -(hard(s) ? n : Math.min(4, n)) }
  }
  if (token === 'cultist' && bloodInVeins(s)) return { modifier: 0, autoFail: true }
  if (token === 'cultist')
    return {
      modifier: hard(s) ? -6 : -4,
      onSuccess: [specific('midnight.cultist', { investigator: by })],
    }
  if (token === 'tablet')
    return hard(s)
      ? {
          modifier: -4,
          immediate: [{ type: 'SetScenarioMeta', key: `midnightDrift:${by}`, value: 1 }],
        }
      : { modifier: -4, onFail: [specific('midnight.towardMiasma', { investigator: by })] }
  if (token === 'elderThing')
    return { modifier: -3, onFail: [specific('midnight.elderThing', { all: hard(s) })] }
  throw new Error(`The Midnight Hour: token ${token} is not implemented`)
}

// ---------------------------------------------------------------------------
// Obligados de comienzo de turno (caras de enemigo y Atado) y forzados del escenario
// ---------------------------------------------------------------------------

on('midnight.turnForced', (s, d) => {
  const by = String(d.investigator),
    id = String(d.location)
  const i = getInvestigator(s, by)
  const town = townOf(id)
  if (town && sideOf(s, id) === 'enemy') {
    switch (town.row) {
      case '78023': {
        const events = i.hand.filter(
          (c) => playerCardDef(c)?.type === 'event' && !playerCardDef(c)?.weakness,
        )
        const top = Math.max(-1, ...events.map((c) => playerCardDef(c)?.xp ?? 0))
        const code = events.find((c) => (playerCardDef(c)?.xp ?? 0) === top)
        return code ? push(s, { type: 'ExileCard', from: 'hand', investigator: by, code }) : s
      }
      case '78024':
        return i.resources
          ? push(s, { type: 'LoseResources', investigator: by, amount: i.resources })
          : s
      case '78025':
        return push(s, specific('midnight.claws', { investigator: by }))
      case '78026':
        return setMeta(s, `midnightFail:${by}`, `${s.round}:${s.phase}`)
      case '78027': {
        const e = locationEnemy(s, id)
        const allies = Object.values(s.assets).filter(
          (a) => a.owner === by && playerCardDef(a.code)?.traits.includes('Ally'),
        )
        if (!e || !e.damageTaken || !allies.length) return s
        return ask(
          s,
          by,
          allies.map((a) => {
            const left = Math.max(0, (playerCardDef(a.code)?.health ?? 0) - a.damage)
            const moved = Math.min(left, e.damageTaken)
            return {
              label: 'choice.plaguebearer.midnight.heart',
              params: { card: playerCardDef(a.code)?.name ?? a.code, amount: moved },
              target: { type: 'asset' as const, id: a.id },
              then: [
                { type: 'HealEnemy' as const, enemy: e.id, amount: moved },
                { type: 'DamageAsset' as const, asset: a.id, damage: moved, horror: 0 },
              ],
            }
          }),
          'prompt.plaguebearer.midnight.heart',
        )
      }
      case '78028':
        return i.hand.length > 2
          ? push(s, { type: 'ChooseDiscardFromHand', investigator: by, amount: i.hand.length - 2 })
          : s
      case '78029':
        return push(
          s,
          ...i.hand
            .filter((c) => playerCardDef(c)?.type === 'skill')
            .map((card): Message => ({ type: 'DiscardFromHand', investigator: by, card })),
        )
      case '78030':
        return push(s, { type: 'DrawEncounterCard', investigator: by })
    }
  }
  if (BAAL_SIDES[id] && sideOf(s, id) === 'bound') {
    const controls = (code: string) =>
      Object.values(s.assets).some((a) => a.owner === by && a.code === code)
    const flip =
      (id === M.body && !controls(D.strength)) ||
      (id === M.mind && !controls(D.will)) ||
      (id === M.soul && activeInvestigators(s).some((x) => x.id !== by && x.location === id))
    return flip ? push(s, specific('midnight.flip', { location: id, force: 1 })) : s
  }
  if (id === M.crater && sideOf(s, id) === 'enemy')
    return push(s, { type: 'PlaceLocationTokens', location: id, doom: 1 })
  return s
})
on('midnight.claws', (s, d) => {
  const by = String(d.investigator)
  const owned = Object.values(s.assets).filter((a) => a.owner === by && !isPermanent(a.code))
  if (!owned.length) return s
  return ask(
    s,
    by,
    owned.map((a) => {
      const cost = playerCardDef(a.code)?.cost ?? 0
      return {
        label: 'choice.plaguebearer.midnight.claws',
        params: { card: playerCardDef(a.code)?.name ?? a.code, amount: cost },
        target: { type: 'asset' as const, id: a.id },
        then: [
          ...Object.values(s.assets)
            .filter(
              (x) =>
                x.owner === by &&
                (playerCardDef(x.code)?.cost ?? 0) === cost &&
                !isPermanent(x.code),
            )
            .map((x): Message => ({ type: 'DiscardAsset', asset: x.id })),
          ...getInvestigator(s, by)
            .hand.filter(
              (c) => playerCardDef(c)?.type === 'asset' && (playerCardDef(c)?.cost ?? 0) === cost,
            )
            .map((card): Message => ({ type: 'DiscardFromHand', investigator: by, card })),
        ],
      }
    }),
    'prompt.plaguebearer.midnight.claws',
  )
})
// Conversión daño ↔ pistas de los Lugares enemigo (no se encadena).
const CONVERTING = 'midnightConverting'
on('midnight.convertDone', (s) => setMeta(s, CONVERTING, 0))
function midnightForced(
  s: GameState,
  t: Parameters<NonNullable<ScenarioBehavior['forced']>>[1],
): Message[] {
  switch (t.type) {
    case 'turnBegins': {
      const here = at(s, t.investigator)
      return here
        ? [specific('midnight.turnForced', { investigator: t.investigator, location: here })]
        : []
    }
    case 'roundEnds':
      return [
        specific('midnight.loyalists'),
        specific('midnight.agendaRound', { index: 0 }),
        specific('midnight.actRound'),
      ]
    case 'enemyPhaseBegins': {
      const site = String(meta(s, 'midnightSite') ?? '')
      const flesh = Object.values(s.treacheries).some(
        (x) => x.code === M.flesh && x.placement.type === 'location',
      )
      // Carne desatada: quienes están en el Lugar vinculado se consideran enfrentados a cada
      // enemigo Miasma (aproximación: cada uno les ataca).
      const attacks: Message[] =
        flesh && site
          ? Object.values(s.enemies)
              .filter((e) => isMiasma(s, e.location) && !e.exhausted && e.location !== site)
              .flatMap((e) =>
                activeInvestigators(s)
                  .filter((i) => i.location === site)
                  .map((i): Message => ({
                    type: 'EnemyAttack',
                    enemy: e.id,
                    investigator: i.id,
                    exhaustAfter: false,
                  })),
              )
          : []
      return [specific('midnight.messengers'), ...attacks]
    }
    case 'afterEnemyDamaged': {
      const e = s.enemies[t.enemy]
      if (!e || !t.by || !isLocationEnemy(e) || meta(s, CONVERTING) === 1) return []
      return [
        { type: 'SetScenarioMeta', key: CONVERTING, value: 1 },
        {
          type: 'DiscoverClues',
          investigator: t.by,
          amount: Math.ceil(t.amount / 2),
          location: e.location,
        },
        specific('midnight.convertDone'),
      ]
    }
    case 'afterDiscoverClues': {
      const e = locationEnemy(s, t.location)
      if (!e || meta(s, CONVERTING) === 1) return []
      return [
        { type: 'SetScenarioMeta', key: CONVERTING, value: 1 },
        {
          type: 'DamageEnemy',
          enemy: e.id,
          amount: Math.ceil((t.amount ?? 1) / 2),
          by: t.investigator,
          source: { code: M.reference },
        },
        specific('midnight.convertDone'),
      ]
    }
    case 'skillTestEnded':
      return meta(s, `midnightDrift:${t.investigator}`) === 1
        ? [
            { type: 'SetScenarioMeta', key: `midnightDrift:${t.investigator}`, value: 0 },
            specific('midnight.towardMiasma', { investigator: t.investigator }),
          ]
        : []
    default:
      return []
  }
}

registerScenario({
  id: MIDNIGHT_HOUR,
  rulesVersion: 1,
  simultaneousAssetAssignment: true,
  sequentialEnemyMovement: true,
  specific: (s, key, data) => run(s, key, data),
  abilities: (s, _self, by) => scenarioAbilities(s, by),
  connections: (s, l) => {
    // Cráter: conectado con cada Lugar Seguro; Cuna: con cada Lugar con horror (y viceversa).
    const crater = s.locations[M.crater]
    if (!crater) return []
    const cradle = sideOf(s, M.crater) === 'enemy'
    const linked = (id: string) => (cradle ? horrorOn(s, id) > 0 : isStable(s, id))
    if (l.id === M.crater)
      return Object.keys(s.locations).filter((id) => id !== M.crater && linked(id))
    return linked(l.id) ? [M.crater] : []
  },
  cannotMoveEnemy: (_s, e) => isLocationEnemy(e),
  enemyKeyword: (s, e, keyword) =>
    e.code === M.baalshandor &&
    s.agendaIndex === 0 &&
    (keyword === 'hunter' || keyword === 'massive')
      ? true
      : null,
  canEnemyEngage: (s, e) => !(e.code === M.baalshandor && act(s) === M.acts.life),
  enemyWouldBeDefeated: (s, e) => {
    if (isLocationEnemy(e)) return locationDefeated(s, e)
    // Acto 1: Baalshandor «abandona el juego» y el plan 1 avanza.
    if (e.code === M.baalshandor && act(s) === M.acts.death)
      return s.agendaIndex === 0
        ? [{ type: 'AdvanceAgenda' }]
        : [{ type: 'SetAsideEnemy', code: M.baalshandor }]
    return null
  },
  // Tripa de Baalshandor: fracasa automáticamente la próxima prueba de esta fase.
  skillModifier: (s, test) =>
    meta(s, `midnightFail:${test.investigator}`) === `${s.round}:${s.phase}` ? -100 : 0,
  forced: (s, t) => {
    const out = midnightForced(s, t)
    if (
      t.type === 'skillTestEnded' &&
      meta(s, `midnightFail:${t.investigator}`) === `${s.round}:${s.phase}`
    )
      out.push({ type: 'SetScenarioMeta', key: `midnightFail:${t.investigator}`, value: '' })
    if (t.type === 'enemyDefeated' && t.enemy.code === M.baalshandor && act(s) === M.acts.life)
      out.push(story('act4b'), {
        type: 'EndScenario',
        outcome: { type: 'resolution', resolution: resolutionAfterLife(s) },
      })
    return out
  },
  tokenEffect: midnightTokens,
  resolution: (s, outcome) => midnightResolution(s, outcome),
})
const resolutionAfterLife = (s: GameState) =>
  meta(s, 'midnightYou') === 1 ? 7 : meta(s, 'midnightWest') === 1 ? 8 : 3

// ---------------------------------------------------------------------------
// Resoluciones (guía ES pp. 22–23 / EN pp. 25–27) y epílogo (ES p. 24 / EN pp. 28–29)
// ---------------------------------------------------------------------------

const resolution = (n: number | string): Message => ({
  type: 'Story',
  entry: {
    title: `story.plaguebearer.midnight.resolution${n}Title`,
    body: `story.plaguebearer.midnight.resolution${n}`,
    effects: [{ key: `story.plaguebearer.midnight.resolution${n}Effect` }],
  },
})
const trauma = (s: GameState, kind: 'physical' | 'mental'): Message[] =>
  s.investigators.map((i): Message =>
    kind === 'physical'
      ? { type: 'SufferTrauma', investigator: i.id, physical: 2 }
      : { type: 'SufferTrauma', investigator: i.id, mental: 2 },
  )
function midnightResolution(
  s: GameState,
  outcome: Parameters<NonNullable<ScenarioBehavior['resolution']>>[1],
): Message[] {
  // Sin resolución porque todos fueron derrotados: con el acto 4, R2; si no, R1.
  let n = outcome.type === 'resolution' ? outcome.resolution : act(s) === M.acts.life ? 2 : 1
  // R3 → R4 (Cthugha), R5 (Hastur) o R6.
  const pre: Message[] = []
  if (n === 3) {
    pre.push({
      type: 'Story',
      entry: {
        title: 'story.plaguebearer.midnight.resolution3Title',
        body: 'story.plaguebearer.midnight.resolution3',
      },
    })
    n = meta(s, 'midnightCthugha') === 1 ? 4 : meta(s, 'midnightHastur') === 1 ? 5 : 6
  }
  const win = recordNote('campaignWon')
  const body: Message[] =
    n === 1
      ? [resolution(1), recordNote('campaignLost')]
      : n === 2
        ? // Decisión: la lista de efectos de la R2 (EN y ES) repite «han muerto»; se aplica
          // «Cada investigador ha muerto» y «Los investigadores ganan la campaña».
          [resolution(2), specific('war.lose', { fate: 'killed' }), win]
        : n === 4
          ? [
              resolution(4),
              recordNote(MIDNIGHT.boundAnew),
              specific('war.lose', { fate: 'insane' }),
              win,
            ]
          : n === 5
            ? [
                resolution(5),
                recordNote(MIDNIGHT.boundAnew),
                specific('war.lose', { fate: 'killed' }),
                win,
              ]
            : n === 6
              ? [
                  resolution(6),
                  { type: 'EarnExperience', amount: 0, victory: true },
                  recordNote(MIDNIGHT.boundAnew),
                  ...trauma(s, 'physical'),
                  win,
                ]
              : n === 7
                ? [
                    resolution(7),
                    { type: 'EarnExperience', amount: 0, victory: true },
                    recordNote(MIDNIGHT.destroyed),
                    recordNote(MIDNIGHT.youConquered),
                    ...trauma(s, 'mental'),
                    win,
                  ]
                : [
                    resolution(8),
                    { type: 'EarnExperience', amount: 0, victory: true },
                    recordNote(MIDNIGHT.destroyed),
                    recordNote(MIDNIGHT.westConquered),
                    ...trauma(s, 'mental'),
                    win,
                  ]
  return [
    ...pre,
    ...body,
    // Resolución 0 (texto oculto): se ofrece al final; el primero que la lea anota el regalo.
    specific('midnight.zero', { index: 0 }),
    ...(n === 1 ? [] : [specific('midnight.epilogue')]),
    endScenario({ type: 'resolution', resolution: n }),
  ]
}
on('midnight.zero', (s, d) => {
  const index = Number(d.index),
    i = s.investigators[index]
  if (!i || meta(s, 'midnightZero') === 1) return s
  return ask(
    s,
    i.id,
    [
      {
        label: 'choice.plaguebearer.friends.read',
        then: [
          resolution(0),
          { type: 'SetScenarioMeta', key: 'midnightZero', value: 1 },
          ...(note(s, MIDNIGHT.twistedGift) ? [] : [recordNote(MIDNIGHT.twistedGift)]),
        ],
      },
      { label: 'choice.skip', then: [specific('midnight.zero', { index: index + 1 })] },
    ],
    'prompt.plaguebearer.midnight.zero',
  )
})
/** Epílogo: si al menos un investigador sobrevivió a la campaña, en orden. */
on('midnight.epilogue', (s) => {
  const log = s.campaignLog
  if (!log) return s
  const alive = s.investigators.filter(
    (i) => !log.investigators[i.id]?.killed && !log.investigators[i.id]?.insane,
  )
  if (!alive.length) return s
  const entry = (key: string): Message => ({
    type: 'Story',
    entry: {
      title: 'story.plaguebearer.midnight.epilogueTitle',
      body: `story.plaguebearer.midnight.epilogue.${key}`,
    },
  })
  const reagent = JSON.parse(log.values.plaguebearerReagent ?? '[]') as string[]
  return push(
    s,
    ...(alive.some((i) => reagent.includes(i.id)) ? [entry('reagent')] : []),
    ...(note(s, MIDNIGHT.twistedGift) && note(s, MIDNIGHT.boundAnew) ? [entry('gift')] : []),
    ...(note(s, 'plaguebearerArkhamTogether') ? [entry('united')] : []),
    ...(note(s, MIDNIGHT.westConquered) ? [entry('west')] : []),
  )
})
