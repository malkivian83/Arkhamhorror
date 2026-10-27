<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { startNarration, stopNarration } from '../game/narrationPlayback'

/** Narración grabada de un texto de historia: reproducir/pausar y avance. */
defineProps<{ src: string }>()
const { t } = useI18n()

const audio = ref<HTMLAudioElement | null>(null)
const playing = ref(false)
const current = ref(0)
const duration = ref(0)

function toggle() {
  const el = audio.value
  if (!el) return
  if (el.paused) void el.play().catch(() => (playing.value = false))
  else el.pause()
}

function onTime() {
  current.value = audio.value?.currentTime ?? 0
}

function onPlay() {
  if (audio.value) startNarration(audio.value)
  playing.value = true
}

function onMetadata() {
  const value = audio.value?.duration ?? 0
  duration.value = Number.isFinite(value) ? value : 0
}

function seek(event: Event) {
  if (audio.value) audio.value.currentTime = Number((event.target as HTMLInputElement).value)
}

const clock = (seconds: number) => {
  const total = Math.floor(seconds)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
const time = computed(() =>
  duration.value ? `${clock(current.value)} / ${clock(duration.value)}` : '',
)

// Al pasar al siguiente texto, la narración se calla.
onBeforeUnmount(() => {
  if (audio.value) stopNarration(audio.value)
})
</script>

<template>
  <div class="narration">
    <audio
      ref="audio"
      :src="src"
      preload="metadata"
      @play="onPlay"
      @pause="playing = false"
      @ended="playing = false"
      @timeupdate="onTime"
      @loadedmetadata="onMetadata"
    />
    <button
      type="button"
      class="play"
      :aria-label="playing ? t('table.pauseNarration') : t('table.playNarration')"
      @click="toggle"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path v-if="playing" d="M7 5h4v14H7zM13 5h4v14h-4z" />
        <path v-else d="M8 5v14l11-7z" />
      </svg>
    </button>
    <div class="track">
      <span class="caption">
        {{ playing ? t('table.pauseNarration') : t('table.playNarration') }}
      </span>
      <div class="bar">
        <input
          type="range"
          min="0"
          :max="duration"
          step="0.1"
          :value="current"
          :disabled="!duration"
          :aria-label="t('table.narrationPosition')"
          @input="seek"
        />
        <span class="time">{{ time }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.narration {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0 0 16px;
  padding: 10px 14px;
  border: 1px solid rgb(107 90 58 / 45%);
  border-radius: 6px;
  background: rgb(0 0 0 / 5%);
}
.play {
  flex: none;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #5a1f14;
  color: #efe8dc;
  cursor: pointer;
  box-shadow: 0 2px 6px rgb(0 0 0 / 30%);
}
.play:hover {
  background: #74291b;
}
.play:focus-visible {
  outline: 2px solid #2f6141;
  outline-offset: 3px;
}
.play svg {
  width: 24px;
  height: 24px;
  fill: currentcolor;
}
.track {
  flex: 1;
  min-width: 0;
}
.caption {
  font-family: system-ui, sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--narration-text, #5a4630);
}
.bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}
.time {
  flex: none;
  font-family: system-ui, sans-serif;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  color: var(--narration-text, #5a4630);
}
input[type='range'] {
  flex: 1;
  min-width: 0;
  margin: 0;
  accent-color: var(--narration-accent, #5a1f14);
  cursor: pointer;
}
input[type='range']:disabled {
  cursor: default;
}
</style>
