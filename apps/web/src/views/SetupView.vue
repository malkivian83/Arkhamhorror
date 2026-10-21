<script setup lang="ts">
import {
  allCampaigns,
  campaignDefinition,
  STARTER_DECKS,
  starterInvestigator,
  type CampaignMember,
  type Difficulty,
} from '@lcg/cards'
import { BOONS, playerCardDef, type Boon } from '@lcg/engine'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import DisclosureIcon from '../components/DisclosureIcon.vue'
import SessionTools from '../components/SessionTools.vue'
import SiteAction from '../components/SiteAction.vue'
import SkillIcon from '../components/SkillIcon.vue'
import { campaignCover, scenarioLabel } from '../game/campaignProgress'
import { useDecksStore } from '../stores/decks'
import { useGameStore, type DeckKey } from '../stores/game'
import { account } from '../account/api'
import { localName } from '../game/localized'

/**
 * Portada «Vitrina»: la historia en un carril de portadas, el equipo en una
 * rejilla de retratos con búsqueda y filtros por clase, y una barra fija al pie
 * con el expediente (campaña, equipo, dificultad) y el botón para empezar.
 */
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
const campaignOnlyBoon = (boon: Boon) => boon === 'ancients' || boon === 'persephone'
const activeBoons = computed<Boon[]>({
  get: () =>
    boons.value.filter((boon) => !selectedCampaign.value?.standalone || !campaignOnlyBoon(boon)),
  set: (value) => {
    boons.value = value
  },
})
const ownDecks = computed(
  () =>
    chosen.value.filter((key) => validDecks(key).some((d) => d.id === deckFor.value[key])).length,
)
const slots = computed(() =>
  [0, 1, 2, 3].map((i) => {
    const key = chosen.value[i]
    return key ? { key, ...starterInvestigator(key) } : null
  }),
)

/** Partida o campaña a medias, para retomarla desde la portada. */
const resume = computed(() => {
  const campaign = game.campaign
  if (!campaign && !game.state) return null
  let name = ''
  try {
    name = campaign ? t(campaignDefinition(campaign.id).name) : ''
  } catch {
    // Campaña desconocida para esta versión: se muestra sin nombre.
  }
  const scenarioId = game.state?.scenarioId ?? null
  return {
    name: name || t('setup.savedAdventure'),
    cover: campaign ? campaignCover(campaign.id) : null,
    detail: [
      campaign ? scenarioLabel(campaign, scenarioId) : '',
      t(`difficulty.${campaign?.difficulty ?? game.state?.difficulty ?? 'standard'}`),
    ]
      .filter(Boolean)
      .join(' · '),
    to: game.state ? '/game' : '/campaign',
    campaignLink: !!campaign && !!game.state,
  }
})

/* Historias: búsqueda por nombre o descripción y filtro por tipo. */
type StoryType = 'all' | 'campaign' | 'standalone'
const storyQuery = ref('')
const storyType = ref<StoryType>('all')
const storyTypes: { value: StoryType; label: string }[] = [
  { value: 'all', label: 'setup.typeAll' },
  { value: 'campaign', label: 'setup.typeCampaigns' },
  { value: 'standalone', label: 'setup.typeStandalone' },
]
const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const visibleCampaigns = computed(() => {
  const query = normalize(storyQuery.value.trim())
  return campaigns.filter(
    (c) =>
      (storyType.value === 'all' || (storyType.value === 'standalone') === !!c.standalone) &&
      (!query || normalize(`${t(c.name)} ${t(`setup.descriptions.${c.id}`)}`).includes(query)),
  )
})

/* Carril de portadas: flechas solo cuando hay más portadas que espacio. */
const rail = ref<HTMLElement>()
const canPrev = ref(false)
const canNext = ref(false)
function updateRail() {
  const el = rail.value
  if (!el) return
  canPrev.value = el.scrollLeft > 4
  canNext.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
}
function scrollRail(direction: 1 | -1) {
  rail.value?.scrollBy({ left: direction * rail.value.clientWidth * 0.8, behavior: 'smooth' })
}
let railObserver: ResizeObserver | undefined
onMounted(() => {
  if (rail.value && typeof ResizeObserver !== 'undefined') {
    railObserver = new ResizeObserver(updateRail)
    railObserver.observe(rail.value)
  }
  updateRail()
})
onBeforeUnmount(() => railObserver?.disconnect())
watch(visibleCampaigns, () => void nextTick(updateRail))

/* Investigadores: búsqueda, filtro por clase y orden. */
const CLASS_ORDER = ['guardian', 'seeker', 'rogue', 'mystic', 'survivor', 'neutral']
const investigatorQuery = ref('')
const classFilter = ref<string>('all')
const sortBy = ref<'class' | 'name'>('class')
const classes = computed(() =>
  CLASS_ORDER.map((id) => ({
    id,
    count: investigators.filter((i) => i.faction === id).length,
  })).filter((c) => c.count),
)
const visibleInvestigators = computed(() => {
  const query = normalize(investigatorQuery.value.trim())
  return investigators
    .filter(
      (i) =>
        (classFilter.value === 'all' || i.faction === classFilter.value) &&
        (!query || normalize(i.name + ' ' + localName(i.name)).includes(query)),
    )
    .sort((a, b) =>
      sortBy.value === 'class'
        ? CLASS_ORDER.indexOf(a.faction) - CLASS_ORDER.indexOf(b.faction) ||
          localName(a.name).localeCompare(localName(b.name))
        : localName(a.name).localeCompare(localName(b.name)),
    )
})
const classColor = (faction: string) => `var(--class-${faction})`

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
  game.start(campaignId.value, members, difficulty.value, activeBoons.value)
  void router.push(game.state ? '/game' : '/campaign')
}
</script>

<template>
  <div class="setup-page">
    <header class="setup-hero">
      <img
        class="hero-art"
        src="/local-assets/home/cthulhu-rlyeh.webp"
        alt=""
        width="1500"
        height="750"
        fetchpriority="high"
      />
      <div class="hero-content">
        <div class="hero-copy">
          <p class="ui-eyebrow">{{ t('setup.eyebrow') }}</p>
          <h1 id="setup-title">{{ t('setup.title') }}</h1>
          <p>{{ t('setup.subtitle') }}</p>
        </div>
        <article v-if="resume" class="resume-card">
          <img v-if="resume.cover" :src="resume.cover" alt="" width="88" height="88" />
          <div class="resume-copy">
            <p class="ui-label">{{ t('setup.continueTitle') }}</p>
            <h2>{{ resume.name }}</h2>
            <p v-if="resume.detail">{{ resume.detail }}</p>
            <div class="resume-actions">
              <SiteAction :to="resume.to" icon="→">{{ t('library.open') }}</SiteAction>
              <RouterLink v-if="resume.campaignLink" to="/campaign">{{
                t('campaign.open')
              }}</RouterLink>
            </div>
          </div>
        </article>
      </div>
    </header>

    <form class="setup" aria-labelledby="setup-title" @submit.prevent="start">
      <div class="setup-content">
        <section class="setup-step" aria-labelledby="story-title">
          <div class="ui-step-heading">
            <span class="ui-step-number" aria-hidden="true">1</span>
            <h2 id="story-title">{{ t('setup.chooseStory') }}</h2>
            <span class="ui-step-meta">{{
              t('setup.available', { n: visibleCampaigns.length }, visibleCampaigns.length)
            }}</span>
            <div class="ui-toolbar step-tools">
              <label class="search">
                <span class="visually-hidden">{{ t('setup.searchCampaign') }}</span>
                <input
                  v-model="storyQuery"
                  class="ui-field"
                  type="search"
                  :placeholder="t('setup.searchCampaign')"
                />
              </label>
              <div class="ui-segmented" role="group" :aria-label="t('setup.storyType')">
                <button
                  v-for="type in storyTypes"
                  :key="type.value"
                  type="button"
                  class="ui-plain"
                  :aria-pressed="storyType === type.value"
                  @click="storyType = type.value"
                >
                  {{ t(type.label) }}
                </button>
              </div>
            </div>
          </div>

          <div class="rail-wrap">
            <ul ref="rail" class="ui-rail" @scroll.passive="updateRail">
              <li v-for="c in visibleCampaigns" :key="c.id">
                <label class="ui-cover-card" :class="{ selected: campaignId === c.id }">
                  <input
                    v-model="campaignId"
                    type="radio"
                    name="campaign"
                    :value="c.id"
                    :aria-describedby="`campaign-${c.id}`"
                  />
                  <span class="ui-cover">
                    <img :src="campaignCover(c.id)" alt="" width="448" height="560" />
                    <span class="ui-cover-tag">{{
                      c.standalone ? t('setup.standaloneTag') : t('setup.campaignLabel')
                    }}</span>
                    <span v-if="campaignId === c.id" class="ui-badge" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 16 16">
                        <path
                          d="M3 8.5l3 3 7-7"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </span>
                  </span>
                  <span class="ui-card-title">{{ t(c.name) }}</span>
                  <span :id="`campaign-${c.id}`" class="ui-card-meta">{{
                    t('setup.scenarioCount', { n: c.scenarios.length }, c.scenarios.length)
                  }}</span>
                </label>
              </li>
            </ul>
            <button
              v-if="canPrev"
              type="button"
              class="ui-plain rail-arrow previous"
              :aria-label="t('setup.railPrevious')"
              @click="scrollRail(-1)"
            >
              <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M10 3l-5 5 5 5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <button
              v-if="canNext"
              type="button"
              class="ui-plain rail-arrow next"
              :aria-label="t('setup.railNext')"
              @click="scrollRail(1)"
            >
              <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M6 3l5 5-5 5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
          <p v-if="!visibleCampaigns.length" class="empty-note">{{ t('setup.noStories') }}</p>

          <div v-if="selectedCampaign" class="story-detail ui-panel">
            <div class="story-copy">
              <p class="ui-eyebrow">
                {{ t('setup.selected') }} ·
                {{
                  selectedCampaign.standalone ? t('campaign.standalone') : t('setup.campaignLabel')
                }}
              </p>
              <h3>{{ t(selectedCampaign.name) }}</h3>
              <p>{{ t(`setup.descriptions.${selectedCampaign.id}`) }}</p>
            </div>
            <ol
              v-if="!selectedCampaign.standalone"
              class="story-scenarios"
              :aria-label="t('setup.chapters')"
            >
              <li v-for="(scenario, index) in selectedCampaign.scenarios" :key="scenario.id">
                <span aria-hidden="true">{{
                  ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][index]
                }}</span
                >{{ t(`campaign.scenario.${scenario.id}`) }}
              </li>
            </ol>
          </div>
        </section>

        <section class="setup-step" aria-labelledby="team-title" aria-describedby="team-help">
          <div class="ui-step-heading">
            <span class="ui-step-number" aria-hidden="true">2</span>
            <h2 id="team-title">{{ t('setup.teamTitle') }}</h2>
            <span class="ui-step-meta" role="status">{{
              t('setup.teamCount', { n: chosen.length })
            }}</span>
            <div class="ui-toolbar step-tools">
              <label class="search">
                <span class="visually-hidden">{{ t('setup.searchInvestigator') }}</span>
                <input
                  v-model="investigatorQuery"
                  class="ui-field"
                  type="search"
                  :placeholder="t('setup.searchInvestigator')"
                />
              </label>
              <label class="ui-inline-label">
                {{ t('setup.sortBy') }}
                <select v-model="sortBy" class="ui-field">
                  <option value="class">{{ t('setup.sortClass') }}</option>
                  <option value="name">{{ t('setup.sortName') }}</option>
                </select>
              </label>
            </div>
          </div>
          <p id="team-help" class="step-help">{{ t('setup.chooseInvestigators') }}</p>
          <div class="ui-chips class-chips" role="group" :aria-label="t('setup.classFilter')">
            <button
              type="button"
              class="ui-plain ui-chip"
              :aria-pressed="classFilter === 'all'"
              @click="classFilter = 'all'"
            >
              {{ t('setup.allClasses') }}
              <span class="ui-chip-count">{{ investigators.length }}</span>
            </button>
            <button
              v-for="c in classes"
              :key="c.id"
              type="button"
              class="ui-plain ui-chip"
              :aria-pressed="classFilter === c.id"
              @click="classFilter = classFilter === c.id ? 'all' : c.id"
            >
              <span class="ui-dot" :style="{ '--dot': classColor(c.id) }" />{{ t(`class.${c.id}`) }}
              <span class="ui-chip-count">{{ c.count }}</span>
            </button>
          </div>
          <div class="ui-portrait-grid">
            <button
              v-for="inv in visibleInvestigators"
              :key="inv.key"
              type="button"
              class="ui-plain ui-portrait-card"
              :aria-pressed="chosen.includes(inv.key)"
              :aria-disabled="!chosen.includes(inv.key) && chosen.length >= 4"
              :aria-describedby="chosen.length >= 4 ? 'team-limit' : undefined"
              @click="toggle(inv.key)"
            >
              <span class="ui-portrait" :style="{ '--dot': classColor(inv.faction) }">
                <img :src="portrait(inv.id)" alt="" width="240" height="300" />
                <span v-if="chosen.includes(inv.key)" class="ui-badge" aria-hidden="true">{{
                  chosen.indexOf(inv.key) + 1
                }}</span>
              </span>
              <span class="ui-portrait-name">{{ localName(inv.name) }}</span>
              <span class="ui-portrait-meta"
                ><span class="ui-dot" :style="{ '--dot': classColor(inv.faction) }" />{{
                  t(`class.${inv.faction}`)
                }}</span
              >
            </button>
          </div>
          <p v-if="!visibleInvestigators.length" class="empty-note">
            {{ t('setup.noInvestigators') }}
          </p>
          <p id="team-limit" class="team-notice" role="status">
            {{ teamNotice || (chosen.length >= 4 ? t('setup.teamLimit') : '') }}
          </p>
        </section>

        <div class="setup-extras">
          <details class="ui-disclosure">
            <summary>
              <img src="/local-assets/home/icon-decks.webp" alt="" width="32" height="32" />
              <span class="ui-disclosure-title"
                >{{ t('setup.teamDecks')
                }}<small>{{ t('setup.decksSummary', { n: ownDecks }, ownDecks) }}</small></span
              >
              <DisclosureIcon />
            </summary>
            <div class="ui-disclosure-body">
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
                    ><select v-model="deckFor[key]" class="ui-field">
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
            </div>
          </details>
          <details class="ui-disclosure">
            <summary>
              <img src="/local-assets/home/icon-boons.webp" alt="" width="32" height="32" />
              <span class="ui-disclosure-title"
                >{{ t('boons.title')
                }}<small
                  >{{ t('setup.optional') }} ·
                  {{ t('setup.boonsCount', { n: activeBoons.length }, activeBoons.length) }}</small
                ></span
              >
              <DisclosureIcon />
            </summary>
            <fieldset class="ui-disclosure-body boons" aria-describedby="boons-help">
              <legend class="visually-hidden">{{ t('boons.title') }}</legend>
              <p id="boons-help">{{ t('boons.help') }}</p>
              <div class="boons-grid">
                <label
                  v-for="boon in BOONS"
                  :key="boon"
                  class="boon-option"
                  :class="{
                    selected: activeBoons.includes(boon),
                    unavailable: campaignOnlyBoon(boon) && selectedCampaign?.standalone,
                  }"
                >
                  <input
                    v-model="activeBoons"
                    type="checkbox"
                    :value="boon"
                    :disabled="campaignOnlyBoon(boon) && selectedCampaign?.standalone"
                  />
                  <span class="boon-copy">
                    <strong>{{ t('boons.' + boon + '.name') }}</strong>
                    <span>{{ t('boons.' + boon + '.description') }}</span>
                    <small v-if="campaignOnlyBoon(boon)" class="campaign-only">{{
                      t('setup.campaignOnly')
                    }}</small>
                  </span>
                </label>
              </div>
            </fieldset>
          </details>
        </div>
        <p class="save-note">{{ account.user ? t('account.saveHint') : t('setup.localSave') }}</p>
      </div>

      <div class="ui-dock setup-dock">
        <div class="dock-content">
          <div v-if="selectedCampaign" class="dock-story">
            <img :src="campaignCover(selectedCampaign.id)" alt="" width="56" height="56" />
            <span
              ><b>{{ t(selectedCampaign.name) }}</b
              ><small>{{
                t(
                  'setup.scenarioCount',
                  { n: selectedCampaign.scenarios.length },
                  selectedCampaign.scenarios.length,
                )
              }}</small></span
            >
          </div>
          <div class="dock-team" role="group" :aria-label="t('setup.yourTeam')">
            <span
              v-for="(slot, index) in slots"
              :key="slot?.key ?? `empty-${index}`"
              class="ui-slot"
              :class="{ filled: slot }"
            >
              <img
                v-if="slot"
                :src="portrait(slot.id)"
                :alt="localName(slot.name)"
                width="52"
                height="52"
              />
              <span v-else class="visually-hidden">{{ t('setup.emptySlot') }}</span>
            </span>
            <span class="dock-count">{{ chosen.length }}/4</span>
          </div>
          <label class="ui-inline-label dock-difficulty">
            <span>{{ t('table.difficulty') }}</span>
            <select
              id="setup-difficulty"
              v-model="difficulty"
              class="ui-field"
              :title="t(`setup.difficultyNotes.${difficulty}`)"
            >
              <option v-for="d in difficulties" :key="d" :value="d">
                {{ t(`difficulty.${d}`) }}
              </option>
            </select>
          </label>
          <SiteAction
            type="submit"
            icon="→"
            class="dock-start"
            :disabled="!chosen.length || !selectedCampaign"
          >
            {{ t(selectedCampaign?.standalone ? 'setup.beginScenario' : 'setup.beginCampaign') }}
          </SiteAction>
        </div>
      </div>
    </form>
    <div class="setup-tools"><SessionTools /></div>
    <footer class="setup-footer">{{ t('app.disclaimer') }}</footer>
  </div>
</template>

<style scoped>
.setup-page {
  min-height: calc(100dvh - 84px);
  background: var(--site-bg);
  color: var(--site-ink);
  font: 400 1rem/1.5 var(--site-body);
}

/* Cabecera: ilustración de fondo, título y la partida a medias. */
.setup-hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border-bottom: 1px solid var(--site-line);
}
.hero-art {
  position: absolute;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 40%;
}
.setup-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(90deg, #19191df2 0%, #19191dcc 45%, #19191d33 100%);
}
.hero-content {
  max-width: 1312px;
  min-height: 300px;
  margin: auto;
  padding: 36px 64px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 48px;
}
.hero-copy {
  flex: 1;
  display: grid;
  gap: 12px;
}
h1 {
  margin: 0;
  font: 700 clamp(2rem, 4vw, 3rem) / 1.15 var(--site-display);
  letter-spacing: 0;
}
.hero-copy > p:last-child {
  margin: 0;
  color: var(--site-ink-soft);
  font-size: 1.125rem;
}
.resume-card {
  width: 440px;
  max-width: 100%;
  box-sizing: border-box;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 16px;
  background: #19191dd9;
  border: 1px solid var(--site-border);
  border-radius: var(--site-radius-lg);
  box-shadow: var(--site-shadow-lift);
}
.resume-card > img {
  width: 88px;
  height: 88px;
  flex: none;
  border-radius: 6px;
  object-fit: cover;
}
.resume-copy {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 6px;
}
.resume-copy h2 {
  margin: 0;
  font: 700 1.125rem/1.3 var(--site-display);
}
.resume-copy > p:not(.ui-label) {
  margin: 0;
  color: var(--site-ink-soft);
  font-size: 0.875rem;
}
.resume-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 6px;
}
.resume-actions a:not(.site-action) {
  color: var(--site-accent);
  font-size: 0.875rem;
  text-underline-offset: 4px;
}

/* Pasos. */
.setup-content {
  max-width: 1312px;
  margin: auto;
  padding: 48px 64px 40px;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 56px;
}
.setup-step {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 22px;
}
.step-tools {
  margin-left: auto;
}
.search .ui-field {
  width: 280px;
}
.step-help {
  margin: -10px 0 0;
  color: var(--site-muted);
}
.empty-note {
  margin: 0;
  padding: 24px;
  color: var(--site-muted);
  text-align: center;
  border: 1px dashed var(--site-line);
  border-radius: var(--site-radius-lg);
}

.rail-wrap {
  position: relative;
}
.rail-wrap .ui-rail {
  margin-inline: -4px;
}
.rail-arrow {
  position: absolute;
  top: calc(50% - 50px);
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  color: #f3dfbc;
  background: #2d211b;
  border: 1px solid #b48355;
  border-radius: 50%;
  box-shadow: 0 6px 18px #000a;
}
.rail-arrow:hover {
  filter: brightness(1.15);
}
.rail-arrow.previous {
  left: -22px;
}
.rail-arrow.next {
  right: -22px;
}

.story-detail {
  display: flex;
  align-items: flex-start;
  gap: 28px;
  padding: 22px 24px;
}
.story-copy {
  flex: 1;
  display: grid;
  gap: 8px;
}
.story-copy h3 {
  margin: 0;
  font: 700 1.375rem/1.3 var(--site-display);
}
.story-copy > p:last-child {
  margin: 0;
  max-width: 62ch;
  color: var(--site-ink-soft);
  line-height: 1.6;
}
.story-scenarios {
  min-width: 300px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}
.story-scenarios li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid var(--site-line);
  border-radius: 6px;
}
.story-scenarios li > span {
  width: 24px;
  color: var(--site-accent);
  font: 700 0.875rem var(--site-display);
}

.team-notice {
  margin: 0;
  color: var(--site-accent);
}
.team-notice:empty {
  display: none;
}

/* Mazos y bendiciones: dos filas; la abierta ocupa todo el ancho. */
.setup-extras {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 20px;
}
.setup-extras > details[open] {
  grid-column: 1 / -1;
}
.order-hint,
.boons > p {
  max-width: 75ch;
  margin: 0 0 16px;
  color: var(--site-muted);
  font-size: 0.875rem;
}
.team-roster {
  margin: 0;
  padding: 0;
  list-style: none;
}
.team-roster li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 18px;
  padding: 14px 0;
  border-top: 1px solid var(--site-line);
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
.deck-choice > span,
.starter-deck {
  color: var(--site-muted);
  font-size: 0.8125rem;
}
.manage-decks {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  color: var(--site-accent);
  text-underline-offset: 4px;
}
.boons {
  min-width: 0;
  margin: 0;
  border: 0;
}
.boons-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.boon-option {
  display: flex;
  align-items: start;
  gap: 12px;
  min-width: 0;
  padding: 15px;
  background: var(--site-panel-sunken);
  border: 1px solid var(--site-border);
  border-radius: 7px;
  cursor: pointer;
}
.boon-option.selected {
  background: var(--site-panel-selected);
  border-color: var(--site-accent);
}
.boon-option.unavailable {
  opacity: 0.55;
  cursor: not-allowed;
}
.boon-option:has(:focus-visible) {
  outline: 2px solid var(--site-ink);
  outline-offset: 3px;
}
.boon-option input {
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
  margin: 2px 0 0;
  accent-color: var(--site-accent);
}
.boon-copy {
  display: grid;
  gap: 6px;
  font-size: 0.875rem;
  line-height: 1.5;
}
.boon-copy > span {
  color: var(--site-muted);
}
.boon-copy strong {
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.35;
}
.campaign-only {
  justify-self: start;
  color: var(--site-accent);
  font-size: 0.6875rem;
  border-bottom: 1px solid #73564a;
}
.save-note {
  margin: -32px 0 0;
  color: var(--site-faint);
  font-size: 0.8125rem;
}

/* Barra del expediente. */
.dock-content {
  max-width: 1312px;
  min-height: 104px;
  margin: auto;
  padding: 12px 64px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 28px;
}
.dock-story {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  padding-right: 28px;
  border-right: 1px solid var(--site-line);
}
.dock-story img {
  width: 56px;
  height: 56px;
  flex: none;
  border-radius: 6px;
  object-fit: cover;
}
.dock-story > span {
  display: grid;
  min-width: 0;
}
.dock-story b {
  font: 700 1rem/1.3 var(--site-display);
  overflow-wrap: anywhere;
}
.dock-story small {
  color: var(--site-muted);
  font-size: 0.8125rem;
}
.dock-team {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dock-count {
  margin-left: 4px;
  color: var(--site-ink-soft);
  font-size: 0.875rem;
}
.dock-difficulty {
  margin-left: auto;
}
.dock-difficulty .ui-field {
  width: 140px;
}
.dock-start {
  min-height: 52px;
}

.setup-tools,
.setup-footer {
  max-width: 1312px;
  margin: auto;
  padding: 0 64px;
  box-sizing: border-box;
}
.setup-tools {
  padding-top: 24px;
}
.setup-tools :deep(.session-tools) {
  margin: 0;
  padding: 12px 0 0;
  color: var(--site-muted);
  background: transparent;
  border: 0;
  border-top: 1px solid var(--site-line);
  border-radius: 0;
}
.setup-footer {
  padding-block: 18px 28px;
  color: var(--site-muted);
  font-size: 0.75rem;
  line-height: 1.5;
}

@media (max-width: 1100px) {
  .hero-content,
  .setup-content,
  .dock-content,
  .setup-tools,
  .setup-footer {
    padding-inline: 32px;
  }
  .dock-content {
    gap: 20px;
  }
  .dock-story {
    padding-right: 20px;
  }
  .story-scenarios {
    min-width: 240px;
  }
}

@media (max-width: 860px) {
  .hero-content {
    flex-direction: column;
    align-items: stretch;
    gap: 24px;
  }
  .resume-card {
    width: auto;
  }
  .step-tools {
    flex-basis: 100%;
    margin-left: 0;
  }
  .search {
    flex: 1;
  }
  .search .ui-field {
    width: 100%;
  }
  .story-detail {
    flex-direction: column;
  }
  .story-scenarios {
    min-width: 0;
    width: 100%;
  }
  .setup-extras,
  .boons-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .dock-story {
    display: none;
  }
}

@media (max-width: 700px) {
  .hero-content {
    min-height: 0;
    padding: 36px 16px 24px;
  }
  .setup-hero::after {
    background: linear-gradient(0deg, #19191d 0%, #19191dcc 45%, #19191d55 100%);
  }
  .hero-art {
    object-position: 70% 40%;
  }
  .hero-copy > p:last-child {
    font-size: 1rem;
  }
  .resume-card {
    padding: 14px;
    flex-wrap: wrap;
  }
  .resume-card > img {
    width: 56px;
    height: 56px;
  }
  .setup-content {
    padding: 32px 16px 32px;
    gap: 40px;
  }
  .setup-step {
    gap: 14px;
  }
  .step-help {
    margin-top: -4px;
  }
  .ui-step-number {
    width: 30px;
    height: 30px;
    font-size: 0.875rem;
  }
  .search,
  .ui-segmented,
  .step-tools > .ui-inline-label {
    flex: 1 1 100%;
    min-width: 0;
  }
  .ui-segmented > button {
    flex: 1;
    min-width: 0;
    padding: 0 8px;
  }
  .ui-inline-label .ui-field {
    flex: 1;
  }
  /* En móvil los filtros se desplazan en una sola línea. */
  .class-chips {
    flex-wrap: nowrap;
    overflow-x: auto;
    margin-inline: -16px;
    padding: 2px 16px 6px;
    scrollbar-width: none;
  }
  .rail-wrap .ui-rail {
    margin-inline: -16px;
    padding-inline: 16px;
    scroll-padding-inline: 16px;
  }
  .rail-arrow {
    display: none;
  }
  .story-detail {
    padding: 16px;
    gap: 14px;
  }
  .story-copy h3 {
    display: none;
  }
  .save-note {
    margin-top: -24px;
  }
  .dock-content {
    min-height: 0;
    padding: 10px 16px 14px;
    flex-wrap: wrap;
    gap: 10px 8px;
  }
  .dock-team {
    gap: 6px;
  }
  .dock-difficulty > span {
    display: none;
  }
  .dock-difficulty .ui-field {
    width: 112px;
    padding-inline: 10px;
  }
  .dock-count {
    margin-left: 0;
  }
  .dock-start {
    flex-basis: 100%;
    min-height: 50px;
  }
  .setup-tools,
  .setup-footer {
    padding-inline: 16px;
  }
}
</style>
