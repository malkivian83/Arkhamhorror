<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { createAnalytics, readAnalyticsConsent } from '../analytics'

const { t } = useI18n({
  useScope: 'local',
  messages: {
    es: {
      title: 'Estadísticas de uso',
      description:
        'Si aceptas, Google Analytics utilizará cookies para medir las visitas y el uso de la web. Puedes rechazarlo y seguir jugando, o cambiar tu elección en cualquier momento.',
      accept: 'Aceptar',
      reject: 'Rechazar',
      settings: 'Privacidad · Analytics',
    },
    en: {
      title: 'Usage statistics',
      description:
        'If you accept, Google Analytics will use cookies to measure visits and website usage. You can decline and keep playing, or change your choice at any time.',
      accept: 'Accept',
      reject: 'Decline',
      settings: 'Privacy · Analytics',
    },
  },
})
const open = ref(readAnalyticsConsent() === null)
const analytics = createAnalytics(useRouter(), import.meta.env.PROD)
onBeforeUnmount(analytics.stop)
function choose(value: 'accepted' | 'rejected') {
  analytics.choose(value)
  open.value = false
}
</script>

<template>
  <section v-if="open" class="analytics-consent" aria-labelledby="analytics-title">
    <h2 id="analytics-title">{{ t('title') }}</h2>
    <p>{{ t('description') }}</p>
    <div class="analytics-actions">
      <button type="button" @click="choose('rejected')">{{ t('reject') }}</button>
      <button type="button" @click="choose('accepted')">{{ t('accept') }}</button>
    </div>
  </section>
  <button v-else type="button" class="analytics-settings" @click="open = true">
    {{ t('settings') }}
  </button>
</template>

<style scoped>
.analytics-consent,
.analytics-settings {
  position: fixed;
  z-index: 60;
  bottom: 12px;
  right: 12px;
  color: var(--ink);
  background: var(--panel);
  border: 1px solid var(--brass);
  border-radius: 6px;
  box-shadow: 0 4px 24px #0008;
}
.analytics-consent {
  width: min(460px, calc(100vw - 24px));
  max-height: calc(100dvh - 24px);
  overflow-y: auto;
  padding: 20px;
}
h2 {
  margin: 0;
  font-size: 1.1rem;
}
p {
  line-height: 1.5;
}
.analytics-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.analytics-actions button {
  flex: 1;
  min-height: 44px;
}
.analytics-settings {
  min-height: 44px;
  font-size: 0.75rem;
}
</style>
