import { getInvestigator, registerPlayerCard } from '@lcg/engine'
import { ask, continuation, destinations, moveChoices } from '../dunwich-pilot/effects'

// RR: Move designator (a move action: entry costs and move-action triggers apply); Healing.
// The healing follows only a move that actually happened, after arrival and engagement.
export function registerPhysicalFitness(code: string, heal: number): void {
  registerPlayerCard({
    code,
    canPlay: (state, investigator) => destinations(state, investigator).length > 0,
    play: (state, investigator) => {
      const from = getInvestigator(state, investigator).location ?? ''
      return ask(
        investigator,
        moveChoices(state, investigator).map((choice) => ({
          ...choice,
          then: [
            ...choice.then.map((m) => (m.type === 'MoveTo' ? { ...m, moveAction: true } : m)),
            continuation(code, investigator, 'heal', { from }),
          ],
        })),
      )
    },
    effect: (state, investigator, _step, data) =>
      getInvestigator(state, investigator).location !== data.from
        ? [{ type: 'Heal', investigator, damage: heal, horror: 0 }]
        : [],
  })
}
