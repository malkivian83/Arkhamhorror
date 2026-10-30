import {
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  type CardCode,
  type GameState,
  type InvestigatorId,
  type Message,
} from '@lcg/engine'
import { actionFlags, basicTest, type BasicEvent } from '../basic-events/register'
import { continuation } from '../dunwich-pilot/effects'

// RR: Investigate, "up to", Put into Play. Unearth the Ancients (2): choose up to 2 Seeker
// assets in hand (copies count separately); the difficulty is their combined printed cost. A
// success puts them into play one at a time instead of discovering clues; each Relic draws 1.
const code = '08039'
const spec: BasicEvent = { action: 'investigate', replaceClue: true }
const seekerAssets = (state: GameState, investigator: InvestigatorId, taken: CardCode[] = []) => {
  const hand = [...getInvestigator(state, investigator).hand]
  for (const c of taken) hand.splice(hand.indexOf(c), 1)
  return [...new Set(hand)].filter((c) => {
    const def = playerCardDef(c)
    return def?.type === 'asset' && (def.classes ?? [def.class]).includes('seeker')
  })
}
const test = (state: GameState, investigator: InvestigatorId, chosen: CardCode[]): Message =>
  basicTest(
    {
      ...spec,
      difficulty: () => chosen.reduce((n, c) => n + (playerCardDef(c)?.cost ?? 0), 0),
      onSuccess: () =>
        chosen.flatMap((c): Message[] => [
          { type: 'PutAssetIntoPlay', investigator, code: c, fromHand: true },
          ...(playerCardDef(c)!.traits.includes('Relic')
            ? [{ type: 'DrawCards', investigator, amount: 1 } as Message]
            : []),
        ]),
    },
    { state, investigator, code },
  )
const pick = (state: GameState, investigator: InvestigatorId, taken: CardCode[]): Message[] => [
  {
    type: 'Ask',
    investigator,
    question: {
      kind: 'chooseOne',
      prompt: 'prompt.chooseCard',
      choices: [
        ...seekerAssets(state, investigator, taken).map((c) => ({
          label: 'choice.card',
          params: { card: playerCardDef(c)!.name },
          then: [continuation(code, investigator, 'chosen', { cards: [...taken, c].join(',') })],
        })),
        ...(taken.length
          ? [{ label: 'choice.skip', then: [test(state, investigator, taken)] }]
          : []),
      ],
    },
  },
]
registerPlayerCard({
  code,
  ...actionFlags(spec),
  canPlay: (state, investigator) =>
    getInvestigator(state, investigator).location !== null &&
    seekerAssets(state, investigator).length > 0,
  play: (state, investigator) => pick(state, investigator, []),
  effect: (state, investigator, step, data) => {
    if (step !== 'chosen') return []
    const chosen = String(data.cards).split(',')
    return chosen.length >= 2 || seekerAssets(state, investigator, chosen).length === 0
      ? [test(state, investigator, chosen)]
      : pick(state, investigator, chosen)
  },
})
