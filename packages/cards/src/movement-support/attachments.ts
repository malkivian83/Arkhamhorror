// RR: Attach To, Connections, Move, Group Limit, Fast Abilities, Myriad.
import {
  getLocation,
  type AbilityOption,
  type GameState,
  type LocationAttachment,
} from '@lcg/engine'
import { here, neighbors, registerPlayerCard } from './common'
const codeLimit = (s: GameState) =>
  Object.values(s.locationAttachments ?? {}).filter((a) => a.code === '06029').length
export function registerMovementAttachment(code: string): boolean {
  if (code !== '03232' && code !== '06029') return false
  const abilities = (s: GameState, a: LocationAttachment, by: string): AbilityOption[] =>
    a.exhausted || here(s, by) !== a.location
      ? []
      : neighbors(s, by).map((to) => ({
          key: a.id + ':shortcut:' + by + ':' + to,
          label: 'choice.movementShortcut',
          params: { location: getLocation(s, to).name },
          target: { type: 'location', id: to },
          actions: 0,
          actionKind: 'move',
          provokes: false,
          then: [
            { type: 'ExhaustLocationAttachment', attachment: a.id },
            { type: 'MoveTo', investigator: by, location: to },
          ],
        }))
  registerPlayerCard({
    code,
    canPlay: (s, by) =>
      s.activeTurn === by && !!here(s, by) && (code !== '06029' || codeLimit(s) < 3),
    play: (s, by) =>
      here(s, by) && (code !== '06029' || codeLimit(s) < 3)
        ? [{ type: 'AttachEventToLocation', investigator: by, code, location: here(s, by)! }]
        : [],
    ...(code === '03232'
      ? { locationAttachmentAbilities: abilities }
      : {
          movementConnections: (s: GameState, a: LocationAttachment) =>
            Object.values(s.locationAttachments ?? {})
              .filter((b) => b.code === code && b.location !== a.location)
              .map((b) => b.location),
        }),
  })
  return true
}
