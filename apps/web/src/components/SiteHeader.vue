<script setup lang="ts">
import { LOCALES, type Locale } from '@lcg/shared'
import { onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { account } from '../account/api'
import PlaymatPicker from './PlaymatPicker.vue'

const { t, locale } = useI18n()
const route = useRoute()
const menu = ref<HTMLDetailsElement>()
const menuButton = ref<HTMLElement>()

function closeMenu(restoreFocus = false) {
  if (menu.value) menu.value.open = false
  if (restoreFocus) menuButton.value?.focus()
}

function outside(event: MouseEvent) {
  if (menu.value && !menu.value.contains(event.target as Node)) closeMenu()
}

function setLocale(value: Locale) {
  locale.value = value
  try {
    localStorage.setItem('locale', value)
  } catch {
    // Sin almacenamiento: el idioma solo dura esta sesión.
  }
}

document.addEventListener('click', outside)
onBeforeUnmount(() => document.removeEventListener('click', outside))
watch(
  () => route.fullPath,
  () => closeMenu(),
)
</script>

<template>
  <header class="site-header">
    <div class="header-content">
      <RouterLink to="/" class="site-brand">
        <img
          src="/local-assets/home/arkham-online-lcg.webp"
          :alt="t('app.logo')"
          width="900"
          height="245"
        />
      </RouterLink>
      <nav class="site-links" :aria-label="t('app.sections')">
        <RouterLink to="/">{{ t('app.newGame') }}</RouterLink>
        <RouterLink to="/library">{{ t('account.library') }}</RouterLink>
      </nav>
      <details ref="menu" class="site-menu" @keydown.esc.prevent="closeMenu(true)">
        <summary ref="menuButton" aria-controls="site-menu-content">
          <span aria-hidden="true">☰</span>{{ t('app.menu') }}
        </summary>
        <div id="site-menu-content" class="site-menu-content">
          <nav class="menu-links" :aria-label="t('app.sections')">
            <RouterLink to="/" @click="closeMenu()">{{ t('app.newGame') }}</RouterLink>
            <RouterLink to="/decks" @click="closeMenu()">{{ t('decks.title') }}</RouterLink>
            <RouterLink to="/library" @click="closeMenu()">{{ t('account.library') }}</RouterLink>
            <RouterLink to="/account" @click="closeMenu()">{{
              account.user ? t('account.profile') : t('account.login')
            }}</RouterLink>
          </nav>
          <div class="menu-preference">
            <span>{{ t('app.language') }}</span>
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
          <div class="menu-preference playmat-preference">
            <span>{{ t('app.playmat') }}</span>
            <PlaymatPicker />
          </div>
          <p class="site-disclaimer">{{ t('app.disclaimer') }}</p>
        </div>
      </details>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  --ink: #f4efe7;
  --accent: #e5aa8d;
  --panel: #25252b;
  --panel-2: #25252b;
  --border: #807574;
  position: relative;
  z-index: 50;
  color: var(--ink);
  background: #121216;
  border-bottom: 1px solid var(--border);
  font-family: 'Source Sans 3', system-ui, sans-serif;
}
.header-content {
  max-width: 1180px;
  min-height: 94px;
  margin: auto;
  padding: 16px 36px;
  display: flex;
  align-items: center;
  gap: 28px;
}
.site-brand {
  display: inline-flex;
  flex-shrink: 0;
}
.site-brand img {
  display: block;
  width: 230px;
  height: 62px;
  object-fit: contain;
  object-position: left center;
}
.site-links {
  display: flex;
  gap: 24px;
  margin-left: auto;
}
.site-links a,
.menu-links a {
  display: flex;
  align-items: center;
  min-height: 44px;
  color: var(--ink);
  font-size: 0.9375rem;
  text-decoration: none;
  text-underline-offset: 6px;
}
.site-links a.router-link-exact-active,
.menu-links a.router-link-exact-active {
  color: var(--accent);
  text-decoration: underline;
}
.site-links a:hover,
.menu-links a:hover {
  text-decoration: underline;
}
.site-menu {
  position: relative;
}
.site-menu > summary {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  cursor: pointer;
  list-style: none;
  font-size: 0.9375rem;
}
.site-menu > summary::-webkit-details-marker {
  display: none;
}
.site-menu-content {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: min(310px, calc(100vw - 32px));
  padding: 18px;
  border: 1px solid var(--border);
  background: var(--panel);
  box-shadow: 0 12px 30px #0006;
  border-radius: 3px;
}
.menu-links {
  display: grid;
  gap: 4px;
}
.menu-preference {
  display: grid;
  gap: 10px;
  border-top: 1px solid #61585c;
  margin-top: 14px;
  padding-top: 14px;
  font-size: 0.875rem;
  color: #c3bbb4;
}
.menu-languages {
  display: flex;
  gap: 10px;
}
.menu-languages button {
  min-width: 44px;
  min-height: 44px;
  color: #fff;
  background: #555;
  border: 0;
  border-radius: 4px;
}
.menu-languages button[aria-pressed='true'] {
  background: #7c3c85;
  color: #fff;
}
.menu-languages button:hover:not(:disabled) {
  filter: brightness(1.18);
}
.playmat-preference :deep(.current) {
  width: 100%;
  min-height: 44px;
  font-size: 0.875rem;
}
.playmat-preference :deep(.menu) {
  right: 0;
  width: 100%;
  min-width: 0;
}
.playmat-preference :deep(.menu button) {
  min-height: 44px;
}
.site-disclaimer {
  margin: 18px 0 0;
  color: #c3bbb4;
  font-size: 0.75rem;
  line-height: 1.5;
}
@media (max-width: 680px) {
  .header-content {
    min-height: 82px;
    padding: 16px 20px;
    gap: 16px;
  }
  .site-brand img {
    width: 180px;
    height: 50px;
  }
  .site-links {
    display: none;
  }
  .site-menu {
    margin-left: auto;
  }
}
</style>
