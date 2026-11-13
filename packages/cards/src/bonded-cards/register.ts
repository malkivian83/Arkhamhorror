// RR: Bonded, Set Aside, Triggered Abilities, Heal, Uses, Skill Tests ST.3–ST.8.
import {
  engagedEnemies,
  getInvestigator,
  playerCardDef,
  setAsideCards,
  shroudOf,
  testMargin,
  type AbilityOption,
  type Asset,
  type Choice,
  type GameState,
  type InvestigatorId,
  type Message,
  type ReactionOption,
} from '@lcg/engine'
import { registerAdvancedCard as registerPlayerCard, option } from '../advanced-tests/common'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'

const MIRRORS = ['05313', '54002']
const LEXICONS = ['05316', '54004']
const DIARIES = ['06112', '06236', '06237', '06238']
const MELODY = '05314'
const RITE = '05317'
const ESSENCE = '06113'
const MYCONID = '10044'
const GROWTH = '10045'
const SEGMENT = '06021'
const PENDANT = '06022'
const VESSEL = '06276'
const WISH_EATER = '06277'
/** Interpreting the dreams unlocks the Researched Dream Diary upgrades. */
export const INTERPRETED_DREAMS = 'interpretedTheDreams'
export const CLASSIFIED_SPECIES = 'classifiedNewSpecies'

const take = (
  investigator: InvestigatorId,
  code: string,
  count: number,
  to: 'hand' | 'deck' | 'play',
  bonded = true,
): Message => ({ type: 'TakeSetAside', investigator, code, count, to, bonded })
const available = (s: GameState, by: InvestigatorId, code: string) =>
  setAsideCards(s, by, code, true).length > 0
const controls = (s: GameState, by: InvestigatorId, codes: string[]) =>
  Object.values(s.assets).find((a) => a.owner === by && codes.includes(a.code))
const label = (a: Asset, key = 'ability.advancedTest') => ({
  label: key,
  params: { card: cardName(a.code) },
})
/** A fast ability, offered as an ability and in every player window. */
const fastAbility = (a: Asset, then: Message[], suffix = ''): AbilityOption => ({
  key: a.id + ':bonded' + suffix,
  ...label(a),
  actions: 0,
  provokes: false,
  target: { type: 'asset', id: a.id },
  then,
})
const action = (a: Asset, then: Message[], suffix: string, key?: string): AbilityOption => ({
  key: a.id + ':bonded' + suffix,
  ...label(a, key),
  actions: 1,
  provokes: true,
  target: { type: 'asset', id: a.id },
  then,
})
const fastRegistration = (options: (s: GameState, a: Asset) => AbilityOption[]) => ({
  abilities: (s: GameState, a: Asset) => options(s, a),
  fastOptions: (s: GameState, a: Asset): ReactionOption[] =>
    options(s, a).map((o) => ({ ...o, investigator: a.owner })),
})

/** "Search your bonded cards for 3 copies … Add 1 to your hand and shuffle the other 2." */
function summonThree(code: string, bonded: string, leaves: boolean): void {
  registerPlayerCard({
    code,
    ...(leaves ? { setsAsideBondedOnLeave: true } : {}),
    forced: (_s, t, a) =>
      t.type === 'afterAssetEntersPlay' && t.asset === a.id
        ? [take(a.owner, bonded, 1, 'hand'), take(a.owner, bonded, 2, 'deck')]
        : [],
  })
}

/** Upgraded Mirror/Lexicon: "When you play a copy of …: change each 2 to 3 or shuffle it back." */
function upgradedChoice(s: GameState, by: InvestigatorId, code: string, upgrades: string[]) {
  const resolve = (n: number, shuffle: boolean) => continuation(code, by, 'resolve', { n, shuffle })
  const mirror = controls(s, by, upgrades)
  if (!mirror) return [resolve(2, false)]
  return ask(
    by,
    [
      { label: 'choice.bonded.three', then: [resolve(3, false)] },
      { label: 'choice.bonded.shuffleBack', then: [resolve(2, true)] },
      { label: 'choice.skip', then: [resolve(2, false)] },
    ],
    true,
  )
}
const shuffleBack = (by: InvestigatorId, code: string): Message => ({
  type: 'ShufflePlayedEvent',
  investigator: by,
  code,
  fromBottom: false,
})

/** Soothing Melody: heal one point at a time among investigators and Ally assets here. */
function melodyHeal(s: GameState, by: InvestigatorId, left: number, shuffle: boolean): Message[] {
  const done: Message[] = [
    { type: 'DrawCards', investigator: by, amount: 1 },
    ...(shuffle ? [shuffleBack(by, MELODY)] : []),
  ]
  const here = getInvestigator(s, by).location
  if (!left || here === null) return done
  const next = (n: number) => continuation(MELODY, by, 'heal', { left: n, shuffle })
  const choices: Choice[] = []
  for (const i of s.investigators.filter((x) => !x.eliminated && x.location === here))
    for (const kind of ['damage', 'horror'] as const)
      if (i[kind] > 0)
        choices.push({
          label: kind === 'damage' ? 'choice.bonded.healDamage' : 'choice.bonded.healHorror',
          params: { card: i.name },
          target: { type: 'investigator', id: i.id },
          then: [
            {
              type: 'Heal',
              investigator: i.id,
              damage: kind === 'damage' ? 1 : 0,
              horror: kind === 'horror' ? 1 : 0,
              healer: by,
            },
            next(left - 1),
          ],
        })
  for (const a of Object.values(s.assets))
    if (
      playerCardDef(a.code)?.traits.includes('Ally') &&
      getInvestigator(s, a.owner).location === here
    )
      for (const kind of ['damage', 'horror'] as const)
        if (a[kind] > 0)
          choices.push({
            label: kind === 'damage' ? 'choice.bonded.healDamage' : 'choice.bonded.healHorror',
            params: { card: cardName(a.code) },
            target: { type: 'asset', id: a.id },
            then: [
              {
                type: 'HealAsset',
                asset: a.id,
                damage: kind === 'damage' ? 1 : 0,
                horror: kind === 'horror' ? 1 : 0,
                healer: by,
              },
              next(left - 1),
            ],
          })
  return choices.length ? ask(by, choices, true) : done
}

/** Blood-Rite: each card discarded thusly gains 1 resource or pays 1 for 1 damage here. */
function riteDiscard(s: GameState, by: InvestigatorId, left: number, shuffle: boolean): Message[] {
  const end = shuffle ? [shuffleBack(by, RITE)] : []
  const me = getInvestigator(s, by)
  if (!left || !me.hand.length) return end
  return ask(
    by,
    [
      ...[...new Set(me.hand)].map((card) => ({
        label: 'choice.discard',
        params: { card: cardName(card) },
        then: [
          { type: 'DiscardFromHand', investigator: by, card } as Message,
          continuation(RITE, by, 'payoff', { left, shuffle }),
        ],
      })),
      { label: 'choice.skip', then: end },
    ],
    true,
  )
}
function ritePayoff(s: GameState, by: InvestigatorId, left: number, shuffle: boolean): Message[] {
  const next = continuation(RITE, by, 'discard', { left: left - 1, shuffle })
  const me = getInvestigator(s, by)
  const here = me.location
  const enemies =
    me.resources > 0 && here !== null
      ? Object.values(s.enemies).filter((e) => e.location === here && !e.hasNoStats)
      : []
  return ask(
    by,
    [
      {
        label: 'choice.bonded.riteResource',
        then: [{ type: 'GainResources', investigator: by, amount: 1 }, next],
      },
      ...enemies.map((e): Choice => ({
        label: 'choice.bonded.riteDamage',
        params: { card: e.name },
        target: { type: 'enemy', id: e.id },
        then: [
          { type: 'SpendResources', investigator: by, amount: 1 },
          {
            type: 'DamageEnemy',
            enemy: e.id,
            amount: 1,
            by,
            source: { code: RITE, traits: ['Spell'] },
          },
          next,
        ],
      })),
      { label: 'choice.skip', then: [next] },
    ],
    true,
  )
}

/** Dream Diary (3): the printed condition under which your Essence gains [wild][wild]. */
function diaryCondition(s: GameState, by: InvestigatorId, code: string): boolean {
  const me = getInvestigator(s, by)
  if (code === '06236') return me.location !== null && shroudOf(s, me.location) >= 4
  if (code === '06237') return engagedEnemies(s, by).length > 0
  if (code === '06238') return me.hand.length >= 8
  return false
}

/** Pendant of the Queen: one effect at one revealed location. */
function pendantChoices(s: GameState, by: InvestigatorId): Choice[] {
  const here = getInvestigator(s, by).location
  const choices: Choice[] = []
  for (const l of Object.values(s.locations).filter((x) => x.revealed)) {
    const params = { location: l.name }
    if (l.id !== here)
      choices.push({
        label: 'choice.bonded.pendantMove',
        params,
        target: { type: 'location', id: l.id },
        then: [{ type: 'MoveTo', investigator: by, location: l.id }],
      })
    if (l.clues > 0)
      choices.push({
        label: 'choice.bonded.pendantClue',
        params,
        target: { type: 'location', id: l.id },
        then: [{ type: 'DiscoverClues', investigator: by, amount: 1, location: l.id }],
      })
    for (const e of Object.values(s.enemies).filter(
      (x) => x.location === l.id && !x.cannotBeEvaded && !x.hasNoStats,
    ))
      choices.push({
        label: 'choice.bonded.pendantEvade',
        params: { ...params, card: e.name },
        target: { type: 'enemy', id: e.id },
        then: [{ type: 'EvadeEnemy', enemy: e.id, by }],
      })
  }
  return choices
}

export function registerBondedCard(code: string): void {
  if (MIRRORS.includes(code)) return summonThree(code, MELODY, code === '05313')
  if (LEXICONS.includes(code)) return summonThree(code, RITE, code === '05316')
  if (code === MELODY)
    return registerPlayerCard({
      code,
      play: (s, by) => upgradedChoice(s, by, code, ['54002']),
      effect: (s, by, step, data) => {
        const shuffle = data.shuffle === true
        if (step === 'resolve') return melodyHeal(s, by, Number(data.n), shuffle)
        if (step === 'heal') return melodyHeal(s, by, Number(data.left), shuffle)
        return []
      },
    })
  if (code === RITE)
    return registerPlayerCard({
      code,
      noAttacksOfOpportunity: true,
      play: (s, by) => upgradedChoice(s, by, code, ['54004']),
      effect: (s, by, step, data) => {
        const shuffle = data.shuffle === true
        if (step === 'resolve')
          return [
            { type: 'DrawCards', investigator: by, amount: Number(data.n) },
            continuation(code, by, 'discard', { left: Number(data.n), shuffle }),
          ]
        if (step === 'discard') return riteDiscard(s, by, Number(data.left), shuffle)
        if (step === 'payoff') return ritePayoff(s, by, Number(data.left), shuffle)
        return []
      },
    })
  if (DIARIES.includes(code))
    return registerPlayerCard({
      code,
      ...(code === '06112' ? {} : { requiredResearch: INTERPRETED_DREAMS }),
      abilities: (s, a) =>
        code === '06112' && available(s, a.owner, ESSENCE)
          ? [action(a, [take(a.owner, ESSENCE, 1, 'hand')], ':search', 'ability.bonded.search')]
          : [],
      reactions: (s, t, a) => {
        if (code !== '06112')
          return t.type === 'turnBegins' &&
            t.investigator === a.owner &&
            available(s, a.owner, ESSENCE)
            ? [option(a, [take(a.owner, ESSENCE, 1, 'hand')])]
            : []
        // "After you succeed by 3 or more during a skill test to which Essence is committed."
        return t.type === 'afterSkillTest' &&
          t.investigator === a.owner &&
          t.succeeded &&
          t.margin >= 3 &&
          !!s.skillTest?.committed.some((c) => c.code === ESSENCE) &&
          !s.campaignLog?.notes.includes(INTERPRETED_DREAMS)
          ? [option(a, [{ type: 'RecordNote', note: INTERPRETED_DREAMS }])]
          : []
      },
    })
  if (code === ESSENCE)
    return registerPlayerCard({
      code,
      setAsideInsteadOfDiscard: true,
      additionalIcons: (s, _t, by) =>
        Object.values(s.assets).some(
          (a) => a.owner === by && DIARIES.includes(a.code) && diaryCondition(s, by, a.code),
        )
          ? { wild: 2 }
          : {},
    })
  if (code === MYCONID)
    return registerPlayerCard({
      code,
      abilities: (s, a) => [
        ...(available(s, a.owner, GROWTH)
          ? [action(a, [take(a.owner, GROWTH, 1, 'hand')], ':search', 'ability.bonded.search')]
          : []),
        ...(a.uses >= 3
          ? [
              action(
                a,
                [
                  {
                    type: 'MoveUsesToResources',
                    asset: a.id,
                    investigator: a.owner,
                    amount: a.uses,
                  },
                  { type: 'RecordNote', note: CLASSIFIED_SPECIES },
                ],
                ':harvest',
                'ability.bonded.harvest',
              ),
            ]
          : []),
      ],
    })
  if (code === GROWTH)
    return registerPlayerCard({
      code,
      investigateAction: true,
      canPlay: (s, by) => getInvestigator(s, by).location !== null,
      play: (s, by) => {
        const here = getInvestigator(s, by).location
        return here === null
          ? []
          : [
              {
                type: 'BeginSkillTest',
                investigator: by,
                skill: 'intellect',
                difficulty: shroudOf(s, here),
                effectSource: code,
                kind: {
                  type: 'investigate',
                  location: here,
                  onSuccess: [continuation(code, by, 'grow')],
                  onFail: [continuation(code, by, 'fail')],
                },
              },
            ]
      },
      effect: (s, by, step) => {
        // "After this test resolves": growth and the card's destination wait for the test end.
        if (step === 'fail')
          return [
            {
              type: 'AfterCurrentSkillTest',
              then: [{ type: 'DiscardToHand', investigator: by, code }],
            },
          ]
        if (step !== 'grow' || !s.skillTest) return []
        const margin = Math.max(0, testMargin(s.skillTest))
        const myconid = controls(s, by, [MYCONID])
        return [
          {
            type: 'AfterCurrentSkillTest',
            then: [
              ...(myconid && margin
                ? [{ type: 'AddUses' as const, asset: myconid.id, amount: margin }]
                : []),
              { type: 'SetAsidePlayerCards', investigator: by, codes: [code] },
            ],
          },
        ]
      },
    })
  if (code === SEGMENT)
    return registerPlayerCard({
      code,
      ...fastRegistration((s, a) => {
        const copies = Object.values(s.assets)
          .filter((x) => x.owner === a.owner && x.code === SEGMENT)
          .map((x) => x.id)
          .sort()
        // One offer for the three copies, from the first of them.
        if (copies.length < 3 || copies[0] !== a.id || !available(s, a.owner, PENDANT)) return []
        return [
          fastAbility(a, [
            {
              type: 'SetAsidePlayerCards',
              investigator: a.owner,
              codes: [],
              assets: copies.slice(0, 3),
            },
            take(a.owner, PENDANT, 1, 'play'),
          ]),
        ]
      }),
    })
  if (code === PENDANT)
    return registerPlayerCard({
      code,
      ...fastRegistration((s, a) =>
        a.exhausted || a.uses < 1 || !pendantChoices(s, a.owner).length
          ? []
          : [
              fastAbility(a, [
                { type: 'ExhaustAsset', asset: a.id },
                { type: 'SpendUses', asset: a.id, amount: 1 },
                continuation(code, a.owner, 'choose'),
              ]),
            ],
      ),
      effect: (s, by, step) => (step === 'choose' ? ask(by, pendantChoices(s, by), true) : []),
      // "If this card has no charges, set it aside, out of play, and shuffle 3 set-aside copies."
      forced: (s, t, a) =>
        t.type === 'afterUsesSpent' && t.asset.id === a.id && (s.assets[a.id]?.uses ?? 0) === 0
          ? [
              { type: 'SetAsidePlayerCards', investigator: a.owner, codes: [], assets: [a.id] },
              take(a.owner, SEGMENT, 3, 'deck', false),
            ]
          : [],
    })
  if (code === VESSEL)
    return registerPlayerCard({
      code,
      reactions: (_s, t, a) =>
        t.type === 'enemyDefeated' && t.by === a.owner
          ? [option(a, [{ type: 'AddUses', asset: a.id, amount: 1 }])]
          : [],
      ...fastRegistration((s, a) =>
        a.uses >= 3 && available(s, a.owner, WISH_EATER)
          ? [
              fastAbility(a, [
                { type: 'SwapSetAsideAsset', asset: a.id, code: WISH_EATER, moveUses: true },
              ]),
            ]
          : [],
      ),
    })
  if (code === WISH_EATER)
    return registerPlayerCard({
      code,
      reactions: (s, t, a) => {
        const held = t.type === 'whenRevealChaosToken' ? s.skillTest?.revealing : null
        return held &&
          t.type === 'whenRevealChaosToken' &&
          t.investigator === a.owner &&
          !held.effect &&
          ['skull', 'cultist', 'tablet', 'elderThing'].includes(String(held.face)) &&
          a.uses >= 1
          ? [
              option(a, [
                { type: 'SpendUses', asset: a.id, amount: 1 },
                { type: 'CancelRevealedToken' },
                { type: 'Heal', investigator: a.owner, damage: 1, horror: 1, healer: a.owner },
              ]),
            ]
          : []
      },
      forced: (s, t, a) =>
        t.type === 'afterUsesSpent' && t.asset.id === a.id && (s.assets[a.id]?.uses ?? 0) === 0
          ? [{ type: 'SwapSetAsideAsset', asset: a.id, code: VESSEL, moveUses: false }]
          : [],
    })
  throw new Error('Unknown bonded card: ' + code)
}
