import {
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  type GameState,
  type InvestigatorId,
  type Message,
} from '@lcg/engine'
import { actionFlags, basicTest, type BasicEvent } from './register'
const seekerAssets = (state: GameState, investigator: InvestigatorId) =>
  [...new Set(getInvestigator(state, investigator).hand)].filter((code) => {
    const def = playerCardDef(code)
    return def?.type === 'asset' && (def.classes ?? [def.class]).includes('seeker')
  })
const spec: BasicEvent = { action: 'investigate', replaceClue: true }
// Unearth the Ancients (0): choose a Seeker asset in hand; its printed cost is the
// difficulty. A success puts it into play instead of discovering clues; a Relic also draws.
registerPlayerCard({
  code: '04024',
  ...actionFlags(spec),
  canPlay: (state, investigator) =>
    getInvestigator(state, investigator).location !== null &&
    seekerAssets(state, investigator).length > 0,
  play: (state, investigator) => [
    {
      type: 'Ask',
      investigator,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.chooseCard',
        choices: seekerAssets(state, investigator).map((code) => {
          const def = playerCardDef(code)!
          const unearth: BasicEvent = {
            ...spec,
            difficulty: () => def.cost ?? 0,
            onSuccess: () => [
              { type: 'PutAssetIntoPlay', investigator, code, fromHand: true },
              ...(def.traits.includes('Relic')
                ? [{ type: 'DrawCards', investigator, amount: 1 } as Message]
                : []),
            ],
          }
          return {
            label: 'choice.card',
            params: { card: def.name },
            then: [basicTest(unearth, { state, investigator, code: '04024' })],
          }
        }),
      },
    },
  ],
})
