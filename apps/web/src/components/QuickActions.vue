<script setup lang="ts">
import type { GameState } from '@lcg/engine'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLabels } from '../game/labels'
import { useTableGame } from '../game/tableController'

/**
 * Narrow screens hide the side panel, which holds the choices without a table target
 * (draw, resource, end turn, skip, other investigators' commits). This bar keeps them
 * one tap away above the investigator area (doc 100, D5).
 */
const props = defineProps<{ state: GameState }>()
const game = useTableGame()
const { t } = useI18n()
const label = useLabels()

const mine = computed(
  () =>
    !!props.state.pending &&
    (!game.online || props.state.pending.investigator === game.ownInvestigator),
)
const choices = computed(() => (mine.value ? game.untargetedChoices : []))
</script>

<template>
  <nav v-if="choices.length" class="quick-actions" :aria-label="t('table.actions')">
    <button
      v-for="o in choices"
      :key="o.index"
      type="button"
      :data-choice-index="o.index"
      :class="{ 'end-turn': o.choice.label === 'action.endTurn' }"
      @click="game.answer(o.index)"
    >
      {{ label(o.choice.label, o.choice.params ?? {}) }}
    </button>
  </nav>
</template>

<style scoped>
.quick-actions {
  display: none;
}
@media (max-width: 900px) {
  .quick-actions {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    padding: 3px 6px;
    background: #191510;
    border-top: 1px solid #60482b;
    scrollbar-width: thin;
  }
  .quick-actions button {
    flex: 1 0 auto;
    min-height: 34px;
    padding: 4px 7px;
    border: 1px solid #84663b;
    border-radius: 6px;
    background: linear-gradient(#433321, #2b2117);
    color: #f6e7c8;
    box-shadow:
      inset 0 1px rgb(255 237 194 / 16%),
      0 1px 2px rgb(0 0 0 / 45%);
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1.2;
    white-space: nowrap;
  }
  .quick-actions .end-turn {
    background: linear-gradient(#51332b, #34221d);
    border-color: #a07863;
  }
  .quick-actions button:active {
    box-shadow: inset 0 1px 3px rgb(0 0 0 / 65%);
  }
  .quick-actions button:focus-visible {
    outline: 2px solid #f6ce88;
    outline-offset: -3px;
  }
}
</style>
