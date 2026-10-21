import { describe, expect, it } from 'vitest'
import { assertEquivalent, equivalenceHash } from './equivalence.mjs'
const source = {
  code: 'base',
  name: 'Example',
  type_code: 'skill',
  xp: 0,
  skill_wild: 2,
  text: 'A synthetic example. One effect.',
  deck_limit: 2,
}
describe('reviewed reprint equivalence', () => {
  it('ignores printing identity and presentation but preserves mechanical text', () => {
    expect(
      assertEquivalent(source, {
        ...source,
        code: 'other',
        pack_code: 'another',
        flavor: 'Own example',
        text: 'A synthetic example.  One effect.',
      }),
    ).toBe(equivalenceHash(source))
  })
  it.each([
    'text',
    'cost',
    'xp',
    'skill_wild',
    'deck_limit',
    'slot',
    'traits',
    'restrictions',
    'permanent',
    'keywords',
  ])('rejects a change to %s', (field) => {
    expect(() =>
      assertEquivalent(source, { ...source, code: 'other', [field]: 'changed' }),
    ).toThrow('differs')
  })
})
