import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const root = 'apps/web/public/local-assets/story'
const texts = JSON.parse(readFileSync(`${root}/es.json`, 'utf8'))
const { voiceId, voiceName, settings } = JSON.parse(
  readFileSync('docs-proyecto/evidencias/fortuna-narracion.json', 'utf8'),
)
if (voiceId !== 'hyKxCTlAqtnW188CgltM') throw new Error('Se requiere la voz de Salva')
const keys = ['intro', 'noResolution', 'resolution1', 'resolution2', 'sacrifice', 'abbess']
const entries = keys.map((suffix) => ({
  key: `story.carnevale.${suffix}`,
  file: `carnevale-${suffix.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}-salva.mp3`,
  text: texts[`story.carnevale.${suffix}`]
    .split(/\n\s*\n/)
    .filter((p) => !/^[»•]/.test(p.trim()))
    .map((p) => p.replace(/[_*]/g, '').trim())
    .join('\n\n'),
}))
const hash = (data) => createHash('sha256').update(data).digest('hex')
if (process.argv.includes('--list')) {
  console.log(JSON.stringify({ voiceId, entries }, null, 2))
} else {
  if (existsSync('.env')) process.loadEnvFile()
  if (!process.env.ELEVENLABS_API_KEY) throw new Error('Falta ELEVENLABS_API_KEY')
  const evidencePath = 'docs-proyecto/evidencias/carnevale-guia-narracion.json'
  const evidence = existsSync(evidencePath)
    ? JSON.parse(readFileSync(evidencePath, 'utf8'))
    : { voiceId, voiceName, language: 'es', settings, files: [] }
  for (const entry of entries) {
    const path = `${root}/audio/es/${entry.file}`
    const inputHash = hash(JSON.stringify({ text: entry.text, voiceId, ...settings }))
    const previous = evidence.files.find((f) => f.key === entry.key)
    if (existsSync(path)) {
      if (previous?.inputHash !== inputHash || previous.sha256 !== hash(readFileSync(path)))
        throw new Error(`Huella distinta: ${entry.file}`)
      console.log(`Conservado ${entry.file}`)
      continue
    }
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: entry.text, ...settings }),
        signal: AbortSignal.timeout(120000),
      },
    )
    if (!response.ok) throw new Error(`ElevenLabs HTTP ${response.status}`)
    if (!response.headers.get('content-type')?.includes('audio'))
      throw new Error('Respuesta sin audio')
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.length < 1000) throw new Error('Audio incompleto')
    writeFileSync(path, bytes)
    evidence.files.push({ ...entry, inputHash, bytes: bytes.length, sha256: hash(bytes) })
    writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n')
    console.log(`Generado ${entry.file} (${bytes.length} bytes)`)
  }
}
