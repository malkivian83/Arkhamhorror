import { defineProject } from 'vitest/config'

export default defineProject({
  test: { name: 'card-import', include: ['cards-import/**/*.test.mjs'] },
})
