import { dispatch, playableCards, type GameState, type InvestigatorSetup } from '@lcg/engine'
import {
  createTestGame,
  choose,
  during,
  ghoul,
  keep,
  labels,
  spawnAt,
  testInvestigator,
  testScenario,
  withBag,
} from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import '../index'
import { code } from './player-cards'

const filler = (n: number) => Array.from({ length: n }, (_, i) => `filler-${i}`)

function game(id: string, setup: Partial<InvestigatorSetup> = {}): GameState {
  return createTestGame({
    seed: 3,
    scenario: testScenario({ chaosBag: [0] }),
    investigators: [testInvestigator(id, { deck: filler(20), ...setup })],
  })
}

const me = (s: GameState) => s.investigators[0]!
const set =
  (patch: Partial<ReturnType<typeof me>>) =>
  (s: GameState): GameState => ({
    ...s,
    investigators: s.investigators.map((i, n) => (n === 0 ? { ...i, ...patch } : i)),
  })
const prompt = (s: GameState) => s.pending?.question.prompt

describe('debilidades', () => {
  it('las de la mano inicial se apartan y se barajan en el mazo', () => {
    const s = game('a', { deck: [code(101), ...filler(20)] })
    expect(me(s).hand).not.toContain(code(101))
    expect(me(s).hand).toHaveLength(5)
    expect(me(s).deck).toContain(code(101))
  })

  it('Paranoia se resuelve al robarla: descartas tus recursos', () => {
    let s = game('a')
    s = during(s, set({ deck: [code(101)], resources: 7 }), {
      type: 'DrawCards',
      investigator: 'a',
      amount: 1,
    })
    expect(me(s).resources).toBe(0)
    expect(me(s).hand).not.toContain(code(101))
    expect(me(s).discard).toContain(code(101))
  })

  it('Wounded: la primera vez que te mueves cada turno recibes 1 daño', () => {
    let s = game('a')
    s = during(s, keep, { type: 'ResolveWeakness', investigator: 'a', code: code(104) })
    expect(Object.values(s.treacheries)[0]?.placement).toEqual({
      type: 'threatArea',
      investigator: 'a',
    })
    s = choose(s, 'action.move', { location: 'Room B' })
    expect(me(s).damage).toBe(1)
    s = choose(s, 'action.move', { location: 'Room A' })
    expect(me(s).damage).toBe(1)
  })

  it('The Necronomicon impide jugar apoyos y se puede intentar descartar', () => {
    let s = game('a')
    s = during(s, set({ hand: [code(20)], resources: 5 }), {
      type: 'ResolveWeakness',
      investigator: 'a',
      code: code(12),
    })
    expect(playableCards(s, 'a', false)).not.toContain(code(20))
    expect(labels(s)).toContain('ability.necronomicon')
  })

  it('Black Chamber Operative aparece enfrentado a quien lo roba', () => {
    let s = game(code(7))
    s = during(s, keep, { type: 'ResolveWeakness', investigator: code(7), code: code(9) })
    const enemy = Object.values(s.enemies)[0]
    expect(enemy?.engagedWith).toBe(code(7))
    expect(enemy?.owner).toBe(code(7))
  })
})

describe('investigadores', () => {
  it('Joe Diamond: tras investigar con éxito puede robar 1 carta', () => {
    let s = game(code(4))
    s = during(s, withBag(0), {
      type: 'TakeAction',
      investigator: code(4),
      action: { kind: 'investigate' },
    })
    expect(prompt(s)).toBe('prompt.reaction')
    const hand = me(s).hand.length
    s = choose(s, 'ability.drawCards')
    expect(me(s).hand.length).toBe(hand + 1)
  })

  it('Joe Diamond: el signo arcano roba 1 carta y da 1 recurso al tener éxito', () => {
    let s = game(code(4))
    const resources = me(s).resources
    s = during(s, withBag('elderSign'), {
      type: 'TakeAction',
      investigator: code(4),
      action: { kind: 'investigate' },
    })
    expect(me(s).resources).toBe(resources + 1)
  })

  it('Trish Scarborough: sin acciones aún puede evitar una vez', () => {
    let s = game(code(7))
    s = during(s, set({ actionsRemaining: 0, extraEvade: true }), spawnAt('A', ghoul, code(7)))
    expect(labels(s)).toContain('action.evade')
    expect(labels(s)).not.toContain('action.draw')
  })
})

describe('cartas de jugador', () => {
  it('Endurance: gastar 1 recurso da +2 [combat] a un ataque', () => {
    let s = game('a')
    s = during(
      s,
      set({ resources: 3 }),
      { type: 'PutAssetIntoPlay', investigator: 'a', code: code(17) },
      spawnAt('A', ghoul, 'a'),
    )
    const enemy = Object.keys(s.enemies)[0]!
    s = dispatch(
      { ...s, pending: null },
      {
        type: 'BeginSkillTest',
        investigator: 'a',
        skill: 'combat',
        difficulty: 2,
        kind: { type: 'fight', enemy },
      },
    )
    expect(prompt(s)).toBe('prompt.commitCards')
    s = choose(s, 'ability.pump', { skill: 'combat' })
    expect(s.skillTest?.baseModifier).toBe(2)
    expect(me(s).resources).toBe(2)
  })

  it('Lesson Learned se juega como reacción cuando un enemigo te ataca', () => {
    let s = game('a')
    s = during(s, set({ hand: [code(22)], resources: 2 }), spawnAt('A', ghoul, 'a'))
    const enemy = Object.keys(s.enemies)[0]!
    s = dispatch(
      { ...s, pending: null },
      {
        type: 'EnemyAttack',
        enemy,
        investigator: 'a',
        exhaustAfter: false,
      },
    )
    expect(prompt(s)).toBe('prompt.reaction')
    s = choose(s, 'ability.playCard')
    expect(me(s).clues).toBe(1)
    expect(me(s).discard).toContain(code(22))
  })

  it('Dead Ends cancela la búsqueda de Right Tool for the Job', () => {
    let s = game('a')
    s = during(s, set({ hand: [code(23)], resources: 3, deck: [code(6), code(20), ...filler(5)] }))
    s = choose(s, 'action.play', { card: 'Right Tool for the Job' })
    expect(me(s).hand).toContain(code(6))
    expect(me(s).hand).not.toContain(code(20))
  })

  it('Right Tool for the Job busca un arma y la lleva a la mano', () => {
    let s = game('a')
    s = during(s, set({ hand: [code(23)], resources: 3, deck: [...filler(3), code(20)] }))
    s = choose(s, 'action.play', { card: 'Right Tool for the Job' })
    expect(me(s).hand).toContain(code(20))
  })

  it('Laboratory Assistant amplía la mano y roba 2 al entrar en juego', () => {
    let s = game('a')
    const hand = me(s).hand.length
    s = during(s, keep, { type: 'PutAssetIntoPlay', investigator: 'a', code: code(32) })
    expect(prompt(s)).toBe('prompt.reaction')
    s = choose(s, 'ability.drawCards')
    expect(me(s).hand.length).toBe(hand + 2)
  })
})
