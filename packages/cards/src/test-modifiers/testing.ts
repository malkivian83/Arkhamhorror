import { dispatch, playerCardDef, skillTestValue, type SkillTestKind } from '@lcg/engine'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch } from '../dunwich-pilot/testing'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard, starterDeckList, validateDeck } from '../decks'
import approvals from './approvals.json'

export function verifyTestModifier(code: string): void {
  const family = approvals.cards.find((c) => c.code === code)!.family
  const def = playerCardDef(code)!
  const open = (difficulty: number, by = 'a', evade = false) => {
    const s = during(
      game(['a', 'b']),
      (s) =>
        patch(
          { hand: [code] },
          by,
        )(
          patch(
            { hand: [], resources: 0, deck: ['01072', '01075'] },
            'b',
          )(patch({ hand: [], resources: 0, deck: ['01072', '01075'] })(s)),
        ),
      spawnAt('A', { ...ghoul, health: 10 }, 'a'),
    )
    const enemy = Object.values(s.enemies)[0]!
    const kind: SkillTestKind = ['blow', 'adapt', 'daring'].includes(family)
      ? evade
        ? { type: 'evade', enemy: enemy.id }
        : { type: 'fight', enemy: enemy.id, extraDamage: 0 }
      : {
          type: 'effect',
          source: 'modifier-test',
          onSuccess: [{ type: 'GainResources', investigator: 'a', amount: 1 }],
          onFail: [],
          onFailEach: [],
        }
    return during(s, (s) => s, {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill:
        family === 'leadership' || family === 'gumption'
          ? 'willpower'
          : evade
            ? 'agility'
            : 'combat',
      difficulty,
      kind,
    })
  }
  describe(code + ' / test modifiers', () => {
    for (const by of ['a', 'b'])
      it('resolves the own effect with committer ' + by, () => {
        const s = open(family === 'gumption' ? 4 : 1, by)
        const next = choose(s, by === 'a' ? 'choice.commit' : 'choice.commitFrom', {
          card: def.name,
        })
        if (family === 'blow') expect(Object.values(next.enemies)[0]!.damageTaken).toBe(3)
        if (family === 'leadership') {
          expect(me(next).resources).toBe(3)
          expect(next.investigators[1]!.resources).toBe(by === 'b' ? 2 : 0)
        }
        if (family === 'gumption') expect(me(next).resources).toBe(1)
        if (family === 'daring')
          expect(next.investigators.find((i) => i.id === by)!.hand).toContain('01072')
      })
    it('checks the failure behavior', () => {
      const s = open(99)
      const next = choose(s, 'choice.commit')
      if (family === 'blow') expect(Object.values(next.enemies)[0]!.damageTaken).toBe(0)
      if (family === 'leadership' || family === 'gumption') expect(me(next).resources).toBe(0)
      if (family === 'adapt') expect(me(next).damage + me(next).horror).toBe(0)
      if (family === 'daring') {
        expect(me(next).damage).toBe(1)
        expect(me(next).hand).toContain('01072')
        expect(Object.values(next.enemies)[0]!.keywords).toEqual([])
      }
    })
    if (family === 'leadership')
      it('adds the helper icons for a different investigator', () => {
        const s = open(1, 'b')
        const next = dispatch(
          { ...s, pending: null, queue: [] },
          { type: 'CommitCard', investigator: 'b', code },
        )
        const printed = (def.icons?.willpower ?? 0) + (def.icons?.wild ?? 0)
        expect(skillTestValue(next).icons).toBe(printed + 2)
      })
    if (family === 'blow')
      it('adds only one damage below a success margin of two', () => {
        const s = choose(open(4), 'choice.commit')
        expect(Object.values(s.enemies)[0]!.damageTaken).toBe(2)
      })
    if (family === 'adapt' || family === 'daring')
      it('also applies to evasion and cannot commit to an unrelated test', () => {
        const s = choose(open(99, 'a', true), 'choice.commit')
        expect(me(s).damage).toBe(family === 'daring' ? 1 : 0)
        const other = during(game(), patch({ hand: [code] }), {
          type: 'BeginSkillTest',
          investigator: 'a',
          skill: 'willpower',
          difficulty: 1,
          kind: { type: 'effect', source: 'unrelated', onSuccess: [], onFail: [], onFailEach: [] },
        })
        expect(
          other.pending?.question.choices.some((c) => c.params?.card === def.name) ?? false,
        ).toBe(false)
      })
    if (family === 'gumption')
      it('reduces the live difficulty and enforces the single-copy limit', () => {
        const s = open(3)
        const next = dispatch(
          { ...patch({ hand: [code, code] })(s), pending: null, queue: [] },
          { type: 'CommitCard', investigator: 'a', code },
          { type: 'CommitCard', investigator: 'a', code },
        )
        expect(next.skillTest!.difficulty).toBe(1)
        expect(next.skillTest!.committed).toHaveLength(1)
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
