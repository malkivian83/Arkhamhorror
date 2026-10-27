type Narration = Pick<HTMLAudioElement, 'pause'>
let active: Narration | null = null

/** Las narraciones de historia y de cartas comparten un único canal de voz. */
export function startNarration(audio: Narration): void {
  if (active && active !== audio) active.pause()
  active = audio
}

export function stopNarration(audio: Narration): void {
  audio.pause()
  if (active === audio) active = null
}
