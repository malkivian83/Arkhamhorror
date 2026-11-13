import { expect, it } from 'vitest'
import { setAppLocale } from '../i18n'
import { campaignNoteValue } from './campaignProgress'

it.each(['en', 'es'] as const)(
  'shows names rather than identifiers in the final survivors record (%s)',
  async (locale) => {
    await setAppLocale(locale, false)
    const names = campaignNoteValue('edgeOfTheEarthSurvivors', '08714,08716,12004')
    expect(names).toContain('Dyer')
    expect(names).toContain('Eliyah')
    expect(names).toContain('Joe Diamond')
    expect(names).not.toMatch(/08714|08716|12004/)
    expect(campaignNoteValue('other', '1,2')).toBe('1,2')
  },
)
