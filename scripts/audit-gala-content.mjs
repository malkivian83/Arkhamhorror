// Reproducible phase-three acceptance. Full-game victories and UI QA remain separate.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const cache = resolve(root, 'node_modules/.cache/gala-acceptance')
await mkdir(cache, { recursive: true })
const files = [
  'packages/cards/src/midwinter-gala/phase-one.test.ts',
  'packages/cards/src/midwinter-gala/phase-two.test.ts',
  'packages/cards/src/midwinter-gala/phase-three.test.ts',
  'packages/cards/src/midwinter-gala/content-acceptance.test.ts',
  'packages/cards/src/midwinter-gala/carl-sanford.test.ts',
  'apps/web/src/game/gala-phase-one-session.test.ts',
  'apps/web/src/game/gala-phase-two-session.test.ts',
  'apps/web/src/game/gala-phase-three-session.test.ts',
  'apps/web/src/game/gala-fallback.test.ts',
]
execFileSync(
  process.execPath,
  [
    resolve(root, 'node_modules/vitest/vitest.mjs'),
    'run',
    ...files,
    '--reporter=json',
    `--outputFile=${resolve(cache, 'tests.json')}`,
  ],
  { cwd: root, stdio: 'pipe' },
)
const tests = JSON.parse(await readFile(resolve(cache, 'tests.json'), 'utf8'))
if (!tests.success || tests.numFailedTests || tests.numPendingTests)
  throw new Error('Incomplete phase-three acceptance')
const names = tests.testResults.flatMap((file) =>
  file.assertionResults.map((test) => ({
    file: relative(root, file.name).replaceAll('\\', '/'),
    name: test.fullName,
    status: test.status,
  })),
)
const matching = (file, contains) =>
  names.filter(
    (test) => test.file.endsWith(file) && test.name.includes(contains) && test.status === 'passed',
  )
const special = {
  71006: ['phase-three.test.ts', 'objetivo de fin de ronda'],
  71008: ['phase-two.test.ts', 'G02'],
  71010: ['phase-two.test.ts', 'G09'],
  71012: ['phase-one.test.ts', 'G03'],
  71017: ['phase-two.test.ts', 'G10'],
  71018: ['phase-two.test.ts', 'Callahan'],
  71024: ['phase-two.test.ts', 'G11'],
  71027: ['phase-two.test.ts', 'G20'],
  71034: ['carl-sanford.test.ts', '71034'],
  71035: ['phase-two.test.ts', 'G04'],
  71036: ['phase-one.test.ts', '71036'],
  71037: ['carl-sanford.test.ts', 'mediante Raymond'],
  71041: ['phase-two.test.ts', 'Delores'],
  71042: ['phase-two.test.ts', 'Olney'],
  71047: ['phase-one.test.ts', 'Gug'],
  71048: ['phase-one.test.ts', 'Abhorrent Moon-Beast'],
  71052: ['gala-phase-three-session.test.ts', 'jewelControlled'],
  71059: ['phase-one.test.ts', 'Pushed'],
  71060: ['phase-two.test.ts', 'Puerta secreta'],
  71062: ['phase-two.test.ts', 'Órdenes violentas'],
}
const contracts = Array.from({ length: 62 }, (_, n) => {
  const code = String(71001 + n)
  const primary = matching(...(special[code] ?? ['content-acceptance.test.ts', code]))
  const en = matching('gala-fallback.test.ts', `en: ${code}`)
  const es = matching('gala-fallback.test.ts', `es: ${code}`)
  if (!primary.length || !en.length || !es.length)
    throw new Error(`Missing individual contract ${code}`)
  return { code, primary, fallback: [...en, ...es] }
})
const hash = async (path) =>
  createHash('sha256')
    .update(await readFile(path))
    .digest('hex')
const reference =
  process.env.ARKHAM_REFERENCE_ROOT ??
  'D:/referencia/ArkhamHorror-main/backend/arkham-api/library/Arkham'
const sourceFiles = ['Scenario/Scenarios/TheMidwinterGala.hs']
for (const kind of ['Act', 'Agenda', 'Enemy', 'Location', 'Story', 'Treachery']) {
  const directory = `${kind}/Cards/TheMidwinterGala`
  for (const name of await readdir(resolve(reference, directory)))
    if (name.endsWith('.hs')) sourceFiles.push(`${directory}/${name}`)
}
const assets = [
  'ArchibaldHudson',
  'ArseneRenard',
  'ClaireWilson',
  'CarlSanfordLustingForPower',
  'CaldwellPhilipsEnthralledByLegends',
  'DeloresGadling',
  'ElizabethConrad',
  'DrMyaBadry',
  'HoracioMartinez',
  'JohnnyValoneReadyToMakeADeal',
  'JewelOfSarnath',
  'LucasTetlow',
  'MirandaKeeper',
  'NovaMalone',
  'RaymondLoggins',
  'PrudenceDouglas',
  'SarahVanShaw',
  'SpecialAgentCallahan',
  'ThePaleLanternBeguilingAura',
  'ThePaleLanternHypnoticGlow',
  'ThomasOlney',
  'ValeriyaAntonovaWantsOutOfHere',
  'WilliamBainLookingForThoseLost',
]
sourceFiles.push(...assets.map((name) => `Asset/Assets/${name}.hs`))
const sources = []
for (const path of sourceFiles.sort())
  sources.push({ path, sha256: await hash(resolve(reference, path)) })
const pdfs = []
for (const [path, pages] of [
  ['docs-proyecto/reglas/AHC80_Rulebook_ES.pdf', [3, 4, 11, 12, 13, 14, 15, 16, 19, 24]],
  ['docs-proyecto/reglas/FAQ v2.5A.pdf', [23]],
])
  pdfs.push({ path, pages, sha256: await hash(resolve(root, path)) })

const report = {
  date: '2026-10-19',
  stage: 'phase-three-content-and-persistence',
  scenarioRulesVersion: 4,
  scope:
    'Contratos principales dirigidos de 62 códigos y caras mecánicas; EN/ES; ventanas especiales de guardado/replay/deshacer. No certifica todas las interacciones, victorias completas ni aceptación visual.',
  testFiles: files.length,
  testsPassed: tests.numPassedTests,
  contracts,
  persistence: matching('gala-phase-three-session.test.ts', ''),
  pdfs,
  referenceRoot: reference,
  sources,
  implementation: await Promise.all(
    [
      ...files,
      'packages/cards/src/midwinter-gala/cards.ts',
      'packages/cards/src/midwinter-gala/gala.ts',
      'packages/cards/src/midwinter-gala/guests.ts',
      'packages/cards/src/campaign.ts',
      'packages/engine/src/handlers.ts',
      'packages/engine/src/types.ts',
      'packages/saves/src/session.ts',
      'apps/web/src/game/fallbackCards.ts',
      'apps/web/src/game/localized.ts',
      'packages/i18n/src/gala-cards.en.json',
      'packages/i18n/src/gala-cards.es.json',
    ].map(async (path) => ({ path, sha256: await hash(resolve(root, path)) })),
  ),
  fixes: [
    'Declan preparado en interludio de Kingsport (PDF ES p. 14; la referencia lo agota)',
    'Usos iniciales de Miranda, Prudence y Raymond y conservación al hechizar/cambiar control',
    'Carl tras cancelación con Raymond o Ward, sin duplicar la Traición y conservando Oleada',
    'Catálogo local completo EN/ES y respuestas remotas parciales que preservan datos locales',
    'Recompensa de Invitados de R1 y conservación de la puntuación al cerrar la aventura',
  ],
  remaining: [
    'G17: cinco victorias legales completas y dos equipos en normal',
    'Fase 4: aceptación visual EN/ES en escritorio y 390×640',
    'Fase 5: CI completa de la entrega y versión estable de Gala',
    'Teléfono físico diferido; historia secundaria fuera del alcance actual',
  ],
}
const matrixPath = resolve(root, 'docs-proyecto/18-matriz-la-gala.csv')
const matrix = (await readFile(matrixPath, 'utf8'))
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((line) =>
    [...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map((match) => match[1].replaceAll('""', '"')),
  )
if (matrix.length !== 62 || matrix.some((row) => row.length < 6))
  throw new Error('Unexpected matrix format')
const quote = (value) => `"${String(value).replaceAll('"', '""')}"`
const rows = [
  [
    'codigo',
    'nombre',
    'tipo',
    'estado',
    'hallazgos',
    'aceptacion_pendiente',
    'contrato_efecto',
    'respaldo_en_es',
  ],
]
for (const row of matrix) {
  const contract = contracts.find((c) => c.code === row[0])
  if (!contract) throw new Error(`Unknown matrix code ${row[0]}`)
  rows.push([
    row[0],
    row[1],
    row[2],
    'Contrato principal y respaldo EN/ES verificados; fase 3',
    row[4],
    'Victorias e interfaz de fase 4; interacciones no exhaustivas. Persistencia especial: gala-phase-three-session.test.ts',
    contract.primary.map((t) => `${t.file}: ${t.name}`).join(' | '),
    'gala-fallback.test.ts: EN y ES, caras y fallos de red',
  ])
}
await writeFile(
  resolve(root, 'docs-proyecto/evidencias/gala-fase-3.json'),
  JSON.stringify(report, null, 2) + '\n',
)
await writeFile(matrixPath, rows.map((row) => row.map(quote).join(',')).join('\n') + '\n')
console.log(
  JSON.stringify({
    contracts: contracts.length,
    testsPassed: tests.numPassedTests,
    persistenceWindows: report.persistence.length,
    sources: sources.length,
  }),
)
