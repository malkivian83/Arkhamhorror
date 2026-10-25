<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { showAutoSteps } from '../game/autoStepsPreference'
import { useTableGame } from '../game/tableController'
import { useLabels } from '../game/labels'
import { zoomed } from '../game/zoom'

/**
 * Lo que el juego ha resuelto solo tras la última decisión (fin de turno,
 * fases de enemigos, mantenimiento y mitos…), paso a paso y con su motivo,
 * para que nada parezca ocurrir sin explicación. Espera a que termine la
 * revisión de avance de acto o plan, que se muestra antes.
 */
const game = useTableGame()
const { t } = useI18n()
const label = useLabels()
const title = useId()
const dialog = ref<HTMLDialogElement>()
const accept = ref<HTMLButtonElement>()
const list = ref<HTMLOListElement>()
/** Pasos ya mostrados: se descubren de uno en uno. */
const revealed = ref(1)

const review = computed(() => (game.advanceReview.length ? null : game.autoSteps))
const steps = computed(() => review.value?.steps ?? [])
const visible = computed(() => steps.value.slice(0, revealed.value))
const done = computed(() => revealed.value >= steps.value.length)

function next() {
  if (done.value) {
    game.acceptAutoSteps()
    return
  }
  revealed.value++
  void nextTick(() =>
    list.value?.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
  )
}
function showAll() {
  revealed.value = steps.value.length
}
/** Desactiva el visor (se vuelve a activar desde el menú de la partida). */
function disable() {
  showAutoSteps.value = false
}
watch(showAutoSteps, (on) => {
  if (!on && game.autoSteps) game.acceptAutoSteps()
})

let previousFocus: HTMLElement | null = null
function syncDialog() {
  if (review.value) {
    zoomed.value = null
    if (dialog.value && !dialog.value.open) {
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.value.showModal()
    }
    accept.value?.focus()
  } else {
    dialog.value?.close()
    if (previousFocus?.isConnected) previousFocus.focus()
  }
}
watch(review, () => (revealed.value = 1))
watch(review, syncDialog, { flush: 'post' })
onMounted(syncDialog)
onBeforeUnmount(() => dialog.value?.close())
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="auto-steps"
      :aria-labelledby="title"
      @cancel.prevent="showAll"
      @close="syncDialog"
      @keydown.stop
    >
      <template v-if="review">
        <header>
          <p class="eyebrow">{{ t('table.autoSteps.eyebrow') }}</p>
          <h2 :id="title">{{ t('table.autoSteps.title') }}</h2>
          <p class="progress">
            {{ t('table.autoSteps.progress', { n: visible.length, total: steps.length }) }}
          </p>
        </header>
        <ol ref="list" class="steps" aria-live="polite">
          <li
            v-for="(step, n) in visible"
            :key="n"
            :class="[step.kind, { current: n === visible.length - 1, quiet: !step.effects.length }]"
          >
            <h3>{{ label(step.key, step.params ?? {}) }}</h3>
            <p v-if="step.reason" class="reason">
              <span class="why">{{ t('table.autoSteps.why') }}</span> {{ t(step.reason) }}
            </p>
            <ul v-if="step.effects.length" class="effects">
              <li v-for="(effect, m) in step.effects" :key="m">
                {{ label(effect.key, effect.params ?? {}) }}
              </li>
            </ul>
            <p v-else-if="step.kind === 'step'" class="none">
              {{ t('table.autoSteps.noChanges') }}
            </p>
          </li>
        </ol>
        <section v-if="done && review.next" class="next">
          <p>{{ t('table.autoSteps.stops') }}</p>
          <h3>{{ label(review.next.prompt, review.next.params ?? {}) }}</h3>
          <p>{{ t('game.waitingFor', { name: review.next.name }) }}</p>
        </section>
        <footer>
          <button type="button" class="table-action disable" @click="disable">
            {{ t('table.autoSteps.disable') }}
          </button>
          <button v-if="!done" type="button" class="table-action" @click="showAll">
            {{ t('table.autoSteps.showAll') }}
          </button>
          <button ref="accept" type="button" class="table-action" autofocus @click="next">
            {{ t(done ? 'table.advanceReview.return' : 'table.advanceReview.continue') }}
          </button>
        </footer>
      </template>
    </dialog>
  </Teleport>
</template>

<style scoped>
.auto-steps {
  width: min(760px, calc(100vw - 24px));
  max-width: none;
  max-height: calc(100dvh - 24px);
  box-sizing: border-box;
  overflow: auto;
  padding: 20px;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--accent);
  border-radius: 12px;
}
.auto-steps::backdrop {
  background: rgb(0 0 0 / 75%);
}
header,
.next {
  text-align: center;
}
h2 {
  margin: 8px 0;
}
.eyebrow {
  color: var(--accent);
  margin: 0;
}
.progress {
  margin: 0;
  opacity: 0.7;
  font-size: 0.85rem;
}
.steps {
  margin: 16px 0;
  padding: 0;
  list-style: none;
}
.steps > li {
  margin: 0 0 10px;
  padding: 10px 14px;
  border-left: 3px solid var(--accent);
  border-radius: 6px;
  background: rgb(255 255 255 / 4%);
  animation: arrive 0.25s ease-out;
}
.steps > li.quiet {
  opacity: 0.7;
}
.steps > li.current {
  opacity: 1;
  background: rgb(255 255 255 / 9%);
}
.steps > li.round {
  border-left: none;
  background: none;
  text-align: center;
  color: var(--accent);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
h3 {
  margin: 0;
  font-size: 1.05rem;
}
.reason,
.none {
  margin: 4px 0 0;
  font-size: 0.9rem;
  opacity: 0.85;
}
.why {
  color: var(--accent);
  font-weight: bold;
}
.effects {
  margin: 6px 0 0;
  padding-left: 1.4em;
  line-height: 1.45;
}
.next {
  margin: 16px auto;
  padding: 12px;
  border: 1px solid var(--accent);
  border-radius: 8px;
}
.next p {
  margin: 4px 0;
}
footer {
  position: sticky;
  bottom: -20px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  padding: 12px;
  background: var(--bg);
}
footer .disable {
  color: var(--text);
  background: transparent;
  border: 1px solid var(--accent);
  box-shadow: none;
}
footer button {
  min-height: 48px;
  min-width: min(200px, 100%);
}
@keyframes arrive {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .steps > li {
    animation: none;
  }
}
@media (max-width: 650px) {
  .auto-steps {
    padding: 12px;
  }
  footer {
    bottom: -12px;
    padding: 8px 0;
  }
}
</style>
