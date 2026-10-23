<script setup lang="ts">
import { ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { localizedCards, localName } from '../game/localized'
import GameCard from './GameCard.vue'
import CardDetails from './CardDetails.vue'

/** Consulta del mazo; abrir o girar una carta nunca responde a una pregunta del motor. */
const props = defineProps<{
  kind: 'agenda' | 'act'
  cards: readonly { code?: string; name: string }[]
  activeIndex: number
  totalCards?: number | undefined
  compact?: boolean
}>()
const { t } = useI18n()
const dialog = ref<HTMLDialogElement>()
const trigger = ref<HTMLButtonElement>()
const titleId = useId()
const flipped = ref(new Set<number>())
const enlarged = ref<number | null>(null)

function open() {
  flipped.value = new Set()
  enlarged.value = null
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
    :class="{ compact }"
    aria-haspopup="dialog"
    :aria-label="
      t('table.viewScenarioDeck', {
        deck: t(`table.${kind}`),
        current: activeIndex + 1,
        total: totalCards ?? cards.length,
      })
    "
    :title="t('table.viewPile')"
    @click.stop="open"
  >
    <img
      v-if="compact"
      :src="`/local-assets/home/icon-${kind === 'agenda' ? 'campaign' : 'investigators'}.webp`"
      alt=""
      width="28"
      height="28"
    />
    <span v-else class="stack-icon" aria-hidden="true">▱</span>
    <span class="deck-caption"
      ><span>{{ t(`table.${kind}`) }}</span>
      <span class="deck-stage">{{ activeIndex + 1 }}/{{ totalCards ?? cards.length }}</span></span
    >
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
        <button
          type="button"
          class="close deck-action"
          :aria-label="t('table.close')"
          autofocus
          @click="close"
        >
          ✕
        </button>
      </header>
      <section v-if="enlarged !== null && cards[enlarged]" class="enlarged">
        <button type="button" class="deck-action" @click="enlarged = null">
          <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {{ t('table.backToDeck') }}
        </button>
        <div class="detail">
          <CardDetails
            :code="cards[enlarged]!.code ?? ''"
            :name="cards[enlarged]!.name"
            :width="560"
            landscape
            :back="flipped.has(enlarged)"
            no-zoom
          />
        </div>
        <button
          type="button"
          class="deck-action"
          :aria-pressed="flipped.has(enlarged)"
          @click="flip(enlarged)"
        >
          <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.9 1 6.7 2.7L21 8M21 3v5h-5" />
          </svg>
          {{ t(flipped.has(enlarged) ? 'table.viewCardFront' : 'table.viewCardBack') }}
        </button>
      </section>
      <ol v-else class="cards">
        <li
          v-for="(card, index) in cards"
          :key="`${index}:${card.code ?? card.name}`"
          class="deck-card"
          :class="{ current: index === activeIndex }"
          :aria-current="index === activeIndex ? 'step' : undefined"
        >
          <div class="stage">
            <span>{{ index + 1 }} / {{ totalCards ?? cards.length }}</span>
            <strong>{{ t(`table.deckStatus.${status(index)}`) }}</strong>
          </div>
          <button
            type="button"
            class="card-face"
            :aria-label="t('table.enlargeCard', { name: nameOf(card) })"
            @click="enlarged = index"
          >
            <GameCard
              :code="card.code ?? ''"
              :name="card.name"
              :width="220"
              landscape
              :back="flipped.has(index)"
              no-zoom
            />
          </button>
          <p class="name">{{ nameOf(card) }}</p>
          <div class="card-actions">
            <button type="button" class="deck-action" @click="enlarged = index">
              <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
              {{ t('table.enlarge') }}
            </button>
            <button
              v-if="card.code"
              type="button"
              class="deck-action"
              :aria-label="
                t(flipped.has(index) ? 'table.viewCardFrontNamed' : 'table.viewCardBackNamed', {
                  name: nameOf(card),
                })
              "
              :aria-pressed="flipped.has(index)"
              @click="flip(index)"
            >
              <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.9 1 6.7 2.7L21 8M21 3v5h-5" />
              </svg>
              {{ t(flipped.has(index) ? 'table.viewCardFront' : 'table.viewCardBack') }}
            </button>
          </div>
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
.deck-trigger.compact {
  width: 100%;
  min-height: 44px;
  margin: 0;
  padding: 5px 2px;
  gap: 5px;
  border-radius: 3px;
  background: #25252b;
  color: #f4efe7;
  font:
    400 0.75rem/1.2 'Source Sans 3',
    system-ui,
    sans-serif;
  letter-spacing: 0;
}
.deck-trigger.compact:hover {
  background: #37303a;
}
.compact img {
  width: 26px;
  height: 26px;
  object-fit: contain;
}
.compact .deck-caption {
  display: grid;
  gap: 3px;
  text-align: left;
}
.compact .deck-stage {
  color: #e5aa8d;
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
}
.scenario-deck {
  --accent: #e5aa8d;
  --border: #807574;
  --muted: #c3bbb4;
  width: min(960px, calc(100vw - 32px));
  max-width: none;
  max-height: calc(100dvh - 32px);
  padding: 0;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #19191d;
  color: #f4efe7;
  font-family: 'Source Sans 3', system-ui, sans-serif;
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
  padding: 0;
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
  padding: 0;
  border: 0;
  background: transparent;
}
.enlarged {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr);
  padding: 20px;
  display: grid;
  justify-items: center;
  gap: 16px;
}
.detail {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: center;
  gap: 16px;
  width: 100%;
  min-width: 0;
}
.detail :deep(.game-card) {
  width: min(560px, 100%) !important;
  min-width: 0;
  max-width: 100%;
  height: auto !important;
  aspect-ratio: 1 / 0.715;
}
.detail :deep(.translation) {
  min-width: 0;
  max-width: 100%;
}
.name {
  margin: 12px 0 10px;
  text-align: center;
  font-family: var(--fell);
  line-height: 1.4;
}
/* Botones del visor: placa grafito con filo de cobre e icono, como las fichas de la portada. */
.deck-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 40px;
  padding: 6px 12px;
  border: 1px solid rgb(229 170 141 / 40%);
  border-radius: 3px;
  background: linear-gradient(180deg, #2f2c32, #1f1d22);
  color: #f4efe7;
  font-family: var(--fell);
  font-size: 0.95rem;
  line-height: 1.1;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 6%),
    0 2px 6px rgb(0 0 0 / 40%);
  cursor: pointer;
}
.deck-action:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: linear-gradient(180deg, #3a3439, #262328);
}
.deck-action[aria-pressed='true'] {
  color: var(--accent);
  border-color: var(--accent);
  background: rgb(229 170 141 / 12%);
}
.action-icon {
  flex: none;
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.card-actions {
  display: flex;
  gap: 8px;
}
/* La tarjeta mide lo mismo en escritorio y en móvil: dos botones en una línea. */
.card-actions .deck-action {
  flex: 1;
  min-width: 0;
  min-height: 36px;
  padding-inline: 6px;
  gap: 4px;
  font-size: 0.8rem;
  white-space: nowrap;
}
.card-actions .action-icon {
  width: 13px;
  height: 13px;
}
@media (max-width: 900px) {
  .deck-trigger.compact {
    gap: 3px;
    padding-inline: 0;
    font-size: 0.6875rem;
  }
  .compact img {
    width: 22px;
    height: 22px;
  }
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
  .name {
    margin: 8px 0 6px;
    font-size: 0.9rem;
  }
  .deck-action {
    min-height: 34px;
    padding: 4px 8px;
    gap: 4px;
    font-size: 0.8rem;
  }
  .card-actions .deck-action {
    min-height: 32px;
    font-size: 0.75rem;
  }
  .close {
    min-width: 40px;
    min-height: 40px;
  }
  .action-icon {
    width: 13px;
    height: 13px;
  }
}
</style>
