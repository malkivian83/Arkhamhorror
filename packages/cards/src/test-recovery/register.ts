import { registerCharges } from './success-charges'
import { registerTools } from './test-tools'
import { registerEvents } from './events'
export function registerTestRecovery(code: string): void {
  if (registerCharges(code) || registerTools(code) || registerEvents(code)) return
  throw Error('Unreviewed test recovery: ' + code)
}
