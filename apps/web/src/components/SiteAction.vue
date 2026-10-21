<script setup lang="ts">
import { RouterLink } from 'vue-router'

withDefaults(
  defineProps<{
    to?: string
    icon: string
    variant?: 'primary' | 'secondary' | 'danger'
    type?: 'button' | 'submit'
  }>(),
  { to: '', variant: 'primary', type: 'button' },
)
</script>

<template>
  <component
    :is="to ? RouterLink : 'button'"
    :to="to"
    :type="to ? undefined : type"
    class="site-action"
    :class="`site-action-${variant}`"
  >
    <span class="site-action-symbol" aria-hidden="true">{{ icon }}</span>
    <span class="site-action-label"><slot /></span>
  </component>
</template>

<style scoped>
.site-action.site-action {
  display: inline-flex;
  align-items: stretch;
  justify-content: center;
  min-height: 44px;
  padding: 0;
  gap: 0;
  border: 0;
  border-radius: 4px;
  overflow: hidden;
  color: #fff;
  background: #14854d;
  font: inherit;
  font-weight: 600;
  text-decoration: none;
  text-align: center;
  cursor: pointer;
}
.site-action.site-action-secondary {
  background: #555;
}
.site-action.site-action-danger {
  background: #ae4236;
}
.site-action.site-action:hover:not(:disabled) {
  background: #14854d;
  filter: brightness(1.18);
}
.site-action.site-action-secondary:hover:not(:disabled) {
  background: #555;
}
.site-action.site-action-danger:hover:not(:disabled) {
  background: #ae4236;
}
.site-action-symbol {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  min-width: 42px;
  padding: 8px 10px;
  background: rgb(0 0 0 / 14%);
  border-right: 1px solid rgb(255 255 255 / 18%);
  font-size: 1.1em;
}
.site-action-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 0;
  padding: 10px 14px;
  overflow-wrap: anywhere;
}
.site-action:disabled {
  opacity: 0.45;
  cursor: default;
}
</style>
