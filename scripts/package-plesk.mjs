import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export async function packagePlesk(source, destination, revision) {
  await mkdir(destination, { recursive: true })
  if ((await readdir(destination)).length)
    throw new Error('The deployment output directory must be empty')
  // An allowlist prevents .env, caches, local evidence and arbitrary source files entering deploy.
  const files = [
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'tsconfig.base.json',
    '.nvmrc',
    '.env.example',
    'app.cjs',
    'tools/deploy-plesk.mjs',
    'tools/run-deploy.cjs',
    'apps/server/package.json',
    'apps/server/tsconfig.json',
    'apps/web/package.json',
  ]
  for (const name of ['engine', 'cards', 'saves', 'shared', 'i18n']) {
    files.push(`packages/${name}/package.json`)
    if (name !== 'i18n') files.push(`packages/${name}/tsconfig.json`, `packages/${name}/src`)
  }
  files.push('apps/server/src', 'apps/server/migrations')
  for (const file of files) {
    await mkdir(dirname(join(destination, file)), { recursive: true })
    await cp(join(source, file), join(destination, file), {
      recursive: true,
      filter: (path) =>
        !/\.(test|spec)\.[cm]?[jt]s$/.test(path) &&
        !['node_modules', 'dist'].includes(basename(path)) &&
        (!basename(path).startsWith('.env') || basename(path) === '.env.example'),
    })
  }
  await cp(join(source, 'apps/web/dist'), join(destination, 'public'), { recursive: true })
  await writeFile(
    join(destination, '.gitignore'),
    '.env\n.env.*\n!.env.example\nnode_modules/\n**/node_modules/\ntmp/\n',
  )
  await writeFile(
    join(destination, 'deploy-info.json'),
    JSON.stringify({ revision }, null, 2) + '\n',
  )
  const { packageManager } = JSON.parse(await readFile(join(destination, 'package.json'), 'utf8'))
  console.log(`Plesk package prepared (${packageManager}); public root: public/`)
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  await packagePlesk(
    root,
    resolve(process.argv[2] ?? join(root, 'dist/plesk')),
    process.env.SOURCE_SHA ?? 'local',
  )
}
