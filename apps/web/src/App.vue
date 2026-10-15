<script setup lang="ts">
import { LOCALES, type Locale } from '@lcg/shared'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

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
  <header class="header">
    <h1>{{ t('app.title') }}</h1>
    <nav>
      <button v-for="l in LOCALES" :key="l" :aria-pressed="locale === l" @click="setLocale(l)">
        {{ l.toUpperCase() }}
      </button>
    </nav>
  </header>
  <main>
    <RouterView />
  </main>
  <footer class="footer">{{ t('app.disclaimer') }}</footer>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #15171c;
  color: #e8e6e3;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1rem;
}
main {
  padding: 1rem;
}
.footer {
  padding: 1rem;
  font-size: 0.8rem;
  opacity: 0.7;
}
button[aria-pressed='true'] {
  font-weight: bold;
}
</style>
