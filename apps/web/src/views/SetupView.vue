<script setup lang="ts">
import {
  allCampaigns,
  STARTER_DECKS,
  starterInvestigator,
  type CampaignMember,
  type Difficulty,
} from '@lcg/cards'
import { BOONS, playerCardDef, type Boon } from '@lcg/engine'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import SessionTools from '../components/SessionTools.vue'
import SkillIcon from '../components/SkillIcon.vue'
import { useDecksStore } from '../stores/decks'
import { useGameStore, type DeckKey } from '../stores/game'
import { account } from '../account/api'

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
const boons = ref<Boon[]>([])
const campaigns = allCampaigns()
const campaignId = ref(campaigns[0]?.id ?? '')
const selectedCampaign = computed(() => campaigns.find((c) => c.id === campaignId.value))
const difficulties: Difficulty[] = ['easy', 'standard', 'hard', 'expert']
const skills = ['willpower', 'intellect', 'combat', 'agility'] as const
const portrait = (id: string) => `/local-assets/setup/${id}.jpg`
const teamNotice = ref('')
const teamSummary = computed(() => {
  const first = chosen.value[0]
  if (!first) return t('setup.emptyTeam')
  if (chosen.value.length > 1) return t('setup.teamReady', { n: chosen.value.length })
  const own = validDecks(first).find((deck) => deck.id === deckFor.value[first])
  return `${starterInvestigator(first).name} · ${own?.name ?? t('decks.starter')}`
})

function toggle(key: DeckKey) {
  teamNotice.value = ''
  if (chosen.value.includes(key)) chosen.value = chosen.value.filter((k) => k !== key)
  else if (chosen.value.length < 4) chosen.value = [...chosen.value, key]
  else teamNotice.value = t('setup.teamLimit')
}

function start() {
  if (!chosen.value.length || !selectedCampaign.value) return
  if (game.campaign && !window.confirm(t('campaign.confirmReplace'))) return
  const members = chosen.value.map((key): CampaignMember => {
    const own = validDecks(key).find((d) => d.id === deckFor.value[key])
    return own ? { investigator: own.investigator, cards: own.cards } : key
  })
  game.start(campaignId.value, members, difficulty.value, boons.value)
  void router.push(game.state ? '/game' : '/campaign')
}
</script>

<template>
  <div class="setup-page">
    <section class="setup" aria-labelledby="setup-title">
      <header class="setup-intro">
        <img
          class="mythos-art"
          src="/local-assets/home/cthulhu-rlyeh.webp"
          alt=""
          width="1500"
          height="750"
          fetchpriority="high"
        />
        <div class="intro-content">
          <p class="eyebrow">{{ t('setup.eyebrow') }}</p>
          <h1 id="setup-title">{{ t('setup.title') }}</h1>
          <p class="intro-copy">{{ t('setup.subtitle') }}</p>
          <div v-if="game.state || game.campaign" class="resume-actions">
            <RouterLink v-if="game.state" to="/game"
              >{{ t('setup.resume') }} <span aria-hidden="true">↗</span></RouterLink
            >
            <RouterLink v-if="game.campaign" to="/campaign"
              >{{ t('campaign.open') }} <span aria-hidden="true">↗</span></RouterLink
            >
          </div>
        </div>
      </header>
      <form class="setup-form" @submit.prevent="start">
        <fieldset class="setup-section">
          <legend>
            <img
              class="section-icon"
              src="/local-assets/home/icon-campaign.webp"
              alt=""
              width="36"
              height="36"
            />{{ t('campaign.choose') }}
          </legend>
          <div class="campaign-grid">
            <label
              v-for="c in campaigns"
              :key="c.id"
              class="campaign-card"
              :class="{ selected: campaignId === c.id }"
            >
              <input
                v-model="campaignId"
                type="radio"
                name="campaign"
                :value="c.id"
                :aria-label="t(c.name)"
                :aria-describedby="`campaign-${c.id}`"
              />
              <img
                class="campaign-art"
                :src="`/local-assets/setup/${c.id}.jpg`"
                alt=""
                width="600"
                height="360"
              />
              <span class="campaign-copy">
                <span :id="`campaign-${c.id}`" class="campaign-meta">{{
                  c.standalone
                    ? t('campaign.standalone')
                    : `${t('setup.campaignLabel')} · ${t('setup.scenarioCount', { n: c.scenarios.length }, c.scenarios.length)}`
                }}</span>
                <span class="campaign-name">{{ t(c.name) }}</span>
                <span class="campaign-selection">{{
                  campaignId === c.id ? t('setup.selected') : t('setup.selectAdventure')
                }}</span>
              </span>
            </label>
          </div>
        </fieldset>

        <fieldset class="setup-section" aria-describedby="team-help team-status">
          <legend>
            <img
              class="section-icon"
              src="/local-assets/home/icon-investigators.webp"
              alt=""
              width="36"
              height="36"
            />{{ t('setup.teamTitle') }}
          </legend>
          <div class="section-heading">
            <p id="team-help">{{ t('setup.chooseInvestigators') }}</p>
            <span id="team-status" role="status">{{
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
              :aria-pressed="chosen.includes(inv.key)"
              :aria-disabled="!chosen.includes(inv.key) && chosen.length >= 4"
              :aria-describedby="chosen.length >= 4 ? 'team-limit' : undefined"
              @click="toggle(inv.key)"
            >
              <span class="portrait-frame"
                ><img :src="portrait(inv.id)" alt="" width="240" height="300" /><span
                  v-if="chosen.includes(inv.key)"
                  class="selection-mark"
                  aria-hidden="true"
                  >✓</span
                ></span
              >
              <span class="investigator-info"
                ><strong>{{ inv.name }}</strong
                ><span>{{ t(`class.${inv.faction}`) }}</span></span
              >
            </button>
          </div>
          <p id="team-limit" class="team-notice" role="status">
            {{ teamNotice || (chosen.length >= 4 ? t('setup.teamLimit') : '') }}
          </p>
          <details class="team-decks">
            <summary>
              <img
                class="deck-icon"
                src="/local-assets/home/icon-decks.webp"
                alt=""
                width="28"
                height="28"
              /><span>{{ t('setup.teamDecks') }}</span
              ><span class="disclosure" aria-hidden="true">⌄</span>
            </summary>
            <p class="order-hint">{{ t('setup.orderHint') }}</p>
            <ol class="team-roster">
              <li v-for="(key, index) in chosen" :key="key">
                <div class="roster-investigator">
                  <strong>{{ index + 1 }}. {{ starterInvestigator(key).name }}</strong
                  ><span class="investigator-skills"
                    ><span
                      v-for="skill in skills"
                      :key="skill"
                      :aria-label="`${t(`skill.${skill}`)}: ${starterInvestigator(key).skills[skill]}`"
                      ><SkillIcon :skill="skill" aria-hidden="true" /><b aria-hidden="true">{{
                        starterInvestigator(key).skills[skill]
                      }}</b></span
                    ></span
                  >
                </div>
                <label v-if="validDecks(key).length" class="deck-choice"
                  ><span>{{ t('setup.deckFor', { name: starterInvestigator(key).name }) }}</span
                  ><select v-model="deckFor[key]">
                    <option :value="undefined">{{ t('decks.starter') }}</option>
                    <option v-for="deck in validDecks(key)" :key="deck.id" :value="deck.id">
                      {{ deck.name }}
                    </option>
                  </select></label
                >
                <span v-else class="starter-deck">{{ t('decks.starter') }}</span>
              </li>
            </ol>
            <p v-if="!chosen.length">{{ t('setup.emptyTeam') }}</p>
            <RouterLink to="/decks" class="manage-decks"
              >{{ t('decks.manage') }} <span aria-hidden="true">↗</span></RouterLink
            >
          </details>
        </fieldset>
        <fieldset class="boons">
          <legend>{{ t('boons.title') }}</legend>
          <p>{{ t('boons.help') }}</p>
          <label v-for="boon in BOONS" :key="boon" class="boon-option">
            <input
              v-model="boons"
              type="checkbox"
              :value="boon"
              :disabled="
                (boon === 'ancients' || boon === 'persephone') && selectedCampaign?.standalone
              "
            />
            <span
              ><strong>{{ t('boons.' + boon + '.name') }}</strong
              ><br />{{ t('boons.' + boon + '.description') }}</span
            >
          </label>
        </fieldset>
        <div class="start-bar">
          <img
            class="archive-art"
            src="/local-assets/home/occult-archive.webp"
            alt=""
            width="1000"
            height="500"
            loading="lazy"
          />
          <div class="difficulty-choice">
            <label for="setup-difficulty">{{ t('table.difficulty') }}</label>
            <select id="setup-difficulty" v-model="difficulty" aria-describedby="difficulty-note">
              <option v-for="d in difficulties" :key="d" :value="d">
                {{ t(`difficulty.${d}`) }}
              </option>
            </select>
            <span id="difficulty-note" class="visually-hidden">{{
              t(`setup.difficultyNotes.${difficulty}`)
            }}</span>
          </div>
          <p class="team-summary">{{ teamSummary }}</p>
          <button type="submit" class="start" :disabled="!chosen.length || !selectedCampaign">
            {{ t(selectedCampaign?.standalone ? 'setup.beginScenario' : 'setup.beginCampaign') }}
            <span aria-hidden="true">→</span>
          </button>
        </div>
        <p class="save-note">{{ account.user ? t('account.saveHint') : t('setup.localSave') }}</p>
      </form>
      <div class="setup-tools"><SessionTools /></div>
      <footer class="setup-footer">{{ t('app.disclaimer') }}</footer>
    </section>
  </div>
</template>

<style scoped>
.boons {
  flex-basis: 100%;
}
.boon-option {
  display: flex;
  gap: 0.75rem;
  padding: 0.7rem;
  align-items: start;
}
.setup-page {
  --ink: #f4efe7;
  --accent: #e5aa8d;
  --panel: #25252b;
  --panel-2: #25252b;
  --border: #807574;
  --muted: #c3bbb4;
  --heading: 'Libre Baskerville', Georgia, serif;
  min-height: calc(100dvh - 94px);
  background: #19191d;
  color: var(--ink);
  font:
    400 1rem/1.5 'Source Sans 3',
    system-ui,
    sans-serif;
}
.setup {
  max-width: 1068px;
  margin: auto;
  padding: 0 36px 20px;
}
.setup-intro {
  position: relative;
  isolation: isolate;
  min-height: 230px;
  margin: 0 -36px 28px;
  padding: 34px 36px;
  display: flex;
  align-items: center;
  overflow: hidden;
  border-bottom: 1px solid var(--border);
}
.mythos-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 75% 10%;
  z-index: -2;
}
.setup-intro::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(90deg, #19191dfc, #19191de6 22%, #19191d88 47%, #19191d05 82%),
    linear-gradient(0deg, #19191dba, transparent 30%);
  pointer-events: none;
}
.intro-content {
  max-width: 460px;
}
.eyebrow {
  color: var(--accent);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  margin: 0 0 7px;
  text-transform: uppercase;
}
h1 {
  font: 700 clamp(1.75rem, 3.4vw, 2.25rem)/1.25 var(--heading);
  letter-spacing: -0.03em;
  margin: 0 0 10px;
  color: #fff7ed;
  text-shadow: 0 2px 8px #0008;
}
.intro-copy {
  margin: 0;
  color: #e2d9cf;
  font-size: 1rem;
}
.resume-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 22px;
  margin-top: 12px;
}
.resume-actions a {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  min-height: 44px;
  color: #f1bd9e;
  border-bottom: 1px solid #c19a83;
  text-decoration: none;
  font-size: 0.9375rem;
}
.setup-section {
  padding: 0;
  margin: 0 0 28px;
  border: 0;
  min-width: 0;
}
.setup-section legend {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0;
  margin-bottom: 16px;
  font: 700 1.375rem/1.35 var(--heading);
  letter-spacing: 0;
  max-width: 100%;
}
.section-icon {
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  object-fit: contain;
}
.campaign-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.campaign-card {
  display: block;
  position: relative;
  min-width: 0;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 3px;
  overflow: hidden;
  cursor: pointer;
}
.campaign-card.selected,
.investigator-card.selected {
  border-color: var(--accent);
  box-shadow: inset 0 -3px var(--accent);
}
.campaign-card input {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 22px;
  height: 22px;
  accent-color: var(--accent);
  margin: 0;
}
.campaign-art {
  display: block;
  width: 100%;
  height: 126px;
  object-fit: cover;
  object-position: center 46%;
}
.campaign-copy {
  display: grid;
  gap: 5px;
  padding: 14px 17px 16px;
}
.campaign-meta {
  color: var(--muted);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.035em;
}
.campaign-name {
  font: 700 1.375rem/1.3 var(--heading);
}
.campaign-selection {
  color: var(--muted);
  font-size: 0.8125rem;
}
.selected .campaign-selection {
  color: var(--accent);
  font-weight: 600;
}
.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 14px;
  margin: -7px 0 14px;
  font-size: 0.875rem;
}
.section-heading p {
  margin: 0;
  color: var(--muted);
}
#team-status {
  white-space: nowrap;
}
.investigator-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}
.investigator-card {
  text-align: left;
  padding: 0;
  min-width: 0;
  border-radius: 3px;
  background: var(--panel);
  overflow: hidden;
}
.investigator-card.selected {
  color: var(--ink);
  background: #37303a;
}
.investigator-card[aria-disabled='true'] {
  opacity: 0.65;
  cursor: not-allowed;
}
.portrait-frame {
  display: block;
  position: relative;
}
.portrait-frame img {
  display: block;
  width: 100%;
  height: 100px;
  object-fit: cover;
  object-position: center 20%;
}
.selection-mark {
  position: absolute;
  right: 7px;
  top: 7px;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--accent);
  color: #261b1c;
  font-weight: 600;
}
.investigator-info {
  display: grid;
  gap: 5px;
  padding: 10px 10px 13px;
}
.investigator-info strong {
  font-size: 0.9375rem;
  line-height: 1.4;
  min-height: 42px;
  font-weight: 600;
}
.investigator-info > span {
  font-size: 0.8125rem;
  color: var(--muted);
}
.team-notice {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 0.875rem;
}
.team-notice:empty {
  margin: 0;
}
.team-decks {
  margin-top: 12px;
  font-size: 0.875rem;
}
.team-decks > summary {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  cursor: pointer;
  list-style: none;
}
.team-decks > summary::-webkit-details-marker {
  display: none;
}
.deck-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
}
.disclosure {
  color: var(--accent);
  font-size: 1.1rem;
}
.team-decks[open] .disclosure {
  transform: rotate(180deg);
}
.order-hint {
  max-width: 75ch;
  color: var(--muted);
}
.team-roster {
  list-style: none;
  margin: 0;
  padding: 0;
}
.team-roster li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 18px;
  padding: 14px 0;
  border-top: 1px solid var(--border);
}
.roster-investigator {
  display: grid;
  gap: 8px;
}
.investigator-skills,
.investigator-skills > span {
  display: flex;
  align-items: center;
  gap: 6px;
}
.investigator-skills {
  gap: 16px;
}
.investigator-skills :deep(.sk) {
  font-size: 0.8125rem;
}
.deck-choice {
  display: grid;
  gap: 6px;
  max-width: 100%;
}
.deck-choice > span {
  color: var(--muted);
  font-size: 0.8125rem;
}
.starter-deck {
  color: var(--muted);
}
.manage-decks {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  color: var(--accent);
  text-underline-offset: 4px;
}
.setup select {
  background: var(--panel);
  color: var(--ink);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 9px 12px;
  min-height: 44px;
  max-width: 100%;
  font: inherit;
}
.start-bar {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 24px 20px;
  border-block: 1px solid var(--border);
  overflow: hidden;
}
.archive-art {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: right 62%;
  opacity: 0.3;
  mask-image: linear-gradient(90deg, transparent, #000 70%);
}
.difficulty-choice {
  display: grid;
  gap: 6px;
  min-width: 140px;
  color: var(--muted);
  font-size: 0.8125rem;
}
.difficulty-choice select {
  color: var(--ink);
  font-size: 0.9375rem;
}
.team-summary {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--muted);
  font-size: 0.875rem;
  margin: 19px 0 0;
}
.start {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  min-height: 48px;
  padding: 12px 20px;
  border-radius: 3px;
  border: 1px solid var(--accent);
  color: #261b1c;
  background: var(--accent);
  font-size: 0.9375rem;
  font-weight: 600;
  margin-left: auto;
  flex-shrink: 0;
}
.start:hover:not(:disabled) {
  background: #f1bd9e;
}
.save-note {
  color: var(--muted);
  margin: 12px 0 0;
  font-size: 0.8125rem;
}
.setup-tools {
  margin-top: 18px;
}
.setup-tools :deep(.session-tools) {
  padding: 0;
  border: 0;
  color: var(--muted);
  background: transparent;
}
.setup-tools :deep(summary) {
  min-height: 44px;
  align-content: center;
  cursor: pointer;
}
.setup-tools :deep(button) {
  min-height: 44px;
}
.setup-footer {
  color: var(--muted);
  padding: 18px 0 4px;
  font-size: 0.75rem;
  line-height: 1.5;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.campaign-card:has(:focus-visible) {
  outline: 3px solid #fff;
  outline-offset: 3px;
}
@media (max-width: 680px) {
  .setup-page {
    min-height: calc(100dvh - 82px);
  }
  .setup {
    padding: 0 20px 20px;
  }
  .setup-intro {
    margin: 0 -20px 25px;
    padding: 27px 20px;
  }
  .mythos-art {
    object-position: 76% 38%;
  }
  .setup-intro::after {
    background:
      linear-gradient(90deg, #19191de6, #19191d9e 60%, #19191d50),
      linear-gradient(0deg, #19191dbf, transparent 60%);
  }
  h1 {
    font-size: 1.6875rem;
    max-width: 290px;
  }
  .intro-copy {
    max-width: 250px;
  }
  .setup-section legend {
    font-size: 1.25rem;
    gap: 10px;
  }
  .campaign-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .campaign-card {
    display: grid;
    grid-template-columns: 100px 1fr;
  }
  .campaign-art {
    width: 100px;
    height: 100%;
    min-height: 120px;
    object-position: center;
  }
  .campaign-card input {
    right: 10px;
    top: 12px;
    width: 18px;
    height: 18px;
  }
  .campaign-copy {
    padding: 14px 32px 14px 14px;
    gap: 6px;
  }
  .campaign-name {
    font-size: 1.1875rem;
  }
  .campaign-meta {
    font-size: 0.6875rem;
    letter-spacing: 0;
  }
  .investigator-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .portrait-frame img {
    height: 105px;
  }
  .investigator-info strong {
    min-height: 0;
  }
  .investigator-info {
    padding: 11px 10px 14px;
  }
  .section-heading {
    font-size: 0.8125rem;
    gap: 8px;
  }
  .start-bar {
    flex-wrap: wrap;
    padding: 20px 0;
    gap: 15px;
  }
  .difficulty-choice {
    flex: 1;
    min-width: 115px;
  }
  .team-summary {
    flex: 1;
    font-size: 0.8125rem;
  }
  .start {
    width: 100%;
    margin: 0;
    min-height: 50px;
  }
  .setup select {
    font-size: 1rem;
  }
}
@media (max-width: 350px) {
  .setup {
    padding-inline: 16px;
  }
  .setup-intro {
    margin-inline: -16px;
    padding-inline: 16px;
  }
  .section-icon {
    flex-basis: 30px;
    width: 30px;
    height: 30px;
  }
  .setup-section legend {
    gap: 9px;
    font-size: 1.125rem;
  }
  .campaign-card {
    grid-template-columns: 78px 1fr;
  }
  .campaign-art {
    width: 78px;
  }
}
@media (forced-colors: active) {
  .campaign-card.selected,
  .investigator-card.selected {
    outline: 3px solid Highlight;
  }
}
</style>
