<script setup lang="ts">
import { createGame } from '@lcg/engine'
import type { HealthResponse } from '@lcg/shared'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const online = ref<boolean | null>(null)
const demo = createGame({ seed: 1, players: ['demo'] })

onMounted(async () => {
  try {
    const res = await fetch('/api/health')
    online.value = res.ok && ((await res.json()) as HealthResponse).status === 'ok'
  } catch {
    online.value = false
  }
})
</script>

<template>
  <section>
    <p>
      {{ t('home.serverStatus') }}:
      <strong v-if="online !== null">{{ online ? t('home.online') : t('home.offline') }}</strong>
    </p>
    <p>{{ t(`phase.${demo.phase}`) }} · {{ demo.round }}</p>
  </section>
</template>
