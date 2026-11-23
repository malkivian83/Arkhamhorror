import assert from 'node:assert/strict'
import { test } from 'node:test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { changedFiles, planChanges } from './plan.mjs'
import { isolatedCardTests, importedPaths } from './card-scopes.mjs'

test('relative imports, reexports, side effects and literal dynamic imports expose cross-module links', () => {
  const paths = importedPaths(
    'packages/cards/src/another-module/card.ts',
    `
    import '../finn-calvin'
    export { helper } from '../finn-calvin/register'
    const load = () => import('@lcg/cards/finn-calvin/register')
    const local = require('../finn-calvin/card-04003')
    import fs from 'node:fs'
  `,
  )
  assert.deepEqual(paths, [
    'packages/cards/src/finn-calvin',
    'packages/cards/src/finn-calvin/register',
    'packages/cards/src/finn-calvin/register',
    'packages/cards/src/finn-calvin/card-04003',
  ])
})

test('reviewed modules keep dynamic contracts and saves/online consumers without unrelated suites', () => {
  for (const module of [
    'hemlock-vale',
    'edge-of-the-earth',
    'finn-calvin',
    'trish-dexter',
    'daniela-monterey',
    'silas-winifred',
    'william-yorick',
    'rita-young',
  ]) {
    const p = planChanges([`packages/cards/src/${module}/register.ts`])
    assert.equal(p.full, false)
    assert.equal(p.sql, false)
    assert.equal(p.images, false)
    assert.ok(p.tests.includes(`packages/cards/src/${module}/`))
    for (const guard of [
      'packages/cards/src/scenario-coverage.test.ts',
      'packages/cards/src/campaign.test.ts',
      'packages/cards/src/decks.test.ts',
      'packages/saves',
      'apps/server/src/online/table.test.ts',
    ])
      assert.ok(p.tests.includes(guard), guard)
    for (const unrelated of ['packages/cards', 'apps/web', 'apps/server', 'scripts/cards-import'])
      assert.ok(!p.tests.includes(unrelated), unrelated)
    assert.deepEqual(p.typePackages, ['@lcg/cards'])
  }
})

test('a module helper consumed by another production module expands back to broad card checks', () => {
  assert.equal(
    isolatedCardTests('hemlock-vale', [
      {
        file: 'packages/cards/src/another-module/card.ts',
        targets: ['packages/cards/src/hemlock-vale/common'],
      },
    ]),
    undefined,
  )
  assert.equal(isolatedCardTests('unreviewed-module', []), undefined)
  const p = planChanges(['packages/cards/src/advanced-tests/common.ts'])
  assert.ok(p.tests.includes('packages/cards'))
  assert.deepEqual(p.typePackages, ['@lcg/cards', '@lcg/saves', '@lcg/server'].sort())
})

test('reviewed registry boundaries retain contracts and a new external test is selected', () => {
  const p = isolatedCardTests('finn-calvin', [
    { file: 'packages/cards/src/index.ts', targets: ['packages/cards/src/finn-calvin'] },
    {
      file: 'apps/web/src/game/another.test.ts',
      targets: ['packages/cards/src/finn-calvin/source-en.json'],
    },
  ])
  assert.ok(p.includes('apps/web/src/game/another.test.ts'))
  assert.ok(p.includes('packages/cards/src/cards.test.ts'))
})

test('global card registration/data and unknown modules keep broad coverage', () => {
  for (const file of [
    'packages/cards/src/index.ts',
    'packages/cards/src/core-2026/player-cards.ts',
    'packages/cards/src/data/finn-calvin.json',
    'packages/cards/src/new-module/card.ts',
  ]) {
    const p = planChanges([file])
    assert.ok(p.tests.includes('packages/cards'), file)
    assert.ok(p.tests.includes('apps/web'), file)
    assert.ok(p.tests.includes('apps/server'), file)
  }
})

test('test-only edits select the changed test and its package types; SQL tests still require SQL', () => {
  const file = 'packages/cards/src/finn-calvin/rules.test.ts'
  const p = planChanges([file])
  assert.deepEqual(p.tests, [file])
  assert.deepEqual(p.typePackages, ['@lcg/cards'])
  assert.equal(p.sql, false)
  assert.equal(planChanges(['apps/server/src/accounts/accounts.mysql.test.ts']).sql, true)
  assert.equal(planChanges(['packages/unknown/src/thing.test.ts']).full, true)
})

test('narration updates retain scenario/narration checks without image or unrelated web checks', () => {
  const p = planChanges([
    'scripts/generate-hemlock-vale-audio.mjs',
    'apps/web/src/game/hemlockValeNarrationManifest.json',
    'docs-proyecto/evidencias/hemlock-vale-narracion.json',
    'apps/web/public/local-assets/story/audio/es/hemlock-vale-intro-123.mp3',
  ])
  assert.equal(p.full, false)
  assert.equal(p.images, false)
  assert.equal(p.sql, false)
  assert.ok(p.tests.includes('apps/web/src/game/hemlock-vale-'))
  assert.ok(!p.tests.includes('apps/web'))
})

test('card scan/inventory changes verify hashes and presentation without game or SQL suites', () => {
  const p = planChanges([
    'apps/web/public/local-assets/cards/es/04003.avif',
    'apps/web/src/game/cardImageManifest.json',
    'docs-proyecto/evidencias/miniaturas-cartas.json',
  ])
  assert.equal(p.images, true)
  assert.equal(p.types, false)
  assert.equal(p.sql, false)
  assert.deepEqual(p.tests, [
    'apps/web/src/game/spanishImages.test.ts',
    'apps/web/src/game/fallbackCards.test.ts',
  ])
})

test('a mixed module and engine/contract change cannot be narrowed', () => {
  for (const file of [
    'packages/engine/src/handlers.ts',
    'packages/shared/src/index.ts',
    'packages/saves/src/index.ts',
  ]) {
    const p = planChanges(['packages/cards/src/finn-calvin/register.ts', file])
    assert.equal(p.full, true)
    assert.equal(p.sql, true)
    assert.deepEqual(p.typePackages, [])
  }
  assert.ok(
    planChanges([
      'packages/cards/src/hemlock-vale/common.ts',
      'packages/cards/src/data/new.json',
    ]).tests.includes('packages/cards'),
  )
})

test('changelog and translations do not start SQL or game suites', () => {
  const p = planChanges([
    'apps/web/src/changelog.ts',
    'packages/i18n/src/en.json',
    'packages/i18n/src/es.json',
  ])
  assert.deepEqual(p.tests, ['packages/i18n'])
  assert.equal(p.sql, false)
  assert.equal(p.full, false)
  assert.equal(p.types, false)
  assert.equal(p.images, false)
})
test('web changes run web tests without SQL', () => {
  const p = planChanges(['apps/web/src/views/Game.vue'])
  assert.deepEqual(p.tests, ['apps/web'])
  assert.equal(p.sql, false)
})
test('card rules include dynamic registrations and consumers but no SQL', () => {
  const p = planChanges(['packages/cards/src/the-dunwich-legacy/harold-walsted.ts'])
  for (const path of [
    'packages/cards',
    'packages/saves',
    'apps/web',
    'apps/server',
    'scripts/cards-import',
  ])
    assert.ok(p.tests.includes(path))
  assert.equal(p.sql, false)
  assert.equal(p.types, true)
})
test('server changes and migrations require SQL, including lobbies', () => {
  for (const file of ['apps/server/src/online/lobbies.ts', 'apps/server/migrations/001.sql']) {
    const p = planChanges([file], { event: 'pull_request' })
    assert.equal(p.sql, true)
    assert.equal(p.sqlMatrix.include.length, 2)
    assert.ok(p.tests.includes('apps/web'))
  }
  assert.equal(planChanges(['apps/server/src/app.ts']).sqlMatrix.include.length, 1)
})
test('shared contracts, dependencies, installation and unknown paths fail closed', () => {
  for (const file of [
    'packages/engine/src/types.ts',
    'packages/saves/src/index.ts',
    'packages/shared/src/index.ts',
    'packages/i18n/src/index.ts',
    'pnpm-lock.yaml',
    'apps/web/package.json',
    'apps/web/public/.htaccess',
    'tools/deploy-plesk.mjs',
    '.github/workflows/ci.yml',
    'scripts/ci/plan.mjs',
    'new-package/index.ts',
  ]) {
    const p = planChanges([file])
    assert.equal(p.full, true, file)
    assert.equal(p.sql, true, file)
  }
})
test('mixed changes use the union, never the lightest scope', () => {
  const p = planChanges(['packages/i18n/src/es.json', 'apps/server/src/app.ts'])
  assert.equal(p.sql, true)
  assert.ok(p.tests.includes('packages/i18n'))
  assert.ok(p.tests.includes('apps/server'))
})
test('evidence and local images retain verification; ordinary docs do not expand scope', () => {
  assert.equal(planChanges(['docs-proyecto/evidencias/imagenes-dunwich.json']).images, true)
  assert.equal(planChanges(['apps/web/public/local-assets/cards/es/02041.avif']).images, true)
  assert.deepEqual(planChanges(['docs-proyecto/89-legado-de-dunwich.md']).tests, [])
})
test('push compares the full pushed range and preserves deleted paths and spaces', () => {
  const before = 'a'.repeat(40),
    after = 'b'.repeat(40)
  const result = changedFiles('push', { before, after }, (args) => {
    assert.deepEqual(args, ['diff', '--no-renames', '--name-only', '-z', before, after, '--'])
    return 'apps/server/src/deleted.ts\0apps/web/src/a b.ts\0'
  })
  assert.deepEqual(result.files, ['apps/server/src/deleted.ts', 'apps/web/src/a b.ts'])
  assert.equal(planChanges(result.files).sql, true)
})
test('PR compares from the merge base', () => {
  const base = 'a'.repeat(40),
    head = 'b'.repeat(40),
    merge = 'c'.repeat(40)
  const calls = []
  const result = changedFiles(
    'pull_request',
    { pull_request: { base: { sha: base }, head: { sha: head } } },
    (args) => {
      calls.push(args)
      return args[0] === 'merge-base' ? merge + '\n' : 'packages/i18n/src/es.json\0'
    },
  )
  assert.equal(calls[1][4], merge)
  assert.equal(result.fallback, false)
})
test('missing history and first pushes select the full suite', () => {
  for (const event of [
    {},
    { before: '0'.repeat(40), after: 'b'.repeat(40) },
    { before: 'a'.repeat(40), after: 'b'.repeat(40) },
  ]) {
    const result = changedFiles('push', event, () => {
      throw new Error('missing commit')
    })
    assert.equal(result.fallback, true)
    assert.equal(planChanges(result.files, result).sql, true)
  }
})

test('real git range catches an earlier server edit and a rename into documentation', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arkham-ci-diff-'))
  const git = (args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' })
  try {
    git(['init', '-q'])
    git(['config', 'user.name', 'CI test'])
    git(['config', 'user.email', 'ci@example.test'])
    mkdirSync(join(dir, 'apps/server/src'), { recursive: true })
    writeFileSync(join(dir, 'apps/server/src/old.ts'), '// server\n')
    git(['add', '.'])
    git(['commit', '-qm', 'initial'])
    const before = git(['rev-parse', 'HEAD']).trim()
    renameSync(join(dir, 'apps/server/src/old.ts'), join(dir, 'notes.md'))
    git(['add', '-A'])
    git(['commit', '-qm', 'move'])
    mkdirSync(join(dir, 'packages/i18n/src'), { recursive: true })
    writeFileSync(join(dir, 'packages/i18n/src/es.json'), '{}')
    git(['add', '.'])
    git(['commit', '-qm', 'text'])
    const after = git(['rev-parse', 'HEAD']).trim()
    const changes = changedFiles('push', { before, after }, git)
    assert.equal(changes.fallback, false)
    assert.ok(changes.files.includes('apps/server/src/old.ts'))
    assert.ok(changes.files.includes('notes.md'))
    assert.equal(planChanges(changes.files).sql, true)
    const lastCommitOnly = changedFiles(
      'push',
      { before: git(['rev-parse', 'HEAD^']).trim(), after },
      git,
    )
    assert.equal(planChanges(lastCommitOnly.files).sql, false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
