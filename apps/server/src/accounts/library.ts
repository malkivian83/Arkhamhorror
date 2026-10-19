import type { FastifyInstance } from 'fastify'
import type { CloudDocument, CloudMetadata, DocumentWrite } from '@lcg/shared'
import { playerCardDef } from '@lcg/engine'
import { decodeSession } from '@lcg/saves'
import type { Database } from './database'
import type { authentication } from './auth'
import { ApiError, digest, requireValue } from './security'

interface Row {
  id: string
  kind: CloudMetadata['kind']
  name: string
  revision: number
  updated_at: number
  archived: number
  deleted: number
  payload?: unknown
}
const uuid = {
  type: 'string',
  pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
}
const meta = (r: Row): CloudMetadata => ({
  id: r.id,
  kind: r.kind,
  name: r.name,
  revision: r.revision,
  updatedAt: Number(r.updated_at),
  archived: !!r.archived,
  deleted: !!r.deleted,
})
const parsed = (value: unknown) => (typeof value === 'string' ? JSON.parse(value) : value)
const columns = 'id, kind, name, revision, updated_at, archived, deleted'

export function validatePayload(kind: string, payload: unknown) {
  requireValue(payload !== null && typeof payload === 'object', 'invalid')
  if (kind === 'campaign') {
    try {
      const decoded = decodeSession(JSON.stringify(payload), false)
      requireValue(decoded.campaign || decoded.state)
    } catch {
      throw new ApiError('invalid_save')
    }
  } else if (kind === 'deck') {
    const deck = payload as Record<string, unknown>
    requireValue(
      typeof deck.id === 'string' &&
        deck.id.length <= 160 &&
        typeof deck.name === 'string' &&
        deck.name.trim().length > 0 &&
        deck.name.length <= 160,
    )
    requireValue(
      typeof deck.investigator === 'string' &&
        playerCardDef(deck.investigator)?.type === 'investigator',
    )
    requireValue(
      Array.isArray(deck.cards) &&
        deck.cards.length <= 1000 &&
        deck.cards.every((c) => typeof c === 'string' && playerCardDef(c)),
    )
  } else
    requireValue(
      kind === 'rewards' &&
        Array.isArray(payload) &&
        payload.length <= 1000 &&
        payload.every((c) => typeof c === 'string' && playerCardDef(c)),
    )
}

export function library(
  app: FastifyInstance,
  db: Database,
  auth: ReturnType<typeof authentication>,
) {
  app.get('/api/library', async (req) => {
    const user = await auth.requireUser(req)
    return {
      documents: (
        await db.rows<Row>(
          `SELECT ${columns} FROM documents WHERE owner_id = ? ORDER BY updated_at DESC`,
          [user.id],
        )
      ).map(meta),
    }
  })
  app.get<{ Params: { id: string } }>(
    '/api/library/:id',
    { schema: { params: { type: 'object', required: ['id'], properties: { id: uuid } } } },
    async (req) => {
      const user = await auth.requireUser(req)
      const [row] = await db.rows<Row>(
        `SELECT ${columns}, payload FROM documents WHERE owner_id = ? AND id = ? AND deleted = FALSE`,
        [user.id, req.params.id],
      )
      requireValue(row, 'not_found', 404)
      return { ...meta(row), payload: parsed(row.payload) } satisfies CloudDocument
    },
  )
  app.put<{ Params: { id: string }; Body: DocumentWrite }>(
    '/api/library/:id',
    {
      bodyLimit: 20_000_000,
      schema: {
        params: { type: 'object', required: ['id'], properties: { id: uuid } },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['kind', 'name', 'revision', 'operationId', 'payload', 'archived', 'deleted'],
          properties: {
            kind: { type: 'string', enum: ['deck', 'campaign', 'rewards'] },
            name: { type: 'string', minLength: 1, maxLength: 160 },
            revision: { type: 'integer', minimum: 0, maximum: 2147483646 },
            operationId: uuid,
            payload: {},
            archived: { type: 'boolean' },
            deleted: { type: 'boolean' },
          },
        },
      },
    },
    async (req) => {
      const user = await auth.requireUser(req),
        input = req.body,
        id = req.params.id
      requireValue(input.name.trim())
      validatePayload(input.kind, input.payload)
      const serialized = JSON.stringify(input.deleted ? {} : input.payload)
      requireValue(Buffer.byteLength(serialized) <= 19_000_000, 'too_large', 413)
      const requestHash = digest(JSON.stringify(input))
      return db.transaction(async (tx) => {
        // Serializes quota checks and creates per user, including two simultaneous first writes.
        await tx.rows('SELECT id FROM users WHERE id = ? FOR UPDATE', [user.id])
        const [prior] = await tx.rows<{ revision: number; request_hash: string }>(
          'SELECT revision, request_hash FROM document_operations WHERE owner_id = ? AND document_id = ? AND operation_id = ?',
          [user.id, id, input.operationId],
        )
        if (prior) {
          requireValue(prior.request_hash === requestHash, 'operation_reused', 409)
          return { revision: prior.revision }
        }
        const [old] = await tx.rows<Row>(
          `SELECT ${columns} FROM documents WHERE owner_id = ? AND id = ? FOR UPDATE`,
          [user.id, id],
        )
        requireValue((old?.revision ?? 0) === input.revision, 'conflict', 409)
        requireValue(!old || old.kind === input.kind, 'invalid')
        const [usage] = await tx.rows<{ count: number }>(
          'SELECT COUNT(*) AS count FROM documents WHERE owner_id = ? AND deleted = FALSE',
          [user.id],
        )
        requireValue(!!old || Number(usage?.count ?? 0) < 500, 'quota', 413)
        const revision = input.revision + 1,
          now = Date.now()
        if (old)
          await tx.exec(
            'UPDATE documents SET name = ?, payload = ?, revision = ?, operation_id = ?, archived = ?, deleted = ?, updated_at = ? WHERE owner_id = ? AND id = ? AND revision = ?',
            [
              input.name.trim(),
              serialized,
              revision,
              input.operationId,
              input.archived,
              input.deleted,
              now,
              user.id,
              id,
              input.revision,
            ],
          )
        else
          await tx.exec(
            'INSERT INTO documents (id, owner_id, kind, name, payload, revision, operation_id, archived, deleted, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              id,
              user.id,
              input.kind,
              input.name.trim(),
              serialized,
              revision,
              input.operationId,
              input.archived,
              input.deleted,
              now,
            ],
          )
        await tx.exec(
          'INSERT INTO document_operations (owner_id, document_id, operation_id, revision, request_hash) VALUES (?, ?, ?, ?, ?)',
          [user.id, id, input.operationId, revision, requestHash],
        )
        if (input.deleted) {
          await tx.exec('DELETE FROM document_revisions WHERE owner_id = ? AND document_id = ?', [
            user.id,
            id,
          ])
        } else if (input.kind === 'campaign') {
          await tx.exec(
            'INSERT INTO document_revisions (owner_id, document_id, revision, payload, created_at) VALUES (?, ?, ?, ?, ?)',
            [user.id, id, revision, serialized, now],
          )
          await tx.exec(
            'DELETE FROM document_revisions WHERE owner_id = ? AND document_id = ? AND revision < ?',
            [user.id, id, Math.max(1, revision - 4)],
          )
        }
        const [documentBytes] = await tx.rows<{ bytes: number }>(
          'SELECT COALESCE(SUM(JSON_STORAGE_SIZE(payload)), 0) AS bytes FROM documents WHERE owner_id = ?',
          [user.id],
        )
        const [revisionBytes] = await tx.rows<{ bytes: number }>(
          'SELECT COALESCE(SUM(JSON_STORAGE_SIZE(payload)), 0) AS bytes FROM document_revisions WHERE owner_id = ?',
          [user.id],
        )
        requireValue(
          Number(documentBytes?.bytes ?? 0) + Number(revisionBytes?.bytes ?? 0) <= 150_000_000,
          'quota',
          413,
        )
        return { revision, updatedAt: now }
      })
    },
  )
  app.get<{ Params: { id: string } }>('/api/library/:id/revisions', async (req) => {
    const user = await auth.requireUser(req)
    const [document] = await db.rows(
      'SELECT id FROM documents WHERE owner_id = ? AND id = ? AND deleted = FALSE',
      [user.id, req.params.id],
    )
    requireValue(document, 'not_found', 404)
    return {
      revisions: await db.rows<{ revision: number; created_at: number }>(
        'SELECT revision, created_at FROM document_revisions WHERE owner_id = ? AND document_id = ? ORDER BY revision DESC',
        [user.id, req.params.id],
      ),
    }
  })
  app.get<{ Params: { id: string; revision: string } }>(
    '/api/library/:id/revisions/:revision',
    async (req) => {
      const user = await auth.requireUser(req)
      const [row] = await db.rows<{ payload: unknown }>(
        'SELECT r.payload FROM document_revisions r JOIN documents d ON d.owner_id = r.owner_id AND d.id = r.document_id WHERE r.owner_id = ? AND r.document_id = ? AND r.revision = ? AND d.deleted = FALSE',
        [user.id, req.params.id, Number(req.params.revision)],
      )
      requireValue(row, 'not_found', 404)
      return { payload: parsed(row.payload) }
    },
  )
  app.get('/api/me/export', async (req) => {
    const user = await auth.requireUser(req)
    return {
      format: 'lcg-account-export',
      version: 1,
      user: { email: user.email, name: user.name },
      documents: (
        await db.rows<Row>(`SELECT ${columns}, payload FROM documents WHERE owner_id = ?`, [
          user.id,
        ])
      ).map((row) => ({ ...meta(row), payload: parsed(row.payload) })),
    }
  })
}
