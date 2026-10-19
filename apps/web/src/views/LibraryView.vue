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
  <section class="library-page" aria-labelledby="library-title">
    <header>
      <div>
        <p class="eyebrow">ARKHAM HORROR</p>
        <h1 id="library-title">{{ t('account.library') }}</h1>
        <p>{{ t('library.subtitle') }}</p>
      </div>
      <RouterLink to="/" class="link-button">{{ t('campaign.new') }} →</RouterLink>
    </header>
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
      <p v-if="!campaigns.length" class="empty">{{ t('library.empty') }}</p>
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
      <RouterLink class="link-button" to="/decks">{{ t('decks.manage') }}</RouterLink>
      <button
        type="button"
        @click="download({ format: 'lcg-library', version: 1, documents }, 'arkham-library.json')"
      >
        {{ t('library.exportAll') }}
      </button>
    </template>
    <template v-else
      ><p>{{ t('library.guestHelp') }}</p>
      <RouterLink class="link-button" to="/account">{{ t('account.login') }}</RouterLink></template
    >
  </section>
</template>

<style scoped>
.library-page {
  max-width: 1120px;
  margin: 32px auto;
  padding: 24px;
  color: #eeeadd;
}
.library-page > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  border-bottom: 1px solid #69715c;
  padding-bottom: 24px;
}
.eyebrow {
  color: #d6bd81;
  letter-spacing: 0.2em;
  font-size: 0.75rem;
}
h1 {
  font: 400 2.6rem var(--fell);
  margin: 12px 0;
}
h2,
h3 {
  font-family: var(--fell);
  font-weight: 400;
}
p {
  line-height: 1.65;
  color: #c0cbbf;
}
.link-button {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 10px 14px;
  border: 1px solid #899078;
  border-radius: 5px;
  color: #e7d4ac;
  text-decoration: none;
}
.sync-bar,
.library-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 20px 0;
}
.campaign-library {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.campaign-entry,
.conflict,
.import-panel {
  border: 1px solid #69715c;
  padding: 24px;
  background: #1a2924;
  border-radius: 7px;
  margin-bottom: 20px;
}
.campaign-entry h3 {
  font-size: 1.5rem;
  margin: 0 0 8px;
}
.campaign-entry p {
  font-size: 0.8rem;
}
.entry-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
button,
summary {
  min-height: 44px;
}
summary {
  cursor: pointer;
  align-content: center;
}
.error,
.conflict {
  border: 1px solid #d6a286;
  padding: 18px;
  background: #382a22;
}
.error {
  color: #ffe0d8;
}
.conflict button {
  margin: 4px;
}
.import-panel {
  margin-top: 28px;
}
.empty {
  padding: 32px;
  border: 1px dashed #69715c;
}
.library-heading input {
  width: 20px;
  height: 20px;
  vertical-align: middle;
}
@media (max-width: 700px) {
  .library-page {
    padding: 16px;
    margin: 16px auto;
  }
  .campaign-library {
    grid-template-columns: 1fr;
  }
  .library-page > header {
    align-items: flex-start;
    flex-direction: column;
  }
  .library-heading {
    flex-wrap: wrap;
  }
  .campaign-entry {
    padding: 18px;
  }
}
</style>
