<script setup lang="ts">
import { playerCardDef, type GameState, type Investigator } from '@lcg/engine'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardName, classColor } from '../game/cards'
import GameCard from './GameCard.vue'
import TableTarget from './TableTarget.vue'

const props = defineProps<{ state: GameState; investigator: Investigator; deciding: boolean }>()
const { t } = useI18n()

const i = computed(() => props.investigator)
const assets = computed(() =>
  Object.values(props.state.assets).filter((a) => a.owner === i.value.id),
)
const engaged = computed(() =>
  Object.values(props.state.enemies).filter((e) => e.engagedWith === i.value.id),
)
const threats = computed(() =>
  Object.values(props.state.treacheries).filter(
    (tr) => tr.placement.type === 'threatArea' && tr.placement.investigator === i.value.id,
  ),
)
const color = computed(() => classColor(i.value.id))
</script>

<template>
  <section
    class="player"
    :class="{ deciding, eliminated: i.eliminated }"
    :style="{ '--class': color }"
  >
    <header>
      <h3>{{ i.name }}</h3>
      <span v-if="i.eliminated" class="tag">{{
        i.resigned ? t('log.resigned', { name: '' }) : t('game.eliminated')
      }}</span>
    </header>

    <div class="row">
      <TableTarget :target="`investigator:${i.id}`">
        <GameCard :code="i.id" :name="i.name" :width="150" landscape :color="color" />
      </TableTarget>

      <div class="stats">
        <div class="tokens">
          <span class="tok resource" :title="t('table.resources')">{{ i.resources }}</span>
          <span class="tok clue" :title="t('table.clues')">{{ i.clues }}</span>
          <span class="tok damage" :title="t('game.damage', { n: i.damage, max: i.health })">{{
            i.damage
          }}</span>
          <span class="tok horror" :title="t('game.horror', { n: i.horror, max: i.sanity })">{{
            i.horror
          }}</span>
        </div>
        <div class="meta">
          <span :title="t('table.actions')">➤ {{ i.actionsRemaining }}</span>
          <span :title="t('table.health')">♥ {{ i.health - i.damage }}/{{ i.health }}</span>
          <span :title="t('table.sanity')">✦ {{ i.sanity - i.horror }}/{{ i.sanity }}</span>
          <span :title="t('table.deck')">▤ {{ i.deck.length }}</span>
        </div>
        <div class="skills">
          <span class="ci sk wil" :title="t('skill.willpower')">V</span>{{ i.skills.willpower }}
          <span class="ci sk int" :title="t('skill.intellect')">I</span>{{ i.skills.intellect }}
          <span class="ci sk com" :title="t('skill.combat')">C</span>{{ i.skills.combat }}
          <span class="ci sk agi" :title="t('skill.agility')">A</span>{{ i.skills.agility }}
        </div>
      </div>

      <div v-if="engaged.length || threats.length" class="zone threat">
        <h4>{{ t('table.threatArea') }}</h4>
        <div class="cards">
          <TableTarget v-for="e in engaged" :key="e.id" :target="`enemy:${e.id}`">
            <GameCard
              :code="e.code"
              :name="e.name"
              :width="78"
              :exhausted="e.exhausted"
              color="#7a2c2c"
            >
              <span v-if="e.damageTaken > 0" class="token damage">{{ e.damageTaken }}</span>
            </GameCard>
          </TableTarget>
          <TableTarget v-for="tr in threats" :key="tr.id" :target="`treachery:${tr.id}`">
            <GameCard :code="tr.code" :name="tr.name" :width="78" color="#b5462f" />
          </TableTarget>
        </div>
      </div>

      <div class="zone">
        <h4>{{ t('table.inPlay') }}</h4>
        <div class="cards">
          <TableTarget v-for="a in assets" :key="a.id" :target="`asset:${a.id}`">
            <GameCard
              :code="a.code"
              :name="cardName(a.code)"
              :width="78"
              :exhausted="a.exhausted"
              :color="classColor(a.code)"
            >
              <span v-if="playerCardDef(a.code)?.uses" class="token uses">{{ a.uses }}</span>
              <span v-if="a.damage" class="token damage">{{ a.damage }}</span>
              <span v-if="a.horror" class="token horror">{{ a.horror }}</span>
            </GameCard>
          </TableTarget>
        </div>
      </div>
    </div>

    <div class="zone hand">
      <h4>{{ t('table.hand') }} ({{ i.hand.length }})</h4>
      <div class="cards">
        <TableTarget v-for="(code, n) in i.hand" :key="`${code}-${n}`" :target="`hand:${code}`">
          <GameCard :code="code" :name="cardName(code)" :width="92" :color="classColor(code)" />
        </TableTarget>
      </div>
    </div>
  </section>
</template>

<style scoped>
.player {
  border-top: 3px solid var(--class);
  background: var(--panel);
  padding: 8px 12px 12px;
}
.player.deciding {
  box-shadow: inset 0 3px 0 var(--accent);
}
.player.eliminated {
  opacity: 0.5;
}
header {
  display: flex;
  align-items: center;
  gap: 10px;
}
h3 {
  margin: 0 0 6px;
  font-size: 1rem;
}
h4 {
  margin: 0 0 4px;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.7;
}
.tag {
  font-size: 0.75rem;
  padding: 1px 8px;
  border-radius: 10px;
  background: #4a1e1e;
}
.row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  flex-wrap: wrap;
}
.stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tokens {
  display: flex;
  gap: 8px;
}
.tok {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 1.15rem;
  color: #fff;
  text-shadow: 0 1px 2px rgb(0 0 0 / 80%);
  border-radius: 50%;
  border: 2px solid rgb(255 255 255 / 25%);
  box-shadow:
    inset 0 -3px 6px rgb(0 0 0 / 35%),
    0 2px 5px rgb(0 0 0 / 55%);
}
.tok.resource {
  /* Recursos: ficha hexagonal de latón. */
  border-radius: 8px;
  clip-path: polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0 50%);
  background: radial-gradient(circle at 40% 35%, #8d6a3f, #4a3420 75%);
  border: none;
}
.tok.clue {
  background: radial-gradient(circle at 40% 35%, #5f8a4a, #263d1d 75%);
}
.tok.damage {
  background: radial-gradient(circle at 40% 35%, #c2453a, #5c1610 75%);
}
.tok.horror {
  background: radial-gradient(circle at 40% 35%, #4d79c9, #172b57 75%);
}
.meta {
  display: flex;
  gap: 12px;
  font-weight: 600;
  font-size: 0.9rem;
  opacity: 0.9;
}
.skills {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;
}
.skills .ci {
  margin-left: 6px;
}
.zone .cards {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.hand {
  margin-top: 10px;
}
.token {
  position: absolute;
  min-width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.75rem;
  color: #fff;
  box-shadow: 0 1px 4px rgb(0 0 0 / 60%);
}
.token.uses {
  top: -6px;
  left: -6px;
  background: #6d5a1f;
}
.token.damage {
  top: -6px;
  right: -6px;
  background: #b3261e;
}
.token.horror {
  bottom: -6px;
  right: -6px;
  background: #1e4fb3;
}
</style>
