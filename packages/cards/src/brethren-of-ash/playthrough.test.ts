import spreading from '../../../../docs-proyecto/evidencias/spreading-flames-57.json'
import smoke from '../../../../docs-proyecto/evidencias/smoke-and-mirrors-1.json'
import queen from '../../../../docs-proyecto/evidencias/queen-of-ash-66.json'
import { applyInput, type PlayerInput, type ScenarioOutcome } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { finishScenario, newCampaign, startScenario, type Campaign } from '../campaign'

interface Recording {
  campaign: Campaign
  seed: number
  inputs: PlayerInput[]
  transcript: { prompt: string; label: string; params: unknown }[]
  outcome: ScenarioOutcome
  log: Campaign['log']
}
const recordings = [spreading, smoke, queen] as unknown as Recording[]

describe('aceptación: partidas completas con entradas normales', () => {
  for (const recording of recordings)
    it(`${recording.campaign.scenarioIndex + 1}: semilla ${recording.seed}`, () => {
      let state = startScenario(recording.campaign, recording.seed)
      recording.inputs.forEach((input, n) => {
        const selected = state.pending!.question.choices[input.choice]!
        expect({
          prompt: state.pending!.question.prompt,
          label: selected.label,
          params: selected.params ?? null,
        }).toEqual(recording.transcript[n])
        state = applyInput(state, input)
        expect(state.outcome || state.pending).toBeTruthy()
      })
      expect(state.outcome).toEqual(recording.outcome)
      expect(state.campaignLog).toEqual(recording.log)
    })

  it('enlaza las tres partidas sin parchear estados, mazos, bolsa, registro ni resultados', () => {
    let campaign = newCampaign('brethren-of-ash', ['joe'], 'easy')
    for (const recording of recordings) {
      expect(campaign).toEqual(recording.campaign)
      const ended = recording.inputs.reduce(
        (state, input) => applyInput(state, input),
        startScenario(campaign, recording.seed),
      )
      campaign = finishScenario(campaign, ended)
    }
    expect(campaign.scenarioIndex).toBe(3)
    expect(campaign.results.map((r) => r.outcome)).toEqual([
      { type: 'resolution', resolution: 2 },
      { type: 'noResolution' },
      { type: 'resolution', resolution: 3 },
    ])
    expect(campaign.log.notes).toContain('campaignWon')
  })

  it('Spreading Flames permite marcharse tras derrotar al perseguidor', () => {
    const recording = recordings[0]!
    const fork = recording.transcript.findIndex(
      (entry) => entry.label === 'story.spreadingFlames.stay',
    )
    expect(fork).toBeGreaterThan(0)
    let game = recording.inputs
      .slice(0, fork)
      .reduce((s, input) => applyInput(s, input), startScenario(recording.campaign, recording.seed))
    const go = game.pending!.question.choices.findIndex(
      (c) => c.label === 'story.spreadingFlames.go',
    )
    game = applyInput(game, { investigator: game.pending!.investigator, choice: go })
    while (game.pending && !game.outcome)
      game = applyInput(game, { investigator: game.pending.investigator, choice: 0 })
    expect(game.outcome).toEqual({ type: 'resolution', resolution: 3 })
    expect(game.campaignLog?.notes).toContain('universityBurned')
  })

  it('Spreading Flames permite retirarse desde el último acto antes de la victoria', () => {
    const recording = recordings[0]!
    let game = startScenario(recording.campaign, recording.seed)
    for (const input of recording.inputs) {
      if (
        game.actIndex === 3 &&
        game.pending?.question.choices.some((c) => c.label === 'ability.resign')
      )
        break
      game = applyInput(game, input)
    }
    const resign = game.pending!.question.choices.findIndex((c) => c.label === 'ability.resign')
    expect(resign).toBeGreaterThanOrEqual(0)
    game = applyInput(game, { investigator: game.pending!.investigator, choice: resign })
    while (game.pending && !game.outcome)
      game = applyInput(game, { investigator: game.pending.investigator, choice: 0 })
    expect(game.investigators[0]?.resigned).toBe(true)
    expect(game.outcome).toEqual({ type: 'noResolution' })
  })

  for (const size of [1, 2, 3, 4])
    it(`derrota y continuidad de ${size} investigadores mediante decisiones legales`, () => {
      let campaign = newCampaign(
        'brethren-of-ash',
        ['joe', 'trish', 'daniela', 'isabelle'].slice(0, size),
        'expert',
      )
      for (const seed of [9, 10, 11]) {
        let game = startScenario(campaign, seed)
        for (let n = 0; !game.outcome && n < 1500; n++) {
          expect(game.pending).not.toBeNull()
          const end = game.pending!.question.choices.findIndex((c) => c.label === 'action.endTurn')
          game = applyInput(game, {
            investigator: game.pending!.investigator,
            choice: Math.max(0, end),
          })
        }
        expect(game.outcome).toEqual({ type: 'noResolution' })
        campaign = finishScenario(campaign, game)
      }
      expect(campaign.log.notes).toContain('campaignLost')
      expect(campaign.investigators.every((i) => campaign.log.investigators[i.id]?.killed)).toBe(
        true,
      )
    })
})
