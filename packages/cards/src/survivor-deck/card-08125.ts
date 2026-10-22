import { playerCardDef, registerPlayerCard, type CardCode } from '@lcg/engine'

export const IN_THE_THICK_OF_IT = '08125'

registerPlayerCard({ code: IN_THE_THICK_OF_IT, permanent: {} })

/** Printed campaign-creation experience, before buying the initial upgraded cards. */
export const startingExperience = (deck: CardCode[]) => (deck.includes(IN_THE_THICK_OF_IT) ? 3 : 0)

export const startingExperienceSpent = (deck: CardCode[]) =>
  deck.reduce((spent, code) => {
    const card = playerCardDef(code)
    return spent + (card && !card.weakness && !card.story ? (card.xp ?? 0) : 0)
  }, 0)
