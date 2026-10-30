<script setup lang="ts">
import { playerCardDef } from '@lcg/engine'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardTextHtml } from '../game/cardText'
import { localizedCards } from '../game/localized'
import ClassIcon from './ClassIcon.vue'
import SkillIcon from './SkillIcon.vue'

/**
 * Datos y texto de reglas de una carta de jugador como texto real, legible y
 * accesible aunque la imagen esté en otro idioma o sea demasiado pequeña.
 */
const props = defineProps<{ code: string; compact?: boolean }>()
const { t, te } = useI18n()
const SKILLS = ['willpower', 'intellect', 'combat', 'agility', 'wild'] as const
const def = computed(() => playerCardDef(props.code))
const card = computed(() => localizedCards.value.get(props.code))
const classes = computed(() => def.value?.classes ?? [def.value?.class ?? 'neutral'])
const slots = computed(() =>
  (def.value?.slots ?? []).map((slot) => (te(`slot.${slot}`) ? t(`slot.${slot}`) : slot)),
)
/** ArkhamDB codifica un coste X como -2. */
const cost = computed(() => {
  const value = card.value?.cost ?? def.value?.cost
  return value === -2 ? 'X' : (value ?? null)
})
const icons = computed(() =>
  SKILLS.flatMap((skill) => {
    const n = def.value?.icons?.[skill] ?? 0
    return n ? [{ skill, n }] : []
  }),
)
const skillName = (skill: (typeof SKILLS)[number]) =>
  skill === 'wild' ? t('campaign.shop.wild') : t(`skill.${skill}`)
const text = computed(() => cardTextHtml(card.value?.text))
</script>

<template>
  <div class="card-info" :class="{ compact }">
    <p class="meta">
      <ClassIcon v-for="faction in classes" :key="faction" :faction="faction" />
      <span>{{ card?.type_name ?? def?.type }}</span>
      <span v-if="slots.length">· {{ slots.join(', ') }}</span>
    </p>
    <dl class="stats">
      <div v-if="cost !== null">
        <dt>{{ t('campaign.shop.resourceCost') }}</dt>
        <dd>{{ cost }}</dd>
      </div>
      <div>
        <dt>{{ t('campaign.shop.level') }}</dt>
        <dd>{{ def?.xp ?? 0 }}</dd>
      </div>
      <div v-if="icons.length">
        <dt>{{ t('campaign.shop.icons') }}</dt>
        <dd class="icons">
          <span v-for="icon in icons" :key="icon.skill" class="icon">
            <SkillIcon :skill="icon.skill" aria-hidden="true" />
            <span class="visually-hidden">{{ skillName(icon.skill) }}</span>
            <template v-if="icon.n > 1">×{{ icon.n }}</template>
          </span>
        </dd>
      </div>
    </dl>
    <p v-if="card?.traits" class="traits">{{ card.traits }}</p>
    <!-- eslint-disable-next-line vue/no-v-html -- texto saneado en cardTextHtml -->
    <div v-if="text" class="text" v-html="text" />
  </div>
</template>

<style scoped>
.card-info {
  display: grid;
  gap: 6px;
  min-width: 0;
  font-size: 0.9375rem;
  line-height: 1.45;
}
p,
dl,
dd {
  margin: 0;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  color: var(--site-ink-soft);
  font-size: 0.8125rem;
}
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 0.8125rem;
}
.stats > div {
  display: flex;
  align-items: center;
  gap: 4px;
}
.stats dt {
  color: var(--site-muted);
}
.stats dt::after {
  content: ':';
}
.stats dd {
  font-weight: 700;
  color: var(--site-ink);
}
.icons {
  display: flex;
  gap: 6px;
}
.icon {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.traits {
  font-style: italic;
  font-weight: 600;
  color: var(--site-ink-soft);
  font-size: 0.875rem;
}
.text {
  padding-left: 10px;
  border-left: 3px solid var(--site-border-strong);
  color: var(--site-ink);
  overflow-wrap: anywhere;
}
.text :deep(hr) {
  border: 0;
  border-top: 1px solid var(--site-line);
}
/* En la lista solo se recorta visualmente: el lector de pantalla recibe el texto completo. */
.compact .text {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
  font-size: 0.875rem;
}
</style>
