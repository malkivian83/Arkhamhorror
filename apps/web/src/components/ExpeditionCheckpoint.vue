<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { StoryEntry } from '@lcg/engine'
import type { AttackDecision, DisappearanceDecision } from '@lcg/cards'
import { cardName } from '../game/cards'
import { localName } from '../game/localized'
import { storyNarration } from '../game/narration'
import StoryNarration from './StoryNarration.vue'
import SiteAction from './SiteAction.vue'

const props = defineProps<{
  story: Pick<StoryEntry, 'title' | 'body'>
  missing?: string[] | undefined
  choices?: (AttackDecision | DisappearanceDecision)[] | undefined
  disabled?: boolean
}>()
const emit = defineEmits<{ decide: [decision: AttackDecision | DisappearanceDecision] }>()
const { t, locale } = useI18n()
const narration = computed(() => storyNarration(props.story.body, locale.value))
const paragraphs = computed(() => t(props.story.body).split('\n\n'))
const names = computed(() => props.missing?.map((code) => localName(cardName(code))).join(', '))
</script>

<template>
  <section>
    <h2>{{ t(story.title) }}</h2>
    <StoryNarration v-if="narration" :key="narration" :src="narration" />
    <p v-for="(paragraph, index) in paragraphs" :key="index">{{ paragraph }}</p>
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
        {{ t(missing?.length === 0 ? 'choice.continue' : 'choice.edgeOfTheEarth.' + decision) }}
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
