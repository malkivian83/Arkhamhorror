// RR: Discard Piles, Reaction Opportunities, Uses, Costs, Your Turn.
import { registerPlayerCard, playerCardDef } from '@lcg/engine'
import { reaction } from '../core-2026/cards'
export function registerDiscardReaction(code: string): void {
  if (code === '11083') {
    registerPlayerCard({
      code,
      skillModifier: (_s, _a, t) => (t.skill === 'intellect' ? 1 : 0),
      reactions: (s, t, a) =>
        t.type === 'afterHandDiscard' &&
        t.investigator === a.owner &&
        s.activeTurn === a.owner &&
        !a.exhausted
          ? [
              reaction(a, 'ability.gainResource', [
                { type: 'ExhaustAsset', asset: a.id },
                { type: 'GainResources', investigator: a.owner, amount: 1 },
              ]),
            ]
          : [],
    })
    return
  }
  if (code !== '11089') throw Error('Unreviewed discard reaction')
  registerPlayerCard({
    code,
    limitTitle: true,
    reactions: (_s, t, a) =>
      t.type === 'afterHandDiscard' && t.investigator === a.owner && !a.exhausted
        ? [
            reaction(
              a,
              'choice.chargedCharge',
              [
                { type: 'ExhaustAsset', asset: a.id },
                { type: 'AddUses', asset: a.id, amount: 1 },
              ],
              { n: 1 },
            ),
          ]
        : [],
    abilities: (_s, a, by) =>
      a.uses <= 0
        ? []
        : [
            {
              key: a.id + ':cash',
              label: 'choice.chargedGain',
              params: { n: a.uses, card: playerCardDef(code)!.name },
              actions: 0,
              provokes: false,
              costs: [{ type: 'DiscardAsset', asset: a.id }],
              then: [{ type: 'GainResources', investigator: by, amount: a.uses }],
            },
          ],
  })
}
