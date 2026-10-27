import { synchronizeTurnActions } from './turn-actions'
import { discardOrphanedUpgrades } from './asset-upgrades'
import { EngineError } from './errors'
import { handle } from './handlers'
import { prepareGame, type NewGameOptions } from './setup'
import { releaseOrphanedSeals } from './seals'
import { push } from './state'
import type { GameState, Message, PlayerInput } from './types'

/** Límite de seguridad contra bucles infinitos de mensajes. */
const MAX_STEPS = 100_000

/** Optional read-only presentation observer. It never becomes part of a saved game. */
export type EngineObserver = (before: GameState, message: Message, after: GameState) => void

/** Prepara la partida y avanza hasta la primera decisión de un jugador. */
export function createGame(options: NewGameOptions): GameState {
  return run(prepareGame(options))
}

/** Aplica la decisión de un jugador y avanza hasta la siguiente pregunta. */
export function applyInput(
  state: GameState,
  input: PlayerInput,
  observer?: EngineObserver,
): GameState {
  if (state.outcome) throw new EngineError('El escenario ha terminado')
  const pending = state.pending
  if (!pending) throw new EngineError('No hay ninguna pregunta pendiente')
  if (pending.investigator !== input.investigator) throw new EngineError('No es tu decisión')
  const choice = pending.question.choices[input.choice]
  if (!choice) throw new EngineError('Opción no válida')
  return run(push({ ...state, pending: null }, ...choice.then), observer)
}

/** Encola mensajes delante de la cola y avanza. Útil para efectos de escenario y tests. */
export function dispatch(state: GameState, ...messages: Message[]): GameState {
  if (state.pending) throw new EngineError('Hay una pregunta pendiente')
  return run(push(state, ...messages))
}

/** Procesa la cola hasta vaciarla, hasta que haga falta una decisión o hasta el final. */
function run(initial: GameState, observer?: EngineObserver): GameState {
  let state = initial
  for (let steps = 0; !state.pending && !state.outcome && state.queue.length > 0; steps++) {
    if (steps >= MAX_STEPS) throw new EngineError('Demasiados mensajes: posible bucle')
    const [message, ...rest] = state.queue as [Message, ...Message[]]
    const before = state
    state = synchronizeTurnActions(
      before,
      releaseOrphanedSeals(
        discardOrphanedUpgrades(before, handle({ ...state, queue: rest }, message)),
      ),
      message,
    )
    // RR "Gain": clues gained from the pool or transferred also trigger forced abilities.
    const gainedClues = state.investigators.flatMap((i): Message[] => {
      const amount =
        i.clues - (before.investigators.find((old) => old.id === i.id)?.clues ?? i.clues)
      return amount > 0
        ? [{ type: 'Forced', trigger: { type: 'afterGainClues', investigator: i.id, amount } }]
        : []
    })
    if (gainedClues.length) state = push(state, ...gainedClues)
    // RR "Forced Abilities": a deck-empty condition resolves before another draw reshuffles it.
    const emptied = state.investigators.filter(
      (i) =>
        !i.eliminated &&
        i.deck.length === 0 &&
        (before.investigators.find((old) => old.id === i.id)?.deck.length ?? 0) > 0,
    )
    if (emptied.length)
      state = push(
        state,
        ...emptied.map((i): Message => ({
          type: 'Forced',
          trigger: { type: 'deckEmptied', investigator: i.id },
        })),
      )
    if (state.encounterDiscard !== before.encounterDiscard) {
      const previous = new Map<unknown, number>()
      for (const card of before.encounterDiscard) previous.set(card, (previous.get(card) ?? 0) + 1)
      const discarded: Message[] = []
      for (const card of state.encounterDiscard) {
        const count = previous.get(card) ?? 0
        if (count) previous.set(card, count - 1)
        else
          discarded.push({
            type: 'Forced',
            trigger: {
              type: 'encounterCardDiscarded',
              card,
              ...('investigator' in message && typeof message.investigator === 'string'
                ? { investigator: message.investigator }
                : {}),
            },
          })
      }
      if (discarded.length) state = push(state, ...discarded)
    }
    observer?.(before, message, state)
  }
  return state
}
