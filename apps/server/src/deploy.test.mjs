import { afterEach, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deployPlesk } from '../../../tools/deploy-plesk.mjs'

let root
afterEach(async () => {
  vi.unstubAllEnvs()
  if (root) await rm(root, { recursive: true, force: true })
})
async function fixture() {
  root = await mkdtemp(join(tmpdir(), 'arkham-deploy-'))
  await mkdir(join(root, 'public'))
  await writeFile(join(root, 'public/index.html'), 'test')
  await writeFile(join(root, 'package.json'), JSON.stringify({ packageManager: 'pnpm@12.11.2' }))
  for (const [key, value] of Object.entries({
    DATABASE_URL: 'mysql://test@localhost/test',
    SMTP_URL: 'smtp://localhost:1025',
    MAIL_FROM: 'test@example.test',
    APP_ORIGIN: 'https://example.test',
    GOOGLE_CLIENT_ID: '',
    GOOGLE_CLIENT_SECRET: '',
    ADMIN_EMAIL: '',
    ADMIN_PASSWORD: '',
  }))
    vi.stubEnv(key, value)
}
it('solicita el reinicio solo después de instalar dependencias y completar las migraciones', async () => {
  await fixture()
  const run = vi.fn()
  await deployPlesk(root, run)
  expect(run).toHaveBeenCalledTimes(2)
  const args = run.mock.calls[0][1]
  expect(args).toContain('--package=pnpm@12.11.2')
  expect(args).toContain('--frozen-lockfile')
  expect(args).toContain('--prod')
  expect(await readFile(join(root, 'tmp/restart.txt'), 'utf8')).toMatch(/^\d+\n$/)
  await expect(readFile(join(root, 'tmp/deploy.lock'))).rejects.toMatchObject({ code: 'ENOENT' })
})
it('un fallo de migración no solicita reinicio y libera el bloqueo del despliegue', async () => {
  await fixture()
  const run = vi
    .fn()
    .mockImplementationOnce(() => {})
    .mockImplementationOnce(() => {
      throw new Error('Migration failed')
    })
  await expect(deployPlesk(root, run)).rejects.toThrow('Migration failed')
  await expect(readFile(join(root, 'tmp/restart.txt'))).rejects.toMatchObject({ code: 'ENOENT' })
  await expect(readFile(join(root, 'tmp/deploy.lock'))).rejects.toMatchObject({ code: 'ENOENT' })
})
