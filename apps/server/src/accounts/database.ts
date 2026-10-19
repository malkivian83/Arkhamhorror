import {
  createPool,
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from 'mysql2/promise'
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'

export class Database {
  constructor(readonly connection: Pool | PoolConnection) {}
  async rows<T>(sql: string, values: (string | number | boolean | null)[] = []): Promise<T[]> {
    const [rows] = await this.connection.execute<RowDataPacket[]>(sql, values)
    return rows as T[]
  }
  async exec(sql: string, values: (string | number | boolean | null)[] = []) {
    const [result] = await this.connection.execute<ResultSetHeader>(sql, values)
    return result
  }
  async transaction<T>(run: (db: Database) => Promise<T>): Promise<T> {
    if (!('getConnection' in this.connection)) throw new Error('Nested transaction')
    const connection = await this.connection.getConnection()
    try {
      await connection.beginTransaction()
      const value = await run(new Database(connection))
      await connection.commit()
      return value
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }
}

export function database(url: string) {
  const pool = createPool({
    uri: url,
    connectionLimit: 8,
    timezone: 'Z',
    charset: 'utf8mb4',
    enableKeepAlive: true,
  })
  return { db: new Database(pool), close: () => pool.end() }
}

/** Explicit deployment command. DDL is resumable; runtime credentials need no DDL privileges. */
export async function migrate(db: Database) {
  const pool = db.connection as Pool
  const connection = await pool.getConnection()
  try {
    const [[lock]] = await connection.query<RowDataPacket[]>(
      "SELECT GET_LOCK('lcg_schema_migration', 30) AS acquired",
    )
    if (lock?.acquired !== 1) throw new Error('Migration already running')
    await connection.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (version INT PRIMARY KEY, checksum CHAR(64) NOT NULL) ENGINE=InnoDB',
    )
    const directory = new URL('../../migrations/', import.meta.url)
    const files = (await readdir(directory))
      .filter((file) => /^\d{3}_[a-z_]+\.sql$/.test(file))
      .sort()
    for (const file of files) {
      const version = Number(file.slice(0, 3))
      const source = (await readFile(new URL(file, directory), 'utf8')).replace(/\r\n/g, '\n')
      const checksum = createHash('sha256').update(source).digest('hex')
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT checksum FROM schema_migrations WHERE version = ?',
        [version],
      )
      if (rows.length) {
        if (rows[0]?.checksum !== checksum)
          throw new Error(`Applied migration ${version} was changed`)
        continue
      }
      for (const statement of source
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean))
        await connection.query(statement)
      await connection.execute('INSERT INTO schema_migrations (version, checksum) VALUES (?, ?)', [
        version,
        checksum,
      ])
    }
  } finally {
    await connection.query("SELECT RELEASE_LOCK('lcg_schema_migration')")
    connection.release()
  }
}
