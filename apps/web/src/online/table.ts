import { computed, reactive } from 'vue'
import { targetKey, type IndexedChoice } from '../stores/game'
import type { TableController } from '../game/tableController'
import type { gameClient } from './game'
import type { GameState } from '@lcg/engine'

/** Only server commands can change the online table. No local store or engine execution. */
export function onlineTable(client: ReturnType<typeof gameClient>): TableController {
  const state = computed<GameState | null>(() => {
    const view = client.state.value?.table
    if (!view) return null
    // Remove stale click targets while a command is unresolved (including network retries).
    const blocked = client.retry.value || client.error.value
    return {
      ...view,
      pending: view.pending
        ? {
            ...view.pending,
            question: {
              ...view.pending.question,
              choices: blocked
                ? []
                : view.pending.question.choices.map((c) => ({ ...c, then: [] })),
            },
          }
        : null,
    }
  })
  const choicesByTarget = computed(() => {
    const map = new Map<string, IndexedChoice[]>()
    state.value?.pending?.question.choices.forEach((choice, index) => {
      if (!choice.target) return
      const key = targetKey(choice.target)
      map.set(key, [...(map.get(key) ?? []), { index, choice }])
    })
    return map
  })
  return reactive({
    online: true,
    state,
    choicesByTarget,
    error: null,
    ownInvestigator: computed(() => client.state.value?.ownInvestigator),
    handCounts: computed(() =>
      Object.fromEntries(client.state.value?.investigators.map((i) => [i.id, i.handCount]) ?? []),
    ),
    stats: computed(() => client.state.value?.tableStats),
    untargetedChoices: computed(
      () =>
        state.value?.pending?.question.choices.flatMap((choice, index) =>
          choice.target ? [] : [{ choice, index }],
        ) ?? [],
    ),
    answer(index: number) {
      if (state.value?.pending?.question.choices[index]) void client.choose(index)
    },
    answerLabel(label: string) {
      const index = state.value?.pending?.question.choices.findIndex((c) => c.label === label) ?? -1
      if (index >= 0) void client.choose(index)
    },
    advanceReview: [],
    acceptAdvance() {},
    autoSteps: null,
    acceptAutoSteps() {},
    undo() {},
    undoTargets: { step: null, action: null, turn: null, round: null },
    campaign: null,
    closeScenario() {},
    quit() {},
  })
}
