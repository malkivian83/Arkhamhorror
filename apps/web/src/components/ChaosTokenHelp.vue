<script setup lang="ts">
import type { ChaosToken, GameState } from '@lcg/engine'
import { computed, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { chaosHelp } from '../game/chaosHelp'
import ChaosTokenView from './ChaosTokenView.vue'

const props = withDefaults(defineProps<{ state: GameState; token: ChaosToken; size?: number }>(), {
  size: 34,
})
const { t, locale } = useI18n()
const text = computed(() => chaosHelp(props.state, props.token, locale.value, t))
const help = ref<HTMLElement>(),
  trigger = ref<HTMLButtonElement>(),
  id = useId()
function show() {
  const box = trigger.value?.getBoundingClientRect()
  if (!box || !help.value) return
  help.value.showPopover()
  const width = help.value.offsetWidth,
    height = help.value.offsetHeight
  help.value.style.left = `${Math.max(8, Math.min(box.left, window.innerWidth - width - 8))}px`
  help.value.style.top = `${box.top > height + 12 ? box.top - height - 8 : Math.min(box.bottom + 8, window.innerHeight - height - 8)}px`
}
function hide() {
  help.value?.hidePopover()
}
</script>

<template>
  <button
    ref="trigger"
    type="button"
    class="token-help"
    :aria-label="text"
    :aria-describedby="id"
    @mouseenter="show"
    @mouseleave="hide"
    @focus="show"
    @blur="hide"
    @click="show"
    @keydown.esc.stop="hide"
  >
    <ChaosTokenView :token="token" :size="size" />
  </button>
  <span :id="id" ref="help" popover="auto" role="tooltip" class="token-tooltip">{{ text }}</span>
</template>

<style scoped>
.token-help {
  display: inline-flex;
  padding: 0;
  border: 0;
  background: transparent;
  border-radius: 50%;
  cursor: help;
}
.token-help:focus-visible {
  outline: 2px solid #e5aa8d;
  outline-offset: 3px;
}
.token-tooltip {
  position: fixed;
  inset: auto;
  margin: 0;
  box-sizing: border-box;
  max-width: min(480px, calc(100vw - 16px));
  max-height: calc(100dvh - 16px);
  overflow: auto;
  padding: 10px 14px;
  background: #08090df5;
  color: #fff5e5;
  border: 1px solid #807574;
  border-radius: 6px;
  font:
    14px/1.5 Georgia,
    serif;
  box-shadow: 0 6px 20px #0008;
}
</style>
