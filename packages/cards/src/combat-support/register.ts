import { registerSupportCombat } from './combat'
import { registerSupportTool } from './support'
export function registerCombatSupport(code: string): void {
  if (registerSupportCombat(code) || registerSupportTool(code)) return
  throw Error('Unreviewed combat support ' + code)
}
