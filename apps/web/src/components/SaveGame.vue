<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { account, ApiError } from '../account/api'
import { saveGame, syncStatus, unsavedGame } from '../account/library'
import { useGameStore } from '../stores/game'

const game = useGameStore()
const { t } = useI18n()
const busy = ref(false)
const notice = ref('')

async function save() {
  busy.value = true
  notice.value = ''
  try {
    await saveGame(game.exportSession())
    notice.value = `account.sync.${syncStatus.value}`
  } catch (e) {
    notice.value = `account.errors.${e instanceof ApiError ? e.code : 'internal'}`
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="save-game">
    <template v-if="account.user">
      <button type="button" :disabled="busy || (!game.state && !game.campaign)" @click="save">
        {{ t('session.save') }}
      </button>
      <p role="status">
        {{
          busy ? t('account.sync.saving') : unsavedGame ? t('session.unsaved') : notice && t(notice)
        }}
      </p>
    </template>
    <p v-else>
      <RouterLink to="/account">{{ t('account.login') }}</RouterLink> · {{ t('session.guest') }}
    </p>
  </div>
</template>

<style scoped>
.save-game {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin: 12px 0;
  font-size: 0.9rem;
}
.save-game button {
  min-height: 40px;
}
.save-game p {
  margin: 0;
  color: var(--muted);
}
</style>
