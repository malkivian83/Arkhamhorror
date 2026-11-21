import { movableDiscard } from '@lcg/engine'
import { customizedCard, getInvestigator, playerCardDef, registerPlayerCard } from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'
const candidates = (s: Parameters<typeof getInvestigator>[0], by: string) => {
  const discard = movableDiscard(s, by)
  return [...new Set(discard)].filter((c) => {
    const d = playerCardDef(c)
    return (
      !!d &&
      customizedCard(d, getInvestigator(s, by).customizations).xp === 0 &&
      !d.weakness &&
      !d.story &&
      !s.investigators.some((i) => playerCardDef(i.id)?.signatures?.includes(c))
    )
  })
}
// RR Level, Target: signature/story cards have no level; the resolving event is not a target.
registerPlayerCard({
  code: '06165',
  canPlay: (s, by) => candidates(s, by).length > 0,
  play: (s, by) =>
    ask(
      by,
      candidates(s, by).map((code) => ({
        label: 'choice.reactiveRecover',
        params: { card: playerCardDef(code)!.name },
        then: [{ type: 'DiscardToHand', investigator: by, code }],
      })),
    ),
})
