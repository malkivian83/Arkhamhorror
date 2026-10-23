import type { ChaosToken, Difficulty, LabelParams } from '@lcg/engine'

/** Transport DTOs deliberately exclude engine messages and hidden piles. */
export interface OnlineCommand {
  commandId: string
  revision: number
  questionId: string
  choice: number
}
export interface OnlineGame {
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
