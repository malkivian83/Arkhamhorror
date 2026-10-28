import { getInvestigator, playerCardDef, registerPlayerCard } from '@lcg/engine'
import { ask, cardName } from '../dunwich-pilot/effects'
import { SCAVENGING } from './codes'

// RR: Triggered Abilities, Investigate, Discard Pile. Scavenging: [reaction] after you
// successfully investigate by 2 or more, exhaust it: choose an [[Item]] card in your discard
// pile and add it to your hand.
registerPlayerCard({
  code: SCAVENGING,
  reactions: (state, trigger, self) => {
    if (
      trigger.type !== 'afterSkillTest' ||
      trigger.investigator !== self.owner ||
      !trigger.succeeded ||
      trigger.kind !== 'investigate' ||
      trigger.margin < 2 ||
      self.exhausted
    )
      return []
    const items = [...new Set(getInvestigator(state, self.owner).discard)].filter((code) =>
      playerCardDef(code)?.traits.includes('Item'),
    )
    if (!items.length) return []
    return [
      {
        key: self.id + ':scavenge',
        investigator: self.owner,
        label: 'ability.scavenging',
        then: [
          { type: 'ExhaustAsset', asset: self.id },
          ...ask(
            self.owner,
            items.map((code) => ({
              label: 'choice.takeCard',
              params: { card: cardName(code) },
              then: [{ type: 'DiscardToHand', investigator: self.owner, code }],
            })),
            true,
          ),
        ],
      },
    ]
  },
})
