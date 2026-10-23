import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createI18n } from 'vue-i18n'
import { messages } from '@lcg/i18n'
import type { OnlineCampaignView } from '@lcg/shared'
import { expect, it } from 'vitest'
import OnlineCampaign from '../components/OnlineCampaign.vue'

function view(): OnlineCampaignView {
  return {
    canManage: true,
    canContinue: true,
    nextScenario: 'smoke-and-mirrors',
    ready: false,
    allReady: false,
    members: [
      {
        investigator: '12004',
        xp: 5,
        physicalTrauma: 1,
        mentalTrauma: 0,
        active: true,
        ready: false,
      },
    ],
    own: { deck: ['01030'], removable: ['01030'], options: [] },
  }
}
async function render(campaign: OnlineCampaignView, locale: 'es' | 'en' = 'es') {
  return renderToString(
    createSSRApp(OnlineCampaign, { campaign, disabled: false }).use(
      createI18n({ legacy: false, locale, messages }),
    ),
  )
}
it('shows earned XP, personal deck and a disabled next scenario until everyone is ready', async () => {
  const campaign = view(),
    html = await render(campaign)
  expect(html).toContain('XP: 5')
  expect(html).toContain(messages.es.online.campaignPlay.upgrade)
  expect(html).toMatch(/<button[^>]*disabled[^>]*>Iniciar siguiente escenario<\/button>/)
  campaign.allReady = true
  expect(await render(campaign)).toMatch(
    /<button(?![^>]*disabled)[^>]*>Iniciar siguiente escenario<\/button>/,
  )
})
it('hides host actions from guests and upgrades from eliminated players or completed campaigns', async () => {
  const campaign = view()
  campaign.canManage = false
  expect(await render(campaign)).not.toContain(messages.es.online.campaignPlay.start)
  campaign.own = null
  expect(await render(campaign)).not.toContain(messages.es.online.campaignPlay.buy)
  campaign.canContinue = false
  expect(await render(campaign, 'en')).toContain(messages.en.online.campaignPlay.ended)
})
