import { registerPlayerCard } from '@lcg/engine'
import { firearmsHere, placeOn } from './register'
// Extra Ammunition (1): place 3 ammo on a Firearm controlled by an investigator at your location.
export function registerExtraAmmunition(code: string): void {
  registerPlayerCard({
    code,
    canPlay: (s, by) => firearmsHere(s, by).length > 0,
    play: (s, by) => placeOn(by, firearmsHere(s, by), () => 3),
  })
}
