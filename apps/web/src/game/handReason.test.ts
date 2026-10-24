import type { GameState } from '@lcg/engine'
import { newTestGame, throughSetup } from '@lcg/engine/testing'
import '@lcg/cards'
import { describe, expect, it } from 'vitest'
import { handReason } from './handReason'

const EVENT = '12043' // Unbridled Knowledge (coste 1)
const SKILL = '01089' // Guts

function table(resources: number, hand: string[]): GameState {
  const s = throughSetup(newTestGame())
  return {
    ...s,
    investigators: s.investigators.map((i) => ({ ...i, hand, resources })),
  }
}

describe('motivo de una carta de la mano que no se puede jugar', () => {
  it('explica el coste, las habilidades y el momento de juego', () => {
    expect(handReason(table(0, [EVENT]), 'a', EVENT)).toEqual({
      key: 'unplayable.cost',
      params: { cost: 1, printed: 1, resources: 0 },
    })
    expect(handReason(table(5, [SKILL]), 'a', SKILL)?.key).toBe('unplayable.skill')
    // En su menú de acciones nada lo impide.
    expect(handReason(table(5, [EVENT]), 'a', EVENT)).toBeNull()
    const busy = table(5, [EVENT])
    const waiting: GameState = {
      ...busy,
      pending: {
        ...busy.pending!,
        question: { ...busy.pending!.question, prompt: 'prompt.other' },
      },
    }
    expect(handReason(waiting, 'a', EVENT)?.key).toBe('unplayable.actionTiming')
    const tired: GameState = {
      ...busy,
      investigators: busy.investigators.map((i) => ({ ...i, actionsRemaining: 0 })),
    }
    expect(handReason(tired, 'a', EVENT)?.key).toBe('unplayable.noActions')
  })
})
