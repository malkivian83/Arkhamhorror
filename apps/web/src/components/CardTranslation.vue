<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardTextHtml } from '../game/cardText'
import { localizedCards } from '../game/localized'

const props = defineProps<{ code: string; back?: boolean; imageLanguage?: string | undefined }>()
const { t } = useI18n()
const card = computed(() => localizedCards.value.get(props.code))
const name = computed(() =>
  props.back && card.value?.type_code !== 'location'
    ? (card.value?.back_name ?? card.value?.name)
    : card.value?.name,
)
const text = computed(() => cardTextHtml(props.back ? card.value?.back_text : card.value?.text))
const flavor = computed(() => (props.back ? card.value?.back_flavor : card.value?.flavor) ?? '')
const transcribe = computed(() => props.imageLanguage !== 'es')
const faqs = computed(() =>
  (Array.isArray(card.value?.faq) ? card.value.faq : []).filter(
    (entry) => entry && typeof entry.question === 'string' && typeof entry.answer === 'string',
  ),
)
const sourceUrl = (source: string | undefined) =>
  source && /^https:\/\//i.test(source) ? source : undefined
</script>

<template>
  <aside v-if="card && (transcribe || faqs.length)" class="translation">
    <template v-if="transcribe">
      <h3>{{ name }}</h3>
      <p v-if="card.subname && !back" class="subname">{{ card.subname }}</p>
      <p class="meta">
        {{ card.type_name }}<template v-if="card.slot"> · {{ card.slot }}</template>
      </p>
      <p v-if="card.traits && !back" class="traits">{{ card.traits }}</p>
      <!-- eslint-disable-next-line vue/no-v-html -- texto saneado en cardTextHtml -->
      <div v-if="text" class="text" v-html="text" />
      <p v-if="flavor" class="flavor">{{ flavor }}</p>
    </template>
    <section v-if="faqs.length" class="card-faq" :aria-label="t('table.cardFaq')">
      <h3>{{ t('table.cardFaq') }}</h3>
      <article v-for="(entry, index) in faqs" :key="index">
        <h4>{{ entry.question }}</h4>
        <!-- eslint-disable-next-line vue/no-v-html -- sanitized by cardTextHtml -->
        <div class="text" v-html="cardTextHtml(entry.answer)" />
        <a
          v-if="sourceUrl(entry.source)"
          :href="sourceUrl(entry.source)"
          target="_blank"
          rel="noopener noreferrer"
          >{{ t('table.faqSource') }}</a
        >
      </article>
    </section>
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
.card-faq {
  margin-top: 16px;
}
.card-faq:first-child {
  margin-top: 0;
}
.card-faq h4 {
  margin: 14px 0 8px;
  font-size: 1rem;
}
.card-faq a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: #623c26;
  text-underline-offset: 3px;
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
