<script setup lang="ts">
import {
  deckSizeOf,
  investigatorCards,
  investigatorSetup,
  isStandard,
  type DeckList,
} from '@lcg/cards'
import { playerCardDef } from '@lcg/engine'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardName, classColor } from '../game/cards'
import { DECK_CARD_TYPES, deckSummary } from '../game/deckSummary'
import { localName } from '../game/localized'
import { useDecksStore } from '../stores/decks'
import ClassIcon from './ClassIcon.vue'
import CardTypeIcon from './CardTypeIcon.vue'
import DeckValidityIcon from './DeckValidityIcon.vue'
import DisclosureIcon from './DisclosureIcon.vue'
import GameCard from './GameCard.vue'
import SiteAction from './SiteAction.vue'
import SkillIcon from './SkillIcon.vue'

const props = defineProps<{ deck: DeckList }>()
defineEmits<{ remove: [deck: DeckList] }>()
const { t, locale } = useI18n()
const store = useDecksStore()
const summary = computed(() => deckSummary(props.deck))
const check = computed(() => store.check(props.deck))
const investigator = computed(() =>
  investigatorCards().some((card) => card.code === props.deck.investigator)
    ? investigatorSetup(props.deck.investigator, [])
    : null,
)
const faction = computed(() => playerCardDef(props.deck.investigator)?.class ?? 'neutral')
const editUrl = computed(() => `/decks/${encodeURIComponent(props.deck.id)}`)
const skills = ['willpower', 'intellect', 'combat', 'agility'] as const
const name = (code: string) => localName(cardName(code))
const groups = computed(() =>
  [
    ...DECK_CARD_TYPES.map((type) => ({
      key: type,
      label: t(`choice.cardType.${type}`),
      cards: summary.value.cards.filter(
        ({ code }) => playerCardDef(code)?.type === type && isStandard(code),
      ),
    })),
    {
      key: 'other',
      label: t('decks.otherCards'),
      cards: summary.value.cards.filter(({ code }) => {
        const card = playerCardDef(code)
        return !card || !isStandard(code) || !DECK_CARD_TYPES.some((type) => card.type === type)
      }),
    },
  ]
    .filter((group) => group.cards.length)
    .map((group) => ({
      ...group,
      cards: group.cards.sort((a, b) => name(a.code).localeCompare(name(b.code), locale.value)),
    })),
)
</script>

<template>
  <article class="deck-card" :style="{ '--deck-class': classColor(deck.investigator) }">
    <div class="deck-overview">
      <div class="identity">
        <GameCard
          :code="deck.investigator"
          :name="name(deck.investigator)"
          :width="158"
          landscape
          thumbnail
          no-zoom
        />
        <div class="identity-text">
          <h3>
            <RouterLink :to="editUrl">{{ deck.name }}</RouterLink>
          </h3>
          <p class="investigator-name">{{ name(deck.investigator) }}</p>
          <p class="faction">
            <ClassIcon :faction="faction" aria-hidden="true" />{{ t(`class.${faction}`) }}
          </p>
          <div v-if="investigator" class="investigator-stats">
            <div class="skills">
              <span
                v-for="skill in skills"
                :key="skill"
                :title="t(`skill.${skill}`)"
                :aria-label="`${t(`skill.${skill}`)}: ${investigator.skills[skill]}`"
              >
                <SkillIcon :skill="skill" aria-hidden="true" /><b aria-hidden="true">{{
                  investigator.skills[skill]
                }}</b>
              </span>
            </div>
            <p class="vitals">
              {{ t('decks.health', { n: investigator.health }) }}<span aria-hidden="true"> · </span
              >{{ t('decks.sanity', { n: investigator.sanity }) }}
            </p>
          </div>
        </div>
      </div>
      <div class="composition">
        <div class="deck-metrics">
          <div>
            <strong
              >{{ check.size }}<span>/{{ deckSizeOf(deck.investigator, deck.cards) }}</span></strong
            ><span>{{ t('decks.deckCards') }}</span>
          </div>
          <div>
            <strong>{{ summary.experience }}</strong
            ><span>{{ t('decks.experience') }}</span>
          </div>
          <div :title="t('decks.averageCostHelp')">
            <strong>{{
              summary.averageCost === null
                ? '—'
                : new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
                    summary.averageCost,
                  )
            }}</strong
            ><span>{{ t('decks.averageCost') }}</span>
          </div>
        </div>
        <div class="type-counts">
          <span v-for="type in DECK_CARD_TYPES" :key="type"
            ><CardTypeIcon :type="type" /><b>{{ summary.types[type] }}</b>
            {{ t(`choice.cardType.${type}`) }}</span
          >
        </div>
        <div class="composition-bar" aria-hidden="true">
          <span
            v-for="type in DECK_CARD_TYPES"
            :key="type"
            :class="type"
            :style="{ flexGrow: summary.types[type] }"
          />
        </div>
        <div class="class-counts">
          <span
            v-for="entry in summary.classes"
            :key="entry.faction"
            :title="t(`class.${entry.faction}`)"
            :aria-label="`${t(`class.${entry.faction}`)}: ${entry.count}`"
            ><ClassIcon :faction="entry.faction" aria-hidden="true" />{{ entry.count }}</span
          >
          <small>{{ t('decks.fixedCount', { n: summary.fixed }) }}</small>
          <small v-if="summary.unknown" class="warning">{{
            t('decks.pendingCount', { n: summary.unknown })
          }}</small>
        </div>
      </div>
    </div>
    <div class="deck-footer">
      <DeckValidityIcon class="status" :valid="!check.problems.length" />
      <button
        type="button"
        class="ui-plain delete"
        :aria-label="t('decks.delete', { name: deck.name })"
        @click="$emit('remove', deck)"
      >
        {{ t('decks.deleteAction') }}
      </button>
      <SiteAction
        :to="editUrl"
        icon="→"
        variant="secondary"
        :aria-label="t('decks.editNamed', { name: deck.name })"
        >{{ t('decks.edit') }}</SiteAction
      >
    </div>
    <details class="card-disclosure">
      <summary>{{ t('decks.viewCards', { n: deck.cards.length }) }}<DisclosureIcon /></summary>
      <div v-if="!deck.cards.length" class="empty-cards">{{ t('decks.noCards') }}</div>
      <div v-else class="card-groups">
        <section v-for="group in groups" :key="group.key">
          <h4>
            <CardTypeIcon
              v-if="group.key === 'asset' || group.key === 'event' || group.key === 'skill'"
              :type="group.key"
            />
            {{ group.label }}
            <span>{{ group.cards.reduce((total, card) => total + card.quantity, 0) }}</span>
          </h4>
          <ul>
            <li v-for="card in group.cards" :key="card.code">
              <span class="quantity">{{ card.quantity }}×</span>
              <ClassIcon
                :faction="playerCardDef(card.code)?.class ?? 'neutral'"
                aria-hidden="true"
              />
              <span class="card-name">{{ name(card.code) }}</span>
              <span
                v-if="playerCardDef(card.code)?.xp"
                :title="t('campaign.level', { n: playerCardDef(card.code)?.xp })"
                >{{ '•'.repeat(playerCardDef(card.code)?.xp ?? 0) }}</span
              >
              <span
                v-if="playerCardDef(card.code)?.cost !== undefined"
                class="card-cost"
                :title="t('decks.cardCost')"
                >{{
                  (playerCardDef(card.code)?.cost ?? -1) < 0 ? 'X' : playerCardDef(card.code)?.cost
                }}</span
              >
            </li>
          </ul>
        </section>
      </div>
    </details>
  </article>
</template>

<style scoped>
.deck-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-left: 4px solid var(--deck-class);
  border-radius: 10px;
  background: var(--panel);
}
.deck-overview {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 28px;
  padding: 24px;
}
.identity {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  min-width: 0;
}
.identity :deep(.game-card) {
  flex: none;
  margin-top: 4px;
}
.identity-text {
  min-width: 0;
}
h3 {
  margin: 0 0 6px;
  overflow-wrap: anywhere;
}
h3 a {
  color: var(--ink) !important;
  text-decoration: none;
}
h3 a:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}
.investigator-name {
  margin: 0;
  color: var(--muted);
}
.faction {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 4px 0 12px;
  color: var(--muted);
  font-size: 0.875rem;
}
.skills,
.skills > span {
  display: flex;
  align-items: center;
  gap: 5px;
}
.skills {
  flex-wrap: wrap;
  gap: 14px;
}
.skills :deep(.sk) {
  font-size: 18px;
}
.vitals {
  margin: 8px 0 0;
  font-size: 0.8125rem;
  color: var(--muted);
}
.composition {
  min-width: 0;
  border-left: 1px solid var(--border);
  padding-left: 28px;
}
.deck-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.deck-metrics > div {
  display: grid;
  align-content: start;
  gap: 2px;
}
.deck-metrics strong {
  font-size: 1.5rem;
  line-height: 1.3;
  font-weight: 600;
}
.deck-metrics strong span {
  font-size: 1rem;
  font-weight: 400;
  color: var(--muted);
}
.deck-metrics > div > span {
  color: var(--muted);
  font-size: 0.8125rem;
}
.type-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin-top: 18px;
  font-size: 0.875rem;
  color: var(--muted);
}
.type-counts b {
  color: var(--ink);
}
.type-counts > span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.type-counts :deep(.card-type-icon) {
  width: 22px;
  height: 22px;
}
.card-groups h4 > span {
  margin-left: auto;
}
.composition-bar {
  display: flex;
  gap: 3px;
  height: 5px;
  margin: 9px 0 12px;
  overflow: hidden;
  border-radius: 4px;
  background: var(--site-bg);
}
.composition-bar span {
  flex-basis: 0;
}
.composition-bar .asset {
  background: #e5aa8d;
}
.composition-bar .event {
  background: #a8d8c0;
}
.composition-bar .skill {
  background: #b2a4dd;
}
.class-counts,
.class-counts > span {
  display: flex;
  align-items: center;
  gap: 6px;
}
.class-counts {
  flex-wrap: wrap;
  gap: 8px 14px;
  font-size: 0.8125rem;
}
.class-counts small {
  color: var(--muted);
}
.class-counts .warning {
  color: var(--site-error-ink);
}
.deck-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 20px;
  padding: 0 24px 20px;
}
.status {
  margin-right: auto;
}
.delete {
  color: var(--muted);
  font-size: 0.875rem;
}
.delete:hover {
  color: var(--site-error-ink);
}
.card-disclosure {
  border-top: 1px solid var(--border);
  background: var(--site-panel-sunken);
}
summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  color: var(--accent);
  list-style: none;
  cursor: pointer;
  font-size: 0.875rem;
}
summary::-webkit-details-marker {
  display: none;
}
.card-groups {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px 28px;
  padding: 0 24px 24px;
}
h4 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0 0 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
  font-size: 0.875rem;
}
h4 span,
.quantity {
  color: var(--accent);
}
ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
li {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 5px 0;
  font-size: 0.875rem;
}
.card-name {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
.card-cost {
  min-width: 22px;
  text-align: center;
  border: 1px solid var(--border);
  border-radius: 50%;
  color: var(--muted);
  font-size: 0.75rem;
}
.empty-cards {
  padding: 0 24px 20px;
  color: var(--muted);
}
@media (max-width: 1050px) {
  .identity {
    gap: 14px;
  }
  .identity :deep(.game-card) {
    display: none;
  }
}
@media (max-width: 720px) {
  .deck-overview {
    grid-template-columns: minmax(0, 1fr);
    padding: 20px;
    gap: 20px;
  }
  .identity :deep(.game-card) {
    display: block;
  }
  .composition {
    padding: 18px 0 0;
    border-left: 0;
    border-top: 1px solid var(--border);
  }
  .deck-footer {
    padding: 0 20px 18px;
    gap: 8px 16px;
  }
  .card-groups {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 0 20px 20px;
  }
  summary {
    padding-inline: 20px;
  }
}
@media (max-width: 480px) {
  .identity {
    display: grid;
    grid-template-columns: 92px minmax(0, 1fr);
    align-items: start;
    gap: 4px 14px;
  }
  .identity-text {
    display: contents;
  }
  .identity h3,
  .investigator-name,
  .faction {
    grid-column: 2;
  }
  .identity :deep(.game-card) {
    grid-row: 1 / 4;
    width: 92px !important;
    height: 66px !important;
  }
  .investigator-stats {
    grid-column: 1 / -1;
    margin-top: 8px;
  }
  .card-groups {
    grid-template-columns: minmax(0, 1fr);
  }
  .deck-footer .site-action {
    flex-basis: 100%;
  }
}
</style>
