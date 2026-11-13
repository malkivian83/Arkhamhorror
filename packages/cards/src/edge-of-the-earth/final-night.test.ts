import { dispatch } from '@lcg/engine'
import { expect, it } from 'vitest'
import { currentScenario, newCampaign, startScenario } from '../campaign'
import { campaignDefinition } from '../campaign-definition'
import { EOTE_FINAL_NIGHT, EOTE_FATAL_MIRAGE, EOTE_HEART_ONE } from './ice-and-death-cards'
import { applyRestfulNightVisit, completeRestfulNight, restfulNight } from './restful-night'

function setup(guided = false) {
  const campaign = newCampaign('edge-of-the-earth', ['joe'], 'standard')
  const initial = startScenario(campaign, 44)
  const game = dispatch({ ...initial, pending: null, queue: [] }, { type: 'InitializeExpedition' })
  campaign.log = game.campaignLog!
  campaign.scenarioIndex = campaignDefinition(campaign.id).scenarios.findIndex(
    (s) => s.id === EOTE_FINAL_NIGHT,
  )
  if (guided) campaign.log.notes.push('edgeOfTheEarthGuidedToTunnel')
  return campaign
}

it.each([false, true])('Final Night permits three visits, four when guided: %s', (guided) => {
  // Campaign guide pp. 44–48.
  let campaign = setup(guided)
  expect(restfulNight(campaign)).toMatchObject({
    night: 'final',
    remaining: guided ? 4 : 3,
    offersMirage: true,
  })
  const id = campaign.investigators[0]!.id
  for (const partner of ['08719', '08715', '08722'] as const)
    campaign = applyRestfulNightVisit(campaign, { partner, target: { type: 'investigator', id } })
  if (guided) {
    expect(restfulNight(campaign)?.canContinue).toBe(false)
    campaign = applyRestfulNightVisit(campaign, { partner: '08721' })
  }
  expect(restfulNight(campaign)?.canContinue).toBe(true)
  expect(campaign.log.values['edgeOfTheEarthHeart:startingHand']).toBe(id)
  expect(campaign.log.values['edgeOfTheEarthHeart:startingResources']).toBe(id)
  expect(currentScenario(completeRestfulNight(campaign, 'peaks'))).toBe(EOTE_HEART_ONE)
  expect(currentScenario(completeRestfulNight(campaign, 'mirage'))).toBe(EOTE_FATAL_MIRAGE)
})

it('requires Kensler’s previous understanding and records the true nature of the miasma', () => {
  let campaign = setup()
  expect(restfulNight(campaign)?.options.some((o) => o.partner === '08720')).toBe(false)
  campaign.log.notes.push('edgeOfTheEarthKenslerUnderstanding')
  campaign = applyRestfulNightVisit(campaign, { partner: '08720' })
  expect(campaign.log.notes).toContain('edgeOfTheEarthKenslerTrueNature')
  expect(() => applyRestfulNightVisit(campaign, { partner: '08720' })).toThrow()
})

it.each([false, true])('the last mirage costs frost only after a previous visit: %s', (visited) => {
  let campaign = setup()
  if (visited) campaign.log.values.edgeOfTheEarthMirageVisits = '1'
  for (const partner of ['08719', '08715', '08722'] as const)
    campaign = applyRestfulNightVisit(campaign, {
      partner,
      target: { type: 'investigator', id: campaign.investigators[0]!.id },
    })
  const before = campaign.log.chaosTokens.filter((t) => t === 'frost').length
  const next = completeRestfulNight(campaign, 'mirage')
  expect(next.log.chaosTokens.filter((t) => t === 'frost')).toHaveLength(before + Number(visited))
})
