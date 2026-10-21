import { availableAbilities, playerCardBehavior, playerCardDef } from '@lcg/engine'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard, starterDeckList, validateDeck } from '../decks'
import { game, hand, me, patch, play, withAsset } from '../dunwich-pilot/testing'
import approvals from './approvals.json'

export function verifyEquipment(code: string): void {
  const entry = approvals.cards.find((c) => c.code === code)!,
    family = entry.family
  describe(code + ' / ' + family, () => {
    if (playerCardDef(code)!.type === 'asset')
      it('pays its printed play cost, timing and initial uses', () => {
        const def = playerCardDef(code)!
        const s = choose(hand(game(), code), def.fast ? 'action.playFast' : 'action.play', {
          card: def.name,
        })
        const asset = Object.values(s.assets).find((a) => a.code === code)
        expect(asset).toBeDefined()
        expect(asset!.uses).toBe(def.uses?.count ?? 0)
        expect(me(s).resources).toBe(10 - def.cost!)
        expect(me(s).actionsRemaining).toBe(def.fast ? 3 : 2)
      })
    it('resolves its effect with printed costs and the correct target', () => {
      const def = playerCardDef(code)!
      if (family === 'firearm' || family === 'threshold') {
        let s = during(
          game(),
          (s) =>
            withAsset(
              patch({ hand: [], skills: { willpower: 3, intellect: 3, combat: 8, agility: 3 } })(s),
              code,
            ),
          spawnAt('A', { ...ghoul, health: 12 }, 'a'),
        )
        s = choose(s, 'ability.fightWith')
        expect(Object.values(s.enemies)[0]!.damageTaken).toBe(
          1 + ('damage' in entry ? entry.damage : 0),
        )
        expect(s.assets[code]!.uses).toBe(def.uses ? def.uses.count - 1 : 0)
        expect(me(s).actionsRemaining).toBe(2)
        expect(me(s).damage).toBe(0)
      } else if (family === 'soak') {
        const amount = def.health ?? def.sanity!,
          damage = def.health ? amount : 0,
          horror = def.sanity ? amount : 0
        let s = during(game(), (s) => withAsset(s, code), {
          type: 'TakeDamage',
          investigator: 'a',
          damage,
          horror,
        })
        for (let n = 0; n < amount; n++) s = choose(s, 'choice.assignToAsset', { card: def.name })
        expect(s.assets[code]).toBeUndefined()
        expect(me(s).discard).toContain(code)
        expect(me(s).damage + me(s).horror).toBe(0)
      } else if (family === 'trench' || family === 'willpower') {
        let s = during(
          game(),
          (s) => withAsset(patch({ hand: [] })(s), code),
          ...(family === 'trench' ? [spawnAt('A', { ...ghoul, evade: 4 }, 'a')] : []),
        )
        s =
          family === 'trench'
            ? choose(s, 'action.evade')
            : during(s, (s) => s, {
                type: 'BeginSkillTest',
                investigator: 'a',
                skill: 'willpower',
                difficulty: 4,
                kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
              })
        expect(s.log.some((e) => e.key === 'log.testSuccess')).toBe(true)
      } else if (family === 'resources') {
        const s = play(game(), code)
        expect(me(s).resources).toBe(20 - def.cost!)
        expect(me(s).actionsRemaining).toBe(2)
      } else if (family === 'sneak') {
        let s = during(game(), (s) => s, spawnAt('A', { ...ghoul, health: 8 }, 'a'))
        s = during(s, (s) => ({
          ...s,
          enemies: Object.fromEntries(
            Object.entries(s.enemies).map(([id, e]) => [
              id,
              { ...e, exhausted: true, engagedWith: null },
            ]),
          ),
        }))
        s = play(s, code)
        expect(Object.values(s.enemies)[0]!.damageTaken).toBe(2)
        expect(me(s).discard).toContain(code)
      } else if (family === 'backstab') {
        let s = during(
          game(),
          patch({ hand: [], skills: { willpower: 3, intellect: 3, combat: 0, agility: 4 } }),
          spawnAt('A', { ...ghoul, fight: 4, health: 8 }, 'a'),
        )
        s = play(s, code)
        expect(Object.values(s.enemies)[0]!.damageTaken).toBe(3)
        expect(me(s).damage).toBe(0)
      } else if (family === 'draw') {
        let s = choose(hand(game(['a', 'b']), code), 'action.playFast', { card: def.name })
        s = choose(s, 'choice.equipmentInvestigator', { name: 'B' })
        expect(s.investigators[1]!.hand).toHaveLength(8)
        expect(me(s).actionsRemaining).toBe(3)
        expect(me(s).resources).toBe(10 - def.cost!)
      } else if (family === 'search' || family === 'weapon-search') {
        let s = during(
          game(['a', 'b']),
          patch(
            { deck: ['01016', '12089', ...Array.from({ length: 12 }, (_, i) => 'unknown-' + i)] },
            family === 'search' ? 'b' : 'a',
          ),
        )
        s = play(s, code)
        if (family === 'search') s = choose(s, 'choice.equipmentInvestigator', { name: 'B' })
        if (s.pending?.question.prompt === 'prompt.searchToHand')
          s = choose(s, 'choice.takeCard', { card: playerCardDef('01016')!.name })
        const i = s.investigators[family === 'search' ? 1 : 0]!
        expect(i.hand).toContain('01016')
        expect(i.deck).not.toContain('01016')
        expect(i.deck).toHaveLength(13)
      } else if (family === 'medical' || family === 'healing') {
        let s = during(game(['a', 'b']), (s) => withAsset(patch({ damage: 2 }, 'b')(s), code))
        s = choose(s, family === 'medical' ? 'ability.equipmentMedical' : 'ability.equipmentHeal', {
          name: 'B',
        })
        expect(s.investigators[1]!.damage).toBe(1)
        expect(me(s).actionsRemaining).toBe(2)
        if (family === 'healing') expect(s.assets[code]!.uses).toBe(2)
      }
    })
    if (family === 'firearm' || family === 'threshold') {
      if ('uses' in entry)
        it('cannot attack empty and remains in play after the last use', () => {
          let s = during(
            game(),
            (s) => withAsset(patch({ hand: [] })(s), code, { uses: 1 }),
            spawnAt('A', { ...ghoul, health: 12 }, 'a'),
          )
          s = choose(s, 'ability.fightWith')
          expect(s.assets[code]!.uses).toBe(0)
          expect(availableAbilities(s, 'a').some((a) => a.label === 'ability.fightWith')).toBe(
            false,
          )
        })
      if (family === 'threshold')
        it.each([0, 1, 2])('requires a margin of two, including margin %s', (margin) => {
          let s = during(
            game(),
            (s) =>
              withAsset(
                patch({
                  hand: [],
                  skills: {
                    willpower: 3,
                    intellect: 3,
                    combat: 2 + margin - ('modifier' in entry ? entry.modifier : 0),
                    agility: 3,
                  },
                })(s),
                code,
              ),
            spawnAt('A', { ...ghoul, health: 12 }, 'a'),
          )
          s = choose(s, 'ability.fightWith')
          expect(Object.values(s.enemies)[0]!.damageTaken).toBe(margin >= 2 ? 2 : 1)
        })
      it('does not offer an attack on an unengaged aloof enemy', () => {
        const s = during(
          game(),
          (s) => withAsset(s, code),
          spawnAt('A', { ...ghoul, keywords: ['aloof'] }),
        )
        expect(availableAbilities(s, 'a').some((a) => a.label === 'ability.fightWith')).toBe(false)
      })
    }
    if (family === 'sneak')
      it('enforces its own exhaustion or engagement restriction', () => {
        const s = during(game(), (s) => s, spawnAt('A', { ...ghoul, health: 8 }, 'a'))
        expect(playerCardBehavior(code)!.canPlay!(s, 'a')).toBe(false)
      })
    if (family === 'draw')
      it('is restricted to the controller turn', () => {
        const s = { ...game(['a', 'b']), activeTurn: 'b' }
        expect(playerCardBehavior(code)!.canPlay!(s, 'a')).toBe(false)
      })
    if (family === 'medical')
      it('deals damage to the chosen investigator on failure', () => {
        let s = during(game(['a', 'b']), (s) =>
          withAsset(
            patch(
              { damage: 1 },
              'b',
            )(
              patch({ hand: [], skills: { willpower: 0, intellect: 0, combat: 0, agility: 0 } })(s),
            ),
            code,
          ),
        )
        s = choose(s, 'ability.equipmentMedical', { name: 'B' })
        expect(s.investigators[1]!.damage).toBe(2)
        expect(me(s).damage).toBe(0)
      })
    if (family === 'healing')
      it('retains an empty asset and excludes targets at other locations', () => {
        let s = during(game(['a', 'b']), (s) =>
          withAsset(patch({ damage: 2 }, 'b')(s), code, { uses: 1 }),
        )
        s = choose(s, 'ability.equipmentHeal', { name: 'B' })
        expect(s.assets[code]!.uses).toBe(0)
        expect(availableAbilities(s, 'a').some((a) => a.label === 'ability.equipmentHeal')).toBe(
          false,
        )
        s = during(s, (s) => withAsset(patch({ location: 'B' }, 'b')(s), code))
        expect(availableAbilities(s, 'a').some((a) => a.label === 'ability.equipmentHeal')).toBe(
          false,
        )
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
