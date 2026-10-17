import { describe, expect, it } from 'vitest'
import { registerPlayerCard, registerPlayerCards } from './content'
import { applyInput, createGame, dispatch } from './engine'
import { prepareGame } from './setup'
import { choose, testInvestigator, testScenario } from './testing'
import type { GameState } from './types'

const weakness = 'mulligan-weakness'
const permanent = 'mulligan-permanent'
registerPlayerCards([
  {
    code: weakness,
    name: 'Weakness',
    type: 'treachery',
    class: 'neutral',
    traits: [],
    weakness: 'basic',
  },
  { code: permanent, name: 'Permanent', type: 'asset', class: 'neutral', traits: [] },
])
registerPlayerCard({ code: permanent, permanent: { openingHand: 1 } })

const me = (state: GameState) => state.investigators[0]!
const prompt = (state: GameState) => state.pending?.question.prompt
const cards = (state: GameState) =>
  [...me(state).hand, ...me(state).deck, ...me(state).discard].sort()
const finish = (state: GameState) => choose(state, 'choice.finishMulligan')
const replace = (state: GameState, card: string) => choose(state, 'choice.mulliganCard', { card })

function start(players = ['a']) {
  return createGame({
    seed: 7,
    scenario: testScenario(),
    investigators: players.map((id) => testInvestigator(id)),
  })
}

/** Orden conocido para comprobar qué cartas se apartan antes de cada robo. */
function opening(deck: string[]) {
  const state = prepareGame({
    seed: 7,
    scenario: testScenario(),
    investigators: [testInvestigator('a')],
  })
  return dispatch(
    { ...state, queue: [], investigators: [{ ...me(state), deck }] },
    {
      type: 'DrawCards',
      investigator: 'a',
      amount: 5,
      opening: true,
    },
  )
}

describe('mulligan inicial (RR "Mulligan")', () => {
  it('se detiene antes del primer turno para elegir la mano inicial', () => {
    const state = start()
    expect(prompt(state)).toBe('prompt.mulligan')
    expect(state).toMatchObject({ phase: 'setup', round: 0, doom: 0 })
    expect(me(state)).toMatchObject({ resources: 5, actionsRemaining: 0, location: null })
    expect(me(state).hand).toHaveLength(5)
    expect(state.pending?.question.choices.filter((c) => c.target?.type === 'hand')).toHaveLength(5)
  })

  it('permite conservar toda la mano y empezar sin consumir recursos ni acciones', () => {
    const state = start()
    const next = finish(state)
    expect(prompt(next)).toBe('prompt.chooseAction')
    expect(me(next)).toMatchObject({
      hand: me(state).hand,
      deck: me(state).deck,
      resources: 5,
      actionsRemaining: 3,
    })
    expect(next.rng).toEqual(state.rng)
    expect(next).toMatchObject({ round: 1, phase: 'investigation', doom: 0 })
  })

  it('aparta las cartas hasta confirmar y solo entonces roba sus reemplazos', () => {
    const state = start()
    const original = me(state)
    const selected = original.hand.slice(0, 2)
    let next = selected.reduce(replace, state)
    expect(me(next).hand).toEqual(original.hand.slice(2))
    expect(me(next).deck).toEqual(original.deck)
    expect(me(next).discard).toEqual([])
    next = finish(next)
    expect(me(next).hand).toEqual([...original.hand.slice(2), ...original.deck.slice(0, 2)])
    for (const card of selected) expect(me(next).deck).toContain(card)
    expect(cards(next)).toEqual(cards(state))
    expect(me(state)).toEqual(original)
  })

  it('permite cambiar las cinco cartas y exige confirmación incluso con la mano vacía', () => {
    const state = start()
    const selected = me(state).hand.reduce(replace, state)
    expect(prompt(selected)).toBe('prompt.mulligan')
    expect(me(selected).hand).toEqual([])
    expect(selected.pending?.question.choices).toHaveLength(1)
    const next = finish(selected)
    expect(me(next).hand).toEqual(me(state).deck.slice(0, 5))
    expect(cards(next)).toEqual(cards(state))
    expect(prompt(next)).toBe('prompt.chooseAction')
  })

  it('cada clic aparta una sola copia de una carta repetida', () => {
    const state = opening(['copy', 'copy', 'b', 'c', 'd', 'e', 'f', 'g'])
    const once = replace(state, 'copy')
    expect(me(once).hand.filter((c) => c === 'copy')).toHaveLength(1)
    const next = finish(replace(once, 'copy'))
    expect(me(next).hand).toEqual(['b', 'c', 'd', 'e', 'f'])
    expect(me(next).deck.filter((c) => c === 'copy')).toHaveLength(2)
    expect(cards(next)).toEqual(cards(state))
  })

  it('da una única oportunidad a cada investigador, en orden de jugadores', () => {
    const players = ['a', 'b', 'c', 'd']
    let state = start(players)
    for (const id of players) {
      expect(state.pending?.investigator).toBe(id)
      expect(prompt(state)).toBe('prompt.mulligan')
      expect(state.phase).toBe('setup')
      state = finish(state)
    }
    expect(prompt(state)).toBe('prompt.chooseNextInvestigator')
    expect(state.phase).toBe('investigation')
    expect(state.investigators.every((i) => i.hand.length === 5 && i.resources === 5)).toBe(true)
  })

  it('rechaza decisiones de otro investigador', () => {
    expect(() => applyInput(start(['a', 'b']), { investigator: 'b', choice: 0 })).toThrow(
      'No es tu decisión',
    )
  })

  it('aparta las debilidades del robo inicial y del reemplazo, sin resolverlas', () => {
    const deck = [weakness, 'a', 'b', 'c', 'd', 'e', weakness, 'f', 'g', 'h']
    const state = opening(deck)
    expect(me(state).hand).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(me(state).deck).toEqual([weakness, 'f', 'g', 'h'])
    const next = finish(replace(state, 'a'))
    expect(me(next).hand).toEqual(['b', 'c', 'd', 'e', 'f'])
    expect(me(next).deck.filter((c) => c === weakness)).toHaveLength(2)
    expect(me(next).discard).toEqual([])
    expect(next.log.some((entry) => entry.key === 'log.weakness')).toBe(false)
    expect(cards(next)).toEqual([...deck].sort())
  })

  it('un mazo insuficiente o solo con debilidades no produce un bucle ni horror', () => {
    for (const deck of [[weakness, weakness], ['a', 'b', weakness], []]) {
      const state = opening(deck)
      const next = finish(me(state).hand.reduce(replace, state))
      expect(me(next).horror).toBe(0)
      expect(cards(next)).toEqual([...deck].sort())
      expect(me(next).hand).toEqual([])
    }
  })

  it('respeta las cartas extra de la mano inicial concedidas por permanentes', () => {
    const investigator = testInvestigator('a')
    const state = createGame({
      seed: 7,
      scenario: testScenario(),
      investigators: [{ ...investigator, deck: [...investigator.deck, permanent] }],
    })
    expect(me(state).hand).toHaveLength(6)
    const next = finish(me(state).hand.reduce(replace, state))
    expect(me(next).hand).toHaveLength(6)
    expect(me(next).hand).not.toContain(permanent)
    expect(Object.values(next.assets).map((a) => a.code)).toEqual([permanent])
  })

  it('se puede guardar y reanudar a mitad de la selección con el mismo resultado', () => {
    const state = start()
    const selected = replace(state, me(state).hand[0]!)
    const restored = JSON.parse(JSON.stringify(selected)) as GameState
    expect(finish(restored)).toEqual(finish(selected))
    expect(finish(replace(start(), me(state).hand[0]!))).toEqual(finish(selected))
  })

  it('muestra el mulligan después de la introducción en la mesa interactiva', () => {
    const state = createGame({
      seed: 7,
      interactive: true,
      scenario: testScenario({ intro: { title: 'intro', body: 'body' } }),
      investigators: [testInvestigator('a')],
    })
    expect(prompt(state)).toBe('prompt.story')
    expect(prompt(choose(state, 'choice.continue'))).toBe('prompt.mulligan')
  })
})
