<script setup lang="ts">
import { LOCALES, type Locale } from '@lcg/shared'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import PlaymatPicker from './components/PlaymatPicker.vue'
import { scanLocale } from './game/cards'
import { useCardLocale } from './game/localized'
import './game/playmats'

const { t, locale } = useI18n()
const route = useRoute()
const gameMenu = ref<HTMLDialogElement>()
const menuButton = ref<HTMLButtonElement>()
function closeMenu() {
  gameMenu.value?.close()
  menuButton.value?.focus()
}
watch(() => route.fullPath, closeMenu)

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
  <template v-if="route.name === 'game'">
    <button
      ref="menuButton"
      class="game-menu-toggle"
      type="button"
      :aria-label="t('app.openMenu')"
      aria-haspopup="dialog"
      aria-controls="game-menu"
      @click="gameMenu?.showModal()"
    >
      ☰
    </button>
    <dialog
      id="game-menu"
      ref="gameMenu"
      class="game-menu"
      :aria-label="t('app.sections')"
      @click="$event.target === gameMenu && closeMenu()"
      @close="menuButton?.focus()"
    >
      <div class="game-menu-content">
        <button
          type="button"
          class="menu-close"
          :aria-label="t('app.closeMenu')"
          autofocus
          @click="closeMenu"
        >
          ✕
        </button>
        <RouterLink to="/" class="brand">{{ t('app.title') }}</RouterLink>
        <nav class="sections" :aria-label="t('app.sections')">
          <RouterLink to="/">{{ t('campaign.new') }}</RouterLink>
          <RouterLink to="/decks">{{ t('decks.title') }}</RouterLink>
        </nav>
        <PlaymatPicker />
        <nav class="menu-languages">
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
        <p class="menu-disclaimer">{{ t('app.disclaimer') }}</p>
      </div>
    </dialog>
  </template>
  <header v-else class="topbar">
    <RouterLink to="/" class="brand">{{ t('app.title') }}</RouterLink>
    <span class="disclaimer">{{ t('app.disclaimer') }}</span>
    <nav class="sections" :aria-label="t('app.sections')">
      <RouterLink to="/">{{ t('campaign.new') }}</RouterLink>
      <RouterLink to="/decks">{{ t('decks.title') }}</RouterLink>
    </nav>
    <PlaymatPicker />
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
  <main :class="{ 'game-shell': route.name === 'game' }">
    <RouterView />
  </main>
</template>

<style>
/* Símbolos oficiales (fuente de ArkhamDB vía proxy). */
@font-face {
  font-family: 'arkham-icons';
  src: url('/ext/arkhamdb/bundles/app/fonts/arkham-icons.woff') format('woff');
  font-display: block;
}
.ahi {
  display: none;
  font-family: 'arkham-icons';
  font-style: normal;
  font-weight: normal;
  line-height: 1;
}
.icons-ok .ahi {
  display: inline;
}
.icons-ok .ahi + .fb {
  display: none;
}
:root {
  --bg: #14161b;
  --panel: #1c1f26;
  --panel-2: #23262f;
  --border: #2f3340;
  --ink: #e8e6e3;
  --accent: #c9a227;
  --accent-glow: rgb(201 162 39 / 55%);
  --line: #6b5a3a;
  /* Tapete activo (lo cambia game/playmats.ts). */
  --felt: #2a4a3a;
  --felt-edge: #0f1d17;
  --trim: #c9a227;
  /* Arkham, años 20: rótulos art déco, textos de imprenta y máquina de escribir. */
  --display: 'Cinzel Decorative', 'Trajan Pro', Georgia, serif;
  --fell: 'IM Fell English', Georgia, serif;
  --type: 'Special Elite', 'Courier New', monospace;
  --parch: #e8dcbc;
  --parch-dark: #cbb98e;
  --parch-ink: #2a1d10;
  --brass: #c8a25a;
  --brass-dark: #7a5a2a;
  --eldritch: #7fb8a4;
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
#app:has(> .game-shell) {
  display: flex;
  flex-direction: column;
  height: 100dvh;
}
.game-shell {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.game-menu-toggle {
  position: fixed;
  z-index: 45;
  top: 12px;
  left: 6px;
  width: 44px;
  height: 44px;
  padding: 0;
  color: var(--brass);
  background: #1f170e;
  border-color: var(--brass-dark);
  font-size: 1.35rem;
}
.game-menu {
  position: fixed;
  inset: 0 auto 0 0;
  margin: 0;
  width: min(340px, 90vw);
  max-width: none;
  height: 100dvh;
  max-height: none;
  padding: 0;
  color: var(--ink);
  background: #1c1811;
  border: 0;
  border-right: 2px solid var(--brass-dark);
  box-shadow: 12px 0 40px #0008;
}
.game-menu[open] {
  animation: menu-enter 160ms ease-out;
}
@keyframes menu-enter {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}
.game-menu::backdrop {
  background: #0009;
}
.game-menu-content {
  min-height: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.menu-close {
  align-self: flex-end;
}
.game-menu button,
.game-menu .sections a {
  min-height: 44px;
}
.game-menu .brand {
  font-size: 1rem;
  white-space: normal;
}
.game-menu .sections {
  flex-direction: column;
  gap: 8px;
}
.game-menu .sections a {
  display: flex;
  align-items: center;
}
.game-menu .picker .menu {
  left: 0;
  right: auto;
  min-width: 0;
  width: 100%;
}
.menu-languages {
  display: flex;
  gap: 8px;
}
.menu-disclaimer {
  margin-top: auto;
  color: #b8aa8c;
  font-family: var(--fell);
  font-size: 0.85rem;
}
h1,
h2,
h3 {
  font-family: var(--display);
  font-weight: 700;
  letter-spacing: 0.03em;
}
:focus-visible {
  /* Foco de teclado: anillo doble, distinto del resaltado de elegible. */
  outline: 2px solid #fff;
  box-shadow: 0 0 0 5px #111;
}
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
  }
}

/*
 * Tapete: tela con grano, viñeta y costura. Se usa en la mesa, la fila del
 * escenario y la zona de cada jugador; `.sigil` añade el sello central.
 */
.playmat {
  position: relative;
  isolation: isolate;
  background:
    var(--tex-felt), radial-gradient(ellipse at 50% 45%, transparent 35%, rgb(0 0 0 / 55%) 100%),
    radial-gradient(ellipse at 50% 40%, var(--felt), var(--felt-edge) 120%);
  box-shadow: inset 0 0 40px rgb(0 0 0 / 60%);
}
.playmat::after {
  content: '';
  position: absolute;
  inset: 7px;
  z-index: -1;
  border: 1.5px dashed color-mix(in srgb, var(--trim) 45%, transparent);
  border-radius: 14px;
  pointer-events: none;
}
.playmat.sigil {
  background:
    var(--tex-felt),
    var(--tex-arkham-map) center / cover,
    radial-gradient(ellipse at 50% 45%, transparent 35%, rgb(0 0 0 / 55%) 100%),
    radial-gradient(ellipse at 50% 40%, var(--felt), var(--felt-edge) 120%);
}
.playmat.sigil::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--trim);
  opacity: 0.09;
  mask: var(--tex-sigil) center / min(70%, 520px) no-repeat;
  pointer-events: none;
}
/* Hueco marcado en el tapete, con su rótulo encima del borde inferior. */
.mat-slot {
  position: relative;
  padding: 6px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--trim) 35%, transparent);
  background: rgb(0 0 0 / 18%);
  box-shadow: inset 0 1px 6px rgb(0 0 0 / 45%);
}
.mat-label {
  font-family: var(--fell);
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--trim) 80%, white);
  text-shadow: 0 1px 2px rgb(0 0 0 / 80%);
}
.mat-slot > .mat-label {
  position: absolute;
  left: 50%;
  bottom: -9px;
  transform: translateX(-50%);
  padding: 0 6px;
  white-space: nowrap;
  border-radius: 4px;
  background: color-mix(in srgb, var(--felt-edge) 85%, black);
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
  flex: none;
  height: 52px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  background: #14110c;
  border-bottom: 3px double var(--brass-dark);
}
.brand {
  font-family: var(--display);
  font-size: 1.1rem;
  letter-spacing: 0.06em;
  font-weight: 700;
  color: var(--brass);
  text-decoration: none;
  white-space: nowrap;
}
.disclaimer {
  flex: 1;
  font-family: var(--fell);
  font-style: italic;
  font-size: 0.75rem;
  color: #a89a7c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sections {
  display: flex;
  gap: 14px;
  font-family: var(--fell);
}
.sections a {
  color: #d8c49a;
  text-decoration: none;
  white-space: nowrap;
}
.sections a.router-link-exact-active {
  color: var(--brass);
  border-bottom: 1px solid var(--brass);
}
.topbar nav {
  display: flex;
  gap: 4px;
}
@media (max-width: 600px) {
  .topbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 44px auto;
    height: auto;
    gap: 8px;
    padding: 8px 12px;
  }
  .brand {
    font-size: clamp(0.58rem, 2.6vw, 0.85rem);
  }
  .disclaimer {
    display: none;
  }
  .topbar nav:not(.sections) {
    grid-column: 3;
    grid-row: 1;
  }
  .topbar nav button {
    min-width: 44px;
    min-height: 44px;
    padding: 6px 8px;
  }
  .topbar .sections {
    grid-column: 1 / -1;
    grid-row: 2;
    gap: 14px;
  }
  .topbar .sections a {
    display: flex;
    align-items: center;
    min-height: 44px;
  }
  .topbar .picker {
    grid-column: 2;
    grid-row: 1;
  }
  .topbar .current {
    justify-content: center;
    width: 44px;
    min-height: 44px;
    padding: 0;
    font-size: 0;
    gap: 0;
  }
  .topbar .picker .menu {
    left: auto;
    right: 0;
  }
}
</style>
