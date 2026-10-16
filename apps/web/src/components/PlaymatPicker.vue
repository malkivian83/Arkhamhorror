<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { PLAYMATS, playmat } from '../game/playmats'

/** Selector del tapete de la mesa: una muestra de tela por tapete. */
const { t } = useI18n()
const open = ref(false)
const root = ref<HTMLElement | null>(null)

function pick(id: string) {
  playmat.value = id
  open.value = false
}

function outside(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false
}
document.addEventListener('click', outside)
onBeforeUnmount(() => document.removeEventListener('click', outside))
</script>

<template>
  <div ref="root" class="picker">
    <button type="button" class="current" :aria-expanded="open" @click="open = !open">
      <span class="swatch" />
      {{ t(`playmat.${playmat}`) }}
    </button>
    <ul v-if="open" class="menu">
      <li v-for="m in PLAYMATS" :key="m.id">
        <button
          type="button"
          :aria-pressed="m.id === playmat"
          :style="{ '--felt': m.felt, '--felt-edge': m.feltEdge, '--trim': m.trim }"
          @click="pick(m.id)"
        >
          <span class="swatch" />
          {{ t(`playmat.${m.id}`) }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.picker {
  position: relative;
}
.current {
  display: flex;
  align-items: center;
  gap: 8px;
}
.swatch {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--trim);
  background: var(--tex-felt), radial-gradient(circle at 40% 35%, var(--felt), var(--felt-edge));
  flex: none;
}
.menu {
  position: absolute;
  z-index: 60;
  top: calc(100% + 6px);
  right: 0;
  list-style: none;
  margin: 0;
  padding: 6px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 10px 28px rgb(0 0 0 / 55%);
  min-width: 220px;
}
.menu button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  border-color: transparent;
  background: transparent;
}
.menu button[aria-pressed='true'] {
  color: var(--trim);
  border-color: var(--trim);
}
</style>
