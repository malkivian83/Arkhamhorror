import { dispatch, playerCardDef, type GameState } from '@lcg/engine'
import { chooseWithConsent as choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, patch } from '../dunwich-pilot/testing'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard } from '../decks'

function open(code: string, by = 'a', difficulty = 1): GameState {
  const s = during(
    game(['a', 'b']),
    patch({ hand: [code] }, by),
    spawnAt('A', { ...ghoul, health: 10 }, 'a'),
    spawnAt('A', { ...ghoul, name: 'Other', health: 10 }, 'a'),
  )
  return during(s, (s) => s, {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'agility',
    difficulty,
    kind: { type: 'evade', enemy: Object.keys(s.enemies)[0]! },
  })
}
const commit = (s: GameState, code: string, by: string) =>
  choose(s, by === 'a' ? 'choice.commit' : 'choice.commitFrom', { card: playerCardDef(code)!.name })
export function verifyMovement(code: string): void {
  describe(code + ' movement', () => {
    for (const by of ['a', 'b'])
      it('resolves a committed card with actor and committer ' + by, () => {
        let s = commit(open(code, by), code, by)
        if (code !== '60317') {
          s = choose(s, code === '01081' ? 'choice.survivalDisengage' : 'choice.survivalEvade')
          expect(Object.values(s.enemies)[1]!.engagedWith).toBeNull()
          expect(Object.values(s.enemies)[1]!.exhausted).toBe(code === '02235')
        }
        expect(s.pending!.investigator).toBe(code === '60317' ? by : 'a')
        s = choose(JSON.parse(JSON.stringify(s)) as GameState, 'choice.pilotMove', {
          location: 'Room B',
        })
        expect(s.investigators.find((i) => i.id === (code === '60317' ? by : 'a'))!.location).toBe(
          'B',
        )
        if (code === '60317') {
          expect(s.skillTest).toBeNull()
          expect(s.investigators.find((i) => i.id === by)!.discard).toContain(code)
          s = choose(s, 'choice.skip')
        }
        expect(s.skillTest).toBeNull()
      })
    it('does not offer movement after failure', () => {
      const s = commit(open(code, 'a', 99), code, 'a')
      expect(s.pending?.question.choices.some((c) => c.label === 'choice.pilotMove')).toBe(false)
    })
    it('can decline movement and enemy effects independently', () => {
      let s = commit(open(code), code, 'a')
      s = choose(s, 'choice.skip')
      if (code !== '60317') s = choose(s, 'choice.skip')
      expect(s.investigators[0]!.location).toBe('A')
      expect(Object.values(s.enemies)[1]!.exhausted).toBe(false)
    })
    it('enters the shop and a real scenario deck without duplicate entries', () => {
      let c = newCampaign('brethren-of-ash', [code === '60317' ? 'trish' : 'isabelle'], 'easy')
      const id = c.investigators[0]!.id
      c.log.investigators[id]!.xp = Math.max(1, playerCardDef(code)!.xp ?? 0)
      const options = purchaseOptions(c, id).filter((o) => o.code === code)
      expect(options).toHaveLength(1)
      c = purchase(c, id, code, { remove: c.investigators[0]!.deck.find(isStandard)! })
      const i = startScenario(c, 3, false).investigators[0]!
      expect([...i.hand, ...i.deck, ...i.discard]).toContain(code)
    })
  })
}
export function movement(s: GameState, code: string, remaining: number): GameState {
  return dispatch(
    { ...s, pending: null, queue: [] },
    {
      type: 'PlayerCardEffect',
      code,
      investigator: 'a',
      step: 'move',
      data: { remaining },
    },
  )
}
