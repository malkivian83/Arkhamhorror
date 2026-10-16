import { describe, expect, it } from 'vitest'
import { undoTarget, type Mark } from './undo'

const menu = (investigator: string, round = 1): Mark => ({
  round,
  phase: 'investigation',
  investigator,
  prompt: 'prompt.chooseAction',
})
const other = (investigator: string, round = 1, phase: Mark['phase'] = 'investigation'): Mark => ({
  round,
  phase,
  investigator,
  prompt: 'prompt.commitCards',
})

describe('undoTarget', () => {
  it('no deshace nada al principio', () => {
    expect(undoTarget([menu('a')], 'step')).toBeNull()
  })

  it('deshace la última decisión', () => {
    expect(undoTarget([menu('a'), other('a'), menu('a')], 'step')).toBe(1)
  })

  it('vuelve al menú de acciones anterior', () => {
    const marks = [menu('a'), other('a'), other('a'), menu('a')]
    expect(undoTarget(marks, 'action')).toBe(0)
    // A mitad de una acción, vuelve a su comienzo.
    expect(undoTarget(marks.slice(0, 3), 'action')).toBe(0)
  })

  it('vuelve al comienzo del turno, o del turno anterior si ya está en él', () => {
    const marks = [menu('a'), other('a'), menu('a'), menu('b'), other('b'), menu('b')]
    expect(undoTarget(marks, 'turn')).toBe(3)
    expect(undoTarget(marks.slice(0, 4), 'turn')).toBe(0)
  })

  it('vuelve al comienzo de la ronda, o de la anterior si ya está en él', () => {
    const marks = [
      menu('a', 1),
      other('a', 1, 'enemy'),
      other('a', 2, 'mythos'),
      menu('a', 2),
      menu('a', 2),
    ]
    expect(undoTarget(marks, 'round')).toBe(2)
    expect(undoTarget(marks.slice(0, 3), 'round')).toBe(0)
  })
})
