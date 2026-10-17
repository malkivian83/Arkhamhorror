<script setup lang="ts">
import type { GameState, PhaseStep } from '@lcg/engine'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * Pasos de la ronda (reglamento, "Round Structure"), como en la referencia: las
 * cuatro fases con sus pasos numerados y el paso en curso resaltado, con su
 * descripción debajo.
 */
const props = defineProps<{ state: GameState }>()
const { t } = useI18n()

const PHASES: { phase: GameState['phase']; steps: PhaseStep[] }[] = [
  {
    phase: 'mythos',
    steps: ['mythosBegins', 'placeDoom', 'checkDoom', 'drawEncounter', 'mythosEnds'],
  },
  {
    phase: 'investigation',
    steps: ['investigationBegins', 'turnBegins', 'takeActions', 'turnEnds', 'investigationEnds'],
  },
  { phase: 'enemy', steps: ['enemyBegins', 'huntersMove', 'resolveAttacks', 'enemyEnds'] },
  {
    phase: 'upkeep',
    steps: [
      'upkeepBegins',
      'resetActions',
      'readyExhausted',
      'drawAndGainResource',
      'checkHandSize',
      'upkeepEnds',
    ],
  },
]

const current = computed(() => props.state.phaseStep)
const currentText = computed(() =>
  current.value
    ? `${t(`phaseStep.${current.value}.n`)} · ${t(`phaseStep.${current.value}.text`)}`
    : '',
)
</script>

<template>
  <section class="tracker" :aria-label="t('phaseStep.tracker')">
    <div
      v-for="p in PHASES"
      :key="p.phase"
      class="phase"
      :class="[`ph-${p.phase}`, { active: state.phase === p.phase }]"
    >
      <span class="name">{{ t(`phase.${p.phase}`) }}</span>
      <span class="steps">
        <span
          v-for="s in p.steps"
          :key="s"
          class="step"
          :class="{ current: state.phase === p.phase && current === s }"
          :title="`${t(`phaseStep.${s}.n`)} · ${t(`phaseStep.${s}.text`)}`"
          >{{ t(`phaseStep.${s}.n`) }}</span
        >
      </span>
    </div>
    <p v-if="currentText" class="now" aria-live="polite">{{ currentText }}</p>
  </section>
</template>

<style scoped>
.tracker {
  display: grid;
  gap: 3px;
  margin: 6px 0 8px;
  font-size: 0.75rem;
}
.phase {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px;
  border-radius: 3px;
  opacity: 0.55;
}
.phase.active {
  opacity: 1;
  background: rgb(0 0 0 / 8%);
  box-shadow: inset 3px 0 0 currentColor;
}
.name {
  width: 7.5em;
  font-weight: 700;
}
.steps {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}
.step {
  padding: 0 4px;
  border: 1px solid rgb(0 0 0 / 25%);
  border-radius: 3px;
  font-variant-numeric: tabular-nums;
  cursor: help;
}
.step.current {
  background: #5a1f14;
  border-color: #5a1f14;
  color: #fff;
  font-weight: 700;
}
.now {
  margin: 2px 0 0;
  font-style: italic;
}
</style>
