<script setup lang="ts">
import { LOCALES, type Locale } from '@lcg/shared'
import { useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { PLAYMATS, playmat } from '../game/playmats'

/** Preferencias de la web: idioma y tapete, con una muestra de tela por tapete. */
const { t, locale } = useI18n()
const id = useId()

function pickPlaymat(value: string) {
  playmat.value = value
}

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
  <div class="preferences">
    <div class="preference">
      <span :id="`${id}-language`" class="preference-label">{{ t('app.language') }}</span>
      <div class="languages" role="group" :aria-labelledby="`${id}-language`">
        <button
          v-for="l in LOCALES"
          :key="l"
          type="button"
          :aria-pressed="locale === l"
          @click="setLocale(l)"
        >
          {{ l.toUpperCase() }}
        </button>
      </div>
    </div>
    <div class="preference">
      <span :id="`${id}-playmat`" class="preference-label">{{ t('app.playmat') }}</span>
      <div class="playmats" role="group" :aria-labelledby="`${id}-playmat`">
        <button
          v-for="m in PLAYMATS"
          :key="m.id"
          type="button"
          :aria-pressed="m.id === playmat"
          :style="{ '--felt': m.felt, '--felt-edge': m.feltEdge, '--trim': m.trim }"
          @click="pickPlaymat(m.id)"
        >
          <span class="swatch" />
          {{ t(`playmat.${m.id}`) }}
        </button>
      </div>
    </div>
    <p class="preferences-note">{{ t('app.disclaimer') }}</p>
  </div>
</template>

<style scoped>
.preferences {
  display: grid;
  gap: 20px;
}
.preference {
  display: grid;
  gap: 10px;
}
.preference-label {
  color: var(--site-muted);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.preferences button {
  min-height: 44px;
  color: var(--ink);
  background: var(--site-control);
  border: 1px solid var(--site-border);
  border-radius: 3px;
  font: inherit;
  font-size: 0.875rem;
}
.preferences button:hover:not(:disabled) {
  background: var(--site-panel-hover);
  border-color: var(--accent);
}
/* Idioma: selector partido con el idioma activo relleno. */
.languages {
  display: flex;
  justify-self: start;
  border: 1px solid var(--site-border);
  border-radius: 3px;
  overflow: hidden;
}
.languages button {
  min-width: 64px;
  border: 0;
  border-radius: 0;
  font-weight: 600;
  letter-spacing: 0.08em;
}
.languages button + button {
  border-left: 1px solid var(--site-border);
}
.languages button[aria-pressed='true'] {
  color: var(--site-on-accent);
  background: var(--accent);
}
.playmats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.playmats button {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  text-align: left;
  line-height: 1.2;
}
.playmats button[aria-pressed='true'] {
  border-color: var(--trim);
  box-shadow: inset 0 0 0 1px var(--trim);
}
.swatch {
  width: 22px;
  height: 22px;
  flex: none;
  border-radius: 50%;
  border: 2px solid var(--trim);
  background: var(--tex-felt), radial-gradient(circle at 40% 35%, var(--felt), var(--felt-edge));
}
.preferences-note {
  margin: 0;
  padding-top: 16px;
  border-top: 1px solid var(--site-line);
  color: var(--site-faint);
  font-size: 0.75rem;
  line-height: 1.5;
}
</style>
