<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const paragraphs = ['rights', 'nonProfit', 'fairUse', 'takedown', 'warranty'] as const
</script>

<template>
  <footer class="site-footer">
    <p>{{ t('app.disclaimer') }}</p>
    <details class="copyright">
      <summary>{{ t('app.copyright.title') }}</summary>
      <p v-for="key in paragraphs" :key="key">{{ t(`app.copyright.${key}`) }}</p>
    </details>
  </footer>
</template>

<style scoped>
.site-footer p {
  margin: 0;
}
.copyright {
  margin-top: 8px;
}
.copyright summary {
  width: fit-content;
  min-height: 44px;
  display: flex;
  align-items: center;
  color: var(--site-ink-soft);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 4px;
}
.copyright p {
  max-width: 90ch;
  margin-top: 8px;
}
</style>
