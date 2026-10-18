<script setup lang="ts">
import { ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { localizedCards, localName } from '../game/localized'
import GameCard from './GameCard.vue'

/** Consulta del mazo; abrir o girar una carta nunca responde a una pregunta del motor. */
const props = defineProps<{
  kind: 'agenda' | 'act'
  cards: readonly { code?: string; name: string }[]
  activeIndex: number
}>()
const { t } = useI18n()
const dialog = ref<HTMLDialogElement>()
const trigger = ref<HTMLButtonElement>()
const titleId = useId()
const flipped = ref(new Set<number>())

function open() {
  flipped.value = new Set()
  dialog.value?.showModal()
}

function close() {
  dialog.value?.close()
}

function flip(index: number) {
  const next = new Set(flipped.value)
  if (next.has(index)) next.delete(index)
  else next.add(index)
  flipped.value = next
}

function status(index: number) {
  return index < props.activeIndex
    ? 'previous'
    : index === props.activeIndex
      ? 'current'
      : 'upcoming'
}

function nameOf(card: { code?: string; name: string }) {
  return localizedCards.value.get(card.code ?? '')?.name ?? localName(card.name)
}
</script>

<template>
  <button
    ref="trigger"
    type="button"
    class="deck-trigger"
    aria-haspopup="dialog"
    :aria-label="
      t('table.viewScenarioDeck', {
        deck: t(`table.${kind}`),
        current: activeIndex + 1,
        total: cards.length,
      })
    "
    :title="t('table.viewPile')"
    @click.stop="open"
  >
    <span class="stack-icon" aria-hidden="true">▱</span>
    {{ t(`table.${kind}`) }} {{ activeIndex + 1 }} / {{ cards.length }}
  </button>

  <Teleport to="body">
    <dialog
      ref="dialog"
      class="scenario-deck"
      :aria-labelledby="titleId"
      @cancel.prevent="close"
      @close="trigger?.focus()"
      @click="$event.target === dialog && close()"
      @keydown.stop
    >
      <header>
        <div>
          <h2 :id="titleId">{{ t(`table.${kind}Deck`) }}</h2>
          <p>{{ t('table.scenarioDeckHelp') }}</p>
        </div>
        <button type="button" class="close" :aria-label="t('table.close')" autofocus @click="close">
          ✕
        </button>
      </header>
      <ol class="cards">
        <li
          v-for="(card, index) in cards"
          :key="`${index}:${card.code ?? card.name}`"
          class="deck-card"
          :class="{ current: index === activeIndex }"
          :aria-current="index === activeIndex ? 'step' : undefined"
        >
          <div class="stage">
            <span>{{ index + 1 }} / {{ cards.length }}</span>
            <strong>{{ t(`table.deckStatus.${status(index)}`) }}</strong>
          </div>
          <div class="card-face">
            <GameCard
              :code="card.code ?? ''"
              :name="card.name"
              :width="220"
              landscape
              :back="flipped.has(index)"
              no-zoom
            />
          </div>
          <p class="name">{{ nameOf(card) }}</p>
          <button
            v-if="card.code"
            type="button"
            class="flip"
            :aria-label="
              t(flipped.has(index) ? 'table.viewCardFrontNamed' : 'table.viewCardBackNamed', {
                name: nameOf(card),
              })
            "
            :aria-pressed="flipped.has(index)"
            @click="flip(index)"
          >
            {{ t(flipped.has(index) ? 'table.viewCardFront' : 'table.viewCardBack') }}
          </button>
        </li>
      </ol>
    </dialog>
  </Teleport>
</template>

<style scoped>
.deck-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 28px;
  margin: -2px -4px 0;
  padding: 2px 5px;
  border: 0;
  background: transparent;
  color: #4a3214;
  font-family: var(--fell);
  font-size: 0.65rem;
  letter-spacing: 0.02em;
  white-space: nowrap;
  cursor: pointer;
}
.deck-trigger:hover {
  background: rgb(74 50 20 / 12%);
}
.deck-trigger:focus-visible,
.scenario-deck button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.stack-icon {
  font-size: 1.1rem;
}
.scenario-deck {
  width: min(960px, calc(100vw - 32px));
  max-width: none;
  max-height: calc(100dvh - 32px);
  padding: 0;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg);
  color: var(--text);
  box-shadow: 0 16px 56px #0009;
}
.scenario-deck::backdrop {
  background: rgb(0 0 0 / 65%);
}
header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
}
h2 {
  margin: 0;
  font-family: var(--fell);
  font-size: 1.4rem;
}
header p {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 0.85rem;
  line-height: 1.5;
}
.close {
  flex: none;
  min-width: 44px;
  min-height: 44px;
}
.cards {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  flex-wrap: wrap;
  gap: 16px;
  margin: 0;
  padding: 20px;
  list-style: none;
}
.deck-card {
  width: 244px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--panel);
}
.deck-card.current {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}
.stage {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 0.78rem;
  color: var(--muted);
}
.current .stage strong {
  color: var(--accent);
}
.card-face {
  display: grid;
  justify-items: center;
}
.name {
  margin: 12px 0;
  text-align: center;
  font-family: var(--fell);
  line-height: 1.4;
}
.flip {
  width: 100%;
  min-height: 44px;
}
@media (max-width: 600px) {
  .deck-trigger {
    min-height: 44px;
    font-size: 0.65rem;
  }
  header,
  .cards {
    padding: 14px;
  }
}
</style>
