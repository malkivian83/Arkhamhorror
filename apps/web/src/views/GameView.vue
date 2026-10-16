<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import LocationMap from '../components/LocationMap.vue'
import PlayerArea from '../components/PlayerArea.vue'
import ScenarioRow from '../components/ScenarioRow.vue'
import SidePanel from '../components/SidePanel.vue'
import { zoomed } from '../game/zoom'
import { useGameStore } from '../stores/game'

const game = useGameStore()
const router = useRouter()
const { t } = useI18n()

const state = computed(() => game.state)
/** Primero el investigador que decide; luego el resto en orden de jugadores. */
const players = computed(() => {
  const s = state.value
  if (!s) return []
  const deciding = s.pending?.investigator
  return [...s.investigators].sort((a, b) => Number(b.id === deciding) - Number(a.id === deciding))
})
</script>

<template>
  <div v-if="state" class="table">
    <div class="main">
      <ScenarioRow :state="state" />
      <div class="board">
        <LocationMap :state="state" />
      </div>
      <div class="players">
        <PlayerArea
          v-for="i in players"
          :key="i.id"
          :state="state"
          :investigator="i"
          :deciding="i.id === state.pending?.investigator"
        />
      </div>
    </div>
    <SidePanel :state="state" />

    <div v-if="zoomed" class="zoom">
      <img :src="zoomed.src" :alt="zoomed.alt" />
    </div>
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
}
.main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-y: auto;
}
.board {
  flex: 1;
  overflow: auto;
  padding: 18px;
  background:
    radial-gradient(circle at 50% 40%, rgb(255 255 255 / 4%), transparent 60%), var(--felt);
  min-height: 300px;
}
.players {
  display: flex;
  flex-direction: column;
}
.zoom {
  position: fixed;
  right: 356px;
  top: 64px;
  z-index: 50;
  pointer-events: none;
}
.zoom img {
  width: 300px;
  border-radius: 12px;
  box-shadow: 0 8px 28px rgb(0 0 0 / 70%);
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
}
</style>
