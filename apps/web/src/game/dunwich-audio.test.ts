import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import evidence from '../../../../docs-proyecto/evidencias/dunwich-nico-narracion.json'
import { storyNarration } from './narration'

it('connects all implemented Dunwich narratives to their complete transcripts and exact Nico voice', () => {
  expect(evidence.voiceName).toBe('Nico - History & Documentary')
  expect(evidence.voiceId).toBe('FXn3GKRRt9FCEyTbrkaL')
  expect(evidence.files).toHaveLength(43)
  const transcripts = JSON.parse(
    readFileSync(
      fileURLToPath(new URL('../../public/local-assets/story/es.json', import.meta.url)),
      'utf8',
    ),
  ) as Record<string, string>
  const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
  for (const recording of evidence.files) {
    const path = storyNarration(recording.key, 'es')!
    expect(path).toBe(`/local-assets/story/audio/es/${recording.file}`)
    expect(storyNarration(recording.key, 'en')).toBeNull()
    const bytes = readFileSync(fileURLToPath(new URL(`../../public${path}`, import.meta.url)))
    expect(bytes.subarray(0, 3).toString()).toBe('ID3')
    expect(bytes.length).toBe(recording.bytes)
    expect(sha(bytes)).toBe(recording.sha256)
    const text = transcripts[recording.key]!.replace(/[_*]/g, '').trim()
    expect(text.length).toBe(recording.characters)
    expect(sha(JSON.stringify({ text, voiceId: evidence.voiceId, ...evidence.settings }))).toBe(
      recording.inputHash,
    )
    expect(text).not.toMatch(
      /\{\w+\}|<[^>]+>|puntos de experiencia|sufre.*trauma|Anota en el registro/,
    )
  }
  expect(storyNarration('story.dunwich.setup', 'es')).toBeNull()
})
