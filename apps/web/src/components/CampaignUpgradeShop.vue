<script setup lang="ts">
import type { PurchaseOption } from '@lcg/cards'
import { playerCardDef } from '@lcg/engine'
import { computed, nextTick, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardName } from '../game/cards'
import { localName } from '../game/localized'
import GameCard from './GameCard.vue'
import UpgradeCardInfo from './UpgradeCardInfo.vue'
import UpgradeExchange from './UpgradeExchange.vue'

/**
 * Gasto de experiencia: una lista legible de cartas que pueden entrar y un
 * diálogo que compara, con su texto completo, la carta que sale y la que entra.
 */
const props = defineProps<{
  options: PurchaseOption[]
  removable: string[]
  xp: number
  disabled: boolean
  /** Mazo actual, para indicar cuántas copias hay de cada carta. */
  deck?: string[]
}>()
const emit = defineEmits<{ buy: [option: PurchaseOption, remove?: string] }>()
const { t, locale } = useI18n()
const uid = useId()
const dialog = ref<HTMLDialogElement>()
const heading = ref<HTMLElement>()
const list = ref<HTMLElement>()
const query = ref('')
const show = ref<'all' | 'upgrades' | 'new'>('all')
const kind = ref('all')
const level = ref('all')
const pageSize = 20
const shown = ref(pageSize)
const selectedKey = ref<string | null>(null)
const announcement = ref('')
const pending = ref<{ incoming: string; outgoing?: string } | null>(null)
const name = (code: string) => localName(cardName(code))
const levelOf = (code: string) => playerCardDef(code)?.xp ?? 0
const copies = (code: string) => props.deck?.filter((c) => c === code).length ?? 0
const key = (option: PurchaseOption) => `${option.code}:${option.replaces ?? 'new'}`
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase(locale.value)
/** Las mejoras de cartas propias van primero: suelen ser la compra más buscada. */
const sorted = computed(() =>
  [...props.options].sort((a, b) => Number(!!b.replaces) - Number(!!a.replaces)),
)
const upgradeCount = computed(() => props.options.filter((o) => o.replaces).length)
const filtered = computed(() =>
  sorted.value.filter(
    (option) =>
      normalize(localName(option.name)).includes(normalize(query.value.trim())) &&
      (show.value === 'all' || (show.value === 'upgrades') === !!option.replaces) &&
      (kind.value === 'all' || playerCardDef(option.code)?.type === kind.value) &&
      (level.value === 'all' || option.level === Number(level.value)),
  ),
)
const visible = computed(() => filtered.value.slice(0, shown.value))
const remaining = computed(() => filtered.value.length - visible.value.length)
const selected = computed(() => props.options.find((option) => key(option) === selectedKey.value))
watch([query, show, kind, level], () => (shown.value = pageSize))
watch(selected, (option) => {
  if (!option) dialog.value?.close()
})
// La compra se anuncia cuando el mazo o la experiencia cambian de verdad.
watch([() => props.xp, () => props.deck], () => {
  if (!pending.value) return
  const { incoming, outgoing } = pending.value
  announcement.value = outgoing
    ? t('campaign.shop.doneSwap', { incoming, outgoing })
    : t('campaign.shop.done', { incoming })
  pending.value = null
})

function choose(option: PurchaseOption) {
  selectedKey.value = key(option)
  announcement.value = ''
  dialog.value?.showModal()
}
async function showMore() {
  const first = shown.value
  shown.value += pageSize
  await nextTick()
  list.value?.querySelectorAll<HTMLButtonElement>('.choose')[first]?.focus()
}
function buy(option: PurchaseOption, remove?: string) {
  const out = option.replaces ?? remove
  pending.value = { incoming: localName(option.name), ...(out ? { outgoing: name(out) } : {}) }
  emit('buy', option, remove)
  dialog.value?.close()
  // La fila elegida puede desaparecer de la lista: el foco vuelve al encabezado.
  heading.value?.focus()
}
</script>

<template>
  <section class="upgrade-shop" :aria-labelledby="`${uid}-title`">
    <header class="shop-heading">
      <div>
        <h3 :id="`${uid}-title`" ref="heading" tabindex="-1">{{ t('campaign.shop.title') }}</h3>
        <p>{{ t('campaign.shop.help') }}</p>
      </div>
      <span class="xp-badge">{{ t('campaign.shop.availableXp', { xp }) }}</span>
    </header>
    <p class="announcement" role="status">{{ announcement }}</p>

    <div class="filters">
      <label class="search">
        <span>{{ t('campaign.shop.search') }}</span>
        <input v-model="query" type="search" :placeholder="t('campaign.shop.searchPlaceholder')" />
      </label>
      <fieldset class="segmented">
        <legend>{{ t('campaign.shop.show') }}</legend>
        <label v-for="value in ['all', 'upgrades', 'new'] as const" :key="value">
          <input v-model="show" class="visually-hidden" type="radio" :value="value" />
          <span>{{
            value === 'all'
              ? t('campaign.shop.allCards', { n: options.length })
              : value === 'upgrades'
                ? t('campaign.shop.upgradesOnly', { n: upgradeCount })
                : t('campaign.shop.newOnly', { n: options.length - upgradeCount })
          }}</span>
        </label>
      </fieldset>
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
    </div>
    <p class="result-count" role="status">
      {{ t('campaign.shop.results', { n: filtered.length }) }}
    </p>
    <p v-if="!options.length" class="empty">{{ t('campaign.nothingToBuy') }}</p>
    <p v-else-if="!filtered.length" class="empty">{{ t('campaign.shop.noResults') }}</p>
    <ul v-else ref="list" class="option-list">
      <li v-for="(option, n) in visible" :key="key(option)">
        <article class="card-option" :aria-labelledby="`${uid}-option-${n}`">
          <GameCard
            class="thumb"
            :code="option.code"
            :name="localName(option.name)"
            :width="76"
            thumbnail
            no-zoom
          />
          <div class="option-body">
            <div class="option-head">
              <h4 :id="`${uid}-option-${n}`">{{ localName(option.name) }}</h4>
              <span class="price">{{ t('campaign.shop.price', { xp: option.cost }) }}</span>
            </div>
            <p class="tag" :class="option.replaces ? 'upgrade' : 'new'">
              <template v-if="option.replaces">
                <span aria-hidden="true">↑</span>
                {{
                  t('campaign.shop.upgradeFrom', {
                    card: name(option.replaces),
                    from: levelOf(option.replaces),
                    to: option.level,
                  })
                }}
              </template>
              <template v-else>
                <span aria-hidden="true">+</span> {{ t('campaign.shop.newCard') }}
                <template v-if="copies(option.code)">
                  · {{ t('campaign.shop.owned', { n: copies(option.code) }) }}</template
                >
              </template>
            </p>
            <UpgradeCardInfo :code="option.code" compact />
            <button
              type="button"
              class="choose"
              :disabled="disabled"
              :aria-describedby="`${uid}-option-${n}`"
              @click="choose(option)"
            >
              {{ t('campaign.shop.review') }} <span aria-hidden="true">→</span>
            </button>
          </div>
        </article>
      </li>
    </ul>
    <div v-if="remaining > 0" class="more">
      <span>{{
        t('campaign.shop.showing', { shown: visible.length, total: filtered.length })
      }}</span>
      <button type="button" @click="showMore">
        {{ t('campaign.shop.showMore', { n: Math.min(pageSize, remaining) }) }}
      </button>
    </div>

    <dialog ref="dialog" :aria-label="t('campaign.shop.dialogTitle')" @close="selectedKey = null">
      <UpgradeExchange
        v-if="selected"
        :key="selectedKey ?? ''"
        :option="selected"
        :removable="removable"
        :xp="xp"
        :disabled="disabled"
        :deck="deck"
        @buy="buy"
        @close="dialog?.close()"
      />
    </dialog>
  </section>
</template>

<style scoped>
.upgrade-shop {
  min-width: 0;
}
.shop-heading {
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
h3 {
  font-family: var(--fell);
}
.shop-heading p {
  color: var(--muted);
  font-size: 0.875rem;
  margin-top: 6px;
}
.xp-badge {
  flex: none;
  padding: 8px 12px;
  border: 1px solid var(--brass-dark);
  border-radius: 6px;
  color: var(--brass);
  font-weight: 700;
}
.announcement:not(:empty) {
  margin-top: 14px;
  padding: 10px 12px;
  border-left: 3px solid var(--brass);
  background: var(--site-panel-raised);
}
.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 12px;
  margin-top: 20px;
}
.filters label,
.segmented legend {
  color: var(--muted);
  font-size: 0.8125rem;
}
.filters > label {
  display: grid;
  gap: 6px;
  flex: 1 1 130px;
}
.filters input[type='search'],
.filters select {
  min-height: 44px;
  min-width: 0;
  width: 100%;
}
.filters .search,
.segmented {
  flex: 1 1 100%;
}
.segmented {
  display: flex;
  flex-wrap: wrap;
  margin: 0;
  padding: 0;
  border: 0;
}
.segmented legend {
  padding: 0;
  margin-bottom: 6px;
}
.segmented label {
  display: flex;
  flex: 1 1 auto;
  cursor: pointer;
}
.segmented label span {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 44px;
  padding: 6px 14px;
  border: 1px solid var(--border);
  color: var(--site-ink);
  background: var(--site-control);
  text-align: center;
}
.segmented label:first-of-type span {
  border-radius: 6px 0 0 6px;
}
.segmented label:last-of-type span {
  border-radius: 0 6px 6px 0;
}
.segmented label + label span {
  border-left: 0;
}
.segmented label:hover span {
  background: var(--site-panel-hover);
}
.segmented input:checked + span {
  background: var(--site-accent);
  border-color: var(--site-accent);
  color: var(--site-on-accent);
  font-weight: 700;
}
.segmented input:focus-visible + span {
  position: relative;
  outline: 3px solid var(--brass);
  outline-offset: 2px;
}
.result-count {
  margin: 16px 0 10px;
  color: var(--muted);
  font-size: 0.8125rem;
}
.option-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.card-option {
  position: relative;
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 14px;
  padding: 12px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 9px;
  color: var(--ink);
}
.card-option:hover,
.card-option:focus-within {
  border-color: var(--brass);
  background: var(--site-panel-hover);
}
.card-option .thumb {
  align-self: start;
}
.option-body {
  display: grid;
  gap: 6px;
  min-width: 0;
}
.option-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}
.option-head h4 {
  font-family: var(--fell);
  font-size: 1.05rem;
  overflow-wrap: anywhere;
}
.price {
  flex: none;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--site-panel-raised);
  border: 1px solid var(--brass-dark);
  color: var(--brass);
  font-weight: 700;
  font-size: 0.875rem;
}
.tag {
  font-size: 0.8125rem;
  font-weight: 600;
}
.tag.upgrade {
  color: var(--site-accent);
}
.tag.new {
  color: var(--site-ink-soft);
}
.choose {
  justify-self: start;
  min-height: 44px;
  margin-top: 4px;
}
/* Toda la fila responde al clic; el botón sigue siendo el único control enfocable. */
.choose::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 9px;
}
.choose:disabled::after {
  cursor: not-allowed;
}
.more {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px 16px;
  margin-top: 18px;
  color: var(--muted);
  font-size: 0.875rem;
}
.more button {
  min-height: 44px;
}
button:focus-visible,
input:focus-visible,
select:focus-visible,
h3:focus-visible {
  outline: 3px solid var(--brass);
  outline-offset: 3px;
}
dialog {
  width: min(980px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  padding: 0;
  border: 1px solid var(--brass-dark);
  border-radius: 12px;
  background: var(--panel);
  color: var(--ink);
}
dialog[open] {
  display: flex;
  flex-direction: column;
}
dialog::backdrop {
  background: rgb(0 0 0 / 75%);
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
  .card-option {
    grid-template-columns: 56px minmax(0, 1fr);
    gap: 10px;
    padding: 10px;
  }
  .card-option .thumb {
    width: 56px !important;
    height: auto !important;
    aspect-ratio: 5 / 7;
  }
}
@media (prefers-reduced-motion: no-preference) {
  .card-option {
    transition:
      border-color 0.15s,
      background-color 0.15s;
  }
}
</style>
