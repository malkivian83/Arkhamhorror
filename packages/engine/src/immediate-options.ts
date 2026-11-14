// RR: Additional Actions, Action Designators, Basic Actions, Aloof.
import { actionKinds, abilityActionKinds, availableActions, availableAbilities } from './actions'
import { playerCardBehavior, playerCardDef } from './content'
import type { GameState, ImmediateActionRule, Action, AbilityOption } from './types'
const matches = (kinds: string[], rule?: ImmediateActionRule) =>
  !rule?.types || kinds.some((k) => rule.types!.includes(k))
export function filterImmediateActions(
  state: GameState,
  by: string,
  rule?: ImmediateActionRule,
): Action[] {
  if (rule?.asset || rule?.traits) return []
  return availableActions(state, by).filter((a) => {
    const kinds = [
      ...actionKinds(a),
      ...(a.kind === 'play' && playerCardBehavior(a.card)?.parley ? ['parley'] : []),
    ]
    return matches(kinds, rule) && (!rule?.basic || kinds.length === 1)
  })
}
export function filterImmediateAbilities(
  state: GameState,
  by: string,
  rule?: ImmediateActionRule,
): AbilityOption[] {
  return availableAbilities(state, by).filter((a) => {
    if (a.actions <= 0) return false
    const kinds = abilityActionKinds(a)
    const asset = Object.values(state.assets).find((x) => a.key.startsWith(x.id + ':'))
    return (
      matches(kinds, rule) &&
      (!rule?.basic || kinds.length === 1) &&
      (!rule?.asset || asset?.id === rule.asset) &&
      (!rule?.traits ||
        (asset && playerCardDef(asset.code)?.traits.some((t) => rule.traits!.includes(t))))
    )
  })
}
