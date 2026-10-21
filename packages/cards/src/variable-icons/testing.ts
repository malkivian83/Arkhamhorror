import {
  allPlayerCardDefs,
  dispatch,
  playerCardDef,
  skillTestValue,
  type GameState,
  type SkillType,
} from '@lcg/engine'
import { during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard, starterDeckList, validateDeck } from '../decks'
import approvals from './approvals.json'

export function verifyVariableIcons(code: string): void {
  const family = approvals.cards.find((c) => c.code === code)!.family
  const def = playerCardDef(code)!
  const skill: SkillType =
    family === 'cunning'
      ? 'intellect'
      : family === 'able' || family === 'rough'
        ? 'combat'
        : 'willpower'
  const base = (def.icons?.[skill] ?? 0) + (def.icons?.wild ?? 0)
  const cases: [number, number][] =
    family === 'able'
      ? [
          [0, 2],
          [1, 2],
          [2, 1],
          [3, 0],
        ]
      : family === 'leadership'
        ? [
            [0, 0],
            [1, 2],
          ]
        : family === 'rise'
          ? [
              [1, 1],
              [2, 2],
              [3, 3],
              [5, 3],
            ]
          : family === 'funded'
            ? [
                [0, 0],
                [1, 1],
                [2, 1],
                [3, 2],
              ]
            : family === 'dressed'
              ? [
                  [0, 0],
                  [1, 3],
                ]
              : family === 'rough'
                ? [
                    [0, 0],
                    [1, 1],
                    [2, 1],
                    [3, 2],
                    [5, 3],
                  ]
                : family === 'prophesy'
                  ? [
                      [2, 0],
                      [3, 1],
                      [5, 1],
                      [6, 2],
                    ]
                  : family === 'curiosity'
                    ? [
                        [3, 0],
                        [4, 1],
                        [6, 1],
                        [7, 2],
                      ]
                    : [
                        [4, 0],
                        [5, 1],
                        [9, 1],
                        [10, 2],
                      ]
  const configure = (s: GameState, n: number): GameState => {
    s = patch({ hand: [code], damage: 0, horror: 0, resources: 0 })(s)
    if (family === 'steadfast')
      s = patch({ damage: Math.ceil((16 - n) / 2), horror: Math.floor((16 - n) / 2) })(s)
    if (family === 'curiosity') s = patch({ hand: [code, ...Array<string>(n).fill('01072')] })(s)
    if (family === 'cunning') s = patch({ resources: n })(s)
    if (family === 'rough') s = patch({ damage: n })(s)
    if (family === 'prophesy') s = { ...s, doom: n }
    if (family === 'able' || family === 'funded') {
      const asset = allPlayerCardDefs().find(
        (d) => d.type === 'asset' && d.traits.includes(family === 'able' ? 'Item' : 'Tool'),
      )!
      for (let k = 0; k < n; k++) s = withAsset(s, asset.code, { id: 'variable-item-' + k })
    }
    return s
  }
  const open = (n: number) =>
    during(game(['a', 'b']), (s) => configure(s, n), {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill,
      difficulty: family === 'rise' ? 3 + n : 3,
      ...(family === 'dressed' && n ? { tags: ['parley'] } : {}),
      kind: { type: 'effect', source: 'variable-test', onSuccess: [], onFail: [], onFailEach: [] },
    })
  describe(code + ' / variable icons', () => {
    for (const [n, bonus] of cases)
      it('counts the printed and additional icons at boundary ' + n, () => {
        const s = open(n)
        const committed = dispatch(
          { ...s, pending: null, queue: [] },
          { type: 'CommitCard', investigator: 'a', code },
        )
        const t = committed.skillTest!
        const actual =
          family === 'leadership' && n
            ? { ...committed, skillTest: { ...t, investigator: 'b' } }
            : committed
        expect(skillTestValue(actual).icons).toBe(base + bonus)
        expect(me(committed).hand).not.toContain(code)
      })
    it('displays the current icon count in the commit choice', () => {
      const [n, bonus] = cases[cases.length - 1]!
      const s = open(n)
      const shown = s.pending?.question.choices.find((c) => c.params?.card === def.name)
      const expected = family === 'leadership' ? base : base + bonus
      expect(shown?.params?.icons).toBe(expected)
    })
    it('enters a legal deck or experience purchase and starts a real scenario', () => {
      const investigator =
        def.class === 'guardian'
          ? 'daniela'
          : def.class === 'rogue'
            ? 'trish'
            : def.class === 'mystic'
              ? 'dexter'
              : def.class === 'survivor'
                ? 'isabelle'
                : 'joe'
      let campaign
      if (def.xp) {
        campaign = newCampaign('brethren-of-ash', [investigator], 'easy')
        const id = campaign.investigators[0]!.id
        campaign.log.investigators[id]!.xp = def.xp
        const option = purchaseOptions(campaign, id).find((o) => o.code === code)!
        expect(option).toBeDefined()
        campaign = purchase(
          campaign,
          id,
          code,
          option.replaces
            ? { upgrade: true }
            : { remove: campaign.investigators[0]!.deck.find(isStandard)! },
        )
      } else {
        const deck = starterDeckList(investigator, 'classic', 'Classic')
        deck.cards.splice(deck.cards.findIndex(isStandard), 1, code)
        expect(validateDeck(deck).problems).toEqual([])
        campaign = newCampaign(
          'brethren-of-ash',
          [{ investigator: deck.investigator, cards: deck.cards }],
          'easy',
        )
      }
      const i = startScenario(campaign, 3, false).investigators[0]!
      expect([...i.hand, ...i.deck, ...i.discard]).toContain(code)
    })
  })
}
