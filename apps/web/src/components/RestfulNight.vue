<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RestfulNightChoice } from '@lcg/cards'
import type { OnlineRestfulNight } from '@lcg/shared'
import { cardName } from '../game/cards'
import { localizedCards, localName } from '../game/localized'
import ExpeditionCheckpoint from './ExpeditionCheckpoint.vue'
import SiteAction from './SiteAction.vue'

const props = defineProps<{
  interlude: OnlineRestfulNight
  ownedWeaknesses: Record<string, string[]>
  readOnly?: boolean
  disabled?: boolean
}>()
const emit = defineEmits<{
  visit: [choice: RestfulNightChoice]
  finish: [route: 'mirage' | 'peaks']
}>()
const { t } = useI18n()
const partner = ref<RestfulNightChoice['partner']>()
const option = computed(() =>
  props.interlude.options.find((visit) => visit.partner === partner.value),
)
const targetIndex = ref<number | undefined>()
const target = computed(() =>
  targetIndex.value === undefined ? undefined : option.value?.targets[targetIndex.value],
)
const selected = ref<number[]>([])
const weaknesses = computed(() =>
  target.value ? (props.ownedWeaknesses[target.value.id] ?? []) : [],
)
const name = (code: string) => localizedCards.value.get(code)?.name ?? localName(cardName(code))
const canVisit = computed(
  () =>
    !!option.value &&
    (!option.value.targets.length || !!target.value) &&
    (option.value.effect !== 'removeWeaknesses' || selected.value.length > 0),
)
watch(partner, () => {
  targetIndex.value = undefined
})
watch([partner, targetIndex], () => {
  selected.value = []
})

function confirm() {
  if (!option.value || !canVisit.value) return
  emit('visit', {
    partner: option.value.partner,
    ...(target.value ? { target: target.value } : {}),
    ...(option.value.effect === 'removeWeaknesses'
      ? { weaknesses: selected.value.map((index) => weaknesses.value[index]!) }
      : {}),
  })
  partner.value = undefined
}
const story = computed(() => {
  const part = props.interlude.canContinue
    ? props.interlude.offersMirage
      ? 'restfulNightDoor'
      : 'restfulNightDawn'
    : 'restfulNight'
  return { title: `story.edgeOfTheEarth.${part}.title`, body: `story.edgeOfTheEarth.${part}.body` }
})
</script>

<template>
  <section class="night">
    <ExpeditionCheckpoint :story="story" />
    <p v-if="!interlude.canContinue">
      {{ t('prompt.edgeOfTheEarth.nightVisits', { remaining: interlude.remaining }) }}
    </p>
    <template v-if="!readOnly && !interlude.canContinue">
      <select v-model="partner" :aria-label="t('prompt.edgeOfTheEarth.nightPartner')">
        <option :value="undefined" disabled>{{ t('prompt.edgeOfTheEarth.nightPartner') }}</option>
        <option v-for="visit in interlude.options" :key="visit.partner" :value="visit.partner">
          {{ name(visit.partner) }}
        </option>
      </select>
      <template v-if="option">
        <p>
          {{
            t(`choice.edgeOfTheEarth.night.${option.effect}`, {
              card: option.card ? name(option.card) : '',
            })
          }}
        </p>
        <select
          v-if="option.targets.length"
          v-model="targetIndex"
          :aria-label="t('prompt.edgeOfTheEarth.nightTarget')"
        >
          <option :value="undefined" disabled>{{ t('prompt.edgeOfTheEarth.nightTarget') }}</option>
          <option v-for="(item, index) in option.targets" :key="item.type + item.id" :value="index">
            {{ name(item.id) }}
          </option>
        </select>
        <fieldset v-if="option.effect === 'removeWeaknesses' && target">
          <legend>{{ t('prompt.edgeOfTheEarth.nightWeaknesses') }}</legend>
          <label v-for="(code, index) in weaknesses" :key="index">
            <input
              v-model="selected"
              type="checkbox"
              :value="index"
              :disabled="selected.length >= 5 && !selected.includes(index)"
            />
            {{ name(code) }}
          </label>
        </fieldset>
        <SiteAction icon="✓" :disabled="disabled || !canVisit" @click="confirm">{{
          t('choice.edgeOfTheEarth.nightConfirm')
        }}</SiteAction>
      </template>
    </template>
    <div v-else-if="!readOnly && interlude.canContinue" class="night-actions">
      <SiteAction
        v-if="interlude.offersMirage"
        icon="→"
        :disabled="disabled"
        @click="emit('finish', 'mirage')"
        >{{ t('choice.edgeOfTheEarth.nightMirage') }}</SiteAction
      >
      <SiteAction icon="→" :disabled="disabled" @click="emit('finish', 'peaks')">{{
        t('choice.edgeOfTheEarth.nightPeaks')
      }}</SiteAction>
    </div>
  </section>
</template>

<style scoped>
.night {
  display: grid;
  gap: 0.65rem;
}
.night-actions,
fieldset {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}
</style>
