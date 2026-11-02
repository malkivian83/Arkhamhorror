import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'cards',
    // Files share one module graph instead of reloading every card each time (doc 100, O4);
    // the setup file puts back the cards a test overrides. Full random games then run
    // side by side, so they get more than the default 5 s.
    isolate: false,
    setupFiles: ['./src/test-setup.ts'],
    testTimeout: 15_000,
  },
})
