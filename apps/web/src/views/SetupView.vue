<script setup lang="ts">
import {
  allCampaigns,
  STARTER_DECKS,
  starterInvestigator,
  validateDeck,
  type CampaignMember,
  type Difficulty,
} from '@lcg/cards'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import GameCard from '../components/GameCard.vue'
import { classColor } from '../game/cards'
import { useDecksStore } from '../stores/decks'
import { useGameStore, type DeckKey } from '../stores/game'

const { t } = useI18n()
const router = useRouter()
const game = useGameStore()
const deckStore = useDecksStore()

/** Mazo elegido por investigador: '' es el mazo inicial; si no, el id de un mazo propio. */
const deckFor = ref<Record<string, string>>({})
/** Mazos propios válidos de un investigador. */
const validDecks = (key: DeckKey) =>
  deckStore.decks.filter(
    (d) => d.investigator === starterInvestigator(key).id && !validateDeck(d).problems.length,
  )

const decks = Object.keys(STARTER_DECKS) as DeckKey[]
const chosen = ref<DeckKey[]>(['joe'])
const difficulty = ref<Difficulty>('standard')
const campaigns = allCampaigns()
const campaignId = ref(campaigns[0]?.id ?? '')
const difficulties: Difficulty[] = ['easy', 'standard', 'hard', 'expert']

function toggle(key: DeckKey) {
  if (chosen.value.includes(key)) chosen.value = chosen.value.filter((k) => k !== key)
  else if (chosen.value.length < 4) chosen.value = [...chosen.value, key]
}

function start() {
  if (game.campaign && !window.confirm(t('campaign.confirmReplace'))) return
  const members = chosen.value.map((key): CampaignMember => {
    const own = deckStore.decks.find((d) => d.id === deckFor.value[key])
    return own ? { investigator: own.investigator, cards: own.cards } : key
  })
  game.start(campaignId.value, members, difficulty.value)
  void router.push('/game')
}
</script>

<template>
  <section class="setup">
    <h2>{{ t('campaign.new') }}</h2>
    <div class="campaigns" role="radiogroup" :aria-label="t('campaign.choose')">
      <label v-for="c in campaigns" :key="c.id">
        <input v-model="campaignId" type="radio" :value="c.id" />
        {{ t(c.name) }}
        <small>({{ c.scenarios.map((s) => t(`campaign.scenario.${s.id}`)).join(' · ') }})</small>
      </label>
    </div>

    <div v-if="game.state || game.campaign" class="resume">
      <button v-if="game.state" type="button" class="primary" @click="router.push('/game')">
        {{ t('setup.continue') }}
      </button>
      <button v-if="game.campaign" type="button" @click="router.push('/campaign')">
        {{ t('campaign.open') }}
      </button>
    </div>

    <h3>{{ t('setup.chooseInvestigators') }}</h3>
    <div class="investigators">
      <button
        v-for="key in decks"
        :key="key"
        type="button"
        class="pick"
        :class="{ selected: chosen.includes(key) }"
        :style="{ '--class': classColor(starterInvestigator(key).id) }"
        @click="toggle(key)"
      >
        <GameCard
          :code="starterInvestigator(key).id"
          :name="starterInvestigator(key).name"
          :width="210"
          landscape
          :color="classColor(starterInvestigator(key).id)"
        />
        <span>{{ starterInvestigator(key).name }}</span>
        <span v-if="chosen.includes(key)" class="order">{{ chosen.indexOf(key) + 1 }}</span>
      </button>
    </div>
    <p class="hint">{{ t('setup.orderHint') }}</p>

    <div v-if="chosen.length" class="deck-choice">
      <h3>{{ t('decks.choose') }}</h3>
      <label v-for="key in chosen" :key="key">
        {{ starterInvestigator(key).name }}
        <select v-model="deckFor[key]">
          <option :value="undefined">{{ t('decks.starter') }}</option>
          <option v-for="d in validDecks(key)" :key="d.id" :value="d.id">{{ d.name }}</option>
        </select>
      </label>
      <RouterLink to="/decks" class="manage">{{ t('decks.manage') }}</RouterLink>
    </div>

    <h3>{{ t('table.difficulty') }}</h3>
    <div class="difficulties">
      <label v-for="d in difficulties" :key="d">
        <input v-model="difficulty" type="radio" :value="d" />
        {{ t(`difficulty.${d}`) }}
      </label>
    </div>

    <button type="button" class="primary start" :disabled="chosen.length === 0" @click="start">
      {{ t('campaign.new') }}
    </button>
  </section>
</template>

<style scoped>
.setup {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}
.investigators {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}
.pick {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border: 2px solid transparent;
  background: var(--panel);
  border-radius: 10px;
}
.pick.selected {
  border-color: var(--class);
  box-shadow: 0 0 12px var(--class);
}
.order {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--class);
  color: #fff;
  font-weight: 700;
  display: grid;
  place-items: center;
}
.hint {
  font-size: 0.85rem;
  opacity: 0.75;
}
.deck-choice {
  display: grid;
  gap: 6px;
  max-width: 420px;
}
.deck-choice label {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}
.deck-choice select {
  font: inherit;
  color: var(--ink);
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 6px;
}
.manage {
  color: var(--brass);
  font-size: 0.9rem;
}
.campaigns {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
  font-family: var(--fell);
}
.campaigns small {
  color: #a89a7c;
  font-style: italic;
}
.difficulties {
  display: flex;
  gap: 16px;
}
.start {
  margin-top: 20px;
  font-size: 1.1rem;
  padding: 10px 28px;
}
.resume {
  margin-bottom: 12px;
}
</style>
