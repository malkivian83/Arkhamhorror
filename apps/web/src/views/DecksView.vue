<script setup lang="ts">
import {
  cardPool,
  deckSizeOf,
  emptyDeck,
  investigatorCards,
  isStandard,
  STARTER_DECKS,
  starterDeckList,
  type DeckList,
  type DeckProblem,
} from '@lcg/cards'
import { playerCardDef } from '@lcg/engine'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DisclosureIcon from '../components/DisclosureIcon.vue'
import GameCard from '../components/GameCard.vue'
import ClassIcon from '../components/ClassIcon.vue'
import SlotIcon from '../components/SlotIcon.vue'
import SitePage from '../components/SitePage.vue'
import SiteAction from '../components/SiteAction.vue'
import CardDetails from '../components/CardDetails.vue'
import { cardName, classColor } from '../game/cards'
import { localName } from '../game/localized'
import { newDeckId, useDecksStore } from '../stores/decks'
import { noHover, type InspectedCard } from '../game/inspect'

/**
 * Mazos propios: crear (vacío o desde un mazo inicial), importar de ArkhamDB y
 * editar con el catálogo de cartas que permite cada investigador.
 */
const { t } = useI18n()
const store = useDecksStore()

const name = (code: string) => localName(cardName(code))
const def = playerCardDef
const preview = ref<InspectedCard | null>(null)
const previewElement = ref<HTMLElement>()
const previewWidth = ref(300)
const previewPosition = ref({ left: '16px', top: '16px' })

async function showPreview(code: string, event: MouseEvent | FocusEvent, landscape = false) {
  if (event.type === 'mouseenter' && noHover.value) return
  const anchor = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const card: InspectedCard = { code, name: name(code), back: false, landscape }
  previewWidth.value = Math.min(landscape ? 420 : 300, window.innerWidth - 32)
  preview.value = card
  await nextTick()
  if (preview.value?.code !== code || !previewElement.value) return
  const { width, height } = previewElement.value.getBoundingClientRect()
  const right = anchor.right + 16
  const left = right + width <= window.innerWidth - 16 ? right : anchor.left - width - 16
  previewPosition.value = {
    left: `${Math.max(16, Math.min(left, window.innerWidth - width - 16))}px`,
    top: `${Math.max(16, Math.min(anchor.top, window.innerHeight - height - 16))}px`,
  }
}

function hidePreview() {
  preview.value = null
}
onMounted(() => {
  window.addEventListener('scroll', hidePreview, true)
  window.addEventListener('resize', hidePreview)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', hidePreview, true)
  window.removeEventListener('resize', hidePreview)
})

// ------------------------------------------------------------- Lista y creación
const selectedId = ref<string | null>(store.decks[0]?.id ?? null)
const selected = computed(() => store.decks.find((d) => d.id === selectedId.value) ?? null)
const editorTab = ref<'contents' | 'pool'>('contents')
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
  if (!deck) return { groups: [], fixed: [], unknown: [] }
  const unique = [...new Set(deck.cards)].sort((a, b) => name(a).localeCompare(name(b)))
  return {
    groups: TYPES.map((type) => ({
      type,
      cards: unique.filter((c) => isStandard(c) && def(c)?.type === type),
      sections: (type === 'asset'
        ? (['hand', 'accessory', 'body', 'ally', 'arcane', 'head', 'free'] as const)
        : ([null] as const)
      )
        .map((slot) => ({
          slot,
          cards: unique.filter(
            (c) =>
              isStandard(c) &&
              def(c)?.type === type &&
              (slot === null || (def(c)?.slots?.[0] ?? 'free') === slot),
          ),
        }))
        .filter((section) => section.cards.length),
    })).filter((g) => g.cards.length),
    fixed: unique.filter((c) => !isStandard(c)),
    unknown: unique.filter((c) => !def(c)),
  }
})

// Filtros del catálogo.
const classFilter = ref('')
const typeFilter = ref('')
const search = ref('')
const levelZero = ref(true)
watch([selectedId, editorTab, classFilter, typeFilter, search, levelZero], hidePreview)
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
  <SitePage :title="t('decks.title')" :subtitle="t('decks.subtitle')" icon="decks">
    <template #actions
      ><SiteAction to="/" icon="→">{{ t('setup.begin') }}</SiteAction></template
    >
    <div class="layout">
      <aside class="side">
        <details class="box deck-tool" :open="!selected">
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

        <h2 class="deck-list-heading">
          {{ t('decks.yourDecks') }}<span>{{ store.decks.length }}</span>
        </h2>
        <ul class="list" :aria-label="t('decks.title')">
          <li v-if="!store.decks.length" class="empty">{{ t('decks.none') }}</li>
          <li
            v-for="d in store.decks"
            :key="d.id"
            :class="{ active: d.id === selectedId }"
            :style="{ '--class': classColor(d.investigator) }"
          >
            <button
              type="button"
              class="pick"
              :aria-pressed="selectedId === d.id"
              @click="selectedId = d.id"
            >
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
            no-zoom
            @mouseenter="showPreview(selected.investigator, $event, true)"
            @mouseleave="hidePreview"
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

        <nav class="editor-navigation" :aria-label="t('decks.editorViews')">
          <button
            type="button"
            :aria-pressed="editorTab === 'contents'"
            aria-controls="deck-contents"
            @click="editorTab = 'contents'"
          >
            {{ t('decks.contents') }}
          </button>
          <button
            type="button"
            :aria-pressed="editorTab === 'pool'"
            aria-controls="deck-pool"
            @click="editorTab = 'pool'"
          >
            {{ t('decks.pool') }}
          </button>
        </nav>
        <div class="columns" :class="{ 'show-pool': editorTab === 'pool' }">
          <section id="deck-contents" class="contents" :aria-label="t('decks.contents')">
            <h2>{{ t('decks.contents') }}</h2>
            <div v-if="contents.unknown.length" class="group">
              <h3>{{ t('decks.pendingCards') }}</h3>
              <ul>
                <li v-for="c in contents.unknown" :key="c">
                  <span class="qty">{{ count(c) }}×</span>
                  <span class="card-name">{{ c }}</span>
                  <button
                    type="button"
                    :aria-label="t('decks.removeCard', { card: c })"
                    @click="removeOne(c)"
                  >
                    −
                  </button>
                </li>
              </ul>
            </div>
            <div v-for="g in contents.groups" :key="g.type" class="group">
              <h3>
                {{ t(`choice.cardType.${g.type}`) }} ({{
                  g.cards.reduce((total, c) => total + count(c), 0)
                }})
              </h3>
              <div v-for="section in g.sections" :key="section.slot ?? g.type" class="slot-section">
                <h4 v-if="section.slot">
                  <SlotIcon v-if="section.slot !== 'free'" :type="section.slot" />
                  {{ t(`slot.${section.slot}`) }}
                </h4>
                <ul>
                  <li v-for="c in section.cards" :key="c">
                    <span class="qty">{{ count(c) }}×</span>
                    <ClassIcon :faction="def(c)?.class ?? 'neutral'" />
                    <span
                      class="card-name preview-trigger"
                      :style="{ '--class': classColor(c) }"
                      tabindex="0"
                      @mouseenter="showPreview(c, $event)"
                      @mouseleave="hidePreview"
                      @focus="showPreview(c, $event)"
                      @blur="hidePreview"
                      @keydown.esc="hidePreview"
                      >{{ name(c) }}</span
                    >
                    <span v-if="def(c)?.unique" class="marker" aria-hidden="true">◆</span>
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
            </div>
            <div class="group">
              <h3>{{ t('decks.required') }}</h3>
              <ul>
                <li v-for="c in contents.fixed" :key="c">
                  <span class="qty">{{ count(c) }}×</span>
                  <ClassIcon :faction="def(c)?.class ?? 'neutral'" />
                  <span
                    class="card-name preview-trigger"
                    tabindex="0"
                    @mouseenter="showPreview(c, $event)"
                    @mouseleave="hidePreview"
                    @focus="showPreview(c, $event)"
                    @blur="hidePreview"
                    @keydown.esc="hidePreview"
                    >{{ name(c) }}</span
                  >
                  <span class="marker" aria-hidden="true">★</span>
                </li>
              </ul>
            </div>
          </section>

          <section id="deck-pool" class="pool" :aria-label="t('decks.pool')">
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
                <ClassIcon :faction="c.class" />
                <span
                  class="card-name preview-trigger"
                  :style="{ '--class': classColor(c.code) }"
                  tabindex="0"
                  @mouseenter="showPreview(c.code, $event)"
                  @mouseleave="hidePreview"
                  @focus="showPreview(c.code, $event)"
                  @blur="hidePreview"
                  @keydown.esc="hidePreview"
                  >{{ name(c.code) }}</span
                >
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
        <img src="/local-assets/home/icon-decks.webp" alt="" width="64" height="64" />
        <p>{{ t('decks.pick') }}</p>
      </section>
    </div>
  </SitePage>
  <Teleport to="body">
    <div
      v-if="preview"
      ref="previewElement"
      class="deck-card-preview"
      :style="previewPosition"
      role="tooltip"
      :aria-label="preview.name"
    >
      <CardDetails
        :key="preview.code"
        :code="preview.code"
        :name="preview.name"
        :landscape="preview.landscape"
        :width="previewWidth"
        no-zoom
      />
    </div>
  </Teleport>
</template>

<style scoped>
.preview-trigger {
  cursor: zoom-in;
}
.preview-trigger:hover {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.deck-card-preview {
  position: fixed;
  z-index: 1100;
  display: flex;
  flex-wrap: wrap;
  align-items: start;
  gap: 10px;
  width: max-content;
  max-width: calc(100vw - 32px);
  max-height: calc(100dvh - 32px);
  pointer-events: none;
}
.deck-card-preview :deep(.game-card) {
  border-radius: 12px;
  box-shadow: 0 8px 28px rgb(0 0 0 / 70%);
}
.deck-card-preview :deep(.translation) {
  flex: 0 1 340px;
  min-width: 0;
}
.layout {
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr);
  gap: 28px;
  align-items: start;
}
.box {
  padding: 0;
  margin-bottom: 12px;
  background: #202025;
  border: 1px solid var(--border);
  border-radius: 10px;
}
.deck-tool > summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  list-style: none;
  font-weight: 600;
}
.deck-tool > summary::-webkit-details-marker {
  display: none;
}
.disclosure {
  margin-left: auto;
  color: var(--accent);
}
.tool-body {
  display: grid;
  gap: 14px;
  padding: 0 16px 18px;
}
.tool-body > button {
  width: 100%;
}
.deck-list-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 28px 0 14px;
}
.deck-list-heading > span {
  font: 600 0.8125rem/1.4 var(--fell);
  color: var(--accent);
  padding: 3px 10px;
  border: 1px solid var(--border);
  border-radius: 20px;
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
  display: grid;
  gap: 12px;
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
  color: var(--muted);
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.list li {
  display: flex;
  min-width: 0;
  border: 1px solid var(--border);
  border-left: 4px solid var(--class);
  background: var(--panel);
  border-radius: 8px;
}
.list li.active {
  border-color: #b48355;
  border-left-color: var(--class);
  background: #302923;
}
.list .empty {
  border: none;
  padding: 8px;
  color: var(--muted);
  font-style: italic;
}
.list button.pick {
  flex: 1;
  display: grid;
  gap: 2px;
  text-align: left;
  border: none;
  border-radius: 6px 0 0 6px;
  background: none;
  color: var(--ink);
  box-shadow: none;
  text-shadow: none;
  min-width: 0;
  padding: 14px 12px;
}
.list .pick[aria-pressed='true'] {
  color: var(--ink);
  background: none;
  box-shadow: none;
}
.list button.pick:hover {
  background: rgb(243 223 188 / 5%);
}
.pick small {
  color: var(--muted);
}
.status {
  font-size: 0.75rem;
  color: #ffb4a9;
}
.status.ok {
  color: var(--eldritch);
}
.list button.delete {
  border: none;
  border-radius: 4px;
  background: none;
  color: var(--muted);
  box-shadow: none;
  text-shadow: none;
  align-self: start;
  min-width: 44px;
  min-height: 44px;
  margin: 4px;
}
.list .delete:hover {
  color: #ffb4a9;
  background: #51231e;
}
.editor {
  padding: 0;
}
.editor.empty {
  display: grid;
  justify-items: center;
  align-content: center;
  min-height: 400px;
  padding: 32px;
  text-align: center;
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 10px;
  background:
    linear-gradient(0deg, #202025, #202025d9),
    url('/local-assets/home/occult-archive.webp') center / cover;
}
.editor.empty img {
  object-fit: contain;
}
.summary > div {
  min-width: 0;
  width: 100%;
}
.side,
.editor,
.contents,
.pool {
  min-width: 0;
}
.card-name,
.pick strong {
  overflow-wrap: anywhere;
}
.filters select {
  flex: 1;
  min-width: 0;
}
.check {
  min-height: 44px;
}
.box form {
  flex-wrap: wrap;
}
.summary {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 24px;
  padding: 22px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
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
  color: #ffb4a9;
}
.size.ok,
.valid {
  color: var(--eldritch);
}
.note {
  margin: 4px 0;
  font-size: 0.85rem;
  color: var(--muted);
  font-style: italic;
}
.problems {
  margin: 4px 0;
  padding-left: 18px;
  color: #ffb4a9;
  font-size: 0.85rem;
}
.columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 20px;
}
.editor-navigation {
  display: none;
}
.contents,
.pool {
  padding: 18px;
  background: #202025;
  border: 1px solid var(--border);
  border-radius: 10px;
}
.columns h2 {
  margin-bottom: 18px;
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
  padding: 4px 0;
  border-bottom: 1px solid var(--border);
}
.contents li button,
.pool li button {
  padding: 0 8px;
}
.group h3 {
  margin: 10px 0 4px;
  font-size: 0.8rem;
  color: var(--muted);
}
.card-name {
  flex: 1;
  color: var(--ink);
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
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 16px 0;
}
.filters input[type='search'] {
  width: 100%;
  min-width: 0;
  grid-column: 1 / -1;
}
.filters .check {
  grid-column: 1 / -1;
  font-size: 0.875rem;
}
@media (max-width: 1100px) {
  .columns {
    grid-template-columns: minmax(0, 1fr);
  }
  .summary {
    flex-wrap: wrap;
  }
}
@media (max-width: 900px) {
  .editor-navigation {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }
  .editor-navigation button {
    flex: 1;
    min-width: 0;
    font-size: 0.875rem;
  }
  .columns.show-pool .contents,
  .columns:not(.show-pool) .pool {
    display: none;
  }
  .layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }
  .side {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    gap: 12px;
  }
  .side .box {
    margin: 0;
  }
  .deck-list-heading,
  .list {
    grid-column: 1 / -1;
  }
  .deck-list-heading {
    margin: 8px 0 0;
  }
  .list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .summary {
    flex-wrap: nowrap;
  }
}
@media (max-width: 600px) {
  .side,
  .list {
    grid-template-columns: minmax(0, 1fr);
  }
  .summary {
    flex-wrap: wrap;
    padding: 18px;
  }
  .contents,
  .pool {
    padding: 14px;
  }
  .editor.empty {
    min-height: 240px;
  }
}
.slot-section h4 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 10px 0 2px;
  padding-bottom: 3px;
  border-bottom: 1px solid var(--border);
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 400;
}
.slot-section h4 :deep(.slot-icon) {
  width: 16px;
  height: 16px;
}
.group h3 {
  font-size: 0.95rem;
  color: var(--ink);
  border-bottom: 1px dashed var(--border);
  padding-bottom: 6px;
}
.contents li {
  border-bottom: none;
}
.contents li:hover,
.pool li:hover,
.contents li:focus-within {
  background: var(--panel-2);
}
.contents li button,
.pool li button {
  flex: none;
  min-width: 44px;
  min-height: 44px;
}
.marker {
  color: var(--brass);
}
</style>
