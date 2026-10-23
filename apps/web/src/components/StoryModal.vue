<script setup lang="ts">
import StoryIcon from './StoryIcon.vue'
import StoryNarration from './StoryNarration.vue'
import type { GameState, LabelParams } from '@lcg/engine'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useLabels } from '../game/labels'
import { storyBody, toggleOfficial } from '../game/story'
import { useTableGame } from '../game/tableController'

/**
 * Textos de historia (introducción, resoluciones) en una ventana sobre la mesa,
 * con sus efectos de campaña y las decisiones; y el aviso de fin del escenario.
 */
const props = defineProps<{ state: GameState }>()
const game = useTableGame()
const router = useRouter()
const { t } = useI18n()
const label = useLabels()

const entry = computed(() => props.state.pending?.question.story ?? null)
const body = computed(() => (entry.value ? storyBody(entry.value.body) : null))

/** Los parámetros que son claves de texto (notas del registro…) se traducen. */
const params = (p: LabelParams = {}) =>
  Object.fromEntries(
    Object.entries(p).map(([k, v]) => [
      k,
      typeof v === 'string' && v.startsWith('story.') ? t(v) : v,
    ]),
  )

const endDismissed = ref(false)
watch(
  () => props.state.outcome,
  () => (endDismissed.value = false),
)
const ending = computed(
  () => !game.online && !entry.value && !!props.state.outcome && !endDismissed.value,
)

function newGame() {
  game.quit()
  void router.push('/')
}

/** En campaña: guarda el resultado y pasa al registro de campaña. */
function toCampaign() {
  game.closeScenario()
  void router.push('/campaign')
}
</script>

<template>
  <div v-if="entry && body" class="overlay">
    <article class="story">
      <h1>{{ t(entry.title) }}</h1>
      <StoryNarration v-if="body.narration" :key="body.narration" :src="body.narration" />
      <div class="body">
        <p v-for="(paragraph, i) in body.paragraphs" :key="i" :class="paragraph.kind">
          <template v-for="(span, j) in paragraph.spans" :key="j">
            <StoryIcon v-if="span.icon" :name="span.icon" />
            <b v-else-if="span.bold">{{ span.text }}</b>
            <i v-else-if="span.italic" class="em">{{ span.text }}</i>
            <template v-else>{{ span.text }}</template>
          </template>
        </p>
      </div>
      <section v-if="entry.effects?.length" class="effects">
        <h2>{{ t('table.campaignEffects') }}</h2>
        <ul>
          <li v-for="(effect, i) in entry.effects" :key="i">
            {{ t(effect.key, params(effect.params)) }}
          </li>
        </ul>
      </section>
      <p class="note">
        <template v-if="!body.official">{{ t('table.storySummary') }}</template>
        <button v-if="body.officialLocale" type="button" class="toggle" @click="toggleOfficial">
          {{ body.official ? t('table.summaryText') : t('table.officialText') }}
        </button>
      </p>
      <div class="options">
        <button
          v-for="(choice, i) in state.pending?.question.choices ?? []"
          :key="i"
          type="button"
          class="table-action"
          :data-choice-index="i"
          @click="game.answer(i)"
        >
          {{ label(choice.label, choice.params ?? {}) }}
        </button>
      </div>
    </article>
  </div>

  <div v-else-if="ending && state.outcome" class="overlay">
    <article class="story end">
      <h1>{{ t('table.scenarioOver') }}</h1>
      <p class="result">
        {{
          state.outcome.type === 'resolution'
            ? t('table.resolutionN', { n: state.outcome.resolution })
            : t('table.noResolution')
        }}
      </p>
      <div class="options">
        <button v-if="game.campaign" type="button" class="table-action" @click="toCampaign">
          {{ t('campaign.continue') }}
        </button>
        <button v-else type="button" class="table-action" @click="newGame">
          {{ t('table.newGame') }}
        </button>
        <button type="button" class="table-action secondary" @click="endDismissed = true">
          {{ t('table.viewTable') }}
        </button>
      </div>
    </article>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 900;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgb(0 0 0 / 65%);
}
.story {
  width: min(640px, 100%);
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  padding: 28px 32px 22px;
  border-radius: 6px;
  background: radial-gradient(ellipse at 50% 30%, #efe8dc 0%, #dcd3c3 70%, #c9bda8 100%);
  color: #2b2118;
  font-family: Georgia, 'Times New Roman', serif;
  box-shadow:
    0 0 0 2px #6b5a3a,
    0 12px 40px rgb(0 0 0 / 60%);
}
h1 {
  margin: 0 0 14px;
  text-align: center;
  font-size: 1.5rem;
  color: #5a1f14;
  letter-spacing: 0.02em;
}
.body p {
  margin: 0 0 12px;
  font-style: italic;
  font-size: 1.05rem;
  line-height: 1.55;
}
.effects {
  margin: 16px 0 8px;
  padding: 10px 14px;
  border-left: 3px solid #6b5a3a;
  background: rgb(0 0 0 / 6%);
}
.effects h2 {
  margin: 0 0 6px;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #5a4630;
}
.effects ul {
  margin: 0;
  padding-left: 18px;
}
.effects li {
  margin: 4px 0;
  line-height: 1.4;
}
.body p.instruction {
  font-style: normal;
  font-family: system-ui, sans-serif;
  font-size: 0.95rem;
  padding-left: 12px;
  border-left: 3px solid #6b5a3a;
}
.body p.item {
  font-style: normal;
  font-family: system-ui, sans-serif;
  font-size: 0.95rem;
  padding-left: 18px;
  text-indent: -12px;
}
.body p.item::before {
  content: '• ';
}
.body i.em {
  font-style: italic;
}
.body p.text i.em {
  font-style: normal;
}
.note {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  margin: 10px 0 0;
  font-size: 0.75rem;
  color: #5a4630;
}
.note .toggle {
  padding: 2px 8px;
  border: 1px solid #6b5a3a;
  border-radius: 3px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 18px;
}
.end .result {
  text-align: center;
  font-size: 1.2rem;
}
@media (max-width: 600px) {
  .overlay {
    padding: 10px;
  }
  .story {
    max-height: calc(100vh - 20px);
    padding: 18px 18px 16px;
  }
  h1 {
    margin-bottom: 10px;
    font-size: 1.15rem;
  }
  .body p {
    margin-bottom: 10px;
    font-size: 0.9rem;
    line-height: 1.45;
  }
  .body p.instruction,
  .body p.item,
  .effects li {
    font-size: 0.85rem;
  }
  .effects h2 {
    font-size: 0.75rem;
  }
  .options button {
    font-size: 0.9rem;
  }
  .end .result {
    font-size: 1.05rem;
  }
}
</style>
