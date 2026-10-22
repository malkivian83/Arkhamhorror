import {
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  type Choice,
  type GameState,
  type InvestigatorId,
  type Message,
} from '@lcg/engine'
import { actionFlags, elite, targets, testChoices, type BasicEvent } from './register'

type Discarded = { code: string; asset?: string }
// Item assets taking up at least 1 hand slot, from hand or from your play area.
function items(state: GameState, investigator: InvestigatorId): Discarded[] {
  const eligible = (code: string) => {
    const def = playerCardDef(code)
    return (
      def?.type === 'asset' && def.traits.includes('Item') && (def.slots ?? []).includes('hand')
    )
  }
  return [
    ...[...new Set(getInvestigator(state, investigator).hand)]
      .filter(eligible)
      .map((code) => ({ code })),
    ...Object.values(state.assets)
      .filter((a) => a.owner === investigator && eligible(a.code))
      .map((a) => ({ code: a.code, asset: a.id })),
  ]
}

// Act of Desperation, "Catch!" and Unconventional Method: discard such an Item as an
// additional cost; +X equal to its printed cost, and an extra effect if it was in play.
const CARDS: [
  string,
  BasicEvent,
  ((investigator: InvestigatorId, x: number) => Message[]) | null,
][] = [
  [
    '05037',
    { action: 'fight', extraDamage: 1, tags: ['tactic', 'gambit'] },
    (investigator, x) => [{ type: 'GainResources', investigator, amount: x }],
  ],
  ['11086', { action: 'evade', tags: ['tactic', 'trick'] }, null],
  [
    '11087',
    { action: 'investigate', tags: ['insight', 'tactic'] },
    (investigator) => [{ type: 'DiscoverClues', investigator, amount: 1 }],
  ],
]
for (const [code, spec, bonus] of CARDS)
  registerPlayerCard({
    code,
    ...actionFlags(spec),
    canPlay: (state, investigator) =>
      getInvestigator(state, investigator).location !== null &&
      items(state, investigator).length > 0 &&
      (spec.action === 'investigate' || targets(spec, state, investigator).length > 0),
    play: (state, investigator) => [
      {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseCard',
          choices: items(state, investigator).map((item): Choice => {
            const x = playerCardDef(item.code)!.cost ?? 0
            const fromPlay = item.asset !== undefined
            const full: BasicEvent = {
              ...spec,
              modifier: x,
              onSuccess: (_ctx, enemy) =>
                !fromPlay
                  ? []
                  : code === '11086'
                    ? elite(enemy!)
                      ? []
                      : [{ type: 'EnemyStaysExhausted', enemy: enemy!.id }]
                    : bonus!(investigator, x),
            }
            return {
              label: fromPlay ? 'choice.discardFromPlay' : 'choice.discardFromHand',
              params: { card: playerCardDef(item.code)!.name },
              ...(item.asset ? { target: { type: 'asset' as const, id: item.asset } } : {}),
              then: [
                item.asset
                  ? { type: 'DiscardAsset', asset: item.asset }
                  : { type: 'DiscardFromHand', investigator, card: item.code },
                ...testChoices(full, { state, investigator, code }),
              ],
            }
          }),
        },
      },
    ],
  })
