import {
  enemiesAt,
  getInvestigator,
  playerCardDef,
  type AbilityOption,
  type Asset,
  type GameState,
  type InvestigatorId,
  type Message,
  type ReactionOption,
  type SkillTest,
  type SkillType,
} from '@lcg/engine'

export const cardName = (code: string) => playerCardDef(code)?.name ?? code

/** "You get +N <skill> for this skill test", offered while the test is open. */
export function boost(
  self: Asset,
  suffix: string,
  label: string,
  params: Record<string, string | number>,
  costs: Message[],
  amount: number,
  extra: Message[] = [],
): ReactionOption {
  return {
    key: `${self.id}:${suffix}`,
    investigator: self.owner,
    label,
    params: { card: cardName(self.code), amount, ...params },
    then: [...costs, { type: 'BoostSkillTest', amount }, ...extra],
  }
}

export const resources = (state: GameState, investigator: InvestigatorId) =>
  getInvestigator(state, investigator).resources

/** Constant +N to one skill while the asset is in play (allies). */
export const skillBonus =
  (skill: SkillType, amount = 1) =>
  (_state: GameState, _self: Asset, test: SkillTest) =>
    test.skill === skill ? amount : 0

/** A [fast] ability of an asset, offered between actions during your turn. */
export function fast(
  self: Asset,
  suffix: string,
  label: string,
  params: Record<string, string | number>,
  costs: Message[],
  then: Message[],
  target?: AbilityOption['target'],
): AbilityOption {
  return {
    key: `${self.id}:${suffix}`,
    label,
    params: { card: cardName(self.code), ...params },
    actions: 0,
    provokes: false,
    costs,
    then,
    ...(target ? { target } : {}),
  }
}

export const enemiesHere = (state: GameState, investigator: InvestigatorId) => {
  const here = getInvestigator(state, investigator).location
  return here === null ? [] : enemiesAt(state, here)
}
export const elite = (traits?: string[]) => (traits ?? []).includes('Elite')
