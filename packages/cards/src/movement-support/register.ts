import { registerMovementEvent } from './events'
import { registerMovementAsset } from './assets'
import { registerMovementAttachment } from './attachments'
export function registerMovementSupport(code: string): void {
  if (
    registerMovementEvent(code) ||
    registerMovementAsset(code) ||
    registerMovementAttachment(code)
  )
    return
  throw Error('Unreviewed movement support ' + code)
}
