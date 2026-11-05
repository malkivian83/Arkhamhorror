<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTableGame } from '../game/tableController'
import { useLabels } from '../game/labels'
import { localName, localizedCards } from '../game/localized'
import { zoomed } from '../game/zoom'
import CardTranslation from './CardTranslation.vue'
import CardNarration from './CardNarration.vue'
import GameCard from './GameCard.vue'

const game = useTableGame()
const { t } = useI18n()
const label = useLabels()
const title = useId()
const imageLanguages = ref<Record<string, string>>({})
const dialog = ref<HTMLDialogElement>()
const accept = ref<HTMLButtonElement>()
const current = computed(() => game.advanceReview[0])
const reverseLandscape = computed(() => {
  const code = current.value?.card.code
  const type = code && localizedCards.value.get(`${code}b`)?.type_code
  return !type || !['enemy', 'asset', 'location'].includes(type)
})
const stageTitle = computed(() => {
  const f = current.value
  if (!f) return ''
  const special =
    f.kind === 'agenda'
      ? { reverse: 'agendaReverse', next: 'agendaNext', finished: 'agendaFinished' }
      : {}
  return t(`table.advanceReview.${special[f.stage as keyof typeof special] ?? f.stage}`)
})
let previousFocus: HTMLElement | null = null
function syncDialog() {
  if (current.value) {
    zoomed.value = null
    if (dialog.value && !dialog.value.open) {
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.value.showModal()
    }
    accept.value?.focus()
    dialog.value?.scrollTo({ top: 0 })
  } else {
    dialog.value?.close()
    if (previousFocus?.isConnected) previousFocus.focus()
  }
}
watch(current, syncDialog, { flush: 'post' })
onMounted(syncDialog)
onBeforeUnmount(() => dialog.value?.close())
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="transition"
      :aria-labelledby="title"
      @cancel.prevent
      @close="syncDialog"
      @keydown.stop
      @keydown.esc.prevent
    >
      <template v-if="current">
        <header>
          <p class="eyebrow">
            <template v-if="current.stage === 'setup'">{{
              t('table.advanceReview.setupEyebrow')
            }}</template>
            <template v-else
              >{{ t(`table.${current.kind}`) }} · {{ localName(current.card.name) }}</template
            >
          </p>
          <h2 :id="title">{{ stageTitle }}</h2>
          <p class="remaining">
            {{
              t(
                'table.advanceReview.remaining',
                { n: game.advanceReview.length },
                game.advanceReview.length,
              )
            }}
          </p>
        </header>
        <section v-if="current.stage === 'reverse'" class="faces">
          <figure>
            <GameCard
              :code="current.card.code"
              :name="current.card.name"
              :width="360"
              landscape
              no-zoom
            />
            <figcaption>{{ t('table.viewCardFront') }}</figcaption>
            <CardNarration :code="current.card.code" />
          </figure>
          <figure>
            <GameCard
              :code="current.card.code"
              :name="current.card.name"
              :width="480"
              :landscape="reverseLandscape"
              back
              no-zoom
              @image-language="imageLanguages[`${current.card.code}:back`] = $event"
            />
            <figcaption>{{ t('table.resolveBack') }}</figcaption>
          </figure>
          <CardTranslation
            :code="current.card.code"
            back
            :image-language="imageLanguages[`${current.card.code}:back`]"
          />
        </section>
        <div v-else-if="current.stage !== 'setup'" class="origin">
          <GameCard
            :code="current.card.code"
            :name="current.card.name"
            :width="160"
            :landscape="current.stage === 'payment' || reverseLandscape"
            :back="current.stage !== 'payment'"
            no-zoom
          />
        </div>
        <section
          v-if="current.cards.length"
          :key="`${current.card.code}-${current.stage}-${game.advanceReview.length}`"
          class="cards"
        >
          <figure
            v-for="(card, n) in current.cards"
            :key="n"
            :style="{
              '--card-ratio': card.landscape ? '1 / .715' : '1 / 1.4',
              '--card-width': card.landscape ? '440px' : '260px',
              '--card-tall': card.landscape ? '.715' : '1.4',
            }"
          >
            <div class="face">
              <GameCard
                :code="card.code"
                :name="card.name"
                :width="card.landscape ? 440 : 260"
                :landscape="!!card.landscape"
                :back="!!card.back"
                no-zoom
                @image-language="imageLanguages[`${card.code}:${!!card.back}`] = $event"
              />
              <figcaption>
                <span v-if="card.deck" class="deck-label">{{ t(`table.${card.deck}`) }}</span>
                {{
                  card.back && !card.landscape
                    ? t('table.advanceReview.unrevealed')
                    : localName(card.name)
                }}
              </figcaption>
              <p v-if="card.location" class="placement">
                {{ label('table.advanceReview.atLocation', { location: card.location }) }}
              </p>
              <p v-if="card.attachedTo" class="placement">
                {{ label('table.advanceReview.attachedTo', { name: card.attachedTo }) }}
              </p>
              <p v-if="card.controlledBy" class="placement">
                {{ label('table.advanceReview.controlledBy', { name: card.controlledBy }) }}
              </p>
              <p v-if="card.exhausted !== undefined" class="placement">
                {{ t(`table.advanceReview.${card.exhausted ? 'exhausted' : 'ready'}`) }}
              </p>
            </div>
            <CardTranslation
              v-if="current.cards.length <= 2 && !card.back"
              :code="card.code"
              :image-language="imageLanguages[`${card.code}:${!!card.back}`]"
            />
            <CardNarration v-else :code="card.code" :back="!!card.back" />
          </figure>
        </section>
        <ol v-if="current.effects.length" class="effects">
          <li v-for="(event, n) in current.effects" :key="n">
            {{ label(event.key, event.params ?? {}) }}
          </li>
        </ol>
        <section v-if="current.decision" class="decision">
          <p>{{ t('table.advanceReview.automaticPause') }}</p>
          <h3>{{ label(current.decision.prompt, current.decision.params ?? {}) }}</h3>
          <p>{{ t('game.waitingFor', { name: current.decision.name }) }}</p>
        </section>
        <footer>
          <button
            ref="accept"
            type="button"
            class="table-action"
            autofocus
            @click="game.acceptAdvance()"
          >
            {{ t('table.accept') }} ·
            {{
              t(
                game.advanceReview.length > 1
                  ? 'table.advanceReview.continue'
                  : 'table.advanceReview.return',
              )
            }}
          </button>
        </footer>
      </template>
    </dialog>
  </Teleport>
</template>

<style scoped>
.transition {
  width: min(1060px, calc(100vw - 24px));
  max-width: none;
  max-height: calc(100dvh - 24px);
  box-sizing: border-box;
  overflow: auto;
  padding: 14px 20px;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--accent);
  border-radius: 12px;
}
.transition::backdrop {
  background: rgb(0 0 0 / 90%);
}
header,
h3,
p,
figcaption {
  text-align: center;
}
h2 {
  margin: 2px 0;
}
.eyebrow {
  color: var(--accent);
  margin: 0;
}
.remaining {
  margin: 0 0 10px;
  opacity: 0.7;
  font-size: 0.85rem;
}
.faces,
.cards {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  gap: 20px;
  min-width: 0;
}
figure {
  margin: 0;
  min-width: 0;
  max-width: 100%;
}
figcaption {
  margin: 4px 0;
  font-weight: bold;
}
.origin {
  display: flex;
  justify-content: center;
  margin: 12px;
  opacity: 0.8;
}
.placement {
  margin: 0;
  color: var(--accent);
}
.cards {
  animation: arrive 0.25s ease-out;
}
.cards figure,
.face {
  display: grid;
  justify-items: center;
  gap: 4px;
}
/* Con traducción, la carta y su narración quedan a la izquierda y el texto a la derecha. */
@media (min-width: 651px) {
  /* CardTranslation tiene varias raíces y no hereda el ámbito: se seleccionan con :deep. */
  .cards :deep(figure:has(> .translation)) {
    grid-template-columns:
      min(var(--card-width), calc(32dvh / var(--card-tall)))
      minmax(0, 340px);
    column-gap: 16px;
    align-items: start;
  }
  .cards :deep(figure:has(> .translation) > .face) {
    grid-area: 1 / 1;
  }
  .cards :deep(figure:has(> .translation) > .narration) {
    grid-area: 2 / 1;
  }
  .cards :deep(figure:has(> .translation) > .translation) {
    grid-area: 1 / 2 / 3 / 3;
    align-self: center;
  }
}
/* Las cartas se ajustan a la altura de la ventana para que la pantalla quepa de un vistazo. */
.cards :deep(.game-card) {
  width: min(var(--card-width), calc(32dvh / var(--card-tall))) !important;
  height: auto !important;
  aspect-ratio: var(--card-ratio);
}
/* Narración en una sola línea: botón, barra y tiempo. */
.cards :deep(.narration) {
  width: 100%;
  box-sizing: border-box;
  margin: 2px 0 0;
  padding: 4px 10px;
  gap: 10px;
}
.cards :deep(.narration .play) {
  width: 32px;
  height: 32px;
}
.cards :deep(.narration .play svg) {
  width: 18px;
  height: 18px;
}
.cards :deep(.narration .caption) {
  display: none;
}
.cards :deep(.narration .bar) {
  margin-top: 0;
}
.faces :deep(.game-card),
.cards :deep(.game-card) {
  max-width: 100%;
}
.faces :deep(.game-card img),
.cards :deep(.game-card img) {
  object-fit: contain;
}
.faces :deep(.translation),
.cards :deep(.translation) {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}
/* Bajo las dos caras, el texto del reverso ocupa toda la fila. */
.faces :deep(.translation) {
  flex: 1 1 100%;
  width: 100%;
}
.deck-label {
  margin-right: 0.4em;
  color: var(--accent);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
/* La lista queda centrada como el resto de la pantalla; sus líneas, alineadas entre sí. */
.effects {
  box-sizing: border-box;
  width: fit-content;
  max-width: min(760px, 100%);
  margin: 12px auto 4px;
  padding-left: 1.6em;
  font-size: 1.05rem;
  line-height: 1.4;
}
.effects li {
  margin: 4px 0;
}
.decision {
  margin: 20px auto;
  max-width: 760px;
  padding: 16px;
  border: 1px solid var(--accent);
  border-radius: 8px;
}
footer {
  position: sticky;
  bottom: -14px;
  padding: 8px;
  text-align: center;
  background: var(--bg);
}
footer button {
  min-height: 48px;
  min-width: min(260px, 100%);
  max-width: 100%;
}
@keyframes arrive {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .cards {
    animation: none;
  }
}
@media (max-width: 650px) {
  .transition {
    padding: 12px;
  }
  .faces :deep(.game-card),
  .cards :deep(.game-card) {
    width: 100% !important;
    height: auto !important;
    aspect-ratio: var(--card-ratio, 1 / 1.4);
  }
  .faces figure {
    --card-ratio: 1 / 0.715;
    width: 100%;
  }
  .cards figure {
    width: 100%;
  }
  .cards :deep(.game-card) {
    max-width: 280px;
  }
  footer {
    bottom: -12px;
    padding: 8px 0;
  }
}
</style>
