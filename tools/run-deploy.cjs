const { createRequire } = require('node:module')
const { join } = require('node:path')
const serverRequire = createRequire(join(__dirname, '../apps/server/package.json'))
const { tsImport } = serverRequire('tsx/esm/api')
tsImport('../apps/server/src/deploy.ts', __filename).catch((error) => {
  console.error('Database deployment stopped:', error.message)
  process.exitCode = 1
})
