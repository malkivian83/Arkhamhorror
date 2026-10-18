<script setup lang="ts">
import type { GameState } from '@lcg/engine'
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLabels } from '../game/labels'
import { localName } from '../game/localized'
import { scenarioTransitions, type ScenarioTransition } from '../game/scenarioTransitions'
import { zoomed } from '../game/zoom'
import CardTranslation from './CardTranslation.vue'
import GameCard from './GameCard.vue'

const props = defineProps<{ state: GameState }>()
const { t } = useI18n()
const label = useLabels()
const title = useId()
const dialog = ref<HTMLDialogElement>()
const queue = ref<ScenarioTransition[]>([])
const current = computed(() => queue.value[0])
let previousFocus: HTMLElement | null = null
watch(
  () => props.state,
  (after, before) => {
    if (!before) return
    if (after.scenarioId !== before.scenarioId || after.log.length < before.log.length)
      queue.value = []
    queue.value.push(...scenarioTransitions(before, after))
  },
)
watch(
  current,
  (notice) => {
    if (notice) {
      zoomed.value = null
      if (!dialog.value?.open) {
        previousFocus =
          document.activeElement instanceof HTMLElement ? document.activeElement : null
        dialog.value?.showModal()
      }
    } else {
      dialog.value?.close()
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  },
  { flush: 'post' },
)
onBeforeUnmount(() => dialog.value?.close())
const acknowledge = () => queue.value.shift()
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="transition" :aria-labelledby="title" @cancel.prevent @keydown.stop>
      <template v-if="current">
        <h2 :id="title">
          {{ t(`table.${current.kind}Advances`) }}: {{ localName(current.card.name) }}
        </h2>
        <p>{{ t('table.resolveBack') }}</p>
        <div class="detail">
          <GameCard
            :code="current.card.code"
            :name="current.card.name"
            :width="520"
            landscape
            back
            no-zoom
          />
          <CardTranslation :code="current.card.code" back />
        </div>
        <section v-if="current.effects.length" class="effects">
          <h3>{{ t('table.transitionEffects') }}</h3>
          <ol>
            <li v-for="(event, n) in current.effects" :key="n">
              {{ label(event.key, event.params ?? {}) }}
            </li>
          </ol>
        </section>
        <section v-if="current.arrivals.length">
          <h3>{{ t('table.transitionArrivals') }}</h3>
          <div class="arrivals">
            <figure v-for="(card, n) in current.arrivals" :key="n">
              <GameCard :code="card.code" :name="card.name" :width="140" no-zoom />
              <figcaption>{{ localName(card.name) }}</figcaption>
            </figure>
          </div>
        </section>
        <section v-if="current.nextCard">
          <h3>{{ t('table.nextScenarioCard') }}</h3>
          <div class="detail">
            <GameCard
              :code="current.nextCard.code"
              :name="current.nextCard.name"
              :width="400"
              landscape
              no-zoom
            />
            <CardTranslation :code="current.nextCard.code" />
          </div>
        </section>
        <p>{{ t('table.transitionContinue') }}</p>
        <footer>
          <button type="button" class="primary" autofocus @click="acknowledge">
            {{ t('table.accept')
            }}<template v-if="queue.length > 1"> ({{ queue.length }})</template>
          </button>
        </footer>
      </template>
    </dialog>
  </Teleport>
</template>

<style scoped>
.transition {
  width: min(960px, calc(100vw - 24px));
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
.transition::backdrop {
  background: rgb(0 0 0 / 78%);
}
h2,
h3,
p {
  text-align: center;
}
.detail,
.arrivals {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  gap: 16px;
}
.detail :deep(.game-card) {
  width: min(520px, 100%) !important;
  min-width: 0;
  max-width: 100%;
  height: auto !important;
  aspect-ratio: 1 / 0.715;
}
.detail {
  min-width: 0;
  width: 100%;
}
.detail :deep(.translation) {
  min-width: 0;
  max-width: 100%;
}
.effects {
  max-width: 700px;
  margin: 20px auto;
}
.effects li {
  margin: 8px 0;
}
figure {
  margin: 0;
  width: 140px;
}
figcaption {
  text-align: center;
  margin-top: 6px;
}
footer {
  position: sticky;
  bottom: -20px;
  padding: 12px;
  text-align: center;
  background: var(--bg);
}
footer button {
  min-height: 44px;
  min-width: 180px;
}
</style>
