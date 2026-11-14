import { registerCats } from './cats'
import { registerChaosAssets } from './assets'
import { registerChaosEvents } from './events'
export function registerChaosAlly(code: string): void {
  if (registerCats(code) || registerChaosAssets(code) || registerChaosEvents(code)) return
  throw Error('Unreviewed chaos ally card ' + code)
}
