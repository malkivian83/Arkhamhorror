import { registerMultiPlay } from './multi-play'
import { registerFieldParley } from './events'
import { registerTestEconomy } from './test-economy'
export function registerEventEconomy(code: string): void {
  if (registerMultiPlay(code) || registerFieldParley(code) || registerTestEconomy(code)) return
  throw Error('Unreviewed event economy ' + code)
}
