<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { account, api, ApiError } from '../account/api'
import {
  activateCampaign,
  documents,
  editMetadata,
  refreshLibrary,
  resolveConflict,
  saveDocument,
  syncError,
  syncStatus,
} from '../account/library'
import { useGameStore } from '../stores/game'
import { useDecksStore } from '../stores/decks'
import { decodeSession, session } from '@lcg/saves'
import SitePage from '../components/SitePage.vue'

const { t, te } = useI18n(),
  router = useRouter(),
  game = useGameStore()
const showArchived = ref(false),
  busy = ref(false),
  error = ref(''),
  notice = ref('')
const campaigns = computed(() =>
  documents.value.filter(
    (d) => d.kind === 'campaign' && !d.deleted && (showArchived.value || !d.archived),
  ),
)
const conflicts = computed(() => documents.value.filter((d) => d.conflict))
const displayName = (name: string) =>
  te(`campaign.names.${name}`) ? t(`campaign.names.${name}`) : name
const confirm = (message: string) => window.confirm(message)
onMounted(() => {
  if (account.value.user)
    void run(async () => {
      await refreshLibrary()
      useDecksStore().reload()
    })
})
async function run(action: () => Promise<unknown>) {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await action()
  } catch (e) {
    error.value = e instanceof ApiError ? e.code : 'invalid_save'
  } finally {
    busy.value = false
  }
}
async function open(id: string) {
  if (await activateCampaign(id, game.importSession))
    await router.push(game.state ? '/game' : '/campaign')
}
async function handleConflict(id: string, keep: boolean, name?: string) {
  if (!keep && !confirm(t('library.discardConfirm'))) return
  if (await resolveConflict(id, keep, name))
    game.importSession(JSON.stringify(session(null, null, null)))
  useDecksStore().reload()
}
async function deleteCampaign(id: string) {
  if (!confirm(t('library.deleteConfirm'))) return
  if (await editMetadata(id, { deleted: true }))
    game.importSession(JSON.stringify(session(null, null, null)))
}
async function rename(id: string, current: string) {
  const name = window.prompt(t('library.rename'), current)
  if (name?.trim()) await editMetadata(id, { name: name.trim().slice(0, 160) })
}
function download(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
async function restore(id: string) {
  const result = await api<{ revisions: { revision: number }[] }>(`/library/${id}/revisions`)
  const revision = window.prompt(
    t('library.revisionPrompt', { revisions: result.revisions.map((r) => r.revision).join(', ') }),
  )
  if (!revision || !result.revisions.some((r) => r.revision === Number(revision))) return
  const resultSave = await api<{ payload: unknown }>(`/library/${id}/revisions/${revision}`)
  decodeSession(JSON.stringify(resultSave.payload))
  const doc = documents.value.find((d) => d.id === id)!
  await saveDocument('campaign', doc.name, resultSave.payload)
  notice.value = 'restored'
}
</script>

<template>
  <SitePage :title="t('account.library')" :subtitle="t('library.subtitle')" icon="campaign">
    <template #actions>
      <RouterLink to="/" class="link-button primary">{{ t('campaign.new') }} →</RouterLink>
    </template>
    <template v-if="account.user">
      <div class="sync-bar">
        <p role="status">{{ t(`account.sync.${syncStatus}`) }}</p>
      </div>
      <p v-if="error || syncError" class="error" role="alert">
        {{ t(`account.errors.${error || syncError}`) }}
      </p>
      <p v-if="notice" role="status">{{ t(`library.${notice}`) }}</p>
      <div v-for="conflict in conflicts" :key="conflict.id" class="conflict">
        <h2>{{ t('library.conflictTitle') }}: {{ conflict.name }}</h2>
        <p>{{ t('library.conflictHelp') }}</p>
        <button
          type="button"
          :disabled="busy"
          @click="
            run(() =>
              handleConflict(
                conflict.id,
                true,
                t('library.copyName', { name: displayName(conflict.name) }),
              ),
            )
          "
        >
          {{ t('library.keepCopy') }}
        </button>
        <button
          type="button"
          :disabled="busy"
          @click="run(() => handleConflict(conflict.id, false))"
        >
          {{ t('library.useRemote') }}
        </button>
        <button type="button" @click="download(conflict.payload, 'arkham-local-copy.json')">
          {{ t('session.export') }}
        </button>
      </div>
      <div class="library-heading">
        <h2>{{ t('library.campaigns') }}</h2>
        <label
          ><input v-model="showArchived" type="checkbox" /> {{ t('library.showArchived') }}</label
        >
      </div>
      <div v-if="!campaigns.length" class="empty">
        <img src="/local-assets/home/icon-campaign.webp" alt="" width="48" height="48" />
        <p>{{ t('library.empty') }}</p>
      </div>
      <div class="campaign-library">
        <article v-for="doc in campaigns" :key="doc.id" class="campaign-entry">
          <h3>{{ displayName(doc.name) }}</h3>
          <p>
            {{ t('library.revision', { n: doc.revision }) }} ·
            {{ new Date(doc.updatedAt).toLocaleString() }}
          </p>
          <p v-if="doc.dirty || doc.operation">{{ t('account.sync.pending') }}</p>
          <div class="entry-actions">
            <button
              type="button"
              class="primary"
              :disabled="busy || doc.conflict"
              @click="run(() => open(doc.id))"
            >
              {{ t('library.open') }}
            </button>
            <button type="button" :disabled="busy" @click="run(() => rename(doc.id, doc.name))">
              {{ t('library.rename') }}
            </button>
            <button
              type="button"
              :disabled="busy"
              @click="run(() => editMetadata(doc.id, { archived: !doc.archived }))"
            >
              {{ doc.archived ? t('library.unarchive') : t('library.archive') }}
            </button>
            <button type="button" @click="download(doc.payload, 'arkham-campaign.json')">
              {{ t('session.export') }}
            </button>
            <button
              type="button"
              :disabled="busy || !doc.revision"
              @click="run(() => restore(doc.id))"
            >
              {{ t('library.restore') }}
            </button>
            <button type="button" :disabled="busy" @click="run(() => deleteCampaign(doc.id))">
              {{ t('library.delete') }}
            </button>
          </div>
        </article>
      </div>
      <footer class="library-actions">
        <RouterLink class="link-button" to="/decks">{{ t('decks.manage') }}</RouterLink>
        <button
          type="button"
          @click="download({ format: 'lcg-library', version: 1, documents }, 'arkham-library.json')"
        >
          {{ t('library.exportAll') }}
        </button>
      </footer>
    </template>
    <div v-else class="empty guest-library">
      <img src="/local-assets/home/icon-investigators.webp" alt="" width="48" height="48" />
      <p>{{ t('library.guestHelp') }}</p>
      <RouterLink class="link-button" to="/account">{{ t('account.login') }}</RouterLink>
    </div>
  </SitePage>
</template>

<style scoped>
p {
  line-height: 1.6;
  color: var(--muted);
}
.sync-bar {
  margin: 0 0 20px;
  font-size: 0.875rem;
}
.sync-bar p {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.sync-bar p::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}
.library-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 20px 0;
}
.library-heading h2 {
  margin: 0;
}
.library-heading label {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
}
.campaign-library {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.campaign-entry,
.conflict {
  min-width: 0;
  border: 1px solid var(--line);
  padding: 24px;
  background: var(--panel);
  border-radius: 4px;
  margin-bottom: 20px;
}
.campaign-entry h3 {
  margin: 0 0 8px;
  overflow-wrap: anywhere;
}
.campaign-entry p {
  font-size: 0.875rem;
}
.entry-actions,
.library-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.library-actions {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
}
.error,
.conflict {
  border: 1px solid #df9f8d;
  padding: 18px;
  background: #38282b;
}
.error {
  color: #ffd8cd;
}
.conflict button {
  margin: 4px;
}
.empty {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 32px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 4px;
}
.empty p {
  margin: 0;
}
.empty img {
  object-fit: contain;
  flex: none;
}
.guest-library {
  flex-wrap: wrap;
}
.guest-library p {
  flex: 1;
  min-width: min(240px, 100%);
}
@media (max-width: 700px) {
  .campaign-library {
    grid-template-columns: 1fr;
  }
  .library-heading {
    flex-wrap: wrap;
    gap: 8px;
  }
  .campaign-entry {
    padding: 18px;
  }
  .empty {
    flex-direction: column;
    align-items: flex-start;
    padding: 24px;
    gap: 12px;
  }
  .library-actions {
    flex-direction: column;
  }
}
</style>
