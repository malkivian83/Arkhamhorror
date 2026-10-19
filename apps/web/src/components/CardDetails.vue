<script setup lang="ts">
import { ref } from 'vue'
import CardTranslation from './CardTranslation.vue'
import GameCard from './GameCard.vue'

defineOptions({ inheritAttrs: false })
defineProps<{ code: string; name: string; back?: boolean }>()
const language = ref('unknown')
</script>

<template>
  <GameCard
    v-bind="$attrs"
    :code="code"
    :name="name"
    :back="back"
    @image-language="language = $event"
  />
  <CardTranslation :code="code" :back="back" :image-language="language" />
</template>
