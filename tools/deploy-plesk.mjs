import { existsSync } from 'node:fs'
import { mkdir, open, readFile, realpath, unlink, writeFile } from 'node:fs/promises'
import { loadEnvFile } from 'node:process'
import { basename, delimiter, dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

function run(node, args, cwd, env) {
  const result = spawnSync(node, args, { cwd, env, stdio: 'inherit', windowsHide: true })
  if (result.error) throw new Error(`Could not launch deployment command: ${result.error.code}`)
  if (result.status !== 0)
    throw new Error(`Deployment command failed (exit ${result.status ?? 'signal'})`)
}

async function npmCli(node) {
  const bin = dirname(node)
  const candidates = [
    join(bin, 'npm'),
    join(bin, 'node_modules/npm/bin/npm-cli.js'),
    join(bin, '../lib/node_modules/npm/bin/npm-cli.js'),
  ]
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue
    const target = await realpath(candidate)
    if (basename(target) === 'npm-cli.js') return target
  }
  throw new Error('npm was not found next to Node.js. Enable Node.js 24 with npm in Plesk.')
}

/** npm's cache supplies the pinned pnpm; no global installation or PATH shim is required. */
export async function deployPlesk(root, execute = run) {
  if (Number(process.versions.node.split('.')[0]) < 24)
    throw new Error('Node.js 24 or newer is required')
  const envPath = join(root, '.env')
  if (existsSync(envPath)) loadEnvFile(envPath)
  const env = { ...process.env, NODE_ENV: 'production' }
  env.PATH = `${dirname(process.execPath)}${delimiter}${env.PATH ?? ''}`
  if (
    !env.DATABASE_URL ||
    !env.SMTP_URL ||
    !env.MAIL_FROM ||
    !env.APP_ORIGIN?.startsWith('https://')
  )
    throw new Error(
      'Configure DATABASE_URL, SMTP_URL, MAIL_FROM and HTTPS APP_ORIGIN in the private .env',
    )
  if (!!env.GOOGLE_CLIENT_ID !== !!env.GOOGLE_CLIENT_SECRET)
    throw new Error('Configure both Google credentials or leave both empty')
  if (!!env.ADMIN_EMAIL !== !!env.ADMIN_PASSWORD)
    throw new Error('Configure ADMIN_EMAIL and ADMIN_PASSWORD together')
  if (!existsSync(join(root, 'public/index.html')))
    throw new Error('The complete deployment package with public/index.html is required')
  const { packageManager } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  if (!/^pnpm@\d+\.\d+\.\d+$/.test(packageManager))
    throw new Error('A pinned pnpm version is required')
  const npm = await npmCli(process.execPath)
  const tmp = join(root, 'tmp')
  await mkdir(tmp, { recursive: true })
  const lockPath = join(tmp, 'deploy.lock')
  let lock
  try {
    lock = await open(lockPath, 'wx')
  } catch (error) {
    if (error.code === 'EEXIST')
      throw new Error('Another deployment holds tmp/deploy.lock', { cause: error })
    throw error
  }
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, started: new Date().toISOString() }))
    console.log('Installing production dependencies with the pinned pnpm version')
    await execute(
      process.execPath,
      [
        npm,
        'exec',
        '--yes',
        `--package=${packageManager}`,
        '--',
        'pnpm',
        '--filter',
        '@lcg/server...',
        'install',
        '--prod',
        '--frozen-lockfile',
      ],
      root,
      env,
    )
    console.log('Applying migrations and provisioning the administrator')
    await execute(process.execPath, [join(root, 'tools/run-deploy.cjs')], root, env)
    // Passenger checks this standard restart marker. Never update it after a failed migration.
    await writeFile(join(tmp, 'restart.txt'), `${Date.now()}\n`)
    console.log('Deployment ready. Passenger restart requested via tmp/restart.txt')
  } finally {
    await lock.close()
    await unlink(lockPath)
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  try {
    await deployPlesk(root)
  } catch (error) {
    console.error(`Deployment stopped: ${error.message}`)
    process.exitCode = 1
  }
}
