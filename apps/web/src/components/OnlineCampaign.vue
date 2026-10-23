<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { OnlineCampaignView, OnlineProgressAction } from '@lcg/shared'
import { cardName } from '../game/cards'
import GameCard from './GameCard.vue'
import { localName } from '../game/localized'

const props = defineProps<{ campaign: OnlineCampaignView; disabled: boolean }>()
const emit = defineEmits<{ action: [action: OnlineProgressAction] }>()
const { t } = useI18n()
const name = (code: string) => localName(cardName(code))
const selected = ref(''),
  remove = ref(''),
  search = ref('')
const key = (o: { code: string; replaces?: string }) => `${o.code}:${o.replaces ?? ''}`
const options = computed(() =>
  (props.campaign.own?.options ?? []).filter(
    (o) =>
      name(o.code).toLocaleLowerCase().includes(search.value.toLocaleLowerCase()) ||
      o.code.includes(search.value),
  ),
)
const option = computed(() => props.campaign.own?.options.find((o) => key(o) === selected.value))
function buy() {
  if (!option.value) return
  emit('action', {
    action: 'purchase',
    card: option.value.code,
    upgrade: !!option.value.replaces,
    ...(option.value.needsRemoval ? { remove: remove.value } : {}),
  })
}
</script>

<template>
  <section class="campaign">
    <h3>{{ t('online.campaignPlay.title') }}</h3>
    <p v-if="campaign.canContinue">
      {{
        t('online.campaignPlay.next', { scenario: t(`campaign.scenario.${campaign.nextScenario}`) })
      }}
    </p>
    <p v-else>{{ t('online.campaignPlay.ended') }}</p>
    <ul>
      <li v-for="member in campaign.members" :key="member.investigator">
        {{
          t('online.campaignPlay.member', { ...member, investigator: name(member.investigator) })
        }}
        —
        {{
          !member.active
            ? t('online.campaignPlay.inactive')
            : member.ready
              ? t('online.ready')
              : t('online.waiting')
        }}
      </li>
    </ul>
    <template v-if="campaign.own && campaign.canContinue">
      <details>
        <summary>{{ t('online.deck') }}</summary>
        <ul>
          <li v-for="(code, index) in campaign.own.deck" :key="index">{{ name(code) }}</li>
        </ul>
      </details>
      <fieldset :disabled="disabled">
        <legend>{{ t('online.campaignPlay.upgrade') }}</legend>
        <label>{{ t('online.campaignPlay.search') }}<input v-model="search" type="search" /></label>
        <label
          >{{ t('online.campaignPlay.card') }}
          <select v-model="selected">
            <option value="">{{ t('online.campaignPlay.chooseCard') }}</option>
            <option v-for="o in options" :key="key(o)" :value="key(o)">
              {{ name(o.code) }} · {{ o.cost }} XP
              {{ o.replaces ? t('online.campaignPlay.replaces', { card: name(o.replaces) }) : '' }}
            </option>
          </select>
        </label>
        <GameCard v-if="option" :code="option.code" :name="name(option.code)" :width="240" />
        <label v-if="option?.needsRemoval"
          >{{ t('online.campaignPlay.remove') }}
          <select v-model="remove">
            <option value="">{{ t('online.campaignPlay.chooseCard') }}</option>
            <option v-for="code in campaign.own.removable" :key="code" :value="code">
              {{ name(code) }}
            </option>
          </select>
        </label>
        <button
          :disabled="!option || (option.needsRemoval && !campaign.own.removable.includes(remove))"
          @click="buy"
        >
          {{ t('online.campaignPlay.buy') }}
        </button>
        <button @click="emit('action', { action: 'ready', ready: !campaign.ready })">
          {{ campaign.ready ? t('online.unready') : t('online.ready') }}
        </button>
      </fieldset>
    </template>
    <button
      v-if="campaign.canManage && campaign.canContinue"
      :disabled="disabled || !campaign.allReady"
      @click="emit('action', { action: 'next' })"
    >
      {{ t('online.campaignPlay.start') }}
    </button>
  </section>
</template>

<style scoped>
.campaign {
  border: 1px solid currentColor;
  padding: 1rem;
  margin-block: 1rem;
}
fieldset {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
label {
  display: flex;
  flex-direction: column;
  max-width: 100%;
}
input,
select,
button {
  padding: 0.5rem;
  font: inherit;
  max-width: 100%;
}
</style>
