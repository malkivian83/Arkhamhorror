import { registerPlayerCard } from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'
// RR Revelation, Max, As If; FAQ 2.25: weakness revelations precede Dilemmas.
registerPlayerCard({
  code: '09109',
  dilemma: true,
  canPlay: () => false,
  revelation: (s, by) =>
    ask(
      by,
      s.investigators
        .filter((i) => !i.eliminated)
        .flatMap((i) => [
          {
            label: 'choice.crossroadsAction',
            params: { name: i.name },
            then: [
              {
                type: 'AfterCurrentSkillTest' as const,
                then: [
                  { type: 'TakeImmediateAction' as const, investigator: i.id },
                  { type: 'DiscardRandomFromHand' as const, investigator: i.id, amount: 1 },
                ],
              },
            ],
          },
          {
            label: 'choice.crossroadsCards',
            params: { name: i.name },
            then: [
              { type: 'LoseNextTurnActions' as const, investigator: i.id, amount: 1 },
              { type: 'DrawCards' as const, investigator: i.id, amount: 3 },
            ],
          },
        ]),
    ),
})
