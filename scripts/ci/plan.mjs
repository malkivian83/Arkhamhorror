import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { isolatedCardTests } from './card-scopes.mjs'

/** Unknown paths and shared configuration deliberately fall back to the full suite. */
export function planChanges(files, { fallback = false, event = 'push' } = {}) {
  const scopes = new Set()
  const selected = new Set()
  const typePackages = new Set()
  let images = false
  function isolated(module) {
    const tests = isolatedCardTests(module)
    if (!tests) {
      scopes.add('cards')
      return
    }
    scopes.add('isolated-cards')
    typePackages.add('@lcg/cards')
    for (const test of tests) selected.add(test)
  }
  for (const file of files) {
    if (
      /\.(?:test|spec)\.(?:ts|mjs)$/.test(file) &&
      /^(?:packages\/(?:cards|engine|saves|shared|i18n)\/|apps\/(?:web|server)\/|scripts\/cards-import\/)/.test(
        file,
      )
    ) {
      selected.add(file)
      const pkg = file.match(/^packages\/([^/]+)\//)?.[1]
      if (pkg) typePackages.add(`@lcg/${pkg}`)
      if (file.startsWith('apps/server/')) typePackages.add('@lcg/server')
      if (file.endsWith('.mysql.test.ts')) scopes.add('server')
    } else if (
      [
        'docs-proyecto/evidencias/imagenes-locales.json',
        'docs-proyecto/evidencias/miniaturas-cartas.json',
        'apps/web/src/game/cardImageManifest.json',
      ].includes(file) ||
      /^apps\/web\/public\/local-assets\/cards\//.test(file)
    ) {
      images = true
      selected.add('apps/web/src/game/spanishImages.test.ts')
      selected.add('apps/web/src/game/fallbackCards.test.ts')
    } else if (
      file === 'scripts/generate-hemlock-vale-audio.mjs' ||
      file === 'docs-proyecto/evidencias/hemlock-vale-narracion.json' ||
      file === 'apps/web/src/game/hemlockValeNarrationManifest.json' ||
      /^apps\/web\/public\/local-assets\/story\/audio\/(?:en|es)\/hemlock-vale-.*\.mp3$/.test(file)
    ) {
      isolated('hemlock-vale')
    } else if (file.startsWith('docs-proyecto/evidencias/')) {
      scopes.add('cards')
      images = true
    } else if (file.endsWith('.md') || file.startsWith('docs-proyecto/')) continue
    else if (file === 'apps/web/src/changelog.ts' || /^packages\/i18n\/src\/.*\.json$/.test(file))
      scopes.add('text')
    else if (/^apps\/web\/src\/.*\.(css|scss)$/.test(file)) scopes.add('text')
    else if (/^apps\/web\/public\/local-assets\//.test(file)) {
      scopes.add('web')
    } else if (file.startsWith('apps/web/src/')) scopes.add('web')
    else if (file.startsWith('packages/cards/src/')) {
      const module = file.match(/^packages\/cards\/src\/([^/]+)\//)?.[1]
      if (module) isolated(module)
      else scopes.add('cards')
    } else if (file.startsWith('apps/server/src/') || file.startsWith('apps/server/migrations/'))
      scopes.add('server')
    else scopes.add('full')
  }
  const full = fallback || scopes.has('full')
  const cards = scopes.has('cards')
  const server = scopes.has('server')
  const tests = full
    ? []
    : [
        ...new Set([
          ...selected,
          ...(scopes.has('text') ? ['packages/i18n'] : []),
          ...(scopes.has('web') ? ['apps/web'] : []),
          // Registrations and scenario links are dynamic: related-import analysis is insufficient.
          ...(cards
            ? [
                'packages/cards',
                'packages/saves',
                'apps/web',
                'apps/server',
                'scripts/cards-import',
              ]
            : []),
          ...(server ? ['apps/server', 'packages/saves', 'packages/shared', 'apps/web'] : []),
        ]),
      ]
  const sql = full || server
  if (cards) for (const pkg of ['@lcg/cards', '@lcg/saves', '@lcg/server']) typePackages.add(pkg)
  if (server) for (const pkg of ['@lcg/server', '@lcg/saves', '@lcg/shared']) typePackages.add(pkg)
  return {
    files,
    full,
    tests,
    sql,
    images: images || full,
    types: full || typePackages.size > 0,
    typePackages: full ? [] : [...typePackages].sort(),
    sqlMatrix: {
      include: [
        { database: 'mysql', image: 'mysql:8.4' },
        ...(event === 'pull_request' ? [{ database: 'mariadb', image: 'mariadb:10.11' }] : []),
      ],
    },
  }
}

export function changedFiles(
  eventName,
  event,
  git = (args) => execFileSync('git', args, { encoding: 'utf8' }),
) {
  try {
    const head = eventName === 'pull_request' ? event.pull_request.head.sha : event.after
    const base = eventName === 'pull_request' ? event.pull_request.base.sha : event.before
    if (
      !/^[a-f0-9]{40}$/.test(base ?? '') ||
      /^0+$/.test(base) ||
      !/^[a-f0-9]{40}$/.test(head ?? '')
    )
      throw new Error('Missing diff endpoints')
    const from = eventName === 'pull_request' ? git(['merge-base', base, head]).trim() : base
    // No rename detection: both the deleted and added paths must influence the scope.
    return {
      files: git(['diff', '--no-renames', '--name-only', '-z', from, head, '--'])
        .split('\0')
        .filter(Boolean),
      fallback: false,
    }
  } catch {
    return { files: [], fallback: true }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
  const changes = changedFiles(process.env.GITHUB_EVENT_NAME, event)
  const plan = planChanges(changes.files, {
    fallback: changes.fallback,
    event: process.env.GITHUB_EVENT_NAME,
  })
  writeFileSync(
    process.env.CI_PLAN_PATH ?? join(tmpdir(), 'arkham-ci-plan.json'),
    JSON.stringify(plan),
  )
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `sql=${plan.sql}\nsql-matrix=${JSON.stringify(plan.sqlMatrix)}\n`,
    )
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `### Selección de CI\n- Suite: ${plan.full ? 'completa' : plan.tests.join(', ') || 'sin pruebas de lógica'}\n- SQL: ${plan.sql}\n- Imágenes: ${plan.images}\n- Tipos adicionales: ${plan.types}\n\nLa web se compila una sola vez para generar el paquete de despliegue.\n`,
    )
}
