import {
  getInvestigator,
  playerCardBehavior,
  playerCardDef,
  registerPlayerCard,
  type Choice,
  type Message,
} from '@lcg/engine'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'
import { atLocation } from '../dunwich-pilot/helpers'
// RR: Searching; Playing Cards. Prepared for the Worst (2): an investigator at your location
// searches the top 9 cards of their deck for a Weapon asset, adds it to their hand or plays it
// paying its cost, and shuffles. The searching investigator makes the choices; Dead Ends keeps
// the common search handling.
const code = '09036'
registerPlayerCard({
  code,
  play: (s, by) =>
    ask(
      by,
      atLocation(s, by).map((other) => ({
        label: 'choice.investigator',
        params: { name: other.name },
        target: { type: 'investigator', id: other.id },
        then: [continuation(code, other.id, 'search')],
      })),
      true,
    ),
  effect: (s, who, step) => {
    if (step !== 'search') return []
    const me = getInvestigator(s, who)
    const top = me.deck.slice(0, 9)
    const shuffle: Message = { type: 'ShuffleDeck', investigator: who }
    if (top.some((c) => playerCardBehavior(c)?.cancelsSearch))
      return [{ type: 'SearchDeck', investigator: who, top: 9, traits: ['Weapon'], to: 'hand' }]
    const weapons = [...new Set(top)].filter((c) => {
      const def = playerCardDef(c)
      return def?.type === 'asset' && !def.weakness && def.traits.includes('Weapon')
    })
    if (!weapons.length) return [shuffle]
    return [
      {
        type: 'Ask',
        investigator: who,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.searchToHand',
          choices: weapons.flatMap((c): Choice[] => [
            {
              label: 'choice.takeCard',
              params: { card: cardName(c) },
              then: [{ type: 'TakeFromDeck', investigator: who, code: c, to: 'hand' }, shuffle],
            },
            ...((playerCardDef(c)?.cost ?? 0) <= me.resources
              ? [
                  {
                    label: 'choice.preparedPlayWeapon',
                    params: { card: cardName(c) },
                    then: [
                      { type: 'TakeFromDeck', investigator: who, code: c, to: 'play' },
                      shuffle,
                    ] satisfies Message[],
                  },
                ]
              : []),
          ]),
        },
      },
    ]
  },
})
