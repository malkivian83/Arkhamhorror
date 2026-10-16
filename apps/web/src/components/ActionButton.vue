<script setup lang="ts">
import type { Choice } from '@lcg/engine'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ICON_GLYPHS } from '../game/assets'
import { useLabels } from '../game/labels'

/**
 * Botón de una opción en el menú de acciones de la mesa: símbolo de acción
 * básica, coste en acciones, nombre y la habilidad que se prueba (con su color).
 */
const props = defineProps<{ choice: Choice }>()
const { t } = useI18n()
const label = useLabels()

const display = computed(() => props.choice.display)
const text = computed(() =>
  display.value?.action
    ? t(`actionShort.${display.value.action}`)
    : label(props.choice.label, props.choice.params ?? {}),
)
/** Símbolos de coste: uno por acción, o el de rápida si no cuesta ninguna. */
const cost = computed(() => {
  const d = display.value
  if (!d) return ''
  return d.actions > 0 ? ICON_GLYPHS.action!.repeat(d.actions) : ICON_GLYPHS.fast!
})
const full = computed(() => label(props.choice.label, props.choice.params ?? {}))
</script>

<template>
  <button
    type="button"
    class="action-button"
    :class="[display?.skill ? `skill-${display.skill}` : '', display?.kind ?? 'plain']"
    :title="full"
  >
    <span v-if="display?.kind === 'basic'" class="section basic" :title="t('table.basicAction')">
      <i class="ahi">u</i><b class="fb">◆</b>
    </span>
    <span class="label">
      <template v-if="cost">
        <i class="ahi cost">{{ cost }}</i
        ><b class="fb cost">{{ display!.actions > 0 ? '➤'.repeat(display!.actions) : 'ϟ' }}</b>
      </template>
      <span>{{ text }}</span>
    </span>
    <span v-if="display?.skill" class="section skill">
      <i class="ahi">{{ ICON_GLYPHS[display.skill] }}</i
      ><b class="fb">{{ t(`skill.${display.skill}`).slice(0, 3) }}</b>
    </span>
  </button>
</template>

<style scoped>
.action-button {
  display: inline-flex;
  align-items: stretch;
  justify-content: center;
  width: 100%;
  min-width: max-content;
  padding: 0;
  margin: 0;
  border: 0;
  border-radius: 4px;
  overflow: hidden;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  background-color: #555;
}
.action-button:hover {
  filter: brightness(1.18);
}
.skill-willpower {
  background-color: #2c7fc0;
}
.skill-intellect {
  background-color: #7c3c85;
}
.skill-combat {
  background-color: #ae4236;
}
.skill-agility {
  background-color: #14854d;
}
.label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  flex: 1 1 auto;
  padding: 4px 8px;
}
.cost {
  font-size: 1.05em;
}
.section {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: stretch;
  padding: 4px 7px;
  background: rgb(0 0 0 / 14%);
  white-space: nowrap;
}
.section.basic {
  border-right: 1px solid rgb(255 255 255 / 18%);
}
.section.skill {
  border-left: 1px solid rgb(255 255 255 / 18%);
}
.section .ahi {
  font-size: 1.15em;
}
</style>
