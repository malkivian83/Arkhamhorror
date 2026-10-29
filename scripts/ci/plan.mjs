import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'

/** Unknown paths and shared configuration deliberately fall back to the full suite. */
export function planChanges(files, { fallback = false, event = 'push' } = {}) {
  const scopes = new Set()
  let images = false
  for (const file of files) {
    if (file.startsWith('docs-proyecto/evidencias/')) {
      scopes.add('cards')
      images = true
    } else if (file.endsWith('.md') || file.startsWith('docs-proyecto/')) continue
    else if (file === 'apps/web/src/changelog.ts' || /^packages\/i18n\/src\/.*\.json$/.test(file))
      scopes.add('text')
    else if (/^apps\/web\/src\/.*\.(css|scss)$/.test(file)) scopes.add('text')
    else if (/^apps\/web\/public\/local-assets\//.test(file)) {
      scopes.add('web')
      images = true
    } else if (file.startsWith('apps/web/src/')) scopes.add('web')
    else if (file.startsWith('packages/cards/src/')) {
      scopes.add('cards')
      images = true
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
  return {
    files,
    full,
    tests,
    sql,
    images: images || full,
    types: full || cards || server,
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
