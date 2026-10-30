import type { GameState } from '@lcg/engine'
import type { CardEntry } from '@lcg/shared'
import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'
import { unreviewedEncounterDraws } from './advanceReview'
import { useTableGame } from '../game/tableController'

/** Presentation only: the engine can continue while the card travels. */
export function useEnemyArrival(state: Readonly<Ref<GameState | null>>) {
  const game = useTableGame()
  const waiting = new Map<string, { code: string; card: HTMLElement }>()
  const active = new Set<() => void>()
  let revision = 0

  function cardAt(target: string, code?: string) {
    const selector = `[data-table-target="${CSS.escape(target)}"] .game-card`
    const cards = document.querySelectorAll?.<HTMLElement>(selector)
    return cards
      ? [...cards].find((card) => !code || !card.dataset.cardCode || card.dataset.cardCode === code)
      : document.querySelector<HTMLElement>(selector)
  }

  function enabled() {
    return (
      document.visibilityState === 'visible' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  }

  function clear() {
    revision++
    for (const stop of active) stop()
    for (const { card } of waiting.values()) card.style.removeProperty('visibility')
    waiting.clear()
  }

  function fly(card: HTMLElement, source: DOMRect) {
    const destination = card.getBoundingClientRect()
    if (!enabled() || !source.width || !destination.width || !card.animate) {
      card.style.removeProperty('visibility')
      return
    }
    // Clone the actual rendered card, preserving scans, fallback art and tokens.
    // A fixed layer escapes the map's zoom and the player area's clipping.
    const flying = card.cloneNode(true) as HTMLElement
    flying.setAttribute('aria-hidden', 'true')
    Object.assign(flying.style, {
      position: 'fixed',
      left: `${destination.left}px`,
      top: `${destination.top}px`,
      width: `${destination.width}px`,
      height: `${destination.height}px`,
      margin: '0',
      visibility: 'visible',
      pointerEvents: 'none',
      zIndex: '1200',
      transformOrigin: 'top left',
      transition: 'none',
    })
    document.body.append(flying)
    card.style.visibility = 'hidden'
    const animation = flying.animate(
      [
        {
          transform: `translate(${source.left - destination.left}px, ${source.top - destination.top}px) scale(${source.width / destination.width}, ${source.height / destination.height})`,
          filter: 'drop-shadow(0 12px 14px #0008)',
        },
        { transform: 'translate(0, 0) scale(1)', filter: 'drop-shadow(0 2px 3px #0004)' },
      ],
      { duration: 520, easing: 'cubic-bezier(0.22, 0.68, 0.25, 1)', fill: 'both' },
    )
    let stopped = false
    const stop = () => {
      if (stopped) return
      stopped = true
      animation.cancel()
      flying.remove()
      card.style.removeProperty('visibility')
      active.delete(stop)
    }
    active.add(stop)
    animation.finished.then(stop, stop)
  }

  function finishDraw(code: string | CardEntry, source?: DOMRect) {
    if (typeof code !== 'string') {
      const card = code.target ? cardAt(code.target, code.code) : null
      if (
        card &&
        source &&
        card.isConnected &&
        (!card.dataset?.cardCode || card.dataset.cardCode === code.code)
      )
        fly(card, source)
      return
    }
    const entry = [...waiting].find(([, value]) => value.code === code)
    if (!entry) return
    const [id, { card }] = entry
    waiting.delete(id)
    if (source && card.isConnected) fly(card, source)
    else card.style.removeProperty('visibility')
  }

  watch(state, async (next, previous) => {
    clear()
    if (
      !next ||
      !previous ||
      next.scenarioId !== previous.scenarioId ||
      next.log.length <= previous.log.length ||
      !enabled()
    )
      return

    const version = revision
    const drawn = unreviewedEncounterDraws(next.log.slice(previous.log.length), game.advanceReview)
    const arrivals = Object.values(next.enemies)
      .filter(
        (enemy) =>
          enemy.engagedWith && previous.enemies[enemy.id]?.engagedWith !== enemy.engagedWith,
      )
      .filter((enemy) => !game.cardEntries?.some((card) => card.target === `enemy:${enemy.id}`))
      .map((enemy) => ({
        enemy,
        source:
          cardAt(`enemy:${enemy.id}`)?.getBoundingClientRect() ??
          cardAt(`location:${enemy.location}`)?.getBoundingClientRect(),
        drawn:
          !previous.enemies[enemy.id] && drawn.some((event) => event.params?.code === enemy.code),
      }))

    await nextTick()
    if (version !== revision) return
    for (const { enemy, source, drawn } of arrivals) {
      const card = cardAt(`enemy:${enemy.id}`)
      // Only animate into the currently displayed investigator's threat area.
      if (!card?.closest('.threat')) continue
      if (drawn) {
        card.style.visibility = 'hidden'
        waiting.set(enemy.id, { code: enemy.code, card })
      } else if (source) fly(card, source)
    }
  })

  onBeforeUnmount(clear)
  return { finishDraw }
}
