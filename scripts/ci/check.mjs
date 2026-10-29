import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const plan = JSON.parse(
  readFileSync(process.env.CI_PLAN_PATH ?? join(tmpdir(), 'arkham-ci-plan.json'), 'utf8'),
)
function pnpm(...args) {
  const result = spawnSync('pnpm', args, { stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
if (plan.full) {
  pnpm('format:check')
  pnpm('lint')
} else {
  const files = plan.files.filter((file) => existsSync(file))
  // Bounded argument lists also handle large image imports and filenames containing spaces.
  for (let i = 0; i < files.length; i += 100)
    pnpm('exec', 'prettier', '--check', '--ignore-unknown', '--', ...files.slice(i, i + 100))
  const code = files.filter((file) => /\.(?:[cm]?[jt]s|tsx|jsx|vue)$/.test(file))
  for (let i = 0; i < code.length; i += 100)
    pnpm('exec', 'eslint', '--no-warn-ignored', '--', ...code.slice(i, i + 100))
}
// build:plesk checks web types, so do not run that typecheck twice.
if (plan.types) pnpm('-r', '--filter', '!@lcg/web', 'typecheck')
if (plan.full) pnpm('test')
else if (plan.tests.length) pnpm('test', ...plan.tests)
if (plan.images) {
  const result = spawnSync(process.execPath, ['scripts/verify-card-images.mjs'], {
    stdio: 'inherit',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
