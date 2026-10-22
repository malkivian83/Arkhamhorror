import { getInvestigator, playerCardDef, registerPlayerCard } from '@lcg/engine'
import { reaction } from '../core-2026/cards'
import { ask, fightOptions } from '../dunwich-pilot/effects'
import approvals from './approvals.json'

export function registerReactiveSupport(code: string): void {
  const entry = approvals.cards.find((c) => c.code === code)
  if (!entry) throw new Error('Unreviewed support: ' + code)
  const family = entry.family
  if (family === 'milan')
    registerPlayerCard({
      code,
      skillModifier: (_s, _a, t) => (t.skill === 'intellect' ? 1 : 0),
      reactions: (_s, t, a) =>
        t.type === 'afterSkillTest' &&
        t.investigator === a.owner &&
        t.kind === 'investigate' &&
        t.succeeded
          ? [
              reaction(a, 'ability.gainResource', [
                { type: 'GainResources', investigator: a.owner, amount: 1 },
              ]),
            ]
          : [],
    })
  else if (family === 'foot' || family === 'search-foot' || family === 'pickpocket')
    registerPlayerCard({
      code,
      reactions: (_s, t, a) =>
        !a.exhausted &&
        'investigator' in t &&
        t.investigator === a.owner &&
        (family === 'pickpocket'
          ? t.type === 'afterEvade'
          : t.type === 'afterSkillTest' && !t.succeeded && (family === 'foot' || t.margin < 0))
          ? [
              reaction(
                a,
                family === 'search-foot' ? 'ability.reactiveSearch' : 'ability.drawCards',
                [
                  { type: 'ExhaustAsset', asset: a.id },
                  ...(family === 'search-foot' && t.type === 'afterSkillTest'
                    ? [
                        {
                          type: 'SearchDeck' as const,
                          investigator: a.owner,
                          top: -t.margin,
                          traits: [],
                          anyCard: true,
                          drawFound: true,
                          to: 'hand' as const,
                        },
                      ]
                    : [{ type: 'DrawCards' as const, investigator: a.owner, amount: 1 }]),
                ],
                { n: 1 },
              ),
            ]
          : [],
    })
  else if (family === 'newspaper')
    registerPlayerCard({
      code,
      skillModifier: (s, a, t) =>
        t.kind.type === 'investigate' &&
        t.skill === 'intellect' &&
        getInvestigator(s, a.owner).clues === 0
          ? 2
          : 0,
    })
  else if (family === 'guard-damage') registerPlayerCard({ code, soaksForOthers: true })
  else if (family === 'guard-horror') registerPlayerCard({ code, soaksAtLocation: true })
  else if (family === 'shovel')
    registerPlayerCard({
      code,
      abilities: (s, a, i) => {
        const here = getInvestigator(s, i).location
        return [
          ...fightOptions(s, a, i, 2),
          ...(here !== null && (s.locations[here]?.clues ?? 0) > 0
            ? [
                {
                  key: a.id + ':clue',
                  label: 'ability.reactiveShovel',
                  params: { card: playerCardDef(code)!.name },
                  actions: 1,
                  provokes: true,
                  costs: [{ type: 'DiscardAsset' as const, asset: a.id }],
                  then: [
                    { type: 'DiscoverClues' as const, investigator: i, location: here, amount: 1 },
                  ],
                },
              ]
            : []),
        ]
      },
    })
  else if (family === 'sketches')
    registerPlayerCard({
      code,
      canPlay: (s, i) => {
        const here = getInvestigator(s, i).location
        return here !== null && (s.locations[here]?.clues ?? 0) > 0
      },
      play: (_s, investigator) => [{ type: 'DrawCards', investigator, amount: 3 }],
    })
  else if (family === 'resourceful')
    registerPlayerCard({
      code,
      afterCommittedTest: (_s, _t, success, by) =>
        success ? [{ type: 'PlayerCardEffect', code, investigator: by, step: 'recover' }] : [],
      effect: (s, by, step) =>
        step === 'recover'
          ? ask(
              by,
              [...new Set(getInvestigator(s, by).discard)]
                .filter((c) => {
                  const d = playerCardDef(c)
                  return (
                    !!d &&
                    (d.classes ?? [d.class]).includes('survivor') &&
                    d.name !== playerCardDef(code)!.name
                  )
                })
                .map((c) => ({
                  label: 'choice.reactiveRecover',
                  params: { card: playerCardDef(c)!.name },
                  then: [{ type: 'DiscardToHand', investigator: by, code: c }],
                })),
            )
          : [],
    })
  else throw new Error('Unsupported support family: ' + family)
}
