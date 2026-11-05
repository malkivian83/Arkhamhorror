import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import texts from '../../../../packages/i18n/src/edge-of-the-earth.es.json'
import recordings from './edgeOfTheEarthNarration.json'
import { setAppLocale } from '../i18n'
import { storyNarration } from './narration'
import { storyBody } from './story'

const hash = (input: Buffer | string) => createHash('sha256').update(input).digest('hex')

it('serves every Spanish narrative passage using a recording of the displayed text', () => {
  expect(recordings.voiceId).toBe('hyKxCTlAqtnW188CgltM')
  const expected = Object.entries(texts.story)
    .filter(([part]) => part !== 'setup' && part !== 'partTwoSetup' && part !== 'partThreeSetup')
    .map(([part, { body }]) => [`story.edgeOfTheEarth.${part}.body`, hash(body)])
  expect(recordings.entries.map(({ key, textSha256 }) => [key, textSha256])).toEqual(expected)
  for (const { key, file, audioSha256 } of recordings.entries) {
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
  expect(storyNarration('story.edgeOfTheEarth.setup.body', 'es')).toBeNull()
})

it('offers the recording in the story modal for the displayed Spanish summary', async () => {
  const key = 'story.edgeOfTheEarth.crash.body'
  await setAppLocale('es', false)
  expect(storyBody(key)).toMatchObject({
    official: false,
    paragraphs: [{ kind: 'text', spans: [{ text: texts.story.crash.body }] }],
    narration: storyNarration(key, 'es'),
  })
  await setAppLocale('en', false)
  expect(storyBody(key).narration).toBeNull()
})
