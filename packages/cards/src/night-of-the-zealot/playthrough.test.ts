import { applyInput, type GameState, type PlayerInput } from '@lcg/engine'
import { expect, it } from 'vitest'
import recording from '../../../../docs-proyecto/evidencias/el-encuentro-3.json'
import { finishScenario, startScenario, type Campaign } from '../campaign'

const campaign = recording.campaign as Campaign
const inputs = recording.inputs as PlayerInput[]
function replay(until = inputs.length): GameState {
  let state = startScenario(campaign, recording.seed)
  for (const [n, input] of inputs.slice(0, until).entries()) {
    const selected = state.pending!.question.choices[input.choice]!
    expect({
      prompt: state.pending!.question.prompt,
      label: selected.label,
      params: selected.params ?? null,
    }).toEqual(recording.transcript[n])
    state = applyInput(state, input)
    if (n === 20) state = JSON.parse(JSON.stringify(state)) as GameState
    expect(state.outcome || state.pending).toBeTruthy()
  }
  return state
}

// RR: "Campaign Play", "Victory Display". Guía revisada ES pp. 2–3.
// Entradas normales con Joe, mazo inicial, fácil y semilla 3; no se altera el estado.
it('plays The Gathering from setup to R1, including save/load, victory XP, Lita and trauma', () => {
  const state = replay()
  expect(state.outcome).toEqual(recording.outcome)
  expect(state.campaignLog).toEqual(recording.log)
  expect(state.victoryDisplay).toContain('01116')
  const next = finishScenario(campaign, state)
  expect(next.scenarioIndex).toBe(1)
  expect(next.log.investigators['12004']).toMatchObject({
    xp: 5,
    mentalTrauma: 1,
    storyAssets: ['01117'],
  })
})

it('forks the same legal victory into R2 without granting Lita or mental trauma', () => {
  const at = recording.transcript.findIndex((step) => step.label === 'story.theGathering.burn')
  expect(at).toBeGreaterThan(0)
  let state = replay(at)
  const choice = state.pending!.question.choices.findIndex(
    (c) => c.label === 'story.theGathering.keep',
  )
  state = applyInput(state, { investigator: state.pending!.investigator, choice })
  while (state.pending && !state.outcome)
    state = applyInput(state, { investigator: state.pending.investigator, choice: 0 })
  expect(state.outcome).toEqual({ type: 'resolution', resolution: 2 })
  expect(state.campaignLog!.investigators['12004']).toMatchObject({
    xp: 6,
    mentalTrauma: 0,
    storyAssets: [],
  })
  expect(state.campaignLog!.notes).toContain('zealotHouseStanding')
})
