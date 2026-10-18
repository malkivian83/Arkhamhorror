import smoke433 from '../../../../docs-proyecto/evidencias/smoke-and-mirrors-433.json'
import queen807 from '../../../../docs-proyecto/evidencias/combate-queen-of-ash-807.json'
import queen955 from '../../../../docs-proyecto/evidencias/queen-of-ash-955.json'
import smoke1 from '../../../../docs-proyecto/evidencias/smoke-and-mirrors-1.json'
import duoSpreading from '../../../../docs-proyecto/evidencias/duo-normal-spreading-flames-286.json'
import duoSmoke from '../../../../docs-proyecto/evidencias/duo-normal-smoke-and-mirrors-1.json'
import duoQueen from '../../../../docs-proyecto/evidencias/duo-normal-queen-of-ash-23.json'
import teamSpreading from '../../../../docs-proyecto/evidencias/equipo-normal-spreading-flames-278.json'
import teamSmoke from '../../../../docs-proyecto/evidencias/equipo-normal-smoke-and-mirrors-1.json'
import teamQueen from '../../../../docs-proyecto/evidencias/equipo-normal-queen-of-ash-20.json'
import { applyInput, type GameState, type PlayerInput, type ScenarioOutcome } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { finishScenario, newCampaign, purchase, startScenario, type Campaign } from '../campaign'
import { eliteCount } from './smoke-and-mirrors'
import { validateDeck } from '../decks'

interface Recording {
  campaign: Campaign
  seed: number
  inputs: PlayerInput[]
  transcript: { prompt: string; label: string; params: unknown }[]
  outcome: ScenarioOutcome
  log: Campaign['log']
  purchases?: {
    investigator: string
    code: string
    options: { remove?: string; upgrade?: boolean }
  }[]
}
const files: Record<string, unknown> = {
  'smoke-and-mirrors-433': smoke433,
  'combate-queen-of-ash-807': queen807,
  'queen-of-ash-955': queen955,
  'smoke-and-mirrors-1': smoke1,
  'duo-normal-spreading-flames-286': duoSpreading,
  'duo-normal-smoke-and-mirrors-1': duoSmoke,
  'duo-normal-queen-of-ash-23': duoQueen,
  'equipo-normal-spreading-flames-278': teamSpreading,
  'equipo-normal-smoke-and-mirrors-1': teamSmoke,
  'equipo-normal-queen-of-ash-20': teamQueen,
}
const read = (name: string): Recording => files[name] as Recording
function play(r: Recording): GameState {
  let state = startScenario(r.campaign, r.seed)
  for (const [n, input] of r.inputs.entries()) {
    expect(state.pending?.investigator).toBe(input.investigator)
    const q = state.pending!.question
    const c = q.choices[input.choice]!
    expect({ prompt: q.prompt, label: c.label, params: c.params ?? null }).toEqual(r.transcript[n])
    state = applyInput(state, input)
  }
  expect(state.outcome).toEqual(r.outcome)
  expect(state.campaignLog).toEqual(r.log)
  return state
}
const smoke = read('smoke-and-mirrors-433')
const queenCombat = read('combate-queen-of-ash-807')
const queenClues = read('queen-of-ash-955')
const normal = [
  [
    'duo-normal-spreading-flames-286',
    'duo-normal-smoke-and-mirrors-1',
    'duo-normal-queen-of-ash-23',
  ],
  [
    'equipo-normal-spreading-flames-278',
    'equipo-normal-smoke-and-mirrors-1',
    'equipo-normal-queen-of-ash-20',
  ],
].map((files) => files.map(read))

describe('aceptación ampliada: objetivos completos, combate y equipos en normal', () => {
  it('Smoke completa los seis objetivos mediante decisiones legales desde su preparación aislada', () => {
    const end = play(smoke)
    expect(eliteCount(end)).toBe(6)
    expect(Object.values(end.locations).flatMap((l) => l.beneath ?? [])).toHaveLength(0)
    expect(end.victoryDisplay).toContain('12138')
    expect(end.underAct).toHaveLength(5)
    expect(end.campaignLog?.notes).toContain('discoveredWhereabouts')
  })
  it('Queen R1: continúa ese Smoke, paga las mejoras y derrota a Elokoss', () => {
    let campaign = finishScenario(smoke.campaign, play(smoke))
    for (const p of queenCombat.purchases ?? [])
      campaign = purchase(campaign, p.investigator, p.code, p.options)
    expect(campaign).toEqual(queenCombat.campaign)
    const end = play(queenCombat)
    expect(end.outcome).toEqual({ type: 'resolution', resolution: 1 })
    expect(end.victoryDisplay).toContain('12179')
    expect(end.campaignLog?.rewards).toContain('12181')
    expect(finishScenario(campaign, end).log.notes).toContain('campaignWon')
  })
  it('Queen R2: completa la rama de pistas desde la campaña original', () => {
    const prior = read('smoke-and-mirrors-1')
    expect(finishScenario(prior.campaign, play(prior))).toEqual(queenClues.campaign)
    const end = play(queenClues)
    expect(end.outcome).toEqual({ type: 'resolution', resolution: 2 })
    expect(Object.values(end.enemies).find((e) => e.code === '12179')?.leads).toBe(5)
    expect(end.campaignLog?.rewards).toContain('12181')
  })
  for (const [index, recordings] of normal.entries())
    it(`campaña completa en normal con equipo ${index + 1}, sin modificar estados ni resultados`, () => {
      const initial = recordings[0]!.campaign
      const members = initial.investigators.map((m) => ({ investigator: m.id, cards: m.deck }))
      let campaign = newCampaign(initial.id, members, 'standard')
      for (const m of campaign.investigators) {
        expect(
          validateDeck({ id: m.id, name: m.id, investigator: m.id, cards: m.deck }).problems,
        ).toEqual([])
      }
      for (const recording of recordings) {
        expect(campaign).toEqual(recording.campaign)
        campaign = finishScenario(campaign, play(recording))
      }
      expect(campaign.scenarioIndex).toBe(3)
      expect(campaign.results).toHaveLength(3)
      expect(campaign.results.at(-1)!.outcome).toEqual({ type: 'resolution', resolution: 3 })
      expect(campaign.log.notes).toContain('campaignWon')
    })
})
