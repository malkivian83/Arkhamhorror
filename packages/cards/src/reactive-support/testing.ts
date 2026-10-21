import { availableAbilities, playerCardBehavior, playerCardDef, type Trigger } from '@lcg/engine'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard, starterDeckList, validateDeck } from '../decks'
import { game, hand, me, patch, play, withAsset } from '../dunwich-pilot/testing'
import approvals from './approvals.json'

export function verifyReactiveSupport(code: string): void {
  const family = approvals.cards.find((c) => c.code === code)!.family
  describe(code + ' / ' + family, () => {
    it('resolves its primary effect in a real game', () => {
      const def = playerCardDef(code)!
      if (family === 'milan') {
        let s = during(game(), (s) => withAsset(patch({ hand: [] })(s), code))
        s = choose(s, 'action.investigate')
        s = choose(s, 'ability.gainResource')
        expect(me(s).resources).toBe(6)
        expect(s.assets[code]!.exhausted).toBe(false)
        s = choose(s, 'action.investigate')
        s = choose(s, 'ability.gainResource')
        expect(me(s).resources).toBe(7)
        expect(me(s).actionsRemaining).toBe(1)
      } else if (family === 'foot' || family === 'search-foot') {
        let s = during(
          game(),
          (s) =>
            withAsset(
              patch({
                hand: [],
                deck: ['01072', '01075', '12089', ...me(s).deck],
                skills: { willpower: 0, intellect: 0, combat: 0, agility: 0 },
              })(s),
              code,
            ),
          {
            type: 'BeginSkillTest',
            investigator: 'a',
            skill: 'willpower',
            difficulty: 2,
            kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
          },
        )
        s = choose(s, family === 'foot' ? 'ability.drawCards' : 'ability.reactiveSearch')
        if (family === 'search-foot')
          s = choose(s, 'choice.takeCard', { card: playerCardDef('01072')!.name })
        expect(me(s).hand).toHaveLength(1)
        expect(me(s).hand).toContain('01072')
        expect(s.assets[code]!.exhausted).toBe(true)
      } else if (family === 'pickpocket') {
        let s = during(
          game(),
          (s) => withAsset(patch({ hand: [] })(s), code),
          spawnAt('A', ghoul, 'a'),
        )
        s = choose(s, 'action.evade')
        s = choose(s, 'ability.drawCards')
        expect(me(s).hand).toHaveLength(1)
        expect(s.assets[code]!.exhausted).toBe(true)
      } else if (family === 'newspaper') {
        let s = during(game(), (s) => ({
          ...withAsset(patch({ hand: [] })(s), code),
          locations: { ...s.locations, A: { ...s.locations.A!, shroud: 5 } },
        }))
        s = choose(s, 'action.investigate')
        expect(me(s).clues).toBe(1)
        s = choose(s, 'action.investigate')
        expect(me(s).clues).toBe(1)
        expect(s.log.some((e) => e.key === 'log.testFailure')).toBe(true)
      } else if (family === 'guard-damage' || family === 'guard-horror') {
        const horror = family === 'guard-horror' ? 1 : 0,
          damage = family === 'guard-damage' ? 1 : 0
        let s = during(game(['a', 'b']), (s) => withAsset(s, code), {
          type: 'TakeDamage',
          investigator: 'b',
          damage,
          horror,
        })
        s = choose(s, 'choice.assignToAsset', { card: def.name })
        expect(s.assets[code]!.damage).toBe(damage)
        expect(s.assets[code]!.horror).toBe(horror)
        expect(s.investigators[1]!.damage + s.investigators[1]!.horror).toBe(0)
      } else if (family === 'shovel') {
        let s = during(game(), (s) => withAsset(s, code))
        s = choose(s, 'ability.reactiveShovel')
        expect(me(s).clues).toBe(1)
        expect(s.assets[code]).toBeUndefined()
        expect(me(s).discard).toContain(code)
        expect(me(s).actionsRemaining).toBe(2)
      } else if (family === 'sketches') {
        const s = play(game(), code)
        expect(me(s).hand).toHaveLength(3)
        expect(me(s).resources).toBe(10 - def.cost!)
        expect(me(s).actionsRemaining).toBe(2)
      } else if (family === 'resourceful') {
        let s = during(
          game(),
          patch({ hand: [code], discard: ['01072', '01075', '03039', '12089'] }),
          {
            type: 'BeginSkillTest',
            investigator: 'a',
            skill: 'combat',
            difficulty: 3,
            kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
          },
        )
        s = choose(s, 'choice.commit')
        expect(s.pending!.question.choices.map((c) => c.params?.card)).not.toContain(
          playerCardDef(code)!.name,
        )
        expect(s.pending!.question.choices.map((c) => c.params?.card)).not.toContain(
          playerCardDef('12089')!.name,
        )
        s = choose(s, 'choice.reactiveRecover', { card: playerCardDef('01072')!.name })
        expect(me(s).hand).toContain('01072')
        expect(me(s).discard).not.toContain('01072')
        expect(me(s).discard.filter((c) => c === code)).toHaveLength(2)
      }
    })
    if (playerCardDef(code)!.type === 'asset')
      it('pays printed cost and action to enter play', () => {
        const def = playerCardDef(code)!,
          s = choose(hand(game(), code), 'action.play', { card: def.name })
        expect(Object.values(s.assets).some((a) => a.code === code)).toBe(true)
        expect(me(s).resources).toBe(10 - def.cost!)
        expect(me(s).actionsRemaining).toBe(2)
      })
    if (['foot', 'search-foot', 'pickpocket', 'milan'].includes(family))
      it('filters other investigators, incorrect results and exhaustion', () => {
        const s = withAsset(game(['a', 'b']), code),
          a = s.assets[code]!,
          behavior = playerCardBehavior(code)!
        const good: Trigger =
          family === 'pickpocket'
            ? { type: 'afterEvade', investigator: 'a', enemy: 'test' }
            : {
                type: 'afterSkillTest',
                investigator: 'a',
                kind: family === 'milan' ? 'investigate' : 'effect',
                succeeded: family === 'milan',
                margin: family === 'milan' ? 1 : -2,
              }
        expect(behavior.reactions!(s, good, a)).toHaveLength(1)
        expect(behavior.reactions!(s, { ...good, investigator: 'b' }, a)).toEqual([])
        if (family !== 'milan')
          expect(behavior.reactions!(s, good, { ...a, exhausted: true })).toEqual([])
        if (good.type === 'afterSkillTest')
          expect(behavior.reactions!(s, { ...good, succeeded: !good.succeeded }, a)).toEqual([])
      })
    if (family === 'guard-damage' || family === 'guard-horror')
      it('does not absorb damage or horror from another location', () => {
        const s = during(
          game(['a', 'b']),
          (s) => withAsset(patch({ location: 'B' }, 'b')(s), code),
          {
            type: 'TakeDamage',
            investigator: 'b',
            damage: family === 'guard-damage' ? 1 : 0,
            horror: family === 'guard-horror' ? 1 : 0,
          },
        )
        expect(s.pending?.question.choices.some((c) => c.label === 'choice.assignToAsset')).toBe(
          false,
        )
        expect(s.investigators[1]!.damage + s.investigators[1]!.horror).toBe(1)
      })
    if (family === 'shovel')
      it('fights with +2 and ordinary damage without discarding', () => {
        let s = during(
          game(),
          (s) => withAsset(patch({ hand: [] })(s), code),
          spawnAt('A', { ...ghoul, fight: 5, health: 10 }, 'a'),
        )
        s = choose(s, 'ability.fightWith')
        expect(Object.values(s.enemies)[0]!.damageTaken).toBe(1)
        expect(s.assets[code]).toBeDefined()
        s = during(s, (s) => ({
          ...s,
          locations: { ...s.locations, A: { ...s.locations.A!, clues: 0 } },
        }))
        expect(availableAbilities(s, 'a').some((a) => a.label === 'ability.reactiveShovel')).toBe(
          false,
        )
      })
    if (family === 'sketches')
      it('requires clues on the location rather than clues carried', () => {
        const s = {
          ...patch({ clues: 3 })(game()),
          locations: { ...game().locations, A: { ...game().locations.A!, clues: 0 } },
        }
        expect(playerCardBehavior(code)!.canPlay!(s, 'a')).toBe(false)
      })
    if (family === 'resourceful')
      it('does not recover any card on failure', () => {
        let s = during(game(), patch({ hand: [code], discard: ['01072'] }), {
          type: 'BeginSkillTest',
          investigator: 'a',
          skill: 'combat',
          difficulty: 8,
          kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
        })
        s = choose(s, 'choice.commit')
        expect(me(s).hand).not.toContain('01072')
        expect(me(s).discard).toContain('01072')
      })
    it('enters a legal deck or experience purchase and survives real scenario setup', () => {
      const def = playerCardDef(code)!,
        investigator =
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
      if ((def.xp ?? 0) > 0) {
        campaign = newCampaign('brethren-of-ash', [investigator], 'easy')
        const id = campaign.investigators[0]!.id
        campaign.log.investigators[id]!.xp = def.xp!
        const option = purchaseOptions(campaign, id).find((o) => o.code === code)!
        expect(option).toBeDefined()
        const remove = campaign.investigators[0]!.deck.find(isStandard)!
        campaign = purchase(campaign, id, code, option.replaces ? { upgrade: true } : { remove })
        expect(campaign.log.investigators[id]!.xp).toBe(0)
      } else {
        const deck = starterDeckList(investigator, 'classic', 'Classic'),
          same = deck.cards.findIndex((c) => playerCardDef(c)?.name === def.name)
        deck.cards.splice(same >= 0 ? same : deck.cards.findIndex(isStandard), 1, code)
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
