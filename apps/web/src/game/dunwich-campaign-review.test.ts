import {
  newCampaign,
  startScenario,
  finishScenario,
  campaignScenarios,
  currentScenario,
  canPlayNext,
  type Campaign,
} from '@lcg/cards'
import { applyInput, type GameState, type Difficulty } from '@lcg/engine'
import { during, keep, throughSetup } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { decodeSession, session } from './session'

const openings = ['extracurricular-activity', 'the-house-always-wins']
function restore(campaign: Campaign) {
  return decodeSession(JSON.stringify(session(null, null, campaign))).campaign!
}
it('restores the order selected when the campaign starts at The House Always Wins', () => {
  const c = newCampaign('the-dunwich-legacy', ['joe'], 'standard', 120, [], [], openings[1])
  const prepared = startScenario(c, 120, true)
  const next = finishScenario(c, { ...prepared, outcome: { type: 'resolution', resolution: 1 } })
  expect(next.results[0]?.scenario).toBe('the-house-always-wins')
  expect(currentScenario(restore(next))).toBe('extracurricular-activity')
})

function finishWithResolution(state: GameState, n: number) {
  let s = during(state, keep, {
    type: 'EndScenario',
    outcome: { type: 'resolution', resolution: n },
  })
  for (let step = 0; !s.outcome && s.pending && step < 5000; step++) {
    const p = s.pending
    // Accept the first eligible recipient of each optional story reward.
    s = applyInput(s, { investigator: p.investigator, choice: 0 })
  }
  expect(s.outcome).not.toBeNull()
  return s
}
// These are narrative transition fixtures, not simulated victories: legal play is
// independently exercised by the scenario tests and the real-deck playthroughs.
const cases = openings.flatMap((opening) =>
  [1, 2, 3, 4].flatMap((players) =>
    (['easy', 'standard', 'hard', 'expert'] as Difficulty[]).map((difficulty) => ({
      opening,
      players,
      difficulty,
    })),
  ),
)
it.each(cases)(
  'preserves the complete narrative and save chain: $opening, $players players, $difficulty',
  ({ opening, players, difficulty }) => {
    let c = newCampaign(
      'the-dunwich-legacy',
      ['joe', 'daniela', 'trish', 'dexter'].slice(0, players),
      difficulty,
      510,
      [],
      [],
      opening,
    )
    const order = campaignScenarios(c).map((s) => s.id)
    for (let stage = 0; stage < 8; stage++) {
      expect(currentScenario(c)).toBe(order[stage])
      expect(canPlayNext(c)).toBe(true)
      let state = throughSetup(startScenario(c, 510 + stage, true))
      for (
        let setup = 0;
        state.pending &&
        state.pending.question.prompt !== 'prompt.chooseAction' &&
        !state.outcome &&
        setup < 1000;
        setup++
      ) {
        const p = state.pending
        state = applyInput(state, { investigator: p.investigator, choice: 0 })
      }
      if (stage === 7)
        expect(
          state.chaosBag.filter(
            (t) => t === { easy: -3, standard: -5, hard: -6, expert: -7 }[difficulty],
          ),
        ).toHaveLength(1)
      if (stage === 6) {
        expect(state.acts[1]?.code).toBe('02278')
        expect(state.doom).toBe(0)
      }
      const resolution =
        state.scenarioId === 'extracurricular-activity' || state.scenarioId === 'blood-on-the-altar'
          ? 2
          : state.scenarioId === 'undimensioned-and-unseen'
            ? 2
            : 1
      const ended = finishWithResolution(state, resolution)
      c = restore(finishScenario(c, ended))
      expect(c.results.map((r) => r.scenario)).toEqual(order.slice(0, stage + 1))
      if (stage === 1)
        expect(
          c.log.notes.some((n) =>
            ['dunwichArmitageRescued', 'dunwichArmitageKidnapped'].includes(n),
          ),
        ).toBe(true)
      if (stage === 4) {
        expect(c.log.notes).toContain('dunwichSilasRestored')
        expect(
          Object.values(c.log.investigators).some((r) => r.storyAssets.includes('02219')),
        ).toBe(true)
      }
      if (stage === 5) {
        expect(c.log.values.dunwichBroodEscaped).toBe('0')
        expect(
          Object.values(c.log.investigators).every((r) => !r.storyAssets.includes('02219')),
        ).toBe(true)
      }
      if (stage === 6) expect(c.log.notes).toContain('dunwichEnteredGate')
    }
    expect(currentScenario(c)).toBeNull()
    expect(canPlayNext(c)).toBe(false)
    expect(c.log.notes).toContain('dunwichClosedRift')
    expect(c.log.notes).toContain('campaignWon')
  },
)

it('keeps legacy opening order and rejects histories that disagree with the selected opening', () => {
  const c = newCampaign('the-dunwich-legacy', ['joe'], 'standard')
  const next = finishScenario(c, {
    ...startScenario(c, 400),
    outcome: { type: 'resolution', resolution: 2 },
  })
  expect(currentScenario(restore(next))).toBe('the-house-always-wins')
  const raw = JSON.parse(JSON.stringify(session(null, null, next)))
  raw.campaign.results[0].scenario = 'the-house-always-wins'
  expect(() => decodeSession(JSON.stringify(raw))).toThrow()
})
