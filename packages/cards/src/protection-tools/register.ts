import { registerAssets } from './assets'
import { registerEvents } from './events'
export function registerProtectionTool(code: string): void {
  if (registerAssets(code) || registerEvents(code)) return
  throw Error('Unreviewed protection tool: ' + code)
}
