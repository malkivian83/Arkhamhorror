<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { openPile } from '../game/pile'
import GameCard from './GameCard.vue'

/** Ventana con todas las cartas de una pila (descartes, zona de victoria). */
const { t } = useI18n()

const cards = computed(() => {
  const pile = openPile.value
  if (!pile) return []
  return pile.newestFirst ? [...pile.cards].reverse() : pile.cards
})

function close() {
  openPile.value = null
}
function escape(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}
document.addEventListener('keydown', escape)
onBeforeUnmount(() => document.removeEventListener('keydown', escape))
</script>

<template>
  <div v-if="openPile" class="overlay" @click.self="close">
    <section class="pile">
      <header>
        <h2>{{ t(openPile.title, openPile.params ?? {}) }} ({{ openPile.cards.length }})</h2>
        <button type="button" :title="t('table.close')" @click="close">✕</button>
      </header>
      <p v-if="!cards.length" class="empty">{{ t('table.emptyPile') }}</p>
      <div v-else class="cards">
        <GameCard v-for="(c, i) in cards" :key="i" :code="c.code" :name="c.name" :width="130" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 850;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgb(0 0 0 / 55%);
}
.pile {
  width: min(900px, 100%);
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: rgb(17 13 20 / 94%);
  box-shadow: 0 12px 40px rgb(0 0 0 / 60%);
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
h2 {
  margin: 0;
  font-size: 1.05rem;
}
header button {
  padding: 0 10px;
}
.cards {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  overflow-y: auto;
}
.empty {
  padding: 24px;
  text-align: center;
  opacity: 0.7;
}
</style>
