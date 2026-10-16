<script setup lang="ts">
import { computed } from 'vue'
import { tokenImage, type TokenKind } from '../game/assets'

/** Ficha de recursos, pistas, daño, horror o perdición con su valor encima. */
const props = withDefaults(
  defineProps<{ kind: TokenKind; value: number | string; size?: number }>(),
  {
    size: 40,
  },
)
const image = computed(() => tokenImage(props.kind))
</script>

<template>
  <span
    class="token-badge"
    :class="[kind, { image: !!image }]"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      fontSize: `${size * 0.45}px`,
      backgroundImage: image ? `url(${image})` : undefined,
    }"
  >
    {{ value }}
  </span>
</template>

<style scoped>
.token-badge {
  display: inline-grid;
  place-items: center;
  flex: none;
  font-weight: 800;
  color: #fff;
  text-shadow:
    0 0 3px #000,
    0 1px 2px #000;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
}
.token-badge:not(.image) {
  border: 2px solid rgb(255 255 255 / 25%);
  box-shadow:
    inset 0 -3px 6px rgb(0 0 0 / 35%),
    0 2px 5px rgb(0 0 0 / 55%);
}
.token-badge.image {
  filter: drop-shadow(0 2px 3px rgb(0 0 0 / 60%));
}
.resource:not(.image) {
  border-radius: 8px;
  clip-path: polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0 50%);
  background: radial-gradient(circle at 40% 35%, #8d6a3f, #4a3420 75%);
  border: none;
}
.clue:not(.image) {
  background: radial-gradient(circle at 40% 35%, #5f8a4a, #263d1d 75%);
}
.damage:not(.image) {
  background: radial-gradient(circle at 40% 35%, #c2453a, #5c1610 75%);
}
.horror:not(.image) {
  background: radial-gradient(circle at 40% 35%, #4d79c9, #172b57 75%);
}
.doom:not(.image) {
  background: radial-gradient(circle at 40% 35%, #b3262a, #3c0a0b 75%);
}
</style>
