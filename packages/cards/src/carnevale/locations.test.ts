import { availableAbilities, createGame, getInvestigator, type GameState } from '@lcg/engine'
import { choose, during, labels, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { enemy } from '../scenario-helpers'
import { carnevaleOfHorrors } from './scenario'
import { C, prepareCarnevale } from './setup'
import { around, ring } from './topology'

function at(code: string, players = 1): GameState {
  let seed = 1
  while (!prepareCarnevale(seed).locations.some((l) => l.id === code)) seed++
  let s = throughSetup(
    createGame({
      seed,
      scenario: carnevaleOfHorrors({ seed }),
      investigators: ['a', 'b'].slice(0, players).map((id) => testInvestigator(id)),
    }),
  )
  while (s.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    s = choose(s, 'choice.investigator', { name: 'A' })
  return during(s, (state) => ({
    ...state,
    locations: Object.fromEntries(
      Object.entries(state.locations).map(([id, l]) => [id, { ...l, revealed: true }]),
    ),
    investigators: state.investigators.map((i) => ({ ...i, location: code })),
  }))
}
function skip(s: GameState): GameState {
  while (s.pending?.question.prompt === 'prompt.reaction') s = choose(s, 'choice.skip')
  return s
}
function move(s: GameState, to: string) {
  return during(s, (state) => state, { type: 'MoveTo', investigator: 'a', location: to })
}

describe('Lugares de Carnevale (cartas 8–16)', () => {
  it.each([C.rialto, C.sighs, C.accademia])(
    'salir de %s aplica su coste forzado una sola vez',
    (code) => {
      let s = at(code)
      s = skip(move(s, around(ring(s), code)!))
      const me = getInvestigator(s, 'a')
      expect(me.actionsRemaining).toBe(code === C.rialto ? 2 : 3)
      expect(me.horror).toBe(code === C.sighs ? 1 : 0)
      expect(me.resources).toBe(code === C.accademia ? 3 : 5)
    },
  )

  it.each([C.canal, C.guardian])(
    'entrar en %s ofrece una reacción opcional, incluso en la primera revelación',
    (code) => {
      let s = at(code)
      const from = around(ring(s), code, -1)!
      s = during(s, (state) => ({
        ...state,
        locations: {
          ...state.locations,
          [code]: { ...state.locations[code]!, revealed: false, clues: 0 },
        },
        investigators: state.investigators.map((i) => ({ ...i, location: from })),
      }))
      const hand = getInvestigator(s, 'a').hand.length
      s = move(s, code)
      expect(s.pending?.question.prompt).toBe('prompt.reaction')
      const clue = s.locations[code]!.clues
      s = choose(s, code === C.canal ? 'ability.carnevale.canal' : 'ability.carnevale.guardian')
      expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
      s = skip(s)
      expect(s.locations[code]?.clues).toBe(clue + (code === C.canal ? 1 : 0))
      expect(getInvestigator(s, 'a').hand.length).toBe(hand + (code === C.guardian ? 1 : 0))
    },
  )

  it('permite rechazar la pista del Canal', () => {
    let s = at(C.canal)
    s = during(s, (state) => ({
      ...state,
      investigators: state.investigators.map((i) => ({
        ...i,
        location: around(ring(state), C.canal, -1)!,
      })),
    }))
    const clues = s.locations[C.canal]!.clues
    s = skip(move(s, C.canal))
    expect(s.locations[C.canal]?.clues).toBe(clues)
  })

  it('Calles mueve en sentido horario sin gastar acción ni provocar ataques', () => {
    let s = at(C.streets)
    const card = enemy({
      code: 'test-pursuer',
      name: 'Pursuer',
      fight: 2,
      health: 2,
      evade: 2,
      damage: 2,
      horror: 1,
      keywords: [],
    })
    s = during(s, (state) => state, {
      type: 'SpawnEnemy',
      card,
      location: C.streets,
      engageWith: 'a',
    })
    s = skip(choose(s, 'ability.carnevale.streets'))
    expect(getInvestigator(s, 'a').location).toBe(around(ring(s), C.streets))
    expect(getInvestigator(s, 'a').actionsRemaining).toBe(3)
    expect(getInvestigator(s, 'a').damage).toBe(0)
    expect(Object.values(s.enemies)[0]?.location).toBe(getInvestigator(s, 'a').location)
  })

  it('el Jardín cobra 2 acciones y 2 recursos y cura 2 horror una vez por investigador', () => {
    let s = at(C.garden, 2)
    s = during(s, (state) => ({
      ...state,
      investigators: state.investigators.map((i) => ({ ...i, horror: 3 })),
    }))
    s = choose(s, 'ability.carnevale.garden')
    expect(getInvestigator(s, 'a').horror).toBe(1)
    expect(getInvestigator(s, 'a').resources).toBe(3)
    expect(getInvestigator(s, 'a').actionsRemaining).toBe(1)
    s = during(s, (state) => ({
      ...state,
      investigators: state.investigators.map((i) => ({ ...i, actionsRemaining: 3 })),
    }))
    expect(labels(s)).not.toContain('ability.carnevale.garden')
    expect(availableAbilities(s, 'b').some((a) => a.label === 'ability.carnevale.garden')).toBe(
      true,
    )
  })

  it('no ofrece el Jardín sin horror, recursos o acciones suficientes', () => {
    let s = at(C.garden)
    expect(labels(s)).not.toContain('ability.carnevale.garden')
    s = during(s, (state) => ({
      ...state,
      investigators: state.investigators.map((i) => ({ ...i, horror: 2, resources: 1 })),
    }))
    expect(labels(s)).not.toContain('ability.carnevale.garden')
    s = during(s, (state) => ({
      ...state,
      investigators: state.investigators.map((i) => ({ ...i, resources: 2, actionsRemaining: 1 })),
    }))
    expect(labels(s)).not.toContain('ability.carnevale.garden')
  })

  it('la Plaza evade al no Élite antihorario sin prueba y comparte el límite del turno', () => {
    let s = at(C.square, 2)
    const previous = around(ring(s), C.square, -1)!
    const next = around(ring(s), C.square)!
    const card = enemy({
      code: 'test-sentry',
      name: 'Sentry',
      fight: 3,
      health: 3,
      evade: 6,
      damage: 1,
      horror: 0,
      keywords: [],
    })
    s = during(
      s,
      (state) => state,
      { type: 'SpawnEnemy', card, location: previous, engageWith: null },
      {
        type: 'SpawnEnemy',
        card: { ...card, code: 'test-elite', traits: ['Elite'] },
        location: previous,
        engageWith: null,
      },
      {
        type: 'SpawnEnemy',
        card: { ...card, code: 'test-clockwise' },
        location: next,
        engageWith: null,
      },
    )
    expect(
      availableAbilities(s, 'a').filter((a) => a.label === 'ability.carnevale.square'),
    ).toHaveLength(1)
    const before = s.chaosBag
    s = choose(s, 'ability.carnevale.square')
    expect(Object.values(s.enemies).find((e) => e.code === card.code)?.exhausted).toBe(true)
    expect(s.chaosBag).toEqual(before)
    expect(s.skillTest).toBeNull()
    s = during(s, (state) => ({
      ...state,
      investigators: state.investigators.map((i) => ({ ...i, actionsRemaining: 3 })),
    }))
    expect(availableAbilities(s, 'b').some((a) => a.label === 'ability.carnevale.square')).toBe(
      false,
    )
    s = during(s, (state) => state, { type: 'Step', step: 'turnBegins', investigator: 'b' })
    expect(availableAbilities(s, 'b').some((a) => a.label === 'ability.carnevale.square')).toBe(
      true,
    )
  })
})
