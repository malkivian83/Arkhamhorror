<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { inspected } from '../game/inspect'
import { localizedCards, localName } from '../game/localized'
import { useTableGame } from '../game/tableController'
import ActionButton from './ActionButton.vue'
import CardTranslation from './CardTranslation.vue'
import GameCard from './GameCard.vue'

/**
 * Carta tocada en un dispositivo sin ratón: ampliada para leerla y, debajo, lo
 * que se puede hacer con ella ahora. Sin opciones, solo se ve la carta.
 */
const game = useTableGame()
const { t } = useI18n()
const dialog = ref<HTMLDialogElement>()
const titleId = useId()
const language = ref('unknown')

const card = computed(() => inspected.value?.card ?? null)
const options = computed(() =>
  inspected.value ? (game.choicesByTarget.get(inspected.value.target) ?? []) : [],
)
const name = computed(() =>
  card.value ? (localizedCards.value.get(card.value.code)?.name ?? localName(card.value.name)) : '',
)
/** Tan grande como quepa, dejando sitio debajo para las opciones. */
const width = computed(() => {
  if (!card.value) return 0
  const w = window.innerWidth - 48
  const h = window.innerHeight * (options.value.length ? 0.48 : 0.62)
  return Math.round(
    card.value.landscape ? Math.min(460, w, h / 0.715) : Math.min(320, w * 0.8, h / 1.4),
  )
})

function close() {
  inspected.value = null
}
function pick(index: number) {
  close()
  game.answer(index)
}
watch(
  card,
  (open) => {
    if (open && !dialog.value?.open) dialog.value?.showModal()
    if (!open && dialog.value?.open) dialog.value.close()
  },
  { flush: 'post' },
)
// Si la pregunta del motor cambia, la carta abierta deja de ser una decisión pendiente.
watch(
  () => game.state?.pending,
  () => close(),
)
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="card-inspector"
      :aria-labelledby="titleId"
      @close="dialog?.open || close()"
      @click="$event.target === dialog && close()"
      @keydown.stop
    >
      <template v-if="card">
        <header>
          <h2 :id="titleId">{{ name }}</h2>
          <button type="button" class="close" :aria-label="t('table.close')" @click="close">
            ✕
          </button>
        </header>
        <div class="face">
          <GameCard
            :code="card.code"
            :name="card.name"
            :back="card.back"
            :landscape="card.landscape"
            :width="width"
            no-zoom
            @image-language="language = $event"
          />
        </div>
        <div v-if="options.length" class="options">
          <ActionButton
            v-for="o in options"
            :key="o.index"
            :choice="o.choice"
            @click="pick(o.index)"
          />
        </div>
        <CardTranslation :code="card.code" :back="card.back" :image-language="language" />
      </template>
    </dialog>
  </Teleport>
</template>

<style scoped>
.card-inspector {
  width: min(500px, calc(100vw - 16px));
  max-width: none;
  max-height: calc(100dvh - 16px);
  box-sizing: border-box;
  margin: auto;
  padding: 12px 12px 16px;
  overflow-y: auto;
  color: #f4efe7;
  background: #19191d;
  border: 1px solid #807574;
  border-radius: 10px;
  font-family: 'Source Sans 3', system-ui, sans-serif;
  box-shadow: 0 16px 56px #0009;
}
.card-inspector::backdrop {
  background: rgb(0 0 0 / 75%);
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
h2 {
  margin: 0;
  min-width: 0;
  font:
    700 1.05rem/1.3 'Libre Baskerville',
    Georgia,
    serif;
  letter-spacing: 0;
}
.close {
  flex: none;
  min-width: 44px;
  min-height: 44px;
  color: #e5aa8d;
  background: #25252b;
  border-color: #807574;
}
.face {
  display: flex;
  justify-content: center;
}
.face :deep(.game-card) {
  border-radius: 12px;
  box-shadow: 0 8px 28px rgb(0 0 0 / 70%);
}
.options {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 14px;
}
.options :deep(.action-button) {
  min-height: 48px;
}
.card-inspector :deep(.translation) {
  max-width: 100%;
  box-sizing: border-box;
  margin-top: 14px;
}
</style>
