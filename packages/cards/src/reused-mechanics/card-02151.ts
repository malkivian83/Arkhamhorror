import {
  actBehavior,
  agendaBehavior,
  currentAgendas,
  locationBehavior,
  registerPlayerCard,
  type AbilityOption,
  type GameState,
} from '@lcg/engine'

// RR: Resign; Scenario Cards. "I'm outta here!": play only if a scenario card in play (revealed
// location, current agenda or act) has a 'resign' ability, wherever it is. Resign.
const resigns = (options: AbilityOption[]) =>
  options.some((o) => o.then.some((m) => m.type === 'Resign'))
export function resignAbilityInPlay(state: GameState, investigator: string): boolean {
  const act = state.acts[state.actIndex]
  return (
    Object.values(state.locations).some(
      (l) =>
        l.revealed && resigns(locationBehavior(l.id)?.abilities?.(state, l, investigator) ?? []),
    ) ||
    currentAgendas(state).some((a) =>
      resigns(agendaBehavior(a.code)?.abilities?.(state, a, investigator) ?? []),
    ) ||
    (!!act && resigns(actBehavior(act.code)?.abilities?.(state, act, investigator) ?? []))
  )
}
registerPlayerCard({
  code: '02151',
  canPlay: resignAbilityInPlay,
  play: (_state, investigator) => [{ type: 'Resign', investigator }],
})
