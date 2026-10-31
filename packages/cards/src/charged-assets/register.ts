import { registerSupport } from './support'
import { registerCombat } from './combat'
import { registerDoom } from './doom'
import { registerParley } from './parley'
import { registerEvents } from './events'
export function registerChargedAsset(code: string): void {
  if (
    registerSupport(code) ||
    registerCombat(code) ||
    registerDoom(code) ||
    registerParley(code) ||
    registerEvents(code)
  )
    return
  throw new Error(`Unreviewed charged-assets card: ${code}`)
}
