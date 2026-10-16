<script setup lang="ts">
import { ICON_GLYPHS } from '../game/assets'

/** Icono de habilidad: símbolo oficial si la fuente está disponible; si no, una letra. */
defineProps<{ skill: 'willpower' | 'intellect' | 'combat' | 'agility' | 'wild' }>()

const CLASS = { willpower: 'wil', intellect: 'int', combat: 'com', agility: 'agi', wild: 'wild' }
const LETTER = { willpower: 'V', intellect: 'I', combat: 'C', agility: 'A', wild: '?' }
</script>

<template>
  <span class="ci sk" :class="CLASS[skill]">
    <i v-if="skill !== 'wild'" class="ahi">{{ ICON_GLYPHS[skill] }}</i>
    <b class="fb">{{ LETTER[skill] }}</b>
  </span>
</template>
