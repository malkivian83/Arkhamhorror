import { registerRevealDraws } from './draws'
import { registerRevealReplacement } from './reveals'
import { registerAreaWeapon } from './weapons'
export function registerTokenReveal(code: string): void {
  if (registerRevealReplacement(code) || registerRevealDraws(code) || registerAreaWeapon(code))
    return
  throw Error('Unreviewed token reveal card ' + code)
}
