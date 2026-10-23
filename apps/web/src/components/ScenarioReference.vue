<script setup lang="ts">
import type { GameState } from '@lcg/engine'
import { computed, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { scenarioReference } from '../game/scenarioReference'
import { localizedCards } from '../game/localized'
import GameCard from './GameCard.vue'
import CardTranslation from './CardTranslation.vue'

const props = defineProps<{ state: GameState }>()
const { t } = useI18n()
const card = computed(() => scenarioReference(props.state))
const dialog = ref<HTMLDialogElement>(),
  button = ref<HTMLButtonElement>()
const language = ref('unknown'),
  titleId = useId()
</script>

<template>
  <template v-if="card">
    <button
      ref="button"
      type="button"
      class="reference-button"
      aria-haspopup="dialog"
      :aria-label="t('table.scenarioReference')"
      :title="t('table.scenarioReference')"
      @click="dialog?.showModal()"
    >
      <GameCard :code="card.code" :name="card.name" :back="card.back" :width="48" no-zoom />
      <span>{{ t('table.scenarioReference') }}</span>
    </button>
    <Teleport to="body">
      <dialog
        ref="dialog"
        class="reference-dialog"
        :aria-labelledby="titleId"
        @close="button?.focus()"
        @click="$event.target === dialog && dialog.close()"
        @keydown.stop
      >
        <header>
          <h2 :id="titleId">{{ t('table.scenarioReference') }}</h2>
          <button type="button" autofocus :aria-label="t('table.close')" @click="dialog?.close()">
            ✕
          </button>
        </header>
        <p>{{ t(`difficulty.${state.difficulty}`) }}</p>
        <div class="reference-content">
          <GameCard
            :code="card.code"
            :name="card.name"
            :back="card.back"
            :width="360"
            no-zoom
            @image-language="language = $event"
          />
          <CardTranslation
            :code="card.code"
            :back="card.back && !!localizedCards.get(card.code)?.back_text"
            :image-language="language"
          />
        </div>
      </dialog>
    </Teleport>
  </template>
</template>

<style scoped>
.reference-button {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  padding: 4px 8px;
  color: #f4efe7;
  background: #25252b;
  border: 1px solid #62585b;
  border-radius: 6px;
  cursor: pointer;
}
.reference-button span {
  max-width: 85px;
  font:
    12px/1.3 'Source Sans 3',
    sans-serif;
}
.reference-button:focus-visible {
  outline: 2px solid #e5aa8d;
  outline-offset: 2px;
}
.reference-dialog {
  width: fit-content;
  max-width: calc(100vw - 24px);
  max-height: calc(100dvh - 24px);
  box-sizing: border-box;
  overflow: auto;
  padding: 16px;
  margin: auto;
  background: #19191d;
  color: #f4efe7;
  border: 1px solid #807574;
  border-radius: 8px;
}
.reference-dialog::backdrop {
  background: #000b;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
h2 {
  font-size: 1.1rem;
  margin: 0;
}
header button {
  min-width: 44px;
  min-height: 44px;
  background: #25252b;
  color: #f4efe7;
  border: 1px solid #807574;
  cursor: pointer;
}
.reference-content {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  flex-wrap: wrap;
  gap: 16px;
}
.reference-content :deep(.game-card) {
  max-width: calc(100vw - 60px);
  height: auto !important;
  aspect-ratio: 1 / 1.4;
}
@media (max-width: 680px) {
  .reference-button span {
    display: none;
  }
}
</style>
