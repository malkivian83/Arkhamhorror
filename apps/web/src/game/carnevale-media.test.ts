import { expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { campaignCover } from './campaignProgress'
import { storyNarration } from './narration'
import evidence from '../../../../docs-proyecto/evidencias/carnevale-guia-narracion.json'
import cover from '../../../../docs-proyecto/evidencias/carnevale-portada.json'

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../../public${path}`, import.meta.url)))
const hash = (data: string | Buffer) => createHash('sha256').update(data).digest('hex')

it('serves the Carnevale cover at the campaign selector URL', () => {
  expect(campaignCover('carnevale-of-horrors')).toBe(cover.path)
  const bytes = read(cover.path)
  expect(bytes.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]))
  expect(hash(bytes)).toBe(cover.sha256)
})

it('connects every narrative guide entry to its Spanish text and Salva recording, excluding rules', () => {
  const texts = JSON.parse(read('/local-assets/story/es.json').toString())
  expect(evidence.voiceId).toBe('hyKxCTlAqtnW188CgltM')
  expect(evidence.files.map((f) => f.key).sort()).toEqual(
    ['intro', 'noResolution', 'resolution1', 'resolution2', 'sacrifice', 'abbess']
      .map((key) => `story.carnevale.${key}`)
      .sort(),
  )
  for (const recording of evidence.files) {
    const narrative = texts[recording.key]
      .split(/\n\s*\n/)
      .filter((p: string) => !/^[»•]/.test(p.trim()))
      .map((p: string) => p.replace(/[_*]/g, '').trim())
      .join('\n\n')
    expect(recording.text).toBe(narrative)
    expect(narrative).not.toMatch(/Anota en el registro|Cada investigador|tamaño del mazo|^[»•]/m)
    expect(
      hash(JSON.stringify({ text: narrative, voiceId: evidence.voiceId, ...evidence.settings })),
    ).toBe(recording.inputHash)
    const path = storyNarration(recording.key, 'es')!
    expect(path).toBe(`/local-assets/story/audio/es/${recording.file}`)
    expect(hash(read(path))).toBe(recording.sha256)
    expect(read(path).length).toBe(recording.bytes)
    expect(storyNarration(recording.key, 'en')).toBeNull()
  }
  expect(storyNarration('story.carnevale.setup', 'es')).toBeNull()
  expect(storyNarration('story.carnevale.additionalRewards', 'es')).toBeNull()
})
