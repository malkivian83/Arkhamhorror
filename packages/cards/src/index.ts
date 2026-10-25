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
export { CARCOSA_CHAOS_BAGS, THE_PATH_TO_CARCOSA } from './the-path-to-carcosa/campaign'
export {
  CODES as CURTAIN_CALL_CODES,
  CURTAIN_CALL,
  curtainCall,
  STRANGERS as CURTAIN_CALL_STRANGERS,
} from './the-path-to-carcosa/curtain-call'
export {
  CODES as ECHOES_OF_THE_PAST_CODES,
  ECHOES_OF_THE_PAST,
  echoesOfThePast,
} from './the-path-to-carcosa/echoes-of-the-past'
export {
  CODES as THE_PALLID_MASK_CODES,
  THE_PALLID_MASK,
  thePallidMask,
} from './the-path-to-carcosa/the-pallid-mask'
export {
  BLACK_STARS_RISE,
  blackStarsRise,
  CODES as BLACK_STARS_RISE_CODES,
} from './the-path-to-carcosa/black-stars-rise'
export {
  CODES as DIM_CARCOSA_CODES,
  DIM_CARCOSA,
  dimCarcosa,
  STORY_OF as DIM_CARCOSA_STORIES,
} from './the-path-to-carcosa/dim-carcosa'
export {
  A_PHANTOM_OF_TRUTH,
  aPhantomOfTruth,
  CODES as A_PHANTOM_OF_TRUTH_CODES,
} from './the-path-to-carcosa/a-phantom-of-truth'
export {
  CODES as THE_UNSPEAKABLE_OATH_CODES,
  THE_UNSPEAKABLE_OATH,
  theUnspeakableOath,
} from './the-path-to-carcosa/the-unspeakable-oath'
export {
  CODES as THE_LAST_KING_CODES,
  THE_LAST_KING,
  theLastKing,
  VIPS as THE_LAST_KING_VIPS,
} from './the-path-to-carcosa/the-last-king'
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
  chooseTransferHeir,
  currentScenario,
  DECK_SIZE,
  deckSize,
  deckSizeOf,
  finishScenario,
  isImplemented,
  newCampaign,
  pendingTransfers,
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
import { LOLA_RENDERED_CODES } from './lola-hayes'
import { SURVIVOR_DECK_RENDERED_CODES } from './survivor-deck'
import { BASIC_ABILITY_RENDERED_CODES } from './basic-abilities'
import { BASIC_EVENT_RENDERED_CODES } from './basic-events'
import { ASSET_UTILITY_RENDERED_CODES } from './asset-utilities'
import { PHASE_BONUS_RENDERED_CODES } from './phase-bonuses'
import { PERMANENT_TALENT_RENDERED_CODES } from './permanent-talents'
import { SEQUENCED_EVENT_RENDERED_CODES } from './sequenced-events'
import { RESTRICTED_SLOT_RENDERED_CODES } from './restricted-slots'
import { STARTER_ACTION_RENDERED_CODES } from './starter-actions'
import { SIMPLE_ASSET_RENDERED_CODES } from './simple-assets'
import { SUPPORT_ALLY_RENDERED_CODES } from './support-allies'
import { SKILL_TRICK_RENDERED_CODES } from './skill-tricks'
import { DIRECT_EFFECT_RENDERED_CODES } from './direct-effects'
import { ROUND_EFFECT_RENDERED_CODES } from './round-effects'
import { SKILL_REPLACEMENT_RENDERED_CODES } from './skill-replacement'
import { NEXT_TEST_RENDERED_CODES } from './next-test-effects'
import { ATTACK_HISTORY_RENDERED_CODES } from './attack-history'
import { PROTECTED_DRAW_RENDERED_CODES } from './protected-draw'
import { ACTION_HISTORY_RENDERED_CODES } from './action-history'
import { BACKUP_RENDERED_CODES } from './backup-events'
import { IMMEDIATE_EVENT_RENDERED_CODES } from './immediate-action-events'
import { IMMEDIATE_SKILL_RENDERED_CODES } from './immediate-action-skills'
import { SYNERGY_ATTACK_RENDERED_CODES } from './synergy-attacks'
import { SYNERGY_RENDERED_CODES } from './synergy'
import { TARGETED_EVENT_RENDERED_CODES } from './targeted-events'
import { EXCLUSIVE_SKILL_RENDERED_CODES } from './exclusive-skills'
import { SKILL_UTILITY_RENDERED_CODES } from './skill-utilities'
export const RENDERED_PLAYER_CARD_CODES = [
  ...BACKUP_RENDERED_CODES,
  ...IMMEDIATE_EVENT_RENDERED_CODES,
  ...IMMEDIATE_SKILL_RENDERED_CODES,
  ...ACTION_HISTORY_RENDERED_CODES,
  ...PROTECTED_DRAW_RENDERED_CODES,
  ...ATTACK_HISTORY_RENDERED_CODES,
  ...NEXT_TEST_RENDERED_CODES,
  ...SYNERGY_ATTACK_RENDERED_CODES,
  ...SYNERGY_RENDERED_CODES,
  ...TARGETED_EVENT_RENDERED_CODES,
  ...EXCLUSIVE_SKILL_RENDERED_CODES,
  ...SKILL_UTILITY_RENDERED_CODES,
  ...SKILL_REPLACEMENT_RENDERED_CODES,
  ...ROUND_EFFECT_RENDERED_CODES,
  ...DIRECT_EFFECT_RENDERED_CODES,
  ...SKILL_TRICK_RENDERED_CODES,
  ...SUPPORT_ALLY_RENDERED_CODES,
  ...SIMPLE_ASSET_RENDERED_CODES,
  ...STARTER_ACTION_RENDERED_CODES,
  ...RESTRICTED_SLOT_RENDERED_CODES,
  ...SEQUENCED_EVENT_RENDERED_CODES,
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
  ...LOLA_RENDERED_CODES,
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
