<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useLabels } from '../game/labels'
import { useGameStore } from '../stores/game'

/**
 * Envuelve un elemento de la mesa. Si la pregunta actual tiene opciones sobre
 * él, se resalta; con una sola opción, un clic la elige; con varias, se abre
 * un menú.
 */
const props = defineProps<{ target: string }>()
const game = useGameStore()
const label = useLabels()
const open = ref(false)
const root = ref<HTMLElement | null>(null)

const options = computed(() => game.choicesByTarget.get(props.target) ?? [])

function click() {
  const [only] = options.value
  if (!only) return
  if (options.value.length === 1) game.answer(only.index)
  else open.value = !open.value
}

function pick(index: number) {
  open.value = false
  game.answer(index)
}

function outside(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false
}
document.addEventListener('click', outside)
onBeforeUnmount(() => document.removeEventListener('click', outside))
</script>

<template>
  <div ref="root" class="table-target" :class="{ active: options.length > 0 }" @click.stop="click">
    <slot />
    <ul v-if="open && options.length > 1" class="menu" @click.stop>
      <li v-for="o in options" :key="o.index">
        <button type="button" @click="pick(o.index)">
          {{ label(o.choice.label, o.choice.params ?? {}) }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.table-target {
  position: relative;
  display: inline-block;
  border-radius: 8px;
}
.table-target.active {
  cursor: pointer;
  outline: 3px solid var(--accent);
  outline-offset: 2px;
  box-shadow: 0 0 14px var(--accent-glow);
}
.menu {
  position: absolute;
  z-index: 30;
  top: calc(100% + 6px);
  left: 0;
  list-style: none;
  margin: 0;
  padding: 4px;
  background: var(--panel);
  border: 1px solid var(--accent);
  border-radius: 6px;
  min-width: 220px;
  box-shadow: 0 6px 18px rgb(0 0 0 / 50%);
}
.menu button {
  width: 100%;
  text-align: left;
}
</style>
