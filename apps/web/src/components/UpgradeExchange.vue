<script setup lang="ts">
import type { PurchaseOption } from '@lcg/cards'
import { computed, nextTick, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardName } from '../game/cards'
import { localName } from '../game/localized'
import GameCard from './GameCard.vue'
import UpgradeCardInfo from './UpgradeCardInfo.vue'

/** Comparación de la carta que sale y la que entra, con su texto completo, antes de pagar. */
const props = defineProps<{
  option: PurchaseOption
  removable: string[]
  xp: number
  disabled: boolean
  deck?: string[] | undefined
}>()
const emit = defineEmits<{ buy: [option: PurchaseOption, remove?: string]; close: [] }>()
const { t, locale } = useI18n()
const uid = useId()
const removalList = ref<HTMLElement>()
const removal = ref('')
const name = (code: string) => localName(cardName(code))
const copies = (code: string) => props.deck?.filter((c) => c === code).length ?? 0
/** Una mejora sustituye su versión inferior; solo una carta nueva en un mazo lleno pide elegir. */
const choosesRemoval = computed(() => !props.option.replaces && props.option.needsRemoval)
const outgoing = computed(() => props.option.replaces ?? removal.value)
const removals = computed(() =>
  [...new Set(props.removable)].sort((a, b) => name(a).localeCompare(name(b), locale.value)),
)
const blocker = computed(() => {
  if (props.disabled) return t('customization.unavailable')
  if (!props.option.implemented) return t('campaign.notImplemented')
  if (choosesRemoval.value && !props.removable.includes(removal.value))
    return t('campaign.shop.needRemoval')
  return ''
})
const canBuy = computed(() => !blocker.value && props.option.cost <= props.xp)
watch(removals, (cards) => {
  if (!cards.includes(removal.value)) removal.value = ''
})

async function changeRemoval() {
  removal.value = ''
  await nextTick()
  removalList.value?.querySelector<HTMLInputElement>('input')?.focus()
}
function buy() {
  if (canBuy.value) emit('buy', props.option, choosesRemoval.value ? removal.value : undefined)
}
</script>

<template>
  <header class="dialog-heading">
    <h3 :id="`${uid}-title`">{{ t('campaign.shop.dialogTitle') }}</h3>
    <button type="button" @click="emit('close')">{{ t('campaign.closeShop') }}</button>
  </header>
  <div class="compare">
    <section class="side outgoing" :aria-labelledby="`${uid}-out`">
      <h4 :id="`${uid}-out`" class="side-label">
        <span aria-hidden="true">−</span> {{ t('campaign.shop.outgoing') }}
      </h4>
      <template v-if="outgoing">
        <div class="card-face">
          <GameCard :code="outgoing" :name="name(outgoing)" :width="150" no-zoom />
          <div class="face-text">
            <h5>{{ name(outgoing) }}</h5>
            <UpgradeCardInfo :code="outgoing" />
          </div>
        </div>
        <button v-if="choosesRemoval" type="button" @click="changeRemoval">
          {{ t('campaign.shop.changeRemoval') }}
        </button>
      </template>
      <fieldset v-else-if="choosesRemoval" ref="removalList" class="removal-list">
        <legend>{{ t('campaign.shop.chooseRemoval') }}</legend>
        <p>{{ t('campaign.shop.removalHelp') }}</p>
        <label v-for="code in removals" :key="code" class="removal-option">
          <input v-model="removal" type="radio" :name="`${uid}-removal`" :value="code" />
          <span class="removal-body">
            <span class="removal-head">
              <strong>{{ name(code) }}</strong>
              <small>{{ t('campaign.shop.inDeck', { n: copies(code) || 1 }) }}</small>
            </span>
            <UpgradeCardInfo :code="code" compact />
          </span>
        </label>
      </fieldset>
      <p v-else class="no-removal">{{ t('campaign.shop.noRemoval') }}</p>
    </section>
    <span class="arrow" aria-hidden="true">→</span>
    <section class="side incoming" :aria-labelledby="`${uid}-in`">
      <h4 :id="`${uid}-in`" class="side-label">
        <span aria-hidden="true">+</span> {{ t('campaign.shop.incoming') }}
      </h4>
      <div class="card-face">
        <GameCard :code="option.code" :name="localName(option.name)" :width="150" no-zoom />
        <div class="face-text">
          <h5>{{ localName(option.name) }}</h5>
          <UpgradeCardInfo :code="option.code" />
        </div>
      </div>
    </section>
  </div>
  <footer class="purchase-footer">
    <dl>
      <div>
        <dt>{{ t('campaign.shop.experience') }}</dt>
        <dd>{{ t('campaign.shop.price', { xp: option.cost }) }}</dd>
      </div>
      <div>
        <dt>{{ t('campaign.shop.after') }}</dt>
        <dd>{{ t('campaign.shop.price', { xp: xp - option.cost }) }}</dd>
      </div>
    </dl>
    <p v-if="blocker" :id="`${uid}-blocker`" class="blocker">{{ blocker }}</p>
    <button
      type="button"
      class="confirm"
      :aria-disabled="!canBuy"
      :aria-describedby="blocker ? `${uid}-blocker` : undefined"
      @click="buy"
    >
      {{ t('campaign.buy', { xp: option.cost }) }}
    </button>
  </footer>
</template>

<style scoped>
h3,
h4,
h5,
p {
  margin: 0;
}
h3,
h5 {
  font-family: var(--fell);
}
.dialog-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--border);
}
button {
  min-height: 44px;
}
button:focus-visible,
input:focus-visible {
  outline: 3px solid var(--brass);
  outline-offset: 3px;
}
.compare {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 16px;
  min-height: 0;
  padding: 20px 24px;
  overflow-y: auto;
}
.arrow {
  align-self: center;
  font-size: 1.75rem;
  color: var(--brass);
}
.side {
  display: grid;
  align-content: start;
  gap: 12px;
  min-width: 0;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--site-panel-sunken);
}
.side-label {
  justify-self: start;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.8125rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.outgoing .side-label {
  color: var(--site-error-ink);
  background: var(--site-error-bg);
  border: 1px solid var(--site-error-border);
}
.incoming .side-label {
  color: #c4ebb8;
  background: #23352a;
  border: 1px solid #7fb98a;
}
.card-face {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}
.card-face > :deep(.game-card) {
  flex: none;
}
.face-text {
  display: grid;
  align-content: start;
  gap: 8px;
  flex: 1 1 200px;
  min-width: 0;
}
.face-text h5 {
  font-size: 1.1rem;
}
.side > button {
  justify-self: start;
}
.removal-list {
  display: grid;
  gap: 8px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}
.removal-list legend {
  padding: 0;
  font-weight: 700;
  font-size: 1rem;
}
.removal-list > p,
.no-removal {
  color: var(--muted);
  font-size: 0.875rem;
}
.removal-option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--panel);
  cursor: pointer;
}
.removal-option:hover,
.removal-option:has(input:focus-visible) {
  border-color: var(--brass);
  background: var(--site-panel-hover);
}
.removal-option input {
  width: 20px;
  height: 20px;
  margin: 2px 0 0;
  accent-color: var(--site-accent);
}
.removal-body {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.removal-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.removal-head strong {
  font-family: var(--fell);
}
.removal-head small {
  flex: none;
  color: var(--muted);
}
.purchase-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 24px;
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  background: var(--site-panel-raised);
}
.purchase-footer dl {
  display: flex;
  gap: 24px;
  margin: 0;
}
.purchase-footer dt {
  color: var(--muted);
  font-size: 0.8125rem;
}
.purchase-footer dd {
  margin: 0;
  font-weight: 700;
  font-size: 1.05rem;
}
.blocker {
  flex: 1 1 200px;
  color: var(--site-accent);
  font-size: 0.9375rem;
}
.confirm {
  margin-left: auto;
  min-height: 48px;
  padding-inline: 22px;
  border-color: var(--brass);
  font-weight: 700;
}
.confirm[aria-disabled='true'] {
  opacity: 0.6;
  cursor: not-allowed;
}
@media (max-width: 760px) {
  .compare {
    grid-template-columns: minmax(0, 1fr);
    padding: 16px;
  }
  .arrow {
    justify-self: center;
    transform: rotate(90deg);
  }
  .dialog-heading,
  .purchase-footer {
    padding-inline: 16px;
  }
}
@media (max-width: 600px) {
  .card-face > :deep(.game-card) {
    width: 110px !important;
    height: auto !important;
    aspect-ratio: 5 / 7;
  }
  .confirm {
    width: 100%;
  }
}
@media (prefers-reduced-motion: no-preference) {
  .removal-option {
    transition:
      border-color 0.15s,
      background-color 0.15s;
  }
}
</style>
