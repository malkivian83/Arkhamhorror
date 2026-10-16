import { spreadingFlames, starterInvestigator, STARTER_DECKS, type Difficulty } from '@lcg/cards'
import { applyInput, createGame, type Choice, type ChoiceTarget, type GameState } from '@lcg/engine'
import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'

const STORAGE_KEY = 'lcg:game'

export type DeckKey = keyof typeof STARTER_DECKS

/** Clave única de un elemento de la mesa, para relacionarlo con las opciones. */
export function targetKey(target: ChoiceTarget): string {
  switch (target.type) {
    case 'location':
    case 'enemy':
    case 'treachery':
    case 'asset':
    case 'investigator':
      return `${target.type}:${target.id}`
    case 'hand':
      return `hand:${target.code}`
    case 'agenda':
    case 'act':
      return target.type
  }
}

export interface IndexedChoice {
  index: number
  choice: Choice
}

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as GameState) : null
  } catch {
    return null
  }
}

function save(state: GameState | null) {
  try {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Sin almacenamiento: la partida solo dura mientras la pestaña esté abierta.
  }
}

export const useGameStore = defineStore('game', () => {
  const state = shallowRef<GameState | null>(load())
  const error = shallowRef<string | null>(null)

  function set(next: GameState | null) {
    state.value = next
    save(next)
  }

  function start(decks: DeckKey[], difficulty: Difficulty) {
    error.value = null
    set(
      createGame({
        seed: Math.floor(Math.random() * 2 ** 32),
        difficulty,
        scenario: spreadingFlames(difficulty),
        investigators: decks.map((key) => starterInvestigator(key)),
      }),
    )
  }

  function answer(index: number) {
    const current = state.value
    if (!current?.pending) return
    try {
      set(applyInput(current, { investigator: current.pending.investigator, choice: index }))
      error.value = null
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
  }

  function quit() {
    set(null)
  }

  /** Opciones de la pregunta actual agrupadas por el elemento de la mesa al que se refieren. */
  const choicesByTarget = computed(() => {
    const map = new Map<string, IndexedChoice[]>()
    state.value?.pending?.question.choices.forEach((choice, index) => {
      if (!choice.target) return
      const key = targetKey(choice.target)
      map.set(key, [...(map.get(key) ?? []), { index, choice }])
    })
    return map
  })

  /** Opciones sin elemento en la mesa (se muestran como botones). */
  const untargetedChoices = computed(
    () =>
      state.value?.pending?.question.choices
        .map((choice, index) => ({ index, choice }))
        .filter(({ choice }) => !choice.target) ?? [],
  )

  return { state, error, start, answer, quit, choicesByTarget, untargetedChoices }
})
