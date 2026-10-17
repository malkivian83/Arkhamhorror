<script setup lang="ts">
import {
  cardPool,
  deckSizeOf,
  emptyDeck,
  investigatorCards,
  isStandard,
  playerCards,
  STARTER_DECKS,
  starterDeckList,
  type DeckList,
  type DeckProblem,
} from '@lcg/cards'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import GameCard from '../components/GameCard.vue'
import { cardName, classColor } from '../game/cards'
import { localName } from '../game/localized'
import { newDeckId, useDecksStore } from '../stores/decks'

/**
 * Mazos propios: crear (vacío o desde un mazo inicial), importar de ArkhamDB y
 * editar con el catálogo de cartas que permite cada investigador.
 */
const { t } = useI18n()
const store = useDecksStore()

const name = (code: string) => localName(cardName(code))
const def = (code: string) => playerCards.find((c) => c.code === code)

// ------------------------------------------------------------- Lista y creación
const selectedId = ref<string | null>(store.decks[0]?.id ?? null)
const selected = computed(() => store.decks.find((d) => d.id === selectedId.value) ?? null)
const check = computed(() => (selected.value ? store.check(selected.value) : null))
const size = computed(() =>
  selected.value ? deckSizeOf(selected.value.investigator, selected.value.cards) : 30,
)

/** Texto de un problema, con el nombre de la carta traducido. */
function problemText(p: DeckProblem): string {
  if (!('params' in p)) return t(p.key)
  const params: Record<string, string | number> = { ...p.params }
  if ('card' in p.params) params.card = localName(p.params.card)
  return t(p.key, params)
}

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
  selectedId.value = id
}

function remove(deck: DeckList) {
  if (!window.confirm(t('decks.confirmDelete', { name: deck.name }))) return
  store.remove(deck.id)
  if (selectedId.value === deck.id) selectedId.value = store.decks[0]?.id ?? null
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
  selectedId.value = result.deck.id
  importInput.value = ''
  importMessage.value = result.unknown.length
    ? t('decks.import.partial', { n: result.unknown.length })
    : t('decks.import.done', { name: result.deck.name })
}

// ------------------------------------------------------------- Editor
function update(cards: string[]) {
  if (selected.value) store.save({ ...selected.value, cards })
}
function rename(value: string) {
  if (selected.value) store.save({ ...selected.value, name: value })
}
const count = (code: string) => selected.value?.cards.filter((c) => c === code).length ?? 0
function add(code: string) {
  if (selected.value) update([...selected.value.cards, code])
}
function removeOne(code: string) {
  if (!selected.value) return
  const i = selected.value.cards.lastIndexOf(code)
  if (i >= 0) update(selected.value.cards.filter((_, n) => n !== i))
}

const TYPES = ['asset', 'event', 'skill'] as const
/** Contenido del mazo agrupado por tipo; aparte, exclusivas y debilidades. */
const contents = computed(() => {
  const deck = selected.value
  if (!deck) return { groups: [], fixed: [] }
  const unique = [...new Set(deck.cards)].sort((a, b) => name(a).localeCompare(name(b)))
  return {
    groups: TYPES.map((type) => ({
      type,
      cards: unique.filter((c) => isStandard(c) && def(c)?.type === type),
    })).filter((g) => g.cards.length),
    fixed: unique.filter((c) => !isStandard(c)),
  }
})

// Filtros del catálogo.
const classFilter = ref('')
const typeFilter = ref('')
const search = ref('')
const levelZero = ref(true)
const pool = computed(() => {
  if (!selected.value) return []
  const text = search.value.trim().toLowerCase()
  return cardPool(selected.value.investigator, {
    rewards: store.rewards,
    deck: selected.value.cards,
  })
    .filter(
      (c) =>
        (!classFilter.value || c.class === classFilter.value) &&
        (!typeFilter.value || c.type === typeFilter.value) &&
        (!levelZero.value || (c.xp ?? 0) === 0) &&
        (!text || name(c.code).toLowerCase().includes(text) || c.name.toLowerCase().includes(text)),
    )
    .sort((a, b) => (a.xp ?? 0) - (b.xp ?? 0) || name(a.code).localeCompare(name(b.code)))
})
const poolClasses = computed(() =>
  selected.value
    ? [
        ...new Set(
          cardPool(selected.value.investigator, {
            rewards: store.rewards,
            deck: selected.value.cards,
          }).map((c) => c.class),
        ),
      ]
    : [],
)
/** Copias por título (2 como máximo, sumando niveles). */
const titleCount = (code: string) => {
  const title = def(code)?.name
  return selected.value?.cards.filter((c) => def(c)?.name === title).length ?? 0
}
</script>

<template>
  <section class="decks">
    <header class="head">
      <h1>{{ t('decks.title') }}</h1>
    </header>

    <div class="layout">
      <aside class="side">
        <section class="box">
          <h2>{{ t('decks.new') }}</h2>
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
          <button type="button" class="primary" @click="create">{{ t('decks.create') }}</button>
        </section>

        <section class="box">
          <h2>{{ t('decks.import.title') }}</h2>
          <form @submit.prevent="importDeck">
            <input
              v-model="importInput"
              type="text"
              :placeholder="t('decks.import.placeholder')"
              :aria-label="t('decks.import.title')"
            />
            <button type="submit" :disabled="importing || !importInput.trim()">
              {{ importing ? t('decks.import.loading') : t('decks.import.action') }}
            </button>
          </form>
          <p v-if="importMessage" class="message" role="status">{{ importMessage }}</p>
        </section>

        <ul class="list" :aria-label="t('decks.title')">
          <li v-if="!store.decks.length" class="empty">{{ t('decks.none') }}</li>
          <li
            v-for="d in store.decks"
            :key="d.id"
            :class="{ active: d.id === selectedId }"
            :style="{ '--class': classColor(d.investigator) }"
          >
            <button type="button" class="pick" @click="selectedId = d.id">
              <strong>{{ d.name }}</strong>
              <small>{{ name(d.investigator) }}</small>
              <span class="status" :class="{ ok: !store.check(d).problems.length }">
                {{
                  store.check(d).problems.length
                    ? t(
                        'decks.problems',
                        { n: store.check(d).problems.length },
                        store.check(d).problems.length,
                      )
                    : t('decks.valid')
                }}
              </span>
            </button>
            <button
              type="button"
              class="delete"
              :aria-label="t('decks.delete', { name: d.name })"
              @click="remove(d)"
            >
              ✕
            </button>
          </li>
        </ul>
      </aside>

      <section v-if="selected && check" class="editor">
        <div class="summary">
          <GameCard
            :code="selected.investigator"
            :name="name(selected.investigator)"
            :width="170"
            landscape
          />
          <div>
            <input
              class="deck-name"
              :value="selected.name"
              :aria-label="t('decks.name')"
              @change="rename(($event.target as HTMLInputElement).value)"
            />
            <p class="size" :class="{ ok: check.size === size }">
              {{ t('decks.size', { n: check.size, size }) }}
            </p>
            <p v-if="check.needsBasicWeakness" class="note">{{ t('decks.basicWeakness') }}</p>
            <ul v-if="check.problems.length" class="problems">
              <li v-for="(p, n) in check.problems" :key="n">{{ problemText(p) }}</li>
            </ul>
            <p v-else class="valid">{{ t('decks.ready') }}</p>
            <p v-if="check.unimplemented.length" class="note">
              {{ t('decks.unimplemented', { cards: check.unimplemented.map(name).join(', ') }) }}
            </p>
          </div>
        </div>

        <div class="columns">
          <section class="contents" :aria-label="t('decks.contents')">
            <h2>{{ t('decks.contents') }}</h2>
            <div v-for="g in contents.groups" :key="g.type" class="group">
              <h3>{{ t(`choice.cardType.${g.type}`) }}</h3>
              <ul>
                <li v-for="c in g.cards" :key="c">
                  <span class="qty">{{ count(c) }}×</span>
                  <span class="card-name" :style="{ '--class': classColor(c) }">{{ name(c) }}</span>
                  <span v-if="def(c)?.xp" class="level">{{ '•'.repeat(def(c)?.xp ?? 0) }}</span>
                  <button
                    type="button"
                    :aria-label="t('decks.removeCard', { card: name(c) })"
                    @click="removeOne(c)"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    :disabled="titleCount(c) >= 2"
                    :aria-label="t('decks.addCard', { card: name(c) })"
                    @click="add(c)"
                  >
                    +
                  </button>
                </li>
              </ul>
            </div>
            <div class="group">
              <h3>{{ t('decks.required') }}</h3>
              <ul>
                <li v-for="c in contents.fixed" :key="c">
                  <span class="qty">{{ count(c) }}×</span>
                  <span class="card-name">{{ name(c) }}</span>
                </li>
              </ul>
            </div>
          </section>

          <section class="pool" :aria-label="t('decks.pool')">
            <h2>{{ t('decks.pool') }}</h2>
            <div class="filters">
              <input
                v-model="search"
                type="search"
                :placeholder="t('decks.search')"
                :aria-label="t('decks.search')"
              />
              <select v-model="classFilter" :aria-label="t('decks.class')">
                <option value="">{{ t('decks.allClasses') }}</option>
                <option v-for="c in poolClasses" :key="c" :value="c">{{ t(`class.${c}`) }}</option>
              </select>
              <select v-model="typeFilter" :aria-label="t('decks.type')">
                <option value="">{{ t('decks.allTypes') }}</option>
                <option v-for="ty in TYPES" :key="ty" :value="ty">
                  {{ t(`choice.cardType.${ty}`) }}
                </option>
              </select>
              <label class="check">
                <input v-model="levelZero" type="checkbox" />
                {{ t('decks.levelZero') }}
              </label>
            </div>
            <ul>
              <li v-for="c in pool" :key="c.code">
                <span class="card-name" :style="{ '--class': classColor(c.code) }">{{
                  name(c.code)
                }}</span>
                <span v-if="c.xp" class="level">{{ '•'.repeat(c.xp) }}</span>
                <span class="qty">{{ count(c.code) || '' }}</span>
                <button
                  type="button"
                  :disabled="titleCount(c.code) >= 2"
                  :aria-label="t('decks.addCard', { card: name(c.code) })"
                  @click="add(c.code)"
                >
                  +
                </button>
              </li>
            </ul>
          </section>
        </div>
      </section>
      <section v-else class="editor empty">
        <p>{{ t('decks.pick') }}</p>
      </section>
    </div>
  </section>
</template>

<style scoped>
.decks {
  max-width: 1300px;
  margin: 0 auto;
  padding: 24px 16px 40px;
}
.head h1 {
  margin: 0 0 16px;
  color: var(--brass);
}
.layout {
  display: grid;
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}
.box {
  display: grid;
  gap: 8px;
  padding: 12px;
  margin-bottom: 12px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
}
.box h2,
.contents h2,
.pool h2 {
  margin: 0;
  font-size: 0.95rem;
  color: var(--brass);
}
.box label {
  display: grid;
  gap: 4px;
  font-size: 0.85rem;
}
.box form {
  display: flex;
  gap: 6px;
}
.box form input {
  flex: 1;
  min-width: 0;
}
input[type='text'],
input[type='search'],
select {
  font: inherit;
  color: var(--ink);
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 8px;
}
.check {
  display: flex !important;
  align-items: center;
  gap: 6px;
}
.message {
  margin: 0;
  font-size: 0.85rem;
  color: #bfae86;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}
.list li {
  display: flex;
  border-left: 4px solid var(--class);
  background: var(--panel);
  border-radius: 0 6px 6px 0;
}
.list li.active {
  outline: 1px solid var(--brass);
}
.list .empty {
  border: none;
  padding: 8px;
  color: #a89a7c;
  font-style: italic;
}
.pick {
  flex: 1;
  display: grid;
  gap: 2px;
  text-align: left;
  border: none;
  background: none;
}
.pick small {
  color: #a89a7c;
}
.status {
  font-size: 0.75rem;
  color: #e0574a;
}
.status.ok {
  color: var(--eldritch);
}
.delete {
  border: none;
  background: none;
  color: #a89a7c;
}
.editor {
  padding: 14px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
}
.editor.empty {
  color: #a89a7c;
  font-style: italic;
}
.summary {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 14px;
}
.deck-name {
  font: inherit;
  font-family: var(--display);
  font-size: 1.1rem;
  color: var(--brass);
  background: transparent;
  border: none;
  border-bottom: 1px dashed var(--brass-dark);
  padding: 2px 0;
  width: 100%;
}
.size {
  margin: 8px 0 4px;
  color: #e0574a;
}
.size.ok,
.valid {
  color: var(--eldritch);
}
.note {
  margin: 4px 0;
  font-size: 0.85rem;
  color: #bfae86;
  font-style: italic;
}
.problems {
  margin: 4px 0;
  padding-left: 18px;
  color: #ff8a80;
  font-size: 0.85rem;
}
.columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
}
.contents ul,
.pool ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 2px;
}
.contents li,
.pool li {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px;
  border-bottom: 1px solid var(--border);
}
.contents li button,
.pool li button {
  padding: 0 8px;
}
.group h3 {
  margin: 10px 0 4px;
  font-size: 0.8rem;
  color: #bfae86;
}
.card-name {
  flex: 1;
  border-left: 3px solid var(--class, transparent);
  padding-left: 6px;
}
.qty {
  min-width: 2ch;
  color: var(--brass);
}
.level {
  color: var(--brass);
  letter-spacing: 1px;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0;
}
.filters input[type='search'] {
  flex: 1;
  min-width: 120px;
}
@media (max-width: 900px) {
  .layout,
  .columns {
    grid-template-columns: 1fr;
  }
  .summary {
    flex-direction: column;
  }
}
</style>
