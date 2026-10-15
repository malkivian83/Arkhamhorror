import { applyInput, createGame } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { demoInvestigators, demoScenario } from './demo'

describe('escenario de demostración', () => {
  it('se puede jugar hasta el final eligiendo siempre la primera opción', () => {
    let game = createGame({ seed: 3, scenario: demoScenario, investigators: demoInvestigators })
    for (let n = 0; n < 2000 && !game.outcome; n++) {
      const pending = game.pending
      if (!pending) throw new Error('El motor se detuvo sin pregunta ni final')
      game = applyInput(game, { investigator: pending.investigator, choice: 0 })
    }
    expect(game.outcome).not.toBeNull()
  })
})
