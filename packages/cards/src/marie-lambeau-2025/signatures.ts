// RR: Fast, Costs, Uses (Replenish), Weakness, Threat Area, Activated Abilities.
import {
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  registerTreachery,
  type Asset,
  type GameState,
  type InvestigatorId,
} from '@lcg/engine'
import { ask, cardName } from '../dunwich-pilot/effects'
import { CALLED_TO_GUINEE, GRAND_MERES_CHARM } from './codes'

const charges = (a: Asset) => {
  const uses = playerCardDef(a.code)?.uses
  return uses && ['charge', 'charges'].includes(uses.type) ? uses.count : 0
}

/** Assets at the investigator's location that can replenish a charge (below their printed uses). */
export function replenishable(state: GameState, investigator: InvestigatorId): Asset[] {
  const here = getInvestigator(state, investigator).location
  if (here === null) return []
  return Object.values(state.assets).filter((a) => {
    const owner = state.investigators.find((i) => i.id === a.owner)
    return owner?.location === here && !owner.eliminated && a.uses < charges(a)
  })
}

// Grand-Mère's Charm: [fast] Take 1 direct damage and exhaust it: Replenish 1 charge on an asset
// at your location (up to that asset's printed uses).
registerPlayerCard({
  code: GRAND_MERES_CHARM,
  abilities: (s, a, by) =>
    a.exhausted || !replenishable(s, by).length
      ? []
      : [
          {
            key: `${a.id}:replenish`,
            label: 'ability.grandMeresCharm',
            actions: 0,
            provokes: false,
            costs: [
              { type: 'ExhaustAsset', asset: a.id },
              { type: 'TakeDamage', investigator: by, damage: 1, horror: 0, direct: true },
            ],
            then: ask(
              by,
              replenishable(s, by).map((target) => ({
                label: 'choice.replenishCharge',
                params: { card: cardName(target.code) },
                target: { type: 'asset' as const, id: target.id },
                then: [{ type: 'AddUses' as const, asset: target.id, amount: 1 }],
              })),
            ),
          },
        ],
})

// Called to Guinée: in your threat area, you cannot heal damage. [action] Choose and discard 3
// cards from your hand: discard it.
registerTreachery({
  code: CALLED_TO_GUINEE,
  restricts: { damageHealing: true },
  revelation: (_s, investigator, self) => [
    {
      type: 'PlaceTreachery',
      treachery: self.id,
      placement: { type: 'threatArea', investigator },
    },
  ],
  abilities: (s, self, investigator) =>
    getInvestigator(s, investigator).hand.filter((c) => !playerCardDef(c)?.weakness).length < 3
      ? []
      : [
          {
            key: `${self.id}:discard`,
            label: 'ability.calledToGuinee',
            params: { card: self.name },
            target: { type: 'treachery', id: self.id },
            actions: 1,
            provokes: true,
            costs: [{ type: 'ChooseDiscardFromHand', investigator, amount: 3 }],
            then: [{ type: 'DiscardTreachery', treachery: self.id }],
          },
        ],
})
