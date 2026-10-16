<script setup lang="ts">
import { computed } from 'vue'
import { cardTextHtml } from '../game/cardText'
import { localizedCards } from '../game/localized'
import { zoomed } from '../game/zoom'
import GameCard from './GameCard.vue'

/**
 * Carta ampliada al pasar el ratón. Si hay datos traducidos (p. ej. español),
 * se muestra al lado su nombre y texto, porque la imagen oficial está en inglés.
 */
const card = computed(() =>
  zoomed.value ? localizedCards.value.get(zoomed.value.code) : undefined,
)
const back = computed(() => zoomed.value?.back ?? false)
const name = computed(() =>
  back.value && card.value?.type_code !== 'location'
    ? (card.value?.back_name ?? card.value?.name)
    : card.value?.name,
)
const text = computed(() => cardTextHtml(back.value ? card.value?.back_text : card.value?.text))
const flavor = computed(() => (back.value ? card.value?.back_flavor : card.value?.flavor) ?? '')
</script>

<template>
  <div v-if="zoomed" class="card-zoom">
    <GameCard
      :code="zoomed.code"
      :name="zoomed.name"
      :back="zoomed.back"
      :landscape="zoomed.landscape"
      :width="zoomed.landscape ? 420 : 300"
      no-zoom
    />
    <aside v-if="card" class="translation">
      <h3>{{ name }}</h3>
      <p v-if="card.subname && !back" class="subname">{{ card.subname }}</p>
      <p class="meta">
        <span
          >{{ card.type_name }}<template v-if="card.slot"> · {{ card.slot }}</template></span
        >
      </p>
      <p v-if="card.traits && !back" class="traits">{{ card.traits }}</p>
      <!-- eslint-disable-next-line vue/no-v-html -- texto saneado en cardTextHtml -->
      <p v-if="text" class="text" v-html="text" />
      <p v-if="flavor" class="flavor">{{ flavor }}</p>
    </aside>
  </div>
</template>

<style scoped>
.card-zoom {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.card-zoom :deep(.game-card) {
  border-radius: 12px;
  box-shadow: 0 8px 28px rgb(0 0 0 / 70%);
}
.translation {
  width: 300px;
  max-height: 420px;
  overflow: auto;
  padding: 14px 16px;
  border-radius: 12px;
  background: #e6e2da;
  color: #1f1a14;
  font-family: Georgia, 'Times New Roman', serif;
  box-shadow: 0 8px 28px rgb(0 0 0 / 70%);
}
h3 {
  margin: 0;
  font-size: 1.15rem;
}
.subname {
  margin: 2px 0 0;
  font-style: italic;
  font-size: 0.9rem;
}
.meta {
  margin: 8px 0 0;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.75;
}
.traits {
  margin: 2px 0 8px;
  font-style: italic;
  font-weight: 700;
}
.text {
  margin: 0 0 8px;
  padding-left: 8px;
  border-left: 3px solid #5a4a36;
  line-height: 1.35;
}
.flavor {
  margin: 0;
  font-style: italic;
  font-size: 0.88rem;
  opacity: 0.8;
}
</style>
