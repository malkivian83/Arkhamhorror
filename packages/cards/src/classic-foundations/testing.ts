import { availableAbilities, playerCardDef, playerCardBehavior, type SkillType } from '@lcg/engine'
import { choose, during, spawnAt, ghoul } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard, starterDeckList, validateDeck } from '../decks'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'
import type { FoundationFamily } from './register'
const stats = { willpower: 0, intellect: 0, combat: 0, agility: 0 }
export function verifyClassicCard(
  code: string,
  family: FoundationFamily,
  skills: readonly SkillType[] = [],
): void {
  describe(code + ' / ' + family, () => {
    it('resolves its reviewed primary effect and costs', () => {
      const def = playerCardDef(code)!
      if (family === 'pump') {
        let s = during(
          game(),
          (s) => withAsset(patch({ resources: 2, hand: [], skills: stats })(s), code),
          {
            type: 'BeginSkillTest',
            investigator: 'a',
            skill: skills[0]!,
            difficulty: 2,
            kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
          },
        )
        s = choose(s, 'ability.pump')
        expect(me(s).resources).toBe(1)
        expect(s.skillTest!.baseModifier).toBe(1)
        s = choose(s, 'ability.pump')
        expect(me(s).resources).toBe(0)
        expect(s.log.some((e) => e.key === 'log.testSuccess')).toBe(true)
        expect(me(s).actionsRemaining).toBe(3)
      } else if (family === 'soak') {
        const damage = def.health ? 2 : 0,
          horror = def.sanity ? 2 : 0
        let s = during(game(), (s) => withAsset(s, code), {
          type: 'TakeDamage',
          investigator: 'a',
          damage,
          horror,
        })
        s = choose(s, 'choice.assignToAsset', { card: def.name })
        s = choose(s, 'choice.assignToAsset', { card: def.name })
        expect(s.assets[code]).toBeUndefined()
        expect(me(s).discard).toContain(code)
        expect(me(s).damage + me(s).horror).toBe(0)
      } else if (family === 'rosary') {
        let s = during(game(), (s) => withAsset(patch({ hand: [] })(s), code), {
          type: 'BeginSkillTest',
          investigator: 'a',
          skill: 'willpower',
          difficulty: 4,
          kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
        })
        expect(s.log.some((e) => e.key === 'log.testSuccess')).toBe(true)
        s = during(s, (s) => s, { type: 'TakeDamage', investigator: 'a', damage: 0, horror: 1 })
        s = choose(s, 'choice.assignToAsset', { card: def.name })
        expect(s.assets[code]!.horror).toBe(1)
        expect(me(s).horror).toBe(0)
      } else if (family === 'fearless' || family === 'draw-skill') {
        const skill = (Object.keys(def.icons ?? {}).find((k) => k !== 'wild') ??
          'willpower') as SkillType
        let s = during(game(), patch({ hand: [code], horror: 2 }), {
          type: 'BeginSkillTest',
          investigator: 'a',
          skill,
          difficulty: 2,
          kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
        })
        s = choose(s, 'choice.commit')
        expect(me(s).discard).toContain(code)
        if (family === 'fearless') expect(me(s).horror).toBe(1)
        else expect(me(s).hand).toHaveLength(2)
      } else if (family === 'knife') {
        let s = during(
          game(),
          (s) => withAsset(patch({ hand: [] })(s), code),
          spawnAt('A', { ...ghoul, health: 8 }, 'a'),
        )
        s = choose(s, 'ability.classicKnifeDiscard')
        expect(s.assets[code]).toBeUndefined()
        expect(me(s).discard).toContain(code)
        expect(Object.values(s.enemies)[0]!.damageTaken).toBe(2)
        expect(me(s).actionsRemaining).toBe(2)
        expect(me(s).damage).toBe(0)
      } else if (family === 'flashlight') {
        let s = during(game(), (s) => ({
          ...withAsset(patch({ hand: [], skills: stats })(s), code),
          chaosBag: [-1],
        }))
        s = choose(s, 'ability.investigateWith')
        expect(me(s).clues).toBe(1)
        expect(s.assets[code]!.uses).toBe(2)
      } else if (family === 'first-aid') {
        let s = during(game(['a', 'b']), (s) =>
          withAsset(patch({ damage: 1, horror: 1 }, 'b')(s), code, { uses: 1 }),
        )
        s = choose(s, 'ability.classicFirstAidDamage', { name: 'B' })
        expect(s.investigators[1]!.damage).toBe(0)
        expect(s.investigators[1]!.horror).toBe(1)
        expect(s.assets[code]).toBeUndefined()
        expect(me(s).discard).toContain(code)
        expect(me(s).actionsRemaining).toBe(2)
      } else if (family === 'cleaver') {
        let s = during(
          game(),
          (s) => withAsset(patch({ horror: 4, hand: [] })(s), code),
          spawnAt('A', { ...ghoul, fight: 5, health: 2 }, 'a'),
        )
        s = choose(s, 'ability.classicCleaverPaid')
        s = choose(s, 'choice.classicCleaverHeal')
        expect(Object.keys(s.enemies)).toHaveLength(0)
        expect(me(s).horror).toBe(4)
        expect(me(s).actionsRemaining).toBe(2)
      }
    })
    if (family === 'pump')
      it('supports both reviewed skills and excludes other skills and empty resources', () => {
        const def = playerCardBehavior(code)!,
          s = withAsset(game(), code),
          a = s.assets[code]!
        for (const skill of ['willpower', 'intellect', 'combat', 'agility'] as const) {
          const test = { investigator: 'a', skill } as Parameters<
            NonNullable<typeof def.testOptions>
          >[1]
          expect(def.testOptions!(s, test, a)).toHaveLength(skills.includes(skill) ? 1 : 0)
          expect(def.testOptions!(patch({ resources: 0 })(s), test, a)).toHaveLength(0)
        }
      })
    if (family === 'draw-skill') {
      it.each([
        [5, 1],
        [7, 0],
      ])('handles difficulty %s with %s drawn cards', (difficulty, drawn) => {
        const def = playerCardDef(code)!,
          skill = Object.keys(def.icons!)[0] as SkillType
        let s = during(game(), patch({ hand: [code] }), {
          type: 'BeginSkillTest',
          investigator: 'a',
          skill,
          difficulty,
          kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
        })
        s = choose(s, 'choice.commit')
        expect(me(s).hand).toHaveLength(drawn)
      })
      it('limits this title to one committed card per test', () => {
        const def = playerCardDef(code)!,
          skill = Object.keys(def.icons!)[0] as SkillType
        let s = during(
          game(),
          (s) => ({ ...patch({ hand: [code, code] })(s), interactive: true }),
          {
            type: 'BeginSkillTest',
            investigator: 'a',
            skill,
            difficulty: 2,
            kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
          },
        )
        s = choose(s, 'choice.commit')
        expect(s.skillTest!.committed).toHaveLength(1)
        expect(s.pending!.question.choices.some((c) => c.label === 'choice.commit')).toBe(false)
      })
    }
    if (family === 'knife')
      it('retains the knife for an ordinary attack with normal damage', () => {
        let s = during(
          game(),
          (s) => withAsset(patch({ hand: [] })(s), code),
          spawnAt('A', { ...ghoul, health: 8 }, 'a'),
        )
        s = choose(s, 'ability.fightWith')
        expect(s.assets[code]).toBeDefined()
        expect(Object.values(s.enemies)[0]!.damageTaken).toBe(1)
      })
    if (family === 'flashlight')
      it('remains in play after its last supply and is unavailable when empty', () => {
        let s = during(game(), (s) => withAsset(patch({ hand: [] })(s), code, { uses: 1 }))
        s = choose(s, 'ability.investigateWith')
        expect(s.assets[code]!.uses).toBe(0)
        expect(availableAbilities(s, 'a').some((a) => a.label === 'ability.investigateWith')).toBe(
          false,
        )
      })
    if (family === 'first-aid')
      it('offers horror recovery but no targets at other locations', () => {
        let s = during(game(['a', 'b']), (s) => withAsset(patch({ horror: 2 }, 'b')(s), code))
        s = choose(s, 'ability.classicFirstAidHorror', { name: 'B' })
        expect(s.investigators[1]!.horror).toBe(1)
        s = during(s, patch({ location: 'B' }, 'b'))
        expect(
          availableAbilities(s, 'a').some((a) => a.label.startsWith('ability.classicFirstAid')),
        ).toBe(false)
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
                  ? 'daniela'
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
