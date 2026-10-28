<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { customizationCost, playerCardDef } from '@lcg/engine'
import { useI18n } from 'vue-i18n'
import { localName } from '../game/localized'
const props = defineProps<{
  code: string
  sheet?: Record<string, number> | undefined
  draft?: boolean
  disabled?: boolean
  copies: number
  removable?: string[]
  xp?: number
}>()
const emit = defineEmits<{
  save: [sheet: Record<string, number>, options: { copies: number; remove: string[] }]
}>()
const { t } = useI18n()
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
const valid = computed(
  () => total.value <= 10 && (props.draft || (cost.value > 0 && cost.value <= (props.xp ?? 0))),
)
</script>

<template>
  <fieldset class="customization-sheet" :disabled="disabled">
    <legend>{{ localName(def?.name ?? code) }} · {{ t('customization.title') }}</legend>
    <p>{{ t('customization.total', { xp: total, level: Math.ceil(total / 2) }) }}</p>
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
      <label v-for="n in addedCopies" :key="n"
        >{{ t('campaign.remove') }}
        <select v-model="removal[n - 1]">
          <option value="">{{ t('customization.noRemoval') }}</option>
          <option v-for="removableCode in removable" :key="removableCode" :value="removableCode">
            {{ localName(playerCardDef(removableCode)?.name ?? removableCode) }}
          </option>
        </select>
      </label>
    </template>
    <button
      type="button"
      :disabled="!valid"
      @click="
        emit('save', Object.fromEntries(Object.entries(selectedSheet).filter(([, n]) => n > 0)), {
          copies: draft ? 0 : addedCopies,
          remove: removal.filter(Boolean),
        })
      "
    >
      {{ draft ? t('customization.save') : t('campaign.buy', { xp: cost }) }}
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
}
</style>
