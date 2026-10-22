<script setup lang="ts">
import { cardPool, deckSizeOf, isStandard, type DeckProblem } from '@lcg/cards'
import { playerCardDef } from '@lcg/engine'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import GameCard from '../components/GameCard.vue'
import ClassIcon from '../components/ClassIcon.vue'
import SlotIcon from '../components/SlotIcon.vue'
import CardTypeIcon from '../components/CardTypeIcon.vue'
import SitePage from '../components/SitePage.vue'
import SiteAction from '../components/SiteAction.vue'
import CardDetails from '../components/CardDetails.vue'
import { cardName, classColor } from '../game/cards'
import { localName } from '../game/localized'
import { useDecksStore } from '../stores/decks'
import { useRoute } from 'vue-router'
import { noHover, type InspectedCard } from '../game/inspect'

/** Editor de un mazo propio, identificado por su URL. */
const { t } = useI18n()
const store = useDecksStore()
const route = useRoute()

const name = (code: string) => localName(cardName(code))
const def = playerCardDef
const preview = ref<InspectedCard | null>(null)
const previewElement = ref<HTMLElement>()
const previewWidth = ref(300)
const previewPosition = ref({ left: '16px', top: '16px' })
const investigatorDialog = ref<HTMLDialogElement>()
const investigatorTitleId = useId()
const investigatorWidth = ref(640)

function resizePreviews() {
  hidePreview()
  investigatorWidth.value = Math.min(640, window.innerWidth - 66)
}

function showInvestigatorBack() {
  resizePreviews()
  investigatorDialog.value?.showModal()
}

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
  window.addEventListener('resize', resizePreviews)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', hidePreview, true)
  window.removeEventListener('resize', resizePreviews)
})

const selectedId = computed(() => String(route.params.id ?? ''))
const selected = computed(() => store.decks.find((d) => d.id === selectedId.value) ?? null)
watch(selectedId, () => investigatorDialog.value?.close())
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
  <SitePage
    :title="selected?.name || t('decks.notFound')"
    :subtitle="t('decks.editorSubtitle')"
    icon="decks"
  >
    <template #actions>
      <SiteAction to="/decks" icon="←" variant="secondary">{{ t('decks.backToList') }}</SiteAction>
    </template>
    <div class="layout">
      <section v-if="selected && check" class="editor">
        <div class="summary">
          <div class="investigator-reference">
            <GameCard
              :code="selected.investigator"
              :name="name(selected.investigator)"
              :width="170"
              landscape
              no-zoom
              @mouseenter="showPreview(selected.investigator, $event, true)"
              @mouseleave="hidePreview"
            />
            <button type="button" aria-haspopup="dialog" @click="showInvestigatorBack">
              {{ t('decks.viewInvestigatorBack') }}
            </button>
          </div>
          <div>
            <input
              class="deck-name"
              :value="selected.name"
              :aria-label="t('decks.name')"
              @input="rename(($event.target as HTMLInputElement).value)"
              @blur="
                rename(
                  selected.name.trim() || t('decks.newName', { name: name(selected.investigator) }),
                )
              "
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
                    class="ui-plain card-step"
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
                <CardTypeIcon :type="g.type" />
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
                      class="ui-plain card-step"
                      :aria-label="t('decks.removeCard', { card: name(c) })"
                      @click="removeOne(c)"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      class="ui-plain card-step"
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
                  class="ui-plain card-step"
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
        <p>{{ t('decks.notFoundHelp') }}</p>
      </section>
    </div>
  </SitePage>
  <Teleport to="body">
    <dialog
      v-if="selected"
      ref="investigatorDialog"
      class="investigator-back"
      :aria-labelledby="investigatorTitleId"
      @click="$event.target === investigatorDialog && investigatorDialog.close()"
      @keydown.stop
    >
      <header>
        <div>
          <h2 :id="investigatorTitleId">{{ t('decks.deckbuildingRules') }}</h2>
          <p>{{ name(selected.investigator) }}</p>
        </div>
        <button type="button" :aria-label="t('table.close')" @click="investigatorDialog?.close()">
          ✕
        </button>
      </header>
      <div class="investigator-back-face">
        <CardDetails
          :key="selected.investigator"
          :code="selected.investigator"
          :name="name(selected.investigator)"
          :width="investigatorWidth"
          back
          landscape
          no-zoom
        />
      </div>
    </dialog>
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
.summary > .investigator-reference {
  display: grid;
  gap: 10px;
  flex: 0 0 170px;
  width: 170px;
}
.investigator-back {
  box-sizing: border-box;
  width: min(674px, calc(100vw - 32px));
  max-width: none;
  max-height: calc(100dvh - 32px);
  margin: auto;
  padding: 16px;
  overflow-y: auto;
  color: var(--ink);
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
}
.investigator-back::backdrop {
  background: rgb(0 0 0 / 75%);
}
.investigator-back header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.investigator-back h2 {
  margin: 0;
  font-size: 1.1rem;
}
.investigator-back header p {
  margin: 6px 0 0;
  color: var(--muted);
}
.investigator-back header button {
  flex: none;
}
.investigator-back-face {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.investigator-back-face :deep(.translation) {
  width: 100%;
  max-height: none;
}
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
  min-width: 0;
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
    linear-gradient(0deg, var(--site-panel-sunken), #202025d9),
    url('/local-assets/home/occult-archive.webp') center / cover;
}
.editor.empty img {
  object-fit: contain;
}
.summary > div {
  min-width: 0;
  width: 100%;
}
.editor,
.contents,
.pool {
  min-width: 0;
}
.card-name {
  overflow-wrap: anywhere;
}
.filters select {
  flex: 1;
  min-width: 0;
}
.check {
  min-height: 44px;
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
  color: var(--site-error-ink);
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
  color: var(--site-error-ink);
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
  background: var(--site-panel-sunken);
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
  padding: 2px 0;
  border-bottom: 1px solid var(--border);
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
@media (max-width: 900px) {
  .columns {
    grid-template-columns: minmax(0, 1fr);
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
  .summary {
    flex-wrap: nowrap;
  }
}
@media (max-width: 600px) {
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
  width: 24px;
  height: 24px;
}
.group h3 {
  display: flex;
  align-items: center;
  gap: 8px;
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
.columns .card-step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  padding: 0;
  border: 1px solid var(--site-wood-edge);
  border-radius: 4px;
  color: var(--site-wood-ink);
  background: linear-gradient(180deg, var(--site-wood-top), var(--site-wood-bottom));
  box-shadow: inset 0 1px 0 #e9b98244;
  font-size: 0.875rem;
  line-height: 1;
}
.card-step:hover:not(:disabled) {
  border-color: var(--site-accent-hover);
  filter: brightness(1.12);
}
.card-step:active:not(:disabled) {
  box-shadow: inset 0 1px 3px #160d0999;
}
@media (pointer: coarse) {
  .columns .card-step {
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
  }
}
.marker {
  color: var(--brass);
}
</style>
