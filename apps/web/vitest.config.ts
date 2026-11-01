import { defineProject, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineProject({ test: { name: '@lcg/web', setupFiles: ['./src/test-setup.ts'] } }),
)
