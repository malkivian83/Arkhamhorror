import { expect, it } from 'vitest'
import { cardTextHtml } from './cardText'

it('renders Fortune and Folly separators while preserving traits and action icons', () => {
  const html = cardTextHtml('[[Casino]]\n<hr>\n<b>Forced</b> – [action]')
  expect(html).toContain('<i>Casino</i><br><hr><br><b>Forced</b>')
  expect(html).toContain('class="ci act"')
  expect(cardTextHtml('One<hr />Two')).toBe('One<hr>Two')
})

it('keeps attributes and unknown tags escaped instead of trusting card markup', () => {
  const html = cardTextHtml('<hr onmouseover="alert(1)"><script>alert(2)</script>')
  expect(html).toContain('&lt;hr onmouseover=&quot;alert(1)&quot;&gt;')
  expect(html).toContain('&lt;script&gt;alert(2)&lt;/script&gt;')
  expect(html).not.toContain('<hr')
  expect(html).not.toContain('<script>')
})
