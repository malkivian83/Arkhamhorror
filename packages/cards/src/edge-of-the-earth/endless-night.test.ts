import { dispatch } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { currentScenario, newCampaign, startScenario } from '../campaign'
import { campaignDefinition } from '../campaign-definition'
import { foundAnotherWay } from './forbidden-peaks'
import { EOTE_CITY, EOTE_ENDLESS_NIGHT, EOTE_FATAL_MIRAGE } from './ice-and-death-cards'
import { applyRestfulNightVisit, completeRestfulNight, restfulNight } from './restful-night'

// Interlude II: Endless Night (Campaign Guide, pp. 31–35).
function setup(found = false) {
  const campaign = newCampaign('edge-of-the-earth', ['joe', 'daniela'], 'standard')
  const state = startScenario(campaign, 44)
  const initialized = dispatch(
    { ...state, pending: null, queue: [] },
    { type: 'InitializeExpedition' },
  )
  campaign.scenarioIndex = campaignDefinition('edge-of-the-earth').scenarios.findIndex(
    ({ id }) => id === EOTE_ENDLESS_NIGHT,
  )
  campaign.log = initialized.campaignLog!
  if (found) campaign.log.notes.push(foundAnotherWay)
  const [id] = campaign.investigators.map(({ id }) => id)
  return { campaign, id: id!, target: { type: 'investigator' as const, id: id! } }
}

describe('Endless Night', () => {
  it.each([false, true])('allows three visits, or four after another way (found: %s)', (found) => {
    const { campaign } = setup(found)
    expect(restfulNight(campaign)).toMatchObject({
      night: 'endless',
      remaining: found ? 4 : 3,
      offersMirage: false,
      mirageFrost: false,
    })
  })

  it('keeps its own visits and bonuses for City of the Elder Things', () => {
    const { campaign, id, target } = setup()
    campaign.log.values.edgeOfTheEarthRestfulNightVisits = '08715,08722'
    const options = restfulNight(campaign)!.options
    expect(options.find(({ partner }) => partner === '08715')?.effect).toBe('cityStartingHand')
    const visited = applyRestfulNightVisit(campaign, { partner: '08715', target })
    expect(visited.log.values['edgeOfTheEarthCity:startingHand']).toBe(id)
    expect(visited.log.values['edgeOfTheEarthPeaks:startingHand']).toBeUndefined()
    expect(visited.log.values.edgeOfTheEarthEndlessNightVisits).toBe('08715')
  })

  it('receives Kensler only after she shared her research, and scouts the city with Ellsworth', () => {
    const { campaign } = setup()
    const effect = (partner: string) =>
      restfulNight(campaign)!.options.find((option) => option.partner === partner)?.effect
    expect(effect('08720')).toBeUndefined()
    campaign.log.notes.push('edgeOfTheEarthKenslerResearch')
    expect(effect('08720')).toBe('understanding')
    const visited = applyRestfulNightVisit(campaign, { partner: '08720' })
    expect(visited.log.notes).toContain('edgeOfTheEarthKenslerUnderstanding')
    const scouted = applyRestfulNightVisit(visited, { partner: '08721' })
    expect(scouted.log.notes).toContain('edgeOfTheEarthScoutedCityOutskirts')
  })

  it('continues to the city, marking the optional mirage as skipped', () => {
    let { campaign } = setup()
    for (const partner of ['08719', '08722', '08715'] as const)
      campaign = applyRestfulNightVisit(campaign, {
        partner,
        target: { type: 'investigator', id: campaign.investigators[0]!.id },
      })
    expect(restfulNight(campaign)?.canContinue).toBe(true)
    expect(() => completeRestfulNight(campaign, 'mirage')).toThrow()
    const next = completeRestfulNight(campaign, 'peaks')
    expect(currentScenario(next)).toBe(EOTE_CITY)
    expect(next.results.at(-1)).toMatchObject({ scenario: EOTE_FATAL_MIRAGE, skipped: true })
  })

  it('returns to the mirage after a previous visit at the cost of 1 frost token', () => {
    let { campaign } = setup()
    campaign.log.values.edgeOfTheEarthMirageVisits = '1'
    for (const partner of ['08719', '08722', '08715'] as const)
      campaign = applyRestfulNightVisit(campaign, {
        partner,
        target: { type: 'investigator', id: campaign.investigators[0]!.id },
      })
    expect(restfulNight(campaign)).toMatchObject({ offersMirage: true, mirageFrost: true })
    const frost = campaign.log.chaosTokens.filter((token) => token === 'frost').length
    const next = completeRestfulNight(campaign, 'mirage')
    expect(currentScenario(next)).toBe(EOTE_FATAL_MIRAGE)
    expect(next.log.chaosTokens.filter((token) => token === 'frost')).toHaveLength(frost + 1)
  })

  it('offers the door without frost when three names are crossed off', () => {
    const { campaign } = setup()
    for (const code of ['08714', '08717', '08718'] as const)
      campaign.log.expedition!.partners[code]!.status = 'eliminated'
    expect(restfulNight(campaign)).toMatchObject({ offersMirage: true, mirageFrost: false })
  })
})
