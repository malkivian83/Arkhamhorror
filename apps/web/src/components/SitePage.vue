<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  icon: 'campaign' | 'investigators' | 'decks'
}>()
</script>

<template>
  <section class="site-page">
    <header class="page-heading">
      <img
        class="page-icon"
        :src="`/local-assets/home/icon-${icon}.webp`"
        alt=""
        width="64"
        height="64"
      />
      <div class="page-title">
        <h1>{{ title }}</h1>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="page-actions"><slot name="actions" /></div>
    </header>
    <div class="page-content"><slot /></div>
  </section>
</template>

<style scoped>
/* Theme confined to these pages: the game table keeps its own presentation. */
.site-page {
  --bg: #19191d;
  --panel: #25252b;
  --panel-2: #303037;
  --ink: #f4efe7;
  --accent: #e5aa8d;
  --accent-glow: #e5aa8d66;
  --border: #807574;
  --line: #62585b;
  --muted: #c3bbb4;
  --brass: #e5aa8d;
  --brass-dark: #807574;
  --eldritch: #a8d8c0;
  --display: 'Libre Baskerville', Georgia, serif;
  --fell: 'Source Sans 3', system-ui, sans-serif;
  --type: 'Source Sans 3', system-ui, sans-serif;
  width: min(1240px, 100%);
  min-width: 0;
  margin: 0 auto;
  padding: 32px 24px 64px;
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
  min-height: 132px;
  margin-bottom: 28px;
  padding: 24px;
  overflow: hidden;
  background: #25252b;
  border: 1px solid #62585b;
  border-radius: 4px;
}
.page-heading::before {
  content: '';
  position: absolute;
  inset: 0 0 0 50%;
  z-index: -1;
  background:
    linear-gradient(90deg, #25252b, #25252b99),
    url('/local-assets/home/occult-archive.webp') center 45% / cover;
  opacity: 0.65;
  pointer-events: none;
}
.page-icon {
  width: 56px;
  height: 56px;
  flex: none;
  object-fit: contain;
}
.page-title {
  flex: 1;
  min-width: 0;
}
h1 {
  margin: 0;
  font: 700 clamp(1.5rem, 3vw, 2rem)/1.35 var(--display);
  color: var(--ink);
  letter-spacing: 0;
  overflow-wrap: anywhere;
}
.page-title p {
  max-width: 64ch;
  margin: 8px 0 0;
  color: #d0c7c1;
  line-height: 1.5;
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
  border: 1px solid var(--border);
  border-radius: 3px;
  color: var(--ink);
  background: var(--panel);
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
  background: #37303a;
  border-color: var(--accent);
}
.site-page :deep(button.primary),
.site-page :deep(.link-button.primary) {
  color: #19191d;
  background: var(--accent);
  border-color: var(--accent);
  font-weight: 600;
}
.site-page :deep(button.primary:hover:not(:disabled)),
.site-page :deep(.link-button.primary:hover) {
  background: #f0c2a8;
}
.site-page :deep(button[aria-pressed='true']) {
  color: var(--accent);
  border-color: var(--accent);
  box-shadow: inset 0 -2px var(--accent);
}
.site-page :deep(input:not([type='checkbox'])),
.site-page :deep(select),
.site-page :deep(textarea) {
  min-height: 44px;
  max-width: 100%;
  border: 1px solid var(--border);
  border-radius: 3px;
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
.site-page :deep(a:not(.link-button)) {
  color: var(--accent);
  text-underline-offset: 4px;
}
.site-page :deep(:focus-visible) {
  outline: 2px solid #f4efe7;
  outline-offset: 3px;
  box-shadow: 0 0 0 5px #19191d;
}
@media (max-width: 700px) {
  .site-page {
    padding: 20px 16px 40px;
  }
  .page-heading {
    flex-wrap: wrap;
    gap: 12px;
    min-height: 0;
    padding: 20px 16px;
    margin-bottom: 20px;
  }
  .page-icon {
    width: 40px;
    height: 40px;
  }
  .page-title {
    flex-basis: calc(100% - 52px);
  }
  .page-actions {
    flex-basis: 100%;
  }
  .page-actions :deep(.link-button) {
    width: 100%;
  }
}
</style>
