import { messages } from '@lcg/i18n'
import type { PurchaseOption } from '@lcg/cards'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createI18n } from 'vue-i18n'
import { expect, it } from 'vitest'
import CampaignUpgradeShop from './CampaignUpgradeShop.vue'

const option: PurchaseOption = {
  code: '01030',
  name: 'Physical Training',
  cost: 1,
  level: 0,
  implemented: true,
  needsRemoval: true,
}

async function render(options: PurchaseOption[], disabled = false, locale: 'en' | 'es' = 'es') {
  return renderToString(
    createSSRApp(CampaignUpgradeShop, { options, removable: ['01030'], xp: 4, disabled }).use(
      createI18n({ legacy: false, locale, messages }),
    ),
  )
}

it('shows images and distinguishes a new copy from an upgrade of the same card', async () => {
  const html = await render([option, { ...option, replaces: '01031', needsRemoval: false }])
  expect(html.match(/class="card-option"/g)).toHaveLength(2)
  expect(html.match(/class="game-card"/g)).toHaveLength(2)
  expect(html).toContain(messages.es.campaign.shop.newCard)
  expect(html).toContain('mejora de')
  expect(html).toContain('4 exp. disponibles')
  // Opening a card is a separate action: rendering the shop cannot purchase it.
  expect(html).not.toContain('Comprar (')
  expect(html).toContain('type="search"')
  expect(html).toContain(messages.es.campaign.shop.upgradesOnly)
})

it('limits the initial gallery to 24 cards and disables selection while changes are blocked', async () => {
  const options = Array.from({ length: 25 }, (_, n) => ({ ...option, code: `test-${n}` }))
  const html = await render(options, true, 'en')
  expect(html.match(/class="card-option" disabled/g)).toHaveLength(24)
  expect(html).toContain('25 options available')
  expect(html).toContain('1 of 2')
  expect(html).toContain('aria-label="Card pages"')
})

it.each(['en', 'es'] as const)('explains an empty affordable pool in %s', async (locale) => {
  const html = await render([], false, locale)
  expect(html).toContain(messages[locale].campaign.nothingToBuy)
  expect(html).not.toContain('class="card-option"')
  expect(html).not.toContain('class="pagination"')
})
