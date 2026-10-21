import { allPlayerCardDefs, playerCardDef, type GameState, type SkillTestKind } from '@lcg/engine'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard, starterDeckList, validateDeck } from '../decks'
import approvals from './approvals.json'

export function verifyResultSkill(code: string): void {
  const family = approvals.cards.find((c) => c.code === code)!.family
  const def = playerCardDef(code)!
  const ally = allPlayerCardDefs().find(
    (d) =>
      d.type === 'asset' && d.traits.includes('Ally') && (d.health ?? 0) > 1 && (d.sanity ?? 0) > 1,
  )!
  const charge = allPlayerCardDefs().find(
    (d) => d.type === 'asset' && ['charge', 'charges'].includes(d.uses?.type ?? ''),
  )!
  const open = (success: boolean, by = 'a') => {
    let s = during(
      game(['a', 'b']),
      (s) => {
        s = patch(
          { hand: [], deck: ['01072', '01075', '60171', '03039'], resources: 0 },
          'a',
        )(patch({ hand: [], resources: 0 }, 'b')(s))
        s = patch({ hand: [code] }, by)(s)
        s = withAsset(s, ally.code, {
          id: 'ally',
          owner: 'b',
          damage: 1,
          horror: 1,
          exhausted: true,
        })
        return withAsset(s, charge.code, { id: 'charges', owner: by })
      },
      spawnAt('A', { ...ghoul, health: 10 }, 'a'),
    )
    const enemy = Object.values(s.enemies)[0]!
    const kind: SkillTestKind =
      family === 'stunning'
        ? { type: 'fight', enemy: enemy.id, extraDamage: 0 }
        : family === 'enraptured'
          ? { type: 'investigate', location: 'A' }
          : { type: 'effect', source: 'result-test', onSuccess: [], onFail: [], onFailEach: [] }
    s = during(s, (s) => s, {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: family === 'stunning' ? 'combat' : family === 'enraptured' ? 'intellect' : 'willpower',
      difficulty: success ? 1 : 99,
      kind,
    })
    return s
  }
  const commit = (s: GameState, by: string) =>
    choose(s, by === 'a' ? 'choice.commit' : 'choice.commitFrom', { card: def.name })
  const resolve = (s: GameState) => {
    if (family === 'eureka')
      return choose(s, 'choice.takeCard', { card: playerCardDef('01075')!.name })
    if (family === 'presence') return choose(s, 'choice.resultAllyDamage')
    return s
  }
  describe(code + ' / test result effects', () => {
    for (const by of ['a', 'b'])
      it('resolves its effect with committer ' + by, () => {
        const success = family !== 'heart'
        const before = open(success, by)
        expect(before.pending!.question.choices.some((c) => c.params?.card === def.name)).toBe(true)
        const s = resolve(commit(before, by))
        if (family === 'eureka') expect(me(s).hand).toContain('01075')
        if (family.startsWith('presence')) {
          expect(s.assets.ally!.exhausted).toBe(false)
          expect(s.assets.ally!.damage).toBe(0)
          expect(s.assets.ally!.horror).toBe(family === 'presence' ? 1 : 0)
        }
        if (family === 'enraptured')
          expect(s.assets.charges!.uses).toBe(before.assets.charges!.uses + 1)
        if (family === 'stunning') {
          const enemy = Object.values(s.enemies)[0]!
          expect(enemy.exhausted).toBe(true)
          expect(enemy.engagedWith).toBeNull()
          expect(enemy.damageTaken).toBe(1)
        }
        if (family === 'heart') {
          expect(me(s).resources).toBe(2)
          expect(me(s).hand).toHaveLength(2)
          expect(s.investigators[1]!.resources).toBe(0)
        }
      })
    it('does not grant the effect for the opposite result', () => {
      const s = commit(open(family === 'heart'), 'a')
      expect(s.assets.ally!.exhausted).toBe(true)
      expect(s.assets.ally!.damage).toBe(1)
      expect(s.assets.ally!.horror).toBe(1)
      expect(me(s).hand).toHaveLength(0)
      expect(me(s).resources).toBe(0)
      if (family === 'enraptured') expect(s.assets.charges!.uses).toBe(charge.uses!.count)
      if (family === 'stunning') expect(Object.values(s.enemies)[0]!.exhausted).toBe(false)
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
