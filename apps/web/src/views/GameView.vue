<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import BoardViewport from '../components/BoardViewport.vue'
import CardZoom from '../components/CardZoom.vue'
import CardPileModal from '../components/CardPileModal.vue'
import ChoiceModal from '../components/ChoiceModal.vue'
import DrawSpotlight from '../components/DrawSpotlight.vue'
import LocationMap from '../components/LocationMap.vue'
import PlayerArea from '../components/PlayerArea.vue'
import ScenarioRow from '../components/ScenarioRow.vue'
import SidePanel from '../components/SidePanel.vue'
import SkillTestPanel from '../components/SkillTestPanel.vue'
import StoryModal from '../components/StoryModal.vue'
import { classColor } from '../game/cards'
import { useShortcuts } from '../game/shortcuts'
import { useGameStore } from '../stores/game'

const game = useGameStore()
const router = useRouter()
const { t } = useI18n()

const state = computed(() => game.state)
useShortcuts()

/** Investigador cuya zona se muestra; sigue al que tiene que decidir. */
const selected = ref<string | null>(null)
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
    <div class="main">
      <ScenarioRow :state="state" />
      <BoardViewport :reset-key="state.scenarioId" class="board playmat sigil">
        <LocationMap :state="state" />
        <template #overlay>
          <SkillTestPanel :state="state" />
        </template>
      </BoardViewport>
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
            <span
              v-if="i.id === state.pending?.investigator"
              class="dot"
              :title="t('table.decides')"
              >●</span
            >
          </button>
        </nav>
        <PlayerArea
          v-if="shown"
          :state="state"
          :investigator="shown"
          :deciding="shown.id === state.pending?.investigator"
        />
      </div>
    </div>
    <SidePanel :state="state" />

    <div class="zoom">
      <CardZoom />
    </div>
    <ChoiceModal :state="state" />
    <StoryModal :state="state" />
    <CardPileModal />
    <DrawSpotlight :state="state" />
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  height: calc(100vh - 52px);
  height: calc(100dvh - 52px);
}
.main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-y: auto;
  scrollbar-width: none;
}
.main::-webkit-scrollbar {
  display: none;
}
.board {
  flex: 1 0 420px;
  min-height: 420px;
}
.players {
  display: flex;
  flex-direction: column;
}
.tabs {
  display: flex;
  gap: 2px;
  padding: 0 8px;
  background: #121318;
}
.tabs button {
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
  z-index: 50;
  pointer-events: none;
}
.empty {
  padding: 40px;
  text-align: center;
}
@media (max-width: 900px) {
  .table {
    grid-template-columns: 1fr;
    height: auto;
  }
  .zoom {
    display: none;
  }
  .board {
    flex: none;
    height: clamp(360px, 65svh, 600px);
    min-height: 360px;
  }
}
</style>
