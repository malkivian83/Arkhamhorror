/**
 * Definición de una campaña: sus escenarios en orden y cómo preparar cada uno a
 * partir del estado de la campaña. Cada campaña se registra aquí; el resto de la
 * aplicación (partida de campaña, pantallas) solo trabaja con definiciones.
 */
import type {
  CampaignLog,
  CardCode,
  ChaosToken,
  Difficulty,
  InvestigatorId,
  ScenarioDefinition,
} from '@lcg/engine'

/** Lo que necesita un escenario para prepararse dentro de una campaña. */
export interface ScenarioContext {
  difficulty: Difficulty
  log: CampaignLog
  /** Semilla para las elecciones al azar de la preparación. */
  seed: number
  /** Investigadores que juegan, en orden de jugadores. */
  investigators: InvestigatorId[]
}

export interface CampaignScenario {
  id: string
  /** Prepara el escenario; sin `build`, el escenario aún no está implementado. */
  build?: (context: ScenarioContext) => ScenarioDefinition
  /** Apoyos de historia que el escenario pone en juego en vez de barajarlos en el mazo. */
  storyAssetsInPlay?: CardCode[]
}

export interface CampaignDefinition {
  id: string
  /** Clave i18n del nombre de la campaña. */
  name: string
  scenarios: CampaignScenario[]
  /** Bolsa del caos inicial por dificultad (guía de campaña). */
  chaosBags: Record<Difficulty, ChaosToken[]>
}

const campaigns = new Map<string, CampaignDefinition>()

export function registerCampaign(definition: CampaignDefinition): void {
  campaigns.set(definition.id, definition)
}

export function campaignDefinition(id: string): CampaignDefinition {
  const found = campaigns.get(id)
  if (!found) throw new Error(`Campaña desconocida: ${id}`)
  return found
}

export function allCampaigns(): CampaignDefinition[] {
  return [...campaigns.values()]
}
