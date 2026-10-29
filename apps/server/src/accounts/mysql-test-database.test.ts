import { randomUUID } from 'node:crypto'
import { expect, it } from 'vitest'
import { migrate } from './database'
import { isolatedMysqlDatabase } from './mysql-test-database'
import { LobbyService } from '../online/lobbies'

it('rejects a non-test database before connecting or creating a schema', async () => {
  await expect(isolatedMysqlDatabase('mysql://invalid@127.0.0.1/production')).rejects.toThrow(
    'ending in _test',
  )
})

it.skipIf(!process.env.MYSQL_TEST_URL)(
  'account cleanup in one suite cannot delete another suite lobby through user cascades',
  async () => {
    const accounts = await isolatedMysqlDatabase(process.env.MYSQL_TEST_URL!)
    try {
      const online = await isolatedMysqlDatabase(process.env.MYSQL_TEST_URL!)
      try {
        await Promise.all([migrate(accounts.db), migrate(online.db)])
        const owner = randomUUID()
        for (const fixture of [accounts, online])
          await fixture.db.exec(
            'INSERT INTO users (id, email, name, verified, created_at) VALUES (?, ?, ?, ?, ?)',
            [owner, `${owner}@example.test`, 'Isolated owner', true, Date.now()],
          )
        const service = new LobbyService(online.db)
        const lobby = await service.create(owner)
        await accounts.db.exec('DELETE FROM users')
        expect(await accounts.db.rows('SELECT id FROM users')).toEqual([])
        expect((await service.get(lobby.id, owner)).id).toBe(lobby.id)
        expect(await online.db.rows('SELECT id FROM users WHERE id = ?', [owner])).toHaveLength(1)
      } finally {
        await online.close()
      }
    } finally {
      await accounts.close()
    }
  },
  30000,
)
