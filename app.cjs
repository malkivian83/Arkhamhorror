// Passenger loads this entry in the same process so its HTTP server hook stays active.
const { loadEnvFile } = require('node:process')
const { existsSync } = require('node:fs')
const { join } = require('node:path')
const { createRequire } = require('node:module')

const envFile = join(__dirname, '.env')
if (existsSync(envFile)) loadEnvFile(envFile)
process.env.NODE_ENV ??= 'production'
process.env.WEB_ROOT = join(__dirname, 'public')
const serverRequire = createRequire(join(__dirname, 'apps/server/package.json'))
const { tsImport } = serverRequire('tsx/esm/api')
tsImport('./apps/server/src/main.ts', __filename).catch((error) => {
  console.error('Application startup failed:', error.message)
  process.exitCode = 1
})
