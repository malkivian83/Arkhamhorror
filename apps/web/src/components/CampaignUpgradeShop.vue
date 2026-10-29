<script setup lang="ts">
import type { PurchaseOption } from '@lcg/cards'
import { playerCardDef } from '@lcg/engine'
import { computed, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardName } from '../game/cards'
import { localName } from '../game/localized'
import CardDetails from './CardDetails.vue'
import GameCard from './GameCard.vue'

const props = defineProps<{
  options: PurchaseOption[]
  removable: string[]
  xp: number
  disabled: boolean
}>()
const emit = defineEmits<{ buy: [option: PurchaseOption, remove?: string] }>()
const { t, locale } = useI18n()
const titleId = useId()
const dialog = ref<HTMLDialogElement>()
const query = ref('')
const kind = ref('all')
const level = ref('all')
const upgradesOnly = ref(false)
const page = ref(1)
const pageSize = 24
const selectedKey = ref<string | null>(null)
const removal = ref('')
const name = (code: string) => localName(cardName(code))
const key = (option: PurchaseOption) => `${option.code}:${option.replaces ?? 'new'}`
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase(locale.value)
const filtered = computed(() =>
  props.options.filter(
    (option) =>
      normalize(localName(option.name)).includes(normalize(query.value.trim())) &&
      (kind.value === 'all' || playerCardDef(option.code)?.type === kind.value) &&
      (level.value === 'all' || option.level === Number(level.value)) &&
      (!upgradesOnly.value || !!option.replaces),
  ),
)
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const visible = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize),
)
const selected = computed(() => props.options.find((option) => key(option) === selectedKey.value))
const outgoing = computed(() => selected.value?.replaces ?? removal.value)
const removals = computed(() => [...new Set(props.removable)])
const canBuy = computed(
  () =>
    !!selected.value?.implemented &&
    !props.disabled &&
    selected.value.cost <= props.xp &&
    (!selected.value.needsRemoval || props.removable.includes(removal.value)),
)
watch([query, kind, level, upgradesOnly], () => (page.value = 1))
watch(pages, (count) => (page.value = Math.min(page.value, count)))
watch(selected, (option) => {
  if (!option) dialog.value?.close()
})
watch(removals, (cards) => {
  if (!cards.includes(removal.value)) removal.value = ''
})

function choose(option: PurchaseOption) {
  selectedKey.value = key(option)
  removal.value = ''
  dialog.value?.showModal()
}
function buy() {
  if (!canBuy.value || !selected.value) return
  emit('buy', selected.value, selected.value.needsRemoval ? removal.value : undefined)
  dialog.value?.close()
}
</script>

<template>
  <section class="upgrade-shop" :aria-label="t('campaign.upgradeDeck')">
    <header class="shop-heading">
      <div>
        <h3>{{ t('campaign.shop.title') }}</h3>
        <p>{{ t('campaign.shop.help') }}</p>
      </div>
      <span class="xp-badge">{{ t('campaign.shop.availableXp', { xp }) }}</span>
    </header>
    <div class="filters">
      <label class="search">
        <span>{{ t('campaign.shop.search') }}</span>
        <input v-model="query" type="search" :placeholder="t('campaign.shop.searchPlaceholder')" />
      </label>
      <label>
        <span>{{ t('campaign.shop.type') }}</span>
        <select v-model="kind">
          <option value="all">{{ t('campaign.shop.allTypes') }}</option>
          <option v-for="type in ['asset', 'event', 'skill']" :key="type" :value="type">
            {{ t(`choice.cardType.${type}`) }}
          </option>
        </select>
      </label>
      <label>
        <span>{{ t('campaign.shop.level') }}</span>
        <select v-model="level">
          <option value="all">{{ t('campaign.shop.allLevels') }}</option>
          <option v-for="n in 6" :key="n" :value="String(n - 1)">
            {{ t('campaign.level', { n: n - 1 }) }}
          </option>
        </select>
      </label>
      <label class="check"
        ><input v-model="upgradesOnly" type="checkbox" />{{
          t('campaign.shop.upgradesOnly')
        }}</label
      >
    </div>
    <p class="result-count" role="status">
      {{ t('campaign.shop.results', { n: filtered.length }) }}
    </p>
    <p v-if="!options.length" class="empty">{{ t('campaign.nothingToBuy') }}</p>
    <p v-else-if="!filtered.length" class="empty">{{ t('campaign.shop.noResults') }}</p>
    <ul v-else class="card-grid">
      <li v-for="option in visible" :key="key(option)">
        <button type="button" class="card-option" :disabled="disabled" @click="choose(option)">
          <GameCard
            :code="option.code"
            :name="localName(option.name)"
            :width="156"
            thumbnail
            no-zoom
          />
          <strong>{{ localName(option.name) }}</strong>
          <span class="card-meta"
            >{{ t('campaign.level', { n: option.level })
            }}<b>{{ t('campaign.shop.price', { xp: option.cost }) }}</b></span
          >
          <small>{{
            option.replaces
              ? t('campaign.upgradeOf', { card: name(option.replaces) })
              : t('campaign.shop.newCard')
          }}</small>
          <span class="view-card"
            >{{ t('campaign.shop.view') }} <span aria-hidden="true">→</span></span
          >
        </button>
      </li>
    </ul>
    <nav v-if="pages > 1" class="pagination" :aria-label="t('campaign.shop.pages')">
      <button type="button" :disabled="page === 1" @click="page--">
        {{ t('campaign.shop.previous') }}
      </button>
      <span aria-live="polite">{{ t('campaign.shop.page', { page, pages }) }}</span>
      <button type="button" :disabled="page === pages" @click="page++">
        {{ t('campaign.shop.next') }}
      </button>
    </nav>
    <dialog ref="dialog" :aria-labelledby="titleId" @close="selectedKey = null">
      <template v-if="selected">
        <header class="dialog-heading">
          <h3 :id="titleId">{{ localName(selected.name) }}</h3>
          <button type="button" autofocus @click="dialog?.close()">
            {{ t('campaign.closeShop') }}
          </button>
        </header>
        <div class="purchase-detail">
          <div class="incoming">
            <p class="step-label">{{ t('campaign.shop.incoming') }}</p>
            <CardDetails
              :code="selected.code"
              :name="localName(selected.name)"
              :width="280"
              no-zoom
            />
            <p>{{ t('campaign.level', { n: selected.level }) }}</p>
          </div>
          <div class="exchange">
            <template v-if="selected.needsRemoval">
              <h4>{{ t('campaign.shop.chooseRemoval') }}</h4>
              <p>{{ t('campaign.shop.removalHelp') }}</p>
              <div class="removal-grid" role="group" :aria-label="t('campaign.shop.chooseRemoval')">
                <button
                  v-for="code in removals"
                  :key="code"
                  type="button"
                  :aria-pressed="removal === code"
                  @click="removal = code"
                >
                  <GameCard :code="code" :name="name(code)" :width="86" thumbnail no-zoom />
                  <span>{{ name(code) }}</span>
                  <small>{{ t('campaign.level', { n: playerCardDef(code)?.xp ?? 0 }) }}</small>
                </button>
              </div>
            </template>
            <template v-if="outgoing">
              <p class="step-label">{{ t('campaign.shop.outgoing') }}</p>
              <div class="outgoing">
                <CardDetails :code="outgoing" :name="name(outgoing)" :width="160" no-zoom />
                <strong>{{ name(outgoing) }}</strong>
              </div>
            </template>
            <p v-else-if="!selected.needsRemoval">{{ t('campaign.shop.noRemoval') }}</p>
          </div>
        </div>
        <footer class="purchase-footer">
          <div>
            <strong>{{ t('campaign.shop.price', { xp: selected.cost }) }}</strong
            ><span>{{ t('campaign.shop.remainingXp', { xp: xp - selected.cost }) }}</span>
          </div>
          <button type="button" :disabled="!canBuy" @click="buy">
            {{ t('campaign.buy', { xp: selected.cost }) }}
          </button>
        </footer>
      </template>
    </dialog>
  </section>
</template>

<style scoped>
.upgrade-shop {
  min-width: 0;
}
.shop-heading,
.dialog-heading,
.purchase-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
h3,
h4,
p {
  margin: 0;
}
.shop-heading p,
.exchange > p,
.incoming > p:last-child {
  color: var(--muted);
  font-size: 0.875rem;
  margin-top: 8px;
}
.xp-badge {
  flex: none;
  padding: 8px 12px;
  border: 1px solid var(--brass-dark);
  border-radius: 6px;
  color: var(--brass);
}
.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 12px;
  margin-top: 22px;
}
.filters label {
  display: grid;
  gap: 6px;
  color: var(--muted);
  font-size: 0.8125rem;
}
.filters input,
.filters select {
  min-height: 44px;
  min-width: 0;
  width: 100%;
}
.filters .search {
  flex: 1 1 180px;
}
.filters .check {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
}
.check input {
  width: 18px;
  min-height: 18px;
}
.result-count {
  margin: 18px 0 12px;
  color: var(--muted);
  font-size: 0.8125rem;
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(166px, 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.card-option {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  width: 100%;
  height: 100%;
  padding: 12px;
  text-align: left;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 9px;
  color: var(--ink);
}
.card-option :deep(.game-card) {
  align-self: center;
  max-width: 100%;
  height: auto !important;
  aspect-ratio: 5 / 7;
}
.card-option strong {
  font-family: var(--fell);
  overflow-wrap: anywhere;
}
.card-option small {
  color: var(--muted);
  font-size: 0.75rem;
}
.card-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.75rem;
  color: var(--muted);
}
.card-meta b,
.view-card {
  color: var(--brass);
}
.view-card {
  margin-top: auto;
  padding-top: 8px;
  font-size: 0.8125rem;
}
button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 3px solid var(--brass);
  outline-offset: 3px;
}
.card-option:hover,
.removal-grid button:hover {
  border-color: var(--brass);
  background: var(--site-panel-hover);
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 22px;
  font-size: 0.875rem;
}
dialog {
  width: min(850px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  padding: 24px;
  border: 1px solid var(--brass-dark);
  border-radius: 12px;
  background: var(--panel);
  color: var(--ink);
}
dialog::backdrop {
  background: rgb(0 0 0 / 75%);
}
.dialog-heading {
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border);
}
.dialog-heading h3 {
  font-family: var(--fell);
}
.purchase-detail {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 28px;
  margin: 20px 0;
}
.step-label {
  margin: 0 0 12px !important;
  color: var(--brass) !important;
  font-size: 0.8125rem;
}
.exchange {
  min-width: 0;
}
.removal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
  padding: 4px;
  margin: 12px 0 20px;
}
.removal-grid button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px 6px;
  color: var(--ink);
  background: var(--site-bg);
  border: 1px solid var(--border);
  border-radius: 7px;
  font-size: 0.75rem;
}
.removal-grid button[aria-pressed='true'] {
  border: 2px solid var(--brass);
  background: var(--site-panel-hover);
}
.removal-grid small {
  color: var(--muted);
}
.outgoing {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.outgoing strong {
  flex: 1;
  font-family: var(--fell);
}
.purchase-footer {
  padding-top: 18px;
  border-top: 1px solid var(--border);
}
.purchase-footer > div {
  display: grid;
  gap: 4px;
}
.purchase-footer span {
  font-size: 0.8125rem;
  color: var(--muted);
}
.purchase-footer button {
  min-height: 44px;
  border-color: var(--brass);
}
.empty {
  color: var(--muted);
  padding: 20px 0;
}
@media (max-width: 600px) {
  .shop-heading {
    align-items: flex-start;
    flex-direction: column;
  }
  .card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .card-option {
    padding: 8px;
  }
  .filters > label:not(.search) {
    flex: 1 1 100px;
  }
  dialog {
    padding: 16px;
  }
  .purchase-detail {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
  }
  .incoming {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .incoming :deep(.game-card) {
    max-width: 100%;
    height: auto !important;
    aspect-ratio: 5 / 7;
  }
  .purchase-footer {
    flex-wrap: wrap;
  }
  .purchase-footer button {
    width: 100%;
  }
}
</style>
