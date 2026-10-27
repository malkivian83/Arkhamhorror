// RR: Triggered Abilities ("when" timing), Limits, Automatic Success, Additional Actions.
import { dispatch, playerCardDef } from '@lcg/engine'
import { choose, labels } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { newCampaign } from '../campaign'
import { clear, effectTest, makeGame, MATEO, mateo, succeeded, withMateo } from './testing'

it('starts with his statistics, his signatures and 5 bonus experience', () => {
  const i = mateo(makeGame())
  expect(i.skills).toEqual({ willpower: 4, intellect: 3, combat: 2, agility: 3 })
  expect([i.health, i.sanity]).toEqual([6, 8])
  expect(playerCardDef(MATEO)!.signatures).toEqual(['04013', '04014'])
  const c = newCampaign('night-of-the-zealot', ['mateo', 'daniela'], 'standard')
  expect(c.log.investigators[MATEO]!.xp).toBe(5)
  expect(c.log.investigators['12001']!.xp).toBe(0)
})

it("turns another investigator's [auto_fail] into their [elder_sign], once per game", () => {
  let s = withMateo(clear(makeGame(true, ['autoFail'])), { hand: [] })
  s = dispatch(s, effectTest(3, 'b'))
  expect(labels(s)).toContain('ability.mateo.elderSign')
  s = choose(s, 'ability.mateo.elderSign')
  expect(succeeded(s)).toBe('log.testSuccess')
  // Vuelve a la bolsa la ficha física, no la de signo arcano.
  expect(s.chaosBag).toEqual(['autoFail'])
  s = dispatch(s, effectTest(3, 'b'))
  expect(s.pending).toBeNull()
  expect(succeeded(s)).toBe('log.testFailure')
})

it('also applies to an [auto_fail] revealed outside a skill test (Premonition)', () => {
  let s = withMateo(clear(makeGame(false, ['autoFail'])), { hand: ['12064'], resources: 5 })
  s = dispatch(s, { type: 'PlayCard', investigator: MATEO, code: '12064' })
  expect(labels(s)).toContain('ability.mateo.elderSign')
  s = choose(s, 'ability.mateo.elderSign')
  expect(s.log.some((e) => e.key === 'log.tokenTreatedAs')).toBe(true)
  // Premonición sella la ficha física revelada.
  expect(s.sealed?.[0]?.token).toBe('autoFail')
})

it('the reaction may be declined', () => {
  let s = withMateo(clear(makeGame(true, ['autoFail'])), { hand: [] })
  s = dispatch(s, effectTest(3, 'b'))
  s = choose(s, 'choice.skip')
  expect(succeeded(s)).toBe('log.testFailure')
  s = dispatch(s, effectTest(3, 'b'))
  expect(labels(s)).toContain('ability.mateo.elderSign')
})

it('elder sign: automatic success, then an additional action during his turn', () => {
  let s = withMateo(clear(makeGame(false, ['elderSign'])), { hand: [] })
  const actions = mateo(s).actionsRemaining
  s = dispatch(s, effectTest(12))
  expect(succeeded(s)).toBe('log.testSuccess')
  expect(s.pending?.question.prompt).toBe('prompt.mateo.elderSign')
  s = choose(s, 'choice.mateo.action')
  expect(mateo(s).actionsRemaining).toBe(actions + 1)
})

it('elder sign: or draw 1 card and gain 1 resource (the only choice outside his turn)', () => {
  const base = withMateo(clear(makeGame(false, ['elderSign'])), { hand: [] })
  let s = choose(dispatch(base, effectTest(12)), 'choice.mateo.drawAndGain')
  expect([mateo(s).hand.length, mateo(s).resources]).toEqual([1, mateo(base).resources + 1])
  s = dispatch({ ...base, activeTurn: null }, effectTest(12))
  expect(s.pending).toBeNull()
  expect([mateo(s).hand.length, mateo(s).resources]).toEqual([1, mateo(base).resources + 1])
})
