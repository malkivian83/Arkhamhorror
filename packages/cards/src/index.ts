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
export { murderAtTheExcelsiorHotel } from './excelsior/excelsior'
export {
  CODES as EXCELSIOR_CODES,
  EXCELSIOR,
  LEADS as EXCELSIOR_LEADS,
  TRUE_CULPRIT as EXCELSIOR_TRUE_CULPRIT,
} from './excelsior/cards'
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
import { EQUIPMENT_RENDERED_CODES } from './classic-equipment'
import { REACTIVE_RENDERED_CODES } from './reactive-support'
import { COMBAT_RENDERED_CODES } from './combat-tools'
import { CONDITIONAL_RENDERED_CODES } from './conditional-commit'
import { VARIABLE_RENDERED_CODES } from './variable-icons'
import { CONTEXT_RENDERED_CODES } from './context-skills'
import { RESULT_RENDERED_CODES } from './result-skills'
import { TEST_MODIFIER_RENDERED_CODES } from './test-modifiers'
import { DISTRIBUTED_RESULT_RENDERED_CODES } from './distributed-results'
import { BASIC_ACTION_SKILL_RENDERED_CODES } from './basic-action-skills'
import { MOVEMENT_SKILL_RENDERED_CODES } from './movement-skills'
import { REACTIVE_EVENT_RENDERED_CODES } from './reactive-events'
import { DIRECT_EVENT_RENDERED_CODES } from './direct-events'
import { SEARCH_ASSET_RENDERED_CODES } from './search-assets'
import { ATTACHED_UPGRADE_RENDERED_CODES } from './attached-upgrades'
import { PETE_RENDERED_CODES } from './ashcan-pete'
import { JENNY_RENDERED_CODES } from './jenny-barnes'
import { SURVIVOR_DECK_RENDERED_CODES } from './survivor-deck'
import { BASIC_ABILITY_RENDERED_CODES } from './basic-abilities'
import { BASIC_EVENT_RENDERED_CODES } from './basic-events'
import { ASSET_UTILITY_RENDERED_CODES } from './asset-utilities'
import { PHASE_BONUS_RENDERED_CODES } from './phase-bonuses'
import { PERMANENT_TALENT_RENDERED_CODES } from './permanent-talents'
export const RENDERED_PLAYER_CARD_CODES = [
  ...PERMANENT_TALENT_RENDERED_CODES,
  ...PHASE_BONUS_RENDERED_CODES,
  ...pilotCodes,
  ...FOLLOWUP_RENDERED_CODES,
  ...SUPPORT_RENDERED_CODES,
  ...REPRINT_RENDERED_CODES,
  ...SECOND_REPRINT_RENDERED_CODES,
  ...CLASSIC_RENDERED_CODES,
  ...EQUIPMENT_RENDERED_CODES,
  ...REACTIVE_RENDERED_CODES,
  ...COMBAT_RENDERED_CODES,
  ...CONDITIONAL_RENDERED_CODES,
  ...VARIABLE_RENDERED_CODES,
  ...CONTEXT_RENDERED_CODES,
  ...RESULT_RENDERED_CODES,
  ...TEST_MODIFIER_RENDERED_CODES,
  ...DISTRIBUTED_RESULT_RENDERED_CODES,
  ...BASIC_ACTION_SKILL_RENDERED_CODES,
  ...PETE_RENDERED_CODES,
  ...JENNY_RENDERED_CODES,
  ...SURVIVOR_DECK_RENDERED_CODES,
  ...MOVEMENT_SKILL_RENDERED_CODES,
  ...REACTIVE_EVENT_RENDERED_CODES,
  ...DIRECT_EVENT_RENDERED_CODES,
  ...SEARCH_ASSET_RENDERED_CODES,
  ...ATTACHED_UPGRADE_RENDERED_CODES,
  ...BASIC_ABILITY_RENDERED_CODES,
  ...BASIC_EVENT_RENDERED_CODES,
  ...ASSET_UTILITY_RENDERED_CODES,
]
