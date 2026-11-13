<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { heartSeals } from '@lcg/cards'
import type { GameState } from '@lcg/engine'
const props = defineProps<{ state: GameState; holder: string }>()
const { t } = useI18n()
const tokens = computed(() =>
  heartSeals(props.state).filter((token) => token.holder === props.holder),
)
</script>

<template>
  <span v-if="tokens.length" class="heart-seals">
    <span
      v-for="token in tokens"
      :key="token.seal"
      class="heart-seal"
      :class="{ active: token.active }"
      :title="
        t(`choice.edgeOfTheEarth.${token.active ? 'heartSealActive' : 'heartSealDormant'}`, {
          seal: token.seal.toUpperCase(),
        })
      "
    >
      {{ token.seal.toUpperCase() }}{{ token.active ? ' ✦' : '' }}
    </span>
  </span>
</template>

<style scoped>
.heart-seals {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 3px;
}
.heart-seal {
  border: 1px solid currentColor;
  border-radius: 50%;
  padding: 2px 6px;
  color: #c2cbd0;
  background: #17262e;
  font:
    bold 12px Georgia,
    serif;
}
.heart-seal.active {
  color: #f6dc89;
  box-shadow: 0 0 6px #e0b647;
}
</style>
