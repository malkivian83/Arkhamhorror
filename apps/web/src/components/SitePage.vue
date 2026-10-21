<script setup lang="ts">
import { useI18n } from 'vue-i18n'

withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    icon: 'campaign' | 'investigators' | 'decks'
    art?: string
    eyebrow?: string
  }>(),
  { art: '/local-assets/home/occult-archive.webp', eyebrow: '', subtitle: '' },
)
const { t } = useI18n()
</script>

<template>
  <div class="site-surface">
    <section class="site-page">
      <header class="page-heading" :style="{ '--page-art': `url('${art}')` }">
        <div class="page-title">
          <p class="page-eyebrow">
            <img
              class="page-icon"
              :src="`/local-assets/home/icon-${icon}.webp`"
              alt=""
              width="28"
              height="28"
            /><span>{{ eyebrow || t('setup.eyebrow') }}</span>
          </p>
          <h1>{{ title }}</h1>
          <p v-if="subtitle">{{ subtitle }}</p>
        </div>
        <div v-if="$slots.actions" class="page-actions"><slot name="actions" /></div>
      </header>
      <div class="page-content"><slot /></div>
      <footer class="page-footer">{{ t('app.disclaimer') }}</footer>
    </section>
  </div>
</template>

<style scoped>
/*
 * Tema de las páginas del sitio. Los nombres cortos (--panel, --accent...) son
 * los que usan las vistas y los componentes compartidos con la mesa; aquí
 * apuntan a los tokens de styles/site.css.
 */
.site-surface {
  --bg: var(--site-bg);
  --panel: var(--site-panel);
  --panel-2: var(--site-panel-raised);
  --ink: var(--site-ink);
  --accent: var(--site-accent);
  --accent-glow: #e5aa8d66;
  --border: var(--site-border);
  --line: var(--site-border);
  --muted: var(--site-muted);
  --brass: var(--site-accent);
  --brass-dark: var(--site-outline);
  --eldritch: #a8d8c0;
  --display: var(--site-display);
  --fell: var(--site-body);
  --type: var(--site-body);
  min-height: calc(100dvh - 94px);
  background: var(--bg);
  color: var(--ink);
  font: 400 1rem/1.5 var(--site-body);
}
.site-page {
  width: min(1180px, 100%);
  min-width: 0;
  margin: 0 auto;
  padding: 0 36px 28px;
  color: var(--ink);
  font: 400 1rem/1.6 var(--site-body);
}
.page-heading {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  gap: 20px;
  min-height: 220px;
  margin: 0 -36px 32px;
  padding: 36px;
  overflow: hidden;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}
.page-heading::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(90deg, #19191dfc 10%, #19191de6 36%, #19191d55),
    var(--page-art) right 52% / cover;
  pointer-events: none;
}
.page-icon {
  width: 28px;
  height: 28px;
  flex: none;
  object-fit: contain;
}
.page-title {
  flex: 1;
  min-width: 0;
}
h1 {
  margin: 0;
  font: 700 clamp(1.75rem, 3vw, 2.5rem)/1.3 var(--display);
  color: var(--ink);
  letter-spacing: -0.03em;
  overflow-wrap: anywhere;
}
.page-title > p:not(.page-eyebrow) {
  max-width: 64ch;
  margin: 8px 0 0;
  color: var(--site-ink-soft);
  line-height: 1.5;
}
.page-eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--accent);
  margin: 0 0 12px;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}
.page-footer {
  margin-top: 36px;
  border-top: 1px solid var(--border);
  padding-top: 20px;
  color: var(--muted);
  font-size: 0.75rem;
}
.page-actions {
  display: flex;
  flex: none;
  gap: 8px;
  flex-wrap: wrap;
}
.page-content {
  min-width: 0;
}
.page-content :deep(h2),
.page-content :deep(h3) {
  color: var(--ink);
  font-family: var(--display);
  letter-spacing: 0;
  line-height: 1.5;
}
.page-content :deep(h2) {
  font-size: 1.125rem;
}
.page-content :deep(h3) {
  font-size: 1rem;
}
.site-page :deep(button),
.site-page :deep(.link-button),
.site-page :deep(summary) {
  min-height: 44px;
  font: inherit;
}
.site-page :deep(button:not(.ui-plain)),
.site-page :deep(.link-button) {
  padding: 8px 14px;
  overflow-wrap: anywhere;
}
.site-page :deep(.link-button) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  text-align: center;
}
.site-page :deep(input:not([type='checkbox'])),
.site-page :deep(select),
.site-page :deep(textarea) {
  min-height: 44px;
  max-width: 100%;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--ink);
  background: var(--site-bg);
  padding: 8px 10px;
  font: inherit;
}
.site-page :deep(input::placeholder) {
  color: var(--site-muted);
  opacity: 1;
}
.site-page :deep(input[type='checkbox']) {
  width: 20px;
  height: 20px;
  flex: none;
  accent-color: var(--accent);
}
.site-page :deep(a:not(.link-button, .site-action)) {
  color: var(--accent);
  text-underline-offset: 4px;
}
.site-page :deep(:focus-visible) {
  outline: 2px solid var(--site-ink);
  outline-offset: 3px;
  box-shadow: 0 0 0 5px var(--site-bg);
}
@media (max-width: 680px) {
  .site-surface {
    min-height: calc(100dvh - 82px);
  }
  .site-page {
    padding: 0 20px 24px;
  }
  .page-heading {
    flex-wrap: wrap;
    gap: 12px;
    padding: 28px 20px;
    margin: 0 -20px 24px;
    min-height: 190px;
  }
  .page-icon {
    width: 26px;
    height: 26px;
  }
  .page-title {
    flex-basis: 100%;
  }
  .page-actions {
    flex-basis: 100%;
  }
  .page-actions :deep(.link-button),
  .page-actions :deep(.site-action) {
    width: 100%;
  }
  .page-heading::before {
    background:
      linear-gradient(90deg, #19191df0, #19191d99),
      var(--page-art) center / cover;
  }
}
</style>
