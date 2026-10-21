<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { account } from '../account/api'
import SitePreferences from './SitePreferences.vue'

/**
 * Cabecera de la web. En escritorio, las secciones van en la barra, la cuenta a
 * la derecha y las preferencias en un panel; en móvil, todo va en un cajón.
 */
const { t } = useI18n()
const route = useRoute()
const preferences = ref<HTMLDetailsElement>()
const preferencesButton = ref<HTMLElement>()
const drawer = ref<HTMLDialogElement>()
const drawerButton = ref<HTMLButtonElement>()

const sections = [
  { to: '/', label: 'app.newGame' },
  { to: '/decks', label: 'decks.title' },
  { to: '/library', label: 'account.library' },
]

function closePreferences(restoreFocus = false) {
  if (preferences.value) preferences.value.open = false
  if (restoreFocus) preferencesButton.value?.focus()
}

function outside(event: MouseEvent) {
  if (preferences.value && !preferences.value.contains(event.target as Node)) closePreferences()
}

document.addEventListener('click', outside)
onBeforeUnmount(() => document.removeEventListener('click', outside))
watch(
  () => route.fullPath,
  () => {
    closePreferences()
    drawer.value?.close()
  },
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
        <RouterLink v-for="s in sections" :key="s.to" :to="s.to">{{ t(s.label) }}</RouterLink>
      </nav>
      <div class="header-actions">
        <details
          ref="preferences"
          class="site-preferences"
          @keydown.esc.prevent="closePreferences(true)"
        >
          <summary ref="preferencesButton" class="header-button" :title="t('app.preferences')">
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
              <circle cx="16" cy="6" r="2" fill="none" stroke="currentColor" stroke-width="1.8" />
              <circle cx="10" cy="12" r="2" fill="none" stroke="currentColor" stroke-width="1.8" />
              <circle cx="18" cy="18" r="2" fill="none" stroke="currentColor" stroke-width="1.8" />
            </svg>
            <span>{{ t('app.preferences') }}</span>
          </summary>
          <div class="preferences-panel">
            <SitePreferences />
          </div>
        </details>
        <RouterLink to="/account" class="header-button account-link">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.8" />
            <path
              d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
          <span>{{ account.user ? t('account.profile') : t('account.login') }}</span>
        </RouterLink>
      </div>
      <button
        ref="drawerButton"
        type="button"
        class="header-button drawer-toggle"
        :aria-label="t('app.openMenu')"
        aria-haspopup="dialog"
        aria-controls="site-drawer"
        @click="drawer?.showModal()"
      >
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 7h16M4 12h16M4 17h16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>
    <dialog
      id="site-drawer"
      ref="drawer"
      class="site-drawer"
      :aria-label="t('app.menu')"
      @click="$event.target === drawer && drawer?.close()"
      @close="drawerButton?.focus()"
    >
      <div class="drawer-content">
        <div class="drawer-top">
          <span class="drawer-title">{{ t('app.menu') }}</span>
          <button
            type="button"
            class="header-button drawer-close"
            :aria-label="t('app.closeMenu')"
            autofocus
            @click="drawer?.close()"
          >
            ✕
          </button>
        </div>
        <nav class="drawer-links" :aria-label="t('app.sections')">
          <RouterLink v-for="s in sections" :key="s.to" :to="s.to">{{ t(s.label) }}</RouterLink>
        </nav>
        <RouterLink to="/account" class="drawer-account">
          {{ account.user ? t('account.profile') : t('account.login') }}
        </RouterLink>
        <SitePreferences />
      </div>
    </dialog>
  </header>
</template>

<style scoped>
.site-header {
  --ink: #f4efe7;
  --accent: #e5aa8d;
  --panel: #25252b;
  --border: #807574;
  position: relative;
  z-index: 50;
  color: var(--ink);
  background: #121216;
  border-bottom: 1px solid #3c3539;
  font-family: 'Source Sans 3', system-ui, sans-serif;
}
.header-content {
  max-width: 1180px;
  min-height: 84px;
  margin: auto;
  padding: 12px 36px;
  display: flex;
  align-items: center;
  gap: 32px;
}
.site-brand {
  display: inline-flex;
  flex-shrink: 0;
}
.site-brand img {
  display: block;
  width: 210px;
  height: 57px;
  object-fit: contain;
  object-position: left center;
}
.site-links {
  display: flex;
  align-self: stretch;
  gap: 4px;
}
.site-links a {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0 14px;
  color: #d0c7c1;
  font-size: 0.9375rem;
  text-decoration: none;
  white-space: nowrap;
}
/* Sección activa: filete en el borde inferior de la cabecera. */
.site-links a::after {
  content: '';
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: -13px;
  height: 2px;
  background: var(--accent);
  transform: scaleX(0);
  transition: transform 140ms ease-out;
}
.site-links a:hover {
  color: var(--ink);
}
.site-links a:hover::after {
  transform: scaleX(0.4);
}
.site-links a.router-link-exact-active {
  color: var(--ink);
  font-weight: 600;
}
.site-links a.router-link-exact-active::after {
  transform: scaleX(1);
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}
.header-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 44px;
  min-height: 44px;
  padding: 0 14px;
  color: var(--ink);
  background: transparent;
  border: 1px solid #4a4347;
  border-radius: 3px;
  font: inherit;
  font-size: 0.9375rem;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
}
.header-button:hover {
  background: #25252b;
  border-color: var(--accent);
}
.icon {
  width: 20px;
  height: 20px;
  flex: none;
}
.account-link {
  color: #19191d;
  background: var(--accent);
  border-color: var(--accent);
  font-weight: 600;
}
.account-link:hover {
  background: #f0c2a8;
}
.account-link.router-link-active {
  color: var(--accent);
  background: transparent;
}
.site-preferences {
  position: relative;
}
.site-preferences > summary {
  list-style: none;
}
.site-preferences > summary::-webkit-details-marker {
  display: none;
}
.site-preferences[open] > summary {
  background: #25252b;
  border-color: var(--accent);
}
.preferences-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 340px;
  padding: 20px;
  background: var(--panel);
  border: 1px solid #4a4347;
  border-radius: 4px;
  box-shadow: 0 16px 40px #0008;
}
.drawer-toggle {
  display: none;
  margin-left: auto;
  padding: 0;
}
/* Cajón móvil: entra desde la derecha, donde está el botón que lo abre. */
.site-drawer {
  position: fixed;
  inset: 0 0 0 auto;
  margin: 0;
  width: min(360px, 88vw);
  max-width: none;
  height: 100dvh;
  max-height: none;
  padding: 0;
  color: var(--ink);
  background: #1c1c21;
  border: 0;
  border-left: 1px solid #4a4347;
  box-shadow: -12px 0 40px #0008;
}
.site-drawer[open] {
  animation: drawer-enter 160ms ease-out;
}
@keyframes drawer-enter {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}
.site-drawer::backdrop {
  background: #0009;
}
.drawer-content {
  display: grid;
  gap: 24px;
  padding: 16px 20px 28px;
}
.drawer-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.drawer-title {
  color: #c3bbb4;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.drawer-close {
  padding: 0;
  font-size: 1rem;
}
.drawer-links {
  display: grid;
  border-top: 1px solid #3c3539;
}
.drawer-links a {
  display: flex;
  align-items: center;
  min-height: 52px;
  padding: 0 12px;
  color: var(--ink);
  font-size: 1.0625rem;
  text-decoration: none;
  border-bottom: 1px solid #3c3539;
  border-left: 3px solid transparent;
}
.drawer-links a.router-link-exact-active {
  color: var(--accent);
  font-weight: 600;
  border-left-color: var(--accent);
  background: #25252b;
}
.drawer-account {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  color: #19191d;
  background: var(--accent);
  border-radius: 3px;
  font-weight: 600;
  text-decoration: none;
}
.drawer-account.router-link-active {
  color: var(--accent);
  background: transparent;
  border: 1px solid var(--accent);
}
:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
}
@media (max-width: 860px) {
  .header-content {
    gap: 20px;
    padding: 12px 24px;
  }
  .site-links a {
    padding: 0 10px;
  }
  .site-preferences summary span {
    display: none;
  }
}
@media (max-width: 700px) {
  .header-content {
    min-height: 72px;
    padding: 12px 16px;
  }
  .site-brand img {
    width: 170px;
    height: 46px;
  }
  .site-links,
  .header-actions {
    display: none;
  }
  .drawer-toggle {
    display: inline-flex;
  }
}
</style>
