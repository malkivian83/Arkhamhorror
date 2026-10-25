/**
 * Comprobar iconos de juego y nivel de alarma (guía ES pp. 4–5).
 *
 * Los iconos comprobados se guardan en `scenarioMeta[CHECKED]` («♣Q,♥10,…») para que la
 * capacidad que los pidió los evalúe después (y El estafador pueda cambiarlos antes).
 */
import { getInvestigator, shuffle, type EncounterCard, type GameState } from '@lcg/engine'
import { formatIcon, iconOf, parseIcon, type GameIcon } from './icons'

export const CHECKED = 'fof:checked'
export const ALARM = 'fof:alarm:'

interface Piles {
  deck: EncounterCard[]
  discard: EncounterCard[]
  rng: GameState['rng']
}

/**
 * Descarta cartas del mazo hasta tener `count` con icono. Las cartas sin icono se apartan
 * y se sustituyen; si el mazo se acaba, se baraja la pila de descartes (sin las cartas de
 * esta comprobación) para formar uno nuevo.
 */
function draw(piles: Piles, count: number): { piles: Piles; checked: EncounterCard[] } {
  let { deck, discard, rng } = piles
  const checked: EncounterCard[] = []
  const aside: EncounterCard[] = []
  while (checked.length < count) {
    if (!deck.length) {
      if (!discard.length) break
      ;[deck, rng] = shuffle(discard, rng)
      discard = []
    }
    const [top, ...rest] = deck
    deck = rest
    if (iconOf(top!.code)) checked.push(top!)
    else aside.push(top!)
  }
  return { piles: { deck, discard: [...discard, ...aside], rng }, checked }
}

const iconsText = (cards: EncounterCard[]) =>
  cards.map((c) => formatIcon(iconOf(c.code)!)).join(',')

/** Iconos comprobados (con los cambios de El estafador). */
export function checkedIcons(state: GameState): GameIcon[] {
  const text = state.scenarioMeta?.[CHECKED]
  return typeof text === 'string' && text ? text.split(',').map(parseIcon) : []
}

/** Descarta `count` cartas con icono y guarda sus iconos. */
export function checkIcons(state: GameState, count: number): GameState {
  const { piles, checked } = draw(
    { deck: state.encounterDeck, discard: state.encounterDiscard, rng: state.rng },
    count,
  )
  return {
    ...state,
    rng: piles.rng,
    encounterDeck: piles.deck,
    encounterDiscard: [...piles.discard, ...checked],
    scenarioMeta: { ...state.scenarioMeta, [CHECKED]: iconsText(checked) },
  }
}

/**
 * Cambiar cartas: las comprobadas en esas posiciones se apartan y se descartan otras
 * tantas del mazo en su lugar; al terminar, las apartadas van a la pila de descartes.
 */
export function swapIcons(state: GameState, positions: number[]): GameState {
  const icons = checkedIcons(state)
  if (!positions.length) return state
  // Las cartas comprobadas son las últimas de la pila de descartes.
  const tail = state.encounterDiscard.slice(-icons.length)
  const rest = state.encounterDiscard.slice(0, -icons.length)
  const kept = tail.filter((_, n) => !positions.includes(n))
  const swapped = tail.filter((_, n) => positions.includes(n))
  const { piles, checked } = draw(
    { deck: state.encounterDeck, discard: rest, rng: state.rng },
    positions.length,
  )
  const keptIcons = icons.filter((_, n) => !positions.includes(n))
  const all = [...kept, ...checked]
  return {
    ...state,
    rng: piles.rng,
    encounterDeck: piles.deck,
    encounterDiscard: [...piles.discard, ...swapped, ...all],
    scenarioMeta: {
      ...state.scenarioMeta,
      [CHECKED]: [...keptIcons.map(formatIcon), iconsText(checked)].filter(Boolean).join(','),
    },
  }
}

/** Cambia un icono comprobado (El estafador). */
export function changeIcon(state: GameState, position: number, icon: GameIcon): GameState {
  const icons = checkedIcons(state)
  if (!icons[position]) return state
  icons[position] = icon
  return {
    ...state,
    scenarioMeta: { ...state.scenarioMeta, [CHECKED]: icons.map(formatIcon).join(',') },
  }
}

// ---------------------------------------------------------------------------
// Nivel de alarma: de 1 a 10, empieza en 1
// ---------------------------------------------------------------------------

export const alarmOf = (state: GameState, investigator: string): number => {
  const value = Number(state.scenarioMeta?.[`${ALARM}${investigator}`] ?? 1)
  return Number.isFinite(value) ? value : 1
}

/** Mayor nivel de alarma entre los investigadores (no eliminados, si los hay). */
export function highestAlarm(state: GameState, ids?: string[]): number {
  const pool = ids ?? state.investigators.filter((i) => !i.eliminated).map((i) => i.id)
  return Math.max(1, ...pool.map((id) => alarmOf(state, id)))
}

/** Cambia el nivel de alarma (limitado a 1–10). Devuelve el estado y cuánto subió. */
export function adjustAlarm(
  state: GameState,
  investigator: string,
  amount: number,
): { state: GameState; raised: number } {
  getInvestigator(state, investigator)
  const before = alarmOf(state, investigator)
  const after = Math.min(10, Math.max(1, before + amount))
  return {
    state: {
      ...state,
      scenarioMeta: { ...state.scenarioMeta, [`${ALARM}${investigator}`]: after },
    },
    raised: Math.max(0, after - before),
  }
}

/** La mitad del nivel de alarma, redondeando hacia arriba. */
export const halfAlarm = (state: GameState, investigator: string) =>
  Math.ceil(alarmOf(state, investigator) / 2)
