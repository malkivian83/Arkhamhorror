import {
  createAutoSteps,
  createCardEntries,
  type AutoStepsReview,
  type CardEntry,
} from '@lcg/shared'
import type { EngineObserver, GameState } from '@lcg/engine'
import { tableView } from './table'

/** Observe only the player's public projection, never raw engine effects or messages. */
function visibleState(state: GameState, mine: string | undefined): GameState {
  const view = tableView(state, mine)
  return {
    ...view,
    // Hand counts are public, but other players' card identities remain private.
    investigators: view.investigators.map((i) => ({
      ...i,
      hand:
        i.id === mine
          ? i.hand
          : Array<string>(state.investigators.find((raw) => raw.id === i.id)!.hand.length).fill(''),
    })),
    pending: view.pending
      ? { ...view.pending, question: { ...view.pending.question, choices: [] } }
      : null,
  }
}

export function createOnlineSteps(initial: GameState, players: Record<string, string | undefined>) {
  const collectors = Object.entries(players).map(([user, mine]) => {
    const visible = visibleState(initial, mine)
    return { user, mine, visible, collector: createAutoSteps(visible), cards: createCardEntries() }
  })
  const observe: EngineObserver = (_before, message, after) => {
    for (const entry of collectors) {
      const visible = visibleState(after, entry.mine)
      entry.collector.observe(entry.visible, message, visible)
      entry.cards.observe(entry.visible, message, visible)
      entry.visible = visible
    }
  }
  function finish(): Record<string, AutoStepsReview> {
    return Object.fromEntries(
      collectors.flatMap(({ user, visible, collector }) => {
        const review = collector.finish(visible)
        return review ? [[user, review]] : []
      }),
    )
  }
  function finishCards(): Record<string, CardEntry[]> {
    return Object.fromEntries(
      collectors.flatMap(({ user, cards }) =>
        cards.finish().length ? [[user, cards.finish()]] : [],
      ),
    )
  }
  return { observe, finish, finishCards }
}
