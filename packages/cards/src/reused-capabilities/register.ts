import { registerReusedCapability as register } from './cards'
export function registerReusedCapability(code: string): void {
  if (!register(code)) throw new Error('Unreviewed lot 134 card ' + code)
}
