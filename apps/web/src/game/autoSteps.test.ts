import { applyInput, type GameState } from '@lcg/engine'
import { during, ghoul, newTestGame, spawnAt, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { createAutoSteps, type AutoStepsReview } from './autoSteps'

function answer(state: GameState, label: string) {
  const pending = state.pending!
  const choice = pending.question.choices.findIndex((c) => c.label === label)
  expect(choice).toBeGreaterThanOrEqual(0)
  const collector = createAutoSteps(state)
  const next = applyInput(state, { investigator: pending.investigator, choice }, collector.observe)
  return { next, review: collector.finish(next) }
}
const step = (review: AutoStepsReview | null, key: string) =>
  review?.steps.find((s) => s.key === `log.step.${key}`)
const effectKeys = (review: AutoStepsReview | null, key: string) =>
  step(review, key)?.effects.map((e) => e.key) ?? []

describe('pasos automáticos tras una decisión', () => {
  // RR "Round Sequence": al terminar el turno el juego resuelve solo las fases
  // de enemigos, mantenimiento y mitos hasta la siguiente decisión.
  it('explica cada paso del final de ronda con su motivo y sus cambios', () => {
    const hunter = { ...ghoul, code: 'test-hunter', name: 'Hunter', keywords: ['hunter' as const] }
    const start = during(
      throughSetup(newTestGame()),
      (s) => s,
      spawnAt('C', hunter),
      spawnAt('A', ghoul, 'a'),
    )
    const { review } = answer(start, 'action.endTurn')
    expect(review).not.toBeNull()
    const keys = review!.steps.map((s) => s.key)
    expect(keys).toEqual(
      expect.arrayContaining([
        'log.step.turnEnds',
        'log.step.enemyBegins',
        'log.step.huntersMove',
        'log.step.resolveAttacks',
        'log.step.readyExhausted',
        'log.step.drawAndGainResource',
        'log.round',
        'log.step.placeDoom',
        'log.step.drawEncounter',
      ]),
    )
    // En el orden del reglamento.
    expect(keys.indexOf('log.step.huntersMove')).toBeLessThan(
      keys.indexOf('log.step.resolveAttacks'),
    )
    expect(keys.indexOf('log.round')).toBeLessThan(keys.indexOf('log.step.placeDoom'))
    expect(step(review, 'huntersMove')?.reason).toBe('table.autoSteps.reason.huntersMove')
    expect(step(review, 'turnEnds')?.params).toEqual({ name: 'A' })
    expect(step(review, 'huntersMove')?.effects).toContainEqual({
      key: 'table.autoSteps.enemyMoved',
      params: { enemy: 'Hunter', location: 'Room B' },
    })
    expect(effectKeys(review, 'resolveAttacks')).toEqual(
      expect.arrayContaining([
        'table.autoSteps.enemyAttacks',
        'log.damage',
        'table.autoSteps.enemyExhausted',
      ]),
    )
    // El registro ya da el daño: no se repite como cambio de contador.
    expect(effectKeys(review, 'resolveAttacks')).not.toContain('table.advanceReview.damageChange')
    expect(effectKeys(review, 'readyExhausted')).toContain('table.autoSteps.enemyReadied')
    expect(step(review, 'drawAndGainResource')?.effects).toEqual(
      expect.arrayContaining([
        { key: 'table.autoSteps.drew', params: { name: 'A', n: 1 } },
        expect.objectContaining({ key: 'table.advanceReview.resourcesChange' }),
      ]),
    )
    expect(step(review, 'placeDoom')?.effects).toContainEqual({
      key: 'table.advanceReview.doomChange',
      params: { before: 0, after: 1 },
    })
    expect(effectKeys(review, 'drawEncounter')).toContain('log.encounter')
    expect(step(review, 'mythosBegins')?.effects).toEqual([])
    expect(review!.next?.name).toBe('A')
  })

  it('no recoge lo que el jugador hace durante su turno', () => {
    const start = throughSetup(newTestGame())
    const { review } = answer(start, 'action.resource')
    expect(review).toBeNull()
  })

  it('sigue en el paso en curso cuando la secuencia se retoma tras una decisión', () => {
    // Por ejemplo, tras elegir el orden de los ataques de la fase de enemigos.
    const mid: GameState = { ...throughSetup(newTestGame()), phaseStep: 'resolveAttacks' }
    const collector = createAutoSteps(mid)
    collector.observe(
      mid,
      { type: 'GainResources', investigator: 'a', amount: 1 },
      {
        ...mid,
        investigators: mid.investigators.map((i) =>
          i.id === 'a' ? { ...i, resources: i.resources + 1 } : i,
        ),
      },
    )
    const review = collector.finish(mid)
    expect(review?.steps[0]?.key).toBe('log.step.resolveAttacks')
    expect(review?.steps[0]?.effects[0]?.key).toBe('table.advanceReview.resourcesChange')
  })
})
