import { availableAbilities, getInvestigator } from '@lcg/engine'
import { choose, during, withBag } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import '../index'
import { C } from './codes'
import { appendage, TREACHERIES } from './data'
import { specific, sacrificed } from './helpers'
import { tokenEffect } from './tokens'
import { boss, emit, game, settle } from './testing'
import type { Message } from '@lcg/engine'

const test = (difficulty: number): Message => ({
  type: 'BeginSkillTest',
  investigator: 'a',
  skill: 'intellect',
  difficulty,
  kind: { type: 'effect', source: '82001', onSuccess: [], onFail: [], onFailEach: [] },
})

// Scenario reference (82001); RR "Skill Tests", ST.3–ST.7.
describe('Fichas del caos de Carnevale', () => {
  it.each(['standard', 'hard'] as const)(
    'la calavera cuenta sacrificados y, en %s, también rescatados según corresponda',
    (difficulty) => {
      let s = game(1, difficulty)
      s = during(s, (state) => ({
        ...state,
        scenarioDecks: {
          carnevaleRescued: [C.innocent, C.innocent],
          carnevaleSacrificed: [C.innocent],
        },
      }))
      expect(tokenEffect(s, 'skull', 'a').modifier).toBe(difficulty === 'hard' ? -5 : -3)
    },
  )
  it.each(['standard', 'hard'] as const)(
    'la tablilla en %s se resuelve al fallar o al revelarse, respectivamente',
    (difficulty) => {
      let s = emit(game(1, difficulty), {
        type: 'PutAssetIntoPlay',
        code: C.innocent,
        investigator: 'a',
        noSlot: true,
      })
      s = during(
        s,
        (state) => ({
          ...withBag('tablet')(state),
          investigators: state.investigators.map((i) => ({
            ...i,
            skills: { ...i.skills, intellect: 8 },
          })),
        }),
        test(0),
      )
      if (difficulty === 'hard') s = choose(settle(s), 'choice.carnevale.innocentDamage')
      s = settle(s)
      expect(Object.values(s.assets)[0]?.damage).toBe(difficulty === 'hard' ? 1 : 0)
    },
  )
  it('fallar con tablilla difícil no aplica su efecto por segunda vez', () => {
    let s = emit(game(1, 'hard'), {
      type: 'PutAssetIntoPlay',
      code: C.innocent,
      investigator: 'a',
      noSlot: true,
    })
    s = during(s, withBag('tablet'), test(10))
    s = settle(choose(settle(s), 'choice.carnevale.innocentDamage'))
    expect(Object.values(s.assets)[0]?.damage).toBe(1)
    expect(sacrificed(s)).toEqual([])
  })
  it('el sectario revela otra ficha y su encuentro al fallar pasa por la sustitución del acto 3', () => {
    let s = during(
      game(),
      (state) => ({
        ...state,
        actIndex: 1,
        investigators: state.investigators.map((i) => ({ ...i, location: C.canal })),
      }),
      { type: 'CheckActObjective' },
    )
    s = during(s, (state) => ({
      ...state,
      encounterDeck: [appendage, TREACHERIES[0]!],
      encounterDiscard: [],
    }))
    const effect = tokenEffect(s, 'cultist', 'a')
    expect(effect.revealAnother).toBe(true)
    s = emit(s, ...effect.onFail!)
    expect(Object.values(s.enemies).filter((e) => e.code === C.appendage)).toHaveLength(1)
    expect(s.encounterDiscard.map((c) => c.code)).toEqual([C.hysteria])
  })
  it.each([true, false])(
    'fallar con primigenio provoca el ataque solo si Cnidathqua está en juego (%s)',
    (present) => {
      let s = game()
      if (present) s = emit(s, specific('carnevaleBoss'))
      s = during(s, withBag('elderThing'), test(10))
      s = settle(s)
      expect([getInvestigator(s, 'a').damage, getInvestigator(s, 'a').horror]).toEqual(
        present ? [2, 2] : [0, 0],
      )
    },
  )
  it('los efectos de daño local sin combate no pueden seleccionar a Cnidathqua', () => {
    const s = emit(game(), specific('carnevaleBoss'), {
      type: 'PutAssetIntoPlay',
      code: '03036',
      investigator: 'a',
    })
    expect(
      availableAbilities(s, 'a').some(
        (a) =>
          a.target?.type === 'enemy' &&
          a.target.id === boss(s).id &&
          a.label.startsWith('ability.lantern'),
      ),
    ).toBe(false)
  })
})
