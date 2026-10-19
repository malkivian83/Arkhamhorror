<script setup lang="ts">
import { zoomed } from '../game/zoom'
import CardDetails from './CardDetails.vue'
</script>

<template>
  <div v-if="zoomed" class="card-zoom">
    <CardDetails
      :code="zoomed.code"
      :name="zoomed.name"
      :back="zoomed.back"
      :landscape="zoomed.landscape"
      :width="zoomed.landscape ? 420 : 300"
      no-zoom
    />
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
</style>
