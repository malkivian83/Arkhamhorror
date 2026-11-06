import { registerPlayerCard } from '@lcg/engine'

registerPlayerCard({
  code: '08730',
  reactions: (state, trigger, self) =>
    trigger.type === 'whenRevealChaosToken' &&
    trigger.token === 'frost' &&
    trigger.investigator === self.owner &&
    state.skillTest?.investigator === self.owner &&
    state.skillTest.revealing?.face === 'frost' &&
    !state.tokenReveal &&
    self.damage < 3
      ? [
          {
            key: `${self.id}:frost`,
            label: 'ability.edgeOfTheEarth.memorialFurs',
            investigator: self.owner,
            target: { type: 'asset', id: self.id },
            then: [
              { type: 'DamageAsset', asset: self.id, damage: 1, horror: 0 },
              { type: 'CancelRevealedToken', redraw: true },
            ],
          },
        ]
      : [],
})
