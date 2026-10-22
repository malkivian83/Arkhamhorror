<script setup lang="ts">
import { LOCALES, canAdminister, type Locale } from '@lcg/shared'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import PlaymatPicker from './components/PlaymatPicker.vue'
import SaveGame from './components/SaveGame.vue'
import SiteHeader from './components/SiteHeader.vue'
import { scanLocale } from './game/cards'
import { useCardLocale } from './game/localized'
import './game/playmats'
import { useGameStore } from './stores/game'
import { account } from './account/api'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const game = useGameStore()
const gameMenu = ref<HTMLDialogElement>()
const menuButton = ref<HTMLButtonElement>()
function closeMenu() {
  gameMenu.value?.close()
  menuButton.value?.focus()
}
watch(() => route.fullPath, closeMenu)

function quit() {
  if (!window.confirm(t('setup.confirmQuit'))) return
  game.quit()
  void router.push('/')
}

// Datos de las cartas en el idioma activo (en inglés se usan las imágenes oficiales).
watch(
  locale,
  (value) => {
    document.documentElement.lang = value
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
        <RouterLink to="/" class="brand">
          <img
            class="menu-brand-logo"
            src="/local-assets/home/arkham-online-lcg.webp"
            :alt="t('app.logo')"
            width="900"
            height="245"
          />
        </RouterLink>
        <nav class="sections" :aria-label="t('app.sections')">
          <RouterLink to="/">{{ t('campaign.new') }}</RouterLink>
          <RouterLink to="/decks">{{ t('decks.title') }}</RouterLink>
          <RouterLink to="/library">{{ t('account.library') }}</RouterLink>
          <RouterLink v-if="canAdminister(account.user)" to="/admin">{{
            t('admin.title')
          }}</RouterLink>
          <RouterLink to="/account">{{
            account.user ? t('account.profile') : t('account.login')
          }}</RouterLink>
        </nav>
        <div class="menu-group">
          <span class="menu-label">{{ t('app.playmat') }}</span>
          <PlaymatPicker />
        </div>
        <div class="menu-group">
          <span class="menu-label">{{ t('app.language') }}</span>
          <div class="menu-languages" role="group" :aria-label="t('app.language')">
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
        <SaveGame />
        <button type="button" class="menu-quit" @click="quit">{{ t('setup.quit') }}</button>
        <p class="menu-disclaimer">{{ t('app.disclaimer') }}</p>
      </div>
    </dialog>
  </template>
  <SiteHeader v-else />
  <main :class="{ 'game-shell': route.name === 'game' }">
    <div v-if="game.storageIssue || game.error" class="session-warning" role="alert">
      <p v-if="game.storageIssue">{{ t(`session.issue.${game.storageIssue}`) }}</p>
      <p v-if="game.error">{{ game.error }}</p>
    </div>
    <RouterView />
  </main>
</template>

<style>
.menu-brand-logo {
  display: block;
  width: min(100%, 250px);
  height: auto;
}
.topbar .sections {
  gap: 14px;
  flex-wrap: wrap;
}
.topbar .sections a {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}
@media (min-width: 601px) and (max-width: 1100px) {
  .topbar {
    height: auto;
    min-height: 52px;
    flex-wrap: wrap;
    padding: 8px 16px;
  }
  .topbar .disclaimer {
    display: none;
  }
}
.session-warning {
  padding: 10px 18px;
  color: #451907;
  background: #f4d6a0;
  border: 2px solid #ab5224;
}
.session-warning p {
  margin: 2px 0;
}
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
  color: #e5aa8d;
  background: #121216;
  border-color: #807574;
  border-radius: 3px;
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
  width: 44px;
  padding: 0;
}
.game-menu button,
.game-menu .sections a {
  min-height: 44px;
}
/* Botones del menú: placas de madera con filo de latón, como el escritorio del jugador. */
.game-menu button {
  font-family: var(--fell);
  font-size: 1rem;
  color: var(--parch);
  background: linear-gradient(180deg, #33281a, #1f170d);
  border: 1px solid var(--brass-dark);
  border-radius: 3px;
  box-shadow:
    inset 0 1px 0 rgb(232 220 188 / 10%),
    0 2px 6px rgb(0 0 0 / 45%);
}
.game-menu button:hover:not(:disabled) {
  color: #f6ecd2;
  background: linear-gradient(180deg, #3f3120, #271d11);
  border-color: var(--brass);
}
.menu-group {
  display: grid;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid rgb(200 162 90 / 25%);
}
.menu-label {
  font-family: var(--fell);
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #b8aa8c;
}
.game-menu .picker .current {
  width: 100%;
  gap: 10px;
  padding: 6px 12px;
}
.game-menu .picker ul.menu {
  background: #1c1811;
  border-color: var(--brass-dark);
  border-radius: 3px;
}
.game-menu .picker ul.menu button {
  box-shadow: none;
}
/* Idioma: selector partido, con el idioma activo en latón. */
.game-menu .menu-languages {
  display: flex;
  justify-self: start;
  border: 1px solid var(--brass-dark);
  border-radius: 3px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgb(0 0 0 / 45%);
}
.game-menu .menu-languages button {
  min-width: 64px;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  letter-spacing: 0.1em;
}
.game-menu .menu-languages button + button {
  border-left: 1px solid var(--brass-dark);
}
.game-menu .menu-languages button[aria-pressed='true'] {
  color: #1c1811;
  background: linear-gradient(180deg, #e0bf7c, var(--brass));
  font-weight: 700;
}
/* Guardar partida: separado del resto de opciones del menú. */
.game-menu .save-game {
  margin: 0;
  padding: 16px 0 0;
  border-top: 1px solid rgb(200 162 90 / 25%);
}
.game-menu .save-game p {
  color: #b8aa8c;
  font-size: 0.85rem;
}
/* Abandonar: la única acción destructiva, en lacre y apartada abajo. */
.game-menu .menu-quit {
  margin-top: auto;
  color: #f3d9cc;
  background: linear-gradient(180deg, #5c241a, #3b140e);
  border-color: #9a3a2a;
}
.game-menu .menu-quit:hover:not(:disabled) {
  color: #fff0e8;
  background: linear-gradient(180deg, #70301f, #4a1a12);
  border-color: #c4583f;
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
.menu-disclaimer {
  margin: 0;
  color: #b8aa8c;
  font-family: var(--fell);
  font-size: 0.85rem;
}
/* Flecha de los desplegables (DisclosureIcon). */
.disclosure-icon {
  width: 16px;
  height: 16px;
  flex: none;
  transition: transform 140ms ease-out;
}
details[open] > summary .disclosure-icon {
  transform: rotate(180deg);
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
/*
 * Botones de acción de la mesa (historia, mulligan, avance de acto...): el
 * mismo cobre y pergamino que SiteAction en la web; `.secondary`, en madera.
 */
.table-action {
  --action-top: var(--site-copper-top);
  --action-bottom: var(--site-copper-bottom);
  --action-edge: var(--site-copper-edge);
  --action-ink: var(--site-copper-ink);
  --action-shine: var(--site-copper-shine);
  min-height: 44px;
  padding: 10px 20px;
  color: var(--action-ink);
  background: linear-gradient(180deg, var(--action-top), var(--action-bottom));
  border: 1px solid var(--action-edge);
  border-radius: 7px;
  box-shadow:
    inset 0 1px 0 var(--action-shine),
    inset 0 0 0 3px rgb(64 29 12 / 14%),
    0 3px 0 #24160f,
    0 5px 12px #0005;
  font-family: 'Source Sans 3', system-ui, sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  text-shadow: 0 1px 0 rgb(255 244 212 / 30%);
  transition:
    filter 140ms ease,
    box-shadow 140ms ease,
    translate 140ms ease;
}
.table-action.secondary {
  --action-top: var(--site-wood-top);
  --action-bottom: var(--site-wood-bottom);
  --action-edge: var(--site-wood-edge);
  --action-ink: var(--site-wood-ink);
  --action-shine: #bd8a5966;
  text-shadow: 0 1px 2px #0008;
}
.table-action:hover:not(:disabled) {
  border-color: var(--action-edge);
  filter: brightness(1.1);
  translate: 0 -1px;
}
.table-action:active:not(:disabled) {
  translate: 0 2px;
  box-shadow:
    inset 0 2px 5px #23100855,
    inset 0 0 0 3px rgb(64 29 12 / 14%),
    0 1px 0 #24160f;
}
.table-action:disabled {
  opacity: 0.55;
  filter: saturate(0.35);
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
