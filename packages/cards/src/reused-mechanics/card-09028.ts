import {
  canPlayByEffect,
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  type GameState,
} from '@lcg/engine'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'
import { atLocation } from '../dunwich-pilot/helpers'

// RR: Parley; Playing Cards (by a card effect); Costs. Motivational Speech: choose an
// investigator at your location; that investigator may play an Ally asset from their hand,
// reducing its cost by 3.
const code = '09028'
const allies = (state: GameState, investigator: string) =>
  [...new Set(getInvestigator(state, investigator).hand)].filter(
    (card) =>
      playerCardDef(card)?.type === 'asset' &&
      !!playerCardDef(card)?.traits.includes('Ally') &&
      canPlayByEffect(state, investigator, card, 'hand', false, 3),
  )
registerPlayerCard({
  code,
  parley: true,
  play: (state, investigator) =>
    ask(
      investigator,
      atLocation(state, investigator).map((other) => ({
        label: 'choice.investigator',
        params: { name: other.name },
        target: { type: 'investigator', id: other.id },
        then: [continuation(code, investigator, 'ally', { target: other.id })],
      })),
      true,
    ),
  effect: (state, _investigator, _step, data) => {
    const target = String(data.target)
    const playable = allies(state, target)
    return playable.length
      ? ask(
          target,
          [
            ...playable.map((card) => ({
              label: 'ability.playCard',
              params: { card: cardName(card) },
              target: { type: 'hand' as const, code: card },
              then: [
                {
                  type: 'PlayCard' as const,
                  investigator: target,
                  code: card,
                  discount: 3,
                  byEffect: true,
                },
              ],
            })),
            { label: 'choice.skip', then: [] },
          ],
          true,
        )
      : []
  },
})
