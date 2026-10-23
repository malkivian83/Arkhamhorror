<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { allCampaigns, STARTER_DECKS, starterInvestigator, starterDeck } from '@lcg/cards'
import type { OnlineDeck, OnlineLobby } from '@lcg/shared'
import { account, api } from '../account/api'
import { useDecksStore } from '../stores/decks'
import { lobbyClient } from '../online/lobby'
import SitePage from '../components/SitePage.vue'
import OnlineGame from '../components/OnlineGame.vue'

const { t, te } = useI18n(),
  route = useRoute(),
  router = useRouter(),
  decks = useDecksStore()
const { lobby, busy, error, run, reset } = lobbyClient()
const invitation = ref(''),
  inviteLink = ref(''),
  selected = ref(''),
  inviting = ref(false)
const campaign = ref('brethren-of-ash'),
  difficulty = ref<OnlineLobby['difficulty']>('standard')
const campaigns = allCampaigns()
const physical = ref(0)
const id = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))
const member = computed(() =>
  lobby.value?.seats.find((seat) => seat.user === account.value.user?.id),
)
const owner = computed(() => lobby.value?.owner === account.value.user?.id)
const options = computed(() => [
  ...Object.keys(STARTER_DECKS).map((key) => {
    const k = key as keyof typeof STARTER_DECKS
    return {
      id: `starter:${key}`,
      name: starterInvestigator(k).name,
      deck: { investigator: starterInvestigator(k).id, cards: starterDeck(k) } as OnlineDeck,
    }
  }),
  ...decks.decks.map((deck) => ({
    id: deck.id,
    name: deck.name,
    deck: { investigator: deck.investigator, cards: [...deck.cards] } as OnlineDeck,
  })),
])
const canStart = computed(
  () => owner.value && lobby.value!.members.length >= 1 && lobby.value!.seats.every((s) => s.ready),
)
const displayError = computed(() =>
  te(`online.errors.${error.value}`)
    ? t(`online.errors.${error.value}`)
    : t('online.errors.generic'),
)
async function refresh() {
  if (id.value && account.value.user) {
    const initial = !lobby.value
    const result = await run(`/${id.value}`)
    if (initial && result) {
      campaign.value = result.campaignId
      difficulty.value = result.difficulty
    }
  }
}
async function create() {
  const created = await run('', 'POST')
  if (created) await router.push(`/online/${created.id}`)
}
async function join() {
  const joined = await run(`/${id.value}/join`, 'POST', { token: invitation.value })
  if (joined) {
    invitation.value = ''
    await router.replace({ path: route.path, hash: '' })
  }
}
async function mutate(action: string, body: object = {}) {
  if (!lobby.value) return
  const result = await run(`/${id.value}/${action}`, 'POST', {
    revision: lobby.value.revision,
    ...body,
  })
  if (!result && error.value === 'stale_revision') {
    await refresh()
    error.value = 'stale_revision'
  }
}
async function selectDeck() {
  const option = options.value.find((o) => o.id === selected.value)
  if (!option) return
  await mutate('deck', {
    deck: {
      ...option.deck,
      ...(option.deck.cards.includes('08125')
        ? {
            startingTrauma: { physical: physical.value, mental: 2 - physical.value },
          }
        : {}),
    },
  })
}
async function invite(revoke = false) {
  if (inviting.value || busy.value) return
  inviting.value = true
  const user = account.value.user?.id,
    room = id.value
  try {
    if (revoke) await api(`/online/lobbies/${room}/invite`, 'DELETE')
    else {
      const result = await api<{ token: string }>(`/online/lobbies/${room}/invite`, 'POST')
      if (user === account.value.user?.id && room === id.value)
        inviteLink.value = `${location.origin}/online/${room}#invite=${encodeURIComponent(result.token)}`
    }
    if (revoke) inviteLink.value = ''
    await refresh()
  } catch {
    error.value = 'generic'
  } finally {
    inviting.value = false
  }
}
watch(
  [id, () => account.value.user?.id],
  () => {
    reset()
    inviteLink.value = ''
    selected.value = ''
    invitation.value = new URLSearchParams(route.hash.slice(1)).get('invite') ?? ''
    void refresh()
  },
  { immediate: true },
)
let polling = true
let timer: ReturnType<typeof setTimeout> | undefined
async function poll() {
  if (!polling) return
  if (lobby.value && !busy.value && !inviting.value && document.visibilityState === 'visible')
    await refresh()
  if (polling) timer = setTimeout(poll, 4000)
}
onMounted(() => {
  timer = setTimeout(poll, 4000)
})
onBeforeUnmount(() => {
  polling = false
  clearTimeout(timer)
  reset()
})
</script>

<template>
  <SitePage :title="t('online.title')" :subtitle="t('online.subtitle')" icon="investigators">
    <div class="online-panel">
      <p v-if="!account.user">
        <RouterLink to="/account">{{ t('online.login') }}</RouterLink>
      </p>
      <template v-else>
        <p v-if="error" role="alert">{{ displayError }}</p>
        <button v-if="!id" :disabled="busy" @click="create">{{ t('online.create') }}</button>
        <form v-else-if="!lobby" @submit.prevent="join">
          <label
            >{{ t('online.invitation') }}<input v-model="invitation" autocomplete="off" required
          /></label>
          <button :disabled="busy">{{ t('online.join') }}</button>
          <button type="button" :disabled="busy" @click="refresh">{{ t('online.refresh') }}</button>
        </form>
        <template v-if="lobby">
          <p>{{ t('online.room', { id: lobby.id }) }}</p>
          <p>
            {{
              t('online.configuration', {
                campaign: t(`campaign.names.${lobby.campaignId}`),
                difficulty: t(`difficulty.${lobby.difficulty}`),
              })
            }}
          </p>
          <ul>
            <li v-for="(seat, index) in lobby.seats" :key="seat.user">
              {{ t('online.player', { n: index + 1 }) }}
              {{ seat.user === account.user.id ? t('online.you') : '' }}:
              {{ seat.investigator || t('online.noDeck') }} —
              {{ seat.ready ? t('online.ready') : t('online.waiting') }}
            </li>
          </ul>
          <template v-if="lobby.status === 'lobby'">
            <fieldset :disabled="busy || inviting">
              <legend>{{ t('online.prepare') }}</legend>
              <template v-if="owner">
                <label
                  >{{ t('online.campaign')
                  }}<select v-model="campaign">
                    <option v-for="c in campaigns" :key="c.id" :value="c.id">
                      {{ t(c.name) }}
                    </option>
                  </select></label
                >
                <label
                  >{{ t('online.difficulty')
                  }}<select v-model="difficulty">
                    <option v-for="d in ['easy', 'standard', 'hard', 'expert']" :key="d" :value="d">
                      {{ t(`difficulty.${d}`) }}
                    </option>
                  </select></label
                >
                <button @click="mutate('configure', { campaignId: campaign, difficulty })">
                  {{ t('online.configure') }}
                </button>
                <button @click="invite()">{{ t('online.invite') }}</button>
                <button @click="invite(true)">{{ t('online.revoke') }}</button>
                <label v-if="inviteLink"
                  >{{ t('online.share')
                  }}<input
                    :value="inviteLink"
                    readonly
                    @focus="($event.target as HTMLInputElement).select()"
                /></label>
              </template>
              <label
                >{{ t('online.deck')
                }}<select v-model="selected">
                  <option disabled value="">{{ t('online.choose') }}</option>
                  <option v-for="option in options" :key="option.id" :value="option.id">
                    {{ option.name }}
                  </option>
                </select></label
              >
              <label v-if="options.find((o) => o.id === selected)?.deck.cards.includes('08125')"
                >{{ t('online.trauma')
                }}<select v-model.number="physical">
                  <option v-for="n in [0, 1, 2]" :key="n" :value="n">{{ n }}</option>
                </select></label
              >
              <button :disabled="!selected" @click="selectDeck">{{ t('online.select') }}</button>
              <button
                :disabled="!member?.investigator"
                @click="mutate('ready', { ready: !member?.ready })"
              >
                {{ member?.ready ? t('online.unready') : t('online.ready') }}
              </button>
              <button v-if="owner" :disabled="!canStart" @click="mutate('start')">
                {{ t('online.start') }}
              </button>
            </fieldset>
          </template>
          <section v-else aria-live="polite">
            <h2>{{ t('online.started') }}</h2>
            <p>{{ t(`campaign.scenario.${lobby.game?.scenarioId}`) }}</p>
            <p>{{ t('online.startedDetail', { n: lobby.game?.investigatorCount }) }}</p>
            <OnlineGame :key="`${lobby.id}:${account.user.id}`" :room="lobby.id" />
          </section>
        </template>
      </template>
    </div>
  </SitePage>
</template>

<style scoped>
.online-panel {
  max-width: 850px;
  margin: 0 auto;
  padding: 1rem;
}
fieldset,
form {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1 1 240px;
}
input,
select,
button {
  font: inherit;
  padding: 0.65rem;
  min-width: 0;
}
button {
  cursor: pointer;
}
button:disabled {
  cursor: default;
  opacity: 0.6;
}
li {
  margin: 0.5rem 0;
}
</style>
