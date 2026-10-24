import {
  playerCardDef,
  playRestriction,
  type CardCode,
  type GameState,
  type InvestigatorId,
  type PlayRestriction,
} from '@lcg/engine'

/**
 * Por qué no se puede jugar ahora una carta de la mano que no ofrece ninguna
 * opción: primero lo que impiden las reglas (traiciones, coste, carta única…)
 * y, si nada lo impide, el momento de juego.
 */
export function handReason(
  state: GameState,
  investigator: InvestigatorId,
  code: CardCode,
): PlayRestriction | null {
  const rule = playRestriction(state, investigator, code)
  if (rule) return rule
  const def = playerCardDef(code)
  if (!def || state.outcome) return null
  const pending = state.pending
  const choosingAction =
    pending?.investigator === investigator && pending.question.prompt === 'prompt.chooseAction'
  if (def.fast) return choosingAction ? null : { key: 'unplayable.fastWindow' }
  if (!choosingAction) return { key: 'unplayable.actionTiming' }
  const self = state.investigators.find((i) => i.id === investigator)
  return self && self.actionsRemaining <= 0 ? { key: 'unplayable.noActions' } : null
}
