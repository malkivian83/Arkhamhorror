import { describe, expect, it } from 'vitest'
import { canPlayNext, currentScenario, newCampaign, startScenario } from '../campaign'
import { allCampaigns, campaignDefinition } from '../campaign-definition'
import { THE_PATH_TO_CARCOSA } from './campaign'

// Guía revisada de El camino a Carcosa, pp. 2–3: orden y preparación de campaña.
describe('The Path to Carcosa: campaign foundation', () => {
  const definition = campaignDefinition(THE_PATH_TO_CARCOSA.id)

  it('registers the eight original scenarios in guide order, without interludes as scenarios', () => {
    expect(allCampaigns().filter((c) => c.id === definition.id)).toHaveLength(1)
    expect(definition.standalone).not.toBe(true)
    expect(definition.scenarios.map((s) => s.id)).toEqual([
      'curtain-call',
      'the-last-king',
      'echoes-of-the-past',
      'the-unspeakable-oath',
      'a-phantom-of-truth',
      'the-pallid-mask',
      'black-stars-rise',
      'dim-carcosa',
    ])
  })

  it.each([
    ['easy', [1, 1, 0, 0, 0, -1, -1, -1, -2, -2]],
    ['standard', [1, 0, 0, -1, -1, -1, -2, -2, -3, -4]],
    ['hard', [0, 0, 0, -1, -1, -2, -2, -3, -3, -4, -5]],
    ['expert', [0, -1, -1, -2, -2, -3, -3, -4, -4, -5, -6, -8]],
  ] as const)(
    'uses the exact %s bag, including three skulls and no other campaign symbols',
    (difficulty, numbers) => {
      expect(definition.chaosBags[difficulty]).toEqual([
        ...numbers,
        'skull',
        'skull',
        'skull',
        'autoFail',
        'elderSign',
      ])
    },
  )

  it.each([1, 2, 3, 4])(
    'creates a campaign for %i investigators; scenarios I–V are playable',
    (players) => {
      const campaign = newCampaign(
        definition.id,
        ['daniela', 'joe', 'trish', 'dexter'].slice(0, players),
        'standard',
      )
      expect(campaign.investigators).toHaveLength(players)
      expect(currentScenario(campaign)).toBe('curtain-call')
      expect(campaign.results).toEqual([])
      expect(campaign.log.notes).toEqual([])
      expect(campaign.log.chaosTokens).toEqual([])
      expect(canPlayNext(campaign)).toBe(true)
      expect(startScenario(campaign, 1).scenarioId).toBe('curtain-call')
      expect(startScenario({ ...campaign, scenarioIndex: 1 }, 1).scenarioId).toBe('the-last-king')
      expect(startScenario({ ...campaign, scenarioIndex: 2 }, 1).scenarioId).toBe(
        'echoes-of-the-past',
      )
      expect(startScenario({ ...campaign, scenarioIndex: 3 }, 1).scenarioId).toBe(
        'the-unspeakable-oath',
      )
      expect(startScenario({ ...campaign, scenarioIndex: 4 }, 1).scenarioId).toBe(
        'a-phantom-of-truth',
      )
      for (const [scenarioIndex, scenario] of definition.scenarios.entries()) {
        if (scenarioIndex <= 4) continue
        const pending = { ...campaign, scenarioIndex }
        expect(canPlayNext(pending)).toBe(false)
        expect(() => startScenario(pending, 1)).toThrow(`Escenario no disponible: ${scenario.id}`)
      }
    },
  )
})
