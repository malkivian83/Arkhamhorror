import './house-assets'
import {
  activeInvestigators,
  getInvestigator,
  leadInvestigator,
  playerCardDef,
  push,
  registerAct,
  registerAgenda,
  registerEnemy,
  registerLocation,
  registerScenario,
  registerTreachery,
  shuffle,
  type CampaignLog,
  type ChaosToken,
  type Difficulty,
  type GameState,
  type InvestigatorId,
  type LocationCard,
  type Message,
  type ScenarioDefinition,
} from '@lcg/engine'
import {
  copies,
  damage,
  earnExperience,
  endScenario,
  enemy,
  noteEffect,
  recordNote,
  resignAbility,
  resolution,
  storyEntries,
  treachery,
} from '../scenario-helpers'
import { ENCOUNTER_SETS } from '../the-path-to-carcosa/encounter-sets'
import { DUNWICH_CHAOS_BAGS } from './campaign'
import { avianFight, HOUSE_SETS, huntedDownSpecific, thugBlocksResources } from './house-encounters'
import { H, HN, THE_HOUSE_ALWAYS_WINS } from './house-codes'
import { DUNWICH_NOTES as N } from './extracurricular-codes'
import { armitageInterlude, storyReward } from './house-assets'
export { H, HN, THE_HOUSE_ALWAYS_WINS } from './house-codes'
export { HOUSE_SETS } from './house-encounters'
const entry = storyEntries('house')
export const hawSpecific = (
  key: string,
  data: Record<string, string | number | boolean> = {},
): Message => ({ type: 'ScenarioSpecific', key, data })
export const pitBoss = enemy({
  code: H.boss,
  name: 'Clover Club Pit Boss',
  traits: ['Humanoid', 'Criminal', 'Elite'],
  fight: 3,
  health: 4,
  evade: 3,
  damage: 2,
  horror: 0,
  keywords: ['hunter'],
  prey: { type: 'highestSkill', skill: 'intellect' },
  victory: 1,
})
const room = (
  id: string,
  name: string,
  shroud: number,
  clues: number,
  connections: string[],
  position: [number, number],
  victory?: number,
): LocationCard => ({
  id,
  name,
  shroud,
  clueValue: clues,
  cluesPerInvestigator: true,
  connections,
  position,
  ...(victory ? { victory } : {}),
})
const doors = [H.gallery, H.vip, H.alley]
export const HOUSE_LOCATIONS = {
  bella: room(H.bella, 'La Bella Luna', 2, 1, [H.lounge], [0, 0]),
  lounge: room(H.lounge, 'Clover Club Lounge', 2, 0, [H.bella, H.bar, H.cardroom], [0, 1]),
  bar: room(H.bar, 'Clover Club Bar', 3, 0, [H.lounge, H.cardroom], [1, 1]),
  cardroom: room(H.cardroom, 'Clover Club Cardroom', 3, 0, [H.lounge, H.bar, H.hall], [1, 2]),
  hall: room(H.hall, 'Darkened Hall', 4, 0, [H.cardroom, ...doors], [1, 3]),
  gallery: room(H.gallery, 'Art Gallery', 2, 1, [H.hall], [0, 4], 1),
  vip: room(H.vip, 'VIP Area', 3, 1, [H.hall], [1, 4], 1),
  alley: room(H.alley, 'Back Alley', 1, 1, [H.hall], [2, 4], 1),
}
for (const id of doors)
  Object.values(HOUSE_LOCATIONS).find((l) => l.id === id)!.unrevealedName = 'Back Hall Doorway'
const here = (s: GameState, i: InvestigatorId) => getInvestigator(s, i).location
const late = (s: GameState) => s.scenarioMeta?.hawLate === 1
const gain = (investigator: InvestigatorId, amount: number): Message => ({
  type: 'GainClues',
  investigator,
  amount,
})
export function theHouseAlwaysWins({
  difficulty = 'standard',
  log,
}: { difficulty?: Difficulty; log?: CampaignLog } = {}): ScenarioDefinition {
  const second = !!log && log.values.openingScenario !== 'the-house-always-wins'
  return {
    id: THE_HOUSE_ALWAYS_WINS,
    intro: entry('intro'),
    setupInstructions: entry('setup'),
    locations: [
      HOUSE_LOCATIONS.bella,
      HOUSE_LOCATIONS.lounge,
      HOUSE_LOCATIONS.bar,
      HOUSE_LOCATIONS.cardroom,
    ],
    setAsideLocations: [
      HOUSE_LOCATIONS.hall,
      ...doors.map((id) => Object.values(HOUSE_LOCATIONS).find((l) => l.id === id)!),
    ],
    startingLocation: H.bella,
    agendas: [
      { code: H.club, name: 'The Clover Club', doomThreshold: 4 },
      { code: H.muscle, name: 'Underground Muscle', doomThreshold: 3 },
      { code: H.chaos, name: 'Chaos in the Clover Club', doomThreshold: 7 },
    ],
    acts: [
      {
        code: H.luck,
        name: "Beginner's Luck",
        clueThreshold: 4,
        cluesPerInvestigator: true,
        advanceTiming: 'objective',
      },
      {
        code: H.skin,
        name: 'Skin Game',
        clueThreshold: 2,
        cluesPerInvestigator: true,
        advanceTiming: 'objective',
      },
      {
        code: second ? H.fold : H.allIn,
        name: second ? 'Fold' : 'All In',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: [
      ...HOUSE_SETS.badLuck,
      ...HOUSE_SETS.naomi,
      ...ENCOUNTER_SETS.rats,
      ...copies(
        treachery({
          code: H.drinks,
          name: 'Something in the Drinks',
          traits: ['Poison', 'Illicit'],
          keywords: ['surge'],
        }),
        2,
      ),
      ...copies(
        treachery({ code: H.suspicions, name: 'Arousing Suspicions', traits: [], keywords: [] }),
        2,
      ),
    ],
    setAside: [...HOUSE_SETS.abominations, ...ENCOUNTER_SETS.strikingFear],
    chaosBag: [...DUNWICH_CHAOS_BAGS[difficulty]],
    tokenValues: {},
    setup: [
      { type: 'SetScenarioMeta', key: 'hawLate', value: second ? 1 : 0 },
      { type: 'SpawnEnemy', card: pitBoss, location: H.lounge, engageWith: null },
      hawSpecific('hawDoors'),
    ],
  }
}
function shuffleDiscard(s: GameState) {
  const [encounterDeck, rng] = shuffle([...s.encounterDeck, ...s.encounterDiscard], s.rng)
  return { ...s, encounterDeck, rng, encounterDiscard: [] }
}
registerScenario({
  id: THE_HOUSE_ALWAYS_WINS,
  enemyKeyword: (s, e, k) =>
    s.agendaIndex === 0 && e.traits?.includes('Criminal') && k === 'aloof' ? true : null,
  enemyStat: (s, e, stat, source) =>
    e.code === H.avian && stat === 'fight' ? avianFight(s, source) : 0,
  cannotDrawCards: (s, i) => s.phase === 'upkeep' && here(s, i) === H.vip,
  actionAllowed: (s, i, kind) => kind !== 'resource' || !thugBlocksResources(s, i),
  skipsUpkeepDraw: (s, i) => here(s, i) === H.vip,
  cannotGainResources: (s, i) =>
    (s.phase === 'upkeep' && here(s, i) === H.vip) || thugBlocksResources(s, i),
  assetLeavesPlay: (_s, a, reason) =>
    reason === 'resigned' && [H.morgan, H.peter].includes(a.code as typeof H.morgan)
      ? [{ type: 'SetScenarioMeta', key: `hawRescued:${a.code}`, value: 1 }]
      : null,
  tokenEffect: (s, t, i) => {
    const hard = s.difficulty === 'hard' || s.difficulty === 'expert'
    return t === 'skull'
      ? { modifier: hard ? -3 : -2 }
      : t === 'cultist'
        ? {
            modifier: -3,
            ...(hard
              ? { onFail: [{ type: 'LoseResources' as const, investigator: i, amount: 3 }] }
              : { onSuccess: [{ type: 'GainResources' as const, investigator: i, amount: 3 }] }),
          }
        : t === 'tablet'
          ? {
              modifier: -2,
              ...(hard
                ? { immediate: [{ type: 'LoseResources' as const, investigator: i, amount: 3 }] }
                : { onFail: [{ type: 'LoseResources' as const, investigator: i, amount: 3 }] }),
            }
          : { modifier: 0 }
  },
  reactions: (s, t) => {
    if (t.type !== 'whenRevealChaosToken') return []
    const investigator = t.investigator,
      amount = s.difficulty === 'hard' || s.difficulty === 'expert' ? 3 : 2
    const reactions: import('@lcg/engine').ReactionOption[] = []
    if (t.token === 'skull' && getInvestigator(s, investigator).resources >= amount)
      reactions.push({
        key: 'haw:paySkull',
        investigator,
        label: 'ability.house.paySkull',
        then: [
          { type: 'SpendResources', investigator, amount },
          { type: 'TreatRevealedTokenAs', token: 0 },
        ],
      })
    if (s.actIndex === 0 && s.scenarioMeta?.hawCheatedRound !== s.round)
      reactions.push({
        key: 'haw:cheat',
        investigator,
        label: 'ability.house.cheat',
        then: [
          {
            type: 'Ask',
            investigator,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.house.cheat',
              choices: [...new Set([...s.chaosBag, t.token])].map((token) => ({
                label:
                  typeof token === 'number' ? 'choice.house.token' : `choice.house.tokens.${token}`,
                params: { token: String(token) },
                then: [
                  { type: 'SetScenarioMeta', key: 'hawCheatedRound', value: s.round },
                  { type: 'SetScenarioMeta', key: 'hawCheated', value: 1 },
                  { type: 'TreatRevealedTokenAs', token },
                ],
              })),
            },
          },
        ],
      })
    return reactions
  },
  forced: (s, t) =>
    s.agendaIndex === 0 &&
    t.type === 'afterDealDamage' &&
    s.enemies[t.enemy]?.traits?.includes('Criminal')
      ? [{ type: 'AdvanceAgenda' }]
      : s.actIndex === 0 && t.type === 'afterGainClues'
        ? [{ type: 'CheckActObjective' }]
        : [],
  resolution: (s, outcome) => {
    const resigned = s.investigators.some((i) => i.resigned)
    const n =
      outcome.type === 'resolution'
        ? outcome.resolution
        : s.actIndex === 2 && resigned
          ? s.scenarioMeta?.[`hawRescued:${late(s) ? H.peter : H.morgan}`] === 1
            ? late(s)
              ? 3
              : 2
            : 1
          : 1
    const notes = [
      n === 3 ? HN.naomi : HN.obannion,
      n === 2 ? HN.morganRescued : HN.morganKidnapped,
      ...(n === 4 ? [N.unconscious] : []),
    ]
    const messages: Message[] = [
      {
        type: 'Story',
        entry: entry(`resolution${n}`, [
          ...notes.map(noteEffect),
          { key: 'story.effect.experience', params: { bonus: n === 1 || n === 4 ? 1 : 0 } },
          ...(s.scenarioMeta?.hawCheated === 1 ? [{ key: 'story.house.cheatEffect' }] : []),
        ]),
      },
      ...notes.map((n) => recordNote(n)),
      ...(s.scenarioMeta?.hawCheated === 1
        ? [{ type: 'AddChaosTokens' as const, tokens: ['elderThing' as const] }]
        : []),
      ...(n === 4 ? [{ type: 'SufferTrauma' as const, physical: 1 }] : []),
      earnExperience(n === 1 || n === 4 ? 1 : 0, true),
    ]
    if (n === 2) messages.push(storyReward(s, H.morgan, entry('morganReward')))
    if (late(s)) messages.push(...armitageInterlude(s, n === 4))
    return [...messages, endScenario(resolution(n))]
  },
  specific: (s, key, data) => {
    const investigator = String(
      data.investigator ?? s.activeTurn ?? leadInvestigator(s)?.id ?? s.investigators[0]!.id,
    )
    if (key === 'hawSuspicions') {
      const criminals = Object.values(s.enemies).filter(
        (e) => e.location === here(s, investigator) && e.traits?.includes('Criminal'),
      )
      if (!criminals.length) return push(s, { type: 'LoseResources', investigator, amount: 2 })
      const enemies = { ...s.enemies }
      for (const e of criminals) enemies[e.id] = { ...e, doom: (e.doom ?? 0) + 1 }
      return { ...s, enemies }
    }
    if (key === 'hawDoors') {
      const [order, rng] = shuffle(doors, s.rng)
      const setAsideLocations = { ...s.setAsideLocations }
      order.forEach((id, n) => {
        setAsideLocations[id] = { ...setAsideLocations[id]!, position: [n, 4] }
      })
      return { ...s, rng, setAsideLocations }
    }
    if (key === 'hawShuffle') return shuffleDiscard(s)
    if (key === 'hawChaos') {
      const cards = s.setAside.filter(
        (c) =>
          Object.values(HOUSE_SETS)
            .flat()
            .some((a) => a.code === c.code) ||
          encounterSetForVariant(
            ENCOUNTER_SETS.strikingFear,
            s.scenarioMeta?.chapterTwoEncounters === 1 ? 'chapter-two' : undefined,
          ).some((a) => a.code === c.code),
      )
      const [monsters, rng1] = shuffle(
        cards.filter((c) => c.kind === 'enemy'),
        s.rng,
      )
      const monster = monsters[0]
      if (!monster) return s
      let removed = false
      const rest = cards.filter((c) => {
        if (!removed && c === monster) {
          removed = true
          return false
        }
        return true
      })
      const [encounterDeck, rng] = shuffle(
        [...s.encounterDeck, ...s.encounterDiscard, ...rest],
        rng1,
      )
      return push(
        {
          ...s,
          encounterDeck,
          rng,
          encounterDiscard: [],
          setAside: s.setAside.filter((c) => !cards.includes(c)),
        },
        {
          type: 'SpawnEnemy',
          card: monster as import('@lcg/engine').EnemyCard,
          location: H.lounge,
          engageWith: null,
        },
        ...activeInvestigators(s)
          .filter((i) => i.location === H.bella)
          .map((i): Message => ({ type: 'MoveTo', investigator: i.id, location: H.lounge })),
        ...Object.values(s.enemies)
          .filter((e) => e.location === H.bella && !e.engagedWith)
          .map((e): Message => ({ type: 'MoveEnemy', enemy: e.id, location: H.lounge })),
        { type: 'RemoveLocation', location: H.bella },
      )
    }
    if (key === 'hawGuard') {
      const index = s.encounterDeck.findIndex(
        (c) => c.kind === 'enemy' && c.traits?.includes('Criminal'),
      )
      if (index < 0)
        return {
          ...s,
          encounterDeck: [],
          encounterDiscard: [...s.encounterDiscard, ...s.encounterDeck],
        }
      const card = s.encounterDeck[index]!
      return push(
        {
          ...s,
          encounterDeck: s.encounterDeck.slice(index + 1),
          encounterDiscard: [...s.encounterDiscard, ...s.encounterDeck.slice(0, index)],
        },
        {
          type: 'SpawnEnemy',
          card: card as import('@lcg/engine').EnemyCard,
          location: H.hall,
          engageWith: null,
        },
      )
    }
    if (key === 'hawAbomination') {
      const cards = [...s.encounterDeck, ...s.setAside, ...s.encounterDiscard].filter(
        (c) => c.kind === 'enemy' && c.traits?.includes('Abomination'),
      )
      if (!cards.length) return s
      return push(s, {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseEnemy',
          choices: [...new Map(cards.map((c) => [c.code, c])).values()].map((c) => ({
            label: 'choice.enemy',
            params: { enemy: c.name },
            then: [hawSpecific('hawSpawnAbomination', { code: c.code })],
          })),
        },
      })
    }
    if (key === 'hawSpawnAbomination') {
      let selected: import('@lcg/engine').EncounterCard | undefined
      const take = (cards: import('@lcg/engine').EncounterCard[]) =>
        cards.filter((c) => {
          if (!selected && c.code === data.code) {
            selected = c
            return false
          }
          return true
        })
      const deck = take(s.encounterDeck),
        setAside = take(s.setAside),
        encounterDiscard = take(s.encounterDiscard)
      const [encounterDeck, rng] = shuffle(deck, s.rng)
      return selected?.kind === 'enemy'
        ? push(
            { ...s, encounterDeck, rng, setAside, encounterDiscard },
            { type: 'SpawnEnemy', card: selected, location: H.bar, engageWith: null },
          )
        : s
    }
    if (key === 'hawBet') {
      const token = data.token as ChaosToken
      return push(
        s,
        ...(token === 'elderSign'
          ? [gain(investigator, 2), { type: 'GainResources' as const, investigator, amount: 2 }]
          : typeof token === 'number' && token % 2 === 0
            ? [gain(investigator, 2)]
            : []),
      )
    }
    if (key === 'hawTwist') {
      const token = data.token as ChaosToken
      return push(
        s,
        ...(token === 'elderSign' || (typeof token === 'number' && token > 0)
          ? []
          : [typeof token === 'number' ? damage(investigator, 1) : damage(investigator, 0, 2)]),
      )
    }
    const hunted = huntedDownSpecific(s, key, data, investigator)
    if (hunted) return hunted
    if (key === 'hawParley') {
      const a = s.placedAssets?.[String(data.placed)]
      if (!a) return s
      const clues = (a.clues ?? 0) + 1
      const next = { ...s, placedAssets: { ...s.placedAssets, [a.id]: { ...a, clues } } }
      return clues >= s.startingInvestigatorCount
        ? push(next, {
            type: 'TakeControlOfPlaced',
            placed: a.id,
            investigator,
            noSlot: a.code !== H.morgan,
          })
        : next
    }
    if (key === 'hawDiscardAlly') {
      const card = String(data.card)
      return push(s, { type: 'DiscardFromHand', investigator, card }, gain(investigator, 2), {
        type: 'SetScenarioMeta',
        key: `hawLounge:${investigator}`,
        value: 1,
      })
    }
    if (key === 'placedDefeated')
      return push(s, { type: 'RemovePlacedAsset', placed: String(data.placed) })
    return s
  },
})
registerEnemy({
  code: H.boss,
  forced: (s, t, self) =>
    t.type === 'afterGainClues' && here(s, t.investigator) === self.location
      ? [
          { type: 'ReadyEnemy', enemy: self.id },
          { type: 'EngageEnemy', enemy: self.id, investigator: t.investigator },
          {
            type: 'EnemyAttack',
            enemy: self.id,
            investigator: t.investigator,
            evenIfExhausted: true,
            exhaustAfter: false,
          },
        ]
      : [],
})
registerLocation({ code: H.bella, abilities: (_s, _l, i) => [resignAbility(i, 'bella:resign')] })
registerLocation({ code: H.alley, abilities: (_s, _l, i) => [resignAbility(i, 'alley:resign')] })
registerLocation({
  code: H.hall,
  onReveal: () => doors.map((location) => ({ type: 'PutLocationIntoPlay', location })),
})
registerLocation({
  code: H.gallery,
  forced: (s, t) =>
    t.type === 'afterSkillTest' &&
    !t.succeeded &&
    t.kind === 'investigate' &&
    s.skillTest?.kind.type === 'investigate' &&
    s.skillTest.kind.location === H.gallery
      ? [{ type: 'LoseResources', investigator: t.investigator, amount: 2 }]
      : [],
})
registerLocation({
  code: H.bar,
  abilities: (s, _l, i) =>
    s.actIndex === 0 &&
    s.scenarioMeta?.[`hawDrink:${i}`] !== 1 &&
    getInvestigator(s, i).resources >= 2
      ? [
          {
            key: 'bar:drink',
            label: 'ability.house.drink',
            actions: 1,
            provokes: true,
            costs: [{ type: 'SpendResources', investigator: i, amount: 2 }],
            then: [
              { type: 'SetScenarioMeta', key: `hawDrink:${i}`, value: 1 },
              gain(i, 2),
              { type: 'DrawCards', investigator: i, amount: 2 },
            ],
          },
        ]
      : [],
})
registerLocation({
  code: H.cardroom,
  abilities: (s, _l, i) =>
    s.actIndex === 0 && getInvestigator(s, i).resources >= 2
      ? [
          {
            key: 'cardroom:bet',
            label: 'ability.house.bet',
            actions: 1,
            provokes: true,
            costs: [{ type: 'SpendResources', investigator: i, amount: 2 }],
            then: [
              {
                type: 'RevealTokenOutsideTest',
                investigator: i,
                then: { type: 'ScenarioSpecific', key: 'hawBet', data: { investigator: i } },
              },
            ],
          },
        ]
      : [],
})
registerLocation({
  code: H.lounge,
  abilities: (s, _l, i) => {
    const cards = getInvestigator(s, i).hand.filter((c) => {
      const d = playerCardDef(c)
      return d?.type === 'asset' && d.traits?.includes('Ally') && !d.weakness
    })
    return s.actIndex === 0 && s.scenarioMeta?.[`hawLounge:${i}`] !== 1 && cards.length
      ? [
          {
            key: 'lounge:ally',
            label: 'ability.house.ally',
            actions: 1,
            provokes: true,
            then: [
              {
                type: 'Ask',
                investigator: i,
                question: {
                  kind: 'chooseOne',
                  prompt: 'prompt.house.ally',
                  choices: [...new Set(cards)].map((card) => ({
                    label: 'choice.card',
                    params: { card: playerCardDef(card)!.name },
                    then: [hawSpecific('hawDiscardAlly', { investigator: i, card })],
                  })),
                },
              },
            ],
          },
        ]
      : []
  },
})
registerAct({
  code: H.luck,
  objectiveMet: (s) =>
    activeInvestigators(s).reduce((n, i) => n + i.clues, 0) >= 4 * s.startingInvestigatorCount,
  onAdvance: (s) => [
    {
      type: 'PayGroupClues',
      amount: 4 * s.startingInvestigatorCount,
      from: activeInvestigators(s).map((i) => i.id),
    },
    { type: 'PutLocationIntoPlay', location: H.hall },
    ...(s.agendaIndex === 0 ? [hawSpecific('hawGuard')] : []),
  ],
})
registerAct({
  code: H.skin,
  abilities: (s, _a, i) => {
    const investigators = activeInvestigators(s).filter((i) => i.location === H.vip),
      amount = 2 * s.startingInvestigatorCount
    return here(s, i) === H.vip && investigators.reduce((n, i) => n + i.clues, 0) >= amount
      ? [
          {
            key: 'vip:advance',
            label: 'ability.house.findMorgan',
            actions: 0,
            provokes: false,
            then: [
              { type: 'PayGroupClues', amount, from: investigators.map((i) => i.id) },
              { type: 'AdvanceAct', paid: true },
            ],
          },
        ]
      : []
  },
  onAdvance: (s) => [
    {
      type: 'PlaceAsset',
      code: late(s) ? H.peter : H.morgan,
      name: late(s) ? 'Peter Clover' : 'Dr. Francis Morgan',
      placement: { type: 'location', location: late(s) ? H.bar : H.vip },
    },
    ...(late(s) ? [hawSpecific('hawAbomination')] : []),
  ],
})
registerAgenda({
  code: H.club,
  onAdvance: () => [hawSpecific('hawShuffle')],
  afterAdvance: (s) => [
    ...Object.keys(s.locations).map((location): Message => ({ type: 'CheckEngagement', location })),
    ...(late(s) ? [{ type: 'AdvanceAgenda' as const }] : []),
  ],
})
registerAgenda({ code: H.muscle, onAdvance: () => [hawSpecific('hawChaos')] })
registerAgenda({
  code: H.chaos,
  forced: (s, t) =>
    t.type === 'enemyPhaseBegins'
      ? Object.values(s.enemies)
          .filter(
            (e) =>
              e.traits?.includes('Criminal') &&
              Object.values(s.enemies).some(
                (a) => a.traits?.includes('Abomination') && a.location === e.location,
              ),
          )
          .map((e) => ({ type: 'DiscardEnemy', enemy: e.id }))
      : [],
  onAdvance: () => [{ type: 'EndScenario', outcome: resolution(4) }],
})
registerTreachery({
  code: H.drinks,
  revelation: (s) =>
    s.investigators
      .filter((i) => !i.eliminated && s.scenarioMeta?.[`hawDrink:${i.id}`] === 1)
      .map((i) => ({ type: 'LoseActions', investigator: i.id, amount: 1 })),
})
registerTreachery({
  code: H.suspicions,
  revelation: (_s, investigator) => [hawSpecific('hawSuspicions', { investigator })],
})
import { encounterSetForVariant } from '../encounter-variants'
