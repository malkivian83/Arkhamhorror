import { dispatch, getInvestigator } from '@lcg/engine'
import { choose, newTestGame } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { anamnesis } from './fatal-mirage-encounters'

function drawAnamnesis() {
  const state = newTestGame({ players: ['a', 'b'] })
  return dispatch(
    { ...state, doom: 2, encounterDeck: [anamnesis], queue: [], pending: null },
    { type: 'DrawEncounterCard', investigator: 'b' },
  )
}

describe('Anamnesis', () => {
  it('offers the peril choice to the investigator who drew it', () => {
    const drawn = drawAnamnesis()
    expect(drawn.pending?.investigator).toBe('b')
    const resolved = choose(drawn, 'choice.edgeOfTheEarth.takeHorror', { amount: 2 })
    expect(getInvestigator(resolved, 'a').horror).toBe(0)
    expect(getInvestigator(resolved, 'b').horror).toBe(2)
    expect(resolved.agendaIndex).toBe(0)
  })

  it('can advance the agenda immediately when the doom threshold is met', () => {
    const resolved = choose(drawAnamnesis(), 'choice.placeDoom')
    expect(resolved.agendaIndex).toBe(1)
    expect(getInvestigator(resolved, 'b').horror).toBe(0)
  })
})
