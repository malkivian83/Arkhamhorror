import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { stableJson } from './catalog.mjs'
import { sha256 } from './snapshots.mjs'

/** An immutable inventory bundle. No engine registration or live pointer is changed. */
export async function publishBundle(output, id, files, manifest, options = {}) {
  if (!/^[a-f0-9]{16}$/.test(id)) throw new Error('Invalid bundle identifier')
  const writer = options.writer ?? writeFile
  const destination = join(output, id)
  await mkdir(output, { recursive: true })
  let previous
  try {
    previous = JSON.parse(await readFile(join(destination, 'manifest.json'), 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  if (previous) {
    if (stableJson(previous.files) !== stableJson(manifest.files))
      throw new Error(`Non-deterministic bundle: ${id}`)
    for (const [name, hash] of Object.entries(manifest.files))
      if (sha256(await readFile(join(destination, name))) !== hash)
        throw new Error(`Corrupted existing bundle: ${name}`)
    return { destination, unchanged: true }
  }
  const staging = join(output, `.${id}.${process.pid}.${options.attempt ?? 0}.tmp`)
  await mkdir(staging)
  for (const [name, body] of Object.entries({ ...files, 'manifest.json': stableJson(manifest) })) {
    if (!/^[a-z]+\.(json|csv)$/.test(name)) throw new Error(`Invalid bundle filename: ${name}`)
    await writer(join(staging, name), body, { flag: 'wx' })
  }
  for (const [name, hash] of Object.entries(manifest.files))
    if (sha256(await readFile(join(staging, name))) !== hash)
      throw new Error(`Staging checksum mismatch: ${name}`)
  await rename(staging, destination)
  return { destination, unchanged: false }
}
