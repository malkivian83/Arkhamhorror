<script setup lang="ts">
import { LOCALES, type Locale } from '@lcg/shared'
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { scanLocale } from './game/cards'
import { useCardLocale } from './game/localized'

const { t, locale } = useI18n()

// Datos de las cartas en el idioma activo (en inglés se usan las imágenes oficiales).
watch(
  locale,
  (value) => {
    scanLocale.value = value
    void useCardLocale(value)
  },
  { immediate: true },
)

function setLocale(value: Locale) {
  locale.value = value
  try {
    localStorage.setItem('locale', value)
  } catch {
    // Sin almacenamiento: el idioma solo dura esta sesión.
  }
}
</script>

<template>
  <header class="topbar">
    <RouterLink to="/" class="brand">{{ t('app.title') }}</RouterLink>
    <span class="disclaimer">{{ t('app.disclaimer') }}</span>
    <nav>
      <button
        v-for="l in LOCALES"
        :key="l"
        type="button"
        :aria-pressed="locale === l"
        @click="setLocale(l)"
      >
        {{ l.toUpperCase() }}
      </button>
    </nav>
  </header>
  <main>
    <RouterView />
  </main>
</template>

<style>
:root {
  --bg: #14161b;
  --panel: #1c1f26;
  --panel-2: #23262f;
  --border: #2f3340;
  --ink: #e8e6e3;
  --accent: #c9a227;
  --accent-glow: rgb(201 162 39 / 55%);
  --line: #6b5a3a;
  --felt: #1d2a24;
  color-scheme: dark;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  font-family: system-ui, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--ink);
}
button {
  font: inherit;
  color: var(--ink);
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
}
button:hover:not(:disabled) {
  border-color: var(--accent);
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
button.primary {
  background: var(--accent);
  color: #1b1b1b;
  font-weight: 700;
  border-color: var(--accent);
}
button[aria-pressed='true'] {
  border-color: var(--accent);
  color: var(--accent);
}
.topbar {
  height: 52px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  background: var(--panel);
  border-bottom: 1px solid var(--border);
}
.brand {
  font-weight: 800;
  color: var(--accent);
  text-decoration: none;
  white-space: nowrap;
}
.disclaimer {
  flex: 1;
  font-size: 0.7rem;
  opacity: 0.55;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.topbar nav {
  display: flex;
  gap: 4px;
}
</style>
