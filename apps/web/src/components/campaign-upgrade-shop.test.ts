import { messages } from '@lcg/i18n'
import type { PurchaseOption } from '@lcg/cards'
import { createSSRApp, type Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createI18n } from 'vue-i18n'
import { beforeAll, expect, it } from 'vitest'
import { fallbackCards } from '../game/fallbackCards'
import { localizedCards } from '../game/localized'
import CampaignUpgradeShop from './CampaignUpgradeShop.vue'
import UpgradeExchange from './UpgradeExchange.vue'

const option: PurchaseOption = {
  code: '01030',
  name: 'Magnifying Glass',
  cost: 1,
  level: 0,
  implemented: true,
  needsRemoval: true,
}

beforeAll(() => {
  localizedCards.value = new Map(fallbackCards('es').map((card) => [card.code, card]))
})

async function mount(
  component: Component,
  props: Record<string, unknown>,
  locale: 'en' | 'es' = 'es',
) {
  return renderToString(
    createSSRApp(component, props).use(createI18n({ legacy: false, locale, messages })),
  )
}
const render = (options: PurchaseOption[], disabled = false, locale: 'en' | 'es' = 'es') =>
  mount(
    CampaignUpgradeShop,
    { options, removable: ['01030'], deck: ['01030'], xp: 4, disabled },
    locale,
  )

it('lists cards with readable rules text and tells an upgrade from a new copy', async () => {
  const html = await render([option, { ...option, replaces: '01031', needsRemoval: false }])
  expect(html.match(/class="card-option"/g)).toHaveLength(2)
  expect(html.match(/class="card-info compact"/g)).toHaveLength(2)
  expect(html).toContain(messages.es.offlineCard.summary['01030'])
  expect(html).toContain('Mejora de')
  expect(html).toContain('ya tienes 1 en el mazo')
  expect(html).toContain('4 exp. disponibles')
  // Opening a card is a separate action: rendering the shop cannot purchase it.
  expect(html).not.toContain('Comprar (')
  expect(html).toContain('type="search"')
  expect(html).toContain('Mejoras de mis cartas (1)')
  expect(html).toContain('Cartas nuevas (1)')
})

it('shows 20 cards first, offers the rest and disables choosing while changes are blocked', async () => {
  const options = Array.from({ length: 25 }, (_, n) => ({ ...option, code: `test-${n}` }))
  const html = await render(options, true, 'en')
  expect(html.match(/class="choose" disabled/g)).toHaveLength(20)
  expect(html).toContain('25 options available')
  expect(html).toContain('Showing 20 of 25')
  expect(html).toContain('Show 5 more')
})

it.each(['en', 'es'] as const)('explains an empty affordable pool in %s', async (locale) => {
  const html = await render([], false, locale)
  expect(html).toContain(messages[locale].campaign.nothingToBuy)
  expect(html).not.toContain('class="card-option"')
  expect(html).not.toContain('class="more"')
})

it('compares an upgrade with the copy it replaces, both with their text', async () => {
  const html = await mount(UpgradeExchange, {
    option: { ...option, code: '01040', name: 'Magnifying Glass', level: 1, replaces: '01030' },
    removable: ['01030'],
    xp: 4,
    disabled: false,
  })
  expect(html).toContain(messages.es.campaign.shop.outgoing)
  expect(html).toContain(messages.es.campaign.shop.incoming)
  expect(html.match(/class="card-info"/g)).toHaveLength(2)
  expect(html).not.toContain('type="radio"')
  expect(html).toContain('aria-disabled="false"')
  expect(html).toContain('Te quedarán')
})

it('asks which card leaves before a full deck can take a new one', async () => {
  const html = await mount(
    UpgradeExchange,
    { option, removable: ['01030', '01030'], deck: ['01030', '01030'], xp: 4, disabled: false },
    'en',
  )
  expect(html).toContain(messages.en.campaign.shop.chooseRemoval)
  expect(html.match(/type="radio"/g)).toHaveLength(1)
  expect(html).toContain('×2 in deck')
  expect(html).toContain(messages.en.campaign.shop.needRemoval)
  expect(html).toContain('aria-disabled="true"')
})

it('explains why a purchase is blocked and when no card has to leave', async () => {
  const html = await mount(UpgradeExchange, {
    option: { ...option, needsRemoval: false },
    removable: [],
    xp: 4,
    disabled: true,
  })
  expect(html).toContain(messages.es.campaign.shop.noRemoval)
  expect(html).toContain(messages.es.customization.unavailable)
  expect(html).toContain('aria-disabled="true"')
})
