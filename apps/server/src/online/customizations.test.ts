import { randomUUID } from 'node:crypto'
import { canPlayNext, isStandard, newCampaign, purchase, startScenario } from '@lcg/cards'
import { playerCardDef } from '@lcg/engine'
import { expect, it } from 'vitest'
import { LobbyService, type Lobby } from './lobbies'
import type { Database } from '../accounts/database'

it('purchases shared upgrades server-side, persists them, and checks command replay and ownership', async () => {
  const campaign = newCampaign('night-of-the-zealot', ['stella'], 'standard')
  campaign.log.investigators['60501']!.xp = 8
  const game = startScenario(campaign, 2, false)
  game.outcome = { type: 'resolution', resolution: 1 }
  let saved: Lobby = {
    id: randomUUID(),
    owner: 'host',
    members: ['host'],
    revision: 0,
    campaign,
    game,
    intermission: true,
    campaignReady: ['host'],
    decks: { host: { investigator: '60501', cards: campaign.investigators[0]!.deck } },
  }
  const db = {
    rows: async () => [{ payload: JSON.stringify(saved) }],
    exec: async (_sql: string, args: string[]) => {
      saved = JSON.parse(args[0]!) as Lobby
    },
    transaction: async <T>(run: (tx: Database) => Promise<T>) => run(db as unknown as Database),
  }
  const service = new LobbyService(db as unknown as Database)
  const command = {
    action: 'customize' as const,
    commandId: randomUUID(),
    revision: 0,
    card: '09119',
    sheet: { telescanner: 2 },
    copies: 2,
    removals: ['60505', '60505'],
  }
  await expect(service.progress(saved.id, 'outsider', command)).rejects.toMatchObject({
    code: 'not_member',
  })
  const result = await service.progress(saved.id, 'host', command)
  expect(result.campaign?.own?.customizations).toEqual({ '09119': { telescanner: 2 } })
  // 2 boxes, plus the second new copy at level 1 (FAQ: only one copy is free).
  expect(result.campaign?.own?.xp).toBe(5)
  expect(saved.campaignReady).toEqual([])
  await service.progress(saved.id, 'host', command)
  expect(saved.campaign!.log.investigators['60501']!.xp).toBe(5)
  await expect(
    service.progress(saved.id, 'host', { ...command, sheet: { railshooter: 2 } }),
  ).rejects.toMatchObject({ code: 'command_conflict' })
})

it('keeps the shop open for a short deck and refuses only the next scenario', async () => {
  let campaign = newCampaign('night-of-the-zealot', ['harvey'], 'standard')
  const id = campaign.investigators[0]!.id
  const deck = [...campaign.investigators[0]!.deck]
  if (!deck.includes('60211'))
    deck[deck.findIndex((code) => isStandard(code) && playerCardDef(code)?.class === 'seeker')] =
      '60211'
  campaign = { ...campaign, investigators: [{ ...campaign.investigators[0]!, deck }] }
  campaign.log.investigators[id]!.xp = 4
  // The upgrade to a Permanent leaves the deck one card short (doc 100, C3).
  campaign = purchase(campaign, id, '02187', { upgrade: true })
  expect(canPlayNext(campaign)).toBe(false)
  const game = startScenario(newCampaign('night-of-the-zealot', ['harvey'], 'standard'), 2, false)
  game.outcome = { type: 'resolution', resolution: 1 }
  let saved: Lobby = {
    id: randomUUID(),
    owner: 'host',
    members: ['host'],
    revision: 0,
    campaign,
    game,
    intermission: true,
    campaignReady: ['host'],
    decks: { host: { investigator: id, cards: campaign.investigators[0]!.deck } },
  }
  const db = {
    rows: async () => [{ payload: JSON.stringify(saved) }],
    exec: async (_sql: string, args: string[]) => {
      saved = JSON.parse(args[0]!) as Lobby
    },
    transaction: async <T>(run: (tx: Database) => Promise<T>) => run(db as unknown as Database),
  }
  const service = new LobbyService(db as unknown as Database)
  const view = await service.progress(saved.id, 'host', {
    action: 'ready',
    ready: true,
    commandId: randomUUID(),
    revision: 0,
  })
  expect(view.campaign?.canContinue).toBe(true)
  expect(view.campaign?.deckIssues).toEqual([
    expect.objectContaining({ investigator: id, key: 'deck.problem.size' }),
  ])
  await expect(
    service.progress(saved.id, 'host', {
      action: 'next',
      commandId: randomUUID(),
      revision: saved.revision,
    }),
  ).rejects.toMatchObject({ code: 'invalid_deck' })
  const fill = view.campaign!.own!.options.find((o) => !o.replaces && o.cost >= 1 && o.cost <= 3)!
  const filled = await service.progress(saved.id, 'host', {
    action: 'purchase',
    card: fill.code,
    upgrade: false,
    commandId: randomUUID(),
    revision: saved.revision,
  })
  expect(filled.campaign?.deckIssues).toEqual([])
})
