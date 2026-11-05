import { dispatch } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { currentScenario, newCampaign, purchaseOptions, startScenario } from '../campaign'
import { disappearance, disappearanceResult, resolveDisappearance } from './checkpoint'

function checkpoint(shelter: number, seeded = true) {
  const campaign = newCampaign('edge-of-the-earth', ['joe'], 'standard')
  const opening = startScenario(campaign, 44)
  const initialized = dispatch(
    { ...opening, pending: null, queue: [] },
    { type: 'InitializeExpedition' },
  )
  const expedition = initialized.campaignLog!.expedition!
  expedition.camp = { location: '08502', shelter }
  if (seeded) expedition.disappearanceSeed = 123
  expedition.partners['08714']!.status = 'eliminated'
  expedition.partners['08720']!.status = 'resolute'
  expedition.partners['08720']!.horror = 2
  campaign.log.expedition = expedition
  campaign.scenarioIndex = 1
  return campaign
}

// Campaign guide, Checkpoint I: The Disappearance.
describe('The Disappearance', () => {
  it.each([true, false])(
    'draws once from surviving partners, including for legacy saves (%s)',
    (seeded) => {
      const campaign = checkpoint(4, seeded)
      const before = disappearance(campaign)!
      expect(before.missing).toHaveLength(4)
      expect(before.missing).not.toContain('08714')
      expect(disappearance(JSON.parse(JSON.stringify(campaign)))).toEqual(before)
      expect(campaign.log.expedition!.partners['08720']).toMatchObject({
        status: 'resolute',
        horror: 2,
      })
    },
  )

  it.each(['search', 'leave'] as const)(
    'persists the %s branch without awarding experience twice',
    (decision) => {
      const campaign = checkpoint(0)
      const next = resolveDisappearance(campaign, decision)
      expect(disappearance(next)).toBeNull()
      expect(() => resolveDisappearance(next, decision)).toThrow()
      expect(disappearanceResult(next)?.body).toContain(
        decision === 'search' ? 'disappearanceSearch' : 'disappearanceLeave',
      )
      expect(currentScenario(next)).toBe(
        decision === 'search' ? 'ice-and-death-part-2' : 'ice-and-death-checkpoint-2',
      )
      expect(next.log.expedition!.partners['08720']).toMatchObject({
        status: decision === 'search' ? 'missing' : 'eliminated',
        horror: 2,
      })
      expect(next.results).toEqual(
        decision === 'search'
          ? []
          : [
              {
                scenario: 'ice-and-death-part-2',
                skipped: true,
                outcome: { type: 'noResolution' },
                xp: {},
              },
            ],
      )
      expect(next.log.investigators).toEqual(campaign.log.investigators)
      expect(purchaseOptions(next, next.investigators[0]!.id)).toEqual([])
    },
  )

  it('skips the search when shelter protects everyone', () => {
    const campaign = checkpoint(8)
    expect(disappearance(campaign)).toMatchObject({ missing: [], choices: ['leave'] })
    expect(() => resolveDisappearance(campaign, 'search')).toThrow()
    expect(resolveDisappearance(campaign, 'leave').log.expedition).toEqual(campaign.log.expedition)
  })
})
