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
export { BRETHREN_OF_ASH, CHAOS_BAGS, type Difficulty } from './brethren-of-ash/campaign'
export {
  CODES as SPREADING_FLAMES_CODES,
  SPREADING_FLAMES_LAYOUT,
  SPREADING_FLAMES,
  spreadingFlames,
} from './brethren-of-ash/spreading-flames'
export {
  STARTER_DECKS,
  code as coreCode,
  playerCards,
  starterInvestigator,
} from './core-2026/player-cards'
// Comportamiento de investigadores, cartas y debilidades (se registran al importarlos).
import './core-2026/investigators'
import './core-2026/cards'
import './core-2026/weaknesses'
