// --list no usa red. --generate conserva las grabaciones y usa la cuota existente.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const catalog = JSON.parse(readFileSync('packages/i18n/src/card-narratives.es.json', 'utf8'))
const groups = {
  zealot: 'zealot-baldo-narracion.json',
  carcosa: 'carcosa-narracion.json',
  fortune: 'fortuna-narracion.json',
  gala: null,
  ceniza: null,
  carnevale: 'fortuna-narracion.json',
  dunwich: 'dunwich-nico-narracion.json',
  plaguebearer: 'plaguebearer-narracion.json',
  'edge-of-the-earth': null,
}
const edgeCards = JSON.parse(
  readFileSync('packages/i18n/src/edge-of-the-earth-cards.es.json', 'utf8'),
)
const edgeStory = JSON.parse(readFileSync('apps/web/src/game/edgeOfTheEarthNarration.json', 'utf8'))
const hash = (value) => createHash('sha256').update(value).digest('hex')
const clean = (text) =>
  text
    .replace(/<[^>]*>/g, '')
    .replace(/\[\[([^]*?)\]\]/g, '$1')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .trim()
const selected = process.argv.find((arg) => arg.startsWith('--campaign='))?.split('=')[1]
const codes = process.argv
  .find((arg) => arg.startsWith('--codes='))
  ?.slice('--codes='.length)
  .split(',')
const sideFilter = process.argv.find((arg) => arg.startsWith('--side='))?.split('=')[1]
if (sideFilter && !['front', 'back'].includes(sideFilter)) throw new Error('Cara desconocida')
if (selected && !(selected in groups)) throw new Error('Campaña desconocida')
const manifestPath = 'apps/web/src/game/cardNarrationManifest.json'
const root = 'apps/web/public/local-assets/cards/audio/es'
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
if (process.argv.includes('--generate')) {
  if (process.argv.includes('--key-stdin')) {
    let key = ''
    for await (const chunk of process.stdin) key += chunk
    process.env.ELEVENLABS_API_KEY = key.trim()
  } else if (existsSync('.env')) process.loadEnvFile()
  if (!process.env.ELEVENLABS_API_KEY) throw new Error('Falta ELEVENLABS_API_KEY')
}
for (const [group, storyEvidence] of Object.entries(groups)) {
  if (selected && selected !== group) continue
  const isEdge = group === 'edge-of-the-earth'
  const story = JSON.parse(
    readFileSync(`docs-proyecto/evidencias/${storyEvidence ?? 'carcosa-narracion.json'}`, 'utf8'),
  )
  const voiceId = isEdge
    ? edgeStory.voiceId
    : group === 'ceniza'
      ? 'o0SveC0zgHFuCsEO3vHR'
      : story.voiceId
  // La Gala conserva los ajustes documentados para sus historias.
  const settings = isEdge
    ? { model_id: edgeStory.model, language_code: 'es' }
    : ['gala', 'ceniza'].includes(group)
      ? {
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.31,
            similarity_boost: 0.86,
            style: 0,
            speed: 1,
            use_speaker_boost: true,
          },
        }
      : story.settings
  if (!voiceId || !settings) throw new Error(`Falta configuración de ${group}`)
  const entries = Object.entries(isEdge ? edgeCards : catalog)
    .filter(
      ([code, card]) =>
        (isEdge || card.group === group) &&
        ['agenda', 'act'].includes(card.typeCode) &&
        (!codes || codes.includes(code)),
    )
    .flatMap(([code, card]) =>
      ['front', 'back'].flatMap((side) => {
        if (sideFilter && sideFilter !== side) return []
        const flavor = card[side === 'back' ? 'backFlavor' : 'flavor']
        if (!flavor?.trim()) return []
        const text = clean(flavor)
        if (!text || /\[[a-z_]+\]|\{\w+\}|&\w+;/i.test(text))
          throw new Error(`Narración inválida: ${code}/${side}`)
        return [{ code, side, text, file: `${code}-${side}.mp3` }]
      }),
    )
  if (!process.argv.includes('--generate') && !process.argv.includes('--refresh')) {
    console.log(
      JSON.stringify({
        group,
        voiceId,
        settings,
        recordings: entries.length,
        characters: entries.reduce((n, e) => n + e.text.length, 0),
        entries,
      }),
    )
    continue
  }
  if (process.argv.includes('--refresh') && !process.argv.includes('--generate')) {
    const evidencePath = `docs-proyecto/evidencias/${group}-cartas-narracion.json`
    const evidence = existsSync(evidencePath)
      ? JSON.parse(readFileSync(evidencePath, 'utf8'))
      : { voiceId, language: 'es', settings, files: [] }
    const pending = []
    for (const entry of entries) {
      const inputHash = hash(JSON.stringify({ text: entry.text, voiceId, ...settings }))
      const previous = evidence.files.find((f) => f.file === entry.file)
      const path = join(root, entry.file)
      if (existsSync(path)) {
        if (previous?.inputHash !== inputHash || previous.sha256 !== hash(readFileSync(path)))
          throw new Error(`Huella distinta: ${entry.file}`)
      } else pending.push({ ...entry, inputHash })
    }
    writeFileSync(evidencePath, JSON.stringify({ ...evidence, pending }, null, 2) + '\n')
    console.log(
      `${group}: ${evidence.files.length} caras grabadas; ${pending.length} pendientes con texto completo`,
    )
    continue
  }
  const headers = { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
  const quotaResponse = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
    headers,
    signal: AbortSignal.timeout(30000),
  })
  if (!quotaResponse.ok) throw new Error(`Consulta de cuota: HTTP ${quotaResponse.status}`)
  const quota = await quotaResponse.json()
  if (typeof quota.character_limit !== 'number' || typeof quota.character_count !== 'number')
    throw new Error('Cuota desconocida')
  let remaining = Math.max(0, quota.character_limit - quota.character_count)
  console.log(`${group}: ${remaining} caracteres disponibles`)
  const evidencePath = `docs-proyecto/evidencias/${group}-cartas-narracion.json`
  const evidence = existsSync(evidencePath)
    ? JSON.parse(readFileSync(evidencePath, 'utf8'))
    : { voiceId, language: 'es', settings, files: [] }
  if (
    evidence.voiceId !== voiceId ||
    JSON.stringify(evidence.settings) !== JSON.stringify(settings)
  )
    throw new Error(`Configuración modificada: ${group}`)
  mkdirSync(root, { recursive: true })
  for (const entry of entries) {
    const inputHash = hash(JSON.stringify({ text: entry.text, voiceId, ...settings }))
    const previous = evidence.files.find((f) => f.file === entry.file)
    const path = join(root, entry.file)
    if (existsSync(path)) {
      if (previous?.inputHash !== inputHash || previous.sha256 !== hash(readFileSync(path)))
        throw new Error(`Huella distinta: ${entry.file}`)
    } else {
      const equivalent = evidence.files.find((f) => f.inputHash === inputHash)
      let bytes
      if (equivalent) {
        bytes = readFileSync(join(root, equivalent.file))
        if (hash(bytes) !== equivalent.sha256)
          throw new Error(`Huella distinta: ${equivalent.file}`)
      } else {
        if (entry.text.length > remaining)
          throw new Error(
            `Cuota insuficiente para ${entry.file}: ${remaining} disponibles, ${entry.text.length} necesarios`,
          )
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
          {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: entry.text, ...settings }),
            signal: AbortSignal.timeout(120000),
          },
        )
        if (!response.ok) throw new Error(`${entry.file}: ElevenLabs HTTP ${response.status}`)
        if (!response.headers.get('content-type')?.includes('audio'))
          throw new Error('Respuesta sin audio')
        bytes = Buffer.from(await response.arrayBuffer())
        if (bytes.length < 1000) throw new Error('Audio incompleto')
        remaining -= entry.text.length
      }
      writeFileSync(path, bytes)
      evidence.files.push({ ...entry, inputHash, bytes: bytes.length, sha256: hash(bytes) })
    }
    manifest[entry.code] ??= {}
    manifest[entry.code][entry.side] = entry.file
    writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n')
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
    console.log(`Verificado ${group}/${entry.file}`)
  }
  evidence.pending = entries.filter((entry) => !evidence.files.some((f) => f.file === entry.file))
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n')
}
