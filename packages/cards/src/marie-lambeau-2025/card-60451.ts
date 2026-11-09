// RR: Triggered Abilities, Limits, Drawing Cards, Chaos Tokens, Healing.
import {
  getInvestigator,
  playerCardDef,
  registerInvestigator,
  registerPlayerCard,
} from '@lcg/engine'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'
import { MARIE } from './codes'

/** Cards in `after` that were not in `before` (multiset difference). */
export function drawnCards(before: string[], after: string[]): string[] {
  const left = [...before]
  return after.filter((code) => {
    const at = left.indexOf(code)
    if (at < 0) return true
    left.splice(at, 1)
    return false
  })
}

// Marie Lambeau (Investigator Starter Deck): [reaction] after damage is placed on her, draw 2
// cards and discard 1 of them (limit once per phase). [elder_sign]: +0; on success, heal 1 damage.
registerInvestigator({
  code: MARIE,
  reactions: (_s, t, self) =>
    t.type === 'afterTakeDamage' && t.investigator === self.id && t.damage > 0
      ? [
          {
            key: 'marie2025:draw',
            investigator: self.id,
            label: 'ability.marie2025Draw',
            limit: { per: 'phase' },
            then: [continuation(MARIE, self.id, 'draw')],
          },
        ]
      : [],
  elderSign: (_s, self) => ({
    modifier: 0,
    onSuccess: [{ type: 'Heal', investigator: self.id, damage: 1, horror: 0 }],
  }),
})

// Investigator effects use the same serializable continuation dispatch as player cards.
registerPlayerCard({
  code: MARIE,
  effect: (s, by, step, data) => {
    const hand = getInvestigator(s, by).hand
    if (step === 'draw')
      return [
        { type: 'DrawCards', investigator: by, amount: 2 },
        continuation(MARIE, by, 'discard', { hand: hand.join(',') }),
      ]
    if (step !== 'discard') return []
    const before = String(data.hand ?? '')
    // RR Weakness: a weakness cannot be chosen for a hand discard.
    const drawn = drawnCards(before ? before.split(',') : [], hand).filter(
      (code) => !playerCardDef(code)?.weakness,
    )
    return ask(
      by,
      [...new Set(drawn)].map((card) => ({
        label: 'choice.discard',
        params: { card: cardName(card) },
        target: { type: 'hand' as const, code: card },
        then: [{ type: 'DiscardFromHand' as const, investigator: by, card }],
      })),
    )
  },
})
