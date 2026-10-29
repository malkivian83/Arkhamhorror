import { newCampaign, startScenario } from '@lcg/cards'
import { applyInput } from '@lcg/engine'
import { during, keep, throughSetup } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { decodeSession, session } from './session'

it.each(['extracurricular-activity', 'the-house-always-wins'])(
  'saves, replays and resumes the Chapter Two variant with %s first',
  (opening) => {
    const campaign = newCampaign(
      'the-dunwich-legacy',
      ['joe'],
      'standard',
      1,
      [],
      [],
      opening,
      'chapter-two',
    )
    const base = startScenario(campaign, 7)
    const input = { investigator: base.pending!.investigator, choice: 0 }
    const state = applyInput(base, input)
    const data = session(state, { base, inputs: [input], marks: [] }, campaign)
    const raw = JSON.stringify(data)
    const restored = decodeSession(raw)
    expect(restored.state).toEqual(state)
    expect(restored.campaign?.encounterSetVariant).toBe('chapter-two')
    expect(decodeSession(raw, false).state).toEqual(state)
    const next = { investigator: state.pending!.investigator, choice: 0 }
    expect(applyInput(restored.state!, next)).toEqual(applyInput(state, next))
    expect(decodeSession(JSON.stringify(session(null, null, campaign))).campaign).toEqual(campaign)

    const altered = structuredClone(data)
    delete altered.campaign!.encounterSetVariant
    expect(() => decodeSession(JSON.stringify(altered))).toThrow()
    altered.campaign!.encounterSetVariant = 'unavailable' as 'chapter-two'
    expect(() => decodeSession(JSON.stringify(altered))).toThrow('incompatible')
  },
)

it('keeps legacy campaign saves without a variant readable', () => {
  const campaign = newCampaign('the-dunwich-legacy', ['joe'], 'standard')
  const state = startScenario(campaign, 7)
  const data = session(state, { base: state, inputs: [], marks: [] }, campaign)
  const restored = decodeSession(JSON.stringify(data))
  expect(restored.state).toEqual(state)
  expect(restored.campaign).toEqual(campaign)
})

it('restores a pending Cosmic Evils choice and resolves it identically', () => {
  const campaign = newCampaign(
    'the-dunwich-legacy',
    ['joe'],
    'standard',
    1,
    [],
    [],
    undefined,
    'chapter-two',
  )
  let state = throughSetup(startScenario(campaign, 7))
  const cosmic = state.encounterDeck.find((c) => c.code === '12124')!
  state = during(state, keep, {
    type: 'ResolveEncounterCard',
    investigator: state.investigators[0]!.id,
    card: cosmic,
  })
  expect(state.pending?.question.choices[0]?.label).toBe('choice.placeDoom')
  const data = session(state, { base: state, inputs: [], marks: [] }, campaign)
  const restored = decodeSession(JSON.stringify(data))
  const input = { investigator: state.pending!.investigator, choice: 0 }
  expect(applyInput(restored.state!, input)).toEqual(applyInput(state, input))
  expect(applyInput(restored.state!, input).doom).toBe(state.doom + 1)
})
