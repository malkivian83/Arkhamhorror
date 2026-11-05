import plaguebearer from './plaguebearer.es.json'
import plaguebearerCardsData from './plaguebearer-cards.es.json'
/**
 * Todo lo que necesita la web en español: textos de interfaz y catálogos de cartas.
 * Un módulo por idioma para que el navegador solo descargue el que se usa (doc 100, O1).
 */
import base from './es.json'
import dunwich from './dunwich.es.json'
import zealot from './zealot.es.json'
import zealotCardsData from './zealot-cards.es.json'
import dunwichCardsData from './dunwich-cards.es.json'
import carcosaCardsData from './carcosa-cards.es.json'
import excelsiorCardsData from './excelsior-cards.es.json'
import fortuneCardsData from './fortune-cards.es.json'
import galaCards from './gala-cards.es.json'
import cardNarrativesData from './card-narratives.es.json'
import carnevaleCardsData from './carnevale-cards.es.json'
import edgeOfTheEarthCardsData from './edge-of-the-earth-cards.es.json'
import edgeOfTheEarth from './edge-of-the-earth.es.json'
import type { CardNarrative, CatalogCard } from './types'

export const messages = {
  ...base,
  galaCards,
  campaign: {
    ...base.campaign,
    names: {
      ...base.campaign.names,
      'night-of-the-zealot': zealot.campaignName,
      'call-of-the-plaguebearer': plaguebearer.campaignName,
      'edge-of-the-earth': edgeOfTheEarth.campaignName,
    },
    scenario: {
      ...base.campaign.scenario,
      ...zealot.scenarios,
      ...plaguebearer.scenarios,
      'ice-and-death-part-1': edgeOfTheEarth.scenarioName,
      'ice-and-death-checkpoint-1': edgeOfTheEarth.checkpointName,
    },
  },
  setup: {
    ...base.setup,
    descriptions: {
      ...base.setup.descriptions,
      'night-of-the-zealot': zealot.description,
      'the-dunwich-legacy': dunwich.description,
      'call-of-the-plaguebearer': plaguebearer.description,
      'edge-of-the-earth': edgeOfTheEarth.description,
    },
  },
  story: {
    ...base.story,
    plaguebearer: plaguebearer.story,
    ...dunwich.story,
    zealot: zealot.zealot,
    theGathering: zealot.theGathering,
    midnightMasks: zealot.midnightMasks,
    devourerBelow: zealot.devourerBelow,
    edgeOfTheEarth: edgeOfTheEarth.story,
    note: {
      ...base.story.note,
      ...zealot.notes,
      ...dunwich.notes,
      ...edgeOfTheEarth.note,
      ...plaguebearer.note,
    },
  },
  ability: {
    ...base.ability,
    plaguebearer: plaguebearer.ability,
    zealot: zealot.abilities,
    midnight: zealot.midnightAbilities,
    devourer: zealot.devourerAbilities,
    ...dunwich.abilities,
    edgeOfTheEarth: edgeOfTheEarth.ability,
  },
  choice: {
    ...base.choice,
    plaguebearer: plaguebearer.choice,
    zealot: zealot.choices,
    midnight: zealot.midnightChoices,
    devourer: zealot.devourerChoices,
    ...dunwich.choices,
    edgeOfTheEarth: edgeOfTheEarth.choice,
  },
  prompt: {
    ...base.prompt,
    plaguebearer: plaguebearer.prompt,
    zealot: zealot.prompts,
    ...dunwich.prompts,
    edgeOfTheEarth: edgeOfTheEarth.prompt,
  },
} as const

export const cardNarratives: Record<string, CardNarrative> = cardNarrativesData
export const carnevaleCards: Record<string, CatalogCard> = carnevaleCardsData
export const edgeOfTheEarthCards: Record<string, CatalogCard> = edgeOfTheEarthCardsData
export const excelsiorCards: Record<string, CatalogCard> = excelsiorCardsData
export const carcosaCards: Record<string, CatalogCard> = carcosaCardsData
export const fortuneCards: Record<string, CatalogCard> = fortuneCardsData
export const zealotCards: Record<string, CatalogCard> = zealotCardsData
export const dunwichCards: Record<string, CatalogCard> = dunwichCardsData

export const plaguebearerCards: Record<string, CatalogCard> = plaguebearerCardsData
