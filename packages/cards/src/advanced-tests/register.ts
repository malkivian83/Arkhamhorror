import { registerAdvancedAsset } from './assets'
import { registerAdvancedEvent } from './events'
import { registerAdvancedToken } from './tokens'
export function registerAdvancedTest(code: string): void {
  if (registerAdvancedAsset(code) || registerAdvancedEvent(code) || registerAdvancedToken(code))
    return
  throw Error('Unreviewed advanced test ' + code)
}
