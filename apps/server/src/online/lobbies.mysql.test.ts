import { randomUUID } from 'node:crypto'
import { expect, it } from 'vitest'
import { database, migrate } from '../accounts/database'
import { LobbyService } from './lobbies'

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
