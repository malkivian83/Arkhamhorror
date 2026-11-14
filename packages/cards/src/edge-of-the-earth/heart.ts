import {
  activeInvestigators,
  distancesFrom,
  leadInvestigator,
  nextInt,
  push,
  registerAct,
  registerAgenda,
  registerScenario,
  shroudOf,
  spendableClues,
  shuffle,
  type AbilityOption,
  type Choice,
  type Enemy,
  type GameState,
  type Message,
  type ScenarioBehavior,
  type ScenarioDefinition,
  type Trigger,
} from '@lcg/engine'
import type { ScenarioContext } from '../campaign-definition'
import { endScenario, resolution, effectTest } from '../scenario-helpers'
import { EOTE_HEART_ONE, EOTE_HEART_TWO } from './ice-and-death-cards'
import { edgeOfTheEarthStartingBag } from './opening'
import { iceAndDeathRules } from './ice-and-death'
import { interludeBonuses } from './forbidden-peaks'
import { sledgeAbilities, supplyStep } from './forbidden-peaks-supplies'
import { heartDeck, namelessMadness } from './heart-encounters'
import {
  at,
  canPay,
  collapsed,
  collapsedPylons,
  GATE,
  heartAsk,
  heartCard,
  heartMap,
  heartMessage as m,
  heartStory as read,
  isPylon,
  meta,
  ownedSeals,
  payHeart,
  putSeal,
  SEALS,
  sealLocation,
  seals,
  sealTransfers,
  setMeta,
  sameHeartLine,
  type Seal,
} from './heart-common'
import { heartPlayers as perInvestigator } from './heart-common'
import './heart-locations'
import { resolveMirageEncounter } from './mirage-shared-encounters'

const lead = (s: GameState) => leadInvestigator(s)?.id ?? s.investigators[0]!.id
const one = (s: GameState) => s.scenarioId === EOTE_HEART_ONE
const alive = (s: GameState, partner: string) =>
  ['safe', 'resolute'].includes(
    s.campaignLog?.expedition?.partners[partner as '08714']?.status ?? '',
  )
const hard = (s: GameState) => s.difficulty === 'hard' || s.difficulty === 'expert'
const gatePlaced = (s: GameState) => seals(s).filter((t) => t.holder === 'l:' + GATE && t.active)
const clueChoices = (
  s: GameState,
  locations: string[],
  by: string,
  then: (id: string) => Message[],
): Choice[] =>
  locations.map((id) => ({
    label: 'choice.location',
    params: { location: s.locations[id]!.name },
    target: { type: 'location', id },
    then: then(id),
  }))

function material(context: ScenarioContext, part: 1 | 2): ScenarioDefinition {
  const map = heartMap(part, context.seed),
    deck = heartDeck(part, context.investigators.length)
  return {
    id: part === 1 ? EOTE_HEART_ONE : EOTE_HEART_TWO,
    ...map,
    ...deck,
    startingLocation: null,
    chaosBag: edgeOfTheEarthStartingBag(context),
    tokenValues: {},
    // Danforth and Takada (Interlude III) only affect the next game: part I.
    ...(part === 1 ? { startingBonuses: interludeBonuses(context, 'edgeOfTheEarthHeart') } : {}),
    agendas: (part === 1 ? ['08659', '08660', '08661'] : ['08671', '08672']).map((code) => ({
      code,
      name: heartCard(code).name,
      doomThreshold: heartCard(code).doom ?? 999999,
    })),
    acts: (part === 1 ? ['08662', '08663'] : ['08673']).map((code) => ({
      code,
      name: heartCard(code).name,
      clueThreshold: 0,
      cluesPerInvestigator: false,
      advanceTiming: 'objective' as const,
    })),
    setup: [m('setup', { part, inner: map.inner.join(',') })],
  }
}
export function heartOfMadnessOne(context: ScenarioContext): ScenarioDefinition {
  return {
    ...material(context, 1),
    intro: {
      title: 'story.edgeOfTheEarth.heartIntro.title',
      body: 'story.edgeOfTheEarth.heartIntro.body',
    },
    setup: [m('introduction'), ...(material(context, 1).setup ?? [])],
  }
}
export function heartOfMadnessTwo(context: ScenarioContext): ScenarioDefinition {
  return {
    ...material(context, 2),
    setup: [m('secondIntro'), ...(material(context, 2).setup ?? [])],
  }
}

/** All seal state required by the checkpoint is kept in the campaign log. */
function saveSeals(s: GameState): GameState {
  if (!s.campaignLog) return s
  const values: Record<string, string> = { ...s.campaignLog.values, edgeOfTheEarthHeartPlayed: '1' }
  for (const seal of SEALS) {
    const t = seals(s).find((t) => t.seal === seal)
    const owner = t?.holder.startsWith('i:')
      ? s.investigators.find((i) => i.id === t.holder.slice(2))
      : undefined
    values['heartSeal:' + seal] =
      t?.holder === 'l:' + GATE && t.active
        ? 'placed'
        : owner && (!owner.eliminated || owner.resigned)
          ? 'recovered:' + owner.id
          : 'removed'
  }
  return { ...s, campaignLog: { ...s.campaignLog, values } }
}
function firstConclusion(s: GameState, outcome: number): GameState {
  if (meta(s, 'ending')) return s
  s = setMeta(saveSeals(s), 'ending', 1)
  const activated = seals(s).filter(
    (t) =>
      t.active &&
      (t.holder.startsWith('l:') ||
        s.investigators.some((i) => t.holder === 'i:' + i.id && (!i.eliminated || i.resigned))),
  ).length
  const effects: Message[] =
    outcome === 3
      ? [
          read('heartOneResolution3'),
          { type: 'RecordNote', note: 'edgeOfTheEarthSealUsedIncorrectly' },
          { type: 'KillInvestigators' },
          { type: 'RecordNote', note: 'campaignLost' },
          endScenario(resolution(3)),
        ]
      : [
          ...(outcome === 0 ? [read('heartOneNoResolution')] : []),
          read(outcome === 1 ? 'heartOneResolution1' : 'heartOneResolution2'),
          { type: 'EarnExperience', amount: activated, victory: true },
          read('heartCheckpoint1'),
          ...heartAsk(lead(s), 'heartCheckpoint', [
            {
              label: 'choice.edgeOfTheEarth.heartContinue',
              then: [m('checkpoint', { immediate: true, outcome: outcome === 1 ? 1 : 2 })],
            },
            {
              label: 'choice.edgeOfTheEarth.heartRest',
              then: [m('checkpoint', { immediate: false, outcome: outcome === 1 ? 1 : 2 })],
            },
          ]),
        ]
  return push(s, ...effects)
}
function collision(s: GameState): GameState {
  const locations = seals(s)
    .filter((t) => t.active && t.holder.startsWith('i:'))
    .map((t) => sealLocation(s, t))
    .filter(Boolean)
  return one(s) && locations.some((l, i) => locations.indexOf(l) !== i) ? firstConclusion(s, 3) : s
}
function finalConclusion(s: GameState, outcome: 0 | 1 | 2 | 3): GameState {
  if (meta(s, 'ending')) return s
  s = setMeta(s, 'ending', 1)
  const effects: Message[] = [
    read(outcome === 0 ? 'heartTwoNoResolution' : 'heartTwoResolution' + outcome),
  ]
  if (outcome === 0) {
    for (const partner of Object.keys(s.campaignLog?.expedition?.partners ?? {}))
      effects.push({
        type: 'SetExpeditionPartnerStatus',
        partner: partner as '08714',
        status: 'eliminated',
      })
    effects.push(
      { type: 'RecordNote', note: 'edgeOfTheEarthNamelessMadnessEscaped' },
      { type: 'DriveDefeatedInsane', all: true },
      { type: 'RecordNote', note: 'campaignLost' },
    )
  } else {
    if (outcome === 1)
      effects.push(
        { type: 'SetExpeditionPartnerStatus', partner: '08720', status: 'eliminated' },
        { type: 'RecordNote', note: 'edgeOfTheEarthKenslerEntity' },
      )
    effects.push(
      {
        type: 'RecordNote',
        note:
          outcome === 1
            ? 'edgeOfTheEarthMadnessContained'
            : outcome === 2
              ? 'edgeOfTheEarthFacilityDestroyed'
              : 'edgeOfTheEarthFledFacility',
      },
      { type: 'EarnExperience', amount: outcome === 3 ? 5 : 10, victory: true },
    )
    if (outcome !== 1)
      effects.push({
        type: 'SufferTrauma',
        physical: outcome === 2 ? 1 : 2,
        mental: outcome === 2 ? 1 : 2,
      })
    effects.push(m('epilogue'))
  }
  effects.push(endScenario(outcome === 0 ? { type: 'noResolution' } : resolution(outcome)))
  return push(s, ...effects)
}

const actions = (s: GameState, by: string): AbilityOption[] => [
  ...sledgeAbilities(s, by),
  ...sealTransfers(s, by),
]
function token(s: GameState, t: string, by: string) {
  switch (t) {
    case 'skull':
      return {
        modifier: -(Object.values(s.enemies).some(
          (e) => e.location === at(s, by) && e.traits?.includes('Ancient One'),
        )
          ? hard(s)
            ? 4
            : 3
          : hard(s)
            ? 2
            : 1),
      }
    case 'cultist':
      return { modifier: -1 }
    case 'tablet':
      return {
        modifier: -3,
        ...(hard(s)
          ? {
              immediate: [
                {
                  type: 'ShuffleTekeliliIntoDeck' as const,
                  investigator: by,
                  amount: 1,
                  drawInstead: true,
                },
              ],
            }
          : {
              onFail: [
                {
                  type: 'ShuffleTekeliliIntoDeck' as const,
                  investigator: by,
                  amount: 1,
                  drawInstead: true,
                },
              ],
            }),
      }
    case 'elderThing':
      return {
        modifier: hard(s) ? -5 : -4,
        onFailBy: {
          atLeast: 3,
          then: [{ type: 'PlaceDoom' as const, amount: 1 }, { type: 'CheckAgenda' as const }],
        },
      }
    default:
      return { modifier: 0 }
  }
}
function forced(s: GameState, t: Trigger): Message[] {
  if (t.type === 'whenRevealChaosToken' && s.skillTest?.revealing) {
    const held = s.skillTest.revealing
    if (
      held.face === 'cultist' &&
      (seals(s).some((x) => sealLocation(s, x) === at(s, t.investigator)) ||
        isPylon(at(s, t.investigator) ?? ''))
    )
      return [
        { type: 'TreatRevealedTokenAs', token: 'frost' },
        ...(hard(s) ? [{ type: 'ReplaceRevealedTokenEffect' as const, modifier: -2 }] : []),
      ]
    if (
      held.face === 'frost' &&
      at(s, t.investigator)?.startsWith('08655') &&
      meta(s, 'sprawl:' + at(s, t.investigator)) !== s.round
    )
      return [
        m('sprawl', { location: at(s, t.investigator)! }),
        {
          type: 'ReplaceRevealedTokenEffect',
          modifier: held.token === 'cultist' && hard(s) ? -4 : -3,
        },
      ]
  }
  if (one(s) && !meta(s, 'ending')) {
    const holders = seals(s)
      .filter((x) => x.active && x.holder.startsWith('i:'))
      .map((x) => sealLocation(s, x))
      .filter(Boolean)
    if (holders.some((p, i) => holders.indexOf(p) !== i)) return [m('collision')]
  }
  if (t.type === 'investigatorDefeated') return [m('loseSeals', { investigator: t.investigator })]
  if (
    t.type === 'roundEnds' &&
    !one(s) &&
    !meta(s, 'escape') &&
    (collapsedPylons(s).length === 5 ||
      Object.values(s.enemies).filter((e) => e.code === '08679').length === 15)
  )
    return [m('escape', { all: collapsedPylons(s).length === 5 })]
  if (t.type === 'afterMove' && !one(s) && meta(s, 'escape')) return [m('checkExit')]
  if (t.type === 'enemyPhaseEnds') return [m('extraEnemies')]
  return []
}
function attackTargets(s: GameState): Enemy[] {
  if (meta(s, 'escape')) return []
  return Object.values(s.locations)
    .filter((l) => l.revealed && isPylon(l.id) && !collapsed(s, l.id))
    .map((l) => ({
      kind: 'enemy',
      code: l.id,
      id: 'heart-pylon:' + l.id,
      name: l.name,
      location: l.id,
      fight: shroudOf(s, l.id),
      health: l.clueValue * perInvestigator(s),
      maxHealth: l.clueValue * perInvestigator(s),
      damageTaken: Number(meta(s, 'damage:' + l.id) ?? 0),
      evade: 0,
      damage: 0,
      horror: 0,
      engagedWith: null,
      exhausted: true,
      keywords: [],
      traits: [],
    }))
}
function damagePylon(s: GameState, id: string, amount: number): GameState {
  if (
    amount <= 0 ||
    !isPylon(id) ||
    collapsed(s, id) ||
    Object.values(s.enemies).some((e) => e.code === '08680' && !e.exhausted && e.location === id)
  )
    return s
  return setMeta(
    s,
    'damage:' + id,
    Number(meta(s, 'damage:' + id) ?? 0) + Math.max(0, amount) + (meta(s, 'unleashed:a') ? 1 : 0),
  )
}
function spawnMadness(s: GameState, first = false): Message[] {
  if (!s.setAside.some((c) => c.code === '08679')) return []
  let choices: string[]
  if (meta(s, 'escape')) {
    const people = activeInvestigators(s).filter((i) => i.location)
    const left = Math.min(...people.map((i) => s.locations[i.location!]!.position?.[0] ?? 0))
    choices = [
      ...new Set(
        people
          .filter((i) => (s.locations[i.location!]!.position?.[0] ?? 0) === left)
          .map((i) => i.location!),
      ),
    ]
  } else {
    const occupied = new Set(
      Object.values(s.enemies)
        .filter((e) => e.code === '08679')
        .map((e) => e.location),
    )
    const candidates = Object.values(s.locations).filter(
      (l) =>
        l.id !== GATE &&
        (first
          ? isPylon(l.id)
          : !occupied.has(l.id) && l.connections.some((id) => occupied.has(id))),
    )
    const distances = activeInvestigators(s).flatMap((i) =>
      i.location ? [distancesFrom(s, i.location)] : [],
    )
    const dist = (id: string) => Math.min(...distances.map((d) => d.get(id) ?? Infinity))
    const nearest = Math.min(...candidates.map((l) => dist(l.id)))
    choices = candidates
      .filter((l) => Number.isFinite(nearest) && dist(l.id) === nearest)
      .map((l) => l.id)
  }
  return choices.length === 1
    ? [{ type: 'SpawnSetAsideEnemy', code: '08679', location: choices[0]! }]
    : heartAsk(
        lead(s),
        'heartSpawn',
        clueChoices(s, choices, lead(s), (id) => [
          { type: 'SpawnSetAsideEnemy', code: '08679', location: id },
        ]),
      )
}
const common: Omit<ScenarioBehavior, 'id'> = {
  abilities: (s, _self, by) => actions(s, by),
  forced,
  tokenEffect: token,
  canEnter: (s, _by, _from, to) => one(s) || to !== GATE,
  enemyConnections: (s, id) =>
    s.locations[id]?.connections.filter((x) => one(s) || x !== GATE) ?? [],
  enemyImmune: (_s, e) => e.code === '08679',
  enemyKeyword: (s, e, key) =>
    e.code === '08679' && key === 'hunter' && !!meta(s, 'escape') ? true : null,
  enemyPrey: (s, e) =>
    e.code === '08669'
      ? {
          type: 'onlyInvestigators',
          investigators: activeInvestigators(s)
            .filter((i) => ownedSeals(s, i.id).length)
            .map((i) => i.id),
        }
      : undefined,
  canEnemyEngage: (s, e, by) => e.code !== '08669' || ownedSeals(s, by).length > 0,
  attackableLocations: attackTargets,
  isAttackableLocation: (_s, id) => id.startsWith('heart-pylon:') && isPylon(id.slice(12)),
  damageAttackableLocation: (s, d) =>
    damagePylon(s, d.enemy.slice('heart-pylon:'.length), d.amount),
  shroudModifier: (s, l) => (isPylon(l.id) && meta(s, 'unleashed:b') ? -2 : 0),
  skillModifier: (s, t) => (isPylon(at(s, t.investigator) ?? '') && meta(s, 'unleashed:c') ? 1 : 0),
  enemyStat: (s, e) =>
    !e.id.startsWith('heart-pylon:') && isPylon(e.location) && meta(s, 'unleashed:e') ? -2 : 0,
  replaceDoom: (s) =>
    !one(s) &&
    (s.agendas[s.agendaIndex]?.code === '08672' || meta(s, 'escape')) &&
    s.setAside.some((c) => c.code === '08679')
      ? spawnMadness(s)
      : null,
  beforeDamage: (s, d) =>
    !one(s) &&
    meta(s, 'unleashed:d') &&
    isPylon(at(s, d.investigator) ?? '') &&
    (d.damage > 0 || d.horror > 0)
      ? heartAsk(d.investigator, 'heartCancel', [
          ...(d.damage > 0
            ? [
                {
                  label: 'choice.edgeOfTheEarth.heartCancelDamage',
                  then: [{ ...d, damage: d.damage - 1, scenarioChecked: true }],
                },
              ]
            : []),
          ...(d.horror > 0
            ? [
                {
                  label: 'choice.edgeOfTheEarth.heartCancelHorror',
                  then: [{ ...d, horror: d.horror - 1, scenarioChecked: true }],
                },
              ]
            : []),
        ])
      : null,
  beforeMove: (s, move) => {
    const from = at(s, move.investigator)
    if (
      !meta(s, 'escape') &&
      isPylon(move.location) &&
      !s.locations[move.location]?.revealed &&
      !move.entryPaid
    ) {
      if (!canPay(s, move.investigator, perInvestigator(s))) return []
      return [
        m('pay', {
          investigator: move.investigator,
          clues: perInvestigator(s),
          next: 'enterPylon',
          move: JSON.stringify(move),
        }),
      ]
    }
    if (!meta(s, 'escape') || !from?.startsWith('0868') || from === '08686' || move.checked)
      return null
    const difficulty = 4 - Number(from.slice(4, 5)) + 2 // ramps 08682…08685: 4…1
    const neighbours = new Set([from, ...s.locations[from]!.connections])
    const people = activeInvestigators(s).filter(
      (i) => i.location && neighbours.has(i.location) && spendableClues(s, i.id) > 0,
    )
    const test = effectTest(move.investigator, from, 'agility', difficulty, {
      onSuccess: [{ ...move, checked: true }],
    })
    return heartAsk(move.investigator, 'heartRamp', [
      ...people.map((i) => ({
        label: 'choice.investigator',
        params: { name: i.name },
        then: [
          { type: 'SpendClues' as const, investigator: i.id, amount: 1 },
          { ...move, checked: true },
        ],
      })),
      { label: 'choice.edgeOfTheEarth.heartTestRamp', then: [test] },
    ])
  },
  blanksTreachery: iceAndDeathRules.blanksTreachery!,
  cannotDrawCards: iceAndDeathRules.cannotDrawCards!,
  cannotPlay: iceAndDeathRules.cannotPlay!,
  reactions: (s, t) =>
    !one(s) &&
    t.type === 'afterDiscoverClues' &&
    (t.amount ?? 0) > 0 &&
    t.location &&
    isPylon(t.location) &&
    !collapsed(s, t.location) &&
    spendableClues(s, t.investigator) >= (t.amount ?? 0) &&
    !Object.values(s.enemies).some(
      (e) => e.code === '08680' && !e.exhausted && e.location === t.location,
    )
      ? [
          {
            key: 'heart:pylonClues',
            investigator: t.investigator,
            label: 'ability.edgeOfTheEarth.heart.spendPylonClues',
            params: { n: t.amount ?? 0 },
            then: [
              { type: 'SpendClues', investigator: t.investigator, amount: t.amount ?? 0 },
              m('damagePylon', { location: t.location, amount: t.amount ?? 0 }),
            ],
          },
        ]
      : [],
  specific: (s, key, data) => step(s, key.startsWith('heart:') ? key.slice(6) : key, data),
}
registerScenario({
  ...common,
  id: EOTE_HEART_ONE,
  onAllInvestigatorsEliminated: (_s) => [m('firstConclusion', { outcome: 0 })],
})
registerScenario({
  ...common,
  id: EOTE_HEART_TWO,
  onAllInvestigatorsEliminated: (_s) => [m('finalConclusion', { outcome: 0 })],
})
registerAct({
  code: '08662',
  objectiveMet: (s) => gatePlaced(s).length > 0,
  onAdvance: () => [m('firstSealBonus')],
})
registerAct({
  code: '08663',
  objectiveMet: (s) => gatePlaced(s).length === 5,
  onAdvance: () => [m('firstConclusion', { outcome: 1 })],
})
registerAct({ code: '08673', objectiveMet: () => false })
registerAct({
  code: '08681',
  objectiveMet: (s) =>
    activeInvestigators(s).length > 0 &&
    activeInvestigators(s).every((i) => i.location === '08686'),
  onAdvance: (s) => [
    m('finalConclusion', {
      outcome: meta(s, 'allCollapsed')
        ? s.campaignLog?.notes.includes('edgeOfTheEarthKenslerPlan')
          ? 1
          : 2
        : 3,
    }),
  ],
})
registerAgenda({ code: '08659', onAdvance: () => [m('finalStraw')] })
registerAgenda({ code: '08660', onAdvance: () => [m('sealPenalties')] })
registerAgenda({ code: '08661', onAdvance: () => [m('lastAgenda')] })
registerAgenda({
  code: '08671',
  onAdvance: (s) => [
    ...spawnMadness(s, true),
    ...(!s.campaignLog?.notes.includes('edgeOfTheEarthKenslerPlan')
      ? [read('heartTwoMirageTruth'), m('resolveAllTekelili')]
      : []),
  ],
})
registerAgenda({ code: '08672', onAdvance: () => [m('escape', { all: false })] })
registerAgenda({ code: '08681', onAdvance: () => [] })

function step(s: GameState, key: string, d: Record<string, string | number | boolean>): GameState {
  const by = String(d.investigator ?? lead(s)),
    seal = String(d.seal) as Seal
  switch (key) {
    case 'checkpoint':
      return push(
        {
          ...s,
          campaignLog: {
            ...s.campaignLog!,
            values: {
              ...s.campaignLog!.values,
              edgeOfTheEarthHeartCheckpoint: d.immediate ? 'immediate' : 'rest',
            },
          },
        },
        read(d.immediate ? 'heartCheckpoint2' : 'heartCheckpoint3'),
        endScenario(resolution(Number(d.outcome))),
      )
    case 'introduction': {
      const readParts = [
        s.campaignLog?.notes.includes('edgeOfTheEarthScoutedForkedPassage')
          ? 'heartForkScouted'
          : 'heartForkUnknown',
        alive(s, '08715') ? 'heartDanforth' : 'heartNoDanforth',
        alive(s, '08720') ? 'heartKensler' : 'heartNoKensler',
        s.campaignLog?.expedition?.supplies.includes('08617') ? 'heartCrystal' : 'heartNoCrystal',
        'heartPortal',
      ]
      return push(s, ...readParts.map(read), m('introEffects'), m('choosePart'))
    }
    case 'choosePart':
      return push(
        s,
        ...heartAsk(lead(s), 'heartChoosePart', [
          { label: 'choice.edgeOfTheEarth.heartStudy', then: [read('heartOneIntro')] },
          { label: 'choice.edgeOfTheEarth.heartSkip', then: [m('skipOne')] },
        ]),
      )
    case 'introEffects': {
      if (!s.campaignLog) return s
      if (s.campaignLog.values.edgeOfTheEarthHeartIntroduced === '1') return s
      const log = {
        ...s.campaignLog,
        values: { ...s.campaignLog.values, edgeOfTheEarthHeartIntroduced: '1' },
        investigators: { ...s.campaignLog.investigators },
      }
      for (const i of s.investigators) {
        const r = log.investigators[i.id]!
        log.investigators[i.id] = {
          ...r,
          mentalTrauma: r.mentalTrauma + Number(!alive(s, '08715')),
          physicalTrauma: r.physicalTrauma + Number(!alive(s, '08720')),
          ...(r.mentalTrauma + Number(!alive(s, '08715')) >= i.sanity ? { insane: true } : {}),
          ...(r.physicalTrauma + Number(!alive(s, '08720')) >= i.health ? { killed: true } : {}),
        }
      }
      const next = {
        ...s,
        campaignLog: log,
        investigators: s.investigators.map((i) => ({
          ...i,
          horror: i.horror + Number(!alive(s, '08715')),
          damage: i.damage + Number(!alive(s, '08720')),
          ...(log.investigators[i.id]?.killed || log.investigators[i.id]?.insane
            ? { eliminated: true, location: null }
            : {}),
        })),
      }
      if (!activeInvestigators(next).length)
        return push(
          { ...next, queue: [], pending: null },
          { type: 'RecordNote', note: 'campaignLost' },
          endScenario({ type: 'noResolution' }),
        )
      return push(
        activeInvestigators(next).some((i) => i.id === next.leadInvestigatorId)
          ? next
          : { ...next, leadInvestigatorId: activeInvestigators(next)[0]!.id },
        ...(!s.campaignLog.expedition?.supplies.includes('08617')
          ? [{ type: 'AddChaosTokens' as const, tokens: ['frost' as const] }]
          : []),
      )
    }
    case 'skipOne':
      return push(
        {
          ...setMeta(s, 'skipped', 1),
          scenarioMeta: { ...s.scenarioMeta, skipped: 1 },
          queue: [],
          pending: null,
        },
        endScenario({ type: 'noResolution' }),
      )
    case 'secondIntro': {
      const plan =
        alive(s, '08720') && s.campaignLog?.notes.includes('edgeOfTheEarthKenslerTrueNature')
      const notes = [...(s.campaignLog?.notes ?? [])]
      if (!notes.includes(plan ? 'edgeOfTheEarthKenslerPlan' : 'edgeOfTheEarthTruthEludes'))
        notes.push(plan ? 'edgeOfTheEarthKenslerPlan' : 'edgeOfTheEarthTruthEludes')
      return push(
        { ...s, campaignLog: { ...s.campaignLog!, notes } },
        read('heartTwoIntro1'),
        read(plan ? 'heartTwoIntro2' : 'heartTwoIntro3'),
      )
    }
    case 'setup': {
      const part = Number(d.part),
        inner = String(d.inner).split(',')
      let next = s
      const chooseSeals: Message[] = []
      if (part === 2)
        for (const t of SEALS) {
          const saved = s.campaignLog?.values['heartSeal:' + t]
          if (saved === 'placed')
            chooseSeals.push(
              ...heartAsk(
                lead(s),
                'heartAllocateActiveSeal',
                activeInvestigators(s).map((i) => ({
                  label: 'choice.investigator',
                  params: { name: i.name },
                  then: [m('putSeal', { seal: t, holder: 'i:' + i.id, active: true })],
                })),
                { seal: t.toUpperCase() },
              ),
            )
          else if (saved?.startsWith('recovered:')) {
            const owner = saved.slice('recovered:'.length)
            if (s.campaignLog?.values.edgeOfTheEarthHeartCheckpoint === 'immediate') {
              // Guide pp. 2, 55, 57: a new game, but inactive seals keep their owners.
              if (activeInvestigators(s).some((i) => i.id === owner))
                next = putSeal(next, t, 'i:' + owner)
              continue
            }
            // A fresh setup follows checkpoint III's rest route: allocate each recovered
            // seal again, rather than forcing its previous controller to keep it.
            chooseSeals.push(
              ...heartAsk(
                lead(s),
                'heartAllocateDormantSeal',
                activeInvestigators(s).map((i) => ({
                  label: 'choice.investigator',
                  params: { name: i.name },
                  then: [m('putSeal', { seal: t, holder: 'i:' + i.id })],
                })),
                { seal: t.toUpperCase() },
              ),
            )
          }
        }
      const start: Message[] =
        part === 1
          ? [{ type: 'PlaceAtStart', lead: GATE, others: GATE }]
          : heartAsk(
              lead(s),
              'heartStart',
              clueChoices(
                s,
                inner.filter((id) => !isPylon(id)),
                lead(s),
                (id) => [{ type: 'PlaceAtStart', lead: id, others: id }],
              ),
            )
      const partners: Message =
        part === 2 && s.campaignLog?.notes.includes('edgeOfTheEarthKenslerPlan')
          ? m('choosePartnersWithoutKensler')
          : { type: 'ChooseExpeditionPartners' }
      return push(
        next,
        ...start,
        ...chooseSeals,
        ...(part === 1 && hard(s)
          ? [{ type: 'PlaceDoom' as const, amount: s.difficulty === 'expert' ? 2 : 1 }]
          : []),
        { type: 'InitializeTekeliliDeck' },
        partners,
        ...(part === 1 ? [m('scoutedLook', { left: 2 })] : []),
        m('collision'),
      )
    }
    case 'choosePartnersWithoutKensler': {
      const e = s.campaignLog?.expedition
      if (!e) return s
      return push(
        {
          ...s,
          campaignLog: {
            ...s.campaignLog!,
            expedition: {
              ...e,
              partners: { ...e.partners, '08720': { ...e.partners['08720']!, status: 'missing' } },
            },
          },
        },
        { type: 'ChooseExpeditionPartners' },
        m('restoreKensler', { status: e.partners['08720']!.status }),
      )
    }
    case 'restoreKensler':
      return push(s, {
        type: 'SetExpeditionPartnerStatus',
        partner: '08720',
        status: d.status as 'safe',
      })
    case 'scoutedLook': {
      if (
        !s.campaignLog?.notes.includes('edgeOfTheEarthScoutedForkedPassage') ||
        Number(d.left) <= 0
      )
        return s
      const seen = String(d.seen ?? '').split(',')
      const locations = Object.values(s.locations).filter(
        (l) => l.id !== GATE && !l.revealed && !seen.includes(l.id),
      )
      return push(
        s,
        ...heartAsk(lead(s), 'heartLook', [
          ...clueChoices(
            s,
            locations.map((l) => l.id),
            lead(s),
            (id) => [
              read('heartCard' + id.slice(0, 5)),
              m('scoutedLook', { left: Number(d.left) - 1, seen: [...seen, id].join(',') }),
            ],
          ),
          { label: 'choice.skip', then: [] },
        ]),
      )
    }
    case 'pay':
      return payHeart(s, d)
    case 'enterPylon':
      return push(s, { ...JSON.parse(String(d.move)), entryPaid: true } as Extract<
        Message,
        { type: 'MoveTo' }
      >)
    case 'putSeal':
      return collision(putSeal(s, seal, String(d.holder), !!d.active))
    case 'acquire':
      return seals(s).some((t) => t.seal === seal && t.holder === 'l:' + at(s, by))
        ? putSeal(s, seal, 'i:' + by)
        : s
    case 'activate': {
      if (!ownedSeals(s, by).some((t) => t.seal === seal && !t.active)) return s
      const next = collision(putSeal(s, seal, 'i:' + by, true))
      if (meta(next, 'ending')) return next
      const loc = String(d.location)
      if (loc === '08650')
        return push(
          next,
          ...(s.chaosBag.includes('frost')
            ? [
                { type: 'RemoveChaosTokens' as const, tokens: ['frost' as const] },
                m('recordFrostRemoved'),
              ]
            : []),
        )
      if (loc === '08653')
        return push(
          next,
          ...Object.values(s.enemies).map((e) => ({
            type: 'DamageEnemy' as const,
            enemy: e.id,
            amount: 2,
            by,
          })),
        )
      if (loc === '08651' || loc === '08652')
        return push(
          next,
          ...sameHeartLine(s, loc, loc === '08651' ? 'spoke' : 'ring')
            .filter((l) => !l.revealed)
            .map((l) => read('heartCard' + l.id.slice(0, 5))),
        )
      return next
    }
    case 'recordFrostRemoved': {
      const log = s.campaignLog!
      const n = log.chaosTokens.indexOf('frost')
      return {
        ...s,
        campaignLog:
          n >= 0
            ? { ...log, chaosTokens: log.chaosTokens.filter((_, i) => i !== n) }
            : {
                ...log,
                values: {
                  ...log.values,
                  edgeOfTheEarthStartingFrostRemoved: String(
                    Number(log.values.edgeOfTheEarthStartingFrostRemoved ?? 0) + 1,
                  ),
                },
              },
      }
    }
    case 'transfer': {
      const from = String(d.from),
        to = String(d.to)
      if (
        from === to ||
        at(s, from) !== at(s, to) ||
        !activeInvestigators(s).some((i) => i.id === to)
      )
        return s
      const t = ownedSeals(s, from).find((t) => t.seal === seal)
      return t ? collision(putSeal(s, seal, 'i:' + to, t.active)) : s
    }
    case 'loseSeals':
      return ownedSeals(s, by).reduce((next, t) => putSeal(next, t.seal, 'removed'), s)
    case 'placeSeal': {
      const t = ownedSeals(s, by).find((t) => t.seal === seal && t.active)
      return t && at(s, by) === GATE
        ? setMeta(setMeta(putSeal(s, seal, 'l:' + GATE, true), 'lastSeal', seal), 'lastPlacer', by)
        : s
    }
    case 'firstSealBonus': {
      const t = String(meta(s, 'lastSeal')),
        owner = String(meta(s, 'lastPlacer'))
      return push(
        s,
        ...(t === 'a' || t === 'c'
          ? [
              {
                type: 'Heal' as const,
                investigator: owner,
                damage: t === 'a' ? 1 : 0,
                horror: t === 'c' ? 1 : 0,
              },
            ]
          : t === 'b'
            ? [{ type: 'DrawCards' as const, investigator: owner, amount: 2 }]
            : t === 'd'
              ? [{ type: 'GainActions' as const, investigator: owner, amount: 1 }]
              : [{ type: 'GainResources' as const, investigator: owner, amount: 3 }]),
      )
    }
    case 'unleash': {
      const t = ownedSeals(s, by).find((t) => t.seal === seal && t.active),
        loc = String(d.location)
      return t && at(s, by) === loc && loc === String(8674 + SEALS.indexOf(seal)).padStart(5, '0')
        ? setMeta(putSeal(s, seal, 'l:' + loc, true), 'unleashed:' + seal, 1)
        : s
    }
    case 'damagePylon':
      return damagePylon(s, String(d.location), Number(d.amount))
    case 'collision':
      return collision(s)
    case 'sprawl':
      return setMeta(s, 'sprawl:' + String(d.location), s.round)
    case 'sealPenalties':
      return push(
        s,
        ...seals(s)
          .filter((t) => t.holder.startsWith('i:'))
          .flatMap<Message>((t) => {
            const owner = t.holder.slice(2),
              n = t.active ? 2 : 1
            return t.seal === 'a' || t.seal === 'c'
              ? [
                  {
                    type: 'TakeDamage' as const,
                    investigator: owner,
                    damage: t.seal === 'a' ? n : 0,
                    horror: t.seal === 'c' ? n : 0,
                  },
                ]
              : t.seal === 'b'
                ? [{ type: 'DiscardRandomFromHand' as const, investigator: owner, amount: 2 * n }]
                : t.seal === 'd'
                  ? [{ type: 'LoseActions' as const, investigator: owner, amount: n }]
                  : [{ type: 'LoseResources' as const, investigator: owner, amount: 3 * n }]
          }),
      )
    case 'lastAgenda':
      return push(
        s,
        ...activeInvestigators(s).flatMap((i) =>
          heartAsk(i.id, 'heartLastAgenda', [
            {
              label: 'choice.edgeOfTheEarth.heartTrauma',
              then: [
                { type: 'SufferTrauma', investigator: i.id, mental: 1 },
                { type: 'DefeatInvestigator', investigator: i.id },
              ],
            },
            {
              label: 'choice.edgeOfTheEarth.heartTekelili',
              then: [
                { type: 'ShuffleTekeliliIntoDeck', investigator: i.id, amount: 3 },
                { type: 'DefeatInvestigator', investigator: i.id },
              ],
            },
          ]),
        ),
      )
    case 'firstConclusion':
      return firstConclusion(s, Number(d.outcome))
    case 'finalConclusion':
      return finalConclusion(s, Number(d.outcome) as 0 | 1 | 2 | 3)
    case 'exhaustNearest': {
      if (Number(d.amount) <= 0 || !at(s, by)) return s
      const distance = distancesFrom(s, at(s, by)!),
        enemies = Object.values(s.enemies).filter(
          (e) => e.code === '08679' && !e.exhausted && distance.has(e.location),
        )
      const nearest = Math.min(...enemies.map((e) => distance.get(e.location)!)),
        choices = enemies
          .filter((e) => distance.get(e.location) === nearest)
          .map((e) => ({
            label: 'choice.enemy',
            params: { enemy: e.name },
            target: { type: 'enemy' as const, id: e.id },
            then: [
              { type: 'ExhaustEnemy' as const, enemy: e.id },
              m('exhaustNearest', { ...d, amount: Number(d.amount) - 1 }),
            ],
          }))
      return push(
        s,
        ...(choices.length === 1 ? choices[0]!.then : heartAsk(by, 'heartExhaust', choices)),
      )
    }
    case 'extraEnemies':
      return push(
        s,
        ...Object.values(s.enemies).flatMap((e) => {
          if (e.code === '08669' && seals(s).some((t) => t.active && t.holder.startsWith('i:'))) {
            const stamp = s.log.findLastIndex(
              (l) => l.key === 'log.phase' && l.params?.phase === 'enemy',
            )
            if (meta(s, 'extra:' + e.id) === stamp) return []
            return [m('extraMass', { enemy: e.id, stamp })]
          }
          if (e.code === '08680' && !e.exhausted) {
            const distances = distancesFrom(s, e.location, e),
              places = Object.values(s.locations).filter(
                (l) => isPylon(l.id) && !collapsed(s, l.id) && distances.has(l.id),
              )
            const nearest = Math.min(...places.map((l) => distances.get(l.id)!))
            return heartAsk(
              lead(s),
              'heartMovePhantasm',
              clueChoices(
                s,
                places.filter((l) => distances.get(l.id) === nearest).map((l) => l.id),
                lead(s),
                (id) => [m('movePhantasm', { enemy: e.id, location: id })],
              ),
            )
          }
          return []
        }),
      )
    case 'extraMass':
      return push(
        setMeta(s, 'extra:' + String(d.enemy), Number(d.stamp)),
        { type: 'ReadyEnemy', enemy: String(d.enemy) },
        { type: 'HuntersMove', enemies: [String(d.enemy)] },
        m('massAttack', { enemy: String(d.enemy) }),
      )
    case 'massAttack': {
      const e = s.enemies[String(d.enemy)]
      return e?.engagedWith
        ? push(s, {
            type: 'EnemyAttack',
            enemy: e.id,
            investigator: e.engagedWith,
            exhaustAfter: true,
          })
        : s
    }
    case 'movePhantasm': {
      const e = s.enemies[String(d.enemy)]
      if (!e) return s
      const distances = distancesFrom(s, String(d.location), e),
        steps = s.locations[e.location]!.connections.filter(
          (id) => distances.get(id) === (distances.get(e.location) ?? 0) - 1,
        )
      return push(
        s,
        ...(steps.length === 1
          ? [{ type: 'MoveEnemy' as const, enemy: e.id, location: steps[0]! }]
          : heartAsk(
              lead(s),
              'heartMovePhantasm',
              clueChoices(s, steps, lead(s), (id) => [
                { type: 'MoveEnemy', enemy: e.id, location: id },
              ]),
            )),
      )
    }
    case 'escape':
      return escape(s, !!d.all)
    case 'checkExit':
      return activeInvestigators(s).length &&
        activeInvestigators(s).every((i) => i.location === '08686')
        ? push(s, { type: 'AdvanceAct', paid: true })
        : s
    case 'resolveAllTekelili':
      return resolveTekelili(s)
    case 'finishTekelili':
      return setMeta(s, 'resolveExisting', 0)
    case 'finalStraw':
      return finalStraw(s)
    case 'epilogue':
      return epilogue(s)
    default:
      if (key.startsWith('mirage')) return resolveMirageEncounter(s, key, d)
      return supplyStep(s, key, d) ?? iceAndDeathRules.specific?.(s, key, d) ?? s
  }
}

function escape(s: GameState, all: boolean): GameState {
  if (meta(s, 'escape')) return s
  const count = Object.values(s.enemies).filter((e) => e.code === '08679').length,
    keep = all ? 3 : Math.max(0, count - 3 * collapsedPylons(s).length)
  const madness = Object.values(s.enemies).filter((e) => e.code === '08679'),
    removed = madness.slice(keep)
  let next = setMeta(setMeta(s, 'escape', 1), 'allCollapsed', Number(all))
  const locations = { ...s.locations }
  for (let n = 0; n < 5; n++) {
    const code = String(8682 + n).padStart(5, '0'),
      c = heartCard(code)
    locations[code] = {
      id: code,
      name: c.name,
      unrevealedName: c.name,
      shroud: c.shroud!,
      clueValue: c.clues!,
      cluesPerInvestigator: true,
      revealed: false,
      clues: 0,
      position: [n * 2 + 2, 6],
      connections: [
        ...(n ? [String(8681 + n).padStart(5, '0')] : [GATE]),
        ...(n < 4 ? [String(8683 + n).padStart(5, '0')] : []),
      ],
    }
  }
  locations[GATE] = { ...locations[GATE]!, connections: ['08682'] }
  next = {
    ...next,
    locations,
    acts: [
      {
        code: '08681',
        name: 'The Final Mirage',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    actIndex: 0,
    agendas: [{ code: '08681', name: 'The Final Mirage', doomThreshold: 999999 }],
    agendaIndex: 0,
    doom: 0,
    setAside: [...s.setAside, ...removed.map(() => ({ ...namelessMadness }))],
    enemies: Object.fromEntries(
      Object.entries(s.enemies).filter(([id]) => !removed.some((e) => e.id === id)),
    ),
  }
  for (const t of seals(next))
    if (t.holder.startsWith('l:') && t.holder !== 'l:' + GATE)
      next = putSeal(next, t.seal, 'removed')
  const moves: Message[] = [
    ...activeInvestigators(s).flatMap((i) => [
      { type: 'SpendClues' as const, investigator: i.id, amount: spendableClues(s, i.id) },
      { type: 'MoveTo' as const, investigator: i.id, location: '08682', unpreventable: true },
    ]),
    ...madness
      .slice(0, keep)
      .map((e) => ({ type: 'MoveEnemy' as const, enemy: e.id, location: '08682' })),
    ...Object.keys(s.locations)
      .filter((id) => id !== GATE)
      .map((location) => ({ type: 'RemoveLocation' as const, location })),
    m('checkExit'),
  ]
  return push(next, read(all ? 'heartPylonsCollapsed' : 'heartPylonsFailed'), ...moves)
}
function resolveTekelili(s: GameState): GameState {
  // The agenda resolves existing copies without returning them to the scenario deck.
  let next = setMeta(s, 'resolveExisting', 1)
  const messages: Message[] = []
  for (const i of activeInvestigators(s)) {
    const cards = i.deck.filter((c) => /^0872[3-9]$/.test(c)),
      [order, rng] = shuffle(cards, next.rng)
    next = {
      ...next,
      rng,
      investigators: next.investigators.map((p) =>
        p.id === i.id ? { ...p, deck: p.deck.filter((c) => !/^0872[3-9]$/.test(c)) } : p,
      ),
    }
    for (const code of order)
      messages.push(
        { type: 'PlaceOnDeck', investigator: i.id, code, where: 'top' },
        { type: 'DrawCards', investigator: i.id, amount: 1 },
      )
  }
  // The final return is handled by the normal deck shuffler; discarded copies are removed once.
  return push(next, ...messages, m('finishTekelili'))
}
function finalStraw(s: GameState): GameState {
  const candidates = Object.entries(s.campaignLog?.expedition?.partners ?? {})
    .filter(([, r]) => r.status === 'safe')
    .map(([id]) => id)
  if (!candidates.length) return s
  const [n, rng] = nextInt(s.rng, candidates.length),
    victim = candidates[n]!
  const rescuer: Record<string, string> = {
    '08720': '08717',
    '08714': '08720',
    '08715': '08714',
    '08722': '08716',
    '08716': '08718',
    '08717': '08715',
    '08719': '08722',
    '08721': '08719',
    '08718': '08721',
  }
  const saved = alive(s, rescuer[victim]!),
    asset = Object.values(s.assets).find((a) => a.expeditionPartner === victim)
  return push(
    { ...s, rng },
    read('heartFinalStraw'),
    read('heartVictim' + victim),
    read('heartVictim' + victim + (saved ? 'Saved' : 'Lost')),
    ...(saved
      ? []
      : [
          ...(asset ? [{ type: 'DiscardAsset' as const, asset: asset.id, defeated: true }] : []),
          {
            type: 'SetExpeditionPartnerStatus' as const,
            partner: victim as '08714',
            status: 'eliminated' as const,
          },
        ]),
  )
}
function epilogue(s: GameState): GameState {
  const survivors = Object.entries(s.campaignLog?.expedition?.partners ?? {})
    .filter(([, r]) => r.status === 'safe' || r.status === 'resolute')
    .map(([id]) => id)
  const parts = [
    ...(
      [
        ['08721', '08718', 'EllsworthClaypool'],
        ['08720', '08717', 'KenslerSinha'],
        ['08714', '08715', 'DyerDanforth'],
        ['08722', '08719', 'TakadaCookie'],
      ] as const
    )
      .filter(([a, b]) => survivors.includes(a) && survivors.includes(b))
      .map(([, , part]) => 'heartEpilogue' + part),
    ...(survivors.length === 1 && survivors[0] === '08716' ? ['heartEpilogueEliyah'] : []),
  ]
  return push(
    s,
    {
      type: 'RecordNote',
      note: 'edgeOfTheEarthSurvivors',
      value: [
        ...survivors,
        ...s.investigators
          .filter(
            (i) =>
              !s.campaignLog?.investigators[i.id]?.killed &&
              !s.campaignLog?.investigators[i.id]?.insane,
          )
          .map((i) => i.id),
      ].join(','),
    },
    ...parts.map(read),
  )
}
