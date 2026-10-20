import { afterEach, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchSnapshot, readSnapshot, sha256, SOURCES } from './snapshots.mjs'
import { publishBundle } from './bundle.mjs'

const temporary = []
async function directory() {
  const parent = fileURLToPath(new URL('../../.card-import-tmp/', import.meta.url))
  await mkdir(parent, { recursive: true })
  const path = await mkdtemp(join(parent, 'arkham-import-test-'))
  temporary.push(path)
  return path
}
afterEach(async () => {
  // Every target comes directly from mkdtemp with the task-specific prefix.
  for (const path of temporary.splice(0)) await rm(path, { recursive: true, force: true })
})
const jsonResponse = (body = '[{"code":"01001"}]', headers = {}) =>
  new Response(body, { headers: { 'content-type': 'application/json', ...headers } })
const now = () => Date.parse('2026-10-20T10:00:00Z')

describe('external snapshot cache', () => {
  it('reuses fresh HTTP cache without a second request', async () => {
    const dir = await directory()
    const snapshot = await fetchSnapshot('en', dir, {
      now,
      fetcher: async () => jsonResponse(undefined, { 'cache-control': 'max-age=3600' }),
    })
    const second = await fetchSnapshot('en', dir, {
      now,
      fetcher: () => {
        throw new Error('Must not fetch')
      },
    })
    expect(second.meta.sha256).toBe(snapshot.meta.sha256)
    expect((await readSnapshot(dir, 'en')).data).toEqual(snapshot.data)
  })

  it('validates an expired cache with both validators and reuses a 304 body', async () => {
    const dir = await directory()
    await fetchSnapshot('en', dir, {
      now,
      fetcher: async () =>
        jsonResponse(undefined, {
          etag: 'test-etag',
          'last-modified': 'Mon, 19 Oct 2026 00:00:00 GMT',
        }),
    })
    const result = await fetchSnapshot('en', dir, {
      now,
      fetcher: async (_url, { headers }) => {
        expect(headers).toMatchObject({
          'If-None-Match': 'test-etag',
          'If-Modified-Since': 'Mon, 19 Oct 2026 00:00:00 GMT',
        })
        return new Response(null, { status: 304 })
      },
    })
    expect(result.data).toEqual([{ code: '01001' }])
  })

  it('does not replace a valid snapshot with an empty, invalid or non-JSON response', async () => {
    const dir = await directory()
    await fetchSnapshot('en', dir, { now, fetcher: async () => jsonResponse() })
    const pointer = await readFile(join(dir, 'en.meta.json'), 'utf8')
    for (const response of [
      jsonResponse('[]'),
      jsonResponse('{'),
      new Response('<html>error</html>'),
    ])
      await expect(
        fetchSnapshot('en', dir, { now, fetcher: async () => response }),
      ).rejects.toThrow()
    expect(await readFile(join(dir, 'en.meta.json'), 'utf8')).toBe(pointer)
  })

  it('honors Retry-After and fails after bounded retries', async () => {
    const waits = [],
      dir = await directory()
    let calls = 0
    await expect(
      fetchSnapshot('en', dir, {
        now,
        sleep: async (ms) => waits.push(ms),
        fetcher: async () => {
          calls++
          return new Response(null, { status: 429, headers: { 'retry-after': '2' } })
        },
      }),
    ).rejects.toThrow('HTTP 429')
    expect(calls).toBe(3)
    expect(waits).toEqual([2000, 2000])
  })

  it('rejects an offline snapshot whose body was changed after download', async () => {
    const dir = await directory()
    await writeFile(join(dir, 'en.json'), '[1]')
    await writeFile(
      join(dir, 'en.meta.json'),
      JSON.stringify({
        url: SOURCES.en,
        status: 200,
        retrievedAt: new Date(now()).toISOString(),
        sha256: sha256('[2]'),
      }),
    )
    await expect(readSnapshot(dir, 'en')).rejects.toThrow('checksum mismatch')
  })
})

describe('inventory promotion', () => {
  const id = '0123456789abcdef'
  const files = { 'catalog.json': '{"cards":[]}\n', 'report.json': '{}\n' }
  const manifest = {
    files: Object.fromEntries(Object.entries(files).map(([name, body]) => [name, sha256(body)])),
  }

  it('does not leave a published partial bundle when a write fails', async () => {
    const dir = await directory()
    let writes = 0
    await expect(
      publishBundle(dir, id, files, manifest, {
        writer: async (...args) => {
          if (++writes === 2) throw new Error('Disk full')
          return writeFile(...args)
        },
      }),
    ).rejects.toThrow('Disk full')
    await expect(readFile(join(dir, id, 'catalog.json'))).rejects.toMatchObject({ code: 'ENOENT' })
    expect((await publishBundle(dir, id, files, manifest, { attempt: 1 })).unchanged).toBe(false)
  })

  it('repeats without mutations and detects corruption in a previously imported bundle', async () => {
    const dir = await directory()
    await publishBundle(dir, id, files, manifest)
    expect((await publishBundle(dir, id, files, manifest)).unchanged).toBe(true)
    await writeFile(join(dir, id, 'catalog.json'), 'corrupted')
    await expect(publishBundle(dir, id, files, manifest)).rejects.toThrow(
      'Corrupted existing bundle',
    )
  })
})
