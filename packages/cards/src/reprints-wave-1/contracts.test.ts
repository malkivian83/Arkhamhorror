import { playerCardBehavior, playerCardDef } from '@lcg/engine'
import { expect, it } from 'vitest'
import { starterDeckList, validateDeck } from '../decks'
import '../index'
import approvals from './approvals.json'
// RR: Card Identity; Deckbuilding. The printing is independent; the title limit is shared.
it.each(approvals.cards)(
  'preserves mechanical data and portable behavior for $code',
  ({ code, behaviorSource }) => {
    const actual = playerCardDef(code)!,
      source = playerCardDef(behaviorSource)!
    for (const field of [
      'name',
      'type',
      'class',
      'traits',
      'cost',
      'xp',
      'icons',
      'slots',
      'unique',
      'health',
      'sanity',
      'fast',
      'uses',
    ] as const) {
      const a = actual[field],
        b = source[field]
      expect(a ?? (field === 'xp' ? 0 : undefined), code + ':' + field).toEqual(
        b ?? (field === 'xp' ? 0 : undefined),
      )
    }
    const behavior = playerCardBehavior(code)!,
      original = playerCardBehavior(behaviorSource)!
    expect(behavior.code).toBe(code)
    for (const key of Object.keys(original).filter((k) => k !== 'code'))
      expect(behavior[key as keyof typeof behavior]).toBe(original[key as keyof typeof original])
  },
)
it('counts three different printings together for the title limit', () => {
  const deck = starterDeckList('joe', 'j', 'J')
  deck.cards = deck.cards.filter((code) => playerCardDef(code)?.name !== 'Unexpected Courage')
  deck.cards.push('12094', '01093', '01593')
  expect(validateDeck(deck).problems.some((p) => p.key === 'deck.problem.tooManyCopies')).toBe(true)
})
