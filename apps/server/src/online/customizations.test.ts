import { randomUUID } from 'node:crypto'
import { newCampaign, startScenario } from '@lcg/cards'
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
  expect(result.campaign?.own?.xp).toBe(6)
  expect(saved.campaignReady).toEqual([])
  await service.progress(saved.id, 'host', command)
  expect(saved.campaign!.log.investigators['60501']!.xp).toBe(6)
  await expect(
    service.progress(saved.id, 'host', { ...command, sheet: { railshooter: 2 } }),
  ).rejects.toMatchObject({ code: 'command_conflict' })
})
