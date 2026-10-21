import { dispatch, playerCardDef, skillTestValue, type GameState, type Message } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch } from '../dunwich-pilot/testing'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard, starterDeckList, validateDeck } from '../decks'
import approvals from './approvals.json'

export function verifyConditionalCommit(code: string): void {
  const family = approvals.cards.find((c) => c.code === code)!.family
  const def = playerCardDef(code)!
  const skill = (
    Object.keys(def.icons!)[0] === 'wild' ? 'willpower' : Object.keys(def.icons!)[0]
  ) as 'willpower'
  const begin = (difficulty = 5): Message => ({
    type: 'BeginSkillTest',
    investigator: 'a',
    skill,
    difficulty,
    kind: { type: 'effect', source: 'conditional-test', onSuccess: [], onFail: [], onFailEach: [] },
  })
  const allowed = (s: GameState): GameState => patch({ hand: [code], horror: 5 })(s)
  const offers = (s: GameState) =>
    s.pending?.question.choices.some((c) => c.params?.card === def.name) ?? false
  describe(code + ' / conditional commitment', () => {
    it('offers and consumes a legal card, contributing its printed icons', () => {
      let s = during(game(), allowed, begin())
      expect(offers(s)).toBe(true)
      const committed = dispatch(
        { ...s, pending: null, queue: [] },
        { type: 'CommitCard', investigator: 'a', code },
      )
      expect(skillTestValue(committed).icons).toBe(family === 'desperate' ? 4 : 3)
      s = choose(s, 'choice.commit', { card: def.name })
      expect(me(s).discard).toContain(code)
      expect(me(s).hand).not.toContain(code)
    })
    it('rejects the card outside its printed condition, including direct commitment', () => {
      const forbidden = (s: GameState) => {
        s = allowed(s)
        if (family === 'desperate') return patch({ horror: 4 })(s)
        if (family === 'clue')
          return { ...s, locations: { ...s.locations, A: { ...s.locations.A!, clues: 0 } } }
        return s
      }
      const s = during(game(), forbidden, begin(family === 'rise' ? 4 : 5))
      expect(offers(s)).toBe(false)
      const open = during(game(), allowed, begin())
      const rejected = dispatch(
        {
          ...forbidden(open),
          pending: null,
          queue: [],
          skillTest: { ...open.skillTest!, difficulty: family === 'rise' ? 4 : 5 },
        },
        { type: 'CommitCard', investigator: 'a', code },
      )
      expect(me(rejected).hand).toContain(code)
      expect(me(rejected).discard).not.toContain(code)
      const fromDiscard = dispatch(
        patch({ hand: [], discard: [code] })({
          ...forbidden(open),
          pending: null,
          queue: [],
          skillTest: rejected.skillTest,
        }),
        { type: 'CommitCard', investigator: 'a', code, from: 'discard' },
      )
      expect(me(fromDiscard).discard).toContain(code)
      expect(fromDiscard.skillTest!.committed).toEqual([])
    })
    if (family === 'desperate')
      it('enforces the single-copy limit across both investigators', () => {
        const s = during(
          game(['a', 'b']),
          (s) => patch({ hand: [code], horror: 5 }, 'b')(allowed(s)),
          begin(),
        )
        const one = dispatch(
          { ...s, pending: null, queue: [] },
          { type: 'CommitCard', investigator: 'a', code },
        )
        const two = dispatch(one, { type: 'CommitCard', investigator: 'b', code })
        expect(two.skillTest!.committed).toHaveLength(1)
        expect(two.investigators[1]!.hand).toContain(code)
      })
    if (family === 'rise')
      it('compares difficulty with base skill, ignoring temporary bonuses', () => {
        const s = during(game(), allowed, { ...begin(), modifier: 10 } as Message)
        expect(offers(s)).toBe(true)
      })
    it('checks the committing investigator when helping another investigator', () => {
      let s = during(
        game(['a', 'b']),
        (s) => patch({ hand: [code], horror: 5 }, 'b')(patch({ hand: [] })(s)),
        begin(),
      )
      expect(offers(s)).toBe(family !== 'rise')
      if (family !== 'rise') {
        s = choose(s, 'choice.commitFrom', { card: def.name })
        expect(s.investigators[1]!.discard).toContain(code)
      }
    })
    it('enters a legal deck and survives actual scenario setup', () => {
      const investigator = def.class === 'seeker' ? 'joe' : 'isabelle'
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
