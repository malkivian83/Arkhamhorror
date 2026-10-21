import {
  dispatch,
  playerCardDef,
  skillTestValue,
  type GameState,
  type Message,
  type SkillType,
} from '@lcg/engine'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard, starterDeckList, validateDeck } from '../decks'
import approvals from './approvals.json'

export function verifyContextSkill(code: string): void {
  const family = approvals.cards.find((c) => c.code === code)!.family
  const def = playerCardDef(code)!
  const skill: SkillType = family.startsWith('door')
    ? 'agility'
    : ['armed', 'engaged', 'marksman'].includes(family)
      ? 'combat'
      : 'willpower'
  const begin = (success = true): Message => ({
    type: 'BeginSkillTest',
    investigator: 'a',
    skill,
    difficulty: success ? 1 : 99,
    source: 'context-source',
    kind: { type: 'effect', source: 'context-test', onSuccess: [], onFail: [], onFailEach: [] },
  })
  const setup = (s: GameState, by = 'a') =>
    withAsset(
      patch(
        { hand: [code], damage: 2, resources: 0, discard: ['01072', '01075', '03039'] },
        by,
      )(patch({ hand: [], damage: 2, resources: 0 })(patch({ hand: [] }, 'b')(s))),
      '60171',
      { id: 'context-source', owner: by },
    )
  const open = (success = true, by = 'a') =>
    during(
      game(['a', 'b']),
      (s) => setup(s, by),
      ...(family === 'engaged' ? [spawnAt('A', ghoul, by)] : []),
      begin(success),
    )
  const commit = (s: GameState, by = 'a') =>
    choose(s, by === 'a' ? 'choice.commit' : 'choice.commitFrom', { card: def.name })
  describe(code + ' / context and skill effects', () => {
    it('applies the printed effect on a successful test', () => {
      const s = open()
      if (['armed', 'street', 'engaged', 'marksman'].includes(family)) {
        const next = dispatch(
          { ...s, pending: null, queue: [] },
          { type: 'CommitCard', investigator: 'a', code },
        )
        const printed = (def.icons?.[skill] ?? 0) + (def.icons?.wild ?? 0)
        expect(skillTestValue(next).icons).toBe(
          printed + (family === 'armed' ? 2 : family === 'engaged' ? 1 : 0),
        )
      } else {
        let next = commit(s)
        if (family === 'recover')
          next = choose(next, 'choice.reactiveRecover', { card: playerCardDef('01072')!.name })
        expect(me(next).damage).toBe(family === 'blood' ? 3 : family === 'guidance' ? 1 : 2)
        expect(me(next).resources).toBe(family === 'door' ? 2 : family === 'door-upgrade' ? 4 : 0)
        if (family === 'recover') expect(me(next).hand).toContain('01072')
      }
    })
    it('checks the relevant investigator when helping another test', () => {
      const s = open(true, 'b')
      if (family === 'street') {
        expect(s.pending?.question.choices.some((c) => c.params?.card === def.name)).toBe(false)
        return
      }
      if (['armed', 'engaged', 'marksman'].includes(family)) {
        const next = dispatch(
          { ...s, pending: null, queue: [] },
          { type: 'CommitCard', investigator: 'b', code },
        )
        expect(next.skillTest!.committed).toContainEqual({ code, by: 'b' })
        return
      }
      let next = commit(s, 'b')
      if (family === 'recover')
        next = choose(next, 'choice.reactiveRecover', { card: playerCardDef('01072')!.name })
      expect(me(next).damage).toBe(family === 'guidance' ? 1 : 2)
      expect(next.investigators[1]!.damage).toBe(family === 'blood' ? 3 : 2)
      expect(me(next).resources).toBe(family === 'door' ? 2 : family === 'door-upgrade' ? 4 : 0)
      expect(next.investigators[1]!.resources).toBe(0)
      if (family === 'recover') expect(next.investigators[1]!.hand).toContain('01072')
    })
    if (!['armed', 'street', 'engaged', 'marksman'].includes(family))
      it('does not grant the success effect after failure', () => {
        const next = commit(open(false))
        expect(me(next).damage).toBe(2)
        expect(me(next).resources).toBe(0)
        expect(me(next).discard).toContain('01072')
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
