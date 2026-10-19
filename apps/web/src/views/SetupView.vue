<script setup lang="ts">
import {
  allCampaigns,
  STARTER_DECKS,
  starterInvestigator,
  type CampaignMember,
  type Difficulty,
} from '@lcg/cards'
import { playerCardDef } from '@lcg/engine'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import SessionTools from '../components/SessionTools.vue'
import SkillIcon from '../components/SkillIcon.vue'
import { classColor } from '../game/cards'
import { useDecksStore } from '../stores/decks'
import { useGameStore, type DeckKey } from '../stores/game'

const { t } = useI18n()
const router = useRouter()
const game = useGameStore()
const deckStore = useDecksStore()
const deckFor = ref<Record<string, string>>({})
const validDecks = (key: DeckKey) =>
  deckStore.decks.filter(
    (d) => d.investigator === starterInvestigator(key).id && !deckStore.check(d).problems.length,
  )
const investigators = Object.keys(STARTER_DECKS).map((key) => ({
  key: key as DeckKey,
  ...starterInvestigator(key),
  faction: playerCardDef(starterInvestigator(key).id)?.class ?? 'neutral',
}))
const chosen = ref<DeckKey[]>(['joe'])
const difficulty = ref<Difficulty>('standard')
const campaigns = allCampaigns()
const campaignId = ref(campaigns[0]?.id ?? '')
const selectedCampaign = computed(() => campaigns.find((c) => c.id === campaignId.value))
const difficulties: Difficulty[] = ['easy', 'standard', 'hard', 'expert']
const skills = ['willpower', 'intellect', 'combat', 'agility'] as const
const portrait = (id: string) => `/local-assets/setup/${id}.jpg`

function toggle(key: DeckKey) {
  if (chosen.value.includes(key)) chosen.value = chosen.value.filter((k) => k !== key)
  else if (chosen.value.length < 4) chosen.value = [...chosen.value, key]
}

function start() {
  if (!chosen.value.length || !selectedCampaign.value) return
  if (game.campaign && !window.confirm(t('campaign.confirmReplace'))) return
  const members = chosen.value.map((key): CampaignMember => {
    const own = validDecks(key).find((d) => d.id === deckFor.value[key])
    return own ? { investigator: own.investigator, cards: own.cards } : key
  })
  game.start(campaignId.value, members, difficulty.value)
  void router.push('/game')
}
</script>

<template>
  <div class="setup-page">
    <section class="setup" aria-labelledby="setup-title">
      <header class="setup-intro">
        <div>
          <p class="eyebrow">{{ t('setup.eyebrow') }}</p>
          <h1 id="setup-title">{{ t('setup.title') }}</h1>
          <p class="intro-copy">{{ t('setup.subtitle') }}</p>
        </div>
        <div class="intro-seal" aria-hidden="true">
          ✧<span>ARKHAM<br />HORROR</span>✧
        </div>
      </header>
      <div v-if="game.state || game.campaign" class="resume">
        <div><span class="save-dot" aria-hidden="true"></span>{{ t('setup.savedAdventure') }}</div>
        <div class="resume-actions">
          <button v-if="game.state" type="button" @click="router.push('/game')">
            {{ t('setup.continue') }} <span aria-hidden="true">↗</span>
          </button>
          <button v-if="game.campaign" type="button" @click="router.push('/campaign')">
            {{ t('campaign.open') }}
          </button>
        </div>
      </div>
      <form class="setup-layout" @submit.prevent="start">
        <div class="setup-choices">
          <fieldset class="setup-section">
            <legend><span class="step">01</span>{{ t('campaign.choose') }}</legend>
            <p class="section-copy">{{ t('setup.campaignHint') }}</p>
            <div class="campaign-grid">
              <label
                v-for="c in campaigns"
                :key="c.id"
                class="campaign-card"
                :class="{ selected: campaignId === c.id }"
              >
                <input
                  v-model="campaignId"
                  class="campaign-radio"
                  type="radio"
                  name="campaign"
                  :value="c.id"
                  :aria-label="t(c.name)"
                  :aria-describedby="`campaign-${c.id}`"
                />
                <div class="campaign-art">
                  <img :src="`/local-assets/setup/${c.id}.jpg`" alt="" width="600" height="360" />
                  <span class="campaign-format">{{
                    c.standalone ? t('campaign.standalone') : t('setup.campaignLabel')
                  }}</span>
                  <span class="selection-mark" aria-hidden="true">{{
                    campaignId === c.id ? '✓' : '+'
                  }}</span>
                </div>
                <div class="campaign-copy">
                  <span class="campaign-meta">{{
                    t('setup.scenarioCount', { n: c.scenarios.length })
                  }}</span>
                  <h2>{{ t(c.name) }}</h2>
                  <p :id="`campaign-${c.id}`">{{ t(`setup.descriptions.${c.id}`) }}</p>
                  <span class="campaign-link"
                    >{{ campaignId === c.id ? t('setup.selected') : t('setup.selectAdventure') }}
                    <span aria-hidden="true">↗</span></span
                  >
                </div>
              </label>
            </div>
            <ol
              v-if="selectedCampaign && !selectedCampaign.standalone"
              class="scenario-trail"
              :aria-label="t('setup.chapters')"
            >
              <li v-for="(scenario, index) in selectedCampaign.scenarios" :key="scenario.id">
                <span>{{ String(index + 1).padStart(2, '0') }}</span
                >{{ t(`campaign.scenario.${scenario.id}`) }}
              </li>
            </ol>
          </fieldset>
          <fieldset class="setup-section" aria-describedby="team-help team-status">
            <legend><span class="step">02</span>{{ t('setup.teamTitle') }}</legend>
            <div class="section-heading">
              <p id="team-help" class="section-copy">{{ t('setup.chooseInvestigators') }}</p>
              <span id="team-status" class="team-count" role="status">{{
                t('setup.teamCount', { n: chosen.length })
              }}</span>
            </div>
            <div class="investigator-grid">
              <button
                v-for="inv in investigators"
                :key="inv.key"
                type="button"
                class="investigator-card"
                :class="{ selected: chosen.includes(inv.key) }"
                :style="{ '--class': classColor(inv.id) }"
                :aria-pressed="chosen.includes(inv.key)"
                :aria-disabled="!chosen.includes(inv.key) && chosen.length >= 4"
                :aria-describedby="chosen.length >= 4 ? 'team-limit' : undefined"
                @click="toggle(inv.key)"
              >
                <span class="portrait-frame">
                  <img :src="portrait(inv.id)" alt="" width="240" height="300" />
                  <span class="investigator-order" aria-hidden="true">{{
                    chosen.includes(inv.key) ? chosen.indexOf(inv.key) + 1 : '+'
                  }}</span>
                </span>
                <span class="investigator-info">
                  <span class="faction">{{ t(`class.${inv.faction}`) }}</span>
                  <span class="investigator-name">{{ inv.name }}</span>
                  <span class="investigator-skills"
                    ><span
                      v-for="skill in skills"
                      :key="skill"
                      :aria-label="`${t(`skill.${skill}`)}: ${inv.skills[skill]}`"
                      ><SkillIcon :skill="skill" aria-hidden="true" /><b aria-hidden="true">{{
                        inv.skills[skill]
                      }}</b></span
                    ></span
                  >
                </span>
              </button>
            </div>
            <p id="team-limit" class="hint">
              {{ chosen.length >= 4 ? t('setup.teamLimit') : t('setup.orderHint') }}
            </p>
          </fieldset>
          <fieldset class="setup-section">
            <legend><span class="step">03</span>{{ t('table.difficulty') }}</legend>
            <p class="section-copy">{{ t('setup.difficultyHint') }}</p>
            <div class="difficulty-grid">
              <label
                v-for="(d, index) in difficulties"
                :key="d"
                class="difficulty-option"
                :class="{ selected: difficulty === d }"
              >
                <input v-model="difficulty" type="radio" name="difficulty" :value="d" />
                <span
                  ><strong>{{ t(`difficulty.${d}`) }}</strong
                  ><small>{{ t(`setup.difficultyNotes.${d}`) }}</small></span
                >
                <span class="difficulty-level" aria-hidden="true">{{ 'Ⅰ'.repeat(index + 1) }}</span>
              </label>
            </div>
          </fieldset>
        </div>
        <aside class="preparation" aria-labelledby="preparation-title">
          <p class="eyebrow">{{ t('setup.caseFile') }}</p>
          <h2 id="preparation-title">{{ t('setup.preparation') }}</h2>
          <div class="summary-campaign">
            <img :src="`/local-assets/setup/${campaignId}.jpg`" alt="" width="64" height="80" />
            <div>
              <small>{{ t('campaign.choose') }}</small
              ><strong>{{ selectedCampaign ? t(selectedCampaign.name) : '' }}</strong>
            </div>
          </div>
          <div class="roster-heading">
            <h3>{{ t('setup.yourTeam') }}</h3>
            <span>{{ chosen.length }}/4</span>
          </div>
          <ol class="team-roster">
            <li v-for="(key, index) in chosen" :key="key">
              <img :src="portrait(starterInvestigator(key).id)" alt="" width="40" height="48" />
              <label
                ><span
                  ><small class="seat-number">{{ index + 1 }}.</small>
                  {{ starterInvestigator(key).name }}</span
                ><select
                  v-model="deckFor[key]"
                  :aria-label="t('setup.deckFor', { name: starterInvestigator(key).name })"
                >
                  <option :value="undefined">{{ t('decks.starter') }}</option>
                  <option v-for="d in validDecks(key)" :key="d.id" :value="d.id">
                    {{ d.name }}
                  </option>
                </select></label
              >
            </li>
          </ol>
          <p v-if="!chosen.length" class="empty-team">{{ t('setup.emptyTeam') }}</p>
          <RouterLink to="/decks" class="manage"
            >{{ t('decks.manage') }} <span aria-hidden="true">↗</span></RouterLink
          >
          <div class="summary-difficulty">
            <span>{{ t('table.difficulty') }}</span
            ><strong>{{ t(`difficulty.${difficulty}`) }}</strong>
          </div>
          <button
            type="submit"
            class="primary start"
            :disabled="!chosen.length || !selectedCampaign"
          >
            {{ t('setup.begin') }} <span aria-hidden="true">→</span>
          </button>
          <p class="save-note">{{ t('setup.localSave') }}</p>
        </aside>
      </form>
      <div class="setup-tools"><SessionTools /></div>
      <footer class="setup-footer">
        <span aria-hidden="true">✧</span>{{ t('setup.footer') }}<span aria-hidden="true">✧</span>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.setup-page {
  background: radial-gradient(ellipse at 5% 0%, #25453870, transparent 45%), #101b19;
  min-height: calc(100dvh - 52px);
  color: #f0eee6;
}
.setup {
  max-width: 1392px;
  margin: auto;
  padding: 48px 48px 24px;
}
.setup-intro {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 34px;
  border-bottom: 1px solid #45544a;
  margin-bottom: 32px;
}
.eyebrow {
  color: #d6bd81;
  text-transform: uppercase;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  margin: 0 0 14px;
}
h1 {
  font: 400 clamp(2.3rem, 4.5vw, 4rem)/1.08 var(--fell);
  margin: 0 0 14px;
  letter-spacing: -0.025em;
}
.intro-copy,
.section-copy,
.hint {
  color: #b8c4b9;
  line-height: 1.6;
}
.intro-copy {
  margin: 0;
  max-width: 62ch;
}
.intro-seal {
  border: 1px solid #7f7658;
  outline: 1px solid #7f7658;
  outline-offset: -7px;
  border-radius: 50%;
  width: 114px;
  height: 114px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #ccb17b;
  gap: 4px;
  transform: rotate(-12deg);
}
.intro-seal span {
  font: 700 0.75rem/1.4 var(--display);
  text-align: center;
  letter-spacing: 0.12em;
}
.setup-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 36px;
  align-items: start;
}
.setup-choices {
  min-width: 0;
}
.setup-section {
  border: 0;
  padding: 0;
  margin: 0 0 34px;
  min-width: 0;
}
legend {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0;
  font: 400 1.5rem var(--fell);
  color: #f1ead9;
}
.step {
  font: 600 0.72rem system-ui;
  color: #d6bd81;
  border: 1px solid #746a4e;
  width: 30px;
  height: 30px;
  display: inline-grid;
  place-items: center;
}
.section-copy {
  font-size: 0.88rem;
  margin: 10px 0 18px;
}
.campaign-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}
.campaign-card {
  position: relative;
  cursor: pointer;
  border: 1px solid #536057;
  border-radius: 8px;
  background: #1a2924;
  overflow: hidden;
  transition:
    border-color 0.18s,
    transform 0.18s;
}
.campaign-card.selected {
  border-color: #dfc38a;
  box-shadow: 0 0 0 1px #dfc38a;
}
.campaign-card:hover {
  border-color: #dfc38a;
  transform: translateY(-2px);
}
.campaign-card:has(:focus-visible) {
  outline: 3px solid #fff;
  outline-offset: 5px;
}
.campaign-radio {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}
.campaign-art {
  height: 190px;
  position: relative;
  background: #263d35;
  overflow: hidden;
}
.campaign-art::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(transparent 45%, #101b19bb);
  pointer-events: none;
}
.campaign-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 60%;
}
.campaign-format {
  position: absolute;
  z-index: 1;
  left: 14px;
  bottom: 12px;
  padding: 5px 8px;
  border: 1px solid #d6bd8166;
  background: #101b19e8;
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #efe3c8;
}
.selection-mark {
  position: absolute;
  z-index: 1;
  right: 12px;
  top: 12px;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid #d6bd81;
  border-radius: 50%;
  background: #14251eed;
  color: #f6e2b5;
}
.selected .selection-mark {
  background: #dfc38a;
  color: #17221b;
}
.campaign-copy {
  padding: 18px;
}
.campaign-meta {
  color: #d6bd81;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.campaign-copy h2 {
  font: 400 1.5rem/1.2 var(--fell);
  margin: 9px 0;
  letter-spacing: 0;
}
.campaign-copy p {
  font-size: 0.82rem;
  line-height: 1.65;
  color: #bdc8be;
  margin: 0 0 18px;
}
.campaign-link {
  display: flex;
  justify-content: space-between;
  color: #e5cfa0;
  font-size: 0.78rem;
  font-weight: 600;
}
.scenario-trail {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  padding: 14px 0 0;
  margin: 0;
  list-style: none;
  color: #b8c4b9;
  font-size: 0.7rem;
}
.scenario-trail li {
  display: flex;
  gap: 7px;
  align-items: center;
}
.scenario-trail li span {
  color: #d6bd81;
}
.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
}
.team-count {
  font-size: 0.73rem;
  color: #e7d6b4;
  white-space: nowrap;
}
.investigator-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}
.investigator-card {
  text-align: left;
  min-width: 0;
  padding: 0;
  border: 1px solid #536057;
  background: #1a2924;
  border-radius: 7px;
  overflow: hidden;
  transition:
    transform 0.18s,
    border-color 0.18s;
}
.investigator-card.selected {
  border-color: #dfc38a;
  box-shadow: 0 0 0 1px #dfc38a;
  color: #f0eee6;
}
.investigator-card:hover {
  transform: translateY(-3px);
}
.investigator-card[aria-disabled='true'] {
  opacity: 0.6;
  cursor: not-allowed;
}
.portrait-frame {
  display: block;
  position: relative;
  aspect-ratio: 4 / 5;
  background: #27372e;
  border-bottom: 3px solid var(--class);
}
.portrait-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  display: block;
}
.investigator-order {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 25px;
  height: 25px;
  display: grid;
  place-items: center;
  border: 1px solid #efe1bb;
  border-radius: 50%;
  color: #fff;
  background: #14211cf0;
  font-size: 0.75rem;
}
.selected .investigator-order {
  color: #15221b;
  background: #dfc38a;
  border-color: #dfc38a;
  font-weight: 800;
}
.investigator-info {
  display: flex;
  flex-direction: column;
  padding: 12px 9px;
}
.faction {
  color: #d0c4a7;
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.investigator-name {
  font: 400 1rem/1.25 var(--fell);
  margin: 6px 0 12px;
  min-height: 2.5em;
  color: #f3eee2;
}
.investigator-skills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.investigator-skills > span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.72rem;
  color: #f0eee6;
}
.investigator-skills :deep(.sk) {
  font-size: 0.65rem;
  color: #c3cebf;
}
.hint {
  font-size: 0.75rem;
  margin: 14px 0 0;
}
.difficulty-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.difficulty-option {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #536057;
  padding: 14px;
  border-radius: 6px;
  cursor: pointer;
  background: #1a2924;
  min-height: 70px;
}
.difficulty-option.selected {
  border-color: #dfc38a;
  background: #2a3428;
}
.difficulty-option input {
  accent-color: #dfc38a;
  width: 18px;
  height: 18px;
  margin: 0;
  flex-shrink: 0;
}
.difficulty-option strong {
  display: block;
  font-size: 0.86rem;
  font-weight: 600;
}
.difficulty-option small {
  display: block;
  font-size: 0.72rem;
  color: #b8c4b9;
  margin-top: 4px;
  line-height: 1.4;
}
.difficulty-level {
  margin-left: auto;
  color: #d6bd81;
  letter-spacing: 2px;
  font-size: 0.75rem;
}
.preparation {
  position: sticky;
  top: 24px;
  padding: 24px;
  border: 1px solid #6c7056;
  border-top: 3px solid #d6bd81;
  background: linear-gradient(135deg, #29362a, #1b2923);
  border-radius: 3px;
  box-shadow: 0 16px 32px #0002;
}
.preparation .eyebrow {
  font-size: 0.62rem;
}
.preparation h2 {
  font: 400 1.65rem var(--fell);
  margin: 0 0 24px;
}
.summary-campaign {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 20px;
  border-bottom: 1px solid #53604d;
}
.summary-campaign img {
  width: 52px;
  height: 68px;
  object-fit: cover;
  border: 1px solid #9b987c;
  border-radius: 3px;
}
.summary-campaign small {
  display: block;
  color: #c0c8b7;
  font-size: 0.68rem;
  margin-bottom: 6px;
}
.summary-campaign strong {
  font: 400 1.1rem/1.3 var(--fell);
}
.roster-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
}
.roster-heading h3 {
  font: 600 0.75rem system-ui;
  margin: 0;
  letter-spacing: 0;
}
.roster-heading > span {
  color: #d6bd81;
  font-size: 0.75rem;
}
.team-roster {
  list-style: none;
  padding: 0;
  margin: 16px 0;
  display: grid;
  gap: 16px;
}
.team-roster li {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}
.team-roster img {
  width: 36px;
  height: 44px;
  object-fit: cover;
  border-radius: 3px;
}
.team-roster label {
  flex: 1;
  min-width: 0;
  font-size: 0.8rem;
}
.seat-number {
  color: #d6bd81;
}
.team-roster select {
  display: block;
  width: 100%;
  margin-top: 5px;
  min-height: 44px;
  color: #ede8d8;
  background: #15231d;
  border: 1px solid #77816c;
  border-radius: 4px;
  padding: 6px;
  font: inherit;
  font-size: 0.73rem;
}
.manage {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 44px;
  color: #e5cfa0;
  font-size: 0.75rem;
  text-underline-offset: 4px;
}
.summary-difficulty {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  border-top: 1px solid #53604d;
  margin-top: 16px;
  padding: 20px 0;
  font-size: 0.8rem;
}
.summary-difficulty > span {
  color: #c0c8b7;
}
.start {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 50px;
  padding: 12px 16px;
  background: #dfc38a;
  color: #15231d;
  border-color: #dfc38a;
  font-size: 0.85rem;
}
.start:hover:not(:disabled) {
  background: #f0dba9;
}
.save-note {
  color: #bbc6b8;
  font-size: 0.7rem;
  line-height: 1.6;
  text-align: center;
  margin: 14px 0 0;
}
.empty-team {
  font-size: 0.8rem;
  color: #e7d6b4;
  line-height: 1.6;
}
.resume {
  border: 1px solid #65705b;
  background: #23372b;
  padding: 14px 18px;
  margin-bottom: 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.85rem;
}
.save-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  background: #b2d7a8;
  border-radius: 50%;
  margin-right: 10px;
}
.resume-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.resume button {
  min-height: 44px;
  background: #17281f;
  border-color: #7d896f;
}
.setup-tools {
  border-top: 1px solid #45544a;
  padding-top: 14px;
}
.setup-tools :deep(.session-tools) {
  border-color: #536057;
  background: #17251f;
}
.setup-tools :deep(summary) {
  cursor: pointer;
  min-height: 44px;
  align-content: center;
  color: #ddd0b0;
}
.setup-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  color: #abb8aa;
  text-align: center;
  font: italic 0.85rem/1.6 var(--fell);
  padding: 24px 0 8px;
}
.setup-footer span {
  color: #cbb17b;
}
.setup :is(button, input, select, a):focus-visible {
  outline: 3px solid #fff3cd;
  outline-offset: 4px;
  box-shadow: 0 0 0 6px #101b19;
}
@media (min-width: 1250px) {
  .investigator-name {
    font-size: 1.1rem;
  }
}
@media (max-width: 1100px) {
  .setup {
    padding: 32px 24px 20px;
  }
  .setup-layout {
    grid-template-columns: minmax(0, 1fr) 270px;
    gap: 24px;
  }
  .investigator-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .preparation {
    padding: 20px;
  }
}
@media (max-width: 800px) {
  .setup-layout {
    grid-template-columns: 1fr;
  }
  .preparation {
    position: static;
  }
  .investigator-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
  .intro-seal {
    width: 90px;
    height: 90px;
  }
  .campaign-art {
    height: 210px;
  }
  .team-roster {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 560px) {
  .setup {
    padding: 28px 16px 16px;
  }
  .setup-intro {
    margin-bottom: 24px;
    padding-bottom: 24px;
  }
  .intro-seal {
    display: none;
  }
  .eyebrow {
    font-size: 0.62rem;
  }
  .intro-copy {
    font-size: 0.88rem;
  }
  .campaign-grid {
    grid-template-columns: 1fr;
  }
  .campaign-art {
    height: 210px;
  }
  .campaign-copy h2 {
    font-size: 1.6rem;
  }
  .investigator-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }
  .investigator-name {
    font-size: 1.15rem;
    min-height: 0;
  }
  .investigator-info {
    padding: 14px 12px;
  }
  .investigator-skills {
    gap: 14px;
  }
  .portrait-frame {
    aspect-ratio: 1;
  }
  .difficulty-grid {
    grid-template-columns: 1fr;
  }
  .team-roster {
    grid-template-columns: 1fr;
  }
  .section-heading {
    gap: 8px;
  }
  legend {
    font-size: 1.3rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .campaign-card:hover,
  .investigator-card:hover {
    transform: none;
  }
}
@media (forced-colors: active) {
  .campaign-card.selected,
  .investigator-card.selected,
  .difficulty-option.selected {
    outline: 3px solid Highlight;
  }
}
</style>
