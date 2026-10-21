/**
 * Definiciones de cartas: datos estáticos (coste, iconos, rasgos, texto EN/ES).
 * El comportamiento de cada carta se añadirá junto a sus datos a medida que se
 * implementen. Los textos los introducimos nosotros; no se copian de terceros.
 */

export type CardType =
  | 'investigator'
  | 'asset'
  | 'event'
  | 'skill'
  | 'treachery'
  | 'enemy'
  | 'location'
  | 'act'
  | 'agenda'
  | 'scenario'

export type CardClass = 'guardian' | 'seeker' | 'rogue' | 'mystic' | 'survivor' | 'neutral'

export type SkillIcon = 'willpower' | 'intellect' | 'combat' | 'agility' | 'wild'

export interface LocalizedText {
  en: string
  es: string
}

export interface CardDefinition {
  /** Código de carta (número de set + posición), p. ej. "01020". */
  code: string
  type: CardType
  class?: CardClass
  cost?: number | null
  icons?: Partial<Record<SkillIcon, number>>
  traits?: string[]
  unique?: boolean
  name: LocalizedText
  text?: LocalizedText
}

const registry = new Map<string, CardDefinition>()

export function registerCard(card: CardDefinition): void {
  if (registry.has(card.code)) throw new Error(`Carta duplicada: ${card.code}`)
  registry.set(card.code, card)
}

export function getCard(code: string): CardDefinition | undefined {
  return registry.get(code)
}

export function allCards(): CardDefinition[] {
  return [...registry.values()]
}

export { demoInvestigators, demoScenario } from './demo'
export { midwinterGala } from './midwinter-gala/gala'
export {
  bloodlessMan as GALA_BLOODLESS_MAN,
  bloodlessManUnleashed as GALA_BLOODLESS_MAN_UNLEASHED,
  CODES as MIDWINTER_GALA_CODES,
  FACTION_CARDS as GALA_FACTION_CARDS,
} from './midwinter-gala/cards'
export { BRETHREN_OF_ASH, CHAOS_BAGS, type Difficulty } from './brethren-of-ash/campaign'
export {
  CODES as QUEEN_OF_ASH_CODES,
  QUEEN_OF_ASH,
  queenOfAsh,
} from './brethren-of-ash/queen-of-ash'
export {
  CODES as SMOKE_AND_MIRRORS_CODES,
  eliteCount,
  SMOKE_AND_MIRRORS,
  smokeAndMirrors,
} from './brethren-of-ash/smoke-and-mirrors'
export {
  CODES as SPREADING_FLAMES_CODES,
  DR_ARMITAGE,
  SPREADING_FLAMES,
  spreadingFlames,
} from './brethren-of-ash/spreading-flames'
export {
  allCampaigns,
  campaignDefinition,
  scenarioKeywords,
  registerCampaign,
  type CampaignDefinition,
  type CampaignScenario,
  type ScenarioContext,
} from './campaign-definition'
export * from './scenario-helpers'
export * from './decks'
export { onePrintingEach, printingsOf, reprintSource } from './reprints'
export {
  activeMembers,
  canPlayNext,
  currentScenario,
  DECK_SIZE,
  deckSize,
  deckSizeOf,
  finishScenario,
  isImplemented,
  newCampaign,
  purchase,
  purchaseOptions,
  removableCards,
  startScenario,
  type Campaign,
  type CampaignInvestigator,
  type CampaignMember,
  type DeckKey,
  type PurchaseOption,
  type ScenarioResult,
} from './campaign'
export {
  STARTER_DECKS,
  code as coreCode,
  investigatorSetup,
  playerCards,
  starterDeck,
  starterInvestigator,
} from './core-2026/player-cards'
// Comportamiento de investigadores, cartas y debilidades (se registran al importarlos).
import './core-2026/investigators'
import './core-2026/cards'
import './core-2026/weaknesses'
import './core-2026/upgrades'
import './core-2026/meat-cleaver'
import './dunwich-pilot'
import { RENDERED_PLAYER_CARD_CODES as pilotCodes } from './dunwich-pilot'
import { FOLLOWUP_RENDERED_CODES } from './dunwich-followup'
import { SUPPORT_RENDERED_CODES } from './dunwich-support'
import { REPRINT_RENDERED_CODES } from './reprints-wave-1'
import { SECOND_REPRINT_RENDERED_CODES } from './reprints-wave-2'
import { CLASSIC_RENDERED_CODES } from './classic-foundations'
export const RENDERED_PLAYER_CARD_CODES = [
  ...pilotCodes,
  ...FOLLOWUP_RENDERED_CODES,
  ...SUPPORT_RENDERED_CODES,
  ...REPRINT_RENDERED_CODES,
  ...SECOND_REPRINT_RENDERED_CODES,
  ...CLASSIC_RENDERED_CODES,
]
