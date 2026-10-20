import {
  getInvestigator,
  registerPlayerCard,
  type Asset,
  type GameState,
  type Message,
} from '@lcg/engine'

// RR: Costs; Damage/Horror; Healing. Horror is paid before the healing effect.
const available = (state: GameState, self: Asset) =>
  !self.exhausted && self.uses > 0 && getInvestigator(state, self.owner).damage > 0
const cost = (self: Asset): Message[] => [
  { type: 'SpendUses', asset: self.id, amount: 1 },
  { type: 'ExhaustAsset', asset: self.id },
  { type: 'TakeDamage', investigator: self.owner, damage: 0, horror: 1 },
]
const effect = (self: Asset): Message[] => [
  { type: 'Heal', investigator: self.owner, damage: 1, horror: 0 },
]
registerPlayerCard({
  code: '02117',
  abilities: (state, self) =>
    available(state, self)
      ? [
          {
            key: `${self.id}:heal`,
            label: 'ability.pilotPainkillers',
            actions: 0,
            provokes: false,
            costs: cost(self),
            then: effect(self),
          },
        ]
      : [],
  testOptions: (state, _test, self) =>
    available(state, self)
      ? [
          {
            key: `${self.id}:heal`,
            investigator: self.owner,
            label: 'ability.pilotPainkillers',
            then: [...cost(self), ...effect(self)],
          },
        ]
      : [],
})
