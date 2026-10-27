<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardNarration } from '../game/cardNarration'
import StoryNarration from './StoryNarration.vue'

const props = defineProps<{ code: string; back?: boolean }>()
const { locale } = useI18n()
const src = computed(() => cardNarration(props.code, !!props.back, locale.value))
</script>

<template>
  <StoryNarration v-if="src" :key="src" :src="src" />
</template>
