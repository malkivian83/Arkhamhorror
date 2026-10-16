<script setup lang="ts">
import { computed } from 'vue'
import { cardImage, CLASS_COLORS } from '../game/cards'
import { cardTextHtml } from '../game/cardText'
import type { LocalizedCard } from '../game/localized'
import SkillIcon from './SkillIcon.vue'

/**
 * Carta dibujada con nuestra plantilla a partir de los datos traducidos: la
 * ilustración se recorta de la imagen oficial y el texto va en el idioma activo.
 * Se dibuja a tamaño fijo y se escala al ancho pedido.
 */
const props = withDefaults(
  defineProps<{ card: LocalizedCard; back?: boolean; width: number; landscape?: boolean }>(),
  { back: false, landscape: false },
)

const BASE_W = 300
const base = computed(() => (props.landscape ? { w: 420, h: 300 } : { w: BASE_W, h: 420 }))
const scale = computed(() => props.width / base.value.w)

const ENCOUNTER_COLORS: Record<string, string> = {
  enemy: '#7a2c2c',
  treachery: '#3f5a2c',
  location: '#6b5634',
  agenda: '#6b2a2a',
  act: '#2c4a6b',
  scenario: '#4a3f2c',
  story: '#4a3f2c',
}
const color = computed(() => {
  const c = props.card
  if (['asset', 'event', 'skill', 'investigator'].includes(c.type_code)) {
    return CLASS_COLORS[c.faction_code ?? 'neutral'] ?? '#666'
  }
  return ENCOUNTER_COLORS[c.type_code] ?? '#555'
})

const art = computed(() => cardImage(props.card.code, props.back))
const title = computed(() =>
  props.back && props.card.type_code !== 'location'
    ? (props.card.back_name ?? props.card.name)
    : props.card.name,
)
const text = computed(() => cardTextHtml(props.back ? props.card.back_text : props.card.text))
const flavor = computed(() => (props.back ? props.card.back_flavor : props.card.flavor) ?? '')

const icons = computed(() =>
  (
    [
      ['willpower', props.card.skill_willpower],
      ['intellect', props.card.skill_intellect],
      ['combat', props.card.skill_combat],
      ['agility', props.card.skill_agility],
      ['wild', props.card.skill_wild],
    ] as const
  ).flatMap(([kind, n]) => Array.from({ length: n ?? 0 }, () => kind)),
)
const per = (yes: boolean | undefined) => (yes ? '/inv' : '')
</script>

<template>
  <div class="rendered-wrap" :style="{ width: `${width}px`, height: `${base.h * scale}px` }">
    <div
      class="rendered"
      :class="[card.type_code, { landscape, back }]"
      :style="{
        width: `${base.w}px`,
        height: `${base.h}px`,
        transform: `scale(${scale})`,
        '--frame': color,
      }"
    >
      <div class="art" :style="art ? { backgroundImage: `url(${art})` } : {}" />

      <header>
        <span v-if="!back && card.cost !== undefined && card.cost !== null" class="cost">{{
          card.cost
        }}</span>
        <div class="names">
          <strong>{{ title }}</strong>
          <small v-if="card.subname && !back">{{ card.subname }}</small>
        </div>
        <span v-if="card.xp" class="xp">{{ '•'.repeat(card.xp) }}</span>
      </header>

      <div v-if="icons.length && !back" class="icons">
        <SkillIcon v-for="(skill, n) in icons" :key="n" :skill="skill" />
      </div>

      <section class="body">
        <p class="type">
          {{ card.type_name }}<template v-if="card.slot"> · {{ card.slot }}</template>
        </p>
        <p v-if="card.traits && !back" class="traits">{{ card.traits }}</p>
        <!-- eslint-disable-next-line vue/no-v-html -- texto saneado en cardTextHtml -->
        <p v-if="text" class="text" v-html="text" />
        <p v-if="flavor" class="flavor">{{ flavor }}</p>
      </section>

      <footer v-if="!back">
        <template v-if="card.type_code === 'enemy'">
          <span title="combate">⚔ {{ card.enemy_fight ?? '–' }}</span>
          <span title="salud"
            >♥ {{ card.health ?? '–' }}{{ per(card.health_per_investigator) }}</span
          >
          <span title="evasión">⇆ {{ card.enemy_evade ?? '–' }}</span>
          <span class="dmg" title="daño / horror">
            {{ '■'.repeat(card.enemy_damage ?? 0) }}<b>{{ '■'.repeat(card.enemy_horror ?? 0) }}</b>
          </span>
        </template>
        <template v-else-if="card.type_code === 'location'">
          <span title="velo">◎ {{ card.shroud ?? '–' }}</span>
          <span title="pistas"
            >● {{ card.clues ?? 0 }}{{ per(!card.clues_fixed && (card.clues ?? 0) > 0) }}</span
          >
        </template>
        <template v-else-if="card.type_code === 'agenda'">
          <span title="perdición">☠ {{ card.doom ?? '–' }}</span>
        </template>
        <template v-else-if="card.type_code === 'act'">
          <span v-if="card.clues" title="pistas">● {{ card.clues }}/inv</span>
        </template>
        <template v-else-if="card.health || card.sanity">
          <span v-if="card.health" title="salud">♥ {{ card.health }}</span>
          <span v-if="card.sanity" title="cordura">✦ {{ card.sanity }}</span>
        </template>
        <span v-if="card.victory" class="victory">Victoria {{ card.victory }}</span>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.rendered-wrap {
  position: relative;
  overflow: hidden;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgb(0 0 0 / 45%);
}
.rendered {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: top left;
  box-sizing: border-box;
  border: 6px solid var(--frame);
  border-radius: 14px;
  background: #f1e7cf;
  color: #241c12;
  font-family: Georgia, 'Times New Roman', serif;
  display: grid;
  grid-template-rows: auto 150px auto 1fr auto;
  overflow: hidden;
}
.art {
  grid-row: 2;
  background-size: 165%;
  background-position: 50% 30%;
  background-color: #3a3328;
  border-top: 2px solid var(--frame);
  border-bottom: 2px solid var(--frame);
}
.location .art,
.enemy .art {
  background-position: 50% 22%;
}
header {
  grid-row: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: var(--frame);
  color: #fff;
}
.names {
  flex: 1;
  display: flex;
  flex-direction: column;
  text-align: center;
  line-height: 1.1;
}
.names strong {
  font-size: 19px;
}
.names small {
  font-size: 12px;
  font-style: italic;
  opacity: 0.9;
}
.cost {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #fff;
  color: #1b1b1b;
  font-weight: 700;
  font-size: 18px;
  display: grid;
  place-items: center;
}
.xp {
  font-size: 18px;
}
.icons {
  position: absolute;
  top: 54px;
  left: 2px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.body {
  grid-row: 4;
  padding: 6px 10px;
  font-size: 13.5px;
  line-height: 1.25;
  overflow: hidden;
}
.type {
  margin: 0;
  text-align: center;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.75;
}
.traits {
  margin: 2px 0 4px;
  text-align: center;
  font-style: italic;
  font-weight: 700;
  font-size: 12.5px;
}
.text {
  margin: 0 0 4px;
}
.flavor {
  margin: 0;
  font-style: italic;
  font-size: 12px;
  opacity: 0.8;
}
footer {
  grid-row: 5;
  display: flex;
  justify-content: space-around;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: rgb(0 0 0 / 8%);
  font-weight: 700;
  font-size: 15px;
}
.dmg {
  color: #a02020;
  letter-spacing: -2px;
}
.dmg b {
  color: #1e4fb3;
}
.victory {
  font-size: 12px;
  font-style: italic;
}
/* Apaisadas (plan, acto, investigador): ilustración a la izquierda. */
.rendered.landscape {
  grid-template-columns: 40% 1fr;
  grid-template-rows: auto 1fr auto;
}
.rendered.landscape header {
  grid-column: 1 / -1;
}
.rendered.landscape .art {
  grid-row: 2 / 4;
  grid-column: 1;
  border: none;
  border-right: 2px solid var(--frame);
  background-size: auto 140%;
  background-position: 15% 40%;
}
.rendered.landscape .body {
  grid-row: 2;
  grid-column: 2;
}
.rendered.landscape footer {
  grid-row: 3;
  grid-column: 2;
}
.rendered.landscape .icons {
  top: 50px;
}
</style>

<style>
.ci {
  display: inline-grid;
  place-items: center;
  font-family: system-ui, sans-serif;
  font-weight: 700;
  vertical-align: middle;
}
.ci.sk {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 11px;
  color: #fff;
  background: #555;
}
.ci.sk.wil {
  background: #6b4fc9;
}
.ci.sk.int {
  background: #e08a2e;
}
.ci.sk.com {
  background: #c9353e;
}
.ci.sk.agi {
  background: #2e8b45;
}
.ci.sk.wild {
  background: #8a7a3a;
}
.ci.act,
.ci.fast,
.ci.react {
  font-size: 1em;
  color: #6b1f1f;
}
.ci.tok {
  font-size: 1.05em;
}
.ci.per,
.ci.cls {
  font-size: 0.8em;
  font-style: italic;
}
</style>
