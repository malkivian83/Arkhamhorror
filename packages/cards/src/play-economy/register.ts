import { registerDiscount } from './discounts'
export function registerPlayEconomy(code: string): void {
  if (!registerDiscount(code)) throw Error('Unreviewed economy card ' + code)
}
