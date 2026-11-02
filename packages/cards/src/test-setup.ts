// Test files share one module graph (isolate: false). Load every card first, then restore
// the registries after each file so cards registered by a test do not leak into the next.
import { snapshotRegistries } from '@lcg/engine/testing'
import { afterAll } from 'vitest'
import './index'

const restore = snapshotRegistries()
afterAll(restore)
