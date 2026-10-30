import { getInvestigator, playerCardDef, registerPlayerCard } from '@lcg/engine'
import { exhaust, reaction } from '../core-2026/cards'
import { hasUses, spendUse } from '../core-2026/player-cards'

// RR: Limit 1 per investigator, Uses, Reactions. Hunter's Instinct (2): after you engage an
// enemy, spend 1 supply and exhaust it: add a level 0-2 event from your discard pile to your
// hand. Discarded when it has no supplies.
registerPlayerCard({
  code: '60574',
  limitTitle: true,
  discardWhenEmpty: true,
  reactions: (state, trigger, self) => {
    if (trigger.type !== 'afterEngage' || trigger.investigator !== self.owner) return []
    if (self.exhausted || !hasUses(self)) return []
    return [...new Set(getInvestigator(state, self.owner).discard)]
      .filter((c) => {
        const def = playerCardDef(c)
        return def?.type === 'event' && (def.xp ?? 0) <= 2 && !def.weakness
      })
      .map((c) =>
        reaction(
          self,
          'ability.returnFromDiscard',
          [
            exhaust(self),
            spendUse(self),
            { type: 'DiscardToHand', investigator: self.owner, code: c },
          ],
          { target: playerCardDef(c)?.name ?? c },
          `:${c}`,
        ),
      )
  },
})
