import {
  canAffordEntry,
  enemiesAt,
  getInvestigator,
  getLocation,
  leavingBlocked,
  playerCardDef,
  type Asset,
  type Choice,
  type GameState,
  type InvestigatorId,
  type Message,
  type SkillTestKind,
} from '@lcg/engine'

export const continuation = (
  code: string,
  investigator: string,
  step: string,
  data?: Record<string, string | number | boolean>,
): Message => ({ type: 'PlayerCardEffect', code, investigator, step, ...(data ? { data } : {}) })
export const cardName = (code: string) => playerCardDef(code)?.name ?? code
export const ask = (investigator: string, choices: Choice[], alwaysAsk = false): Message[] =>
  choices.length
    ? [
        {
          type: 'Ask',
          investigator,
          question: { kind: 'chooseOne', prompt: 'prompt.pilotTarget', choices, alwaysAsk },
        },
      ]
    : []
export function destinations(state: GameState, investigator: string): string[] {
  const here = getInvestigator(state, investigator).location
  return here === null || leavingBlocked(state, here)
    ? []
    : getLocation(state, here).connections.filter(
        (to) => state.locations[to] && canAffordEntry(state, to),
      )
}
export const moveChoices = (state: GameState, investigator: string): Choice[] =>
  destinations(state, investigator).map((location) => ({
    label: 'choice.pilotMove',
    params: {
      name: getInvestigator(state, investigator).name,
      location: getLocation(state, location).name,
    },
    target: { type: 'location', id: location },
    then: [{ type: 'MoveTo', investigator, location }],
  }))
export const attackable = (state: GameState, investigator: string) => {
  const here = getInvestigator(state, investigator).location
  return here === null
    ? []
    : enemiesAt(state, here).filter(
        (enemy) => enemy.engagedWith !== null || !enemy.keywords.includes('aloof'),
      )
}
export function fightOptions(
  state: GameState,
  self: Asset,
  investigator: InvestigatorId,
  modifier: number,
  extra: Partial<Extract<SkillTestKind, { type: 'fight' }>> = {},
) {
  return attackable(state, investigator).map((enemy) => ({
    key: `${self.id}:fight`,
    label: 'ability.fightWith',
    params: { card: cardName(self.code), enemy: enemy.name },
    target: { type: 'enemy' as const, id: enemy.id },
    actions: 1,
    provokes: false,
    then: [
      {
        type: 'BeginSkillTest' as const,
        investigator,
        source: self.id,
        skill: 'combat' as const,
        difficulty: enemy.fight,
        modifier,
        kind: { type: 'fight' as const, enemy: enemy.id, ...extra },
      },
    ],
  }))
}
