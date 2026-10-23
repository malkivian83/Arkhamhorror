<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { gameClient } from '../online/game'
import { useLabels } from '../game/labels'
import { cardName } from '../game/cards'
import GameCard from './GameCard.vue'
import { scenarioReference } from '../game/scenarioReference'
import OnlineCampaign from './OnlineCampaign.vue'

const props = defineProps<{ room: string }>()
const { t, te } = useI18n(),
  label = useLabels()
const { state, busy, error, retry, refresh, choose, progress, resend, reset } = gameClient(
  props.room,
)
let active = true
let timer: ReturnType<typeof setTimeout> | undefined
async function poll() {
  if (!active) return
  if (document.visibilityState === 'visible') await refresh()
  if (active) timer = setTimeout(poll, 2000)
}
onMounted(() => {
  void poll()
})
onBeforeUnmount(() => {
  active = false
  clearTimeout(timer)
  reset()
})
</script>

<template>
  <section class="shared-table" :aria-label="t('online.play.title')">
    <h2>{{ t('online.play.title') }}</h2>
    <p v-if="error" role="alert">
      {{ te(`online.errors.${error}`) ? t(`online.errors.${error}`) : t('online.errors.generic') }}
    </p>
    <button :disabled="busy" @click="refresh">{{ t('online.refresh') }}</button>
    <button v-if="retry" :disabled="busy" @click="resend">{{ t('online.play.retry') }}</button>
    <template v-if="state">
      <p>
        {{
          t('online.play.status', {
            round: state.round,
            phase: t(`phase.${state.phase}`),
            doom: state.doom,
          })
        }}
      </p>
      <p v-if="state.finished" role="status">{{ t('online.play.finished') }}</p>
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
      <p v-if="state.test">
        {{
          t('online.play.test', {
            ...state.test,
            skill: t(`skill.${state.test.skill}`),
            tokens: state.test.tokens.join(', '),
            value: state.test.value ?? '—',
          })
        }}
      </p>
      <section v-if="state.pending" class="decision" aria-live="polite">
        <template v-if="state.pending.prompt">
          <h3>{{ label(state.pending.prompt, state.pending.params) }}</h3>
          <template v-if="state.pending.story">
            <h4>{{ t(state.pending.story.title) }}</h4>
            <p>{{ t(state.pending.story.body) }}</p>
          </template>
          <button
            v-for="(choice, index) in state.pending.choices"
            :key="`${state.pending.id}:${index}`"
            :disabled="busy || !!retry"
            @click="choose(index)"
          >
            {{ label(choice.label, choice.params) }}
          </button>
        </template>
        <p v-else>
          {{
            t('online.play.waiting', {
              investigator: state.investigators.find((i) => i.id === state?.pending?.investigator)
                ?.name,
            })
          }}
        </p>
      </section>
      <div class="public-cards">
        <GameCard v-if="scenarioReference(state)" v-bind="scenarioReference(state)!" :width="160" />
        <figure v-for="card in state.cards" :key="card.id">
          <GameCard :code="card.code" :name="card.name" :back="card.back ?? false" :width="160" />
          <figcaption>{{ label(card.detail, card.params) }}</figcaption>
        </figure>
      </div>
      <section v-for="i in state.investigators" :key="i.id">
        <h3>{{ i.name }}</h3>
        <p>{{ t('online.play.investigator', { ...i, location: i.location ?? '—' }) }}</p>
        <p v-if="i.eliminated">{{ t('online.play.eliminated') }}</p>
        <div v-if="i.hand" class="public-cards">
          <GameCard
            v-for="(code, index) in i.hand"
            :key="index"
            :code="code"
            :name="cardName(code)"
            :width="160"
          />
        </div>
      </section>
    </template>
  </section>
</template>

<style scoped>
.shared-table {
  padding: 1rem;
}
.public-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
figure {
  margin: 0;
  width: 160px;
}
figcaption {
  overflow-wrap: anywhere;
}
.decision {
  border: 1px solid currentColor;
  padding: 1rem;
  margin-block: 1rem;
}
button {
  padding: 0.65rem;
  margin: 0.3rem;
  font: inherit;
}
</style>
