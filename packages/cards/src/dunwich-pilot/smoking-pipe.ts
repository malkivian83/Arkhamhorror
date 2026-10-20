import {
  getInvestigator,
  registerPlayerCard,
  type Asset,
  type GameState,
  type Message,
} from '@lcg/engine'

// RR: Costs; Damage/Horror; Healing. Cost damage can be assigned to controlled assets.
const available = (state: GameState, self: Asset) =>
  !self.exhausted &&
  self.uses > 0 &&
  getInvestigator(state, self.owner).horror > 0 &&
  !getInvestigator(state, self.owner).osirisProtected
const cost = (self: Asset): Message[] => [
  { type: 'SpendUses', asset: self.id, amount: 1 },
  { type: 'ExhaustAsset', asset: self.id },
  { type: 'TakeDamage', investigator: self.owner, damage: 1, horror: 0 },
]
const effect = (self: Asset): Message[] => [
  { type: 'Heal', investigator: self.owner, damage: 0, horror: 1 },
]
registerPlayerCard({
  code: '02116',
  abilities: (state, self) =>
    available(state, self)
      ? [
          {
            key: `${self.id}:heal`,
            label: 'ability.pilotPipe',
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
            label: 'ability.pilotPipe',
            then: [...cost(self), ...effect(self)],
          },
        ]
      : [],
})
