<script setup lang="ts">
import StoryIcon from './StoryIcon.vue'
import { scenarioKeywords } from '@lcg/cards'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storyBody, toggleOfficial } from '../game/story'

/**
 * Palabras clave y conceptos que explica la guía del escenario en curso, como en
 * la referencia. Resumen propio o, si está en local, el texto oficial.
 */
const props = defineProps<{ scenarioId: string }>()
const { t } = useI18n()

const entries = computed(() =>
  scenarioKeywords(props.scenarioId).map((key) => ({
    key,
    title: t(`keywords.${key}.title`),
    body: storyBody(`keywords.${key}.body`),
  })),
)
const switchable = computed(() => entries.value.some((e) => e.body.officialLocale))
</script>

<template>
  <details v-if="entries.length" class="keywords">
    <summary>📖 {{ t('keywords.title') }}</summary>
    <dl>
      <template v-for="entry in entries" :key="entry.key">
        <dt>{{ entry.title }}</dt>
        <dd>
          <p v-for="(paragraph, i) in entry.body.paragraphs" :key="i" :class="paragraph.kind">
            <template v-for="(span, j) in paragraph.spans" :key="j">
              <StoryIcon v-if="span.icon" :name="span.icon" />
              <b v-else-if="span.bold">{{ span.text }}</b>
              <i v-else-if="span.italic">{{ span.text }}</i>
              <template v-else>{{ span.text }}</template>
            </template>
          </p>
        </dd>
      </template>
    </dl>
    <button v-if="switchable" type="button" class="toggle" @click="toggleOfficial">
      {{ entries[0]?.body.official ? t('table.summaryText') : t('table.officialText') }}
    </button>
  </details>
</template>

<style scoped>
.keywords {
  margin: 8px 0;
  font-size: 0.85rem;
}
summary {
  cursor: pointer;
  font-weight: 600;
}
dl {
  margin: 8px 0 0;
}
dt {
  margin-top: 8px;
  font-weight: 700;
}
dd {
  margin: 2px 0 0;
}
dd p {
  margin: 0 0 6px;
  line-height: 1.4;
}
dd p.item {
  padding-left: 12px;
}
dd p.item::before {
  content: '• ';
}
.toggle {
  margin-top: 6px;
  padding: 2px 8px;
  border: 1px solid currentColor;
  border-radius: 3px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
</style>
