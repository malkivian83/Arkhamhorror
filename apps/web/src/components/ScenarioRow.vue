<script setup lang="ts">
import { cluesToAdvanceAct, type GameState } from '@lcg/engine'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardBackImage } from '../game/assets'
import { showPile } from '../game/pile'
import ChaosTokenView from './ChaosTokenView.vue'
import GameCard from './GameCard.vue'
import TokenBadge from './TokenBadge.vue'
import TableTarget from './TableTarget.vue'

const props = defineProps<{ state: GameState }>()
const { t } = useI18n()
const showBag = ref(false)

const agenda = computed(() => props.state.agendas[props.state.agendaIndex])
const act = computed(() => props.state.acts[props.state.actIndex])
const topDiscard = computed(() => props.state.encounterDiscard.at(-1))
const actClues = computed(() => cluesToAdvanceAct(props.state))
const encounterBack = computed(() => cardBackImage('encounter'))
const topVictory = computed(() => props.state.victoryDisplay.at(-1))

function showDiscard() {
  showPile({
    title: 'table.encounterDiscard',
    cards: props.state.encounterDiscard.map((c) => ({ code: c.code, name: c.name })),
    newestFirst: true,
  })
}
function showVictory() {
  showPile({
    title: 'table.victory',
    cards: props.state.victoryDisplay.map((code) => ({ code, name: code })),
  })
}

const sortedBag = computed(() =>
  [...props.state.chaosBag].sort((a, b) =>
    typeof a === 'number' && typeof b === 'number' ? b - a : typeof a === 'number' ? -1 : 1,
  ),
)
</script>

<template>
  <div class="scenario-row" role="region" :aria-label="t('table.scenario')">
    <TableTarget v-if="agenda" target="agenda">
      <div class="slot folder">
        <span class="folder-tab">{{ t('table.agenda') }}</span>
        <GameCard
          :code="agenda.code ?? ''"
          :name="agenda.name"
          :width="88"
          landscape
          color="#7a2c2c"
        >
          <TokenBadge
            class="badge-token"
            kind="doom"
            :value="`${state.doom}/${agenda.doomThreshold}`"
            :size="40"
            :title="t('table.doom')"
          />
        </GameCard>
      </div>
    </TableTarget>

    <TableTarget v-if="act" target="act">
      <div class="slot folder">
        <span class="folder-tab">{{ t('table.act') }}</span>
        <GameCard :code="act.code ?? ''" :name="act.name" :width="88" landscape color="#2c5a7a">
          <TokenBadge
            v-if="actClues !== null"
            class="badge-token"
            kind="clue"
            :value="actClues"
            :size="36"
            :title="t('table.clues')"
          />
        </GameCard>
      </div>
    </TableTarget>

    <div class="slot deck folder" :title="t('table.encounterDeck')">
      <span class="folder-tab">{{ t('table.deck') }}</span>
      <div
        class="card-back"
        :class="{ official: encounterBack }"
        :style="
          encounterBack
            ? { backgroundImage: `url(${encounterBack})` }
            : { '--depth': Math.min(state.encounterDeck.length, 6) }
        "
      >
        <strong>{{ state.encounterDeck.length }}</strong>
      </div>
    </div>

    <button
      type="button"
      class="slot pile folder"
      :title="t('table.viewPile')"
      @click="showDiscard"
    >
      <span class="folder-tab">{{ t('table.discard') }}</span>
      <GameCard v-if="topDiscard" :code="topDiscard.code" :name="topDiscard.name" :width="40" />
      <div v-else class="card-back empty"></div>
      <span v-if="state.encounterDiscard.length" class="count">{{
        state.encounterDiscard.length
      }}</span>
    </button>

    <button type="button" class="bag" :aria-pressed="showBag" @click="showBag = !showBag">
      <span class="bag-icon" />
      <span>{{ t('table.chaosBag') }} ({{ state.chaosBag.length }})</span>
    </button>
    <div v-if="showBag" class="bag-tokens">
      <ChaosTokenView v-for="(token, i) in sortedBag" :key="i" :token="token" :size="30" />
    </div>

    <div v-if="state.skillTest" class="test">
      <strong>{{ t('table.skillTest') }}</strong>
      <ChaosTokenView
        v-for="(token, i) in state.skillTest.tokens"
        :key="i"
        :token="token"
        :size="28"
      />
    </div>

    <button
      type="button"
      class="slot pile victory folder"
      :title="t('table.viewPile')"
      @click="showVictory"
    >
      <span class="folder-tab">{{ t('table.victory') }}</span>
      <GameCard v-if="topVictory" :code="topVictory" :name="topVictory" :width="40" />
      <div v-else class="card-back empty"></div>
      <span v-if="state.victoryDisplay.length" class="count">{{
        state.victoryDisplay.length
      }}</span>
    </button>
  </div>
</template>

<style scoped>
.scenario-row {
  /* Expediente del caso: carpetas de papel sobre la mesa de madera. */
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-wrap: nowrap;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 10px 10px 6px 58px;
  background: var(--tex-wood), linear-gradient(180deg, #2e2317, #1f170e);
  border-bottom: 2px solid #000;
}
.folder {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 4px 6px;
  border-radius: 2px 10px 2px 2px;
  background: linear-gradient(180deg, var(--parch), var(--parch-dark));
  box-shadow: 0 4px 10px rgb(0 0 0 / 55%);
}
button.folder {
  border: 0;
  cursor: pointer;
}
.folder::before {
  /* Pestaña de la carpeta. */
  content: '';
  position: absolute;
  top: -8px;
  left: 8px;
  width: 44px;
  height: 9px;
  border-radius: 5px 5px 0 0;
  background: var(--parch);
}
.folder-tab {
  font-family: var(--fell);
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #4a3214;
  white-space: nowrap;
  line-height: 1.2;
}
.slot {
  position: relative;
}
.card-back {
  /* Reverso de encuentro dibujado: sello sobre tela oscura, con grosor de mazo. */
  position: relative;
  width: 40px;
  height: 56px;
  border-radius: 6px;
  background:
    radial-gradient(circle at 50% 50%, rgb(90 160 135 / 40%), transparent 65%),
    repeating-linear-gradient(45deg, #1f3a33 0 5px, #183029 5px 10px);
  border: 2px solid #3d6b5e;
  display: grid;
  place-items: center;
  box-shadow:
    1px 1px 0 #2a4a40,
    2px 2px 0 #18302a,
    calc(var(--depth, 0) * 1px) calc(var(--depth, 0) * 1px) 0 #0e1d19,
    0 6px 14px rgb(0 0 0 / 60%);
}
.card-back::before {
  content: '';
  position: absolute;
  inset: 8px;
  background: #bfe6d6;
  opacity: 0.35;
  mask: var(--tex-sigil) center / contain no-repeat;
}
.card-back.official {
  background-size: cover;
  background-position: center;
  border-color: #222;
  text-shadow:
    0 1px 4px #000,
    0 0 2px #000;
}
.card-back strong {
  position: relative;
  font-family: var(--display);
  font-size: 1.1rem;
  text-shadow: 0 2px 4px #000;
}
.card-back.empty {
  background: transparent;
  border: 1px dashed #8a6c3c;
  box-shadow: none;
}
.card-back.empty::before {
  opacity: 0.12;
  background: #6e5631;
}
.bag {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: linear-gradient(180deg, #3a2a20, #1f150f);
  border-color: color-mix(in srgb, var(--trim) 50%, transparent);
  font-family: var(--fell);
  font-size: 0.85rem;
  align-self: center;
}
.bag-icon {
  /* Bolsa de tela cerrada con cordón. */
  width: 18px;
  height: 20px;
  border-radius: 40% 40% 50% 50% / 30% 30% 70% 70%;
  background: radial-gradient(circle at 40% 60%, #8a5a3a, #3a2214);
  box-shadow: inset 0 3px 0 -1px var(--trim);
}
.bag-tokens,
.test {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}
.test {
  padding: 4px 10px;
  border-radius: 8px;
  background: rgb(201 162 39 / 15%);
  border: 1px solid var(--accent);
}
.pile {
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}
.pile:hover {
  filter: brightness(1.15);
}
.pile.folder {
  padding: 4px 6px;
  background: linear-gradient(180deg, var(--parch), var(--parch-dark));
  color: var(--parch-ink);
}
.count {
  position: absolute;
  right: -6px;
  bottom: -6px;
  z-index: 2;
  min-width: 22px;
  padding: 1px 6px;
  border-radius: 11px;
  background: #111;
  border: 1px solid var(--border);
  font-size: 0.75rem;
  font-weight: 700;
}
.victory {
  margin-left: auto;
}
.badge-token {
  position: absolute;
  bottom: -10px;
  right: -10px;
  z-index: 2;
}
.card-back.official::before {
  display: none;
}
.scenario-row > * {
  flex: none;
}
.scenario-row::-webkit-scrollbar {
  display: none;
}
@media (max-width: 600px) {
  .scenario-row {
    gap: 8px;
    padding: 10px 8px 6px 58px;
  }
  .folder,
  .pile.folder {
    gap: 3px;
    padding: 4px;
  }
  .folder-tab {
    font-size: 0.58rem;
    letter-spacing: 0.02em;
  }
  .folder :deep(.game-card) {
    width: 76px !important;
    height: 54px !important;
  }
  .card-back,
  .pile :deep(.game-card) {
    width: 34px !important;
    height: 48px !important;
  }
  .badge-token {
    width: 26px !important;
    height: 26px !important;
    font-size: 11px !important;
    right: -4px;
    bottom: -5px;
  }
  .bag {
    min-height: 44px;
    padding: 6px 8px;
    font-size: 0.7rem;
  }
}
</style>
