// RR: Triggered Abilities ("when" timing), Costs, Limits, Chaos Bag, Automatic Success.
import { dispatch, playerCardDef } from '@lcg/engine'
import { choose, labels } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { clear, effectTest, makeGame, WENDY, wendy, withAmulet, withWendy } from './testing'

it('starts with her printed statistics and her signatures', () => {
  const i = wendy(makeGame())
  expect(i.skills).toEqual({ willpower: 4, intellect: 3, combat: 1, agility: 4 })
  expect([i.health, i.sanity]).toEqual([7, 7])
  expect(playerCardDef(WENDY)!.signatures).toEqual(['01014', '01015'])
})

it('discards a card to cancel the revealed token and reveal a new one, once per test', () => {
  let s = withWendy(clear(makeGame(false, [-5, 'autoFail'])), { hand: ['01088', '01089'] })
  // Sin cartas que comprometer: la mano entera se reserva para el coste.
  s = dispatch({ ...s, interactive: false }, { ...effectTest(9), skill: 'combat' })
  const first = s.pending!.question.choices.find((c) => c.label === 'ability.wendy.cancel')
  expect(first).toBeDefined()
  const revealed = first!.params!.token
  s = choose(s, 'ability.wendy.cancel')
  expect(s.pending!.question.prompt).toBe('prompt.chooseCardToDiscard')
  s = choose(s, 'choice.discard', { card: '01088' })
  // La nueva ficha no permite volver a usarla en esta prueba.
  expect(labels(s)).not.toContain('ability.wendy.cancel')
  while (s.pending) s = choose(s, labels(s).at(-1)!)
  expect(wendy(s).discard).toContain('01088')
  expect(s.log.some((e) => e.key === 'log.tokenCanceled' && e.params?.token === revealed)).toBe(
    true,
  )
  // Ninguna ficha se pierde ni se duplica.
  expect([...s.chaosBag].sort()).toEqual([-5, 'autoFail'].sort())
})

it('cannot pay the cost with an empty hand', () => {
  const s = dispatch(withWendy(clear(makeGame(false, [-5])), { hand: [] }), effectTest(9))
  expect(s.pending).toBeNull()
})

it('elder sign: +0, or an automatic success while her Amulet is in play', () => {
  const run = (s: ReturnType<typeof makeGame>, difficulty: number) =>
    dispatch(withWendy(clear(s), { hand: [] }), effectTest(difficulty)).log.some(
      (e) => e.key === 'log.testSuccess',
    )
  const base = makeGame(false, ['elderSign'])
  expect(run(base, 4)).toBe(true)
  expect(run(base, 5)).toBe(false)
  expect(run(withAmulet(clear(base)), 12)).toBe(true)
})

it('outside a skill test (Premonition), she may also cancel the revealed token once', () => {
  let s = withWendy(clear(makeGame(false, [-5, 'autoFail'])), {
    hand: ['12064', '01089', '01093'],
    resources: 5,
  })
  s = dispatch(s, { type: 'PlayCard', investigator: WENDY, code: '12064' })
  expect(labels(s)).toContain('ability.wendy.cancel')
  s = choose(s, 'ability.wendy.cancel')
  s = choose(s, 'choice.discard', { card: '01089' })
  // La nueva ficha no puede volver a cancelarse para el mismo efecto.
  expect(labels(s)).not.toContain('ability.wendy.cancel')
  while (s.pending) s = choose(s, labels(s).at(-1)!)
  expect(s.sealed).toHaveLength(1)
  expect([...s.chaosBag, s.sealed![0]!.token].sort()).toEqual([-5, 'autoFail'].sort())
  expect(wendy(s).discard).toContain('01089')
})
