import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const voiceId = 'hyKxCTlAqtnW188CgltM'
const output = 'apps/web/public/local-assets/story/audio/es'
const evidencePath = 'apps/web/src/game/edgeOfTheEarthNarration.json'
const { cardBacks } = JSON.parse(readFileSync(evidencePath, 'utf8'))
const { story } = JSON.parse(readFileSync('packages/i18n/src/edge-of-the-earth.es.json', 'utf8'))
const model = 'eleven_multilingual_v2'
const hash = (value) => createHash('sha256').update(value).digest('hex')
const entries = Object.entries(story)
  .filter(([part]) => part !== 'setup' && part !== 'partTwoSetup' && part !== 'partThreeSetup')
  .map(([part, { body }]) => ({
    key: `story.edgeOfTheEarth.${part}.body`,
    file: `edge-of-the-earth-${part}-${hash(body).slice(0, 12)}-salva.mp3`,
    text: body,
  }))
  .filter(({ key }) => !Object.hasOwn(cardBacks, key))

if (!process.argv.includes('--generate')) {
  console.log(JSON.stringify({ voiceId, model, entries }, null, 2))
} else {
  if (existsSync('.env')) process.loadEnvFile()
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) throw new Error('Falta ELEVENLABS_API_KEY')
  mkdirSync('tmp', { recursive: true })
  const progressPath = 'tmp/edge-of-the-earth-salva.json'
  const previous = existsSync(progressPath)
    ? JSON.parse(readFileSync(progressPath, 'utf8'))
    : JSON.parse(readFileSync(evidencePath, 'utf8'))
  const evidence = { voiceId, model, cardBacks, entries: [] }
  const selected = process.argv
    .find((arg) => arg.startsWith('--only='))
    ?.slice(7)
    .split(',')
  for (const { key, file, text } of entries) {
    const path = `${output}/${file}`
    const textSha256 = hash(text)
    const existing =
      previous?.voiceId === voiceId && previous.model === model
        ? previous.entries.find((entry) => entry.textSha256 === textSha256)
        : null
    if (
      existing?.textSha256 === textSha256 &&
      existsSync(`${output}/${existing.file}`) &&
      existing.audioSha256 === hash(readFileSync(`${output}/${existing.file}`))
    ) {
      evidence.entries.push({ ...existing, key })
      continue
    }
    if (selected && !selected.includes(key.split('.')[2])) continue
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: model, language_code: 'es' }),
      signal: AbortSignal.timeout(60000),
    })
    if (!response.ok || !response.headers.get('content-type')?.includes('audio/')) {
      throw new Error(
        `${key}: ElevenLabs ${response.status} ${(await response.text()).slice(0, 500)}`,
      )
    }
    const audio = Buffer.from(await response.arrayBuffer())
    writeFileSync(path, audio)
    evidence.entries.push({ key, file, textSha256, audioSha256: hash(audio) })
    const pending =
      previous.voiceId === voiceId && previous.model === model
        ? previous.entries.filter(
            (entry) =>
              entries.some((current) => current.key === entry.key) &&
              !evidence.entries.some((current) => current.key === entry.key),
          )
        : []
    writeFileSync(
      progressPath,
      JSON.stringify({ ...evidence, entries: [...evidence.entries, ...pending] }, null, 2) + '\n',
    )
    console.log(file)
  }
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n')
}
