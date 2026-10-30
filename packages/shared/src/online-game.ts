import type { OnlineDeck } from './online'
import type {
  ChaosToken,
  Difficulty,
  LabelParams,
  GameState,
  skillTestValue,
  TokenEffect,
  Choice,
  Question,
} from '@lcg/engine'

export type OnlineChoice = Omit<Choice, 'then' | 'requires'>
export type OnlineTable = Omit<GameState, 'pending'> & {
  pending: {
    investigator: string
    question: Omit<Question, 'choices'> & { choices: OnlineChoice[] }
  } | null
}

export interface OnlineTableStats {
  agendaCount: number
  /** Cartas del segundo mazo de Plan (Surgen estrellas negras). */
  secondAgendaCount?: number
  actCount: number
  committing: boolean
  shroud: Record<string, number>
  value: ReturnType<typeof skillTestValue>
  odds: number | null
  bag: { token: ChaosToken; effect: Pick<TokenEffect, 'modifier' | 'autoFail' | 'revealAnother'> }[]
}

/** Transport DTOs deliberately exclude engine messages and hidden piles. */
export interface OnlineCommand {
  commandId: string
  revision: number
  questionId: string
  choice: number
}
export type OnlineProgressAction =
  | { action: 'finish' }
  | { action: 'next' }
  | { action: 'ready'; ready: boolean }
  | { action: 'purchase'; card: string; upgrade: boolean; remove?: string }
  | {
      action: 'customize'
      card: string
      sheet: Record<string, number>
      copies?: number
      removals?: string[]
    }
  | { action: 'heir'; card: string; heir: string }
  /** El jugador cuyo investigador murió o enloqueció elige otro con un mazo de nivel 0. */
  | { action: 'replace'; deck: OnlineDeck }
export type OnlineProgressCommand = { commandId: string; revision: number } & OnlineProgressAction
export interface OnlineCampaignView {
  canManage: boolean
  nextScenario: string | null
  canContinue: boolean
  ready: boolean
  allReady: boolean
  /** Cartas cuyo portador dejó la campaña: el anfitrión elige quién las recibe. */
  transfers: { card: string; from: string; candidates: string[] }[]
  /** Nadie puede seguir ni ser sustituido. */
  lost: boolean
  /** Hay jugadores sin investigador activo que aún pueden elegir otro. */
  awaitingReplacement: boolean
  /** Investigadores aún sin usar si el del jugador dejó la campaña; si no, null. */
  replacement: { leaving: string; investigators: string[] } | null
  members: {
    investigator: string
    xp: number
    physicalTrauma: number
    mentalTrauma: number
    active: boolean
    ready: boolean
  }[]
  own: {
    xp?: number
    customizations?: Record<string, Record<string, number>>
    deck: string[]
    removable: string[]
    options: {
      code: string
      name: string
      cost: number
      replaces?: string
      needsRemoval: boolean
    }[]
  } | null
}
export interface OnlineGame {
  cardEntries?: { revision: number; cards: import('./cardEntries').CardEntry[] }[]
  /** Per-player redacted automatic steps, ordered by authoritative revision. */
  autoSteps?: { revision: number; review: import('./autoSteps').AutoStepsReview }[]
  /** Redacted presentation only: never apply engine inputs or persist as a local game. */
  table?: OnlineTable
  tableStats?: OnlineTableStats
  ownInvestigator?: string
  canFinish?: boolean
  campaign?: OnlineCampaignView
  revision: number
  scenarioId: string
  difficulty: Difficulty
  round: number
  phase: string
  doom: number
  finished: boolean
  test: {
    investigator: string
    skill: string
    difficulty: number
    tokens: ChaosToken[]
    value: number | null
    succeeded: boolean | null
  } | null
  investigators: {
    id: string
    name: string
    damage: number
    horror: number
    resources: number
    clues: number
    actionsRemaining: number
    location: string | null
    eliminated: boolean
    handCount: number
    deckCount: number
    hand?: string[]
  }[]
  cards: {
    id: string
    code: string
    name: string
    back?: boolean
    detail: string
    params: LabelParams
  }[]
  pending: {
    id: string
    investigator: string
    prompt?: string
    params?: LabelParams
    story?: { title: string; body: string }
    choices: { label: string; params?: LabelParams }[]
  } | null
}
