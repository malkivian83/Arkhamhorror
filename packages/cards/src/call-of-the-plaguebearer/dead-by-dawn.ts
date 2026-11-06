import {
  activeInvestigators,
  distancesFrom,
  getInvestigator,
  leadInvestigator,
  nextInt,
  nextStepToward,
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
  skillValueFor,
  type CampaignLog,
  type Choice,
  type Difficulty,
  type Enemy,
  type GameState,
  type Message,
  type ReactionOption,
  type ScenarioDefinition,
  type Trigger,
  type SkillTestKind,
} from '@lcg/engine'
import { ENCOUNTER_SETS } from '../the-path-to-carcosa/encounter-sets'
import { copies, effectTest, endScenario, recordNote } from '../scenario-helpers'
import { PLAGUEBEARER_CHAOS_BAGS } from './campaign'
import { C, ask, damage, lead, on, run, specific } from './helpers'
import { panicked, troubleshooter, treacheries } from './data'
import { N } from './night-data'
import { CURIOSITY } from './friends-in-low-places'
import {
  D,
  P,
  dawnDeck,
  dawnLocations,
  firstAmongMany,
  ichabod,
  ichabodBack,
  reanimated,
  reanimatedDeck,
  virgil,
  virgilBack,
} from './dawn-data'

export const DEAD_BY_DAWN = 'dead-by-dawn'
const AGENCY_BACKUP = '05274'
/** Muerte al amanecer usa ES: se apartan las dos primeras cartas (plan 1b las cita). */
const DECK = 'dawnReanimated'
const ASIDE = 'dawnAside'
const BENEATH = 'dawnBeneath'
const RULES = 'dawnRules'
const respect = (log?: CampaignLog) => !!log?.notes.includes('plaguebearerRespect')
const hard = (s: GameState) => s.difficulty === 'hard' || s.difficulty === 'expert'
const players = (s: GameState) => s.investigators.length
const rules = (s: GameState) => s.scenarioMeta?.[RULES] === 1
const reanimatedEnemies = (s: GameState) => Object.values(s.enemies).filter(reanimated)
const fronts: string[] = [D.virgil, D.ichabod]

export function deadByDawn({
  difficulty = 'standard',
  log,
}: { difficulty?: Difficulty; log?: CampaignLog } = {}): ScenarioDefinition {
  const greyson = respect(log)
  const locations = dawnLocations()
  return {
    id: DEAD_BY_DAWN,
    intro: [
      { title: 'story.plaguebearer.dawn.introTitle', body: 'story.plaguebearer.dawn.intro1' },
      {
        title: 'story.plaguebearer.dawn.introTitle',
        body: greyson
          ? 'story.plaguebearer.dawn.intro2'
          : log?.notes.includes('plaguebearerFirstClaimed')
            ? 'story.plaguebearer.dawn.intro3'
            : 'story.plaguebearer.dawn.intro4',
      },
    ],
    setupInstructions: {
      title: 'story.plaguebearer.dawn.setupTitle',
      body: greyson ? 'story.plaguebearer.dawn.setupRespect' : 'story.plaguebearer.dawn.setup',
    },
    locations: locations.filter((l) => l.id !== P.lab),
    setAsideLocations: locations.filter((l) => l.id === P.lab),
    startingLocation: greyson ? P.grandHall : P.servants,
    agendas: [
      { code: D.agendas[0], name: 'Earthly Remains', doomThreshold: 4 },
      { code: D.agendas[1], name: 'Strange Flesh', doomThreshold: 3 },
      { code: D.agendas[2], name: 'Weird Science', doomThreshold: 3 },
      // Vuelve a por más sustituye ambos mazos: no avanza por perdición.
      { code: D.backForMore, name: 'Back for More', doomThreshold: 999 },
    ],
    acts: [
      greyson
        ? { code: D.acts.doorman, name: 'Friendly Doorman' }
        : { code: D.acts.attack, name: 'Unexpected Attack' },
      { code: D.acts.contraptions, name: 'Careful Contraptions' },
      { code: D.acts.paging, name: 'Paging Dr. West' },
      { code: D.backForMore, name: 'Back for More' },
    ].map((a) => ({
      ...a,
      clueThreshold: 0,
      cluesPerInvestigator: false,
      advanceTiming: 'objective' as const,
    })),
    encounterDeck: [
      ...dawnDeck(),
      ...copies(panicked, 2),
      ...treacheries
        .filter((t) => t.code === C.evidence || (!greyson && t.code === C.suppression))
        .flatMap((t) => copies(t, t.code === C.suppression ? 3 : 2)),
      ...(greyson ? [] : copies(troubleshooter, 2)),
      ...treacheries
        .filter((t) => t.code === C.hands || t.code === C.skin)
        .flatMap((t) => copies(t, 2)),
      ...ENCOUNTER_SETS.chillingCold,
    ],
    setAside: [
      greyson ? ichabod : virgil,
      firstAmongMany,
      ...reanimatedDeck.map((e) => ({ ...e })),
    ],
    chaosBag: [...PLAGUEBEARER_CHAOS_BAGS[difficulty]],
    tokenValues: { skull: 0, cultist: -3, tablet: -2, elderThing: 0 },
    setup: [specific('dawn.setup', { greyson })],
  }
}

// ---------------------------------------------------------------------------
// Preparación
// ---------------------------------------------------------------------------

on('dawn.setup', (s, d) => {
  const [order, rng] = shuffle(
    reanimatedDeck.map((e) => e.code),
    s.rng,
  )
  const greyson = d.greyson === true
  const next: GameState = {
    ...s,
    rng,
    scenarioDecks: { ...s.scenarioDecks, [ASIDE]: order.slice(0, 2), [DECK]: order.slice(2) },
  }
  const log = s.campaignLog
  const readers = JSON.parse(log?.values[CURIOSITY] ?? '[]') as string[]
  const hibbsOwner = s.investigators.find((i) =>
    log?.investigators[i.id]?.storyAssets.includes(N.hibbs),
  )
  const anyone = (code: string, prompt: string): Message[] =>
    s.investigators.length === 1
      ? [{ type: 'PutAssetIntoPlay', investigator: s.investigators[0]!.id, code, noSlot: true }]
      : [specific('dawn.giveAsset', { code, prompt })]
  return push(
    next,
    greyson
      ? { type: 'SpawnSetAsideEnemy', code: D.ichabod, location: P.grandHall }
      : { type: 'SpawnSetAsideEnemy', code: D.virgil, location: P.servants },
    ...(log?.notes.includes('plaguebearerHibbsHelping')
      ? hibbsOwner
        ? [specific('dawn.hibbsFromDeck', { investigator: hibbsOwner.id })]
        : anyone(N.hibbs, 'prompt.plaguebearer.dawn.hibbs')
      : []),
    ...(greyson ? anyone(AGENCY_BACKUP, 'prompt.plaguebearer.dawn.backup') : []),
    ...s.investigators
      .filter((i) => readers.includes(i.id))
      .flatMap((i): Message[] => [
        { type: 'TakeDamage', investigator: i.id, damage: 0, horror: 1, direct: true },
        { type: 'DrawCards', investigator: i.id, amount: 1 },
      ]),
  )
})
// Alianzas frágiles: el apoyo vinculado no ocupa espacios y sale de la partida al terminar.
on('dawn.giveAsset', (s, d) =>
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
on('dawn.hibbsFromDeck', (s, d) => {
  const by = String(d.investigator),
    inHand = getInvestigator(s, by).hand.includes(N.hibbs)
  const without = (cards: string[]) => {
    const index = cards.indexOf(N.hibbs)
    return index < 0 ? cards : cards.filter((_, n) => n !== index)
  }
  return push(
    {
      ...s,
      investigators: s.investigators.map((i) =>
        i.id !== by
          ? i
          : { ...i, hand: without(i.hand), deck: without(i.deck), discard: without(i.discard) },
      ),
    },
    { type: 'PutAssetIntoPlay', investigator: by, code: N.hibbs },
    ...(inHand ? [{ type: 'DrawCards' as const, investigator: by, amount: 1 }] : []),
  )
})

// ---------------------------------------------------------------------------
// Reanimados
// ---------------------------------------------------------------------------

const spawnTop = (s: GameState): Message[] => {
  const [top] = s.scenarioDecks?.[DECK] ?? []
  return top ? [specific('dawn.spawnTop')] : []
}
on('dawn.spawnTop', (s) => {
  const [top, ...rest] = s.scenarioDecks?.[DECK] ?? []
  const card = reanimatedDeck.find((e) => e.code === top)
  if (!card) return s
  return push(
    { ...s, scenarioDecks: { ...s.scenarioDecks, [DECK]: rest } },
    { type: 'SpawnSetAsideEnemy', code: card.code, location: card.spawnAt! },
  )
})
on('dawn.spawnAside', (s) => {
  const aside = s.scenarioDecks?.[ASIDE] ?? []
  if (!aside.length) return s
  const [index, rng] = nextInt(s.rng, aside.length)
  const card = reanimatedDeck.find((e) => e.code === aside[index])!
  return push(
    {
      ...s,
      rng,
      scenarioDecks: { ...s.scenarioDecks, [ASIDE]: aside.filter((_, n) => n !== index) },
    },
    { type: 'SpawnSetAsideEnemy', code: card.code, location: card.spawnAt! },
  )
})
const heal = (s: GameState): Message[] =>
  reanimatedEnemies(s).flatMap((e): Message[] => {
    const extra =
      (e.code === `${D.ichabod}b` ? 1 : 0) +
      Object.values(s.treacheries).filter(
        (t) => t.code === D.flesh && t.placement.type === 'enemy' && t.placement.enemy === e.id,
      ).length
    return e.damageTaken > 0
      ? [{ type: 'HealEnemy', enemy: e.id, amount: Math.min(e.damageTaken, 1 + extra) }]
      : []
  })
const nearest = (s: GameState, by: string, ok: (e: Enemy) => boolean, far = false) => {
  const from = getInvestigator(s, by).location
  if (!from) return []
  const distance = distancesFrom(s, from)
  const found = reanimatedEnemies(s).filter((e) => ok(e) && distance.has(e.location))
  const best = (far ? Math.max : Math.min)(...found.map((e) => distance.get(e.location)!))
  return found.filter((e) => distance.get(e.location) === best)
}
const pickEnemy = (
  s: GameState,
  by: string,
  enemies: Enemy[],
  then: (e: Enemy) => Message[],
): Message[] =>
  enemies.length <= 1
    ? enemies.flatMap(then)
    : [
        {
          type: 'Ask',
          investigator: by,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.chooseEnemy',
            choices: enemies.map((e): Choice => ({
              label: 'choice.enemy',
              params: { enemy: e.name },
              target: { type: 'enemy', id: e.id },
              then: then(e),
            })),
          },
        },
      ]

// Planes: curan 1 daño por ronda; los reversos ponen en juego el Mazo reanimado.
for (const code of D.agendas)
  registerAgenda({
    code,
    forced: (s, t) => (t.type === 'roundEnds' ? heal(s) : []),
    ...(code === D.agendas[2]
      ? {
          // Maníaco de laboratorio: mientras quede Mazo reanimado, se da la vuelta otra vez.
          insteadOfAdvance: (s: GameState) =>
            s.scenarioDecks?.[DECK]?.length
              ? [
                  { type: 'RemoveDoom', target: { type: 'agenda' }, amount: s.doom } as Message,
                  ...spawnTop(s),
                ]
              : null,
          onAdvance: () => [specific('dawn.removeWest'), specific('dawn.backForMore')],
        }
      : {
          onAdvance: (s: GameState) => [
            ...spawnTop(s),
            ...(code === D.agendas[0] && players(s) >= 3 ? [specific('dawn.spawnAside')] : []),
          ],
        }),
  })
registerAgenda({
  code: D.backForMore,
  skipsMythosDoom: false,
  forced: (s, t) =>
    t.type === 'afterDoomPlaced' && s.scenarioMeta?.dawnBackForMore === 1
      ? [specific('dawn.hunters')]
      : [],
})
on('dawn.hunters', (s) => {
  const first = Object.values(s.enemies).find((e) => e.code === D.first)
  const others = reanimatedEnemies(s).map((e) => e.id)
  return ask(
    s,
    lead(s),
    [
      ...(first
        ? [
            {
              label: 'choice.plaguebearer.dawn.huntFirst',
              then: [{ type: 'HuntersMove', enemies: [first.id] } as Message],
            },
          ]
        : []),
      {
        label: 'choice.plaguebearer.dawn.huntReanimated',
        then: [{ type: 'HuntersMove', enemies: others } as Message],
      },
    ],
    'prompt.plaguebearer.dawn.hunters',
  )
})
on('dawn.removeWest', (s) => {
  const placed = Object.values(s.placedAssets ?? {}).find((p) => p.code === D.west)
  const owned = Object.values(s.assets).find((a) => a.code === D.west)
  return push(
    { ...s, scenarioMeta: { ...s.scenarioMeta, dawnWestRemoved: 1 } },
    ...(placed ? [{ type: 'RemovePlacedAsset' as const, placed: placed.id }] : []),
    ...(owned ? [{ type: 'RemoveAssetFromGame' as const, asset: owned.id }] : []),
  )
})
// Vuelve a por más: sustituye los mazos de Plan y Acto y aparece el Primero de muchos.
on('dawn.backForMore', (s) => {
  if (s.scenarioMeta?.dawnBackForMore === 1) return s
  const index = s.acts.findIndex((a) => a.code === D.backForMore)
  return push(
    {
      ...s,
      actIndex: index,
      agendaIndex: s.agendas.findIndex((a) => a.code === D.backForMore),
      doom: 0,
      scenarioMeta: { ...s.scenarioMeta, dawnBackForMore: 1 },
    },
    {
      type: 'Story',
      entry: {
        title: 'story.plaguebearer.dawn.backForMoreTitle',
        body: 'story.plaguebearer.dawn.backForMore',
      },
    },
    { type: 'SpawnSetAsideEnemy', code: D.first, location: P.grandHall },
  )
})

// Actos.
const firstAct = (code: string, front: string, flip: Enemy['code'], place: string) =>
  registerAct({
    code,
    objectiveMet: () => false,
    onAdvance: (s) => {
      const enemy = Object.values(s.enemies).find((e) => e.code === front)
      return [
        ...(enemy
          ? [
              {
                type: 'FlipEnemy',
                enemy: enemy.id,
                card: flip === virgilBack.code ? virgilBack : ichabodBack,
              } as Message,
            ]
          : []),
        { type: 'PutLocationIntoPlay', location: P.lab },
        { type: 'SetScenarioMeta', key: RULES, value: 1 },
        { type: 'SetScenarioMeta', key: 'dawnStart', value: place },
      ]
    },
  })
firstAct(D.acts.attack, D.virgil, virgilBack.code, P.servants)
firstAct(D.acts.doorman, D.ichabod, ichabodBack.code, P.grandHall)
registerAct({
  code: D.acts.contraptions,
  objectiveMet: (s) => activeInvestigators(s).some((i) => i.location === P.lab),
  onAdvance: (s) =>
    s.scenarioMeta?.dawnWestRemoved === 1
      ? []
      : [
          {
            type: 'PlaceAsset',
            code: D.west,
            name: 'Herbert West',
            placement: { type: 'location', location: P.lab },
          },
        ],
})
registerAct({
  code: D.acts.paging,
  objectiveMet: (s) => Object.values(s.assets).some((a) => a.code === D.west),
  onAdvance: () => [specific('dawn.backForMore')],
})
registerAct({ code: D.backForMore, objectiveMet: () => false })

// Virgil e Ichabod: su objetivo hace avanzar el acto 1 en lugar de derrotarlos.
for (const code of fronts)
  registerEnemy({
    code,
    wouldBeDefeated: (s) =>
      s.acts[s.actIndex]?.code === D.acts.attack || s.acts[s.actIndex]?.code === D.acts.doorman
        ? [{ type: 'AdvanceAct' }]
        : null,
  })
registerEnemy({
  code: D.aristotle,
  // Obligado: el daño pasa a otro Reanimado preparado de su Lugar.
  damageTaken: (s, self, amount) => {
    const other = reanimatedEnemies(s).find(
      (e) => e.id !== self.id && e.location === self.location && !e.exhausted,
    )
    return other
      ? { amount: 0, then: [{ type: 'DamageEnemy', enemy: other.id, amount }] }
      : { amount }
  },
})
registerEnemy({
  code: D.banquo,
  forced: (s, t, self) =>
    t.type === 'enemyPhaseBegins' && !self.exhausted && !self.engagedWith
      ? activeInvestigators(s)
          .filter((i) => i.location === self.location)
          .map((i): Message => ({
            type: 'EnemyAttack',
            enemy: self.id,
            investigator: i.id,
            exhaustAfter: false,
          }))
      : [],
})
registerEnemy({
  code: D.first,
  forced: (s, t, self) => {
    if (t.type === 'enemyPhaseBegins') {
      const others = Object.values(s.enemies).filter(
        (e) => e.id !== self.id && e.location === self.location,
      )
      return others.length ? [specific('dawn.beneath', { enemy: self.id })] : []
    }
    return []
  },
})
on('dawn.beneath', (s, d) => {
  const first = s.enemies[String(d.enemy)]
  if (!first) return s
  const others = Object.values(s.enemies).filter(
    (e) => e.id !== first.id && e.location === first.location,
  )
  const enemies = Object.fromEntries(
    Object.entries(s.enemies).filter(([id]) => !others.some((e) => e.id === id)),
  )
  return {
    ...s,
    enemies,
    treacheries: Object.fromEntries(
      Object.entries(s.treacheries).filter(([, t]) => {
        const p = t.placement
        return !(p.type === 'enemy' && others.some((e) => e.id === p.enemy))
      }),
    ),
    scenarioDecks: {
      ...s.scenarioDecks,
      [BENEATH]: [...(s.scenarioDecks?.[BENEATH] ?? []), ...others.map((e) => e.code)],
    },
  }
})

// ---------------------------------------------------------------------------
// Lugares
// ---------------------------------------------------------------------------

const here = (s: GameState, by: string) => getInvestigator(s, by).location
const group = (s: GameState, by: string) =>
  activeInvestigators(s).filter((i) => i.location === here(s, by))
const groupClues = (s: GameState, by: string) => group(s, by).reduce((n, i) => n + i.clues, 0)
const resource = (location: string): Message => specific('dawn.resource', { location })
on('dawn.resource', (s, d) => {
  const id = String(d.location),
    l = s.locations[id]
  return l
    ? { ...s, locations: { ...s.locations, [id]: { ...l, resources: (l.resources ?? 0) + 1 } } }
    : s
})
const once = { per: 'game' as const, group: true }
const spendAbility = (
  s: GameState,
  by: string,
  key: string,
  per: number,
  ok: boolean,
  then: Message[],
) => {
  const cost = per * players(s)
  return ok && groupClues(s, by) >= cost
    ? [
        {
          key,
          label: `ability.plaguebearer.dawn.${key.split(':')[1]}`,
          params: { amount: cost },
          actions: 1,
          provokes: true,
          limit: once,
          costs: [
            { type: 'PayGroupClues' as const, amount: cost, from: group(s, by).map((i) => i.id) },
          ],
          then,
        },
      ]
    : []
}
const reanimatedHere = (s: GameState, id: string) =>
  reanimatedEnemies(s).filter((e) => e.location === id)
const reachable = (s: GameState, id: string) =>
  reanimatedEnemies(s).filter(
    (e) => e.location === id || (s.locations[id]?.connections ?? []).includes(e.location),
  )
const focusedTest = (
  s: GameState,
  by: string,
  e: Enemy,
  skill: 'combat' | 'agility',
  kind: SkillTestKind,
): Message => ({
  type: 'BeginSkillTest',
  investigator: by,
  skill,
  difficulty: skill === 'combat' ? e.fight : e.evade,
  modifier: skillValueFor(s, by, 'intellect', kind),
  kind,
})
for (const id of Object.values(P))
  registerLocation({
    code: id,
    abilities: (s, self, by) => {
      if (!self.revealed || here(s, by) !== id) return []
      const ready = reanimatedHere(s, id).filter((e) => !e.exhausted)
      switch (id) {
        case P.servants:
          return spendAbility(s, by, `${id}:servants`, 2, !reanimatedHere(s, id).length, [
            resource(id),
          ])
        case P.apothecary:
        case P.tub:
          return spendAbility(
            s,
            by,
            `${id}:${id === P.tub ? 'tub' : 'apothecary'}`,
            3,
            !ready.length,
            [resource(id)],
          )
        case P.basement:
          return ready.length
            ? spendAbility(s, by, `${id}:basement`, 4, true, [
                ...pickEnemy(s, by, ready, (e) => [
                  { type: 'DamageEnemy', enemy: e.id, amount: 2, by },
                  { type: 'EvadeEnemy', enemy: e.id, by },
                ]),
                resource(id),
              ])
            : []
        case P.grandHall:
          return [
            ...(reanimatedHere(s, id).some((e) => e.exhausted)
              ? [
                  {
                    key: `${id}:discover`,
                    label: 'ability.plaguebearer.dawn.discover',
                    actions: 1,
                    provokes: true,
                    limit: { per: 'round' as const },
                    then: [
                      { type: 'DiscoverClues' as const, investigator: by, amount: 1, location: id },
                    ],
                  },
                ]
              : []),
            {
              key: `${id}:resign`,
              label: 'ability.plaguebearer.dawn.resign',
              actions: 1,
              provokes: false,
              then: [specific('dawn.resign', { investigator: by })],
            },
          ]
        case P.corridor:
        case P.bedroom: {
          const fight = id === P.corridor
          return reachable(s, id).map((e) => ({
            key: `${id}:${fight ? 'fight' : 'evade'}`,
            actionKind: fight ? ('fight' as const) : ('evade' as const),
            label: `ability.plaguebearer.dawn.${fight ? 'corridor' : 'bedroom'}`,
            params: { enemy: e.name },
            target: { type: 'enemy' as const, id: e.id },
            actions: 1,
            provokes: true,
            ...(fight ? { limit: { per: 'round' as const } } : {}),
            then: [
              focusedTest(
                s,
                by,
                e,
                fight ? 'combat' : 'agility',
                fight
                  ? {
                      type: 'fight',
                      enemy: e.id,
                      extraDamage: 1,
                      onFail: [{ type: 'HealEnemy', enemy: e.id, amount: 2 }],
                    }
                  : {
                      type: 'evade',
                      enemy: e.id,
                      onSuccess: [{ type: 'EnemyStaysExhausted', enemy: e.id }],
                      onFail: [{ type: 'HealEnemy', enemy: e.id, amount: 2 }],
                    },
              ),
            ],
          }))
        }
        case P.lab: {
          const west = Object.values(s.placedAssets ?? {}).find((p) => p.code === D.west)
          return west
            ? [
                {
                  key: `${id}:parley`,
                  label: 'ability.plaguebearer.dawn.parley',
                  actions: 1,
                  provokes: false,
                  parley: true,
                  then: [specific('dawn.parley', { investigator: by, placed: west.id })],
                },
              ]
            : []
        }
      }
      return []
    },
  })
const locationReactions = (s: GameState, t: Trigger): ReactionOption[] => {
  for (const id of [P.abandoned, P.study]) {
    const self = s.locations[id]
    if (!self?.revealed) continue
    if (
      id === P.abandoned &&
      t.type === 'afterSkillTest' &&
      t.succeeded &&
      here(s, t.investigator) === id &&
      s.skillTest &&
      (s.skillTest.kind.type === 'fight' || s.skillTest.kind.type === 'evade') &&
      reanimated(s.enemies[s.skillTest.kind.enemy] ?? {})
    )
      return [
        {
          key: `${id}:clue`,
          investigator: t.investigator,
          label: 'ability.plaguebearer.dawn.abandoned',
          limit: { per: 'phase' },
          then: [{ type: 'GainClues', investigator: t.investigator, amount: 1 }],
        },
      ]
    if (
      id === P.study &&
      t.type === 'afterDiscoverClues' &&
      self.clues === 0 &&
      here(s, t.investigator) === id
    ) {
      const holder = group(s, t.investigator).find((i) =>
        Object.values(s.assets).some((a) => a.code === C.briefcase && a.owner === i.id),
      )
      return holder
        ? [
            {
              key: `${id}:briefcase`,
              investigator: holder.id,
              label: 'ability.plaguebearer.dawn.study',
              limit: once,
              then: reanimatedEnemies(s).map((e): Message => ({
                type: 'DamageEnemy',
                enemy: e.id,
                amount: 2,
                by: holder.id,
              })),
            },
          ]
        : []
    }
  }
  return []
}
on('dawn.resign', (s, d) => {
  const by = String(d.investigator)
  const withWest = Object.values(s.assets).some((a) => a.code === D.west && a.owner === by)
  return push(withWest ? { ...s, scenarioMeta: { ...s.scenarioMeta, dawnWestOut: 1 } } : s, {
    type: 'Resign',
    investigator: by,
  })
})
on('dawn.parley', (s, d) => {
  const placed = s.placedAssets?.[String(d.placed)]
  if (!placed) return s
  const amount = reanimatedHere(s, P.lab).some((e) => e.exhausted) ? 3 : 1
  const clues = (placed.clues ?? 0) + amount
  return push(
    s,
    { type: 'MoveClues', from: { type: 'pool' }, to: { type: 'placed', id: placed.id }, amount },
    ...(clues >= 3 * players(s)
      ? [
          {
            type: 'TakeControlOfPlaced' as const,
            placed: placed.id,
            investigator: String(d.investigator),
          },
        ]
      : []),
  )
})

// ---------------------------------------------------------------------------
// Cartas de encuentro
// ---------------------------------------------------------------------------

registerTreachery({
  code: D.cantGetAway,
  revelation: (_s, by) => [effectTest(by, D.cantGetAway, 'willpower', 4, {})],
})
on('dawn.cantGetAway', (s, d) => {
  const by = String(d.investigator),
    n = Number(d.margin)
  const far = nearest(s, by, () => true, true)
  return ask(
    s,
    by,
    [
      { label: 'choice.plaguebearer.dawn.horror', params: { amount: n }, then: [damage(by, 0, n)] },
      ...(far.length
        ? [
            {
              label: 'choice.plaguebearer.dawn.lure',
              then: pickEnemy(s, by, far, (e) => [
                { type: 'ReadyEnemy', enemy: e.id },
                { type: 'MoveEnemy', enemy: e.id, location: here(s, by)! },
              ]),
            },
          ]
        : []),
    ],
    'prompt.plaguebearer.dawn.cantGetAway',
  )
})
registerTreachery({
  code: D.fear,
  revelation: (_s, by, self) => [
    {
      type: 'PlaceTreachery',
      treachery: self.id,
      placement: { type: 'threatArea', investigator: by },
    },
  ],
  forced: (s, t, self) =>
    t.type === 'afterMove' &&
    self.placement.type === 'threatArea' &&
    t.investigator === self.placement.investigator &&
    reanimatedHere(s, here(s, t.investigator) ?? '').length
      ? [damage(t.investigator, 0, 1)]
      : [],
  abilities: (s, self, by) =>
    self.placement.type === 'threatArea' &&
    self.placement.investigator === by &&
    reanimatedHere(s, here(s, by) ?? '').some((e) => e.damageTaken >= 4)
      ? [
          {
            key: `${self.id}:discard`,
            label: 'ability.plaguebearer.dawn.fear',
            actions: 0,
            provokes: false,
            then: [{ type: 'DiscardTreachery', treachery: self.id }],
          },
        ]
      : [],
})
registerTreachery({
  code: D.flesh,
  attachedEnemy: { health: 2 },
  revelation: (s, by, self) => {
    const options = nearest(s, by, () => true)
    return options.length
      ? pickEnemy(s, by, options, (e) => [
          { type: 'PlaceTreachery', treachery: self.id, placement: { type: 'enemy', enemy: e.id } },
        ])
      : []
  },
  forced: (_s, t, self) =>
    t.type === 'afterEnemyAttack' &&
    self.placement.type === 'enemy' &&
    t.enemy === self.placement.enemy
      ? [{ type: 'DiscardTreachery', treachery: self.id }]
      : [],
})
registerTreachery({
  code: D.legions,
  revelation: (s, by) => {
    const target = here(s, by)
    const unengaged = reanimatedEnemies(s).filter((e) => !e.engagedWith)
    const damaged = nearest(s, by, (e) => e.damageTaken > 0)
    return [
      {
        type: 'Ask',
        investigator: by,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.plaguebearer.dawn.legions',
          choices: [
            {
              label: 'choice.plaguebearer.dawn.legionsMove',
              then: unengaged.flatMap((e): Message[] => {
                const step = target ? nextStepToward(s, e.location, (l) => l === target) : null
                return step ? [{ type: 'MoveEnemy', enemy: e.id, location: step }] : []
              }),
            },
            {
              label: 'choice.plaguebearer.dawn.legionsHeal',
              then: pickEnemy(s, by, damaged, (e) => [
                { type: 'ReadyEnemy', enemy: e.id },
                { type: 'HealEnemy', enemy: e.id, amount: e.damageTaken },
              ]),
            },
          ],
        },
      },
    ]
  },
})

// ---------------------------------------------------------------------------
// Cartas de jugador del escenario
// ---------------------------------------------------------------------------

registerPlayerCards([
  {
    code: D.west,
    name: 'Herbert West',
    type: 'asset',
    class: 'neutral',
    cost: 2,
    story: true,
    unique: true,
    traits: ['Ally', 'Medic', 'Sorcerer'],
    slots: ['ally'],
    health: 1,
    sanity: 3,
    icons: { willpower: 1, wild: 1 },
  },
  {
    code: D.deathsHold,
    name: 'Death’s Hold',
    type: 'treachery',
    class: 'neutral',
    traits: ['Flaw', 'Geist'],
    story: true,
    weakness: 'Death’s Hold',
  },
  {
    code: D.folly,
    name: 'The Folly of Man',
    type: 'treachery',
    class: 'neutral',
    traits: ['Flaw', 'Injury'],
    story: true,
    weakness: 'The Folly of Man',
  },
])
registerPlayerCard({
  code: D.west,
  skillModifier: (_s, a, t) => (t.investigator === a.owner && t.skill === 'intellect' ? 1 : 0),
})
registerPlayerCard({
  code: D.deathsHold,
  revelation: (_s, by) => [
    { type: 'TakeDamage', investigator: by, damage: 0, horror: 2, direct: true },
  ],
})
registerPlayerCard({
  code: D.folly,
  revelation: (_s, by) => [
    { type: 'TakeDamage', investigator: by, damage: 2, horror: 0, direct: true },
  ],
})

// ---------------------------------------------------------------------------
// Escenario
// ---------------------------------------------------------------------------

/** Herbert West: «Cuando un enemigo fuese a ser derrotado en tu Lugar, agota a Herbert West». */
function westInstead(s: GameState, e: Enemy): Message[] | null {
  if (s.scenarioMeta?.dawnWestDeclined === e.id) return null
  const west = Object.values(s.assets).find(
    (a) => a.code === D.west && !a.exhausted && here(s, a.owner) === e.location,
  )
  if (!west) return null
  return [
    {
      type: 'Ask',
      investigator: west.owner,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.plaguebearer.dawn.west',
        choices: [
          {
            label: 'choice.plaguebearer.dawn.west',
            params: { enemy: e.name },
            then: [
              { type: 'ExhaustAsset', asset: west.id },
              { type: 'HealEnemy', enemy: e.id, amount: 2 },
              { type: 'DiscoverClues', investigator: west.owner, amount: 2, location: e.location },
            ],
          },
          {
            label: 'choice.skip',
            then: [
              { type: 'SetScenarioMeta', key: 'dawnWestDeclined', value: e.id },
              { type: 'DefeatEnemy', enemy: e.id },
            ],
          },
        ],
      },
    },
  ]
}
const killedBy = (s: GameState) =>
  s.investigators.every((i) => i.eliminated && !i.resigned) &&
  !s.investigators.some((i) => i.resigned)
registerScenario({
  id: DEAD_BY_DAWN,
  rulesVersion: 1,
  simultaneousAssetAssignment: true,
  sequentialEnemyMovement: true,
  specific: (s, key, data) => run(s, key, data),
  reactions: (s, t) => locationReactions(s, t),
  canEnter: (s, _by, _from, to) =>
    to !== P.lab || Object.values(s.locations).filter((l) => (l.resources ?? 0) > 0).length >= 3,
  cannotLeave: (s, by) => {
    const act = s.acts[s.actIndex]?.code
    const where = here(s, by)
    return (
      (act === D.acts.attack && where === P.servants) ||
      (act === D.acts.doorman && where === P.grandHall)
    )
  },
  enemyPrey: (s, e) =>
    fronts.includes(e.code) || e.code === `${D.virgil}b` || e.code === `${D.ichabod}b`
      ? { type: 'investigator', investigator: (leadInvestigator(s) ?? s.investigators[0]!).id }
      : undefined,
  // No pueden ser derrotados: solo el objetivo del acto 1 y Herbert West intervienen.
  enemyWouldBeDefeated: (s, e) =>
    reanimated(e) && !fronts.includes(e.code) ? [] : westInstead(s, e),
  enemyStat: (s, e, stat) =>
    e.code === D.first && (stat === 'fight' || stat === 'evade')
      ? (s.scenarioDecks?.[BENEATH]?.length ?? 0)
      : 0,
  enemyHorrorModifier: (s, e) =>
    Object.values(s.treacheries).filter(
      (t) => t.code === D.flesh && t.placement.type === 'enemy' && t.placement.enemy === e.id,
    ).length,
  forced: (s, t) => {
    if (
      t.type === 'afterEnemyDamaged' &&
      rules(s) &&
      (t.excess ?? 0) > 0 &&
      s.enemies[t.enemy] &&
      reanimated(s.enemies[t.enemy]!)
    )
      return [
        { type: 'ExhaustEnemy', enemy: t.enemy },
        { type: 'DisengageEnemy', enemy: t.enemy },
      ]
    // Objetivo del Primero de muchos: si es derrotado, R4.
    if (t.type === 'enemyDefeated' && t.enemy.code === D.first)
      return [{ type: 'EndScenario', outcome: { type: 'resolution', resolution: 4 } }]
    if (t.type === 'enemyPhaseEnds' && rules(s))
      return reanimatedEnemies(s)
        .filter((e) => e.damageTaken > e.maxHealth)
        .map((e): Message => ({ type: 'EnemyStaysExhausted', enemy: e.id }))
    if (
      t.type === 'afterSkillTest' &&
      !t.succeeded &&
      s.skillTest?.kind.type === 'effect' &&
      s.skillTest.kind.source === D.cantGetAway
    )
      return [specific('dawn.cantGetAway', { investigator: t.investigator, margin: -t.margin })]
    return []
  },
  tokenEffect: (s, token, by) => {
    if (token === 'skull') {
      const most = Math.max(0, ...reanimatedEnemies(s).map((e) => e.damageTaken))
      return { modifier: -Math.min(5, most + (hard(s) ? 2 : 0)) }
    }
    if (token === 'cultist')
      return {
        modifier: hard(s) ? -5 : -3,
        onSuccess: [specific('dawn.cultist', { investigator: by })],
      }
    if (token === 'tablet')
      return {
        modifier: hard(s) ? -3 : -2,
        onFail: [specific('dawn.tablet', { investigator: by })],
      }
    throw new Error(`Dead by Dawn: token ${token} is not implemented`)
  },
  resolution: (s, outcome) => resolution(s, outcome),
})
on('dawn.cultist', (s, d) => {
  const by = String(d.investigator)
  return push(
    s,
    ...pickEnemy(s, by, reanimatedEnemies(s), (e) => [
      { type: 'DamageEnemy', enemy: e.id, amount: 1, by },
    ]),
  )
})
on('dawn.tablet', (s, d) => {
  const by = String(d.investigator)
  return push(
    s,
    ...pickEnemy(
      s,
      by,
      nearest(s, by, (e) => e.exhausted),
      (e) => [{ type: 'ReadyEnemy', enemy: e.id }],
    ),
  )
})

// ---------------------------------------------------------------------------
// Resoluciones (guía ES p. 8 / EN pp. 8–9)
// ---------------------------------------------------------------------------

const story = (n: number) => ({
  title: `story.plaguebearer.dawn.resolution${n}Title`,
  body: `story.plaguebearer.dawn.resolution${n}`,
})
function resolution(
  s: GameState,
  outcome: Parameters<NonNullable<import('@lcg/engine').ScenarioBehavior['resolution']>>[1],
): Message[] {
  const n =
    outcome.type === 'resolution'
      ? outcome.resolution
      : killedBy(s)
        ? 1
        : s.scenarioMeta?.dawnWestOut === 1
          ? 2
          : 3
  if (n === 1)
    return [
      {
        type: 'Story',
        entry: story(1),
        choices: [
          { label: 'choice.plaguebearer.dawn.payPrice', then: resolutionFive(s) },
          {
            label: 'choice.plaguebearer.dawn.dieSometime',
            then: [
              specific('dawn.killAll'),
              recordNote('campaignLost'),
              endScenario({ type: 'resolution', resolution: 1 }),
            ],
          },
        ],
      },
    ]
  if (n === 5) return resolutionFive(s)
  const note =
    n === 2
      ? 'plaguebearerWestLeading'
      : n === 3
        ? 'plaguebearerWestTaken'
        : 'plaguebearerFirstDead'
  return [
    { type: 'Story', entry: story(n) },
    { type: 'EarnExperience', amount: 0, victory: true },
    recordNote(note),
    endScenario({ type: 'resolution', resolution: n }),
  ]
}
function resolutionFive(s: GameState): Message[] {
  return [
    { type: 'Story', entry: story(5) },
    specific('dawn.hidden', { index: 0 }),
    specific('dawn.revive'),
    recordNote('plaguebearerBloodInVeins'),
    ...s.investigators.flatMap((i): Message[] => [
      { type: 'AddStoryAsset', investigator: i.id, code: D.folly },
      { type: 'AddStoryAsset', investigator: i.id, code: D.deathsHold },
    ]),
    { type: 'EarnExperience', amount: 0, victory: true },
    recordNote('plaguebearerSkipDeadOrAlive'),
    endScenario({ type: 'resolution', resolution: 5 }),
  ]
}
on('dawn.hidden', (s, d) => {
  const index = Number(d.index),
    i = s.investigators[index]
  if (!i) return s
  const next = specific('dawn.hidden', { index: index + 1 })
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
              title: 'story.plaguebearer.hiddenTitle',
              body: 'story.plaguebearer.dawn.resolution5Hidden',
            },
          },
          next,
        ],
      },
      { label: 'choice.skip', then: [next] },
    ],
    'prompt.plaguebearer.dawn.hidden',
  )
})
const updateLog = (s: GameState, f: (log: CampaignLog) => CampaignLog): GameState =>
  s.campaignLog ? { ...s, campaignLog: f(s.campaignLog) } : s
// Algo os ha dado una segunda oportunidad: se curan todos los traumas físicos.
on('dawn.revive', (s) =>
  updateLog(s, (log) => ({
    ...log,
    investigators: Object.fromEntries(
      Object.entries(log.investigators).map(([id, r]) => [
        id,
        s.investigators.some((i) => i.id === id) ? { ...r, physicalTrauma: 0, killed: false } : r,
      ]),
    ),
  })),
)
on('dawn.killAll', (s) =>
  updateLog(s, (log) => ({
    ...log,
    investigators: Object.fromEntries(
      Object.entries(log.investigators).map(([id, r]) => [
        id,
        s.investigators.some((i) => i.id === id) ? { ...r, killed: true } : r,
      ]),
    ),
  })),
)
