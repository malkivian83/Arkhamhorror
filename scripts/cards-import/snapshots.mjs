import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export const SOURCES = {
  en: 'https://arkhamdb.com/api/public/cards/',
  es: 'https://es.arkhamdb.com/api/public/cards/',
  packs: 'https://arkhamdb.com/api/public/packs/',
}

export const sha256 = (value) => createHash('sha256').update(value).digest('hex')

export function parseSnapshot(body, label) {
  const data = JSON.parse(body)
  if (!Array.isArray(data) || data.length === 0)
    throw new Error(`Empty or invalid snapshot: ${label}`)
  return data
}

function validateMetadata(body, meta, url) {
  if (meta.url !== url || meta.sha256 !== sha256(body) || meta.status !== 200)
    throw new Error(`Snapshot provenance or checksum mismatch: ${url}`)
  if (!Number.isFinite(Date.parse(meta.retrievedAt)))
    throw new Error(`Missing snapshot retrieval time: ${url}`)
}

export async function readSnapshot(directory, name) {
  const meta = JSON.parse(await readFile(join(directory, `${name}.meta.json`), 'utf8'))
  if (!/^[a-f0-9]{64}$/.test(meta.sha256)) throw new Error(`Invalid checksum: ${name}`)
  let body
  try {
    body = await readFile(join(directory, `${name}.json`), 'utf8')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    body = await readFile(join(directory, `${meta.sha256}.json`), 'utf8')
  }
  validateMetadata(body, meta, SOURCES[name])
  return { data: parseSnapshot(body, name), meta }
}

/** Cache files are immutable; only the small pointer is replaced after validation. */
export async function fetchSnapshot(name, directory, options = {}) {
  const {
    fetcher = fetch,
    now = () => Date.now(),
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = options
  const url = SOURCES[name]
  if (!url) throw new Error(`Unknown source: ${name}`)
  await mkdir(directory, { recursive: true })
  const pointerPath = join(directory, `${name}.meta.json`)
  let cached
  try {
    const meta = JSON.parse(await readFile(pointerPath, 'utf8'))
    const body = await readFile(join(directory, `${meta.sha256}.json`), 'utf8')
    validateMetadata(body, meta, url)
    cached = { data: parseSnapshot(body, name), meta }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const maxAge = /(?:^|,)\s*max-age=(\d+)/i.exec(cached?.meta.headers?.['cache-control'] ?? '')
  if (cached && maxAge && now() < Date.parse(cached.meta.retrievedAt) + Number(maxAge[1]) * 1000)
    return cached

  const headers = {}
  if (cached?.meta.headers?.etag) headers['If-None-Match'] = cached.meta.headers.etag
  if (cached?.meta.headers?.['last-modified'])
    headers['If-Modified-Since'] = cached.meta.headers['last-modified']
  for (let attempt = 0; attempt < 3; attempt++) {
    let response
    try {
      response = await fetcher(url, { headers, signal: AbortSignal.timeout(20_000) })
    } catch (error) {
      if (attempt === 2) throw error
      await sleep(500 * 2 ** attempt)
      continue
    }
    if (response.status === 304) {
      if (!cached) throw new Error(`304 without cached body: ${url}`)
      const meta = { ...cached.meta, retrievedAt: new Date(now()).toISOString() }
      for (const key of ['etag', 'last-modified', 'cache-control']) {
        const value = response.headers.get(key)
        if (value !== null) meta.headers[key] = value
      }
      await replacePointer(pointerPath, meta)
      return { data: cached.data, meta }
    }
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      const retry = response.headers.get('retry-after')
      const seconds = retry === null ? NaN : Number(retry)
      const retryMs = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retry) - now()
      // Do not retry earlier than Retry-After, or block an interactive run indefinitely.
      if (retryMs > 60_000) throw new Error(`Retry later (${retry}): ${url}`)
      await response.body?.cancel()
      await sleep(Math.max(500 * 2 ** attempt, Number.isFinite(retryMs) ? retryMs : 0))
      continue
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`)
    if (!response.headers.get('content-type')?.includes('application/json'))
      throw new Error(`Expected JSON: ${url}`)
    const body = await response.text()
    const data = parseSnapshot(body, name)
    const meta = {
      url,
      status: 200,
      retrievedAt: new Date(now()).toISOString(),
      sha256: sha256(body),
      headers: Object.fromEntries(
        ['etag', 'last-modified', 'cache-control'].map((key) => [key, response.headers.get(key)]),
      ),
    }
    await writeFile(join(directory, `${meta.sha256}.json`), body, { flag: 'wx' }).catch((error) => {
      if (error.code !== 'EEXIST') throw error
    })
    await replacePointer(pointerPath, meta)
    return { data, meta }
  }
  throw new Error(`Download failed: ${url}`)
}

async function replacePointer(path, meta) {
  const temporary = `${path}.${process.pid}.tmp`
  await writeFile(temporary, JSON.stringify(meta, null, 2) + '\n', { flag: 'wx' })
  await rename(temporary, path)
}
