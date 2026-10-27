import {
  activeInvestigators,
  registerTreachery,
  type Choice,
  type GameState,
  type InvestigatorId,
  type Message,
} from '@lcg/engine'
import { THE_BEYOND_CODES } from './beyond-codes'

const STAMP = 'dunwich:terrorPhase'
const COUNT = 'dunwich:terrorCount'
type CardType = 'asset' | 'event' | 'skill'
const TYPES: CardType[] = ['asset', 'event', 'skill']
const stamp = (state: GameState) => `${state.round}:${state.phase}`
const count = (state: GameState) =>
  state.scenarioMeta?.[STAMP] === stamp(state) ? Number(state.scenarioMeta[COUNT] ?? 0) : 0

function chooseTypes(
  state: GameState,
  investigator: InvestigatorId,
  remaining: number,
  selected: CardType[] = [],
): Message[] {
  const choices: Choice[] = TYPES.filter((type) => !selected.includes(type)).map((type) => {
    const next = [...selected, type]
    return {
      label: `choice.cardType.${type}`,
      then:
        remaining > 1
          ? chooseTypes(state, investigator, remaining - 1, next)
          : activeInvestigators(state).flatMap((i) =>
              next.map((cardType): Message => ({
                type: 'DiscardCardsOfType',
                investigator: i.id,
                cardType,
                all: true,
                includeWeaknesses: true,
              })),
            ),
    }
  })
  return [
    {
      type: 'Ask',
      investigator,
      question: { kind: 'chooseOne', prompt: 'prompt.chooseCardType', choices },
    },
  ]
}

registerTreachery({
  code: THE_BEYOND_CODES.terrorFromBeyond,
  // RR "Cancel": canceling revelation does not undo having drawn this copy.
  onDraw: (state) => [
    { type: 'SetScenarioMeta', key: STAMP, value: stamp(state) },
    { type: 'SetScenarioMeta', key: COUNT, value: count(state) + 1 },
  ],
  revelation: (state, investigator) => chooseTypes(state, investigator, count(state) > 1 ? 2 : 1),
})
