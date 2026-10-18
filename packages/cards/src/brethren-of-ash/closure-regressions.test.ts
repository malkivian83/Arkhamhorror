import { applyInput, createGame, effectiveVitals, type GameState } from '@lcg/engine'
import { choose, during, ghoul, labels, testInvestigator, testScenario } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { newCampaign, startScenario } from '../campaign'
import { code } from '../core-2026/player-cards'
import { CODES as Q, elokossFaintEmbers } from './queen-of-ash'
import '../index'

function generic() {
  return createGame({
    seed: 1,
    scenario: testScenario({ chaosBag: [0] }),
    investigators: [
      testInvestigator('a', { health: 8, sanity: 8, deck: Array(20).fill(code(89)) }),
    ],
  })
}
function settle(g: GameState): GameState {
  for (let n = 0; g.pending && g.pending.question.prompt !== 'prompt.chooseAction' && n < 40; n++) {
    const skip = g.pending.question.choices.findIndex((c) => c.label === 'choice.skip')
    g = applyInput(g, { investigator: g.pending.investigator, choice: Math.max(0, skip) })
  }
  return g
}

describe('regresiones encontradas al cerrar Brethren of Ash', () => {
  it('el coste del apoyo se paga antes del ataque: Lesson Learned no puede gastar recursos ya pagados', () => {
    // RR, initiating abilities step 2, then attacks of opportunity. Formerly the
    // legal Lesson Learned reaction left the queued asset unaffordable and threw.
    let g = during(
      generic(),
      (s) => ({
        ...s,
        investigators: s.investigators.map((i) => ({
          ...i,
          resources: 3,
          hand: [code(19), code(22)],
        })),
      }),
      { type: 'SpawnEnemy', card: ghoul, location: 'A', engageWith: 'a' },
    )
    g = settle(choose(g, 'action.play', { card: 'M1911' }))
    expect(g.investigators[0]!.resources).toBe(0)
    expect(g.investigators[0]!.hand).toContain(code(22))
    expect(Object.values(g.assets).some((a) => a.code === code(19))).toBe(true)
    expect(g.investigators[0]!.damage).toBe(1)
  })

  it('The Gold Bug reduce salud y cordura, resiste descartes y se baraja mediante su acción', () => {
    let g = during(generic(), (s) => s, {
      type: 'ResolveWeakness',
      investigator: 'a',
      code: code(98),
    })
    const id = Object.keys(g.treacheries)[0]!
    expect(effectiveVitals(g, g.investigators[0]!)).toEqual({ health: 7, sanity: 7 })
    g = during(g, (s) => s, { type: 'DiscardTreachery', treachery: id })
    expect(g.treacheries[id]).toBeDefined()
    g = choose(g, 'ability.shuffleGoldBug')
    expect(Object.values(g.treacheries)).toHaveLength(0)
    expect(effectiveVitals(g, g.investigators[0]!)).toEqual({ health: 8, sanity: 8 })
    expect(g.investigators[0]!.deck.filter((c) => c === code(98))).toHaveLength(1)
  })

  it('The Gold Bug puede derrotarte al entrar; el umbral de trauma conserva la salud impresa', () => {
    const g = during(
      generic(),
      (s) => ({ ...s, investigators: s.investigators.map((i) => ({ ...i, damage: 7 })) }),
      { type: 'ResolveWeakness', investigator: 'a', code: code(98) },
    )
    expect(g.investigators[0]!.eliminated).toBe(true)
    expect(g.campaignLog!.investigators.a!.physicalTrauma).toBe(1)
    expect(g.campaignLog!.investigators.a!.killed).not.toBe(true)
  })

  it('The Nameless Lurker aparece en el lugar vacío más lejano y no acumula dos perdiciones', () => {
    let g = during(generic(), (s) => s, {
      type: 'ResolveWeakness',
      investigator: 'a',
      code: code(99),
    })
    const id = Object.keys(g.enemies)[0]!
    expect(g.enemies[id]).toMatchObject({ location: 'C', engagedWith: null, keywords: ['aloof'] })
    for (let n = 0; n < 2; n++)
      g = during(g, (s) => s, { type: 'Forced', trigger: { type: 'investigationPhaseEnds' } })
    expect(g.enemies[id]!.doom).toBe(1)
    g = during(
      g,
      (s) => ({ ...s, enemies: { [id]: { ...s.enemies[id]!, exhausted: true, doom: 0 } } }),
      { type: 'Forced', trigger: { type: 'investigationPhaseEnds' } },
    )
    expect(g.enemies[id]!.doom).toBe(0)
  })

  it('Elokoss cobra las pistas al investigador que activa la habilidad, sin pago colectivo', () => {
    const c = newCampaign('brethren-of-ash', ['joe', 'trish'], 'standard')
    let g = startScenario({ ...c, scenarioIndex: 2 }, 3, false)
    if (g.pending?.question.prompt === 'prompt.chooseNextInvestigator')
      g = choose(g, 'choice.investigator')
    g = settle(
      during(
        g,
        (s) => ({
          ...s,
          actIndex: 1,
          investigators: s.investigators.map((i) => ({
            ...i,
            location: Q.undergroundCistern,
            clues: 1,
          })),
        }),
        {
          type: 'SpawnEnemy',
          card: elokossFaintEmbers(2),
          location: Q.undergroundCistern,
          engageWith: null,
        },
      ),
    )
    expect(labels(g)).not.toContain('ability.weakenElokoss')
    g = during(g, (s) => ({
      ...s,
      investigators: s.investigators.map((i, n) => ({ ...i, clues: n === 0 ? 2 : 8 })),
    }))
    g = choose(g, 'ability.weakenElokoss')
    expect(g.investigators.map((i) => i.clues)).toEqual([0, 8])
  })

  it('la compuerta derrota enemigos antes de R3 y conserva ese final frente al objetivo de Elokoss', () => {
    let g = during(generic(), (s) => s, {
      type: 'SpawnEnemy',
      card: elokossFaintEmbers(1),
      location: 'A',
      engageWith: null,
    })
    // Same message used by Sluice Control after passing its test. No reactions or
    // CheckActObjective may replace its explicit ending with resolution 1.
    g = during(g, (s) => s, { type: 'DefeatAllEnemiesWithoutWindows', by: 'a' })
    expect(Object.values(g.enemies)).toHaveLength(0)
    expect(g.victoryDisplay).toContain(Q.elokoss)
    expect(g.victoryPoints).toBe(5)
  })
})
