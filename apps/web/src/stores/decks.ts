import {
  arkhamDbDeckId,
  deckFromArkhamDb,
  validateDeck,
  type ArkhamDbDeck,
  type DeckList,
} from '@lcg/cards'
import type { CardCode } from '@lcg/engine'
import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

const STORAGE_KEY = 'lcg:decks'
const REWARDS_KEY = 'lcg:rewards'

function loadRewards(): CardCode[] {
  try {
    const raw = localStorage.getItem(REWARDS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed)
      ? parsed.filter((code): code is CardCode => typeof code === 'string')
      : []
  } catch {
    return []
  }
}

function load(): DeckList[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as DeckList[]) : []
  } catch {
    return []
  }
}

/** Identificador nuevo para un mazo. */
export const newDeckId = () =>
  `deck-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

export type ImportResult =
  | { ok: true; deck: DeckList; unknown: string[] }
  | { ok: false; error: 'badLink' | 'notFound' | 'network' | 'investigator'; unknown?: string[] }

/** Mazos propios del jugador, guardados en el navegador. */
export const useDecksStore = defineStore('decks', () => {
  const decks = shallowRef<DeckList[]>(load())
  /** Cartas de recompensa ganadas en campañas (Collector…), para mazos nuevos. */
  const rewards = shallowRef<CardCode[]>(loadRewards())

  function addRewards(codes: CardCode[]) {
    const next = [...new Set([...rewards.value, ...codes])]
    if (next.length === rewards.value.length) return
    rewards.value = next
    try {
      localStorage.setItem(REWARDS_KEY, JSON.stringify(next))
    } catch {
      // Sin almacenamiento: duran lo que la pestaña.
    }
  }

  /** Comprueba un mazo para empezar una campaña, con las recompensas ganadas. */
  const check = (deck: DeckList) => validateDeck(deck, true, rewards.value)

  function persist(next: DeckList[]) {
    decks.value = next
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Sin almacenamiento: los mazos solo duran mientras la pestaña esté abierta.
    }
  }

  function save(deck: DeckList) {
    const exists = decks.value.some((d) => d.id === deck.id)
    persist(exists ? decks.value.map((d) => (d.id === deck.id ? deck : d)) : [...decks.value, deck])
  }

  function remove(id: string) {
    persist(decks.value.filter((d) => d.id !== id))
  }

  /**
   * Importa un mazo de ArkhamDB por su enlace o número. Prueba como mazo publicado
   * y, si no existe, como mazo privado compartido.
   */
  async function importFromArkhamDb(input: string): Promise<ImportResult> {
    const parsed = arkhamDbDeckId(input)
    if (!parsed) return { ok: false, error: 'badLink' }
    const kinds = parsed.kind === 'deck' ? ['deck', 'decklist'] : ['decklist', 'deck']
    let data: ArkhamDbDeck | null = null
    try {
      for (const kind of kinds) {
        const response = await fetch(`https://arkhamdb.com/api/public/${kind}/${parsed.id}`)
        if (!response.ok) continue
        const json = (await response.json()) as ArkhamDbDeck | null
        if (json?.slots) {
          data = json
          break
        }
      }
    } catch {
      return { ok: false, error: 'network' }
    }
    if (!data) return { ok: false, error: 'notFound' }
    const { deck, unknown } = deckFromArkhamDb(data, newDeckId())
    if (!deck) return { ok: false, error: 'investigator', unknown }
    save(deck)
    return { ok: true, deck, unknown }
  }

  return { decks, rewards, addRewards, check, save, remove, importFromArkhamDb }
})
