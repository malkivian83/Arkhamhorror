import { registerFieldCombat } from './combat'
import { registerFieldSupport } from './support'
import { registerFieldEvent } from './events'
import { registerTraitTool } from './trait-tools'
export function registerSpellFieldTool(code: string): void {
  if (
    registerFieldCombat(code) ||
    registerFieldSupport(code) ||
    registerFieldEvent(code) ||
    registerTraitTool(code)
  )
    return
  throw Error('Unreviewed field tool ' + code)
}
