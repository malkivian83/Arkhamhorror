import {
  customizationCost,
  playerCardDef,
  registerPlayerCard,
  type CardCode,
  type Customizations,
} from '@lcg/engine'

export const IN_THE_THICK_OF_IT = '08125'

registerPlayerCard({ code: IN_THE_THICK_OF_IT, permanent: {} })

/** Printed campaign-creation experience, before buying the initial upgraded cards. */
export const startingExperience = (deck: CardCode[]) => (deck.includes(IN_THE_THICK_OF_IT) ? 3 : 0)

export const startingExperienceSpent = (deck: CardCode[], sheets: Customizations = {}) =>
  deck.reduce((spent, code) => {
    const card = playerCardDef(code)
    // RR Exceptional: twice the printed level.
    const cost = (card?.xp ?? 0) * (card?.exceptional ? 2 : 1)
    return spent + (card && !card.weakness && !card.story ? cost : 0)
  }, 0) + Object.values(sheets).reduce((sum, sheet) => sum + customizationCost(sheet), 0)
