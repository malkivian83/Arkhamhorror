import { cardOfRole, playerCardDef, registerInvestigator } from '@lcg/engine'
import { chooseRole, LOLA } from './roles'

// RR: Setup (opening hand), Free Triggered Abilities, Limits, Elder Sign. Lola can only
// play, commit or trigger abilities on Neutral cards or cards of her role.
registerInvestigator({
  code: LOLA,
  // Obligado: después de robar la mano inicial, elige un papel.
  afterOpeningHand: (_s, self) => [chooseRole(self.id)],
  canUseCard: (_s, self, code) => {
    if (!playerCardDef(code)) return true
    return cardOfRole(code, 'neutral') || cardOfRole(code, self.role)
  },
  // [fast]: cambia tu papel (límite de una vez por ronda).
  fastOptions: (_s, self) => [
    {
      key: 'lola:role',
      investigator: self.id,
      label: 'ability.lola.switchRole',
      params: { name: self.name },
      limit: { per: 'round' },
      then: [chooseRole(self.id, self.role)],
    },
  ],
  // Signo arcano: +2; puedes cambiar de papel.
  elderSign: (_s, self) => ({ modifier: 2, immediate: [chooseRole(self.id, self.role, true)] }),
})
