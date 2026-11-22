// Narración de La fiesta del Valle de la Cicuta.
// Sin opciones enumera los relatos; --refresh recalcula pendientes sin red;
// --generate graba con la cuota disponible (clave por --key-stdin o .env);
// --only=clave1,clave2 limita la grabación. Reutiliza textos idénticos por huella
// y nunca sobrescribe una grabación distinta.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const voiceId = 'Nh2zY9kknu6z4pZy6FhD'
const settings = { model_id: 'eleven_multilingual_v2', language_code: 'es' }
const format = 'mp3_44100_128'
const root = 'apps/web/public/local-assets/story/audio/es'
const evidencePath = 'docs-proyecto/evidencias/hemlock-vale-narracion.json'
const manifestPath = 'apps/web/src/game/hemlockValeNarrationManifest.json'
const { story } = JSON.parse(readFileSync('packages/i18n/src/hemlock-vale.es.json', 'utf8'))
const hash = (value) => createHash('sha256').update(value).digest('hex')

// Textos que solo contienen reglas.
const RULES = new Set([
  'welcome.setup',
  'welcome.survey',
  'writtenInRock.setup',
  'writtenInRock.slideSwap',
  'writtenInRock.mineCart',
  'writtenInRock.derailed',
  'hemlockHouse.setup',
  'silentHeath.setup',
  'lostSister.setup',
  'lostSister.darkLocations',
  'thingInTheDepths.setup',
  'thingInTheDepths.sinkingLocations',
])
// Párrafos de instrucciones dentro de un relato: se muestran, pero no se graban.
const INSTRUCTION =
  /^(Toma el control|Cada investigador|Durante el resto|Aumenta el nivel|Retira a|Puedes (cancelar|volver)|Pasa a |Coge 1 de las cartas|Haz aparecer|Anota en |Mueve 1 punto|Recuerda que|Elige un investigador|Elige un Enemigo|Elige cualquier Lugar)/
const narrative = (body) =>
  body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 2 && !INSTRUCTION.test(p))
    .join('\n\n')
const slug = (value) => value.replace(/([a-z])([A-Z0-9])/g, '$1-$2').toLowerCase()

// Orden de juego: el preludio primero; la cuota se gasta en ese orden.
const entries = Object.entries(story).flatMap(([scenario, parts]) =>
  Object.entries(parts)
    .filter(([part, value]) => value.body && !RULES.has(`${scenario}.${part}`))
    .map(([part, { body }]) => {
      const text = narrative(body)
      if (!text || /\[[a-z_]+\]|\{\w+\}/i.test(text))
        throw new Error(`Narración inválida: ${scenario}.${part}`)
      return {
        key: `story.hemlockVale.${scenario}.${part}.body`,
        file: `hemlock-vale-${slug(scenario)}-${slug(part)}-${hash(text).slice(0, 8)}.mp3`,
        text,
      }
    }),
)
const order = (key) =>
  /\.(intro\d*|resolution\d|noResolution)\.body$/.test(key) && key.includes('.welcome.') ? 0 : 1
entries.sort((a, b) => order(a.key) - order(b.key))

const generate = process.argv.includes('--generate')
if (!generate && !process.argv.includes('--refresh')) {
  console.log(
    JSON.stringify(
      {
        voiceId,
        recordings: entries.length,
        characters: entries.reduce((n, e) => n + e.text.length, 0),
        entries,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

const evidence = existsSync(evidencePath)
  ? JSON.parse(readFileSync(evidencePath, 'utf8'))
  : { voiceId, settings, format, files: [] }
if (evidence.voiceId !== voiceId || JSON.stringify(evidence.settings) !== JSON.stringify(settings))
  throw new Error('Configuración modificada')
// El manifiesto se rehace con las claves actuales (las de la web: story.hemlockVale.*).
const manifest = {}
for (const file of evidence.files)
  file.keys = file.keys.filter((key) => entries.some((entry) => entry.key === key))
let apiKey = null
let remaining = 0
if (generate) {
  if (process.argv.includes('--key-stdin')) {
    let key = ''
    for await (const chunk of process.stdin) key += chunk
    apiKey = key.trim()
  } else {
    if (existsSync('.env')) process.loadEnvFile()
    apiKey = process.env.ELEVENLABS_API_KEY
  }
  if (!apiKey) throw new Error('Falta ELEVENLABS_API_KEY')
  const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
    headers: { 'xi-api-key': apiKey },
    signal: AbortSignal.timeout(30000),
  })
  if (!response.ok) throw new Error(`Consulta de cuota: HTTP ${response.status}`)
  const quota = await response.json()
  remaining = Math.max(0, quota.character_limit - quota.character_count)
  if (!Number.isFinite(remaining)) throw new Error('Cuota desconocida')
  console.log(`${remaining} créditos disponibles`)
}
const selected = process.argv
  .find((arg) => arg.startsWith('--only='))
  ?.slice(7)
  .split(',')
const save = () => {
  evidence.pending = entries
    .filter(({ key }) => !manifest[key])
    .map(({ key, file, text }) => ({ key, file, textSha256: hash(text), characters: text.length }))
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n')
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
}
mkdirSync(root, { recursive: true })
for (const entry of entries) {
  const textSha256 = hash(entry.text)
  const recorded = evidence.files.find((f) => f.textSha256 === textSha256)
  if (recorded) {
    if (hash(readFileSync(join(root, recorded.file))) !== recorded.audioSha256)
      throw new Error(`Huella distinta: ${recorded.file}`)
    if (!recorded.keys.includes(entry.key)) recorded.keys.push(entry.key)
    manifest[entry.key] = recorded.file
    continue
  }
  delete manifest[entry.key]
  if (!generate || (selected && !selected.includes(entry.key))) continue
  if (entry.text.length > remaining) continue
  if (existsSync(join(root, entry.file))) throw new Error(`Grabación sin registro: ${entry.file}`)
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${format}`,
    {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: entry.text, ...settings }),
      signal: AbortSignal.timeout(120000),
    },
  )
  if (!response.ok || !response.headers.get('content-type')?.includes('audio'))
    throw new Error(
      `${entry.key}: ElevenLabs ${response.status} ${(await response.text()).slice(0, 300)}`,
    )
  const audio = Buffer.from(await response.arrayBuffer())
  if (audio.length < 1000) throw new Error(`Audio incompleto: ${entry.key}`)
  const cost = Number(response.headers.get('character-cost') ?? entry.text.length)
  remaining -= cost
  writeFileSync(join(root, entry.file), audio)
  evidence.files.push({
    file: entry.file,
    keys: [entry.key],
    textSha256,
    characters: entry.text.length,
    credits: cost,
    bytes: audio.length,
    audioSha256: hash(audio),
  })
  manifest[entry.key] = entry.file
  save()
  console.log(`${entry.file} (${cost} créditos; quedan ${remaining})`)
}
save()
console.log(
  `${Object.keys(manifest).length} relatos con audio; ${evidence.pending.length} pendientes`,
)
