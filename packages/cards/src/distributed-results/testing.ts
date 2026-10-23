// RR: Skill Test Results, Committing Cards, Uses, Automatic Evasion.
import {
  allPlayerCardDefs,
  dispatch,
  playerCardBehavior,
  playerCardDef,
  type GameState,
  type SkillTestKind,
} from '@lcg/engine'
import { chooseWithConsent as choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, patch, withAsset } from '../dunwich-pilot/testing'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard, starterDeckList, validateDeck } from '../decks'

const charge = () =>
  allPlayerCardDefs().find((d) => ['charge', 'charges'].includes(d.uses?.type ?? ''))!
const secret = () =>
  allPlayerCardDefs().find((d) => ['secret', 'secrets'].includes(d.uses?.type ?? ''))!

export function fixture(): GameState {
  let s = withAsset(game(['a', 'b', 'c']), charge().code, { id: 'charge', owner: 'a', uses: 0 })
  s = withAsset(s, secret().code, { id: 'secret', owner: 'b', uses: 0 })
  s = withAsset(patch({ location: 'B' }, 'c')(s), charge().code, {
    id: 'remote',
    owner: 'c',
    uses: 0,
  })
  return during(
    s,
    (s) => s,
    spawnAt('A', { ...ghoul, health: 10 }, 'a'),
    spawnAt('A', { ...ghoul, name: 'Other' }, 'b'),
  )
}

export const effect = (s: GameState, code: string, remaining = 3) =>
  dispatch(
    { ...s, pending: null, queue: [] },
    { type: 'PlayerCardEffect', code, investigator: 'a', step: 'uses', data: { remaining } },
  )

export function verifyDistributedResult(code: string): void {
  const uses = code === '11077'
  const def = playerCardDef(code)!
  const open = (success: boolean, by: string, relevant = true) => {
    const s = fixture()
    const enemy = Object.keys(s.enemies)[0]!
    const kind: SkillTestKind = relevant
      ? uses
        ? { type: 'investigate', location: 'A' }
        : { type: 'evade', enemy }
      : { type: 'effect', source: 'other', onSuccess: [], onFail: [], onFailEach: [] }
    return during(s, patch({ hand: [code] }, by), {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: uses ? 'intellect' : 'agility',
      difficulty: success ? 1 : 99,
      kind,
    })
  }
  describe(code + ' / distributed result', () => {
    for (const by of ['a', 'b'])
      it('resolves a real successful test committed by ' + by, () => {
        let s = choose(open(true, by), by === 'a' ? 'choice.commit' : 'choice.commitFrom', {
          card: def.name,
        })
        if (uses) {
          for (let n = 0; n < 3; n++) s = choose(s, 'choice.resultUses', { card: charge().name })
          expect(s.assets.charge!.uses).toBe(3)
          expect(s.assets.secret!.uses).toBe(0)
        } else {
          s = choose(s, 'choice.distributedEvade', { enemy: 'Other' })
          expect(Object.values(s.enemies).every((e) => e.exhausted && e.engagedWith === null)).toBe(
            true,
          )
        }
        expect(s.skillTest).toBeNull()
      })
    for (const relevant of [true, false])
      it('does not offer an effect for ' + (relevant ? 'failure' : 'another action'), () => {
        const s = choose(open(!relevant, 'a', relevant), 'choice.commit', { card: def.name })
        expect(
          s.pending?.question.choices.some((c) =>
            ['choice.resultUses', 'choice.distributedEvade'].includes(c.label),
          ),
        ).toBe(false)
        expect(s.assets.charge!.uses).toBe(0)
        expect(Object.values(s.enemies)[1]!.exhausted).toBe(false)
      })
    it('can decline the optional result entirely', () => {
      const s = choose(choose(open(true, 'a'), 'choice.commit'), 'choice.skip')
      expect(s.assets.charge!.uses).toBe(0)
      expect(Object.values(s.enemies)[1]!.exhausted).toBe(false)
      expect(s.skillTest).toBeNull()
    })
    it('enters a legal deck or experience purchase and starts a scenario', () => {
      const investigator = uses ? 'dexter' : 'trish'
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
    if (uses)
      it('enforces one committed copy per test', () => {
        const s = open(true, 'a')
        const next = dispatch(
          { ...patch({ hand: [code, code] })(s), pending: null, queue: [] },
          { type: 'CommitCard', investigator: 'a', code },
          { type: 'CommitCard', investigator: 'a', code },
        )
        expect(next.skillTest!.committed).toHaveLength(1)
      })
    it('has a reviewed behavior', () =>
      expect(playerCardBehavior(code)?.afterCommittedTest).toBeDefined())
  })
}
