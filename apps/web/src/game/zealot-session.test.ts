import { newCampaign, startScenario } from '@lcg/cards'
import { applyInput, leadInvestigator, type EnemyCard } from '@lcg/engine'
import { choose, during, keep, spawnAt, throughSetup } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { decodeSession, session } from './session'

it('saves and restores the elected replacement lead without changing player order', () => {
  const campaign = newCampaign('night-of-the-zealot', ['joe', 'daniela', 'trish'], 'standard')
  let state = throughSetup(startScenario(campaign, 7))
  state = choose(state, 'choice.investigator')
  const order = state.investigators.map((i) => i.id)
  state = during(state, keep, { type: 'DefeatInvestigator', investigator: order[0]! })
  expect(state.pending?.question.prompt).toBe('prompt.chooseLead')
  state = choose(state, 'choice.investigator', { name: 'Trish Scarborough' })
  expect(leadInvestigator(state)?.name).toBe('Trish Scarborough')
  expect(state.investigators.map((i) => i.id)).toEqual(order)
  const raw = JSON.stringify(session(state, { base: state, inputs: [], marks: [] }, campaign))
  const restored = decodeSession(raw).state!
  expect(restored.leadInvestigatorId).toBe(state.leadInvestigatorId)
  expect(leadInvestigator(restored)?.name).toBe('Trish Scarborough')
  for (const lead of [42, 'unknown-investigator']) {
    const broken = JSON.parse(raw)
    broken.state.leadInvestigatorId = lead
    expect(() => decodeSession(JSON.stringify(broken))).toThrow()
  }
})

it('replays an old saved elimination without inserting a new decision into its history', () => {
  const campaign = newCampaign('night-of-the-zealot', ['joe', 'daniela', 'trish'], 'standard')
  let state = throughSetup(startScenario(campaign, 7))
  state = choose(state, 'choice.investigator')
  const id = state.pending!.investigator
  const minion: EnemyCard = {
    kind: 'enemy',
    code: '01160',
    name: 'Ghoul Minion',
    traits: ['Humanoid', 'Monster', 'Ghoul'],
    fight: 2,
    health: 2,
    evade: 2,
    damage: 1,
    horror: 1,
    keywords: [],
  }
  state = during(
    state,
    (s) => ({
      ...s,
      investigators: s.investigators.map((i) => (i.id === id ? { ...i, damage: i.health - 1 } : i)),
    }),
    spawnAt('01111', minion, id),
  )
  while (state.pending?.question.prompt === 'prompt.reaction') state = choose(state, 'choice.skip')
  const input = {
    investigator: id,
    choice: state.pending!.question.choices.findIndex((c) => c.label === 'action.resource'),
  }
  expect(applyInput(state, input).pending?.question.prompt).toBe('prompt.chooseLead')
  const base = JSON.parse(JSON.stringify(state)) as typeof state
  delete base.leadElectionVersion
  const legacy = applyInput(base, input)
  expect(legacy.pending?.question.prompt).not.toBe('prompt.chooseLead')
  const restored = decodeSession(
    JSON.stringify(session(legacy, { base, inputs: [input], marks: [] }, campaign)),
  )
  expect(restored.state).toEqual(legacy)
  expect(restored.state!.leadElectionVersion).toBeUndefined()
})

it('preserves the combined act/agenda without a doom threshold through save/load', () => {
  const campaign = { ...newCampaign('night-of-the-zealot', ['joe'], 'standard'), scenarioIndex: 2 }
  let s = throughSetup(startScenario(campaign, 7))
  s = during(s, (g) => ({ ...g, agendaIndex: 2 }), { type: 'AdvanceAgenda' })
  expect(s.agendas[0]?.doomThreshold).toBeNull()
  const loaded = decodeSession(
    JSON.stringify(session(s, { base: s, inputs: [], marks: [] }, null)),
  ).state!
  expect(loaded).toEqual(s)
  expect(loaded.agendas[0]?.doomThreshold).toBeNull()
})
