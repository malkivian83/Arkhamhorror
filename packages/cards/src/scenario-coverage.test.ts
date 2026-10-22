import { describe, expect, it } from 'vitest'
import { newCampaign, startScenario } from './campaign'
import { allCampaigns } from './campaign-definition'
import { playRandomlyToEnd } from './scenario-testing'

// RR: "Game Setup", "End of the Game"; campaign guides: difficulty and player scaling.
describe('registered scenarios: complete legal games', () => {
  const team = ['daniela', 'joe', 'trish', 'dexter']
  for (const definition of allCampaigns()) {
    for (const [scenarioIndex, scenario] of definition.scenarios.entries()) {
      if (!scenario.build) continue
      for (const difficulty of ['easy', 'standard', 'hard', 'expert'] as const) {
        it.each([1, 2, 3, 4])(`${scenario.id}, ${difficulty}, %i investigators`, (players) => {
          const campaign = newCampaign(definition.id, team.slice(0, players), difficulty)
          campaign.scenarioIndex = scenarioIndex
          const seed = 101 + players
          const initial = startScenario(campaign, seed, players % 2 === 0)
          expect(initial.scenarioId).toBe(scenario.id)
          expect(initial.startingInvestigatorCount).toBe(players)
          playRandomlyToEnd(initial, seed)
        })
      }
    }
  }

  it('fails instead of accepting a game that exhausts the decision budget', () => {
    const initial = startScenario(newCampaign('brethren-of-ash', ['joe'], 'standard'), 1)
    expect(() => playRandomlyToEnd(initial, 1, 1)).toThrow('no resolution after 1 decisions')
  })

  it('fails when a pending question has no legal choice', () => {
    const initial = startScenario(newCampaign('brethren-of-ash', ['joe'], 'standard'), 1)
    initial.pending!.question.choices = []
    expect(() => playRandomlyToEnd(initial, 1)).toThrow('decision 0')
  })
})
