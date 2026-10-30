import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import { cardNarratives, excelsiorCards } from '@lcg/i18n'
import evidence from '../../../../docs-proyecto/evidencias/excelsior-cartas-narracion.json'
import manifest from './cardNarrationManifest.json'
import { cardNarration } from './cardNarration'
import { startNarration, stopNarration } from './narrationPlayback'

const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')

it('connects each available face to a Spanish recording of only its narrative, with the Excelsior voice', () => {
  expect(evidence.voiceId).toBe('OjrdP8Z2fWjVyt0scrL7')
  expect(evidence.files).toHaveLength(7)
  expect(
    Object.entries(manifest)
      .filter(([code]) => code in excelsiorCards.es)
      .flatMap(([, faces]) => Object.values(faces)),
  ).toHaveLength(evidence.files.length)
  for (const entry of evidence.files) {
    expect(['agenda', 'act']).toContain(excelsiorCards.es[entry.code]!.typeCode)
    const back = entry.side === 'back'
    const text = excelsiorCards.es[entry.code]![back ? 'backFlavor' : 'flavor']!
    expect(entry.text).toBe(text)
    expect(entry.text).not.toBe(excelsiorCards.es[entry.code]![back ? 'backText' : 'text'])
    expect(hash(JSON.stringify({ text, voiceId: evidence.voiceId, ...evidence.settings }))).toBe(
      entry.inputHash,
    )
    const path = cardNarration(entry.code, back, 'es')!
    expect(path).toBe(`/local-assets/cards/audio/es/${entry.file}`)
    expect(cardNarration(entry.code, back, 'en')).toBeNull()
    const bytes = readFileSync(new URL(`../../public${path}`, import.meta.url))
    expect(bytes.length).toBe(entry.bytes)
    expect(bytes.subarray(0, 3).toString()).toBe('ID3')
    expect(hash(bytes)).toBe(entry.sha256)
  }
})

it('connects campaign recordings to their exact narrative face and established voice', () => {
  const voices = {
    zealot: 'RnKqZYEeVQciORlpiCz0',
    carcosa: '5egO01tkUjEzu7xSSE8M',
    fortune: 'hyKxCTlAqtnW188CgltM',
    gala: '5egO01tkUjEzu7xSSE8M',
    ceniza: 'o0SveC0zgHFuCsEO3vHR',
    carnevale: 'hyKxCTlAqtnW188CgltM',
    dunwich: 'FXn3GKRRt9FCEyTbrkaL',
  }
  const counts: Record<string, number> = {
    zealot: 27,
    carcosa: 101,
    fortune: 13,
    gala: 9,
    ceniza: 28,
    carnevale: 10,
    dunwich: 97,
  }
  const recordedFaces = new Set<string>()
  for (const [group, voiceId] of Object.entries(voices)) {
    const source = new URL(
      `../../../../docs-proyecto/evidencias/${group}-cartas-narracion.json`,
      import.meta.url,
    )
    const data = JSON.parse(readFileSync(source, 'utf8')) as typeof evidence
    expect(data.voiceId).toBe(voiceId)
    expect(data.files).toHaveLength(counts[group]!)
    for (const entry of data.files) {
      const face = `${entry.code}:${entry.side}`
      expect(recordedFaces.has(face)).toBe(false)
      recordedFaces.add(face)
      const card = cardNarratives.es[entry.code]!
      expect(card.group).toBe(group)
      expect(['agenda', 'act']).toContain(card.typeCode)
      const back = entry.side === 'back'
      const text = card[back ? 'backFlavor' : 'flavor']!.replace(/<[^>]*>/g, '')
        .replace(/\[\[([^]*?)\]\]/g, '$1')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .trim()
      expect(entry.text).toBe(text)
      expect(hash(JSON.stringify({ text, voiceId, ...data.settings }))).toBe(entry.inputHash)
      const path = cardNarration(entry.code, back, 'es')!
      expect(path).toBe(`/local-assets/cards/audio/es/${entry.file}`)
      expect(cardNarration(entry.code, back, 'en')).toBeNull()
      const bytes = readFileSync(new URL(`../../public${path}`, import.meta.url))
      expect(bytes.length).toBe(entry.bytes)
      expect(hash(bytes)).toBe(entry.sha256)
    }
  }
  const newFaces = Object.entries(manifest)
    .filter(([code]) => code in cardNarratives.es)
    .flatMap(([code, faces]) => Object.keys(faces).map((side) => `${code}:${side}`))
  expect(new Set(newFaces)).toEqual(recordedFaces)
  expect(cardNarration('12170', true, 'es')).toBeNull()
})

it('generates only narrative faces of agendas and acts, excluding other card types', () => {
  const root = fileURLToPath(new URL('../../../../', import.meta.url))
  const listed = JSON.parse(
    execFileSync(process.execPath, ['scripts/generate-card-audio.mjs', '--list'], {
      cwd: root,
      encoding: 'utf8',
    }),
  ) as { entries: { code: string; side: string }[] }
  expect(listed.entries.map((entry) => `${entry.code}:${entry.side}`)).toEqual([
    '84002:front',
    '84002:back',
    '84003:front',
    '84003:back',
    '84004:front',
    '84004:back',
    '84005:front',
  ])
  expect(cardNarration('84006', false, 'es')).toBeNull()
  expect(cardNarration('84010', true, 'es')).toBeNull()
})

it('offers the pictured agenda on both sides, without substituting unrecorded cards or faces', () => {
  expect(cardNarration('84002', false, 'es')).toContain('84002-front.mp3')
  expect(cardNarration('84002', true, 'es')).toContain('84002-back.mp3')
  expect(cardNarration('84001', true, 'es')).toBeNull()
  expect(cardNarration('84001', false, 'es')).toBeNull()
  expect(cardNarration('unknown', false, 'es')).toBeNull()
})

it('offers only the narrative fronts of the pictured Midnight Masks agenda and act', () => {
  const root = fileURLToPath(new URL('../../../../', import.meta.url))
  const listed = JSON.parse(
    execFileSync(
      process.execPath,
      [
        'scripts/generate-campaign-card-audio.mjs',
        '--list',
        '--campaign=zealot',
        '--codes=01121a,01123',
      ],
      { cwd: root, encoding: 'utf8' },
    ),
  ) as { entries: { code: string; side: string; text: string }[] }
  expect(listed.entries.map(({ code, side }) => `${code}:${side}`)).toEqual([
    '01121a:front',
    '01123:front',
  ])
  for (const { code, text } of listed.entries) {
    expect(text).toBe(cardNarratives.es[code]!.flavor)
    expect(text).not.toMatch(/Desistir|Objetivo|\[action\]|2 pistas|6 Enemigos/)
    expect(cardNarration(code, false, 'es')).toContain(`${code}-front.mp3`)
    expect(cardNarration(code, true, 'es')).toBeNull()
  }
  expect(cardNarration('01121b', false, 'es')).toBeNull()
})

it('inventories all narrative faces of the completed campaigns and Dunwich', () => {
  const root = fileURLToPath(new URL('../../../../', import.meta.url))
  for (const [campaign, count] of Object.entries({ zealot: 27, carnevale: 10, dunwich: 97 })) {
    const listed = JSON.parse(
      execFileSync(
        process.execPath,
        ['scripts/generate-campaign-card-audio.mjs', '--list', `--campaign=${campaign}`],
        { cwd: root, encoding: 'utf8' },
      ),
    ) as { entries: { code: string; side: string }[] }
    expect(listed.entries).toHaveLength(count)
    for (const entry of listed.entries)
      expect(cardNarration(entry.code, entry.side === 'back', 'es')).not.toBeNull()
  }
  for (const code of ['82002b', '82006b', '01145b'])
    expect(cardNarration(code, false, 'es')).toBeNull()
})

it('stops the previous narration and releases only the audio being closed', () => {
  let firstPauses = 0
  let secondPauses = 0
  const first = { pause: () => firstPauses++ }
  const second = { pause: () => secondPauses++ }
  startNarration(first)
  startNarration(second)
  expect(firstPauses).toBe(1)
  stopNarration(first)
  expect(secondPauses).toBe(0)
  startNarration(first)
  expect(secondPauses).toBe(1)
  stopNarration(first)
  startNarration(second)
  expect(firstPauses).toBe(3)
  stopNarration(second)
})
