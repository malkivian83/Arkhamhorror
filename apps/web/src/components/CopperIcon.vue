<script setup lang="ts">
import { useId } from 'vue'

/** Símbolos propios con el acabado de cobre de los iconos de navegación. */
const shapes = {
  guardian: {
    body: 'M24 3 43 10v13c0 10-9 17-19 22C14 40 5 33 5 23V10Z',
    inset: 'M24 5.5 40.5 11.5V23c0 8.5-7.5 15-16.5 19.5C15 38 7.5 31.5 7.5 23V11.5Z',
    engraving: '',
    shine: 'M24 14v20M15 23h18',
  },
  seeker: {
    body: 'M3 7h14l7 4 7-4h14v32H31l-7 5-7-5H3Z',
    inset: 'M5 9h12l6 3.5V40l-6-3H5Zm38 0H31l-6 3.5V40l6-3h12Z',
    engraving: '',
    shine: 'M24 13v26M10 17h7M10 23h7M31 17h7M31 23h7M10 29h5M33 29h5',
  },
  rogue: {
    body: 'M24 2 45 24 24 46 3 24Z',
    inset: 'M24 4.5 42.5 24 24 43.5 5.5 24Z',
    engraving: '',
    shine: 'M24 12v24M17 23h14m-10 9 3 4 3-4',
  },
  mystic: {
    body: 'M2 24Q24-8 46 24 24 56 2 24Z',
    inset: 'M4 24Q24-4 44 24 24 52 4 24Z',
    engraving: '',
    shine: 'M24 14a10 10 0 1 1 0 20 10 10 0 0 1 0-20Z M24 19v10',
  },
  survivor: {
    body: 'm25 2 6 12 13 1-9 11 4 17-15-8-15 8 4-17L4 15l14-1Z',
    inset: 'm25 5 5 11 11 1-8 9 3 13-12-7-12 7 3-13-8-9 12-1Z',
    engraving: '',
    shine: 'm27 14-7 11h9l-7 10',
  },
  neutral: {
    body: 'M24 3a21 21 0 1 1 0 42 21 21 0 0 1 0-42Z',
    inset: 'M24 5a19 19 0 1 1 0 38 19 19 0 0 1 0-38Z',
    engraving: '',
    shine: 'M24 14v20M14 24h20',
  },
  asset: {
    body: 'M16 16v-5a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v5h-4v-4H20v4Z M8 16h32a3 3 0 0 1 3 3v20a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V19a3 3 0 0 1 3-3Z',
    inset: 'M20 25h8v10h-8Z',
    engraving: 'M6 26q18 7 36 0M11 18v21M37 18v21',
    shine: 'M24 27v5M22 29h4M9 19h30',
  },
  event: {
    body: 'm29 4-20 24h13l-4 16 22-26H27Z',
    inset: 'm26 10-12 15h13l-5 13 13-17H23Z',
    engraving: '',
    shine: 'm26 10-12 15h13M8 11l4 4M39 34l3 3M5 22h4M37 9l-3 5',
  },
  skill: {
    body: 'M11 36C8 23 20 8 41 5c-2 12-8 24-18 29l-9 1-7 9-3-2Z',
    inset: '',
    engraving: 'M10 38 34 13M16 31l-1-9M21 26l-1-10M24 23l10-1M29 18l8-1',
    shine: 'M12 34 35 11M18 30l6-1',
  },
  investigator: {
    body: 'M24 4a20 20 0 1 1 0 40 20 20 0 0 1 0-40Z',
    inset: 'M24 8a16 16 0 1 1 0 32 16 16 0 0 1 0-32Z',
    engraving: 'M12 35c1-7 6-11 12-11s11 4 12 11M24 11a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z',
    shine:
      'M12 35c1-7 6-11 12-11s11 4 12 11M24 11a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z M8 19a17 17 0 0 1 25-10',
  },
  enemy: {
    body: 'm8 5 10 9h12l10-9-1 15 4 9-9 13H14L5 29l4-9Z',
    inset: 'm12 22 8 3-4 5-5-5Zm24 0-8 3 4 5 5-5ZM15 34l9-4 9 4-4 7H19Z',
    engraving: '',
    shine: 'm18 35 2 4 4-3 4 3 2-4M12 15l5 3M36 15l-5 3M23 17h2',
  },
  treachery: {
    body: 'm24 3 5 9 10-2-1 11 7 6-9 5-1 11-11-4-10 4-2-11-9-5 8-6-2-11 10 2Z',
    inset: 'M10 25q14-17 28 0-14 16-28 0Z',
    engraving: '',
    shine: 'M24 17q8 7 0 15-8-8 0-15Z m-2-11 3 8-5 7 6 9-3 10',
  },
  hand: {
    body: 'M14 25V12a2.6 2.6 0 0 1 5.2 0v10V7a2.6 2.6 0 0 1 5.2 0v15V9a2.6 2.6 0 0 1 5.2 0v14V14a2.6 2.6 0 0 1 5.2 0v16c0 5-2 8-4 11v4H16v-5L7 29a2.8 2.8 0 0 1 4-4l5 5Z',
    inset: '',
    engraving: 'M19 23v7M25 23v7M30 24v7M16 35q5-5 9-3M17 40h13',
    shine: 'M17 14v10M22 9v15M28 11v13M33 16v10M18 43h11',
  },
  accessory: {
    body: 'M10 5c0 11 4 17 14 22C34 22 38 16 38 5h-4c0 9-3 14-10 18-7-4-10-9-10-18Z M24 23l11 10-11 12-11-12Z',
    inset: 'm24 28 6 5-6 7-6-7Z',
    engraving: '',
    shine: 'm24 30 3 3-3 4-3-4Z M11 7l3 10M37 7l-3 10M17 33l7-7',
  },
  arcane: {
    body: 'M24 8a18 18 0 1 1 0 36 18 18 0 0 1 0-36Z M21 8V4h6v4Z',
    inset: 'M24 12a14 14 0 1 1 0 28 14 14 0 0 1 0-28Z',
    engraving: '',
    shine: 'm24 13 4 9 10 1-8 7 2 10-8-5-8 5 2-10-8-7 10-1Z M10 19a15 15 0 0 1 11-8',
  },
  ally: {
    body: 'M7 43v-8c0-6 7-12 17-12s17 6 17 12v8Z M15 14a9 9 0 0 1 18 0v2c0 6-4 10-9 10s-9-4-9-10Z',
    inset: 'm24 29 3 4-3 6-3-6Z',
    engraving: 'm17 25 7 13 7-13M24 38v5M16 29l-3 8 6-2M32 29l3 8-6-2',
    shine: 'M17 12q6-7 13-1M10 36v4M38 36v4',
  },
  body: {
    body: 'm16 5 8 4 8-4 12 8-6 12-6-3v22H16V22l-6 3-6-12Z',
    inset: 'm16 5 8 4-6 10-5-10Zm16 0-8 4 6 10 5-10Z',
    engraving: 'M27 23h1M27 29h1M27 35h1',
    shine: 'M24 16v26M10 14l4 4M38 14l-4 4M18 32h3M28 32h3M18 42h13',
  },
  head: {
    body: 'M12 29 15 10q4-4 9 0 5-4 9 0l3 19c6 1 9 3 9 6 0 5-11 8-21 8S3 40 3 35c0-3 3-5 9-6Z',
    inset: 'm13 25-1 5q12 6 24 0l-1-5q-11 5-22 0Z',
    engraving: '',
    shine: 'M16 14v8M17 12q4-3 7 1M7 35q17 9 34 0M33 26v6h-4v-5Z',
  },
} as const

defineProps<{ symbol: keyof typeof shapes; accent?: string }>()
const id = useId()
const metal = `${id}-metal`
const edge = `${id}-edge`
const inset = `${id}-inset`
</script>

<template>
  <svg class="copper-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient
        :id="metal"
        x1="0.18"
        y1="0"
        x2="0.82"
        y2="1"
        gradientUnits="objectBoundingBox"
      >
        <stop offset="0" stop-color="#ffdfb1" />
        <stop offset="0.28" stop-color="#d99c68" />
        <stop offset="0.52" stop-color="#a65e35" />
        <stop offset="0.72" stop-color="#edb883" />
        <stop offset="1" stop-color="#713c27" />
      </linearGradient>
      <linearGradient :id="edge" x1="0" y1="0" x2="0.6" y2="1" gradientUnits="objectBoundingBox">
        <stop stop-color="#ffe5bf" />
        <stop offset="0.5" stop-color="#ca8b5a" />
        <stop offset="1" stop-color="#633521" />
      </linearGradient>
      <linearGradient :id="inset" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
        <stop :stop-color="accent ?? '#38241e'" />
        <stop v-if="accent" offset="0.55" :stop-color="accent" />
        <stop
          offset="1"
          :stop-color="accent ? `color-mix(in srgb, ${accent} 80%, #17171c)` : '#6e432f'"
        />
      </linearGradient>
    </defs>
    <path
      :d="shapes[symbol].body"
      :fill="`url(#${metal})`"
      :stroke="`url(#${edge})`"
      :stroke-width="accent ? 1 : 1.5"
    />
    <path
      v-if="shapes[symbol].inset"
      :d="shapes[symbol].inset"
      :fill="`url(#${inset})`"
      :stroke="`url(#${edge})`"
      :stroke-width="accent ? 0.6 : 1"
    />
    <path
      v-if="shapes[symbol].engraving"
      :d="shapes[symbol].engraving"
      fill="none"
      stroke="#75412a"
      stroke-width="1.8"
    />
    <path :d="shapes[symbol].shine" fill="none" stroke="#ffe0ad" stroke-width="1.5" />
  </svg>
</template>

<style scoped>
.copper-icon {
  display: inline-block;
  width: 24px;
  height: 24px;
  flex: none;
  vertical-align: middle;
  overflow: visible;
  filter: drop-shadow(0 1px 1px #0009);
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
