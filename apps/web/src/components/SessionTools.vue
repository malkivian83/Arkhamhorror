<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGameStore } from '../stores/game'
import { decodeSession, SessionError, type Session } from '../game/session'

const game = useGameStore()
const { t } = useI18n()
const file = ref<HTMLInputElement>()
const notice = ref('')
const preview = ref<Session | null>(null)
const previewDialog = ref<HTMLDialogElement>()
let pendingImport = ''
const pasted = ref('')

async function prepareImport(raw: string) {
  try {
    preview.value = decodeSession(raw)
    pendingImport = raw
    await nextTick()
    previewDialog.value?.showModal()
    notice.value = ''
  } catch (e) {
    notice.value = e instanceof SessionError ? `session.issue.${e.reason}` : 'session.readFailed'
  }
}

function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function load(event: Event) {
  const input = event.target as HTMLInputElement
  const selected = input.files?.[0]
  if (!selected) return
  try {
    if (selected.size > 20_000_000) throw new Error('size')
    await prepareImport(await selected.text())
  } catch {
    notice.value = 'session.readFailed'
  } finally {
    input.value = ''
  }
}

function applyImport() {
  if (game.importSession(pendingImport)) {
    notice.value = 'session.imported'
    previewDialog.value?.close()
    pendingImport = ''
  }
}

function recover() {
  if (!window.confirm(t('session.confirmRecover'))) return
  notice.value = game.restoreBackup() ? 'session.recoveredNotice' : ''
}
</script>

<template>
  <details class="session-tools">
    <summary>{{ t('session.title') }}</summary>
    <p>{{ t('session.help') }}</p>
    <div class="session-buttons">
      <button
        type="button"
        :disabled="!game.state && !game.campaign"
        @click="download(game.exportSession(), 'arkham-campaign.json')"
      >
        {{ t('session.export') }}
      </button>
      <button type="button" @click="file?.click()">{{ t('session.import') }}</button>
      <button type="button" @click="recover">{{ t('session.recover') }}</button>
      <button type="button" @click="download(game.diagnostic(), 'arkham-diagnostic.json')">
        {{ t('session.diagnostic') }}
      </button>
    </div>
    <input ref="file" type="file" accept=".json,application/json" hidden @change="load" />
    <details class="paste-import">
      <summary>{{ t('session.pasteTitle') }}</summary>
      <label>
        {{ t('session.pasteLabel') }}
        <textarea v-model="pasted" rows="4" spellcheck="false" :maxlength="20000000" />
      </label>
      <button type="button" :disabled="!pasted.trim()" @click="prepareImport(pasted)">
        {{ t('session.preview') }}
      </button>
    </details>
    <p v-if="notice" role="status">{{ t(notice) }}</p>
    <dialog ref="previewDialog" :aria-label="t('session.import')" @keydown.stop>
      <template v-if="preview">
        <h3>{{ t('session.import') }}</h3>
        <p>{{ t('session.confirmImport') }}</p>
        <p v-if="preview.campaign">
          {{
            t(
              `campaign.scenario.${preview.state?.scenarioId ?? preview.campaign.results.at(-1)?.scenario ?? 'spreading-flames'}`,
            )
          }}
          · {{ t(`difficulty.${preview.campaign.difficulty}`) }} ·
          {{ preview.campaign.investigators.length }} {{ t('session.investigators') }}
        </p>
        <div class="session-buttons">
          <button type="button" autofocus @click="previewDialog?.close()">
            {{ t('session.cancel') }}
          </button>
          <button type="button" @click="applyImport">{{ t('session.replace') }}</button>
        </div>
      </template>
    </dialog>
  </details>
</template>

<style scoped>
.session-tools {
  margin: 12px 0;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.9rem;
}
.session-tools p {
  max-width: 60ch;
}
.session-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.session-buttons button {
  min-height: 40px;
}
.paste-import {
  margin: 10px 0;
}
.paste-import label {
  display: grid;
  gap: 6px;
  margin: 8px 0;
}
textarea {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  color: var(--ink);
  background: var(--panel);
  font: inherit;
}
dialog {
  max-width: min(480px, calc(100vw - 40px));
  color: var(--ink);
  background: var(--panel);
  border: 2px solid var(--brass);
  border-radius: 8px;
}
dialog::backdrop {
  background: rgb(0 0 0 / 70%);
}
</style>
