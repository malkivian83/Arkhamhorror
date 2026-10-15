import { describe, expect, it } from 'vitest'
import { messages } from './index'

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  )
}

describe('i18n', () => {
  it('inglés y español tienen exactamente las mismas claves', () => {
    expect(keys(messages.es).sort()).toEqual(keys(messages.en).sort())
  })

  it('ningún texto está vacío', () => {
    for (const locale of [messages.en, messages.es]) {
      const flat = JSON.stringify(locale)
      expect(flat).not.toContain('""')
    }
  })
})
