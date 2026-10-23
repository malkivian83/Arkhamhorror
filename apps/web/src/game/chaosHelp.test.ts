import { createI18n } from 'vue-i18n'
import { messages } from '@lcg/i18n'
import { describe, expect, it } from 'vitest'
import { chaosHelp } from './chaosHelp'

describe('chaos token help', () => {
  for (const locale of ['es', 'en'] as const) {
    const { t } = createI18n({ legacy: false, locale, messages }).global
    it(`${locale}: differentiates failure thresholds and difficulty faces`, () => {
      const state = { scenarioId: 'spreading-flames', difficulty: 'standard' as const }
      const standard = chaosHelp(state, 'elderThing', locale, t)
      const hard = chaosHelp({ ...state, difficulty: 'hard' }, 'elderThing', locale, t)
      expect(standard).toContain('-3')
      expect(standard).toContain('2')
      expect(hard).toContain('-4')
      expect(hard).not.toContain('2')
    })
    it(`${locale}: preserves the conditional automatic failure in Queen of Ash`, () => {
      const text = chaosHelp(
        { scenarioId: 'queen-of-ash', difficulty: 'expert' },
        'tablet',
        locale,
        t,
      )
      expect(text).toContain('-4')
      expect(text).toMatch(/automáticamente|automatically/)
    })
    it(`${locale}: uses the correct official Excelsior reference face`, () => {
      const state = { scenarioId: 'murder-at-the-excelsior-hotel', difficulty: 'standard' as const }
      expect(chaosHelp(state, 'tablet', locale, t)).toContain('-3')
      expect(chaosHelp({ ...state, difficulty: 'hard' }, 'tablet', locale, t)).toContain('-5')
      expect(chaosHelp(state, 'skull', locale, t)).not.toContain('[[')
    })
    it(`${locale}: provides nonempty resolved text for every supported scenario symbol`, () => {
      for (const scenarioId of [
        'spreading-flames',
        'smoke-and-mirrors',
        'queen-of-ash',
        'the-midwinter-gala',
        'murder-at-the-excelsior-hotel',
      ])
        for (const difficulty of ['easy', 'standard', 'hard', 'expert'] as const)
          for (const token of [
            'skull',
            'tablet',
            'elderThing',
            'autoFail',
            'elderSign',
            -2,
            1,
          ] as const) {
            const text = chaosHelp(Object.freeze({ scenarioId, difficulty }), token, locale, t)
            expect(text.length).toBeGreaterThan(5)
            expect(text).not.toMatch(/chaosHelp\.|\{|undefined/)
          }
    })
  }
})
