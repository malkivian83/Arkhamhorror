import {
  activeInvestigators,
  getInvestigator,
  registerLocation,
  shroudOf,
  type ReactionOption,
  type ScenarioBehavior,
} from '@lcg/engine'
import { C, ask, damage, on, specific } from './helpers'
import { L } from './locations'

registerLocation({
  code: L.omega,
  forced: (s, t, self) =>
    self.revealed &&
    t.type === 'turnBegins' &&
    getInvestigator(s, t.investigator).location === self.id
      ? [specific('plaguebearer.omega', { investigator: t.investigator })]
      : [],
})
on('plaguebearer.omega', (s, d) =>
  ask(
    s,
    String(d.investigator),
    [
      { label: 'choice.plaguebearer.damage', then: [damage(String(d.investigator))] },
      { label: 'choice.plaguebearer.terror', then: [specific('plaguebearer.discardTerror', d)] },
    ],
    'prompt.plaguebearer.omega',
  ),
)
registerLocation({
  code: L.alpha,
  abilities: (s, self, by) => [
    {
      key: `${L.alpha}:fire`,
      label: 'ability.plaguebearer.fire',
      actions: 2,
      provokes: true,
      actionKind: 'investigate',
      limit: { per: 'game', group: true },
      then: [
        {
          type: 'BeginSkillTest',
          investigator: by,
          skill: 'combat',
          difficulty: shroudOf(s, self.id),
          tags: ['investigate'],
          kind: {
            type: 'investigate',
            location: self.id,
            onSuccess: [
              {
                type: 'SearchDeck',
                investigator: by,
                top: 9,
                traits: [],
                cardType: 'event',
                anyCard: true,
                anyType: true,
                to: 'hand',
                drawFound: true,
                optional: true,
              },
              { type: 'RecordNote', note: 'plaguebearerFire', value: by },
            ],
          },
        },
      ],
    },
  ],
})
registerLocation({
  code: L.stairs,
  abilities: (s, self, by) =>
    self.clues === 0
      ? [
          {
            key: `${L.stairs}:resign`,
            label: 'ability.plaguebearer.resign',
            actions: 2,
            provokes: false,
            costs: [{ type: 'SpendClues', investigator: by, amount: getInvestigator(s, by).clues }],
            then: [{ type: 'Resign', investigator: by }],
          },
        ]
      : [],
})
registerLocation({
  code: L.hallway,
  abilities: (s, _self, by) => [
    ...(getInvestigator(s, by).clues > 0 && (s.locations[L.tunnel]?.resources ?? 0) > 0
      ? [
          {
            key: `${L.hallway}:remove`,
            label: 'ability.plaguebearer.hallway',
            actions: 1,
            provokes: true,
            costs: [{ type: 'SpendClues' as const, investigator: by, amount: 1 }],
            then: [specific('plaguebearer.barricade', { location: L.tunnel, amount: 3 })],
          },
        ]
      : []),
    ...(!Object.values(s.assets).some((a) => a.code === C.briefcase) &&
    !s.scenarioMeta?.plaguebearerBriefcaseTaken
      ? [
          {
            key: `${L.hallway}:briefcase`,
            label: 'ability.plaguebearer.briefcase',
            actions: 2,
            provokes: true,
            then: [
              { type: 'SetScenarioMeta' as const, key: 'plaguebearerBriefcaseTaken', value: 1 },
              { type: 'PutAssetIntoPlay' as const, investigator: by, code: C.briefcase },
            ],
          },
        ]
      : []),
  ],
})

export const locationReactions: NonNullable<ScenarioBehavior['reactions']> = (s, t) => {
  const out: ReactionOption[] = []
  if (
    t.type === 'afterSkillTestInitiated' &&
    s.skillTest?.kind.type === 'investigate' &&
    s.skillTest.kind.location === L.delta
  )
    out.push({
      key: 'plaguebearer:delta',
      investigator: t.investigator,
      label: 'ability.plaguebearer.delta',
      then: [specific('plaguebearer.deltaBonus')],
    })
  if (t.type === 'afterEvade') {
    const i = getInvestigator(s, t.investigator)
    if (
      i.location === L.tunnel &&
      !Object.values(s.enemies).some((e) => e.location === L.tunnel && !e.exhausted)
    )
      out.push({
        key: 'plaguebearer:tunnel',
        investigator: i.id,
        label: 'ability.plaguebearer.tunnel',
        then: [{ type: 'ChooseMove', investigator: i.id, mandatory: true }],
      })
  }
  return out
}
on('plaguebearer.deltaBonus', (s) =>
  s.skillTest
    ? {
        ...s,
        skillTest: {
          ...s.skillTest,
          difficulty: s.skillTest.difficulty + 4,
          kind:
            s.skillTest.kind.type === 'investigate'
              ? {
                  ...s.skillTest.kind,
                  onSuccess: [
                    ...(s.skillTest.kind.onSuccess ?? []),
                    specific('plaguebearer.deltaPass', { investigator: s.skillTest.investigator }),
                  ],
                }
              : s.skillTest.kind,
        },
      }
    : s,
)
on('plaguebearer.deltaPass', (s, d) => {
  const by = String(d.investigator),
    members = activeInvestigators(s).filter((i) => i.location === L.delta),
    amount = 3 * s.startingInvestigatorCount
  return members.reduce((n, i) => n + i.clues, 0) < amount || s.locations[L.hallway]
    ? s
    : ask(
        s,
        by,
        [
          {
            label: 'choice.plaguebearer.hallway',
            then: [
              { type: 'PayGroupClues', amount, from: members.map((i) => i.id) },
              { type: 'PutLocationIntoPlay', location: L.hallway },
            ],
          },
          { label: 'choice.skip', then: [] },
        ],
        'prompt.plaguebearer.delta',
      )
})
