<script setup lang="ts">
import type { ChaosToken } from '@lcg/engine'
import { computed } from 'vue'

/** Ficha del caos dibujada (número o símbolo). */
const props = withDefaults(defineProps<{ token: ChaosToken; size?: number }>(), { size: 34 })

const SYMBOLS: Record<string, string> = {
  skull: '☠',
  cultist: '⚉',
  tablet: '▤',
  elderThing: '✷',
  elderSign: '✪',
  autoFail: '⊗',
}
const label = computed(() =>
  typeof props.token === 'number'
    ? props.token > 0
      ? `+${props.token}`
      : `${props.token}`
    : (SYMBOLS[props.token] ?? props.token),
)
const kind = computed(() => (typeof props.token === 'number' ? 'number' : props.token))
</script>

<template>
  <span
    class="chaos-token"
    :class="kind"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.42}px` }"
  >
    {{ label }}
  </span>
</template>

<style scoped>
.chaos-token {
  display: inline-grid;
  place-items: center;
  flex: none;
  border-radius: 50%;
  font-weight: 800;
  color: #f4ecd8;
  background: radial-gradient(circle at 35% 30%, #6d6250, #2f2a22 70%);
  border: 3px solid #b8a27a;
  box-shadow:
    inset 0 0 0 2px rgb(0 0 0 / 35%),
    0 2px 5px rgb(0 0 0 / 50%);
}
.skull,
.cultist,
.tablet,
.elderThing {
  background: radial-gradient(circle at 35% 30%, #5b4b6e, #241c2e 70%);
  border-color: #9c86b8;
}
.autoFail {
  background: radial-gradient(circle at 35% 30%, #b03a2e, #4a120c 70%);
  border-color: #e0806f;
}
.elderSign {
  background: radial-gradient(circle at 35% 30%, #3a7fae, #0f2c42 70%);
  border-color: #8cc4ea;
}
</style>
