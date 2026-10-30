import {
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  cardsInHand,
  stuckInPlay,
  type GameState,
  type InvestigatorId,
  type Message,
  type SkillType,
  type Asset,
  type SkillTest,
  type Trigger,
} from '@lcg/engine'
import { ask, cardName } from '../dunwich-pilot/effects'
import { fast } from '../asset-utilities/register'
import { registerMoreWindows } from './more-windows'
const ownTurn = (s: GameState, by: string) =>
  s.phase === 'investigation' &&
  (s.immediateActions?.[0]
    ? s.immediateActions[0].endedTurn
      ? null
      : s.immediateActions[0].activeTurn
    : s.activeTurn) === by
const skills: SkillType[] = ['willpower', 'intellect', 'combat', 'agility']
const allocations = (
  s: GameState,
  by: InvestigatorId,
  cap: number,
  reward: boolean,
  discard = false,
): Message[] => {
  const pending = s.queue.find(
    (m): m is Extract<Message, { type: 'TakeDamage' }> =>
      m.type === 'TakeDamage' && m.investigator === by && !!m.damageWindowResolved,
  )
  if (!pending) return []
  const choices = []
  for (let damage = 0; damage <= Math.min(cap, pending.damage); damage++)
    for (let horror = 0; horror <= Math.min(cap - damage, pending.horror); horror++) {
      const total = damage + horror
      if (total === 0) continue
      choices.push({
        label: 'choice.windowCancel',
        params: { damage, horror },
        then: [
          ...(discard
            ? [{ type: 'ChooseDiscardFromHand' as const, investigator: by, amount: total }]
            : []),
          { type: 'ReducePendingDamage' as const, investigator: by, damage, horror },
          ...(reward ? [{ type: 'GainResources' as const, investigator: by, amount: total }] : []),
        ],
      })
    }
  return ask(by, choices, true)
}
export function registerDamageTurn(code: string): void {
  if (registerMoreWindows(code)) return
  const tarotSkills: Record<string, SkillType> = {
    '05023': 'combat',
    '05027': 'intellect',
    '05031': 'agility',
    '05035': 'willpower',
  }
  if (code in tarotSkills || ['05039', '54003', '54005'].includes(code)) {
    registerPlayerCard({
      code,
      openingHandReactions: (_s, by, hand) =>
        hand
          .filter((c) => c === code)
          .map((_, n) => ({
            key: `opening:${code}:${by}:${n}`,
            investigator: by,
            label: 'choice.windowPut',
            params: { card: cardName(code) },
            target: { type: 'hand', code },
            then: [{ type: 'PutAssetIntoPlay', investigator: by, code, fromHand: true }],
          })),
      ...(code in tarotSkills
        ? {
            skillModifier: (_s: GameState, _a: Asset, t: SkillTest) =>
              t.skill === tarotSkills[code] ? 1 : 0,
          }
        : {}),
      ...(code === '05039' ? { ownerVitals: { health: 1, sanity: 1 } } : {}),
      ...(code === '54003'
        ? {
            abilities: (s: GameState, a: Asset, by: string) =>
              a.exhausted || cardsInHand(s, by) < 8
                ? []
                : [
                    fast(
                      a,
                      'world',
                      'choice.drawCards',
                      { n: 1 },
                      [{ type: 'ExhaustAsset', asset: a.id }],
                      [{ type: 'DrawCards', investigator: by, amount: 1 }],
                    ),
                  ],
          }
        : {}),
      ...(code === '54005'
        ? {
            reactions: (s: GameState, t: Trigger, a: Asset) => {
              if (
                t.type !== 'whenWouldSucceed' ||
                t.investigator !== a.owner ||
                s.skillTest?.abilityCounts?.[a.id + ':knight']
              )
                return []
              const increase = (amount: number): Message[] => [
                { type: 'BoostSkillTest', amount },
                { type: 'ModifySkillTest', use: a.id + ':knight' },
              ]
              return [
                {
                  key: a.id + ':knight',
                  investigator: a.owner,
                  label: 'choice.windowKnight',
                  then: ask(
                    a.owner,
                    [
                      { label: 'choice.windowBonus', params: { n: 1 }, then: increase(1) },
                      ...(!stuckInPlay(s, a)
                        ? [
                            {
                              label: 'choice.windowDiscardBonus',
                              params: { n: 3 },
                              then: [
                                { type: 'DiscardAsset' as const, asset: a.id },
                                ...increase(3),
                              ],
                            },
                          ]
                        : []),
                    ],
                    true,
                  ),
                },
              ]
            },
          }
        : {}),
    })
    return
  }
  if (['02261', '05315'].includes(code)) {
    registerPlayerCard({
      code,
      canPlay: () => false,
      handReactions: (s, t, by) =>
        t.type === 'whenDealtDamage' &&
        t.investigator === by &&
        allocations(s, by, code === '02261' ? 5 : 2, true).length > 0
          ? [
              {
                key: 'hand:' + code,
                investigator: by,
                label: 'ability.playCard',
                params: { card: cardName(code) },
                target: { type: 'hand', code },
                then: [
                  {
                    type: 'PlayCard',
                    investigator: by,
                    code,
                    effect: allocations(s, by, code === '02261' ? 5 : 2, true),
                  },
                ],
              },
            ]
          : [],
    })
    return
  }
  if (code === '09102') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) => {
        const count = getInvestigator(s, a.owner).hand.filter(
          (c) => !playerCardDef(c)?.weakness,
        ).length
        if (
          a.exhausted ||
          !count ||
          t.type !== 'whenDealtDamage' ||
          t.investigator !== a.owner ||
          allocations(s, a.owner, Math.min(3, count), false, true).length === 0
        )
          return []
        return [
          {
            key: a.id,
            investigator: a.owner,
            label: 'choice.windowIdol',
            params: { card: cardName(code), amount: Math.min(3, count) },
            then: [
              { type: 'ExhaustAsset', asset: a.id },
              ...allocations(s, a.owner, Math.min(3, count), false, true),
            ],
          },
        ]
      },
    })
    return
  }
  if (code === '60173') {
    registerPlayerCard({
      code,
      canPlay: () => false,
      handReactions: (_s, t, by) =>
        t.type === 'turnBegins' && t.investigator === by
          ? [
              {
                key: 'hand:' + code,
                investigator: by,
                label: 'ability.playCard',
                params: { card: cardName(code) },
                target: { type: 'hand', code },
                then: [
                  {
                    type: 'PlayCard',
                    investigator: by,
                    code,
                    effect: [
                      {
                        type: 'TurnSkillEffect',
                        investigator: by,
                        bonus: { amount: 3, code, kinds: ['investigate'], tags: ['parley'] },
                      },
                    ],
                  },
                ],
              },
            ]
          : [],
    })
    return
  }
  if (code === '01085') {
    registerPlayerCard({
      code,
      canPlay: ownTurn,
      play: (_s, by) => [{ type: 'TurnSkillEffect', investigator: by, noTokens: true }],
    })
    return
  }
  if (!['05281', '54010'].includes(code)) throw new Error(`Unreviewed damage-turn card: ${code}`)
  registerPlayerCard({
    code,
    canPlay: ownTurn,
    play: (_s, by) =>
      ask(
        by,
        [
          ...(code === '54010'
            ? [
                {
                  label: 'choice.windowAllBase',
                  then: [
                    {
                      type: 'TurnSkillEffect' as const,
                      investigator: by,
                      bases: { willpower: 5, intellect: 5, combat: 5, agility: 5 },
                    },
                  ],
                },
              ]
            : []),
          ...skills.map((skill) => ({
            label: 'choice.windowBase',
            params: { skill, n: code === '54010' ? 7 : 5 },
            then: [
              {
                type: 'TurnSkillEffect' as const,
                investigator: by,
                bases: { [skill]: code === '54010' ? 7 : 5 },
              },
            ],
          })),
        ],
        true,
      ),
  })
}
