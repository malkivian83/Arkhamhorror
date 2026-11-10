import { describe, expect, it } from 'vitest'
import { dispatch } from './engine'
import { choose, during, newTestGame } from './testing'
import type { ChaosToken, GameState, Message } from './types'

// RR Skill Tests ST.3–ST.8 and bless/curse tokens: reactions to revealed tokens may cancel a
// token (back to the token pool), ignore resolved modifiers, keep pool tokens in the bag after
// the test, or remove a committed card; Lucky Penny flips a coin.
const effectTest: Message = {
  type: 'BeginSkillTest',
  investigator: 'a',
  skill: 'willpower',
  difficulty: 2,
  kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
}
const withBag = (s: GameState, ...bag: ChaosToken[]) => ({ ...s, chaosBag: bag })
const begin = (...bag: ChaosToken[]) =>
  choose(
    withBag(
      during({ ...newTestGame(), interactive: true }, (s) => s, effectTest),
      ...bag,
    ),
    'choice.revealToken',
  )
const apply = (s: GameState) => choose(s, 'choice.applyResults')
/** Resolve only these messages on a test in progress (its results are left pending). */
const send = (s: GameState, ...messages: Message[]): GameState => {
  const next = dispatch({ ...s, pending: null, queue: [] }, ...messages)
  return { ...next, pending: s.pending, queue: s.queue }
}

describe('Reacciones a fichas reveladas', () => {
  it('ignora los modificadores de las fichas resueltas y puede devolverlas a la bolsa', () => {
    let s = begin('curse', 'curse')
    expect(s.skillTest?.tokenModifier).toBe(-4)
    s = send(s, { type: 'IgnoreRevealedTokenModifiers', token: 'curse', count: 1 })
    expect(s.skillTest?.tokenModifier).toBe(-2)
    // An ignored modifier is not ignored twice.
    s = send(s, { type: 'IgnoreRevealedTokenModifiers', token: 'curse' })
    s = send(s, { type: 'IgnoreRevealedTokenModifiers', token: 'curse' })
    expect(s.skillTest?.tokenModifier).toBe(0)
    let b = begin('bless', 'bless')
    b = send(b, {
      type: 'IgnoreRevealedTokenModifiers',
      token: 'bless',
      returnToBag: true,
    })
    expect(b.skillTest?.tokens).toEqual([])
    expect(b.chaosBag).toEqual(['bless', 'bless'])
    // The test still resolves without tokens.
    expect(apply(b).skillTest).toBeNull()
  })

  it('las fichas marcadas vuelven a la bolsa en lugar de a la reserva', () => {
    let s = begin('curse', 'bless')
    s = send(s, { type: 'ReturnTokensToBagAfterTest', tokens: ['curse'] })
    s = apply(s)
    expect(s.chaosBag).toEqual(['curse'])
  })

  it('retira de la prueba una carta comprometida, exiliada o fuera de la partida', () => {
    let s = begin(0)
    s = {
      ...s,
      skillTest: { ...s.skillTest!, committed: [{ code: 'x', by: 'a' }] },
    }
    s = send(s, {
      type: 'RemoveCommittedCard',
      investigator: 'a',
      code: 'x',
      exile: true,
    })
    expect(s.skillTest?.committed).toEqual([])
    expect(s.exiled).toContainEqual({ investigator: 'a', code: 'x' })
  })

  it('lanza una moneda: cara o cruz', () => {
    const results = new Set<string>()
    for (let rng = 1; rng < 20; rng++) {
      const s = during({ ...newTestGame(), rng }, (x) => x, {
        type: 'FlipCoin',
        investigator: 'a',
        heads: [{ type: 'GainResources', investigator: 'a', amount: 1 }],
        tails: [],
      })
      const heads = s.log.some((l) => l.key === 'log.coinHeads')
      expect(s.investigators[0]!.resources).toBe(
        newTestGame().investigators[0]!.resources + (heads ? 1 : 0),
      )
      results.add(heads ? 'heads' : 'tails')
    }
    expect(results.size).toBe(2)
  })

  it('busca una ficha en la bolsa y la revela; cancela una maldición hacia la reserva', () => {
    let s = withBag(begin(0), 'skull', 1)
    s = send(s, { type: 'RevealChaosToken', token: 'skull', search: true })
    expect(s.skillTest?.tokens).toEqual([0, 'skull'])
    expect(s.chaosBag).toEqual([1])
    const held = (x: GameState, token: ChaosToken): GameState => ({
      ...x,
      skillTest: { ...x.skillTest!, revealing: { token, face: token, fromBag: true } },
    })
    const canceled = send(held(begin(0), 'curse'), {
      type: 'CancelRevealedToken',
      toPool: true,
    })
    expect(canceled.skillTest?.revealing).toBeUndefined()
    expect(canceled.chaosBag).toEqual([])
  })

  it('sustituye el modificador de la ficha retenida o evita revelar otra', () => {
    const held = (x: GameState, token: ChaosToken): GameState => ({
      ...x,
      chaosBag: [1],
      skillTest: { ...x.skillTest!, revealing: { token, face: token, fromBag: true } },
    })
    let s = send(held(begin(0), 'curse'), {
      type: 'ReplaceRevealedTokenEffect',
      modifier: 1,
      noRevealAnother: true,
    })
    s = send(s, { type: 'RevealChaosToken', pending: true, afterWindow: true })
    expect(s.skillTest?.tokens).toEqual([0, 'curse'])
    expect(s.skillTest?.tokenModifier).toBe(1)
    expect(s.chaosBag).toEqual([1])
  })
})
