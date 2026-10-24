<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AutoStepsReview from '../components/AutoStepsReview.vue'
import BoardViewport from '../components/BoardViewport.vue'
import CardInspector from '../components/CardInspector.vue'
import CardZoom from '../components/CardZoom.vue'
import CardPileModal from '../components/CardPileModal.vue'
import ChoiceModal from '../components/ChoiceModal.vue'
import DrawSpotlight from '../components/DrawSpotlight.vue'
import LocationMap from '../components/LocationMap.vue'
import MulliganNotice from '../components/MulliganNotice.vue'
import PlayerArea from '../components/PlayerArea.vue'
import ScenarioRow from '../components/ScenarioRow.vue'
import ScenarioTransition from '../components/ScenarioTransition.vue'
import SidePanel from '../components/SidePanel.vue'
import SkillTestPanel from '../components/SkillTestPanel.vue'
import StoryModal from '../components/StoryModal.vue'
import TargetPrompt from '../components/TargetPrompt.vue'
import { classColor } from '../game/cards'
import { useShortcuts } from '../game/shortcuts'
import { useEnemyArrival } from '../game/enemyArrival'
import { useTableGame } from '../game/tableController'

const game = useTableGame()
const router = useRouter()
const { t } = useI18n()

const state = computed(() => game.state)
const { finishDraw } = useEnemyArrival(state)
useShortcuts()

/** Investigador cuya zona se muestra; sigue al que tiene que decidir. */
const selected = ref<string | null>(null)
const showCase = ref(false)
const caseButton = ref<HTMLButtonElement | null>(null)
function closeCase() {
  showCase.value = false
  caseButton.value?.focus()
}
watch(
  () => [game.ownInvestigator, state.value?.pending?.investigator] as const,
  ([mine, deciding]) => {
    if (game.online) {
      if (!selected.value) selected.value = mine ?? null
    } else if (deciding) selected.value = deciding
  },
  { immediate: true },
)
const shown = computed(
  () =>
    state.value?.investigators.find((i) => i.id === selected.value) ??
    state.value?.investigators[0],
)
</script>

<template>
  <div v-if="state" class="table">
    <ScenarioRow :state="state" class="scenario-toolbar" />
    <BoardViewport :reset-key="state.scenarioId" class="board playmat sigil">
      <LocationMap :state="state" />
    </BoardViewport>
    <TargetPrompt :state="state" />
    <SkillTestPanel :state="state" />
    <div class="players">
      <PlayerArea
        v-if="shown"
        :state="state"
        :investigator="shown"
        :deciding="
          shown.id === state.pending?.investigator &&
          (!game.online || shown.id === game.ownInvestigator)
        "
        :private-hand="!!game.online && shown.id !== game.ownInvestigator"
        :hand-count="game.handCounts?.[shown.id]"
      >
        <!-- Con varios investigadores, el nombre de la cabecera hace de selector. -->
        <template v-if="state.investigators.length > 1" #name>
          <nav class="tabs" :aria-label="t('table.investigators')">
            <button
              v-for="i in state.investigators"
              :key="i.id"
              type="button"
              class="ui-plain"
              :class="{ active: i.id === shown?.id }"
              :aria-pressed="i.id === shown?.id"
              :style="{ '--class': classColor(i.id) }"
              @click="selected = i.id"
            >
              {{ i.name }}
              <span
                v-if="i.id === state.pending?.investigator"
                class="dot"
                :title="t('table.decides')"
                >●</span
              >
            </button>
          </nav>
        </template>
        <template #controls>
          <button
            ref="caseButton"
            type="button"
            class="case-toggle"
            :aria-expanded="showCase"
            :aria-label="showCase ? t('table.close') : t('table.caseControls')"
            :title="t('table.caseControls')"
            aria-controls="case-panel"
            @click="showCase = !showCase"
          >
            {{ showCase ? t('table.close') : t('table.actions') }}
          </button>
        </template>
      </PlayerArea>
    </div>
    <SidePanel
      id="case-panel"
      :state="state"
      class="case-panel"
      :class="{ visible: showCase }"
      @close="closeCase"
      @keydown.esc.prevent.stop="closeCase"
    />

    <div class="zoom">
      <CardZoom />
    </div>
    <ChoiceModal :state="state" />
    <StoryModal :state="state" />
    <CardPileModal />
    <DrawSpotlight :state="state" @dismissed="finishDraw" />
    <ScenarioTransition />
    <AutoStepsReview />
    <MulliganNotice :state="state" />
    <CardInspector />
  </div>
  <div v-else class="empty">
    <p>{{ t('setup.noGame') }}</p>
    <button type="button" class="table-action" @click="router.push('/')">
      {{ t('table.newGame') }}
    </button>
  </div>
</template>

<style scoped>
.table {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}
.scenario-toolbar {
  grid-column: 1;
  grid-row: 1;
}
.board {
  grid-column: 1;
  grid-row: 2;
  min-height: 0;
}
.players {
  position: relative;
  grid-column: 1;
  grid-row: 3;
  display: flex;
  flex-direction: column;
  min-width: 0;
  z-index: 10;
}
.case-panel {
  grid-column: 2;
  grid-row: 1 / -1;
  overflow-y: auto;
}
.case-toggle {
  display: none;
}
/* Selector compacto en la cabecera del investigador: el activo, como el título. */
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  min-width: 0;
}
.tabs button {
  min-height: 32px;
  padding: 2px 0;
  border-bottom: 2px solid transparent;
  color: #c3bbb4;
  font-size: 0.95rem;
  font-weight: 600;
  text-shadow: 0 1px 3px rgb(0 0 0 / 80%);
  cursor: pointer;
}
.tabs button:hover {
  color: var(--ink);
}
.tabs button.active {
  color: var(--brass);
  border-bottom-color: var(--class);
}
.tabs button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.dot {
  color: var(--accent);
  margin-left: 4px;
}
/* Ampliación fija en la esquina inferior izquierda del tapete, lejos de la barra del escenario. */
.zoom {
  grid-column: 1;
  grid-row: 2;
  align-self: end;
  justify-self: start;
  position: relative;
  margin: 0 0 12px 12px;
  z-index: 1100;
  pointer-events: none;
}
.empty {
  padding: 40px;
  text-align: center;
}
@media (max-width: 900px) {
  .table {
    grid-template-columns: minmax(0, 1fr);
  }
  .zoom {
    display: none;
  }
  .case-panel {
    display: none;
    grid-column: 1 / -1;
    grid-row: 1 / 3;
    z-index: 20;
    border-left: 0;
    padding-bottom: 54px;
  }
  .case-panel.visible {
    display: flex;
  }
  .case-toggle {
    display: block;
    margin-left: auto;
    min-height: 32px;
    padding: 2px 6px;
    font-size: 0.7rem;
    z-index: 30;
    color: var(--parch-ink);
    background: var(--parch);
    border-color: var(--brass);
    box-shadow: 0 2px 8px #0008;
  }
  .players {
    z-index: 30;
  }
}
</style>
