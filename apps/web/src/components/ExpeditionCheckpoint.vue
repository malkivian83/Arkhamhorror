<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { StoryEntry } from '@lcg/engine'
import type { DisappearanceDecision } from '@lcg/cards'
import { cardName } from '../game/cards'
import { localName } from '../game/localized'
import { storyNarration } from '../game/narration'
import StoryNarration from './StoryNarration.vue'
import SiteAction from './SiteAction.vue'

const props = defineProps<{
  story: Pick<StoryEntry, 'title' | 'body'>
  missing?: string[] | undefined
  choices?: DisappearanceDecision[] | undefined
  disabled?: boolean
}>()
const emit = defineEmits<{ decide: [decision: DisappearanceDecision] }>()
const { t, locale } = useI18n()
const narration = computed(() => storyNarration(props.story.body, locale.value))
const names = computed(() => props.missing?.map((code) => localName(cardName(code))).join(', '))
</script>

<template>
  <section>
    <h2>{{ t(story.title) }}</h2>
    <StoryNarration v-if="narration" :key="narration" :src="narration" />
    <p>{{ t(story.body) }}</p>
    <template v-if="missing">
      <p v-if="names">{{ t('choice.edgeOfTheEarth.missing', { names }) }}</p>
      <p v-else>{{ t('choice.edgeOfTheEarth.allSafe') }}</p>
    </template>
    <div v-if="choices?.length" class="checkpoint-actions">
      <SiteAction
        v-for="decision in choices"
        :key="decision"
        icon="→"
        :disabled="!!disabled"
        @click="emit('decide', decision)"
      >
        {{ t(missing?.length ? 'choice.edgeOfTheEarth.' + decision : 'choice.continue') }}
      </SiteAction>
    </div>
  </section>
</template>

<style scoped>
.checkpoint-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}
</style>
