<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, provide, ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  inspected,
  noHover,
  TABLE_CARD,
  type InspectedCard,
  type TargetNote,
} from '../game/inspect'
import { useLabels } from '../game/labels'
import { BOARD_VIEW_KEY, type ViewTransform } from '../game/viewport'
import { useTableGame } from '../game/tableController'
import ActionButton from './ActionButton.vue'
import { pendingCardTargets } from '../game/cardEntries'

/**
 * Envuelve un elemento de la mesa. Si la pregunta actual tiene opciones sobre
 * él, se resalta. Al pulsarlo se abre el menú de acciones; si solo hay una
 * opción que no es una acción con prueba (moverse, jugar una carta, elegir un
 * objetivo), se elige directamente.
 */
const props = defineProps<{
  target: string
  /** Sin opciones: por qué no se puede usar ahora; se muestra al pulsarlo. */
  blocked?: TargetNote | null
}>()
const game = useTableGame()
const pendingCards = inject(pendingCardTargets, null)
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const position = ref<Record<string, string>>({})

const options = computed(() => game.choicesByTarget.get(props.target) ?? [])

const label = useLabels()
const { t } = useI18n()
/** Acción corta de las habilidades de carta más comunes (sin nombre de carta ni lugar). */
const SHORT_ABILITY: Record<string, string> = {
  'ability.fightWith': 'fight',
  'ability.fightWithSkill': 'fight',
  'ability.fightWithCharges': 'fight',
  'ability.evadeWith': 'evade',
  'ability.investigateWith': 'investigate',
}

/** Rótulo visible de lo que se puede hacer: solo la acción ("Investigar"), no el lugar. */
const hint = computed(() => {
  const [first] = options.value
  if (!first) return null
  if (options.value.length > 1) return t('table.options', { n: options.value.length })
  const { choice } = first
  const action = choice.display?.action ?? SHORT_ABILITY[choice.label]
  return action ? t(`actionShort.${action}`) : label(choice.label, choice.params ?? {})
})

/** Una única opción que no necesita menú. */
const direct = computed(() => {
  if (options.value.length !== 1) return null
  const [only] = options.value
  const action = only!.choice.display?.action
  return !only!.choice.display || action === 'move' || action === 'play' ? only! : null
})

/** Coloca el menú encima del elemento (o debajo, si no cabe), dentro de la ventana. */
function place() {
  const rect = root.value?.getBoundingClientRect()
  if (!rect) return
  const width = menu.value?.offsetWidth ?? 180
  const height = menu.value?.offsetHeight ?? 40
  const margin = 8
  const left = Math.min(Math.max(rect.left, margin), window.innerWidth - width - margin)
  position.value =
    rect.top - height - margin > 0
      ? { left: `${left}px`, bottom: `${window.innerHeight - rect.top + 4}px` }
      : { left: `${left}px`, top: `${rect.bottom + 4}px` }
}

/** Cartas que muestra este elemento; la primera es la suya (las anidadas tienen su propio elemento). */
const cards: (() => InspectedCard)[] = []
provide(TABLE_CARD, (card) => {
  cards.push(card)
  return () => cards.splice(cards.indexOf(card), 1)
})
async function click() {
  // Sin ratón: la carta se abre ampliada con sus opciones; elegir es un segundo toque.
  if (noHover.value && cards[0]) {
    open.value = false
    inspected.value = {
      card: cards[0](),
      target: props.target,
      ...(options.value.length ? {} : { note: props.blocked ?? null }),
    }
    return
  }
  if (direct.value) return game.answer(direct.value.index)
  if (!options.value.length && !props.blocked) return
  open.value = !open.value
  if (open.value) {
    place()
    await nextTick()
    place()
  }
}

function pick(index: number) {
  open.value = false
  game.answer(index)
}

// La pregunta cambió: el menú abierto ya no vale.
watch(options, () => (open.value = false))

function outside(event: MouseEvent) {
  const node = event.target as Node
  if (root.value?.contains(node) || menu.value?.contains(node)) return
  open.value = false
}
function escape(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}
function reposition() {
  if (open.value) place()
}
// El menú flotante sigue a su carta al arrastrar, ampliar o ajustar el mapa.
const boardView = inject<Readonly<Ref<ViewTransform>> | null>(BOARD_VIEW_KEY, null)
if (boardView) watch(boardView, reposition, { flush: 'post' })
document.addEventListener('click', outside)
document.addEventListener('keydown', escape)
window.addEventListener('resize', reposition)
window.addEventListener('scroll', reposition, true)
onBeforeUnmount(() => {
  document.removeEventListener('click', outside)
  document.removeEventListener('keydown', escape)
  window.removeEventListener('resize', reposition)
  window.removeEventListener('scroll', reposition, true)
})
</script>

<template>
  <div
    ref="root"
    class="table-target"
    :style="pendingCards?.has(target) ? { visibility: 'hidden' } : undefined"
    :data-table-target="target"
    :class="{ active: options.length > 0, open }"
    :role="options.length || blocked ? 'button' : undefined"
    :tabindex="options.length || blocked ? 0 : undefined"
    :title="!options.length && blocked ? label(blocked.key, blocked.params ?? {}) : undefined"
    :aria-label="hint ?? undefined"
    :aria-expanded="options.length && !direct ? open : undefined"
    @click.stop="click"
    @keydown.enter.prevent.stop="click"
    @keydown.space.prevent.stop="click"
  >
    <slot />
    <span v-if="hint && !open" class="hint" aria-hidden="true">▶ {{ hint }}</span>
    <Teleport to="body">
      <p
        v-if="open && !options.length && blocked"
        ref="menu"
        class="abilities blocked"
        role="status"
        :style="position"
      >
        {{ label(blocked.key, blocked.params ?? {}) }}
      </p>
      <div v-if="open && options.length" ref="menu" class="abilities" :style="position">
        <ActionButton
          v-for="o in options"
          :key="o.index"
          :choice="o.choice"
          :data-choice-index="o.index"
          @click.stop="pick(o.index)"
        />
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.table-target {
  position: relative;
  display: inline-block;
  border-radius: 8px;
}
.table-target.active {
  cursor: pointer;
  outline: 2px dashed var(--eldritch);
  outline-offset: 3px;
  box-shadow: 0 0 16px rgb(127 184 164 / 45%);
}
.table-target.active:focus-visible {
  outline: 2px solid #fff;
  box-shadow: 0 0 0 6px #111;
}
.hint {
  position: absolute;
  z-index: 4;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  max-width: calc(100% + 12px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 1px 7px;
  border-radius: 3px;
  background: var(--eldritch);
  color: #0c241c;
  font-family: var(--fell);
  font-size: 0.8rem;
  pointer-events: none;
}
.table-target.open {
  outline-color: #ff00ff;
  box-shadow: 0 0 14px rgb(255 0 255 / 50%);
}
.abilities {
  position: fixed;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 3px;
  border-radius: 7px;
  background: rgb(0 0 0 / 80%);
  box-shadow: 0 6px 18px rgb(0 0 0 / 50%);
}
.abilities.blocked {
  max-width: min(280px, calc(100vw - 16px));
  margin: 0;
  padding: 8px 10px;
  color: var(--ink, #eee);
  font-size: 0.9rem;
  line-height: 1.35;
}
</style>
