<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { customizationCost, playerCardDef } from '@lcg/engine'
import { useI18n } from 'vue-i18n'
import { localName } from '../game/localized'
import UpgradeCardInfo from './UpgradeCardInfo.vue'
const props = defineProps<{
  code: string
  sheet?: Record<string, number> | undefined
  draft?: boolean
  disabled?: boolean
  copies: number
  removable?: string[]
  xp?: number
  /** Mazo completo: cada copia nueva exige quitar otra carta. */
  full?: boolean
}>()
const emit = defineEmits<{
  save: [sheet: Record<string, number>, options: { copies: number; remove: string[] }]
}>()
const { t } = useI18n()
const uid = useId()
const selectedSheet = ref<Record<string, number>>({})
const addedCopies = ref(0)
const removal = ref<string[]>([])
watch(
  () => [props.code, props.sheet, props.copies],
  () => {
    selectedSheet.value = {
      ...Object.fromEntries(
        Object.keys(playerCardDef(props.code)?.customizable ?? {}).map((k) => [k, 0]),
      ),
      ...props.sheet,
    }
    addedCopies.value = props.copies ? 0 : 1
    removal.value = []
  },
  { immediate: true },
)
const def = computed(() => playerCardDef(props.code))
const total = computed(() => customizationCost(selectedSheet.value))
const cost = computed(() => total.value - customizationCost(props.sheet))
const chosenRemovals = computed(() => removal.value.slice(0, addedCopies.value).filter(Boolean))
/** Primer motivo que impide pagar, explicado junto al botón. */
const blocker = computed(() => {
  if (total.value > 10) return t('customization.invalid')
  if (props.draft) return ''
  if (cost.value <= 0) return t('customization.markBox')
  if (cost.value > (props.xp ?? 0)) return t('customization.experience')
  if (props.full && chosenRemovals.value.length < addedCopies.value)
    return t('customization.needRemoval')
  return ''
})
</script>

<template>
  <fieldset class="customization-sheet" :disabled="disabled">
    <legend>{{ localName(def?.name ?? code) }} · {{ t('customization.title') }}</legend>
    <p>{{ t('customization.total', { xp: total, level: Math.ceil(total / 2) }) }}</p>
    <p v-if="!draft" class="owned">
      {{ copies ? t('customization.owned', { n: copies }) : t('customization.notOwned') }}
    </p>
    <label v-for="(max, option) in def?.customizable" :key="option">
      <span
        >{{ t(`customization.${option}`)
        }}<small>{{ t(`customization.description.${option}`) }}</small></span
      >
      <select v-model.number="selectedSheet[option]" :aria-label="t(`customization.${option}`)">
        <option
          v-for="n in max + 1"
          :key="n"
          :value="n - 1"
          :disabled="!draft && n - 1 < (props.sheet?.[option] ?? 0)"
        >
          {{ n - 1 }} / {{ max }}
        </option>
      </select>
    </label>
    <template v-if="!draft && props.copies < 2">
      <label
        >{{ t('customization.addCopies') }}
        <select v-model.number="addedCopies">
          <option
            v-for="n in 3 - props.copies"
            :key="n"
            :value="n - 1"
            :disabled="props.copies === 0 && n === 1"
          >
            {{ n - 1 }}
          </option>
        </select>
      </label>
      <div v-for="n in addedCopies" :key="n" class="removal">
        <label
          >{{ t('campaign.remove') }}
          <select v-model="removal[n - 1]" :required="full">
            <option value="" :disabled="full">
              {{ full ? t('customization.chooseRemoval') : t('customization.noRemoval') }}
            </option>
            <option v-for="removableCode in removable" :key="removableCode" :value="removableCode">
              {{ localName(playerCardDef(removableCode)?.name ?? removableCode) }}
            </option>
          </select>
        </label>
        <UpgradeCardInfo v-if="removal[n - 1]" :code="removal[n - 1]!" compact />
      </div>
    </template>
    <p v-if="blocker" :id="`${uid}-blocker`" class="blocker">{{ blocker }}</p>
    <button
      type="button"
      :aria-disabled="!!blocker"
      :aria-describedby="blocker ? `${uid}-blocker` : undefined"
      @click="
        !blocker &&
        emit('save', Object.fromEntries(Object.entries(selectedSheet).filter(([, n]) => n > 0)), {
          copies: draft ? 0 : addedCopies,
          remove: chosenRemovals,
        })
      "
    >
      {{
        draft
          ? t('customization.save')
          : addedCopies
            ? t('campaign.buy', { xp: cost })
            : t('customization.pay', { xp: cost })
      }}
    </button>
  </fieldset>
</template>

<style scoped>
.customization-sheet {
  margin-block: 1rem;
  padding: 1rem;
  border: 1px solid var(--border, #777);
  border-radius: 0.5rem;
}
label {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  margin-block: 0.7rem;
}
small {
  display: block;
  max-width: 38rem;
  opacity: 0.8;
}
select {
  min-width: 5rem;
  min-height: 44px;
}
.owned {
  margin-block: 0.4rem 0.8rem;
  font-weight: 700;
}
.removal :deep(.card-info) {
  margin-bottom: 0.7rem;
}
.blocker {
  color: var(--site-accent, #e5aa8d);
}
button {
  min-height: 44px;
}
button[aria-disabled='true'] {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
