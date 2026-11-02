// RR: Reveal, Draw, Heal, Weakness, Ownership and Control, Discard Pile.
import { expect, it } from 'vitest'
import { dispatch, playerCardBehavior, playerCardDef, type GameState } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { game, patch, me, withAsset } from '../dunwich-pilot/testing'
import './index'
const start = (players = ['a', 'b', 'c']) =>
  patch({ hand: [], deck: ['01088', '01089', '01090', '01091'], discard: [], horror: 3 })({
    ...game(players),
    pending: null,
    queue: [],
  })
const effect = (
  s: GameState,
  code: string,
  step = 'target',
  data: Record<string, string | number | boolean> = { remaining: JSON.stringify(['a']) },
) =>
  dispatch(
    { ...s, pending: null, queue: [] },
    { type: 'PlayerCardEffect', code, investigator: 'a', step, data },
  )
const title = (code: string) => playerCardDef(code)!.name
const target = (s: GameState, name = 'A') => choose(s, 'choice.therapyTarget', { name })
it('Psychoanalysis 0 lets the target heal and order all revealed cards without drawing or shuffling', () => {
  const initial = start()
  let s = target(effect(initial, '60264'))
  expect(me(s).deck).toEqual(['01091'])
  s = choose(s, 'choice.therapyHeal')
  expect(me(s).horror).toBe(1)
  for (const [n, code] of ['01090', '01088', '01089'].entries())
    s = choose(s, 'choice.divinationNext', { card: title(code), n: n + 1 })
  expect(me(s).deck).toEqual(['01090', '01088', '01089', '01091'])
  expect(me(s).hand).toEqual([])
  expect(s.rng).toEqual(initial.rng)
})
it('Psychoanalysis 0 draws one revealed card, returns and shuffles only the rest, and does not heal', () => {
  const before = start()
  let s = target(effect(before, '60264'))
  s = choose(s, 'choice.therapyDraw')
  s = choose(s, 'choice.therapyCard', { card: title('01089') })
  expect(me(s).hand).toEqual(['01089'])
  expect(me(s).deck.slice().sort()).toEqual(['01088', '01090', '01091'].sort())
  expect(me(s).horror).toBe(3)
  expect(s.rng).not.toEqual(before.rng)
})
it('the investigator whose deck is revealed makes the draw/heal and card choices', () => {
  let s = patch({ deck: ['01088', '01089', '01090'], hand: [], horror: 2 }, 'b')(start())
  s = target(effect(s, '60264', 'target', { remaining: '["b"]' }), 'B')
  expect(s.pending!.investigator).toBe('b')
  s = JSON.parse(JSON.stringify(s)) as GameState
  s = choose(s, 'choice.therapyDraw')
  expect(s.pending!.investigator).toBe('b')
  s = choose(s, 'choice.therapyCard', { card: title('01088') })
  expect(s.investigators[1]!.hand).toEqual(['01088'])
  expect(me(s).hand).toEqual([])
})
it('Psychoanalysis 3 resolves each local investigator completely before choosing the next, excluding remote investigators', () => {
  let s = patch(
    { location: 'B' },
    'c',
  )(patch({ deck: ['01088', '01089'], hand: [], horror: 3 }, 'b')(start()))
  const messages = playerCardBehavior('60278')!.play!(s, 'a')
  s = dispatch(s, ...messages)
  expect(s.pending!.question.choices.map((c) => c.params?.name)).toEqual(['A', 'B'])
  s = target(s, 'B')
  s = choose(s, 'choice.therapyCard', { card: title('01088') })
  expect(s.investigators[1]!).toMatchObject({ hand: ['01088'], horror: 1 })
  expect(s.pending!.question.choices.map((c) => c.params?.name)).toEqual(['A'])
  s = target(s)
  s = choose(s, 'choice.therapyCard', { card: title('01089') })
  expect(me(s)).toMatchObject({ hand: ['01089'], horror: 1 })
  expect(s.investigators[2]).toEqual(
    start().investigators[2] === undefined
      ? undefined
      : { ...start().investigators[2]!, location: 'B' },
  )
})
it('Psychoanalysis 3 resolves a drawn weakness before healing and returning the held cards', () => {
  let s = patch({ deck: ['01015', '01088', '01089', '01090'], discard: ['01091'], horror: 0 })(
    start(),
  )
  s = target(effect(s, '60278'))
  s = choose(s, 'choice.therapyCard', { card: title('01015') })
  expect(me(s).hand).toEqual([])
  expect(me(s).horror).toBe(0)
  expect(me(s).discard).not.toContain('01091')
  expect(me(s).deck.slice().sort()).toEqual(['01088', '01089', '01090'].sort())
})
it('a revealed card drawn by Psychoanalysis opens Serum’s reaction; looking and the healing branch do not', () => {
  let s = withAsset(patch({ hand: ['01088'] })(start()), '06159')
  s = target(effect(s, '60264'))
  s = choose(s, 'choice.therapyDraw')
  s = choose(s, 'choice.therapyCard', { card: title('01088') })
  expect(s.pending!.question.choices.some((c) => c.label === 'choice.conditionalReveal')).toBe(true)
  expect(me(s).deck).toEqual(['01091'])
  s = choose(s, 'choice.skip')
  expect(me(s).deck).toHaveLength(3)
  expect(me(s).hand).toEqual(['01088', '01088'])
})
it.each(['60264', '60278'])(
  '%s heals an empty-deck target without reshuffling the discard or taking deck-out horror',
  (code) => {
    const initial = patch({ deck: [], discard: ['01088'], horror: 2 })(start())
    let s = target(effect(initial, code))
    if (code === '60264') s = choose(s, 'choice.therapyHeal')
    expect(me(s)).toMatchObject({ horror: 0, deck: [], discard: ['01088'], hand: [] })
    expect(s.rng).toEqual(initial.rng)
  },
)
it('Psychoanalysis can order a deck even when there is no horror to heal', () => {
  const initial = patch({ horror: 0 })(start())
  expect(playerCardBehavior('60264')!.canPlay!(initial, 'a')).toBe(true)
  let s = target(effect(initial, '60264'))
  s = choose(s, 'choice.therapyHeal')
  for (const [n, code] of ['01089', '01090', '01088'].entries())
    s = choose(s, 'choice.divinationNext', { card: title(code), n: n + 1 })
  expect(me(s).deck).toEqual(['01089', '01090', '01088', '01091'])
  expect(me(s).horror).toBe(0)
})
it('Respite is forbidden by any enemy at the location, including an exhausted unengaged one', () => {
  let s = start()
  expect(playerCardBehavior('60577')!.canPlay!(s, 'a')).toBe(true)
  s = {
    ...s,
    enemies: {
      e: {
        kind: 'enemy',
        maxHealth: 2,
        id: 'e',
        code: 'test',
        name: 'Test',
        location: 'A',
        engagedWith: null,
        exhausted: true,
        fight: 1,
        health: 2,
        evade: 1,
        damage: 1,
        horror: 0,
        doom: 0,
        damageTaken: 0,
        keywords: [],
      },
    },
  }
  expect(playerCardBehavior('60577')!.canPlay!(s, 'a')).toBe(false)
  s.enemies.e!.location = 'B'
  expect(playerCardBehavior('60577')!.canPlay!(s, 'a')).toBe(true)
})
it('Respite recovers up to three physical level 0 event/skill copies, excluding assets and upgraded cards', () => {
  let s = patch({ deck: [], discard: ['01088', '01088', '01089', '01018', '11090'], horror: 0 })(
    start(),
  )
  s = effect(s, '60577', 'recover', { selected: '[]' })
  const offered = s.pending!.question.choices.map((c) => c.params?.card)
  expect(offered).toContain(title('01088'))
  expect(offered).not.toContain(title('01018'))
  expect(offered).not.toContain(title('11090'))
  s = choose(s, 'choice.therapyRecover', { card: title('01088') })
  s = choose(s, 'choice.therapyRecover', { card: title('01088') })
  s = choose(s, 'choice.therapyRecover', { card: title('01089') })
  expect([...me(s).deck, ...me(s).hand].sort()).toEqual(['01088', '01088', '01089'].sort())
  expect(me(s).discard).toEqual(['01018', '11090'])
  expect(me(s).hand).toHaveLength(1)
  expect(me(s).horror).toBe(0)
})
it('Respite can recover no cards and still draws, without an extra shuffle', () => {
  const initial = start()
  let s = effect(initial, '60577', 'recover', { selected: '[]' })
  s = choose(s, 'choice.therapyFinish')
  expect(me(s).hand).toEqual(['01088'])
  expect(me(s).deck).toEqual(['01089', '01090', '01091'])
  expect(s.rng).toEqual(initial.rng)
})
