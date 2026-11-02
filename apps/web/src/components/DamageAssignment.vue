<script setup lang="ts">
import type { GameState } from '@lcg/engine'
import { computed, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardName } from '../game/cards'
import {
  assignmentOf,
  emptyPlan,
  movePoint,
  planPicker,
  type DamageKind,
  type DamagePlan,
  type Recipient,
} from '../game/damagePlan'
import { localName } from '../game/localized'
import { useTableGame } from '../game/tableController'

/**
 * Damage and horror split in one step (doc 100, D4): everything starts on the investigator
 * and the player moves points onto assets. "Point by point" leaves the engine questions on
 * the table, as before.
 */
const props = defineProps<{ state: GameState }>()
const game = useTableGame()
const { t } = useI18n()
const title = useId()

const assignment = computed(() => {
  const found = assignmentOf(props.state)
  if (!found || found.damage + found.horror < 2) return null
  // Online, only the player who decides sees it.
  if (game.online && game.ownInvestigator !== found.investigator) return null
  return found
})
const plan = ref<DamagePlan | null>(null)
/** Point by point, or already confirmed while the answers are being sent. */
const dismissed = ref(false)
// A new assignment starts with everything on the investigator.
watch(
  () => !!assignment.value,
  () => {
    plan.value = assignment.value ? emptyPlan(assignment.value) : null
    dismissed.value = false
  },
  { immediate: true },
)

const kinds = computed(() =>
  (['damage', 'horror'] as const).filter((kind) => (assignment.value?.[kind] ?? 0) > 0),
)
const rows = computed(() =>
  (assignment.value?.recipients ?? []).filter(
    (r, n) => n === 0 || kinds.value.some((kind) => r.room[kind] > 0),
  ),
)
function nameOf(recipient: Recipient): string {
  const target = recipient.target
  if (target.type === 'investigator')
    return props.state.investigators.find((i) => i.id === target.id)?.name ?? ''
  return localName(cardName(recipient.card ?? ''))
}
const points = (key: string, kind: DamageKind) => plan.value?.[kind][key] ?? 0
function canMove(key: string, kind: DamageKind, delta: 1 | -1) {
  return (
    !!assignment.value &&
    !!plan.value &&
    movePoint(assignment.value, plan.value, key, kind, delta) !== plan.value
  )
}
function move(key: string, kind: DamageKind, delta: 1 | -1) {
  if (assignment.value && plan.value)
    plan.value = movePoint(assignment.value, plan.value, key, kind, delta)
}
function confirm() {
  if (!assignment.value || !plan.value) return
  // If the plan stops early (another question, a choice no longer offered), the rest is
  // answered on the table.
  dismissed.value = true
  void game.answerSequence(planPicker(assignment.value.investigator, plan.value))
}
</script>

<template>
  <div v-if="assignment && plan && !dismissed" class="overlay">
    <section class="split" role="dialog" :aria-labelledby="title">
      <h2 :id="title">{{ t('table.damagePlan.title') }}</h2>
      <p class="remaining">
        {{
          t('table.damagePlan.remaining', { damage: assignment.damage, horror: assignment.horror })
        }}
      </p>
      <table>
        <thead>
          <tr>
            <th />
            <th v-for="kind in kinds" :key="kind" scope="col">{{ t(`damageKind.${kind}`) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, n) in rows" :key="row.key">
            <th scope="row">{{ nameOf(row) }}</th>
            <td v-for="kind in kinds" :key="kind">
              <span v-if="n === 0" class="count">{{ points(row.key, kind) }}</span>
              <span v-else-if="row.room[kind] > 0" class="stepper">
                <button
                  type="button"
                  :disabled="!canMove(row.key, kind, -1)"
                  :aria-label="t('table.damagePlan.less', { name: nameOf(row) })"
                  @click="move(row.key, kind, -1)"
                >
                  −
                </button>
                <span class="count">{{ points(row.key, kind) }}</span>
                <button
                  type="button"
                  :disabled="!canMove(row.key, kind, 1)"
                  :aria-label="t('table.damagePlan.more', { name: nameOf(row) })"
                  @click="move(row.key, kind, 1)"
                >
                  +
                </button>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <footer>
        <button type="button" class="table-action" @click="confirm">
          {{ t('table.damagePlan.confirm') }}
        </button>
        <button type="button" @click="dismissed = true">
          {{ t('table.damagePlan.oneByOne') }}
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 800;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgb(0 0 0 / 45%);
}
.split {
  width: min(460px, 100%);
  max-height: calc(100dvh - 32px);
  box-sizing: border-box;
  overflow-y: auto;
  padding: 16px 18px;
  border: 1px solid var(--accent);
  border-radius: 10px;
  background: rgb(17 13 20 / 92%);
  box-shadow: 0 12px 40px rgb(0 0 0 / 60%);
}
h2 {
  margin: 0;
  font-size: 1.1rem;
}
.remaining {
  margin: 4px 0 12px;
  opacity: 0.75;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  padding: 6px 4px;
  text-align: center;
}
tbody th {
  text-align: left;
  font-weight: normal;
}
thead th {
  font-size: 0.85rem;
  color: var(--accent);
  text-transform: capitalize;
}
tbody tr + tr {
  border-top: 1px solid var(--border);
}
.stepper {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.stepper button {
  width: 32px;
  height: 32px;
  padding: 0;
}
.count {
  display: inline-block;
  min-width: 1.5em;
  font-weight: bold;
  font-variant-numeric: tabular-nums;
}
footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}
</style>
