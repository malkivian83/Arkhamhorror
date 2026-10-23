<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { allCampaigns, STARTER_DECKS, starterInvestigator, starterDeck } from '@lcg/cards'
import type { OnlineDeck, OnlineLobby } from '@lcg/shared'
import { account, api } from '../account/api'
import { useDecksStore } from '../stores/decks'
import { lobbyClient } from '../online/lobby'
import { cardImage, cardName, classColor } from '../game/cards'
import { campaignCover } from '../game/campaignProgress'
import { localName } from '../game/localized'
import SitePage from '../components/SitePage.vue'
import SiteAction from '../components/SiteAction.vue'

const { t, te } = useI18n(),
  route = useRoute(),
  router = useRouter(),
  decks = useDecksStore()
const { lobby, busy, error, run, reset } = lobbyClient()
const invitation = ref(''),
  inviteLink = ref(''),
  selected = ref(''),
  inviting = ref(false),
  copied = ref(false)
const campaign = ref('brethren-of-ash'),
  difficulty = ref<OnlineLobby['difficulty']>('standard')
const campaigns = allCampaigns().filter((c) => c.scenarios[0]?.build)
const difficulties = ['easy', 'standard', 'hard', 'expert'] as const
const physical = ref(0)
/** Investigadores sin retrato de preparación: se recurre a la carta. */
const missingPortraits = ref(new Set<string>())
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
const selectedOption = computed(() => options.value.find((o) => o.id === selected.value))
const canStart = computed(
  () => owner.value && lobby.value!.members.length >= 1 && lobby.value!.seats.every((s) => s.ready),
)
const emptySeats = computed(() => Math.max(0, 4 - (lobby.value?.seats.length ?? 0)))
const displayError = computed(() =>
  te(`online.errors.${error.value}`)
    ? t(`online.errors.${error.value}`)
    : t('online.errors.generic'),
)
const portrait = (code: string) =>
  missingPortraits.value.has(code) ? cardImage(code) : `/local-assets/setup/${code}.jpg`
function portraitFailed(code: string) {
  missingPortraits.value = new Set(missingPortraits.value).add(code)
}
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
  const option = selectedOption.value
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
    copied.value = false
    await refresh()
  } catch {
    error.value = 'generic'
  } finally {
    inviting.value = false
  }
}
async function copyInvite() {
  try {
    await navigator.clipboard.writeText(inviteLink.value)
    copied.value = true
  } catch {
    copied.value = false
  }
}
watch(
  [id, () => account.value.user?.id],
  () => {
    reset()
    inviteLink.value = ''
    selected.value = ''
    copied.value = false
    invitation.value = new URLSearchParams(route.hash.slice(1)).get('invite') ?? ''
    void refresh()
  },
  { immediate: true },
)
watch(
  () => lobby.value?.status,
  (status) => {
    if (status === 'active') void router.replace(`/online/${id.value}/play`)
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
    <div class="online">
      <section v-if="!account.user" class="online-card ui-panel">
        <h2>{{ t('online.lobby.introTitle') }}</h2>
        <p>{{ t('online.loginHelp') }}</p>
        <SiteAction to="/account" icon="→">{{ t('online.login') }}</SiteAction>
      </section>
      <template v-else>
        <p v-if="error" class="online-alert" role="alert">{{ displayError }}</p>

        <section v-if="!id" class="intro">
          <div class="intro-copy">
            <h2>{{ t('online.lobby.introTitle') }}</h2>
            <p>{{ t('online.lobby.introText') }}</p>
            <SiteAction icon="+" :disabled="busy" @click="create">{{
              t('online.create')
            }}</SiteAction>
          </div>
          <ol class="intro-steps">
            <li v-for="(step, index) in ['Create', 'Invite', 'Play']" :key="step">
              <span class="ui-step-number" aria-hidden="true">{{ index + 1 }}</span>
              <span>
                <strong>{{ t(`online.lobby.step${step}`) }}</strong>
                <span>{{ t(`online.lobby.step${step}Text`) }}</span>
              </span>
            </li>
          </ol>
        </section>

        <form v-else-if="!lobby" class="online-card ui-panel" @submit.prevent="join">
          <h2>{{ t('online.lobby.joinTitle') }}</h2>
          <p>{{ t('online.lobby.joinHelp') }}</p>
          <label class="field"
            ><span class="ui-label">{{ t('online.invitation') }}</span
            ><input v-model="invitation" class="ui-field" autocomplete="off" required
          /></label>
          <div class="actions">
            <SiteAction type="submit" icon="→" :disabled="busy">{{ t('online.join') }}</SiteAction>
            <button type="button" :disabled="busy" @click="refresh">
              {{ t('online.refresh') }}
            </button>
          </div>
        </form>

        <template v-if="lobby">
          <div v-if="lobby.status === 'lobby'" class="lobby">
            <div class="lobby-main">
              <section aria-labelledby="seats-title">
                <div class="ui-step-heading">
                  <h2 id="seats-title">{{ t('online.lobby.investigators') }}</h2>
                  <span class="ui-step-meta">{{
                    t('online.lobby.seats', { count: lobby.seats.length })
                  }}</span>
                </div>
                <ul class="seats">
                  <li
                    v-for="(seat, index) in lobby.seats"
                    :key="seat.user"
                    class="seat"
                    :class="{ mine: seat.user === account.user.id, ready: seat.ready }"
                  >
                    <span
                      class="ui-portrait"
                      :style="{
                        '--dot': seat.investigator ? classColor(seat.investigator) : undefined,
                      }"
                    >
                      <img
                        v-if="seat.investigator && portrait(seat.investigator)"
                        :src="portrait(seat.investigator)!"
                        alt=""
                        width="240"
                        height="300"
                        :class="{ card: missingPortraits.has(seat.investigator) }"
                        @error="portraitFailed(seat.investigator)"
                      />
                      <span v-else class="seat-unknown" aria-hidden="true">?</span>
                      <span class="seat-status">{{
                        seat.ready ? t('online.ready') : t('online.waiting')
                      }}</span>
                    </span>
                    <span class="seat-name">{{
                      seat.investigator
                        ? localName(cardName(seat.investigator))
                        : t('online.noDeck')
                    }}</span>
                    <span class="seat-meta"
                      >{{ t('online.player', { n: index + 1 }) }}
                      {{ seat.user === account.user.id ? t('online.you') : '' }}
                      <template v-if="seat.user === lobby.owner"
                        >· {{ t('online.lobby.host') }}</template
                      ></span
                    >
                  </li>
                  <li v-for="n in emptySeats" :key="`empty-${n}`" class="seat empty">
                    <span class="ui-portrait"><span class="seat-unknown">+</span></span>
                    <span class="seat-name">{{ t('online.lobby.emptySeat') }}</span>
                  </li>
                </ul>
              </section>

              <section class="ui-panel block" aria-labelledby="deck-title">
                <h2 id="deck-title">{{ t('online.lobby.deckTitle') }}</h2>
                <p class="help">{{ t('online.lobby.deckHelp') }}</p>
                <fieldset :disabled="busy || inviting">
                  <legend class="visually-hidden">{{ t('online.prepare') }}</legend>
                  <label class="field wide"
                    ><span class="ui-label">{{ t('online.deck') }}</span
                    ><select v-model="selected" class="ui-field">
                      <option disabled value="">{{ t('online.choose') }}</option>
                      <option v-for="option in options" :key="option.id" :value="option.id">
                        {{ option.name }}
                      </option>
                    </select></label
                  >
                  <label v-if="selectedOption?.deck.cards.includes('08125')" class="field"
                    ><span class="ui-label">{{ t('online.trauma') }}</span
                    ><select v-model.number="physical" class="ui-field">
                      <option v-for="n in [0, 1, 2]" :key="n" :value="n">{{ n }}</option>
                    </select></label
                  >
                  <div class="actions">
                    <button :disabled="!selected" @click="selectDeck">
                      {{ t('online.select') }}
                    </button>
                    <button
                      :disabled="!member?.investigator"
                      :aria-pressed="!!member?.ready"
                      @click="mutate('ready', { ready: !member?.ready })"
                    >
                      {{ member?.ready ? t('online.unready') : t('online.ready') }}
                    </button>
                  </div>
                </fieldset>
              </section>
              <section class="ui-panel block start" :class="{ armed: canStart }">
                <p class="help" aria-live="polite">
                  {{
                    owner
                      ? canStart
                        ? t('online.lobby.startReady')
                        : t('online.lobby.startWaiting')
                      : t('online.lobby.hostWaiting')
                  }}
                </p>
                <SiteAction
                  v-if="owner"
                  icon="→"
                  :disabled="!canStart || busy || inviting"
                  @click="mutate('start')"
                  >{{ t('online.start') }}</SiteAction
                >
              </section>
            </div>

            <aside class="lobby-side">
              <section class="ui-panel campaign" aria-labelledby="campaign-title">
                <img
                  class="campaign-cover"
                  :src="campaignCover(lobby.campaignId)"
                  alt=""
                  width="448"
                  height="560"
                />
                <div class="campaign-copy">
                  <p class="ui-eyebrow" :title="lobby.id">
                    {{ t('online.lobby.code', { code: lobby.id.slice(0, 8) }) }}
                  </p>
                  <h2 id="campaign-title">{{ t(`campaign.names.${lobby.campaignId}`) }}</h2>
                  <p class="help">
                    {{
                      t('online.lobby.difficultyLabel', {
                        difficulty: t(`difficulty.${lobby.difficulty}`),
                      })
                    }}
                  </p>
                </div>
                <fieldset v-if="owner" class="campaign-form" :disabled="busy || inviting">
                  <legend class="visually-hidden">{{ t('online.lobby.game') }}</legend>
                  <label class="field"
                    ><span class="ui-label">{{ t('online.campaign') }}</span
                    ><select v-model="campaign" class="ui-field">
                      <option v-for="c in campaigns" :key="c.id" :value="c.id">
                        {{ t(c.name) }}
                      </option>
                    </select></label
                  >
                  <label class="field"
                    ><span class="ui-label">{{ t('online.difficulty') }}</span
                    ><select v-model="difficulty" class="ui-field">
                      <option v-for="d in difficulties" :key="d" :value="d">
                        {{ t(`difficulty.${d}`) }}
                      </option>
                    </select></label
                  >
                  <button @click="mutate('configure', { campaignId: campaign, difficulty })">
                    {{ t('online.configure') }}
                  </button>
                </fieldset>
              </section>

              <section v-if="owner" class="ui-panel block" aria-labelledby="invite-title">
                <h2 id="invite-title">{{ t('online.lobby.inviteTitle') }}</h2>
                <p class="help">{{ t('online.lobby.inviteHelp') }}</p>
                <fieldset :disabled="busy || inviting">
                  <legend class="visually-hidden">{{ t('online.lobby.inviteTitle') }}</legend>
                  <label v-if="inviteLink" class="field wide"
                    ><span class="ui-label">{{ t('online.share') }}</span
                    ><input
                      class="ui-field"
                      :value="inviteLink"
                      readonly
                      @focus="($event.target as HTMLInputElement).select()"
                  /></label>
                  <div class="actions">
                    <button v-if="inviteLink" @click="copyInvite">
                      {{ copied ? t('online.lobby.copied') : t('online.lobby.copy') }}
                    </button>
                    <button @click="invite()">{{ t('online.invite') }}</button>
                    <button class="quiet" @click="invite(true)">{{ t('online.revoke') }}</button>
                  </div>
                </fieldset>
              </section>
            </aside>
          </div>

          <section v-else class="online-card ui-panel started" aria-live="polite">
            <img :src="campaignCover(lobby.campaignId)" alt="" width="448" height="560" />
            <div>
              <h2>{{ t('online.started') }}</h2>
              <p class="scenario">{{ t(`campaign.scenario.${lobby.game?.scenarioId}`) }}</p>
              <p>{{ t('online.startedDetail', { count: lobby.game?.investigatorCount }) }}</p>
              <SiteAction :to="`/online/${lobby.id}/play`" icon="→">{{
                t('online.play.openTable')
              }}</SiteAction>
            </div>
          </section>
        </template>
      </template>
    </div>
  </SitePage>
</template>

<style scoped>
.online {
  display: grid;
  gap: 24px;
}
h2 {
  margin: 0;
  font: 700 1.25rem/1.3 var(--site-display);
}
p {
  margin: 0;
}
.help {
  color: var(--site-muted);
}
fieldset {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}
.field {
  display: grid;
  gap: 6px;
  min-width: 0;
}
.ui-field {
  width: 100%;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.actions > button {
  padding: 0 16px;
  font: inherit;
}
button.quiet {
  opacity: 0.85;
}
.online-alert {
  padding: 12px 16px;
  color: var(--site-error-ink);
  background: var(--site-error-bg);
  border: 1px solid var(--site-error-border);
  border-radius: var(--site-radius);
}
.online-card {
  display: grid;
  gap: 16px;
  justify-items: start;
  max-width: 640px;
  padding: 28px;
}
.online-card .field {
  justify-self: stretch;
}

/* Portada: explicación breve y llamada a crear la mesa. */
.intro {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 40px;
  align-items: center;
}
.intro-copy {
  display: grid;
  gap: 16px;
  justify-items: start;
}
.intro-copy h2 {
  font-size: clamp(1.4rem, 2.6vw, 1.85rem);
}
.intro-copy p {
  max-width: 52ch;
  color: var(--site-ink-soft);
  font-size: 1.0625rem;
}
.intro-steps {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.intro-steps li {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 16px 18px;
  background: var(--site-panel);
  border: 1px solid var(--site-line);
  border-radius: var(--site-radius-lg);
}
.intro-steps strong {
  display: block;
  font-size: 1.0625rem;
}
.intro-steps li span:last-child > span {
  color: var(--site-muted);
}

/* Mesa: asientos y mazo a la izquierda, partida e inicio a la derecha. */
.lobby {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 340px);
  gap: 28px;
  align-items: start;
}
.lobby-main,
.lobby-side {
  display: grid;
  gap: 24px;
  min-width: 0;
}
.seats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
}
.seat {
  display: grid;
  gap: 6px;
  min-width: 0;
}
/* La carta es apaisada: se encuadra la ilustración de la mitad izquierda. */
.seat .ui-portrait img.card {
  object-position: 14% 45%;
}
.seat.mine .ui-portrait {
  box-shadow:
    0 0 0 2px var(--site-accent),
    0 12px 28px #0008;
}
.seat-unknown {
  display: grid;
  place-items: center;
  height: 100%;
  color: var(--site-faint);
  font: 700 2.25rem/1 var(--site-display);
}
.seat.empty .ui-portrait {
  background: transparent;
  border: 1px dashed var(--site-border);
  box-shadow: none;
}
.seat.empty .seat-name {
  color: var(--site-faint);
}
.seat-status {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  color: var(--site-ink-soft);
  background: #19191dd9;
  border: 1px solid var(--site-border);
  font-size: 0.75rem;
  font-weight: 700;
}
.seat.ready .seat-status {
  color: #0f2418;
  background: var(--eldritch);
  border-color: var(--eldritch);
}
.seat-name {
  font-weight: 700;
  line-height: 1.2;
  overflow-wrap: anywhere;
}
.seat-meta {
  margin-top: -2px;
  color: var(--site-muted);
  font-size: 0.8125rem;
}
.block {
  display: grid;
  gap: 12px;
  padding: 22px;
}
.block fieldset {
  display: grid;
  gap: 14px;
  margin-top: 4px;
}
.campaign {
  overflow: hidden;
}
.campaign-cover {
  display: block;
  width: 100%;
  height: 150px;
  object-fit: cover;
  object-position: center 30%;
}
.campaign-copy {
  display: grid;
  gap: 6px;
  padding: 18px 20px 0;
}
.campaign-copy .ui-eyebrow {
  font-size: 0.75rem;
}
.campaign-form {
  display: grid;
  gap: 12px;
  padding: 16px 20px 20px;
}
.campaign > .campaign-copy:last-child {
  padding-bottom: 20px;
}
.start.armed {
  border-color: var(--site-accent);
}
.start {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.started {
  grid-template-columns: 120px minmax(0, 1fr);
  align-items: center;
  gap: 24px;
  max-width: 720px;
}
.started img {
  width: 120px;
  height: 150px;
  object-fit: cover;
  border-radius: var(--site-radius);
}
.started > div {
  display: grid;
  gap: 10px;
  justify-items: start;
}
.started .scenario {
  font: 700 1.0625rem/1.3 var(--site-display);
  color: var(--site-accent);
}

@media (max-width: 900px) {
  .intro,
  .lobby {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 560px) {
  .seats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .online-card,
  .block {
    padding: 18px;
  }
  .started,
  .start {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
