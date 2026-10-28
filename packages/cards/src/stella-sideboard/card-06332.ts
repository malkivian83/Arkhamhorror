import {
  canPlayByEffect,
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  type Choice,
} from '@lcg/engine'
import { ask, cardName } from '../dunwich-pilot/effects'

// RR: after successful investigation (ST.6), Play, Discard Pile. No play action is taken.
registerPlayerCard({
  code: '06332',
  reactions: (s, t, self) => {
    if (
      t.type !== 'afterSkillTest' ||
      t.investigator !== self.owner ||
      !t.succeeded ||
      t.kind !== 'investigate' ||
      t.margin < 2 ||
      self.exhausted
    )
      return []
    const choices: Choice[] = [...new Set(getInvestigator(s, self.owner).discard)]
      .filter((c) => playerCardDef(c)?.traits.includes('Item'))
      .map((code) => ({
        label: 'choice.card',
        params: { card: cardName(code) },
        then: ask(
          self.owner,
          [
            {
              label: 'choice.takeCard',
              params: { card: cardName(code) },
              then: [{ type: 'DiscardToHand', investigator: self.owner, code }],
            },
            ...(canPlayByEffect(s, self.owner, code, 'discard')
              ? [
                  {
                    label: 'choice.playFromDiscard',
                    then: [
                      {
                        type: 'PlayCard' as const,
                        investigator: self.owner,
                        code,
                        from: 'discard' as const,
                        byEffect: true,
                      },
                    ],
                  },
                ]
              : []),
          ],
          true,
        ),
      }))
    return choices.length
      ? [
          {
            key: self.id + ':scavenge',
            investigator: self.owner,
            label: 'ability.scavenging2',
            then: [{ type: 'ExhaustAsset', asset: self.id }, ...ask(self.owner, choices, true)],
          },
        ]
      : []
  },
})
