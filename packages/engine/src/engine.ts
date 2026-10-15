import { seedRng } from './rng'
import type { GameState, Message, PlayerId, PlayerInput } from './types'

export const ENGINE_VERSION = 1

/** Límite de seguridad contra bucles infinitos de mensajes. */
const MAX_STEPS = 10_000

export class EngineError extends Error {
  override name = 'EngineError'
}

export interface NewGameOptions {
  seed: number
  players: PlayerId[]
}

export function createGame({ seed, players }: NewGameOptions): GameState {
  if (players.length < 1 || players.length > 4) {
    throw new EngineError('Una partida admite de 1 a 4 jugadores')
  }
  return run({
    engineVersion: ENGINE_VERSION,
    rng: seedRng(seed),
    round: 0,
    phase: 'setup',
    players: players.map((id) => ({ id, resources: 0 })),
    queue: [
      ...players.map((player): Message => ({ type: 'GainResources', player, amount: 5 })),
      { type: 'BeginRound' },
    ],
    pending: null,
  })
}

/** Aplica la decisión de un jugador y avanza hasta la siguiente pregunta. */
export function applyInput(state: GameState, input: PlayerInput): GameState {
  const pending = state.pending
  if (!pending) throw new EngineError('No hay ninguna pregunta pendiente')
  if (pending.player !== input.player) throw new EngineError('No es tu decisión')
  const choice = pending.question.choices[input.choice]
  if (!choice) throw new EngineError('Opción no válida')
  return run({ ...state, pending: null, queue: [...choice.then, ...state.queue] })
}

/** Encola mensajes delante de la cola y avanza. Útil para escenarios y tests. */
export function dispatch(state: GameState, ...messages: Message[]): GameState {
  if (state.pending) throw new EngineError('Hay una pregunta pendiente')
  return run(push(state, ...messages))
}

/** Procesa la cola hasta vaciarla o hasta que haga falta una decisión. */
function run(initial: GameState): GameState {
  let state = initial
  for (let steps = 0; state.pending === null && state.queue.length > 0; steps++) {
    if (steps >= MAX_STEPS) throw new EngineError('Demasiados mensajes: posible bucle')
    const [message, ...rest] = state.queue as [Message, ...Message[]]
    state = handle({ ...state, queue: rest }, message)
  }
  return state
}

/** Los mensajes que produce un manejador se insertan delante de la cola. */
function push(state: GameState, ...messages: Message[]): GameState {
  return { ...state, queue: [...messages, ...state.queue] }
}

function handle(state: GameState, message: Message): GameState {
  switch (message.type) {
    case 'BeginRound':
      return push(
        { ...state, round: state.round + 1 },
        { type: 'BeginPhase', phase: 'investigation' },
      )
    case 'BeginPhase':
      return { ...state, phase: message.phase }
    case 'EndPhase':
      return state
    case 'GainResources':
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === message.player ? { ...p, resources: p.resources + message.amount } : p,
        ),
      }
    case 'Ask':
      return { ...state, pending: { player: message.player, question: message.question } }
  }
}
