<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ valid: boolean }>()
const { t } = useI18n()
const label = computed(() => t(props.valid ? 'decks.valid' : 'decks.invalid'))
const tooltipVisible = ref(false)
const id = useId()
</script>

<template>
  <span
    class="deck-validity"
    role="img"
    :aria-label="label"
    tabindex="0"
    @mouseenter="tooltipVisible = true"
    @mouseleave="tooltipVisible = false"
    @focus="tooltipVisible = true"
    @blur="tooltipVisible = false"
    @keydown.esc="tooltipVisible = false"
  >
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient :id="`${id}-rim`" x1="0" y1="0" x2="0.8" y2="1">
          <stop stop-color="#ffe0b4" />
          <stop offset="0.35" stop-color="#d79b67" />
          <stop offset="0.6" stop-color="#8c4e30" />
          <stop offset="0.82" stop-color="#e9b582" />
          <stop offset="1" stop-color="#643922" />
        </linearGradient>
        <linearGradient :id="`${id}-face`" x1="0" y1="0" x2="0" y2="1">
          <stop :stop-color="valid ? '#45664f' : '#80463c'" />
          <stop offset="1" :stop-color="valid ? '#1b3028' : '#3e2020'" />
        </linearGradient>
      </defs>
      <circle
        cx="24"
        cy="24"
        r="21"
        :fill="`url(#${id}-rim)`"
        stroke="#633b28"
        stroke-width="1.5"
      />
      <circle
        cx="24"
        cy="24"
        r="16.5"
        :fill="`url(#${id}-face)`"
        stroke="#37271f"
        stroke-width="1.5"
      />
      <path
        d="M8 20A17 17 0 0 1 34 10"
        fill="none"
        stroke="#ffe2b4"
        stroke-width="1.2"
        stroke-linecap="round"
      />
      <path
        :d="valid ? 'm14 24 7 7 14-15' : 'm17 17 14 14m0-14L17 31'"
        fill="none"
        stroke="#111b18"
        stroke-width="5"
        stroke-linecap="round"
        stroke-linejoin="round"
        transform="translate(0 1)"
      />
      <path
        :d="valid ? 'm14 24 7 7 14-15' : 'm17 17 14 14m0-14L17 31'"
        fill="none"
        :stroke="valid ? '#bce5c6' : '#ffd0bf'"
        stroke-width="3.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    <span v-show="tooltipVisible" class="validity-tooltip" role="tooltip">{{ label }}</span>
  </span>
</template>

<style scoped>
.deck-validity {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  cursor: help;
}
svg {
  width: 34px;
  height: 34px;
  filter: drop-shadow(0 2px 2px #0008);
}
.validity-tooltip {
  position: absolute;
  z-index: 2;
  bottom: calc(100% + 6px);
  left: 0;
  padding: 6px 10px;
  border: 1px solid var(--site-border-strong);
  border-radius: 6px;
  background: var(--site-bg-deep);
  box-shadow: var(--site-shadow);
  color: var(--site-ink);
  font: 400 0.875rem/1.4 var(--site-body);
  white-space: nowrap;
  pointer-events: none;
}
</style>
