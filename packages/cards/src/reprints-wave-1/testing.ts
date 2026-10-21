import { playerCardDef } from '@lcg/engine'
import { choose, during, spawnAt, ghoul } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard, starterDeckList, validateDeck } from '../decks'
import { game, hand, me, patch, withAsset } from '../dunwich-pilot/testing'

export function verifyReprint(code: string, source: string): void {
  describe(code + ' / ' + source, () => {
    it('resolves the reviewed effect using this printing’s own code', () => {
      const definition = playerCardDef(code)!
      if (
        ['12025', '12039', '02150', '12090', '12091', '12092', '12093', '12094'].includes(source)
      ) {
        const skill =
          source === '12090'
            ? 'willpower'
            : source === '12091'
              ? 'agility'
              : source === '12092' || source === '12025'
                ? 'combat'
                : 'intellect'
        let s = during(
          game(),
          (s) => ({
            ...patch({ hand: [code] })(s),
            locations: {
              ...s.locations,
              A: { ...s.locations.A!, clues: 8, shroud: source === '12094' ? 4 : 2 },
            },
          }),
          ...(source === '12025' ? [spawnAt('A', { ...ghoul, health: 8 }, 'a')] : []),
        )
        if (source === '12025') s = choose(s, 'action.fight')
        else if (['12039', '02150', '12094'].includes(source)) s = choose(s, 'action.investigate')
        else
          s = during(s, (s) => s, {
            type: 'BeginSkillTest',
            investigator: 'a',
            skill,
            difficulty: 4,
            kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
          })
        s = choose(s, 'choice.commit', { card: definition.name })
        expect(me(s).discard).toContain(code)
        if (source === '12025') expect(Object.values(s.enemies)[0]!.damageTaken).toBe(2)
        else if (['12039', '02150', '12094'].includes(source))
          expect(me(s).clues).toBe(source === '12039' ? 2 : source === '02150' ? 3 : 1)
        else expect(me(s).hand).toHaveLength(1)
      } else if (source === '02029') {
        let s = during(game(), (s) => ({ ...withAsset(s, code), chaosBag: ['skull'] }))
        s = choose(s, 'action.investigate')
        s = choose(s, 'ability.pilotCandle')
        expect(me(s).clues).toBe(1)
        expect(s.assets[code]!.code).toBe(code)
      } else {
        let s = hand(game(), code)
        s = choose(s, definition.fast ? 'action.playFast' : 'action.play', {
          card: definition.name,
        })
        if (source === '02020') {
          s = choose(s, 'ability.drawCards')
          expect(me(s).hand).toHaveLength(2)
          expect(Object.values(s.assets)[0]!.code).toBe(code)
        } else if (source === '12034') {
          expect(me(s).actionsRemaining).toBe(3)
          s = during(s, (s) => ({
            ...s,
            locations: { ...s.locations, A: { ...s.locations.A!, shroud: 4 } },
          }))
          s = choose(s, 'action.investigate')
          expect(me(s).clues).toBe(1)
        } else {
          expect(me(s).discard).toContain(code)
          if (source === '12038') {
            expect(me(s).clues).toBe(1)
            expect(me(s).actionsRemaining).toBe(3)
          } else if (source === '02186') expect(me(s).hand).toHaveLength(3)
          else {
            expect(me(s).resources).toBe(13)
            expect(me(s).hand).toHaveLength(source === '02194' ? 1 : 0)
          }
        }
      }
    })
    if (playerCardDef(code)!.type === 'skill')
      it('discards this printing without success benefits on an automatic failure', () => {
        const def = playerCardDef(code)!,
          skill = Object.keys(def.icons ?? {}).find((k) => k !== 'wild') ?? 'intellect'
        let s = during(game(), (s) => ({ ...patch({ hand: [code] })(s), chaosBag: ['autoFail'] }), {
          type: 'BeginSkillTest',
          investigator: 'a',
          skill: skill as 'willpower' | 'intellect' | 'combat' | 'agility',
          difficulty: 2,
          kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
        })
        s = choose(s, 'choice.commit')
        expect(me(s).hand).toHaveLength(0)
        expect(me(s).clues).toBe(0)
        expect(me(s).discard).toContain(code)
      })
    it('is available in a legal deck or an experience purchase and survives scenario setup', () => {
      const def = playerCardDef(code)!,
        investigator =
          def.class === 'guardian' ? 'daniela' : def.class === 'mystic' ? 'dexter' : 'joe'
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
        const deck = starterDeckList(investigator, 'reprint', 'Reprint')
        const sameTitle = deck.cards.findIndex((c) => playerCardDef(c)?.name === def.name)
        deck.cards.splice(sameTitle >= 0 ? sameTitle : deck.cards.findIndex(isStandard), 1, code)
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
