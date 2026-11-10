import { dispatch } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import {
  canAddCarnevale,
  canPlayNext,
  currentScenario,
  deckIssues,
  finishScenario,
  newCampaign,
  purchase,
  purchaseOptions,
  removableCards,
  startScenario,
} from '../campaign'
import {
  disappearance,
  disappearanceResult,
  resolveDisappearance,
  resolveExpeditionAttack,
} from './checkpoint'

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
    },
  )

  // Guide, p. 2: each part is its own game. FAQ 1.18: replace an exiled card with
  // a level 0 card at no cost until the deck reaches its legal size.
  it.each(['search', 'leave'] as const)(
    'repairs an exiled card and spends XP before starting the next part (%s)',
    (decision) => {
      let campaign = newCampaign('edge-of-the-earth', ['daniela'], 'standard')
      const id = campaign.investigators[0]!.id
      const replacement = removableCards(campaign, id)[0]!
      campaign.log.investigators[id]!.xp = 2
      campaign = purchase(campaign, id, '02271', { remove: replacement })
      const opening = startScenario(campaign, 44)
      const ending = dispatch(
        {
          ...opening,
          pending: null,
          queue: [],
          investigators: opening.investigators.map((i) => ({
            ...i,
            deck: i.deck.filter((card) => card !== '02271'),
            discard: [...i.discard, '02271'],
          })),
        },
        { type: 'InitializeExpedition' },
        { type: 'RecordExpeditionCamp', location: '08503', shelter: 2 },
        { type: 'ExileCard', investigator: id, code: '02271' },
        { type: 'EarnExperience', amount: 3 },
        { type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 }, told: true },
      )
      const finished = finishScenario(campaign, ending)
      let next = resolveDisappearance(finished, decision)
      if (decision === 'leave') next = resolveExpeditionAttack(next, 'fight')
      expect(deckIssues(next).map(({ problem }) => problem.key)).toContain('deck.problem.size')
      expect(canPlayNext(next)).toBe(false)
      expect(purchaseOptions(next, id)).toContainEqual(
        expect.objectContaining({ code: replacement, cost: 0, needsRemoval: false }),
      )
      next = purchase(next, id, replacement)
      expect(next.log.investigators[id]!.xp).toBe(3)
      next = purchase(next, id, '02271', { remove: replacement })
      expect(next.log.investigators[id]!.xp).toBe(1)
      expect(canPlayNext(next)).toBe(true)
      expect(startScenario(next, 45).scenarioId).toBe(
        decision === 'search' ? 'ice-and-death-part-2' : 'ice-and-death-part-3',
      )
      // Enough XP to insert a side story, but this is still the same split scenario.
      next.log.investigators[id]!.xp = 3
      expect(canAddCarnevale(next)).toBe(false)
    },
  )

  it('skips the search when shelter protects everyone', () => {
    const campaign = checkpoint(8)
    expect(disappearance(campaign)).toMatchObject({ missing: [], choices: ['leave'] })
    expect(() => resolveDisappearance(campaign, 'search')).toThrow()
    expect(resolveDisappearance(campaign, 'leave').log.expedition).toEqual(campaign.log.expedition)
  })
})
