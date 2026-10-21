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
/* Theme confined to these pages: the game table keeps its own presentation. */
.site-surface {
  --bg: #19191d;
  --panel: #25252b;
  --panel-2: #2c2b31;
  --ink: #f4efe7;
  --accent: #e5aa8d;
  --accent-glow: #e5aa8d66;
  --border: #494248;
  --line: #494248;
  --muted: #bdb4b1;
  --brass: #e5aa8d;
  --brass-dark: #807574;
  --eldritch: #a8d8c0;
  --display: 'Libre Baskerville', Georgia, serif;
  --fell: 'Source Sans 3', system-ui, sans-serif;
  --type: 'Source Sans 3', system-ui, sans-serif;
  min-height: calc(100dvh - 94px);
  background: var(--bg);
  color: var(--ink);
  font:
    400 1rem/1.5 'Source Sans 3',
    system-ui,
    sans-serif;
}
.site-page {
  width: min(1180px, 100%);
  min-width: 0;
  margin: 0 auto;
  padding: 0 36px 28px;
  color: var(--ink);
  font:
    400 1rem/1.6 'Source Sans 3',
    system-ui,
    sans-serif;
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
  color: #d0c7c1;
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
.site-page :deep(button),
.site-page :deep(.link-button) {
  border: 0;
  border-radius: 4px;
  color: #fff;
  background: #555;
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
.site-page :deep(button:hover:not(:disabled)),
.site-page :deep(.link-button:hover) {
  filter: brightness(1.18);
}
.site-page :deep(button.primary),
.site-page :deep(.link-button.primary) {
  color: #fff;
  background: #14854d;
  font-weight: 600;
}
.site-page :deep(button.primary:hover:not(:disabled)),
.site-page :deep(.link-button.primary:hover) {
  background: #14854d;
}
.site-page :deep(button[aria-pressed='true']) {
  color: #fff;
  background: #7c3c85;
  box-shadow: inset 0 -2px rgb(255 255 255 / 24%);
}
.site-page :deep(input:not([type='checkbox'])),
.site-page :deep(select),
.site-page :deep(textarea) {
  min-height: 44px;
  max-width: 100%;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--ink);
  background: #19191d;
  padding: 8px 10px;
  font: inherit;
}
.site-page :deep(input::placeholder) {
  color: #c3bbb4;
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
  outline: 2px solid #f4efe7;
  outline-offset: 3px;
  box-shadow: 0 0 0 5px #19191d;
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
