<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { account, ApiError } from '../account/api'
import {
  activateCampaign,
  documents,
  editMetadata,
  refreshLibrary,
  resolveConflict,
  syncError,
} from '../account/library'
import { useGameStore } from '../stores/game'
import { useDecksStore } from '../stores/decks'
import { currentScenario } from '@lcg/cards'
import { session, type Session } from '@lcg/saves'
import SitePage from '../components/SitePage.vue'
import SiteAction from '../components/SiteAction.vue'
import DisclosureIcon from '../components/DisclosureIcon.vue'
import { campaignCover, scenarioLabel } from '../game/campaignProgress'

const { t, te } = useI18n(),
  router = useRouter(),
  game = useGameStore()
const showArchived = ref(false),
  busy = ref(false),
  error = ref('')
const campaigns = computed(() =>
  documents.value.filter(
    (d) => d.kind === 'campaign' && !d.deleted && (showArchived.value || !d.archived),
  ),
)
const conflicts = computed(() => documents.value.filter((d) => d.conflict))
const displayName = (name: string) =>
  te(`campaign.names.${name}`) ? t(`campaign.names.${name}`) : name
/** Portada de la campaña y escenario en curso (el de la partida abierta o el siguiente). */
function progress(payload: unknown) {
  const saved = payload as Partial<Session> | null
  const campaign = saved?.campaign ?? null
  let scenario = ''
  try {
    if (campaign)
      scenario = scenarioLabel(campaign, saved?.state?.scenarioId ?? currentScenario(campaign))
  } catch {
    // Campaña desconocida para esta versión: se muestra sin escenario.
  }
  // Sin portada (partida suelta o campaña sin arte) queda el fondo genérico de debajo.
  const art = campaign ? `url('${campaignCover(campaign.id)}')` : 'none'
  return { art, scenario }
}
const progressById = computed(
  () => new Map(campaigns.value.map((d) => [d.id, progress(d.payload)] as const)),
)
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
</script>

<template>
  <SitePage :title="t('account.library')" :subtitle="t('library.subtitle')" icon="campaign">
    <template #actions>
      <SiteAction to="/" icon="+">{{ t('campaign.new') }}</SiteAction>
    </template>
    <template v-if="account.user">
      <p v-if="error || syncError" class="error" role="alert">
        {{ t(`account.errors.${error || syncError}`) }}
      </p>
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
      </div>
      <div class="library-heading">
        <h2>
          {{ t('library.campaigns') }} <span class="library-count">{{ campaigns.length }}</span>
        </h2>
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
          <div class="entry-heading" :style="{ '--entry-art': progressById.get(doc.id)?.art }">
            <p class="entry-label">
              {{ t('setup.campaignLabel')
              }}<span v-if="doc.archived"> · {{ t('library.archived') }}</span>
            </p>
            <h3>{{ displayName(doc.name) }}</h3>
            <p v-if="progressById.get(doc.id)?.scenario" class="entry-scenario">
              {{ progressById.get(doc.id)?.scenario }}
            </p>
          </div>
          <div class="entry-body">
            <div class="entry-status">
              <p>
                {{ t('library.revision', { n: doc.revision }) }} ·
                {{ new Date(doc.updatedAt).toLocaleString() }}
                <span v-if="doc.dirty || doc.operation" class="entry-pending">{{
                  t('account.sync.pending')
                }}</span>
              </p>
              <SiteAction
                class="entry-open"
                icon="→"
                :disabled="busy || doc.conflict"
                @click="run(() => open(doc.id))"
              >
                {{ t('library.open') }}
              </SiteAction>
            </div>
            <div class="entry-actions">
              <details class="entry-options">
                <summary>
                  {{ t('library.manage') }}
                  <DisclosureIcon class="entry-chevron" />
                </summary>
                <div class="management-actions">
                  <button
                    type="button"
                    :disabled="busy"
                    @click="run(() => rename(doc.id, doc.name))"
                  >
                    {{ t('library.rename') }}
                  </button>
                  <button
                    type="button"
                    :disabled="busy"
                    @click="run(() => editMetadata(doc.id, { archived: !doc.archived }))"
                  >
                    {{ doc.archived ? t('library.unarchive') : t('library.archive') }}
                  </button>
                  <button
                    type="button"
                    class="delete-action"
                    :disabled="busy"
                    @click="run(() => deleteCampaign(doc.id))"
                  >
                    {{ t('library.delete') }}
                  </button>
                </div>
              </details>
            </div>
          </div>
        </article>
      </div>
      <footer class="library-actions">
        <RouterLink class="link-button" to="/decks">{{ t('decks.manage') }}</RouterLink>
      </footer>
    </template>
    <div v-else class="empty guest-library">
      <img src="/local-assets/home/icon-investigators.webp" alt="" width="64" height="64" />
      <h2>{{ t('account.archiveTitle') }}</h2>
      <p>{{ t('library.guestHelp') }}</p>
      <div class="guest-actions">
        <SiteAction to="/account" icon="→">{{ t('account.login') }}</SiteAction
        ><SiteAction to="/decks" icon="▤" variant="secondary">{{ t('decks.title') }}</SiteAction>
      </div>
    </div>
  </SitePage>
</template>

<style scoped>
p {
  line-height: 1.6;
  color: var(--muted);
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
  display: flex;
  align-items: center;
  gap: 12px;
}
.library-count {
  color: var(--accent);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 3px 10px;
  font: 600 0.8125rem/1.4 var(--fell);
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
  border-radius: 10px;
  margin-bottom: 20px;
}
.campaign-entry {
  padding: 0;
  overflow: hidden;
  margin: 0;
  align-self: start;
}
/* Cabecera con la portada de la campaña, oscurecida abajo para leer el texto. */
.entry-heading {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 170px;
  padding: 24px 22px 18px;
  background:
    linear-gradient(0deg, #202025f5 8%, #20202599 55%, #2020251a),
    var(--entry-art) center 50% / cover,
    url('/local-assets/home/occult-archive.webp') center 35% / cover;
  border-bottom: 1px solid var(--border);
  text-shadow: 0 1px 3px #000c;
}
.entry-heading .entry-scenario {
  margin: 6px 0 0;
  color: #eadfcd;
  font-size: 0.875rem;
}
.entry-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.entry-status p {
  margin: 0;
}
.entry-pending {
  display: block;
  color: var(--accent);
}
.entry-status .entry-open {
  flex: none;
  font-size: 0.875rem;
}
@media (pointer: fine) {
  .entry-status .entry-open {
    min-height: 36px;
  }
}
.entry-open :deep(.site-action-symbol) {
  min-width: 32px;
  padding: 4px 8px;
  font-size: 1rem;
}
.entry-open :deep(.site-action-label) {
  padding: 6px 14px;
}
.entry-heading h3 {
  font-size: 1.25rem;
  margin: 0;
}
.entry-heading .entry-label {
  margin: 0 0 8px;
  color: var(--accent);
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.entry-body {
  padding: 20px 22px;
}
.entry-body > p:first-child {
  margin-top: 0;
}
.entry-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
}
.entry-options > summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--border);
  padding-top: 10px;
  color: var(--muted);
  cursor: pointer;
  list-style: none;
  font-size: 0.875rem;
}
.entry-options > summary::-webkit-details-marker {
  display: none;
}
.entry-options > summary:hover {
  color: var(--ink);
}
.entry-chevron {
  color: var(--accent);
}
.management-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding-top: 12px;
}
.campaign-entry .management-actions button {
  padding: 4px 10px;
  font-size: 0.8125rem;
}
/* Con ratón, botones compactos; en pantallas táctiles se quedan en 44 px. */
@media (pointer: fine) {
  .campaign-entry .management-actions button {
    min-height: 36px;
  }
}
.management-actions .delete-action {
  background: var(--site-danger);
  grid-column: 1 / -1;
}
.campaign-entry h3 {
  margin: 0 0 8px;
  overflow-wrap: anywhere;
}
.campaign-entry p {
  font-size: 0.875rem;
}
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
  border: 1px solid var(--site-error-border);
  padding: 18px;
  background: var(--site-error-bg);
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
  border-radius: 10px;
}
.empty p {
  margin: 0;
}
.empty img {
  object-fit: contain;
  flex: none;
}
.guest-library {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 16px;
  padding: 48px 24px;
  min-height: 330px;
  background:
    linear-gradient(0deg, var(--site-panel-sunken), #202025e0),
    url('/local-assets/home/occult-archive.webp') center / cover;
}
.guest-library h2 {
  margin: 0;
  font-size: 1.5rem;
}
.guest-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
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
    padding: 0;
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
  .guest-library {
    align-items: center;
    padding: 32px 20px;
  }
  .guest-actions {
    display: grid;
    width: 100%;
    grid-template-columns: minmax(0, 1fr);
  }
  .entry-body {
    padding: 18px;
  }
}
</style>
