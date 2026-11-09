// RR: Fast, Round Sequence (Investigation Phase), Defeat, Trauma, Max X per game.
import { getInvestigator, registerPlayerCard } from '@lcg/engine'
import { cardName, continuation } from '../dunwich-pilot/effects'
import { ULTIMATE_SACRIFICE } from './codes'

// Ultimate Sacrifice: Fast. Play when the investigation phase ends. Repeat the investigation
// phase. At the end of that phase, you are defeated and suffer 1 physical trauma. Max once per
// game (both copies share the limit for the scenario being played).
registerPlayerCard({
  code: ULTIMATE_SACRIFICE,
  handReactions: (_s, t, by) =>
    t.type === 'investigationPhaseEnds'
      ? [
          {
            key: 'hand:' + ULTIMATE_SACRIFICE,
            investigator: by,
            label: 'ability.playCard',
            params: { card: cardName(ULTIMATE_SACRIFICE) },
            target: { type: 'hand' as const, code: ULTIMATE_SACRIFICE },
            limit: { per: 'game' as const },
            then: [
              {
                type: 'PlayCard' as const,
                investigator: by,
                code: ULTIMATE_SACRIFICE,
                effect: [
                  { type: 'InvestigationPhase' as const },
                  continuation(ULTIMATE_SACRIFICE, by, 'sacrifice'),
                ],
              },
            ],
          },
        ]
      : [],
  effect: (s, by, step) =>
    step === 'sacrifice' && !getInvestigator(s, by).eliminated
      ? [
          { type: 'SufferTrauma', investigator: by, physical: 1 },
          { type: 'DefeatInvestigator', investigator: by },
        ]
      : [],
})
