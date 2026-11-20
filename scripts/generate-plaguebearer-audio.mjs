// --generate consume ElevenLabs; sin él solo enumera los relatos locales.
// Reanuda por huellas y nunca sobrescribe una grabación distinta.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const voiceId = 'z3kTTwYbQrmL7ckdGcJi'
const root = 'apps/web/public/local-assets/story/audio/es'
const evidencePath = 'docs-proyecto/evidencias/plaguebearer-narracion.json'
const manifestPath = 'apps/web/src/game/plaguebearerNarrationManifest.json'
const sourcePath = 'packages/i18n/src/plaguebearer.es.json'
const source = JSON.parse(readFileSync(sourcePath, 'utf8')).story
const published = JSON.parse(readFileSync('apps/web/public/local-assets/story/es.json', 'utf8'))
const settings = {
  model_id: 'eleven_multilingual_v2',
  voice_settings: {
    stability: 0.45,
    similarity_boost: 0.8,
    style: 0.15,
    speed: 0.95,
    use_speaker_boost: true,
  },
}
const format = 'mp3_44100_128'
const hash = (value) => createHash('sha256').update(value).digest('hex')
const entries = [
  'prologue',
  'intro',
  'hidden',
  'reagent',
  'resolution1',
  'resolution2',
  'resolution3',
  'night.intro',
  'night.resolution1',
  'night.resolution2',
  ...Object.keys(source.night.npc).flatMap((code) =>
    ['saved', 'lost'].map((outcome) => `night.npc.${code}.${outcome}`),
  ),
  ...['section1', 'section2', 'section3', 'section4', 'hidden', 'hiddenGift'].map(
    (k) => `friends.${k}`,
  ),
  ...[
    'intro1',
    'intro2',
    'intro3',
    'intro4',
    'resolution1',
    'resolution2',
    'resolution3',
    'resolution4',
    'resolution5',
    'resolution5Hidden',
  ].map((k) => `dawn.${k}`),
  ...[
    'section1',
    'section2',
    'section3',
    'section4',
    'section5',
    'section6',
    'section7',
    'section8',
    'perks',
    'good',
  ].map((k) => `alive.${k}`),
  ...['intro', 'introHidden', 'defeated', 'defeatedHidden', 'resolution1', 'resolution2'].map(
    (k) => `chorus.${k}`,
  ),
  ...[
    'intro',
    'hibbs',
    'store',
    'bank',
    'library',
    'boarding',
    'shop',
    'advertiser',
    'docks',
    'hidden',
  ].map((k) => `allied.${k}`),
  ...['lesson1', 'portals', 'first', 'baalshandor', 'lesson2'].map((k) => `history.${k}`),
  ...[
    'intro1',
    'intro2',
    'intro3',
    'intro4',
    'intro5',
    'intro6',
    'defeated',
    'threshold',
    'resolution1',
    'resolution2',
  ].map((k) => `noon.${k}`),
  ...['intro1', 'intro2', 'intro3', 'resolution1', 'resolution2', 'resolution3', 'whispers'].map(
    (k) => `war.${k}`,
  ),
  ...['section1', 'section2', 'section3', 'section4'].map((k) => `confrontation.${k}`),
  ...[
    'intro1',
    'intro2',
    'intro3',
    'intro4',
    'intro5',
    'intro6',
    'resolution1',
    'resolution2',
    'tablet',
    'defeated',
  ].map((k) => `sundown.${k}`),
  ...[
    'intro1',
    'intro2',
    'resolution0',
    'resolution1',
    'resolution2',
    'resolution3',
    'resolution4',
    'resolution5',
    'resolution6',
    'resolution7',
    'resolution8',
    'epilogue.reagent',
    'epilogue.gift',
    'epilogue.united',
    'epilogue.west',
  ].map((k) => `midnight.${k}`),
].map((suffix) => {
  const body = suffix.split('.').reduce((value, key) => value?.[key], source)
  if (typeof body !== 'string' || !body) throw new Error(`Falta ${suffix}`)
  if (published[`story.plaguebearer.${suffix}`] !== body)
    throw new Error(`El relato ${suffix} no está publicado en el catálogo que habilita el audio`)
  const text = body
    .split(/\n\s*\n/)
    .filter((p) => !/^[»•]/.test(p.trim()))
    .map((p) => p.replace(/[_*]/g, '').trim())
    .join('\n\n')
  if (!text || /<[^>]+>|\{\w+\}/.test(text)) throw new Error(`Texto inválido: ${suffix}`)
  return {
    key: `story.plaguebearer.${suffix}`,
    file: `plaguebearer-${suffix.replaceAll('.', '-').replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}-martin-osborne.mp3`,
    text,
  }
})

const generate = process.argv.includes('--generate')
if (!generate && !process.argv.includes('--refresh')) {
  console.log(
    JSON.stringify(
      { voiceId, characters: entries.reduce((n, e) => n + e.text.length, 0), entries },
      null,
      2,
    ),
  )
} else {
  if (generate && !process.env.ELEVENLABS_API_KEY && existsSync('.env')) process.loadEnvFile()
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (generate && !apiKey) throw new Error('Falta ELEVENLABS_API_KEY')
  const headers = { 'xi-api-key': apiKey }
  const evidence = existsSync(evidencePath)
    ? JSON.parse(readFileSync(evidencePath, 'utf8'))
    : {
        voiceId,
        voiceName: 'Martin Osborne - Polished and Intense',
        language: 'es',
        sourcePath,
        format,
        settings,
        files: [],
      }
  if (
    evidence.voiceId !== voiceId ||
    evidence.format !== format ||
    JSON.stringify(evidence.settings) !== JSON.stringify(settings)
  )
    throw new Error('Cambió la voz, el formato o los ajustes registrados')
  const save = () => {
    evidence.pending = entries.filter((entry) => !evidence.files.some((f) => f.key === entry.key))
    writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n')
    writeFileSync(
      manifestPath,
      JSON.stringify(
        Object.fromEntries(evidence.files.map(({ key, file }) => [key, file])),
        null,
        2,
      ) + '\n',
    )
  }
  let remaining = 0
  const previousCost = evidence.files.findLast((entry) => entry.credits > 0)
  let creditRate = previousCost
    ? Math.ceil((previousCost.credits / previousCost.text.length) * 10) / 10
    : 1
  if (generate) {
    const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers,
      signal: AbortSignal.timeout(30000),
    })
    if (!response.ok) throw new Error(`Consulta de cuota: HTTP ${response.status}`)
    const quota = await response.json()
    remaining = quota.character_limit - quota.character_count
    if (!Number.isFinite(remaining)) throw new Error('Cuota desconocida')
    console.log(`${remaining} créditos disponibles`)
  }
  mkdirSync(root, { recursive: true })
  for (const entry of entries) {
    const path = join(root, entry.file)
    const inputHash = hash(JSON.stringify({ text: entry.text, voiceId, format, ...settings }))
    const previous = evidence.files.find((e) => e.key === entry.key)
    if (existsSync(path)) {
      if (previous?.inputHash !== inputHash || previous.sha256 !== hash(readFileSync(path)))
        throw new Error(`Grabación con otra huella: ${entry.file}`)
      console.log(`Conservado ${entry.file}`)
      continue
    }
    const equivalent = evidence.files.find((e) => e.inputHash === inputHash)
    if (equivalent) {
      const bytes = readFileSync(join(root, equivalent.file))
      if (hash(bytes) !== equivalent.sha256) throw new Error(`Huella distinta: ${equivalent.file}`)
      writeFileSync(path, bytes)
      evidence.files.push({ ...equivalent, ...entry, credits: 0 })
      save()
      continue
    }
    if (!generate || Math.floor(entry.text.length * creditRate) > remaining) continue
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${format}`,
      {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: entry.text, ...settings }),
        signal: AbortSignal.timeout(120000),
      },
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      if (error.detail?.status === 'quota_exceeded') {
        console.log(`Sin cuota para ${entry.file}`)
        continue
      }
      throw new Error(`${entry.key}: HTTP ${response.status} (${error.detail?.status ?? 'error'})`)
    }
    if (!response.headers.get('content-type')?.includes('audio'))
      throw new Error('Respuesta sin audio')
    const bytes = Buffer.from(await response.arrayBuffer())
    const mp3Header =
      bytes.subarray(0, 3).toString() === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
    if (bytes.length < 1000 || !mp3Header) throw new Error(`MP3 inválido: ${entry.key}`)
    const costHeader = response.headers.get('character-cost')
    const credits = costHeader === null ? entry.text.length : Number(costHeader)
    if (!Number.isFinite(credits) || credits < 0) throw new Error('Coste desconocido')
    remaining -= credits
    if (credits > 0) creditRate = Math.ceil((credits / entry.text.length) * 10) / 10
    writeFileSync(path, bytes)
    evidence.files = evidence.files.filter((e) => e.key !== entry.key)
    evidence.files.push({
      ...entry,
      characters: entry.text.length,
      inputHash,
      sha256: hash(bytes),
      bytes: bytes.length,
      credits,
    })
    save()
    console.log(`Generado ${entry.file} (${bytes.length} bytes)`)
  }
  save()
  console.log(`${evidence.files.length} relatos grabados; ${evidence.pending.length} pendientes`)
}
