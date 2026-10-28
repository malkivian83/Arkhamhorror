import { finishScenario, newCampaign, startScenario, validateDeck, type Campaign } from '@lcg/cards'
import { applyInput, type PlayerInput, type ScenarioOutcome } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import foundation from '../../../../docs-proyecto/evidencias/gala-foundation-136.json'
import miskatonic from '../../../../docs-proyecto/evidencias/gala-miskatonic-4.json'
import syndicate from '../../../../docs-proyecto/evidencias/gala-syndicate-19.json'
import lodge from '../../../../docs-proyecto/evidencias/gala-lodge-57.json'
import kingsport from '../../../../docs-proyecto/evidencias/gala-kingsport-130.json'
import teamOne from '../../../../docs-proyecto/evidencias/gala-miskatonic-121.json'
import teamTwo from '../../../../docs-proyecto/evidencias/gala-miskatonic-131.json'
import { decodeSession, replay, session } from './session'
import { markOf, undoTarget } from './undo'

interface Recording {
  campaign: Campaign
  seed: number
  inputs: PlayerInput[]
  transcript: { prompt: string; label: string; params: unknown }[]
  outcome: ScenarioOutcome
  log: unknown
}
const recordings = [
  foundation,
  miskatonic,
  syndicate,
  lodge,
  kingsport,
  teamOne,
  teamTwo,
] as unknown as Recording[]

// Full replays include repeated save/undo reconstruction and need more than 5s under load.
// AHC80 ES pp. 11–19, 24: complete games, interludes, faction objectives and XP.
describe('Gala: victorias completas desde una preparación legal en normal', () => {
  for (const [index, r] of recordings.entries())
    it(`recorrido ${index + 1}, semilla ${r.seed}: decisiones, registro, guardado y deshacer`, () => {
      const members = r.campaign.investigators.map((i) => ({ investigator: i.id, cards: i.deck }))
      expect(newCampaign(r.campaign.id, members, 'standard', r.seed)).toEqual(r.campaign)
      for (const m of members)
        expect(validateDeck({ id: m.investigator, name: m.investigator, ...m }).problems).toEqual(
          [],
        )
      const base = startScenario(r.campaign, r.seed)
      const states = [base]
      for (const [n, input] of r.inputs.entries()) {
        const state = states.at(-1)!
        expect(state.pending?.investigator).toBe(input.investigator)
        const q = state.pending!.question
        const c = q.choices[input.choice]!
        expect({ prompt: q.prompt, label: c.label, params: c.params ?? null }).toEqual(
          r.transcript[n],
        )
        states.push(applyInput(state, input))
      }
      const end = states.at(-1)!
      expect(end.outcome).toEqual(r.outcome)
      expect(end.outcome).toEqual({ type: 'resolution', resolution: index < 5 ? index + 2 : 3 })
      expect(end.campaignLog).toEqual(r.log)
      expect(end.actIndex).toBe(1)
      expect(end.scenarioMeta?.jewelObjective).toBe(1)
      const finished = finishScenario(r.campaign, end)
      expect(finished.results).toHaveLength(1)
      expect(finished.results[0]!.score).toBeGreaterThanOrEqual(0)
      const important = new Set([states.length - 1])
      states.forEach((s, n) => {
        if (n && states[n - 1]!.actIndex !== s.actIndex) important.add(n)
        if (s.pending?.question.prompt.startsWith('prompt.gala.')) important.add(n)
      })
      for (const point of important) {
        const inputs = r.inputs.slice(0, point)
        const history = { base, inputs, marks: states.slice(0, point + 1).map(markOf) }
        const loaded = decodeSession(JSON.stringify(session(states[point]!, history, r.campaign)))
        expect(loaded.state).toEqual(states[point])
        for (const kind of ['step', 'action', 'turn', 'round'] as const) {
          const target = undoTarget(loaded.history!.marks, kind)
          if (target === null) continue
          const restored = replay(loaded.history!.base, inputs.slice(0, target)).state
          expect(restored).toEqual(states[target])
          expect(replay(restored, inputs.slice(target)).state).toEqual(states[point])
        }
      }
      expect(decodeSession(JSON.stringify(session(null, null, finished))).campaign).toEqual(
        finished,
      )
    }, 30_000)
})
