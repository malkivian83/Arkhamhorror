/**
 * Todo lo que necesita la web en inglés: textos de interfaz y catálogos de cartas.
 * Un módulo por idioma para que el navegador solo descargue el que se usa (doc 100, O1).
 */
import base from './en.json'
import dunwich from './dunwich.en.json'
import zealot from './zealot.en.json'
import zealotCardsData from './zealot-cards.en.json'
import dunwichCardsData from './dunwich-cards.en.json'
import carcosaCardsData from './carcosa-cards.en.json'
import excelsiorCardsData from './excelsior-cards.en.json'
import fortuneCardsData from './fortune-cards.en.json'
import galaCards from './gala-cards.en.json'
import cardNarrativesData from './card-narratives.en.json'
import carnevaleCardsData from './carnevale-cards.en.json'
import type { CardNarrative, CatalogCard } from './types'

export const messages = {
  ...base,
  galaCards,
  campaign: {
    ...base.campaign,
    names: { ...base.campaign.names, 'night-of-the-zealot': zealot.campaignName },
    scenario: { ...base.campaign.scenario, ...zealot.scenarios },
  },
  setup: {
    ...base.setup,
    descriptions: {
      ...base.setup.descriptions,
      'night-of-the-zealot': zealot.description,
      'the-dunwich-legacy': dunwich.description,
    },
  },
  story: {
    ...base.story,
    ...dunwich.story,
    zealot: zealot.zealot,
    theGathering: zealot.theGathering,
    midnightMasks: zealot.midnightMasks,
    devourerBelow: zealot.devourerBelow,
    note: { ...base.story.note, ...zealot.notes, ...dunwich.notes },
  },
  ability: {
    ...base.ability,
    zealot: zealot.abilities,
    midnight: zealot.midnightAbilities,
    devourer: zealot.devourerAbilities,
    ...dunwich.abilities,
  },
  choice: {
    ...base.choice,
    zealot: zealot.choices,
    midnight: zealot.midnightChoices,
    devourer: zealot.devourerChoices,
    ...dunwich.choices,
  },
  prompt: { ...base.prompt, zealot: zealot.prompts, ...dunwich.prompts },
} as const

export const cardNarratives: Record<string, CardNarrative> = cardNarrativesData
export const carnevaleCards: Record<string, CatalogCard> = carnevaleCardsData
export const excelsiorCards: Record<string, CatalogCard> = excelsiorCardsData
export const carcosaCards: Record<string, CatalogCard> = carcosaCardsData
export const fortuneCards: Record<string, CatalogCard> = fortuneCardsData
export const zealotCards: Record<string, CatalogCard> = zealotCardsData
export const dunwichCards: Record<string, CatalogCard> = dunwichCardsData
