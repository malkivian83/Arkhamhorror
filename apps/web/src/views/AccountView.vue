<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { account, api, ApiError } from '../account/api'
import { documents, flush, stopLibrary } from '../account/library'
import type { AuthStatus } from '@lcg/shared'
import SitePage from '../components/SitePage.vue'
import SiteAction from '../components/SiteAction.vue'
import GoogleAccountLink from '../components/GoogleAccountLink.vue'

const { t, locale } = useI18n()
const route = useRoute()
const mode = ref('login')
const accountToken = ref('')
const tokenFlow = computed(() => ['verify', 'reset'].includes(mode.value))
const email = ref(''),
  password = ref(''),
  name = ref(''),
  busy = ref(false)
const notice = ref(''),
  failure = ref('')
watch(
  () => route.hash,
  (hash) => {
    const fragment = new URLSearchParams(hash.slice(1))
    if (['verify', 'reset'].includes(fragment.get('action') ?? '')) {
      mode.value = fragment.get('action')!
      accountToken.value = fragment.get('token') ?? ''
    }
    if (fragment.get('google') && fragment.get('google') !== 'ok')
      failure.value = fragment.get('google')!
    if (fragment.get('password') === 'changed') notice.value = 'passwordChanged'
    if (hash) history.replaceState(history.state, '', location.pathname)
  },
  { immediate: true },
)

function chooseMode(value: string) {
  mode.value = value
  failure.value = ''
  notice.value = ''
}
function requestPasswordChange() {
  mode.value = 'forgot'
  email.value = account.value.user?.email ?? ''
  void submit()
}
async function submit() {
  busy.value = true
  failure.value = ''
  notice.value = ''
  try {
    if (mode.value === 'login') {
      const result = await api<Pick<AuthStatus, 'user' | 'csrf'>>('/auth/login', 'POST', {
        email: email.value,
        password: password.value,
      })
      account.value = { ...account.value, ...result }
      location.assign('/library')
    } else if (mode.value === 'register') {
      await api('/auth/register', 'POST', {
        email: email.value,
        password: password.value,
        name: name.value,
        locale: locale.value,
      })
      notice.value = 'emailSent'
    } else if (mode.value === 'verify') {
      await api('/auth/verify-email', 'POST', { token: accountToken.value })
      notice.value = 'verified'
      accountToken.value = ''
      mode.value = 'login'
    } else if (mode.value === 'reset') {
      await api('/auth/reset-password', 'POST', {
        token: accountToken.value,
        password: password.value,
      })
      notice.value = 'passwordChanged'
      accountToken.value = ''
      password.value = ''
      mode.value = 'login'
      await stopLibrary()
      location.assign('/account#password=changed')
    } else {
      await api(
        `/auth/${mode.value === 'forgot' ? 'forgot-password' : 'resend-verification'}`,
        'POST',
        { email: email.value },
      )
      notice.value = 'emailSent'
    }
  } catch (error) {
    failure.value = error instanceof ApiError ? error.code : 'internal'
  } finally {
    busy.value = false
  }
}
async function logout() {
  if (documents.value.some((d) => d.dirty || d.operation)) {
    await flush()
    if (
      documents.value.some((d) => d.dirty || d.operation) &&
      !window.confirm(t('account.pendingLogout'))
    )
      return
  }
  busy.value = true
  try {
    await api('/auth/logout', 'POST')
    await stopLibrary()
    location.assign('/')
  } catch (error) {
    failure.value = error instanceof ApiError ? error.code : 'internal'
    busy.value = false
  }
}
async function removeAccount() {
  if (!window.confirm(t('account.deleteConfirm'))) return
  busy.value = true
  failure.value = ''
  try {
    await api('/me', 'DELETE', { password: password.value })
    await stopLibrary()
    location.assign('/')
  } catch (error) {
    failure.value = error instanceof ApiError ? error.code : 'internal'
    busy.value = false
  }
}
</script>

<template>
  <SitePage
    class="account-layout"
    :title="account.user ? t('account.profile') : t('account.title')"
    :subtitle="t('account.subtitle')"
    icon="investigators"
  >
    <div class="account-columns">
      <div class="account-page">
        <p v-if="!account.enabled" role="status" class="notice">{{ t('account.unavailable') }}</p>
        <p v-if="failure" role="alert" class="error">{{ t(`account.errors.${failure}`) }}</p>
        <p v-if="notice" role="status" class="notice">{{ t(`account.${notice}`) }}</p>

        <template v-if="account.user && !tokenFlow">
          <h2>{{ account.user.name }}</h2>
          <p>{{ account.user.email }}</p>
          <RouterLink class="link-button" to="/library">{{ t('account.library') }}</RouterLink>
          <GoogleAccountLink v-if="account.google" href="/api/auth/google?link=1">{{
            t('account.linkGoogle')
          }}</GoogleAccountLink>
          <p class="hint">{{ t('account.passwordHelp') }}</p>
          <button type="button" :disabled="busy" @click="requestPasswordChange">
            {{ t('account.passwordLink') }}
          </button>
          <hr />
          <button type="button" :disabled="busy" @click="logout">{{ t('account.logout') }}</button>
          <details class="danger">
            <summary>{{ t('account.deleteAccount') }}</summary>
            <p>{{ t('account.deleteHelp') }}</p>
            <label
              >{{ t('account.password')
              }}<input
                v-model="password"
                type="password"
                autocomplete="current-password"
                maxlength="128"
            /></label>
            <button type="button" :disabled="busy || !password" @click="removeAccount">
              {{ t('account.deleteAccount') }}
            </button>
          </details>
        </template>

        <template v-else>
          <nav class="account-tabs" :aria-label="t('account.options')">
            <button type="button" :aria-pressed="mode === 'login'" @click="chooseMode('login')">
              {{ t('account.login') }}
            </button>
            <button
              type="button"
              :aria-pressed="mode === 'register'"
              @click="chooseMode('register')"
            >
              {{ t('account.register') }}
            </button>
          </nav>
          <h2>{{ t(`account.modes.${mode}`) }}</h2>
          <form :aria-busy="busy" @submit.prevent="submit">
            <label v-if="mode === 'register'"
              >{{ t('account.name')
              }}<input v-model="name" autocomplete="nickname" required maxlength="100"
            /></label>
            <label v-if="!['verify', 'reset'].includes(mode)"
              >{{ t('account.email')
              }}<input v-model="email" type="email" autocomplete="email" required maxlength="254"
            /></label>
            <label v-if="['login', 'register', 'reset'].includes(mode)"
              >{{ t('account.password')
              }}<input
                v-model="password"
                type="password"
                :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
                :minlength="mode === 'login' ? 1 : 12"
                maxlength="128"
                required
                :aria-describedby="mode === 'login' ? undefined : 'password-hint'"
            /></label>
            <p v-if="['register', 'reset'].includes(mode)" id="password-hint" class="hint">
              {{ t('account.passwordHint') }}
            </p>
            <p v-if="mode === 'verify'" class="hint">{{ t('account.verifyHelp') }}</p>
            <SiteAction type="submit" icon="→" :disabled="busy || !account.enabled">
              {{ busy ? t('account.working') : t(`account.actions.${mode}`) }}
            </SiteAction>
          </form>
          <GoogleAccountLink
            v-if="account.google && ['login', 'register'].includes(mode)"
            href="/api/auth/google"
            >{{ t('account.google') }}</GoogleAccountLink
          >
          <div class="secondary-actions">
            <button type="button" @click="mode = 'forgot'">{{ t('account.forgot') }}</button>
            <button type="button" @click="mode = 'resend'">{{ t('account.resend') }}</button>
          </div>
          <RouterLink to="/" class="guest-link">{{ t('account.guest') }} →</RouterLink>
          <p class="hint">{{ t('account.guestHint') }}</p>
        </template>
      </div>
      <aside class="account-context">
        <div class="context-copy">
          <p class="context-eyebrow">{{ t('setup.eyebrow') }}</p>
          <h2>{{ t('account.archiveTitle') }}</h2>
          <p>{{ t('account.archiveHelp') }}</p>
          <nav :aria-label="t('app.sections')">
            <RouterLink to="/" class="context-link"
              ><img
                src="/local-assets/home/icon-campaign.webp"
                alt=""
                width="32"
                height="32"
              /><span>{{ t('campaign.new') }}</span
              ><span aria-hidden="true">↗</span></RouterLink
            >
            <RouterLink to="/decks" class="context-link"
              ><img
                src="/local-assets/home/icon-decks.webp"
                alt=""
                width="32"
                height="32"
              /><span>{{ t('decks.manage') }}</span
              ><span aria-hidden="true">↗</span></RouterLink
            >
          </nav>
        </div>
      </aside>
    </div>
  </SitePage>
</template>

<style scoped>
.account-columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.8fr);
  gap: 32px;
  align-items: start;
}
.account-page {
  min-width: 0;
  padding: 32px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 10px;
}
h2 {
  font: 700 1.375rem/1.4 var(--display);
  margin: 0 0 24px;
  overflow-wrap: anywhere;
}
.account-context {
  position: relative;
  isolation: isolate;
  min-width: 0;
  min-height: 460px;
  display: flex;
  align-items: end;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background:
    linear-gradient(0deg, var(--site-panel-sunken) 14%, #20202599 65%, #20202530),
    url('/local-assets/home/occult-archive.webp') 65% top / cover;
}
.context-copy {
  width: 100%;
  padding: 28px;
}
.context-eyebrow {
  font-size: 0.6875rem;
  color: var(--accent);
  letter-spacing: 0.09em;
  text-transform: uppercase;
}
.context-copy h2 {
  margin-bottom: 12px;
}
.context-copy > p:not(.context-eyebrow) {
  color: var(--muted);
  margin: 0 0 24px;
}
.context-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-block: 14px;
  border-top: 1px solid var(--border);
  text-decoration: none;
  min-height: 56px;
}
.context-link > span:last-child {
  margin-left: auto;
}
.context-link:hover {
  text-decoration: underline;
}
.context-link img {
  object-fit: contain;
  flex: none;
}
.hint {
  color: var(--muted);
  line-height: 1.65;
}
.hint {
  font-size: 0.85rem;
}
form,
label {
  display: grid;
  gap: 10px;
}
form {
  gap: 20px;
}
label {
  margin-bottom: 12px;
}
input:not([type='checkbox']) {
  width: 100%;
  font: inherit;
  padding: 12px;
  color: #f6f0e2;
  background: var(--site-bg);
  border: 1px solid var(--border);
  border-radius: 5px;
  min-height: 46px;
}
button,
.link-button {
  min-height: 44px;
}
.primary {
  margin-top: 8px;
}
.account-tabs,
.secondary-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin: 0 0 24px;
}
.account-tabs {
  flex-wrap: nowrap;
  gap: 4px;
  padding: 4px;
  background: var(--site-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
}
.account-tabs button {
  flex: 1;
  border-color: transparent;
  background: transparent;
}
.secondary-actions {
  gap: 0;
  flex-direction: column;
  align-items: start;
  padding-top: 16px;
  margin-top: 24px;
  border-top: 1px solid var(--border);
}
.secondary-actions button {
  padding-inline: 0;
  color: var(--accent);
  border-color: transparent;
  background: transparent;
  font-size: 0.875rem;
}
.link-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 5px;
  color: var(--accent);
  text-decoration: none;
  margin: 16px 0;
}
.guest-link {
  color: var(--accent);
  text-underline-offset: 5px;
}
.notice,
.error {
  padding: 14px;
  line-height: 1.6;
  border: 1px solid var(--border);
  background: var(--site-panel-raised);
  border-radius: 7px;
  margin: 0 0 24px;
}
.error {
  border-color: #e0a496;
  background: #452722;
  color: #ffe0d8;
}
.check {
  display: flex;
  align-items: center;
  gap: 12px;
}
.check input {
  width: 20px;
  height: 20px;
}
hr {
  border: 0;
  border-top: 1px solid var(--line);
  margin: 24px 0;
}
.danger {
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid #704b48;
}
.danger summary {
  cursor: pointer;
  min-height: 44px;
  align-content: center;
  color: #ffb8a5;
}
.danger button {
  background: var(--site-danger);
  color: #fff;
}
@media (max-width: 800px) {
  .account-columns {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }
  .account-context {
    min-height: 270px;
  }
}
@media (max-width: 600px) {
  .account-page {
    margin: 0;
    max-width: none;
    padding: 22px 18px;
  }
  .context-copy {
    padding: 22px 18px;
  }
}
</style>
