<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  canAdminister,
  type AdminOverview,
  type AdminUser,
  type AdminActivity,
  type AdminPage,
} from '@lcg/shared'
import { account, api, ApiError } from '../account/api'
import SitePage from '../components/SitePage.vue'

const { t, locale } = useI18n()
const allowed = computed(() => canAdminister(account.value.user))
const section = ref<'users' | 'access' | 'mail'>('users')
const search = ref('')
const page = ref(0)
const overview = ref<AdminOverview>()
const users = ref<AdminUser[]>([])
const activity = ref<AdminActivity[]>([])
const more = ref(false)
const busy = ref(false)
const error = ref('')
const actionBusy = ref(false)
const actionError = ref('')
const notice = ref('')
let request = 0
async function manageUser(user: AdminUser, action: 'activate' | 'resend-verification') {
  if (actionBusy.value) return
  if (action === 'activate' && !window.confirm(t('admin.activateConfirm', { email: user.email })))
    return
  actionBusy.value = true
  actionError.value = ''
  notice.value = ''
  try {
    await api(`/admin/users/${encodeURIComponent(user.id)}/${action}`, 'POST')
    await load()
    notice.value = action === 'activate' ? 'activated' : 'verificationSent'
  } catch (e) {
    const code = e instanceof ApiError ? e.code : 'internal'
    actionError.value = ['mail_unavailable', 'already_verified', 'not_found'].includes(code)
      ? code
      : 'actionFailed'
  } finally {
    actionBusy.value = false
  }
}
function date(value: number | null) {
  return value ? new Date(Number(value)).toLocaleString(locale.value) : t('admin.unknown')
}
async function load() {
  const version = ++request
  overview.value = undefined
  users.value = []
  activity.value = []
  more.value = false
  error.value = ''
  busy.value = false
  if (!allowed.value) return
  busy.value = true
  try {
    const query = new URLSearchParams({ page: String(page.value), search: search.value })
    const [summary, result] = await Promise.all([
      api<AdminOverview>('/admin/overview'),
      api<AdminPage<AdminUser | AdminActivity>>(`/admin/${section.value}?${query}`),
    ])
    if (version !== request) return
    overview.value = summary
    if (section.value === 'users') users.value = result.items as AdminUser[]
    else activity.value = result.items as AdminActivity[]
    more.value = result.more
  } catch (e) {
    if (version === request)
      error.value = e instanceof ApiError && [401, 403].includes(e.status) ? 'denied' : 'error'
  } finally {
    if (version === request) busy.value = false
  }
}
function filter() {
  if (page.value) page.value = 0
  else void load()
}
watch(
  [() => account.value.user, section],
  () => {
    if (page.value) page.value = 0
    else void load()
  },
  { immediate: true },
)
watch(page, load)
</script>

<template>
  <SitePage :title="t('admin.title')" :eyebrow="t('admin.eyebrow')" icon="investigators">
    <div class="admin-dashboard">
      <header class="admin-heading">
        <button v-if="allowed" :disabled="busy" @click="load">{{ t('admin.refresh') }}</button>
      </header>
      <p v-if="!allowed" role="alert">
        {{ t('admin.denied') }} <RouterLink to="/account">{{ t('account.login') }}</RouterLink>
      </p>
      <template v-else>
        <p>{{ t('admin.description') }}</p>
        <p v-if="error" role="alert">{{ t(`admin.${error}`) }}</p>
        <p v-if="actionError" role="alert">{{ t(`admin.${actionError}`) }}</p>
        <p v-if="notice" role="status">{{ t(`admin.${notice}`) }}</p>
        <p v-if="busy" role="status">{{ t('admin.loading') }}</p>
        <div v-if="overview" class="admin-metrics">
          <article
            v-for="key in ['users', 'verified', 'sessions', 'documents', 'failedMail'] as const"
            :key="key"
          >
            <span>{{ t(`admin.${key}`) }}</span
            ><strong>{{ overview[key] }}</strong>
          </article>
        </div>
        <section v-if="overview" class="admin-services">
          <h2>{{ t('admin.services') }}</h2>
          <p>
            {{ t('admin.smtp') }}: {{ t(overview.smtp ? 'admin.configured' : 'admin.missing') }} ·
            {{ t('admin.google') }}: {{ t(overview.google ? 'admin.configured' : 'admin.missing') }}
          </p>
          <p>{{ t('admin.servicesNote') }}</p>
        </section>
        <nav class="admin-tabs" :aria-label="t('admin.sections')">
          <button
            v-for="tab in ['users', 'access', 'mail'] as const"
            :key="tab"
            :aria-pressed="section === tab"
            @click="section = tab"
          >
            {{ t(`admin.${tab}`) }}
          </button>
        </nav>
        <form class="admin-search" @submit.prevent="filter">
          <label for="admin-search">{{ t('admin.search') }}</label>
          <input id="admin-search" v-model="search" type="search" maxlength="100" />
          <button :disabled="busy">{{ t('admin.apply') }}</button>
        </form>
        <p>
          {{
            t(
              section === 'users'
                ? 'admin.usersNote'
                : section === 'mail'
                  ? 'admin.mailNote'
                  : 'admin.accessNote',
            )
          }}
        </p>
        <div class="admin-table" tabindex="0" role="region" :aria-label="t(`admin.${section}`)">
          <table v-if="section === 'users'">
            <caption>
              {{
                t('admin.users')
              }}
            </caption>
            <thead>
              <tr>
                <th>{{ t('admin.person') }}</th>
                <th>{{ t('admin.state') }}</th>
                <th>{{ t('admin.registered') }}</th>
                <th>{{ t('admin.lastAccess') }}</th>
                <th>{{ t('admin.sessions') }}</th>
                <th>{{ t('admin.documents') }}</th>
                <th>{{ t('admin.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>{{ user.name }}<br />{{ user.email }}</td>
                <td>
                  {{ t(user.verified ? 'admin.verifiedAccount' : 'admin.pendingAccount') }}<br />{{
                    t(user.role === 'admin' ? 'admin.administrator' : 'admin.user')
                  }}
                </td>
                <td>{{ date(user.created_at) }}</td>
                <td>{{ date(user.last_access) }}</td>
                <td>{{ user.sessions }}</td>
                <td>{{ user.documents }}</td>
                <td>
                  <div v-if="!user.verified" class="admin-user-actions">
                    <button
                      :disabled="busy || actionBusy"
                      @click="manageUser(user, 'resend-verification')"
                    >
                      {{ t('admin.resendVerification') }}
                    </button>
                    <button :disabled="busy || actionBusy" @click="manageUser(user, 'activate')">
                      {{ t('admin.activate') }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <table v-else>
            <caption>
              {{
                t(`admin.${section}`)
              }}
            </caption>
            <thead>
              <tr>
                <th>{{ t('admin.date') }}</th>
                <th>{{ t('admin.person') }}</th>
                <th>{{ t('admin.type') }}</th>
                <th>{{ t('admin.result') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="event in activity" :key="event.id">
                <td>{{ date(event.created_at) }}</td>
                <td>{{ event.email }}</td>
                <td>{{ t(`admin.${event.kind}`) }}</td>
                <td>
                  {{
                    t(
                      event.status === 'success' && section === 'mail'
                        ? 'admin.accepted'
                        : `admin.${event.status}`,
                    )
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="!busy && !error && !users.length && !activity.length">{{ t('admin.empty') }}</p>
        <div class="admin-pagination">
          <button :disabled="busy || page === 0" @click="page--">{{ t('admin.previous') }}</button>
          <span>{{ t('admin.page', { page: page + 1 }) }}</span>
          <button :disabled="busy || !more" @click="page++">{{ t('admin.next') }}</button>
        </div>
      </template>
    </div>
  </SitePage>
</template>

<style scoped>
.admin-dashboard {
  max-width: 1200px;
  margin: auto;
  padding: 24px;
}
.admin-heading,
.admin-tabs,
.admin-search,
.admin-pagination {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}
.admin-heading {
  justify-content: space-between;
}
.eyebrow {
  color: var(--brass);
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.admin-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin: 24px 0;
}
.admin-metrics article,
.admin-services {
  padding: 20px;
  border: 1px solid var(--brass-dark);
  background: var(--panel);
  border-radius: 8px;
}
.admin-metrics strong {
  display: block;
  font-size: 2rem;
  color: var(--brass);
  margin-top: 8px;
}
.admin-services {
  margin-bottom: 24px;
}
.admin-services h2 {
  margin-top: 0;
}
.admin-search {
  margin-top: 20px;
}
input {
  color: var(--ink);
  background: var(--panel);
  border: 1px solid var(--brass-dark);
  padding: 12px;
  max-width: 100%;
}
button {
  min-height: 44px;
}
.admin-table {
  overflow-x: auto;
}
.admin-user-actions {
  display: grid;
  gap: 10px;
}
table {
  width: 100%;
  border-collapse: collapse;
}
caption {
  text-align: left;
  font-size: 1.3rem;
  padding: 16px 0;
}
th,
td {
  text-align: left;
  padding: 14px;
  border-bottom: 1px solid var(--border);
  overflow-wrap: anywhere;
  min-width: 120px;
}
th {
  color: var(--brass);
}
.admin-pagination {
  justify-content: center;
  margin: 24px 0;
}
@media (max-width: 600px) {
  .admin-dashboard {
    padding: 12px;
  }
}
</style>
