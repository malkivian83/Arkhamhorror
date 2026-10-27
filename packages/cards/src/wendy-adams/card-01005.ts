import { registerInvestigator } from '@lcg/engine'
import { WENDY, WENDYS_AMULET } from './codes'

// RR: Triggered Abilities ("when" timing), Costs, Limits, Chaos Bag, Automatic Success.
// Wendy Adams: [reaction] when you reveal a chaos token (in a skill test or through another
// ability), choose and discard 1 card from your hand: cancel that token, return it to the bag
// and reveal a new one (limit once per test/ability). The discarded card is the cost.
registerInvestigator({
  code: WENDY,
  reactions: (state, trigger, self) => {
    const test = state.skillTest
    const held = test?.revealing ?? state.tokenReveal
    const used = test?.revealing
      ? (test.abilityCounts?.wendy ?? 0) > 0
      : !!state.tokenReveal?.used.includes('wendy')
    if (
      trigger.type !== 'whenRevealChaosToken' ||
      trigger.investigator !== self.id ||
      !held ||
      used ||
      self.hand.length === 0
    )
      return []
    return [
      {
        key: 'wendy',
        investigator: self.id,
        label: 'ability.wendy.cancel',
        params: { token: String(held.face) },
        then: [
          { type: 'ChooseDiscardFromHand', investigator: self.id, amount: 1 },
          { type: 'CancelRevealedToken', redraw: true, use: 'wendy' },
        ],
      },
    ]
  },
  // Signo arcano: +0; si el Amuleto de Wendy está en juego, tienes éxito automáticamente.
  elderSign: (state) => ({
    modifier: 0,
    ...(Object.values(state.assets).some((a) => a.code === WENDYS_AMULET)
      ? { autoSucceed: true }
      : {}),
  }),
})
