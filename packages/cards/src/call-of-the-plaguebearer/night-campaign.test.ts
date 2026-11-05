import { applyInput, getInvestigator, type GameState } from '@lcg/engine'
import { throughSetup } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import {
  canPlayNext,
  currentScenario,
  finishScenario,
  newCampaign,
  startScenario,
} from '../campaign'
import { C } from './helpers'
import { emit } from './testing'

const finishSetup = (state: GameState) => {
  let s = throughSetup(state)
  for (let n = 0; n < 60 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++)
    s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
  return s
}
// Guía de campaña I R2 → II; Maletín sospechoso, preparación opcional.
it('continúa una campaña real desde Trasnochadores a Noche en la ciudad con el Maletín', () => {
  const campaign = newCampaign('call-of-the-plaguebearer', ['joe'], 'standard')
  let s = finishSetup(startScenario(campaign, 42, true))
  const owner = s.investigators[0]!.id
  s = emit(
    s,
    { type: 'PutAssetIntoPlay', investigator: owner, code: C.briefcase },
    { type: 'EndScenario', outcome: { type: 'resolution', resolution: 2 } },
  )
  const next = finishScenario(campaign, s)
  expect(currentScenario(next)).toBe('night-on-the-town')
  expect(canPlayNext(next)).toBe(true)
  expect(next.log.notes).toContain('plaguebearerMotel')
  let town = finishSetup(startScenario(next, 43, true))
  expect(town.scenarioId).toBe('night-on-the-town')
  expect(Object.values(town.assets).filter((a) => a.code === C.briefcase)).toHaveLength(1)
  const i = getInvestigator(town, owner)
  expect([...i.deck, ...i.hand, ...i.discard].filter((c) => c === C.briefcase)).toHaveLength(0)
  town = emit(town, { type: 'EndScenario', outcome: { type: 'noResolution' } })
  const after = finishScenario(next, town)
  expect(currentScenario(after)).toBe('dead-by-dawn')
  expect(canPlayNext(after)).toBe(false)
})
