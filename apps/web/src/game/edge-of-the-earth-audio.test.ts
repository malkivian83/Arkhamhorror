import cover from '../../../../docs-proyecto/evidencias/edge-of-the-earth-portada.json'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import texts from '../../../../packages/i18n/src/edge-of-the-earth.es.json'
import { edgeOfTheEarthCards } from '@lcg/i18n/es'
import recordings from './edgeOfTheEarthNarration.json'
import { setAppLocale } from '../i18n'
import { campaignCover } from './campaignProgress'
import { storyNarration } from './narration'
import { storyBody } from './story'

const hash = (input: Buffer | string) => createHash('sha256').update(input).digest('hex')

it('serves every Spanish narrative passage with a recording that matches the displayed text', () => {
  expect(recordings.voiceId).toBe('hyKxCTlAqtnW188CgltM')
  const expected = new Map(
    Object.entries(texts.story)
      .filter(([part]) => !['setup', 'partTwoSetup', 'partThreeSetup'].includes(part))
      .map(([part, { body }]) => [`story.edgeOfTheEarth.${part}.body`, hash(body)]),
  )
  expect(
    [...recordings.entries.map(({ key }) => key), ...Object.keys(recordings.cardBacks)].sort(),
  ).toEqual([...expected.keys()].sort())
  for (const { key, file, textSha256, audioSha256 } of recordings.entries) {
    expect(textSha256).toBe(expected.get(key))
    const path = storyNarration(key, 'es')
    expect(path).toBe(`/local-assets/story/audio/es/${file}`)
    const audio = readFileSync(new URL(`../../public${path}`, import.meta.url))
    expect(file).toMatch(/-salva\.mp3$/)
    expect(audio.length).toBeGreaterThan(1000)
    expect(
      audio.subarray(0, 3).toString() === 'ID3' ||
        (audio[0] === 0xff && (audio[1]! & 0xe0) === 0xe0),
    ).toBe(true)
    expect(hash(audio)).toBe(audioSha256)
    expect(storyNarration(key, 'en')).toBeNull()
  }
  for (const [key, code] of Object.entries(recordings.cardBacks)) {
    const body = edgeOfTheEarthCards[code]!.backFlavor!.trim().replace(/\\n|\n/g, '\n\n')
    expect(hash(body)).toBe(expected.get(key))
    expect(storyNarration(key, 'es')).toBe(`/local-assets/cards/audio/es/${code}-back.mp3`)
    expect(storyNarration(key, 'en')).toBeNull()
  }
  expect(storyNarration('story.edgeOfTheEarth.setup.body', 'es')).toBeNull()
  expect(storyNarration('story.edgeOfTheEarth.restfulNight.body', 'es')).toBeTruthy()
})

it('offers the recording in the story modal for the displayed Spanish passage', async () => {
  const key = 'story.edgeOfTheEarth.resolution1.body'
  await setAppLocale('es', false)
  expect(storyBody(key)).toMatchObject({
    official: false,
    paragraphs: [{ kind: 'text', spans: [{ text: texts.story.resolution1.body }] }],
    narration: storyNarration(key, 'es'),
  })
  await setAppLocale('en', false)
  expect(storyBody(key).narration).toBeNull()
})

it('serves the campaign cover from the selector URL', () => {
  const path = campaignCover('edge-of-the-earth')
  expect(path).toBe(cover.path)
  const image = readFileSync(new URL(`../../public${path}`, import.meta.url))
  expect(image.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]))
  expect(image.length).toBe(cover.bytes)
  expect(hash(image)).toBe(cover.sha256)
})
