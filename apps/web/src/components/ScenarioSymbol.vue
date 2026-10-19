<script setup lang="ts">
defineProps<{ kind: 'discard' | 'bag' | 'victory' }>()
</script>

<template>
  <svg
    class="scenario-symbol"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="kind === 'discard'">
      <path d="m5 5 9-2 3 12-9 2Z" />
      <path d="M9 8h10v13H9" />
      <path d="m11 12 3 3 3-3M14 10v5" />
    </template>
    <template v-else-if="kind === 'bag'">
      <path d="M8 3h8l-2 4H10ZM10 7c-4 3-6 7-6 10 0 3 3 4 8 4s8-1 8-4c0-3-2-7-6-10M9 7h6" />
      <circle cx="12" cy="15" r="2" />
    </template>
    <template v-else>
      <path
        d="m12 3 2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.8-3.7 5.3-.8ZM4 15c0 4 3 6 6 7M20 15c0 4-3 6-6 7"
      />
    </template>
  </svg>
</template>

<style scoped>
.scenario-symbol {
  display: block;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  color: #e5aa8d;
}
</style>
