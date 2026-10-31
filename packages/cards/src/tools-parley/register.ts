import { registerCombat } from './combat'
import { registerSupport } from './support'
import { registerEvents } from './events'
export function registerToolsParley(code: string): void {
  if (registerCombat(code) || registerSupport(code) || registerEvents(code)) return
  throw new Error(`Unreviewed tools-parley card: ${code}`)
}
