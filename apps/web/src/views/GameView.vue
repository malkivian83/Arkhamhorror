<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
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
import { classColor } from '../game/cards'
import { useShortcuts } from '../game/shortcuts'
import { useEnemyArrival } from '../game/enemyArrival'
import { useGameStore } from '../stores/game'

const game = useGameStore()
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
  () => state.value?.pending?.investigator,
  (deciding) => {
    if (deciding) selected.value = deciding
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
    <SkillTestPanel :state="state" />
    <div class="players">
      <nav v-if="state.investigators.length > 1" class="tabs">
        <button
          v-for="i in state.investigators"
          :key="i.id"
          type="button"
          :class="{ active: i.id === shown?.id, deciding: i.id === state.pending?.investigator }"
          :style="{ '--class': classColor(i.id) }"
          @click="selected = i.id"
        >
          {{ i.name }}
          <span v-if="i.id === state.pending?.investigator" class="dot" :title="t('table.decides')"
            >●</span
          >
        </button>
      </nav>
      <PlayerArea
        v-if="shown"
        :state="state"
        :investigator="shown"
        :deciding="shown.id === state.pending?.investigator"
      >
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
    <MulliganNotice :state="state" />
    <CardInspector />
  </div>
  <div v-else class="empty">
    <p>{{ t('setup.noGame') }}</p>
    <button type="button" class="primary" @click="router.push('/')">
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
.tabs {
  display: flex;
  gap: 2px;
  padding: 0 8px;
  background: #121318;
  overflow-x: auto;
}
.tabs button {
  flex: none;
  min-height: 44px;
  border-radius: 6px 6px 0 0;
  border-bottom: none;
  border-top: 3px solid var(--class);
  opacity: 0.7;
}
.tabs button.active {
  opacity: 1;
  background: var(--panel);
}
.dot {
  color: var(--accent);
  margin-left: 4px;
}
.zoom {
  position: fixed;
  right: 356px;
  top: 64px;
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
