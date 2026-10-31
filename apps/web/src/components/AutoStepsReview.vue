<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { showAutoSteps } from '../game/autoStepsPreference'
import { useTableGame } from '../game/tableController'
import { useLabels } from '../game/labels'
import { zoomed } from '../game/zoom'

/**
 * Lo que el juego ha resuelto solo tras la última decisión (fin de turno,
 * fases de enemigos, mantenimiento y mitos…), con su motivo, para que nada
 * parezca ocurrir sin explicación. Todos los pasos se ven a la vez y basta un
 * clic (o Escape) para volver a la mesa. Espera a que termine la revisión de
 * avance de acto o plan, que se muestra antes.
 */
const game = useTableGame()
const { t } = useI18n()
const label = useLabels()
const title = useId()
const dialog = ref<HTMLDialogElement>()
const accept = ref<HTMLButtonElement>()

const review = computed(() =>
  game.advanceReview.length || game.cardEntries.length ? null : game.autoSteps,
)
const steps = computed(() => review.value?.steps ?? [])

function close() {
  if (game.autoSteps) game.acceptAutoSteps()
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
      @cancel.prevent="close"
      @close="syncDialog"
      @keydown.stop
    >
      <template v-if="review">
        <header>
          <p class="eyebrow">{{ t('table.autoSteps.eyebrow') }}</p>
          <h2 :id="title">{{ t('table.autoSteps.title') }}</h2>
        </header>
        <ol class="steps">
          <li
            v-for="(step, n) in steps"
            :key="n"
            :class="[step.kind, { quiet: !step.effects.length }]"
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
        <section v-if="review.next" class="next">
          <p>{{ t('table.autoSteps.stops') }}</p>
          <h3>{{ label(review.next.prompt, review.next.params ?? {}) }}</h3>
          <p>{{ t('game.waitingFor', { name: review.next.name }) }}</p>
        </section>
        <footer>
          <button type="button" class="table-action disable" @click="disable">
            {{ t('table.autoSteps.disable') }}
          </button>
          <button ref="accept" type="button" class="table-action" autofocus @click="close">
            {{ t('table.advanceReview.return') }}
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
