import assert from 'node:assert/strict'
import { test } from 'node:test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { changedFiles, planChanges } from './plan.mjs'

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
