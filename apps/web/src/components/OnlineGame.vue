<script setup lang="ts">
import { onBeforeUnmount, onMounted, provide, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { gameClient } from '../online/game'
import { onlineTable } from '../online/table'
import { tableControllerKey } from '../game/tableController'
import { openPile } from '../game/pile'
import { inspected } from '../game/inspect'
import { zoomed } from '../game/zoom'
import GameView from '../views/GameView.vue'
import OnlineCampaign from './OnlineCampaign.vue'

const props = defineProps<{ room: string }>()
const { t, te } = useI18n()
const client = gameClient(props.room)
const { state, busy, error, retry, refresh, progress, resend, reset } = client
provide(tableControllerKey, onlineTable(client))
let active = true
let timer: ReturnType<typeof setTimeout> | undefined
function clearInspection() {
  openPile.value = null
  inspected.value = null
  zoomed.value = null
}
clearInspection()
watch(() => state.value?.scenarioId, clearInspection)
async function poll() {
  if (!active) return
  if (document.visibilityState === 'visible') await refresh()
  if (active) timer = setTimeout(poll, 2000)
}
function visible() {
  if (document.visibilityState === 'visible') void refresh()
}
onMounted(() => {
  void poll()
  document.addEventListener('visibilitychange', visible)
})
onBeforeUnmount(() => {
  active = false
  clearTimeout(timer)
  document.removeEventListener('visibilitychange', visible)
  clearInspection()
  reset()
})
</script>

<template>
  <section
    class="online-table"
    :aria-label="t('online.play.title')"
    :data-revision="state?.revision"
  >
    <div v-if="error || retry" class="connection" role="alert">
      <span v-if="error">{{
        te(`online.errors.${error}`) ? t(`online.errors.${error}`) : t('online.errors.generic')
      }}</span>
      <button :disabled="busy" @click="refresh">{{ t('online.refresh') }}</button>
      <button v-if="retry" :disabled="busy" @click="resend">{{ t('online.play.retry') }}</button>
    </div>
    <GameView v-if="state?.table" :key="state.scenarioId" />
    <p v-else role="status">{{ t('online.play.loading') }}</p>
    <section
      v-if="state?.finished || state?.campaign"
      class="intermission"
      :aria-label="t('online.play.finished')"
    >
      <p>{{ t('online.play.finished') }}</p>
      <button
        v-if="state.canFinish"
        :disabled="busy || !!retry"
        @click="progress({ action: 'finish' })"
      >
        {{ t('online.campaignPlay.finish') }}
      </button>
      <OnlineCampaign
        v-if="state.campaign"
        :campaign="state.campaign"
        :disabled="busy || !!retry"
        @action="progress"
      />
    </section>
  </section>
</template>

<style scoped>
.online-table {
  height: 100%;
  min-height: 0;
  position: relative;
}
.connection {
  position: fixed;
  z-index: 1500;
  top: 0;
  left: 64px;
  right: 0;
  background: #42251c;
  padding: 8px;
}
.intermission {
  position: fixed;
  inset: 12% 8%;
  z-index: 1000;
  overflow: auto;
  padding: 24px;
  background: #232329;
  border: 1px solid #b88c58;
  box-shadow: 0 0 0 100vmax #000a;
}
button {
  padding: 10px;
  margin: 4px;
  font: inherit;
}
</style>
