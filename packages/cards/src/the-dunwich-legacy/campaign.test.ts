import { describe, expect, it } from 'vitest'
import {
  campaignScenarios,
  canPlayNext,
  currentScenario,
  newCampaign,
  startScenario,
} from '../campaign'
import { allCampaigns, campaignDefinition } from '../campaign-definition'
import { THE_DUNWICH_LEGACY } from './campaign'

// Revised Dunwich guide, p. 2: campaign setup and difficulty bags.
describe('The Dunwich Legacy: campaign foundation', () => {
  const definition = campaignDefinition(THE_DUNWICH_LEGACY.id)

  // Revised guide, p. 3: Rice or Morgan may be investigated first.
  it.each(['extracurricular-activity', 'the-house-always-wins'])(
    'persists %s as the first scenario and plays the other next',
    (first) => {
      const campaign = newCampaign(definition.id, ['joe'], 'standard', 1, [], [], first)
      const restored = JSON.parse(JSON.stringify(campaign)) as typeof campaign
      const other =
        first === 'extracurricular-activity' ? 'the-house-always-wins' : 'extracurricular-activity'
      expect(currentScenario(restored)).toBe(first)
      expect(currentScenario({ ...restored, scenarioIndex: 1 })).toBe(other)
      expect(currentScenario({ ...restored, scenarioIndex: 2 })).toBe('the-miskatonic-museum')
      expect(campaignScenarios(restored).map((s) => s.id)).toEqual([
        first,
        other,
        ...THE_DUNWICH_LEGACY.scenarios.slice(2),
      ])
      expect(new Set(campaignScenarios(restored).map((s) => s.id)).size).toBe(8)
      expect(definition.scenarios[0]?.id).toBe('extracurricular-activity')
      expect(canPlayNext(restored)).toBe(true)
    },
  )

  it('rejects other opening scenarios and leaves other campaigns unchanged', () => {
    expect(() =>
      newCampaign(definition.id, ['joe'], 'standard', 1, [], [], 'blood-on-the-altar'),
    ).toThrow('Escenario inicial no permitido')
    expect(() =>
      newCampaign('the-path-to-carcosa', ['joe'], 'standard', 1, [], [], 'the-house-always-wins'),
    ).toThrow('Escenario inicial no permitido')
    expect(currentScenario(newCampaign('the-path-to-carcosa', ['joe'], 'standard'))).toBe(
      'curtain-call',
    )
    expect(definition.prologue).toEqual({
      title: 'story.dunwich.prologueTitle',
      body: 'story.dunwich.prologue',
    })
  })

  it('registers eight scenarios, excluding interludes and epilogue', () => {
    expect(allCampaigns().filter((c) => c.id === definition.id)).toHaveLength(1)
    expect(definition.standalone).not.toBe(true)
    expect(definition.scenarios.map((s) => s.id)).toEqual([
      'extracurricular-activity',
      'the-house-always-wins',
      'the-miskatonic-museum',
      'the-essex-county-express',
      'blood-on-the-altar',
      'undimensioned-and-unseen',
      'where-doom-awaits',
      'lost-in-time-and-space',
    ])
  })

  it.each([
    ['easy', [1, 1, 0, 0, 0, -1, -1, -1, -2, -2]],
    ['standard', [1, 0, 0, -1, -1, -1, -2, -2, -3, -4]],
    ['hard', [0, 0, 0, -1, -1, -2, -2, -3, -3, -4, -5]],
    ['expert', [0, -1, -1, -2, -2, -3, -3, -4, -4, -5, -6, -8]],
  ] as const)('uses the exact %s starting bag', (difficulty, numbers) => {
    expect(definition.chaosBags[difficulty]).toEqual([
      ...numbers,
      'skull',
      'skull',
      'cultist',
      'autoFail',
      'elderSign',
    ])
  })

  it.each([1, 2, 3, 4])(
    'creates a campaign for %i players without enabling unfinished scenarios',
    (players) => {
      const campaign = newCampaign(
        definition.id,
        ['daniela', 'joe', 'trish', 'dexter'].slice(0, players),
        'standard',
      )
      expect(campaign.investigators).toHaveLength(players)
      expect(currentScenario(campaign)).toBe('extracurricular-activity')
      expect(campaign.log.notes).toEqual([])
      expect(campaign.log.chaosTokens).toEqual([])
      expect(campaign.results).toEqual([])
      expect(canPlayNext(campaign)).toBe(true)
      expect(startScenario(campaign, 1).scenarioId).toBe('extracurricular-activity')
      for (let scenarioIndex = 4; scenarioIndex < 8; scenarioIndex++) {
        const pending = { ...campaign, scenarioIndex }
        expect(canPlayNext(pending)).toBe(false)
        expect(() => startScenario(pending, 1)).toThrow('Escenario no disponible')
      }
    },
  )
})
