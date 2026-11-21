import { newCampaign, startScenario } from '@lcg/cards'
import { dispatch, newValley } from '@lcg/engine'
import { expect, it } from 'vitest'
import { decodeSession, session } from './session'
import { markOf } from './undo'

// Guía de La fiesta del Valle de la Cicuta, p. 70: el registro debe sobrevivir a guardar y cargar.
it('guarda y carga el estado del Valle en la campaña y en la mesa', () => {
  const campaign = newCampaign('brethren-of-ash', ['joe'], 'standard')
  const base = startScenario(campaign, 5)
  const valley = dispatch(
    { ...base, queue: [], pending: null },
    { type: 'InitializeValley' },
    { type: 'SetValleyTime', day: 2, time: 'night' },
    { type: 'ChangeRelationship', resident: 'riverHawthorne', amount: 2 },
    { type: 'RecordResidentNote', resident: 'simeonAtwood', note: 'thePlanIsUnderway', marks: 2 },
    { type: 'CrossOutResident', resident: 'gideonMizrah' },
    { type: 'SurveyArea', area: 'eastwickBog' },
  ).campaignLog!.valley!
  expect(valley).not.toEqual(newValley())
  const state = { ...base, campaignLog: { ...base.campaignLog!, valley } }
  const data = session(
    state,
    { base: state, inputs: [], marks: [markOf(state)] },
    { ...campaign, log: { ...campaign.log, valley } },
  )
  const loaded = decodeSession(JSON.stringify(data))
  expect(loaded).toEqual(data)
  expect(loaded.campaign!.log.valley).toEqual(valley)
  expect(loaded.state!.campaignLog!.valley!.residents.gideonMizrah.crossedOut).toBe(true)
})
