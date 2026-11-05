import { dispatch } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { currentScenario, newCampaign, startScenario } from '../campaign'
import { applyRestfulNightVisit, completeRestfulNight, restfulNight } from './restful-night'
import { fledToMountains } from './checkpoint'
import { startingFrostRemoved } from './opening'

function setup(fled = false) {
  const campaign = newCampaign('edge-of-the-earth', ['joe', 'daniela'], 'standard')
  const state = startScenario(campaign, 44)
  const initialized = dispatch(
    { ...state, pending: null, queue: [] },
    { type: 'InitializeExpedition' },
  )
  campaign.scenarioIndex = 5
  campaign.log = initialized.campaignLog!
  if (fled) campaign.log.notes.push(fledToMountains)
  const [id] = campaign.investigators.map(({ id }) => id)
  return { campaign, id: id!, target: { type: 'investigator' as const, id: id! } }
}

describe('Restful Night campaign rules', () => {
  it.each([false, true])('persists the allowance without repeating a visit (fled: %s)', (fled) => {
    const { campaign, target } = setup(fled)
    expect(restfulNight(campaign)?.remaining).toBe(fled ? 4 : 3)
    const advised = applyRestfulNightVisit(campaign, { partner: '08719', target })
    const restored = JSON.parse(JSON.stringify(advised))
    expect(restfulNight(restored)?.remaining).toBe(fled ? 3 : 2)
    expect(restfulNight(restored)?.options.some(({ partner }) => partner === '08719')).toBe(false)
    expect(() => applyRestfulNightVisit(restored, { partner: '08719', target })).toThrow()
    expect(advised.log.investigators[target.id]?.xp).toBe(1)
    expect(campaign.log.investigators[target.id]?.xp).toBe(0)
  })

  it('only offers feasible visits and counts three crossed-out names for Fatal Mirage', () => {
    const { campaign } = setup()
    const options = restfulNight(campaign)?.options.map(({ partner }) => partner)
    expect(options).not.toContain('08714')
    expect(options).not.toContain('08716')
    expect(options).not.toContain('08717')
    expect(restfulNight(campaign)?.offersMirage).toBe(false)
    for (const code of ['08714', '08717', '08718'] as const)
      campaign.log.expedition!.partners[code]!.status = 'eliminated'
    expect(restfulNight(campaign)?.offersMirage).toBe(true)
    expect(
      restfulNight(campaign)?.options.find(({ partner }) => partner === '08714'),
    ).toMatchObject({ effect: 'memorial', card: '08733' })
  })

  it('assigns each memorial to one active investigator without adding it to the purchased deck', () => {
    const { campaign, id, target } = setup()
    campaign.log.expedition!.partners['08718']!.status = 'eliminated'
    const given = applyRestfulNightVisit(campaign, { partner: '08718', target })
    expect(given.log.investigators[id]?.storyAssets).toEqual(['08730'])
    expect(given.investigators).toEqual(campaign.investigators)
  })

  it('validates physical copies when returning chosen weaknesses', () => {
    const { campaign, id, target } = setup()
    campaign.log.investigators[id]!.storyAssets = ['08724', '08726', '08724']
    expect(() =>
      applyRestfulNightVisit(campaign, {
        partner: '08714',
        target,
        weaknesses: ['08726', '08726'],
      }),
    ).toThrow()
    const clean = applyRestfulNightVisit(campaign, {
      partner: '08714',
      target,
      weaknesses: ['08724', '08724'],
    })
    expect(clean.log.investigators[id]?.storyAssets).toEqual(['08726'])
  })

  it('heals one point of trauma or partner damage and keeps the other values', () => {
    const { campaign, id, target } = setup()
    campaign.log.investigators[id]!.physicalTrauma = 2
    campaign.log.expedition!.partners['08720']!.horror = 2
    const healed = applyRestfulNightVisit(campaign, { partner: '08717', target })
    const soothed = applyRestfulNightVisit(healed, {
      partner: '08716',
      target: { type: 'partner', id: '08720' },
    })
    expect(soothed.log.investigators[id]?.physicalTrauma).toBe(1)
    expect(soothed.log.expedition?.partners['08720']?.horror).toBe(1)
  })

  it('removes a persisted frost token or a starting frost token and preserves research notes', () => {
    const { campaign } = setup()
    const cleared = applyRestfulNightVisit(campaign, { partner: '08718' })
    expect(cleared.log.values[startingFrostRemoved]).toBe('1')
    campaign.log.chaosTokens = ['cultist', 'frost']
    const briefed = applyRestfulNightVisit(applyRestfulNightVisit(campaign, { partner: '08718' }), {
      partner: '08720',
    })
    expect(briefed.log.chaosTokens).toEqual(['cultist'])
    expect(briefed.log.values[startingFrostRemoved]).toBeUndefined()
    expect(briefed.log.notes).toContain('edgeOfTheEarthKenslerResearch')
  })

  it('records the selected investigators for the next scenario’s separate bonuses', () => {
    const { campaign, id, target } = setup()
    const hand = applyRestfulNightVisit(campaign, { partner: '08715', target })
    const resources = applyRestfulNightVisit(hand, { partner: '08722', target })
    expect(resources.log.values['edgeOfTheEarthPeaks:startingHand']).toBe(id)
    expect(resources.log.values['edgeOfTheEarthPeaks:startingResources']).toBe(id)
  })
})

it('unlocks the next route only after the visits, with the mirage requiring three losses', () => {
  const { campaign, target } = setup()
  expect(() => completeRestfulNight(campaign, 'peaks')).toThrow()
  for (const partner of ['08714', '08717', '08718'] as const)
    campaign.log.expedition!.partners[partner]!.status = 'eliminated'
  const visited = (['08714', '08717', '08718'] as const).reduce(
    (state, partner) => applyRestfulNightVisit(state, { partner, target }),
    campaign,
  )
  expect(restfulNight(visited)).toMatchObject({
    remaining: 0,
    offersMirage: true,
    canContinue: true,
  })
  expect(currentScenario(completeRestfulNight(visited, 'mirage'))).toBe(
    'edge-of-the-earth-fatal-mirage',
  )
  const peaks = completeRestfulNight(visited, 'peaks')
  expect(currentScenario(peaks)).toBe('edge-of-the-earth-forbidden-peaks')
  expect(peaks.results.at(-1)).toMatchObject({ skipped: true, xp: {} })
})
