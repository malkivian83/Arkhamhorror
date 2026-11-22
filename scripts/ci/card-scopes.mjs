import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'

// Opt in only boundaries with explicit dynamic consumers. A new module stays broad.
const modules = {
  'hemlock-vale': ['apps/web/src/game/hemlock-vale-'],
  'edge-of-the-earth': ['apps/web/src/game/edge-of-the-earth-'],
  'finn-calvin': ['apps/web/src/game/finn-calvin', 'scripts/cards-import/finn-calvin.test.mjs'],
  'william-yorick': [
    'apps/web/src/game/william-yorick.test.ts',
    'apps/web/src/game/yorick-rita-session.test.ts',
  ],
  'rita-young': [
    'apps/web/src/game/rita-young.test.ts',
    'apps/web/src/game/yorick-rita-session.test.ts',
  ],
}
const boundaries = new Set([
  'packages/cards/src/index.ts',
  'packages/cards/src/campaign.ts',
  'packages/cards/src/core-2026/player-cards.ts',
])
const consumers = [
  'packages/saves',
  'apps/server/src/online/table.test.ts',
  'apps/server/src/online/lobbies.test.ts',
  'apps/web/src/game/session.test.ts',
  'apps/web/src/game/fallbackCards.test.ts',
  'apps/web/src/game/cardText.test.ts',
]
let imports
export function importedPaths(file, source) {
  return [...source.matchAll(/(?:from\s*|import\s*(?:\(\s*)?|require\s*\(\s*)['"]([^'"]+)['"]/g)]
    .map((m) => m[1])
    .flatMap((spec) =>
      spec.startsWith('@lcg/cards/')
        ? ['packages/cards/src/' + spec.slice('@lcg/cards/'.length)]
        : spec.startsWith('.')
          ? [relative('.', resolve(dirname(file), spec)).replaceAll('\\', '/')]
          : [],
    )
}
function repositoryImports() {
  if (imports) return imports
  const result = []
  function walk(dir) {
    if (!existsSync(dir)) return
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', 'dist', 'catalog', 'data'].includes(item.name)) continue
      const file = `${dir}/${item.name}`
      if (item.isDirectory()) walk(file)
      else if (/\.(?:ts|vue|mjs)$/.test(file)) {
        const source = readFileSync(file, 'utf8')
        const targets = importedPaths(file, source)
        result.push({ file, targets })
      }
    }
  }
  for (const dir of ['packages', 'apps/web/src', 'apps/server/src', 'scripts/cards-import'])
    walk(dir)
  imports = result
  return imports
}

/** Return undefined if a module is unknown or a helper escapes its reviewed boundary. */
export function isolatedCardTests(module, connections) {
  if (!Object.hasOwn(modules, module)) return undefined
  const prefix = `packages/cards/src/${module}`
  try {
    const external = (connections ?? repositoryImports()).filter(
      ({ file, targets }) =>
        !file.startsWith(prefix + '/') &&
        targets.some((t) => t === prefix || t.startsWith(prefix + '/')),
    )
    if (external.some(({ file }) => !file.includes('.test.') && !boundaries.has(file)))
      return undefined
    // Root-level contract/campaign tests load the registry dynamically; never infer them from imports.
    const contracts = readdirSync('packages/cards/src')
      .filter((n) => /\.test\.(?:ts|mjs)$/.test(n))
      .map((n) => `packages/cards/src/${n}`)
    return [
      prefix + '/',
      ...modules[module],
      ...contracts,
      ...consumers,
      ...external.filter(({ file }) => file.includes('.test.')).map(({ file }) => file),
    ]
  } catch {
    return undefined
  }
}
