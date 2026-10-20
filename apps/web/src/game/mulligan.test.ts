import { applyInput, type GameState } from '@lcg/engine'
import { newCampaign, startScenario } from '@lcg/cards'
import { describe, expect, it } from 'vitest'
import { startingMulligan } from './mulligan'

/** Contesta la primera opción hasta llegar a la pregunta indicada. */
function until(state: GameState, prompt: string): GameState {
  let s = state
  while (s.pending && s.pending.question.prompt !== prompt)
    s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
  return s
}

describe('aviso de mulligan', () => {
  const start = () => startScenario(newCampaign('the-midwinter-gala', ['joe'], 'standard'), 13)

  it('avisa al investigador que empieza a elegir su mano inicial', () => {
    const s = until(start(), 'prompt.mulligan')
    expect(startingMulligan(s)).toEqual({ id: s.pending!.investigator, name: 'Joe Diamond' })
  })
  it('deja de avisar en cuanto cambia una carta y fuera del mulligan', () => {
    const s = until(start(), 'prompt.mulligan')
    expect(startingMulligan(start())).toBeNull()
    const card = s.pending!.question.choices.findIndex((c) => c.label === 'choice.mulliganCard')
    const after = applyInput(s, { investigator: s.pending!.investigator, choice: card })
    expect(after.pending?.question.prompt).toBe('prompt.mulligan')
    expect(startingMulligan(after)).toBeNull()
    expect(startingMulligan(null)).toBeNull()
  })
})
