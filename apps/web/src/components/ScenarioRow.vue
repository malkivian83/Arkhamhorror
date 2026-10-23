<script setup lang="ts">
import { cluesToAdvanceAct, type GameState } from '@lcg/engine'
import { computed, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { localizedCards, localName } from '../game/localized'
import { showPile } from '../game/pile'
import ChaosTokenView from './ChaosTokenView.vue'
import ChaosTokenHelp from './ChaosTokenHelp.vue'
import GameCard from './GameCard.vue'
import ScenarioDeckViewer from './ScenarioDeckViewer.vue'
import ScenarioSymbol from './ScenarioSymbol.vue'
import ScenarioReference from './ScenarioReference.vue'
import TableTarget from './TableTarget.vue'
import { useTableGame } from '../game/tableController'
import TokenBadge from './TokenBadge.vue'

const props = defineProps<{ state: GameState }>()
const game = useTableGame()
const { t } = useI18n()
const bagDialog = ref<HTMLDialogElement>()
const bagButton = ref<HTMLButtonElement>()
const bagId = useId()
const stories = computed(() => Object.values(props.state.stories ?? {}))
const agenda = computed(() => props.state.agendas[props.state.agendaIndex])
const act = computed(() => props.state.acts[props.state.actIndex])
const actClues = computed(() => cluesToAdvanceAct(props.state))

function showDiscard() {
  showPile({
    title: 'table.encounterDiscard',
    cards: props.state.encounterDiscard.map((c) => ({ code: c.code, name: c.name })),
    newestFirst: true,
  })
}
function showVictory() {
  showPile({
    title: 'table.victory',
    cards: props.state.victoryDisplay.map((code) => ({ code, name: code })),
  })
}
function storyName(story: { code: string; name: string }) {
  return localizedCards.value.get(story.code)?.name ?? localName(story.name)
}
function showStory(story: { code: string; name: string }) {
  showPile({ title: 'table.story', cards: [{ code: story.code, name: story.name }] })
}
const sortedBag = computed(() =>
  [...props.state.chaosBag].sort((a, b) =>
    typeof a === 'number' && typeof b === 'number' ? b - a : typeof a === 'number' ? -1 : 1,
  ),
)
</script>

<template>
  <div class="scenario-row" role="region" :aria-label="t('table.scenario')">
    <!-- Plan y acto: cada mazo con su contador, agrupados; en escritorio, con la carta a la vista. -->
    <div
      v-if="agenda"
      class="scenario-group agenda-group"
      role="group"
      :aria-label="t('table.agenda')"
    >
      <ScenarioDeckViewer
        kind="agenda"
        :cards="state.agendas"
        :total-cards="game.stats?.agendaCount"
        :active-index="state.agendaIndex"
        compact
      />
      <TableTarget target="agenda" class="group-target">
        <GameCard
          class="group-card"
          :code="agenda.code ?? ''"
          :name="agenda.name"
          :width="72"
          landscape
          thumbnail
          color="#7a2c2c"
        />
        <span class="group-metric">
          <span class="metric-value"
            ><TokenBadge kind="doom" value="" :size="20" aria-hidden="true" /><strong
              >{{ state.doom }}/{{ agenda.doomThreshold }}</strong
            ></span
          >
          <span class="stat-label">{{ t('table.doom') }}</span>
        </span>
      </TableTarget>
    </div>
    <div v-if="act" class="scenario-group act-group" role="group" :aria-label="t('table.act')">
      <ScenarioDeckViewer
        kind="act"
        :cards="state.acts"
        :total-cards="game.stats?.actCount"
        :active-index="state.actIndex"
        compact
      />
      <TableTarget target="act" class="group-target">
        <GameCard
          class="group-card"
          :code="act.code ?? ''"
          :name="act.name"
          :width="72"
          landscape
          thumbnail
          color="#2c5a7a"
        />
        <span v-if="actClues !== null" class="group-metric">
          <span class="metric-value"
            ><TokenBadge kind="clue" value="" :size="20" aria-hidden="true" /><strong>{{
              actClues
            }}</strong></span
          >
          <span class="stat-label">{{ t('table.clues') }}</span>
        </span>
        <span v-else class="group-metric"
          ><span class="stat-label">{{ t('table.actions') }}</span></span
        >
      </TableTarget>
    </div>

    <div class="scenario-stat encounter-deck" role="group" :aria-label="t('table.encounterDeck')">
      <img src="/local-assets/home/icon-decks.webp" alt="" width="28" height="28" />
      <span class="stat-copy"
        ><span class="stat-label">{{ t('table.deck') }}</span
        ><strong class="stat-number">{{ state.encounterDeck.length }}</strong></span
      >
    </div>
    <button
      type="button"
      class="scenario-stat discard"
      :aria-label="`${t('table.encounterDiscard')}: ${state.encounterDiscard.length}`"
      @click="showDiscard"
    >
      <ScenarioSymbol kind="discard" />
      <span class="stat-copy"
        ><span class="stat-label full-label">{{ t('table.discard') }}</span
        ><span class="stat-label short-label">{{ t('table.discardShort') }}</span
        ><strong class="stat-number">{{ state.encounterDiscard.length }}</strong></span
      >
    </button>
    <button
      ref="bagButton"
      type="button"
      class="scenario-stat bag"
      :aria-label="`${t('table.chaosBag')}: ${state.chaosBag.length}`"
      aria-haspopup="dialog"
      :aria-controls="bagId"
      @click="bagDialog?.showModal()"
    >
      <ScenarioSymbol kind="bag" />
      <span class="stat-copy"
        ><span class="stat-label full-label">{{ t('table.chaosBag') }}</span
        ><span class="stat-label short-label">{{ t('table.chaosShort') }}</span
        ><strong class="stat-number">{{ state.chaosBag.length }}</strong></span
      >
    </button>
    <ScenarioReference :state="state" />
    <button
      type="button"
      class="scenario-stat victory"
      :aria-label="`${t('table.victory')}: ${state.victoryDisplay.length}`"
      @click="showVictory"
    >
      <ScenarioSymbol kind="victory" />
      <span class="stat-copy"
        ><span class="stat-label full-label">{{ t('table.victory') }}</span
        ><span class="stat-label short-label">{{ t('table.victoryShort') }}</span
        ><strong class="stat-number">{{ state.victoryDisplay.length }}</strong></span
      >
    </button>

    <div v-for="story in stories" :key="story.code" class="story-cluster">
      <button
        type="button"
        class="story-view"
        :aria-label="t('table.enlargeCard', { name: storyName(story) })"
        :title="storyName(story)"
        @click="showStory(story)"
      >
        <img src="/local-assets/home/icon-campaign.webp" alt="" width="26" height="26" /><span>{{
          storyName(story)
        }}</span>
      </button>
      <TableTarget :target="`story:${story.code}`"
        ><span class="story-clues"
          >{{ t('table.clues') }} <strong>{{ story.clues }}</strong></span
        ></TableTarget
      >
    </div>
    <div
      v-for="(cards, name) in state.scenarioDecks ?? {}"
      :key="name"
      class="scenario-stat extra-deck"
      role="group"
      :aria-label="t(`table.scenarioDeck.${name}`)"
    >
      <img src="/local-assets/home/icon-decks.webp" alt="" width="28" height="28" /><span
        class="stat-copy"
        ><span class="stat-label">{{ t(`table.scenarioDeck.${name}`) }}</span
        ><strong class="stat-number">{{ cards.length }}</strong></span
      >
    </div>
    <div v-if="state.skillTest" class="test" :aria-label="t('table.skillTest')">
      <span>{{ t('table.skillTest') }}</span
      ><ChaosTokenView
        v-for="(token, i) in state.skillTest.tokens"
        :key="i"
        :token="token"
        :size="24"
      />
    </div>

    <Teleport to="body">
      <dialog
        :id="bagId"
        ref="bagDialog"
        class="bag-dialog"
        :aria-label="t('table.chaosBag')"
        @close="bagButton?.focus()"
        @click="$event.target === bagDialog && bagDialog.close()"
        @keydown.stop
      >
        <header>
          <h2>
            {{ t('table.chaosBag') }} <span>({{ state.chaosBag.length }})</span>
          </h2>
          <button
            type="button"
            class="close-bag"
            :aria-label="t('table.close')"
            autofocus
            @click="bagDialog?.close()"
          >
            ✕
          </button>
        </header>
        <div class="bag-tokens">
          <ChaosTokenHelp
            v-for="(token, i) in sortedBag"
            :key="i"
            :state="state"
            :token="token"
            :size="42"
          />
        </div>
      </dialog>
    </Teleport>
  </div>
</template>

<style scoped>
.scenario-row {
  --accent: #e5aa8d;
  --eldritch: #e5aa8d;
  position: relative;
  z-index: 12;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
  /* A la izquierda queda el botón fijo del menú. */
  padding: 8px 8px 8px 58px;
  color: #f4efe7;
  background: #19191d;
  border-bottom: 1px solid #62585b;
  font-family: 'Source Sans 3', system-ui, sans-serif;
}
.scenario-group {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 4px;
  border: 1px solid var(--group-border);
  border-radius: 6px;
  background: var(--group-bg);
}
.agenda-group {
  --group-bg: linear-gradient(180deg, #43262a, #2d1a1d);
  --group-border: #8c4b4f;
}
.act-group {
  --group-bg: linear-gradient(180deg, #213640, #18262d);
  --group-border: #4f7c8a;
}
.scenario-group :deep(.deck-trigger.compact) {
  width: auto;
  padding: 5px 10px 5px 6px;
  background: rgb(0 0 0 / 30%);
}
.scenario-group :deep(.deck-trigger.compact:hover) {
  background: rgb(0 0 0 / 50%);
}
.scenario-group .group-target {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 4px;
}
/* El aviso de acción va debajo: encima no hay sitio en la barra. */
.group-target :deep(.hint) {
  top: auto;
  bottom: -30px;
  max-width: none;
  font:
    600 0.75rem/1.4 'Source Sans 3',
    system-ui,
    sans-serif;
}
.group-card {
  flex: none;
  border-radius: 3px;
  box-shadow: 0 2px 6px rgb(0 0 0 / 55%);
}
.group-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 56px;
  min-height: 44px;
  padding: 4px 8px;
  border-radius: 3px;
  background: rgb(0 0 0 / 30%);
}
.metric-value {
  display: flex;
  align-items: center;
  gap: 4px;
}
.metric-value strong {
  font-size: 0.95rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.scenario-stat {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  padding: 5px 10px;
  border: 1px solid #62585b;
  border-radius: 3px;
  background: #25252b;
  color: #f4efe7;
}
.scenario-stat img {
  width: 28px;
  height: 28px;
  object-fit: contain;
  flex-shrink: 0;
}
.stat-copy {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.stat-label {
  color: #d0c7c1;
  font-size: 0.75rem;
  line-height: 1.2;
}
.stat-number {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.short-label {
  display: none;
}
.victory {
  margin-left: auto;
}
.story-cluster {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 4px;
  border: 1px solid #62585b;
  border-radius: 3px;
  background: #25252b;
}
.story-view {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 3px;
  border: 0;
  background: transparent;
  color: #f4efe7;
  font-size: 0.75rem;
}
.story-view img {
  width: 26px;
  height: 26px;
  object-fit: contain;
}
.story-view > span {
  max-width: 115px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.story-clues {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  padding: 5px;
  color: #d0c7c1;
  font-size: 0.75rem;
}
.test {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  padding: 6px;
  border: 1px solid #e5aa8d;
  border-radius: 3px;
  color: #f4efe7;
  font-size: 0.75rem;
}
.bag-dialog {
  width: min(480px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  margin: auto;
  padding: 20px;
  background: #19191d;
  color: #f4efe7;
  border: 1px solid #807574;
  border-radius: 6px;
  font-family: 'Source Sans 3', system-ui, sans-serif;
}
.bag-dialog::backdrop {
  background: #000a;
}
.bag-dialog header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 18px;
}
.bag-dialog h2 {
  font:
    700 1.125rem/1.4 'Libre Baskerville',
    Georgia,
    serif;
  letter-spacing: 0;
  margin: 0;
}
.bag-dialog h2 span {
  color: #c3bbb4;
}
.close-bag {
  min-width: 44px;
  min-height: 44px;
  color: #e5aa8d;
  background: #25252b;
  border-color: #807574;
}
.bag-tokens {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
/* En escritorios estrechos, rótulos cortos para que la barra quepa en una línea. */
@media (max-width: 1400px) {
  .scenario-row {
    gap: 6px;
  }
  .scenario-stat {
    gap: 6px;
    padding-inline: 8px;
  }
  .full-label {
    display: none;
  }
  .short-label {
    display: inline;
  }
}
/* La carta del plan y del acto solo cabe en escritorio. */
@media (max-width: 1180px) {
  .group-card {
    display: none;
  }
}
/* En móvil, una sola línea que se desplaza de lado. */
@media (max-width: 680px) {
  .scenario-row {
    flex-wrap: nowrap;
    gap: 5px;
    padding: 6px 6px 6px 56px;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
  }
  .scenario-row::-webkit-scrollbar {
    display: none;
  }
  .scenario-row > * {
    flex: none;
  }
  .scenario-group {
    gap: 4px;
    padding: 3px;
  }
  .group-metric {
    padding-inline: 6px;
  }
  /* El recuadro sigue marcando lo que se puede usar; el rótulo no cabe en la barra. */
  .group-target :deep(.hint) {
    display: none;
  }
  .scenario-stat {
    min-width: 52px;
    flex-direction: column;
    gap: 2px;
    padding: 4px 2px;
  }
  .scenario-stat img,
  .scenario-stat :deep(.scenario-symbol) {
    width: 22px;
    height: 22px;
  }
  .stat-copy {
    flex-direction: row;
    align-items: baseline;
    gap: 3px;
  }
  .stat-label {
    font-size: 0.6875rem;
  }
  .stat-number {
    font-size: 0.75rem;
  }
  .full-label {
    display: none;
  }
  .short-label {
    display: inline;
  }
  .victory {
    margin-left: 0;
  }
}
</style>
