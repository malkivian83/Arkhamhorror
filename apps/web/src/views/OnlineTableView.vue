<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { account } from '../account/api'
import OnlineGame from '../components/OnlineGame.vue'
const route = useRoute()
const { t } = useI18n()
</script>
<template>
  <OnlineGame
    v-if="account.user"
    :key="`${route.params.id}:${account.user.id}`"
    :room="String(route.params.id)"
  />
  <RouterLink v-else to="/account">{{ t('online.login') }}</RouterLink>
</template>
