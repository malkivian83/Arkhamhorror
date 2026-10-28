import {
  newCampaign,
  startScenario,
  campaignDefinition,
  LOST_ENCOUNTER_LOCATIONS,
} from '@lcg/cards'
import { applyInput, printedCode } from '@lcg/engine'
import { during, keep, throughSetup } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { decodeSession, session } from './session'

it('round-trips physical encounter locations and resumes a pending discard with identical forced relocation', () => {
  const campaign = { ...newCampaign('the-dunwich-legacy', ['joe'], 'standard'), scenarioIndex: 7 }
  campaign.results = campaignDefinition(campaign.id)
    .scenarios.slice(0, 7)
    .map((s) => ({
      scenario: s.id,
      outcome: { type: 'resolution' as const, resolution: 1 },
      xp: {},
    }))
  let state = throughSetup(startScenario(campaign, 1600, true))
  const investigator = state.investigators[0]!.id
  state = during(state, keep, {
    type: 'PutEncounterLocation',
    investigator,
    card: LOST_ENCOUNTER_LOCATIONS[0]!,
  })
  const location = Object.keys(state.locations).find((id) => printedCode(id) === '02324')!
  state = during(
    state,
    (s) => ({ ...s, investigators: s.investigators.map((i) => ({ ...i, location })) }),
    { type: 'Forced', trigger: { type: 'roundEnds' } },
  )
  expect(state.pending?.question.prompt).toBe('prompt.lost.decay')
  const raw = JSON.stringify(session(state, { base: state, inputs: [], marks: [] }, campaign))
  const restored = decodeSession(raw).state!
  expect(restored.locations[location]?.encounterCard).toEqual(LOST_ENCOUNTER_LOCATIONS[0])
  const input = { investigator: state.pending!.investigator, choice: 1 }
  const continued = applyInput(restored, input)
  expect(continued).toEqual(applyInput(state, input))
  expect(continued.locations[location]).toBeUndefined()
  expect(continued.investigators[0]?.location).toBe('02320')
  expect(continued.encounterDiscard.some((c) => c.kind === 'location' && c.code === '02324')).toBe(
    true,
  )
})
