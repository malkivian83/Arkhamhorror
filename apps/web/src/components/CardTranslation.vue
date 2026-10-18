<script setup lang="ts">
import { computed } from 'vue'
import { cardTextHtml } from '../game/cardText'
import { localizedCards } from '../game/localized'

const props = defineProps<{ code: string; back?: boolean }>()
const card = computed(() => localizedCards.value.get(props.code))
const name = computed(() =>
  props.back && card.value?.type_code !== 'location'
    ? (card.value?.back_name ?? card.value?.name)
    : card.value?.name,
)
const text = computed(() => cardTextHtml(props.back ? card.value?.back_text : card.value?.text))
const flavor = computed(() => (props.back ? card.value?.back_flavor : card.value?.flavor) ?? '')
</script>

<template>
  <aside v-if="card" class="translation">
    <h3>{{ name }}</h3>
    <p v-if="card.subname && !back" class="subname">{{ card.subname }}</p>
    <p class="meta">
      {{ card.type_name }}<template v-if="card.slot"> · {{ card.slot }}</template>
    </p>
    <p v-if="card.traits && !back" class="traits">{{ card.traits }}</p>
    <!-- eslint-disable-next-line vue/no-v-html -- texto saneado en cardTextHtml -->
    <div v-if="text" class="text" v-html="text" />
    <p v-if="flavor" class="flavor">{{ flavor }}</p>
  </aside>
</template>

<style scoped>
.translation {
  box-sizing: border-box;
  width: min(340px, 100%);
  max-height: min(560px, 65dvh);
  overflow: auto;
  padding: 14px 16px;
  border-radius: 12px;
  background: #e6e2da;
  color: #1f1a14;
  font-family: Georgia, 'Times New Roman', serif;
  box-shadow: 0 8px 28px rgb(0 0 0 / 50%);
  text-align: left;
}
h3 {
  margin: 0;
  font-size: 1.15rem;
}
.subname,
.traits,
.flavor {
  font-style: italic;
}
.meta {
  margin: 8px 0;
  font-size: 0.85rem;
  text-transform: uppercase;
  opacity: 0.75;
}
.traits {
  margin: 2px 0 8px;
  font-weight: 700;
}
.text {
  padding-left: 8px;
  border-left: 3px solid #5a4a36;
  line-height: 1.45;
}
.flavor {
  margin-bottom: 0;
  font-size: 0.88rem;
  opacity: 0.8;
}
</style>
