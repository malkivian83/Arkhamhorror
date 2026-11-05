import plaguebearer from './plaguebearer.en.json'
import plaguebearerCardsData from './plaguebearer-cards.en.json'
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
import edgeOfTheEarthCardsData from './edge-of-the-earth-cards.en.json'
import edgeOfTheEarth from './edge-of-the-earth.en.json'
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
      'ice-and-death-part-2': edgeOfTheEarth.partTwoName,
      'ice-and-death-checkpoint-2': edgeOfTheEarth.checkpointTwoName,
      'ice-and-death-part-3': edgeOfTheEarth.partThreeName,
      'edge-of-the-earth-restful-night': edgeOfTheEarth.restfulNightName,
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
