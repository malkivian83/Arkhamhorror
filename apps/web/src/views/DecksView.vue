<script setup lang="ts">
import {
  emptyDeck,
  investigatorCards,
  STARTER_DECKS,
  starterDeckList,
  type DeckList,
} from '@lcg/cards'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import DeckSummaryCard from '../components/DeckSummaryCard.vue'
import DisclosureIcon from '../components/DisclosureIcon.vue'
import SitePage from '../components/SitePage.vue'
import SiteAction from '../components/SiteAction.vue'
import { cardName } from '../game/cards'
import { localName } from '../game/localized'
import { newDeckId, useDecksStore } from '../stores/decks'

const { t } = useI18n()
const router = useRouter()
const store = useDecksStore()
const name = (code: string) => localName(cardName(code))
const investigators = investigatorCards()
const newInvestigator = ref(investigators[0]?.code ?? '')
const fromStarter = ref(true)

function create() {
  const id = newDeckId()
  const starter = Object.entries(STARTER_DECKS).find(
    ([, list]) => `12${String(list.investigator).padStart(3, '0')}` === newInvestigator.value,
  )?.[0]
  const title = t('decks.newName', { name: name(newInvestigator.value) })
  const deck =
    fromStarter.value && starter
      ? starterDeckList(starter, id, title)
      : emptyDeck(newInvestigator.value, id, title)
  store.save(deck)
  void router.push({ name: 'deck-editor', params: { id } })
}

function remove(deck: DeckList) {
  if (window.confirm(t('decks.confirmDelete', { name: deck.name }))) store.remove(deck.id)
}

// ------------------------------------------------------------- Importar
const importInput = ref('')
const importing = ref(false)
const importMessage = ref<string | null>(null)

async function importDeck() {
  importing.value = true
  importMessage.value = null
  const result = await store.importFromArkhamDb(importInput.value)
  importing.value = false
  if (!result.ok) {
    importMessage.value = t(`decks.import.${result.error}`)
    return
  }
  importInput.value = ''
  importMessage.value = result.unknown.length
    ? t('decks.import.partial', { n: result.unknown.length })
    : t('decks.import.done', { name: result.deck.name })
}
</script>

<template>
  <SitePage :title="t('decks.title')" :subtitle="t('decks.subtitle')" icon="decks">
    <template #actions
      ><SiteAction to="/" icon="→">{{ t('setup.begin') }}</SiteAction></template
    >
    <div class="deck-tools">
      <details class="box deck-tool" :open="!store.decks.length">
        <summary>
          <span>{{ t('decks.new') }}</span
          ><DisclosureIcon class="disclosure" />
        </summary>
        <div class="tool-body">
          <label>
            {{ t('table.investigator') }}
            <select v-model="newInvestigator">
              <option v-for="i in investigators" :key="i.code" :value="i.code">
                {{ name(i.code) }}
              </option>
            </select>
          </label>
          <label class="check">
            <input v-model="fromStarter" type="checkbox" />
            {{ t('decks.fromStarter') }}
          </label>
          <SiteAction icon="+" @click="create">{{ t('decks.create') }}</SiteAction>
        </div>
      </details>

      <details class="box deck-tool">
        <summary>
          <span>{{ t('decks.import.title') }}</span
          ><DisclosureIcon class="disclosure" />
        </summary>
        <div class="tool-body">
          <form @submit.prevent="importDeck">
            <input
              v-model="importInput"
              type="text"
              :placeholder="t('decks.import.placeholder')"
              :aria-label="t('decks.import.title')"
            />
            <SiteAction
              type="submit"
              icon="↓"
              variant="secondary"
              :disabled="importing || !importInput.trim()"
            >
              {{ importing ? t('decks.import.loading') : t('decks.import.action') }}
            </SiteAction>
          </form>
          <p v-if="importMessage" class="message" role="status">{{ importMessage }}</p>
        </div>
      </details>
    </div>
    <section :aria-label="t('decks.yourDecks')">
      <div class="list-heading">
        <h2>
          {{ t('decks.yourDecks') }} <span>{{ store.decks.length }}</span>
        </h2>
        <p v-if="store.decks.length">{{ t('decks.listHelp') }}</p>
      </div>
      <div v-if="store.decks.length" class="deck-list">
        <DeckSummaryCard v-for="deck in store.decks" :key="deck.id" :deck="deck" @remove="remove" />
      </div>
      <div v-else class="empty">
        <img src="/local-assets/home/icon-decks.webp" alt="" width="64" height="64" />
        <h3>{{ t('decks.none') }}</h3>
        <p>{{ t('decks.emptyHelp') }}</p>
      </div>
    </section>
  </SitePage>
</template>

<style scoped>
.deck-tools {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 16px;
  margin-bottom: 32px;
}
.box {
  min-width: 0;
  background: var(--site-panel-sunken);
  border: 1px solid var(--border);
  border-radius: 10px;
}
summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  cursor: pointer;
  list-style: none;
  font-weight: 600;
}
summary::-webkit-details-marker {
  display: none;
}
.disclosure {
  margin-left: auto;
  color: var(--accent);
}
.tool-body,
form,
label {
  display: grid;
  gap: 12px;
}
.tool-body {
  padding: 0 18px 20px;
}
label {
  gap: 6px;
}
.check {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
}
input,
select {
  width: 100%;
  min-width: 0;
}
input[type='checkbox'] {
  width: 20px;
}
.message {
  margin: 0;
  color: var(--muted);
  font-size: 0.875rem;
}
.list-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-bottom: 18px;
}
h2 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
}
h2 span {
  padding: 2px 10px;
  border: 1px solid var(--border);
  border-radius: 20px;
  color: var(--accent);
  font: 600 0.8125rem/1.5 var(--site-body);
}
.list-heading p {
  margin: 0;
  color: var(--muted);
  font-size: 0.875rem;
}
.deck-list {
  display: grid;
  gap: 20px;
}
.empty {
  display: grid;
  justify-items: center;
  padding: 48px 24px;
  border: 1px dashed var(--border);
  border-radius: 10px;
  text-align: center;
  background: var(--site-panel-sunken);
}
.empty h3 {
  margin: 16px 0 6px;
}
.empty p {
  margin: 0;
  max-width: 48ch;
  color: var(--muted);
}
@media (max-width: 600px) {
  .deck-tools {
    grid-template-columns: minmax(0, 1fr);
    margin-bottom: 24px;
  }
}
</style>
