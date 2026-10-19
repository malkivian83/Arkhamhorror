<script setup lang="ts">
import {
  campaignDefinition,
  canPlayNext,
  currentScenario,
  deckSize,
  deckSizeOf,
  purchaseOptions,
  removableCards,
  type PurchaseOption,
} from '@lcg/cards'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import ChaosTokenView from '../components/ChaosTokenView.vue'
import GameCard from '../components/GameCard.vue'
import SessionTools from '../components/SessionTools.vue'
import SitePage from '../components/SitePage.vue'
import { cardName, classColor } from '../game/cards'
import { localName } from '../game/localized'
import { useGameStore } from '../stores/game'

/**
 * Registro de campaña entre escenarios (guía de campaña, página 15): notas,
 * experiencia, trauma, apoyos de historia y bolsa del caos; y la compra de
 * cartas con experiencia.
 */
const { t } = useI18n()
const router = useRouter()
const game = useGameStore()

const campaign = computed(() => game.campaign)
const definition = computed(() => (campaign.value ? campaignDefinition(campaign.value.id) : null))
/** Números romanos de los escenarios. */
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
const next = computed(() => (campaign.value ? currentScenario(campaign.value) : null))
const playable = computed(() => !!campaign.value && canPlayNext(campaign.value))

const scenarioName = (id: string) => t(`campaign.scenario.${id}`)
const name = (code: string) => localName(cardName(code))

/** Investigador cuya tienda de cartas está abierta. */
const shopping = ref<string | null>(null)
/** Carta que sale del mazo para hacer sitio, por opción de compra. */
const removal = ref<Record<string, string>>({})

/** Primero las cartas que ya funcionan; después, por nivel y nombre. */
const options = computed(() =>
  (campaign.value && shopping.value ? purchaseOptions(campaign.value, shopping.value) : []).sort(
    (a, b) =>
      Number(b.implemented) - Number(a.implemented) ||
      a.level - b.level ||
      a.name.localeCompare(b.name),
  ),
)
const removable = computed(() =>
  campaign.value && shopping.value ? removableCards(campaign.value, shopping.value) : [],
)
const optionKey = (o: PurchaseOption) => `${o.code}:${o.replaces ?? 'new'}`

function buy(o: PurchaseOption) {
  if (!shopping.value) return
  const remove = o.needsRemoval ? removal.value[optionKey(o)] : undefined
  game.buy(shopping.value, o.code, { upgrade: !!o.replaces, ...(remove ? { remove } : {}) })
}

function playNext() {
  game.playNext()
  void router.push('/game')
}

function abandon() {
  if (!window.confirm(t('campaign.confirmAbandon'))) return
  game.abandonCampaign()
  void router.push('/')
}
</script>

<template>
  <SitePage
    v-if="campaign"
    :title="t('campaign.title', { name: definition ? t(definition.name) : '' })"
    :subtitle="t(`difficulty.${campaign.difficulty}`)"
    icon="campaign"
  >
    <SessionTools />

    <div class="grid">
      <section class="page" :aria-label="t('campaign.scenarios')">
        <h2>{{ t('campaign.scenarios') }}</h2>
        <ol class="scenarios">
          <li
            v-for="({ id }, n) in definition?.scenarios ?? []"
            :key="id"
            :class="{ done: n < campaign.scenarioIndex, current: id === next }"
          >
            <span class="numeral">{{ ROMAN[n] }}</span>
            <span class="title">{{ scenarioName(id) }}</span>
            <span v-if="campaign.results[n]" class="outcome">
              {{
                campaign.results[n]!.outcome.type === 'resolution'
                  ? t('table.resolutionN', { n: campaign.results[n]!.outcome.resolution })
                  : t('table.noResolution')
              }}
            </span>
            <span v-if="campaign.results[n]?.score !== undefined" class="outcome">
              {{ t('story.midwinterGala.score.total', { n: campaign.results[n]!.score }) }}
            </span>
            <details v-if="campaign.results[n]?.experience?.length" class="xp-details">
              <summary>{{ t('campaign.xpBreakdown') }}</summary>
              <p v-for="(gain, k) in campaign.results[n]!.experience" :key="k">
                {{
                  t('log.experience', {
                    name: name(gain.investigator),
                    bonus: gain.bonus,
                    victory: gain.victory,
                    amount: gain.amount,
                  })
                }}
              </p>
            </details>
          </li>
        </ol>

        <h2>{{ t('campaign.notes') }}</h2>
        <ul v-if="campaign.log.notes.length" class="notes">
          <li
            v-for="note in campaign.log.notes"
            :key="note"
            :class="{ crossed: campaign.log.crossedOut.includes(note) }"
          >
            {{ t(`story.note.${note}`) }}
            <template v-if="campaign.log.values[note]">: {{ campaign.log.values[note] }}</template>
          </li>
        </ul>
        <p v-else class="empty">{{ t('campaign.noNotes') }}</p>

        <h2>{{ t('table.chaosBag') }}</h2>
        <p v-if="!campaign.log.chaosTokens.length" class="empty">
          {{ t('campaign.bagUnchanged') }}
        </p>
        <div v-else class="tokens">
          <ChaosTokenView
            v-for="(token, i) in campaign.log.chaosTokens"
            :key="i"
            :token="token"
            :size="30"
          />
        </div>
      </section>

      <section class="investigators" :aria-label="t('campaign.investigators')">
        <article
          v-for="i in campaign.investigators"
          :key="i.id"
          class="investigator"
          :class="{
            out:
              campaign.log.investigators[i.id]?.killed || campaign.log.investigators[i.id]?.insane,
          }"
          :style="{ '--class': classColor(i.id) }"
        >
          <GameCard :code="i.id" :name="name(i.id)" :width="150" landscape />
          <div class="record">
            <h3>{{ name(i.id) }}</h3>
            <dl>
              <dt>{{ t('campaign.xp') }}</dt>
              <dd class="xp">{{ campaign.log.investigators[i.id]?.xp ?? 0 }}</dd>
              <dt>{{ t('campaign.trauma') }}</dt>
              <dd>
                {{ t('campaign.physical') }}
                {{ campaign.log.investigators[i.id]?.physicalTrauma ?? 0 }} ·
                {{ t('campaign.mental') }}
                {{ campaign.log.investigators[i.id]?.mentalTrauma ?? 0 }}
              </dd>
              <dt>{{ t('campaign.deck') }}</dt>
              <dd>
                {{
                  t('campaign.deckSize', {
                    n: deckSize(i.deck),
                    size: deckSizeOf(i.id, i.deck),
                  })
                }}
              </dd>
              <template v-if="campaign.log.investigators[i.id]?.storyAssets.length">
                <dt>{{ t('campaign.storyAssets') }}</dt>
                <dd>
                  {{ campaign.log.investigators[i.id]!.storyAssets.map(name).join(', ') }}
                </dd>
              </template>
            </dl>
            <p v-if="campaign.log.investigators[i.id]?.killed" class="fate">
              {{ t('campaign.killed') }}
            </p>
            <p v-else-if="campaign.log.investigators[i.id]?.insane" class="fate">
              {{ t('campaign.insane') }}
            </p>
            <button
              v-else
              type="button"
              :aria-expanded="shopping === i.id"
              :disabled="!!game.state"
              @click="shopping = shopping === i.id ? null : i.id"
            >
              {{ shopping === i.id ? t('campaign.closeShop') : t('campaign.upgradeDeck') }}
            </button>
          </div>

          <div v-if="shopping === i.id" class="shop">
            <p v-if="!options.length" class="empty">{{ t('campaign.nothingToBuy') }}</p>
            <ul v-else>
              <li v-for="o in options" :key="optionKey(o)" :class="{ pending: !o.implemented }">
                <span class="pips" :title="t('campaign.level', { n: o.level })">
                  <span v-for="n in 5" :key="n" :class="{ on: n <= o.level }" />
                </span>
                <span class="card-name">
                  {{ localName(o.name) }}
                  <small v-if="o.replaces">{{
                    t('campaign.upgradeOf', { card: name(o.replaces) })
                  }}</small>
                </span>
                <select
                  v-if="o.needsRemoval && o.implemented"
                  v-model="removal[optionKey(o)]"
                  :aria-label="t('campaign.remove')"
                >
                  <option :value="undefined" disabled>{{ t('campaign.remove') }}</option>
                  <option v-for="c in removable" :key="c" :value="c">{{ name(c) }}</option>
                </select>
                <span v-if="!o.implemented" class="soon">{{ t('campaign.notImplemented') }}</span>
                <button
                  v-else
                  type="button"
                  :disabled="o.needsRemoval && !removal[optionKey(o)]"
                  @click="buy(o)"
                >
                  {{ t('campaign.buy', { xp: o.cost }) }}
                </button>
              </li>
            </ul>
            <p v-if="game.error" class="error">{{ game.error }}</p>
          </div>
        </article>
      </section>
    </div>

    <footer class="actions">
      <button v-if="game.state" type="button" class="primary" @click="router.push('/game')">
        {{ t('campaign.resumeScenario') }}
      </button>
      <template v-else-if="next">
        <button type="button" class="primary" :disabled="!playable" @click="playNext">
          {{ t('campaign.play', { scenario: scenarioName(next) }) }}
        </button>
        <span v-if="!playable" class="soon">{{ t('campaign.comingSoon') }}</span>
      </template>
      <p v-else class="finished">{{ t('campaign.finished') }}</p>
      <button type="button" class="abandon" @click="abandon">{{ t('campaign.abandon') }}</button>
    </footer>
  </SitePage>

  <SitePage v-else :title="t('campaign.new')" icon="campaign">
    <div class="empty-campaign">
      <img src="/local-assets/home/icon-campaign.webp" alt="" width="64" height="64" />
      <p>{{ t('campaign.none') }}</p>
      <button type="button" class="primary" @click="router.push('/')">
        {{ t('table.newGame') }}
      </button>
    </div>
  </SitePage>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: minmax(260px, 340px) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
.page {
  padding: 16px 18px;
  color: var(--ink);
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 4px;
}
.page h2 {
  margin: 14px 0 6px;
  font-size: 0.95rem;
  color: var(--ink);
}
.page h2:first-child {
  margin-top: 0;
}
.scenarios,
.notes {
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: var(--type);
  font-size: 0.85rem;
  line-height: 24px;
}
.scenarios li {
  display: flex;
  gap: 8px;
  align-items: baseline;
  flex-wrap: wrap;
  color: var(--muted);
}
.scenarios li.done,
.scenarios li.current {
  opacity: 1;
}
.scenarios li.current .title {
  font-weight: 700;
}
.numeral {
  font-family: var(--display);
  min-width: 2em;
}
.outcome {
  margin-left: auto;
  font-family: var(--fell);
  font-style: italic;
  color: var(--accent);
}
.notes li::before {
  content: '— ';
  color: var(--muted);
}
.notes li.crossed {
  text-decoration: line-through;
  color: var(--muted);
}
.empty {
  margin: 0;
  font-family: var(--fell);
  font-style: italic;
  color: var(--muted);
}
.tokens {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.investigators {
  display: grid;
  gap: 14px;
}
.investigator {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 14px;
  padding: 14px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-top: 3px solid var(--class);
  border-radius: 4px;
}
.investigator.out {
  filter: grayscale(0.8);
  opacity: 0.7;
}
.record h3 {
  margin: 0 0 6px;
  color: var(--brass);
}
.record dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px 12px;
  margin: 0 0 10px;
  font-family: var(--fell);
  color: var(--ink);
}
.record dt {
  color: var(--muted);
}
.record dd {
  margin: 0;
}
.xp {
  font-family: var(--display);
  font-size: 1.1rem;
  color: var(--brass);
}
.fate {
  margin: 0;
  font-family: var(--display);
  color: #ffb4a9;
}
.shop {
  grid-column: 1 / -1;
  padding: 10px;
  background: rgb(0 0 0 / 30%);
  border: 1px solid var(--brass-dark);
}
.shop ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}
.shop li {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-family: var(--fell);
  color: var(--ink);
}
.shop li.pending {
  color: var(--muted);
}
.card-name {
  flex: 1;
  min-width: 160px;
}
.card-name small {
  display: block;
  color: var(--muted);
  font-style: italic;
}
.pips {
  display: inline-flex;
  gap: 2px;
}
.pips span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid var(--brass-dark);
}
.pips span.on {
  background: var(--brass);
}
.soon {
  font-family: var(--fell);
  font-style: italic;
  color: var(--muted);
}
.error {
  color: #ff8a80;
}
.actions {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 22px;
}
.actions .primary {
  font-size: 1.05rem;
  padding: 10px 24px;
}
.abandon {
  margin-left: auto;
}
.finished {
  font-family: var(--display);
  color: var(--brass);
}
.empty-campaign {
  display: grid;
  justify-items: center;
  gap: 16px;
  padding: 40px 24px;
  text-align: center;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 4px;
}
.empty-campaign p {
  margin: 0;
  color: var(--muted);
}
.empty-campaign img {
  object-fit: contain;
}
.record,
.investigator {
  min-width: 0;
}
.record dd {
  overflow-wrap: anywhere;
}
@media (max-width: 800px) {
  .grid,
  .investigator {
    grid-template-columns: 1fr;
  }
}
</style>
