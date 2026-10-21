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
  --action-top: #f1d6a0;
  --action-bottom: #c59154;
  --action-edge: #aa6b39;
  --action-ink: #302014;
  --action-shine: #fff3cc;
  display: inline-flex;
  align-items: stretch;
  justify-content: center;
  min-height: 44px;
  padding: 0;
  gap: 0;
  border: 1px solid var(--action-edge);
  border-radius: 7px;
  overflow: hidden;
  color: var(--action-ink);
  background: linear-gradient(180deg, var(--action-top), var(--action-bottom));
  box-shadow:
    inset 0 1px 0 var(--action-shine),
    inset 0 0 0 3px rgb(64 29 12 / 14%),
    0 3px 0 #24160f,
    0 5px 12px #0005;
  font: inherit;
  font-weight: 700;
  text-shadow: 0 1px 0 rgb(255 244 212 / 30%);
  text-decoration: none;
  text-align: center;
  cursor: pointer;
  transition:
    filter 140ms ease,
    box-shadow 140ms ease,
    translate 140ms ease;
}
.site-action.site-action-secondary {
  --action-top: #493426;
  --action-bottom: #2d211b;
  --action-edge: #b48355;
  --action-ink: #f3dfbc;
  --action-shine: #bd8a5966;
  text-shadow: 0 1px 2px #0008;
}
.site-action.site-action-danger {
  --action-top: #823b2e;
  --action-bottom: #51231e;
  --action-edge: #c78864;
  --action-ink: #ffead9;
  --action-shine: #df9b7566;
  text-shadow: 0 1px 2px #0008;
}
.site-action.site-action:hover:not(:disabled) {
  filter: brightness(1.1);
  translate: 0 -1px;
}
.site-action.site-action:active:not(:disabled) {
  translate: 0 2px;
  box-shadow:
    inset 0 2px 5px #23100855,
    inset 0 0 0 3px rgb(64 29 12 / 14%),
    0 1px 0 #24160f;
}
.site-action.site-action:focus-visible {
  outline: 2px solid #fff0cd;
  outline-offset: 4px;
}
.site-action-symbol {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  min-width: 42px;
  padding: 8px 10px;
  color: #ffe9bc;
  background: linear-gradient(145deg, #9e673c, #593922);
  border-right: 1px solid #402619;
  box-shadow:
    inset 0 1px 0 #eac08b99,
    inset -1px 0 0 #f6d4a344;
  text-shadow: 0 1px 2px #29170e;
  font-size: 1.25em;
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
  opacity: 0.55;
  filter: saturate(0.35);
  box-shadow: inset 0 1px 0 #f8dca333;
  cursor: not-allowed;
}
</style>
