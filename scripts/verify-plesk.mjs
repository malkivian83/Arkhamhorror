import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { resolve, join } from 'node:path'

const root = resolve(process.argv[2] ?? 'dist/plesk')
const url = new URL(process.env.MYSQL_TEST_URL ?? 'mysql://localhost/invalid')
if (!url.pathname.endsWith('_test'))
  throw new Error('An isolated MYSQL_TEST_URL ending in _test is required')
if (existsSync(join(root, '.env')))
  throw new Error('Refusing to test a package containing a private .env')
const email = 'deployment-smoke@example.test',
  password = 'isolated-deployment-smoke-password'
const env = {
  ...process.env,
  NODE_ENV: 'production',
  DATABASE_URL: url.href,
  MIGRATION_DATABASE_URL: '',
  APP_ORIGIN: 'https://example.test',
  SMTP_URL: 'smtp://127.0.0.1:1025',
  MAIL_FROM: 'test@example.test',
  GOOGLE_CLIENT_ID: '',
  GOOGLE_CLIENT_SECRET: '',
  ADMIN_EMAIL: email,
  ADMIN_PASSWORD: password,
  SERVER_HOST: '127.0.0.1',
  SERVER_PORT: '0',
  PORT: '0',
}

const { stdout } = await promisify(execFile)(process.execPath, ['tools/deploy-plesk.mjs'], {
  cwd: root,
  env,
  windowsHide: true,
  maxBuffer: 4_000_000,
})
assert.match(stdout, /Deployment ready/)
const child = spawn(process.execPath, ['app.cjs'], {
  cwd: root,
  env,
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
let stderr = ''
child.stderr.on('data', (data) => {
  stderr += data
})
try {
  const address = await new Promise((resolveAddress, reject) => {
    let output = ''
    const timeout = setTimeout(() => reject(new Error(`Startup timeout: ${stderr}`)), 20000)
    child.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    child.on('exit', () => {
      clearTimeout(timeout)
      reject(new Error(`Application exited: ${stderr}`))
    })
    child.stdout.on('data', (data) => {
      output += data
      const match = output.match(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/)
      if (match) {
        clearTimeout(timeout)
        resolveAddress(match[1])
      }
    })
  })
  for (const path of ['/', '/library', '/api/health', '/api/ready']) {
    const response = await fetch(address + path)
    assert.equal(response.status, 200, path)
    if (path.startsWith('/api/')) assert.equal((await response.json()).status, 'ok')
    else assert.match(await response.text(), /<html/)
  }
  for (const path of ['/.env', '/apps/server/package.json', '/tools/deploy-plesk.mjs'])
    assert.ok([403, 404].includes((await fetch(address + path)).status), path)
  const login = await fetch(address + '/api/auth/login', {
    method: 'POST',
    headers: { origin: env.APP_ORIGIN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  assert.equal(login.status, 200)
  assert.equal((await login.json()).user.role, 'admin')
  assert.match(login.headers.get('set-cookie'), /Secure/)
  console.log(
    'Production package verified: installer, migrations, administrator, SPA, API and private-file protection',
  )
} finally {
  child.kill('SIGTERM')
}
