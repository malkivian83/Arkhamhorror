// RR: Setup, Free Triggered Abilities, Limits, Elder Sign.
import { dispatch, investigatorBehavior } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { patch, withAsset } from '../dunwich-pilot/testing'
import { clear, duke, makeGame, PETE } from './testing'

it('starts every game with Duke out of the deck, before drawing five cards', () => {
  const s = makeGame()
  const i = s.investigators[0]!
  expect(duke(s).owner).toBe(PETE)
  expect(duke(s).exhausted).toBe(false)
  expect(i.hand).toHaveLength(5)
  expect([...i.hand, ...i.deck, ...i.discard]).not.toContain('02014')
  expect(i.resources).toBe(5)
  expect(i.skills).toEqual({ willpower: 4, intellect: 2, combat: 2, agility: 3 })
})

it('pays one card and readies a controlled asset, once per round', () => {
  let s = makeGame()
  const id = duke(s).id
  s = during(s, patch({ hand: ['12089', '12102'] }, PETE), { type: 'ExhaustAsset', asset: id })
  const before = s.investigators[0]!.actionsRemaining
  s = choose(s, 'ability.peteReady')
  expect(s.pending!.question.choices.map((c) => c.params?.card)).not.toContain('Paranoia')
  s = choose(s, 'choice.discard', { card: 'Emergency Cache' })
  s = choose(s, 'choice.peteReadyAsset')
  expect(duke(s).exhausted).toBe(false)
  expect(s.investigators[0]!.discard).toContain('12089')
  expect(s.investigators[0]!.hand).toEqual(['12102'])
  expect(s.investigators[0]!.actionsRemaining).toBe(before)
  s = during(s, patch({ hand: ['12089'] }, PETE), { type: 'ExhaustAsset', asset: id })
  expect(s.pending!.question.choices.some((c) => c.label === 'ability.peteReady')).toBe(false)
  const nextRound = dispatch(
    { ...clear(s), round: s.round + 1 },
    { type: 'PlayerWindow', investigator: PETE },
  )
  expect(nextRound.pending!.question.choices.some((c) => c.label === 'ability.peteReady')).toBe(
    true,
  )
})

it('cannot pay with weaknesses or ready another investigator asset', () => {
  let s = makeGame()
  const i = s.investigators[0]!
  s = patch({ hand: ['12102'] }, PETE)(s)
  s = withAsset(s, '01087', { id: 'foreign', owner: 'b', exhausted: true })
  expect(investigatorBehavior(PETE)!.fastOptions!(s, { ...i, hand: ['12102'] })).toHaveLength(0)
  s = patch({ hand: ['12089'] }, PETE)(s)
  expect(investigatorBehavior(PETE)!.fastOptions!(s, s.investigators[0]!)).toHaveLength(0)
})

it('offers Pete in a skill test and at the enemy player window', () => {
  let s = makeGame()
  s = patch({ hand: ['12089'] }, PETE)(s)
  s = dispatch(
    clear(s),
    { type: 'ExhaustAsset', asset: duke(s).id },
    {
      type: 'BeginSkillTest',
      investigator: PETE,
      skill: 'willpower',
      difficulty: 2,
      kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
    },
  )
  expect(s.pending!.question.choices.some((c) => c.label === 'ability.peteReady')).toBe(true)
  s = dispatch(clear(s), { type: 'Step', step: 'enemyBegins' })
  expect(s.pending!.question.prompt).toBe('prompt.investigatorFast')
})

it('elder sign readies Duke without discarding or spending the round limit', () => {
  let s = makeGame()
  s = dispatch(clear(s), { type: 'ExhaustAsset', asset: duke(s).id })
  const effect = investigatorBehavior(PETE)!.elderSign!(s, s.investigators[0]!)
  expect(effect.modifier).toBe(2)
  // Token effects are resolved at revelation, before the rest of the test.
  s = dispatch(s, ...(effect.immediate ?? []))
  expect(duke(s).exhausted).toBe(false)
  expect(s.abilityUses).toHaveLength(0)
})
