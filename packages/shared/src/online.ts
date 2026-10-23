export interface OnlineDeck {
  investigator: string
  cards: string[]
  startingTrauma?: { physical: number; mental: number }
}
export interface OnlineLobby {
  id: string
  owner: string
  members: string[]
  revision: number
  status: 'lobby' | 'active'
  campaignId: string
  difficulty: 'easy' | 'standard' | 'hard' | 'expert'
  seats: { user: string; investigator: string | null; ready: boolean }[]
  game?: { scenarioId: string; phase: string; round: number; investigatorCount: number }
}
