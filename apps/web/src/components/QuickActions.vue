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
    gap: 6px;
    overflow-x: auto;
    padding: 6px 8px;
    background: var(--panel);
    border-top: 1px solid var(--border);
    scrollbar-width: thin;
  }
  .quick-actions button {
    flex: none;
    min-height: 40px;
    padding: 6px 12px;
    white-space: nowrap;
  }
}
</style>
