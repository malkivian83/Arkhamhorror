<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../account/api'
import { useI18n } from 'vue-i18n'
import { cardName } from '../game/cards'
import { localName } from '../game/localized'
import { gameClient } from '../online/game'
import { onlineTable } from '../online/table'
import { turnNotice } from '../online/turn'
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
const router = useRouter()
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
const yourTurn = ref<string | null>(null)
let turnTimer: ReturnType<typeof setTimeout> | undefined
const notice = turnNotice()
/** Title of the tab before a "your turn" mark, restored when the player comes back. */
let plainTitle: string | null = null
function markTitle() {
  if (plainTitle !== null) return
  plainTitle = document.title
  document.title = `● ${t('online.play.yourTurn')} · ${plainTitle}`
}
function clearTitle() {
  if (plainTitle === null) return
  document.title = plainTitle
  plainTitle = null
}
watch(
  () => state.value?.table?.pending?.investigator,
  (decider) => {
    const own = state.value?.ownInvestigator
    if (!own || !notice(decider, own, state.value?.investigators.length ?? 0)) return
    yourTurn.value = localName(cardName(own))
    clearTimeout(turnTimer)
    turnTimer = setTimeout(() => (yourTurn.value = null), 4000)
    // In another tab the player would not see the table: say it in the tab title (D7).
    if (document.visibilityState !== 'visible') markTitle()
  },
  { immediate: true },
)
// After a rules update the scenario was rebuilt (doc 100, S3): say so once per update.
const seenKey = `lcg:rules-update:${props.room}`
function seenRevision() {
  try {
    return Number(localStorage.getItem(seenKey) ?? -1)
  } catch {
    return -1
  }
}
const seen = ref(seenRevision())
const rulesUpdate = computed(() => {
  const update = state.value?.rulesUpdate
  return update && update.revision > seen.value ? update : null
})
function dismissRules() {
  if (!rulesUpdate.value) return
  seen.value = rulesUpdate.value.revision
  try {
    localStorage.setItem(seenKey, String(seen.value))
  } catch {
    // Without storage the notice only stays dismissed until the page is reloaded.
  }
}
/** The owner can hand the lobby over or close it during the game too (doc 100, S4). */
const others = computed(() =>
  (state.value?.room?.members ?? []).filter((m) => m.investigator !== state.value?.ownInvestigator),
)
async function transferRoom(user: string) {
  if (!state.value || !confirm(t('online.room.transferConfirm'))) return
  try {
    await api(`/online/lobbies/${props.room}/transfer`, 'POST', {
      revision: state.value.revision,
      user,
    })
  } catch {
    error.value = 'generic'
  }
  await refresh()
}
async function closeRoom() {
  if (!confirm(t('online.room.closeConfirm'))) return
  try {
    await api(`/online/lobbies/${props.room}`, 'DELETE')
    await router.push('/online')
  } catch {
    error.value = 'generic'
  }
}
/** Visible: every 2 s. Hidden: every 15 s, so the turn mark still arrives (D7). */
async function poll() {
  if (!active) return
  await refresh()
  if (active) timer = setTimeout(poll, document.visibilityState === 'visible' ? 2000 : 15000)
}
function visible() {
  if (document.visibilityState !== 'visible') return
  clearTitle()
  void refresh()
}
onMounted(() => {
  void poll()
  document.addEventListener('visibilitychange', visible)
})
onBeforeUnmount(() => {
  active = false
  clearTimeout(timer)
  clearTimeout(turnTimer)
  clearTitle()
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
    <div v-if="rulesUpdate" class="rules-update" role="status">
      <span>{{
        rulesUpdate.dropped === null
          ? t('online.room.rulesRestarted')
          : rulesUpdate.dropped
            ? t('online.room.rulesDropped', { n: rulesUpdate.dropped })
            : t('online.room.rulesKept')
      }}</span>
      <button type="button" @click="dismissRules">{{ t('online.room.dismiss') }}</button>
    </div>
    <details v-if="state?.room?.owner" class="room-menu">
      <summary>{{ t('online.room.title') }}</summary>
      <button
        v-for="member in others"
        :key="member.user"
        type="button"
        :disabled="busy"
        @click="transferRoom(member.user)"
      >
        {{
          t('online.room.transferTo', {
            name: member.investigator ? localName(cardName(member.investigator)) : member.user,
          })
        }}
      </button>
      <button type="button" class="quiet" :disabled="busy" @click="closeRoom">
        {{ t('online.room.close') }}
      </button>
    </details>
    <div class="turn-live" role="status" aria-live="polite">
      <Transition name="turn">
        <button
          v-if="yourTurn"
          type="button"
          class="your-turn"
          :aria-label="t('online.play.yourTurn')"
          @click="yourTurn = null"
        >
          <strong>{{ t('online.play.yourTurn') }}</strong>
          <span>{{ t('online.play.yourTurnDetail', { name: yourTurn }) }}</span>
        </button>
      </Transition>
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
.rules-update {
  position: fixed;
  z-index: 1450;
  top: 48px;
  left: 50%;
  translate: -50% 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  width: min(560px, calc(100vw - 32px));
  box-sizing: border-box;
  padding: 10px 14px;
  background: #2c2420;
  border: 1px solid var(--accent);
  border-radius: 8px;
}
.rules-update span {
  flex: 1 1 260px;
}
.room-menu {
  position: fixed;
  z-index: 1300;
  right: 8px;
  bottom: 8px;
  padding: 6px 10px;
  background: rgb(17 13 20 / 92%);
  border: 1px solid var(--border);
  border-radius: 8px;
}
.room-menu[open] {
  display: grid;
  gap: 6px;
}
/* Por encima de la barra de acciones del móvil. */
@media (max-width: 900px) {
  .room-menu {
    bottom: 72px;
  }
}
.your-turn {
  position: fixed;
  z-index: 1400;
  top: 18%;
  left: 50%;
  translate: -50% 0;
  display: grid;
  gap: 4px;
  min-width: min(360px, calc(100vw - 32px));
  margin: 0;
  padding: 18px 32px;
  color: #f6dccb;
  text-align: center;
  background:
    radial-gradient(ellipse at 50% 0%, rgb(229 170 141 / 26%), transparent 70%),
    linear-gradient(180deg, #3a2b2a, #211a1c);
  border: 1px solid #e5aa8d;
  border-radius: 8px;
  box-shadow:
    inset 0 1px 0 rgb(255 230 210 / 18%),
    0 0 0 4px #19191dcc,
    0 18px 48px #000a;
  cursor: pointer;
}
.your-turn strong {
  font:
    700 1.6rem/1.2 'Libre Baskerville',
    Georgia,
    serif;
}
.your-turn span {
  color: #d0c7c1;
}
.turn-enter-active,
.turn-leave-active {
  transition:
    opacity 240ms ease,
    transform 240ms ease;
}
.turn-enter-from,
.turn-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
@media (prefers-reduced-motion: reduce) {
  .turn-enter-active,
  .turn-leave-active {
    transition: none;
  }
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
