import { startScenario, type Campaign } from '@lcg/cards'
import { applyInput, type GameState, type PlayerInput } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import spreading from '../../../../docs-proyecto/evidencias/spreading-flames-57.json'
import smoke from '../../../../docs-proyecto/evidencias/smoke-and-mirrors-1.json'
import queen from '../../../../docs-proyecto/evidencias/queen-of-ash-23.json'
import { decodeSession, replay, session } from './session'
import { markOf, undoTarget, type UndoKind } from './undo'

const recordings = [spreading, smoke, queen] as unknown as {
  campaign: Campaign
  seed: number
  inputs: PlayerInput[]
}[]
describe('guardado y deshacer sobre los recorridos completos de aceptación', () => {
  for (const recording of recordings)
    it(`escenario ${recording.campaign.scenarioIndex + 1}`, () => {
      const base = startScenario(recording.campaign, recording.seed)
      const states: GameState[] = [base]
      for (const input of recording.inputs) states.push(applyInput(states.at(-1)!, input))
      const important = new Set([states.length - 1])
      const seen = new Set<string>()
      states.forEach((state, n) => {
        const key = `${state.pending?.question.prompt}:${state.actIndex}:${state.round}`
        if (
          !seen.has(key) &&
          [
            'prompt.reaction',
            'prompt.assignDamage',
            'prompt.assignHorror',
            'prompt.story',
            'prompt.advanceAct',
            'prompt.armitageBearer',
          ].includes(state.pending?.question.prompt ?? '')
        )
          important.add(n)
        seen.add(key)
        if (n > 0 && states[n - 1]!.actIndex !== state.actIndex) important.add(n)
      })
      for (const point of important) {
        const inputs = recording.inputs.slice(0, point)
        const history = { base, inputs, marks: states.slice(0, point + 1).map(markOf) }
        const loaded = decodeSession(
          JSON.stringify(session(states[point]!, history, recording.campaign)),
        )
        for (const kind of ['step', 'action', 'turn', 'round'] as UndoKind[]) {
          const target = undoTarget(loaded.history!.marks, kind)
          if (target === null) continue
          const restored = replay(loaded.history!.base, inputs.slice(0, target))
          expect(restored.state).toEqual(states[target])
          // Includes RNG, committed cards, damage assignments, story choices and
          // outcomes. Reapplying the removed choices must also match completely.
          expect(replay(restored.state, inputs.slice(target)).state).toEqual(states[point])
        }
      }
    })
})
