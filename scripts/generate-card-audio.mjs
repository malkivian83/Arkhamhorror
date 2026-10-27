// Solo narración de planes y actos. --list no usa red; --generate usa ElevenLabs.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const voiceId = 'OjrdP8Z2fWjVyt0scrL7' // Misma voz que generate-excelsior-audio.mjs.
const settings = {
  model_id: 'eleven_multilingual_v2',
  voice_settings: {
    stability: 0.31,
    similarity_boost: 0.86,
    style: 0,
    speed: 1,
    use_speaker_boost: true,
  },
}
const root = 'apps/web/public/local-assets/cards/audio/es'
const evidencePath = 'docs-proyecto/evidencias/excelsior-cartas-narracion.json'
const manifestPath = 'apps/web/src/game/cardNarrationManifest.json'
const catalog = JSON.parse(readFileSync('packages/i18n/src/excelsior-cards.es.json', 'utf8'))
const hash = (value) => createHash('sha256').update(value).digest('hex')
const entries = Object.entries(catalog)
  .filter(([, card]) => ['agenda', 'act'].includes(card.typeCode))
  .flatMap(([code, card]) =>
    ['front', 'back'].flatMap((side) => {
      const flavor = card[side === 'back' ? 'backFlavor' : 'flavor']
      if (!flavor?.trim()) return []
      const text = flavor
        .replace(/<[^>]*>/g, '')
        .replace(/\[\[([^]*?)\]\]/g, '$1')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .trim()
      if (!text || /\[[a-z_]+\]|\{\w+\}/i.test(text))
        throw new Error(`Texto narrativo inválido: ${code}/${side}`)
      return [{ code, side, text, file: `${code}-${side}.mp3` }]
    }),
  )

if (!process.argv.includes('--generate')) {
  console.log(JSON.stringify({ voiceId, recordings: entries.length, entries }, null, 2))
} else {
  process.loadEnvFile()
  if (!process.env.ELEVENLABS_API_KEY) throw new Error('Falta ELEVENLABS_API_KEY')
  const quotaResponse = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
    signal: AbortSignal.timeout(30000),
  })
  let remaining = Infinity
  if (quotaResponse.ok) {
    const quota = await quotaResponse.json()
    if (typeof quota.character_limit === 'number' && typeof quota.character_count === 'number')
      remaining = Math.max(0, quota.character_limit - quota.character_count)
  }
  mkdirSync(root, { recursive: true })
  const evidence = existsSync(evidencePath)
    ? JSON.parse(readFileSync(evidencePath, 'utf8'))
    : { voiceId, language: 'es', settings, files: [] }
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {}
  for (const entry of entries) {
    const inputHash = hash(JSON.stringify({ text: entry.text, voiceId, ...settings }))
    const previous = evidence.files.find((f) => f.file === entry.file)
    const path = join(root, entry.file)
    if (existsSync(path)) {
      if (previous?.inputHash !== inputHash || previous.sha256 !== hash(readFileSync(path)))
        throw new Error(`Grabación existente con otra huella: ${entry.file}`)
    } else {
      if (entry.text.length > remaining)
        throw new Error(
          `Cuota insuficiente: ${remaining} caracteres disponibles; ${entry.file} necesita ${entry.text.length}. Las grabaciones anteriores se conservan.`,
        )
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
      if (!response.ok) throw new Error(`${entry.file}: ElevenLabs HTTP ${response.status}`)
      if (!response.headers.get('content-type')?.includes('audio'))
        throw new Error(`${entry.file}: respuesta sin audio`)
      const bytes = Buffer.from(await response.arrayBuffer())
      if (bytes.length < 1000) throw new Error(`${entry.file}: audio incompleto`)
      writeFileSync(path, bytes)
      remaining -= entry.text.length
      evidence.files = evidence.files.filter((f) => f.file !== entry.file)
      evidence.files.push({ ...entry, inputHash, bytes: bytes.length, sha256: hash(bytes) })
    }
    manifest[entry.code] ??= {}
    manifest[entry.code][entry.side] = entry.file
    writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n')
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
    console.log(`Verificado ${entry.file}`)
  }
}
