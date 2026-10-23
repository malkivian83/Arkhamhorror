import { randomUUID } from 'node:crypto'
import { expect, it } from 'vitest'
import { database, migrate } from '../accounts/database'
import { LobbyService, type Lobby } from './lobbies'
import { starterDeck, starterInvestigator } from '@lcg/cards'

it.skipIf(!process.env.MYSQL_TEST_URL)(
  'serializes the last lobby seat in real MySQL and survives a new service instance',
  async () => {
    const connection = database(process.env.MYSQL_TEST_URL!)
    const owner = randomUUID()
    try {
      await migrate(connection.db)
      await connection.db.exec(
        'INSERT INTO users (id, email, name, verified, created_at) VALUES (?, ?, ?, ?, ?)',
        [owner, `${owner}@example.test`, 'Online test', true, Date.now()],
      )
      const service = new LobbyService(connection.db)
      const lobby = await service.create(owner)
      const invitation = await service.invite(lobby.id, owner)
      await service.join(lobby.id, 'a', invitation.token)
      await service.join(lobby.id, 'b', invitation.token)
      const results = await Promise.allSettled(
        ['c', 'd'].map((id) => service.join(lobby.id, id, invitation.token)),
      )
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
      expect((await new LobbyService(connection.db).get(lobby.id, owner)).members).toHaveLength(4)
    } finally {
      await connection.db.exec('DELETE FROM users WHERE id = ?', [owner])
      await connection.close()
    }
  },
)

it.skipIf(!process.env.MYSQL_TEST_URL)(
  'persists campaign advancement and prevents duplicate purchases and scenario starts in SQL',
  async () => {
    const connection = database(process.env.MYSQL_TEST_URL!),
      owner = randomUUID()
    try {
      await migrate(connection.db)
      await connection.db.exec(
        'INSERT INTO users (id, email, name, verified, created_at) VALUES (?, ?, ?, ?, ?)',
        [owner, `${owner}@example.test`, 'Campaign test', true, Date.now()],
      )
      const service = new LobbyService(connection.db)
      let lobby = await service.create(owner)
      const invite = await service.invite(lobby.id, owner)
      lobby = await service.join(lobby.id, 'friend', invite.token)
      for (const [user, key] of [
        [owner, 'joe'],
        ['friend', 'daniela'],
      ] as const)
        lobby = await service.select(lobby.id, user, lobby.revision, {
          investigator: starterInvestigator(key).id,
          cards: starterDeck(key),
        })
      lobby = await service.ready(lobby.id, owner, lobby.revision, true)
      lobby = await service.ready(lobby.id, 'friend', lobby.revision, true)
      await service.start(lobby.id, owner, lobby.revision)
      const [row] = await connection.db.rows<{ payload: string | Lobby }>(
        'SELECT payload FROM online_lobbies WHERE id = ?',
        [lobby.id],
      )
      const stored: Lobby =
        typeof row!.payload === 'string' ? JSON.parse(row!.payload) : row!.payload
      stored.game!.outcome = { type: 'resolution', resolution: 1 }
      stored.game!.pending = null
      stored.game!.campaignLog = structuredClone(stored.campaign!.log)
      stored.game!.campaignLog.investigators[starterInvestigator('joe').id]!.xp = 5
      await connection.db.exec('UPDATE online_lobbies SET payload = ? WHERE id = ?', [
        JSON.stringify(stored),
        lobby.id,
      ])
      const finish = {
        commandId: randomUUID(),
        revision: stored.revision,
        action: 'finish' as const,
      }
      const [first, second] = await Promise.all([
        service.progress(lobby.id, owner, finish),
        service.progress(lobby.id, owner, finish),
      ])
      expect(second).toEqual(first)
      const option = first.campaign!.own!.options.find((o) => o.replaces)!
      expect(option).toBeDefined()
      const buy = {
        commandId: randomUUID(),
        revision: first.revision,
        action: 'purchase' as const,
        card: option.code,
        upgrade: true,
      }
      const [bought, retried] = await Promise.all([
        service.progress(lobby.id, owner, buy),
        service.progress(lobby.id, owner, buy),
      ])
      expect(retried).toEqual(bought)
      expect(bought.campaign!.members[0]!.xp).toBe(5 - option.cost)
      let view = await service.progress(lobby.id, owner, {
        commandId: randomUUID(),
        revision: bought.revision,
        action: 'ready',
        ready: true,
      })
      view = await service.progress(lobby.id, 'friend', {
        commandId: randomUUID(),
        revision: view.revision,
        action: 'ready',
        ready: true,
      })
      const next = { commandId: randomUUID(), revision: view.revision, action: 'next' as const }
      const [a, b] = await Promise.all([
        service.progress(lobby.id, owner, next),
        service.progress(lobby.id, owner, next),
      ])
      expect(a).toEqual(b)
      expect(a.scenarioId).toBe('smoke-and-mirrors')
      expect(await new LobbyService(connection.db).game(lobby.id, owner)).toEqual(a)
    } finally {
      await connection.db.exec('DELETE FROM users WHERE id = ?', [owner])
      await connection.close()
    }
  },
)
