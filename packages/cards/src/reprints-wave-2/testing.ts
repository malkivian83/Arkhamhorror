import {
  availableAbilities,
  createGame,
  playerCardDef,
  registerTreachery,
  slotCapacity,
} from '@lcg/engine'
import { choose, during, spawnAt, ghoul, testScenario, testInvestigator } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { starterDeckList, validateDeck, isStandard } from '../decks'
import { game, hand, me, patch, play, withAsset } from '../dunwich-pilot/testing'
const treachery = {
  kind: 'treachery' as const,
  code: 'reprint-revelation',
  name: 'Synthetic encounter',
  keywords: [],
}
registerTreachery({
  code: treachery.code,
  revelation: (_s, investigator) => [{ type: 'TakeDamage', investigator, damage: 2, horror: 0 }],
})
const permanents = new Set(['12042', '12056', '12095', '12096'])
export function verifyReprint(code: string, source: string): void {
  describe(code + ' / ' + source, () => {
    it('resolves the reviewed effect using this printing and its uses', () => {
      const def = playerCardDef(code)!
      if (permanents.has(source)) {
        let s = createGame({
          seed: 3,
          scenario: testScenario(),
          investigators: [
            testInvestigator('a', {
              deck: [code, ...Array.from({ length: 20 }, (_, n) => 'filler-' + n)],
            }),
          ],
        })
        expect(Object.values(s.assets).some((a) => a.code === code)).toBe(true)
        expect([...me(s).deck, ...me(s).hand]).not.toContain(code)
        expect(me(s).hand).toHaveLength(source === '12042' ? 6 : 5)
        expect(me(s).resources).toBe(source === '12056' ? 7 : 5)
        if (source === '12095') expect(slotCapacity(s, 'a', 'ally')).toBe(2)
        if (source === '12096') expect(slotCapacity(s, 'a', 'accessory')).toBe(2)
        const a = Object.values(s.assets).find((a) => a.code === code)!
        s = during(s, (s) => s, { type: 'DiscardAsset', asset: a.id })
        expect(s.assets[a.id]).toBeDefined()
      } else if (['12019', '12020', '12059'].includes(source)) {
        let s = during(
          game(),
          (s) => withAsset(patch({ hand: [] })(s), code),
          spawnAt('A', { ...ghoul, health: 8 }, 'a'),
        )
        s = choose(s, 'ability.fightWith', { card: def.name })
        if (source === '12059') s = choose(s, 'choice.spendChargeForDamage')
        expect(Object.values(s.enemies)[0]!.damageTaken).toBe(2)
        expect(s.assets[code]!.uses).toBe(source === '12019' ? 3 : source === '12059' ? 2 : 0)
      } else if (['12031', '12049', '12062'].includes(source)) {
        let s = during(game(), (s) => withAsset(patch({ hand: [] })(s), code))
        s = choose(s, 'ability.investigateWith', { card: def.name })
        if (source === '12062') s = choose(s, 'choice.spendChargeForClue')
        expect(me(s).clues).toBe(source === '12049' ? 1 : 2)
        expect(s.assets[code]!.uses).toBe(source === '12049' ? 5 : 2)
        if (source === '12031') expect(s.assets[code]!.exhausted).toBe(true)
        if (source === '12049') expect(me(s).resources).toBe(6)
      } else if (source === '12044') {
        let s = during(game(), (s) => ({
          ...withAsset(patch({ hand: [] })(s), code),
          locations: { ...s.locations, A: { ...s.locations.A!, shroud: 1 } },
        }))
        s = choose(s, 'action.investigate')
        s = choose(s, 'ability.drawCards')
        expect(me(s).hand).toHaveLength(1)
        expect(s.assets[code]!.exhausted).toBe(true)
      } else if (source === '12073') {
        let s = during(game(), (s) => withAsset(s, code), {
          type: 'TakeDamage',
          investigator: 'a',
          damage: 1,
          horror: 0,
        })
        s = choose(s, 'ability.bandages')
        expect(me(s).damage).toBe(0)
        expect(s.assets[code]!.uses).toBe(2)
      } else if (source === '12024') {
        let s = during(game(), (s) => s, spawnAt('A', { ...ghoul, health: 8 }, 'a'))
        s = play(s, code)
        expect(me(s).clues).toBe(2)
        expect(me(s).damage).toBe(0)
        expect(me(s).discard).toContain(code)
      } else if (source === '12050') {
        let s = during(game(), (s) => s, spawnAt('A', { ...ghoul, health: 8 }, 'a'))
        s = play(s, code)
        if (s.pending?.question.prompt === 'prompt.autoEvade') s = choose(s, 'choice.enemy')
        expect(me(s).clues).toBe(1)
        expect(me(s).damage).toBe(0)
        expect(Object.values(s.enemies)[0]!.exhausted).toBe(true)
      } else if (source === '12064') {
        let s = choose(hand(game(), code), 'action.playFast', { card: def.name })
        expect(s.sealed?.[0]?.code).toBe(code)
        expect(me(s).discard).not.toContain(code)
        s = choose(JSON.parse(JSON.stringify(s)), 'action.investigate')
        expect(me(s).discard).toContain(code)
        expect(me(s).discard).not.toContain(source)
        expect(s.sealed ?? []).toHaveLength(0)
      } else if (source === '12065') {
        let s = during(hand(game(), code), (s) => ({ ...s, encounterDeck: [treachery] }), {
          type: 'DrawEncounterCard',
          investigator: 'a',
        })
        s = choose(s, 'ability.playCard', { card: def.name })
        expect(me(s).horror).toBe(1)
        expect(me(s).damage).toBe(0)
        expect(me(s).discard).toContain(code)
        expect(me(s).discard).not.toContain(source)
      } else if (source === '12078') {
        let s = during(hand(game(), code), (s) => ({
          ...s,
          locations: { ...s.locations, A: { ...s.locations.A!, shroud: 4, clues: 4 } },
        }))
        s = choose(s, 'action.investigate')
        if (s.pending?.question.prompt === 'prompt.commitCards') s = choose(s, 'choice.revealToken')
        s = choose(s, 'ability.playCard', { card: def.name })
        expect(me(s).clues).toBe(2)
        expect(me(s).discard).toContain(code)
        expect(me(s).discard).not.toContain(source)
      } else if (source === '02113') {
        let s = during(
          hand(game(), code),
          patch({ skills: { willpower: 3, intellect: 3, combat: 1, agility: 3 } }),
          spawnAt('A', { ...ghoul, name: 'Original', health: 8 }, 'a'),
          spawnAt('A', { ...ghoul, name: 'Other', health: 8 }, 'a'),
        )
        s = choose(s, 'action.fight', { enemy: 'Original' })
        if (s.pending?.question.prompt === 'prompt.commitCards') s = choose(s, 'choice.revealToken')
        s = choose(s, 'ability.playCard', { card: def.name })
        expect(Object.values(s.enemies).find((e) => e.name === 'Other')!.damageTaken).toBe(1)
        expect(me(s).discard).toContain(code)
        expect(me(s).discard).not.toContain(source)
      } else throw new Error('Missing reprint test: ' + code)
    })
    if (['12019', '12031', '12049'].includes(source))
      it('cannot activate an empty use pool', () => {
        const s = during(game(), (s) => withAsset(s, code, { uses: 0 }), spawnAt('A', ghoul, 'a'))
        expect(
          availableAbilities(s, 'a').filter((a) =>
            ['ability.fightWith', 'ability.investigateWith'].includes(a.label),
          ),
        ).toHaveLength(0)
      })
    if (['12059', '12062'].includes(source))
      it('resolves the symbol penalty with an empty charge pool', () => {
        let s = during(
          game(),
          (s) => ({
            ...withAsset(patch({ hand: [] })(s), code, { uses: 0 }),
            chaosBag: [source === '12059' ? 'skull' : 'cultist'],
          }),
          ...(source === '12059' ? [spawnAt('A', { ...ghoul, health: 8 }, 'a')] : []),
        )
        s = choose(s, source === '12059' ? 'ability.fightWith' : 'ability.investigateWith')
        expect(s.assets[code]).toBeUndefined()
        expect(me(s).discard).toContain(code)
        expect(source === '12059' ? me(s).damage : me(s).horror).toBe(1)
      })
    if (source === '12073')
      it('discards this printing when spending its final supply', () => {
        let s = during(game(), (s) => withAsset(s, code, { uses: 1 }), {
          type: 'TakeDamage',
          investigator: 'a',
          damage: 1,
          horror: 0,
        })
        s = choose(s, 'ability.bandages')
        expect(s.assets[code]).toBeUndefined()
        expect(me(s).discard).toContain(code)
        expect(me(s).damage).toBe(0)
      })
    it('enters a legal deck or experience purchase and survives scenario setup', () => {
      const def = playerCardDef(code)!,
        investigator =
          def.class === 'guardian'
            ? 'daniela'
            : def.class === 'mystic'
              ? 'dexter'
              : def.class === 'rogue'
                ? 'trish'
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
        const deck = starterDeckList(investigator, 'reprint', 'Reprint'),
          sameTitle = deck.cards.findIndex((c) => playerCardDef(c)?.name === def.name)
        deck.cards.splice(sameTitle >= 0 ? sameTitle : deck.cards.findIndex(isStandard), 1, code)
        expect(validateDeck(deck).problems).toEqual([])
        campaign = newCampaign(
          'brethren-of-ash',
          [{ investigator: deck.investigator, cards: deck.cards }],
          'easy',
        )
      }
      const state = startScenario(campaign, 3, false),
        i = state.investigators[0]!
      expect([
        ...i.hand,
        ...i.deck,
        ...i.discard,
        ...Object.values(state.assets).map((a) => a.code),
      ]).toContain(code)
    })
  })
}
