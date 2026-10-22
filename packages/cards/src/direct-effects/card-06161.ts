import { playerCardDef, registerPlayerCard, type GameState } from '@lcg/engine'
import { placeOn } from './register'
// Swift Reload (2): fast, during your turn. Refill a Firearm you control that has fewer
// ammo than its uses (X) value up to X.
const reloadable = (s: GameState, by: string) =>
  Object.values(s.assets).filter((a) => {
    const def = playerCardDef(a.code)
    return (
      a.owner === by &&
      def?.traits.includes('Firearm') &&
      def.uses !== undefined &&
      a.uses < def.uses.count
    )
  })
registerPlayerCard({
  code: '06161',
  canPlay: (s, by) => s.activeTurn === by && reloadable(s, by).length > 0,
  play: (s, by) =>
    placeOn(by, reloadable(s, by), (a) => playerCardDef(a.code)!.uses!.count - a.uses),
})
