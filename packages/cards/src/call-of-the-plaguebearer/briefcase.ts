import {
  activeInvestigators,
  push,
  registerPlayerCard,
  registerPlayerCards,
  type GameState,
  type Message,
} from '@lcg/engine'
import { C, ask, on, specific } from './helpers'

// El mismo objeto cambia de dueño; nunca debe quedar en dos mazos de campaña.
const clearOwner = (s: GameState): GameState =>
  !s.campaignLog
    ? s
    : {
        ...s,
        campaignLog: {
          ...s.campaignLog,
          investigators: Object.fromEntries(
            Object.entries(s.campaignLog.investigators).map(([id, record]) => [
              id,
              {
                ...record,
                storyAssets: record.storyAssets.filter((code) => code !== C.briefcase),
              },
            ]),
          ),
        },
      }
on('plaguebearer.exileBriefcase', (s, d) =>
  push(clearOwner(s), {
    type: 'ExileCard',
    investigator: String(d.investigator),
    asset: String(d.asset),
    code: C.briefcase,
  }),
)

const resourceEffect = (by: string, asset: string): Message[] => [
  {
    type: 'RevealTokenOutsideTest',
    investigator: by,
    then: {
      type: 'PlayerCardEffect',
      code: C.briefcase,
      investigator: by,
      step: 'token',
      data: { asset },
    },
  },
]

registerPlayerCards([
  {
    code: C.briefcase,
    name: 'Suspicious Briefcase',
    type: 'asset',
    class: 'neutral',
    cost: 0,
    traits: ['Item', 'Tool'],
    slots: ['hand'],
    story: true,
    icons: {},
  },
])
registerPlayerCard({
  code: C.briefcase,
  leavesPlay: (_s, asset) => [
    specific('plaguebearer.exileBriefcase', { investigator: asset.owner, asset: asset.id }),
  ],
  fastOptions: (_s, self) =>
    self.exhausted
      ? []
      : [
          {
            key: `${self.id}:resources`,
            investigator: self.owner,
            label: 'ability.plaguebearer.briefcaseResources',
            target: { type: 'asset', id: self.id },
            then: [
              { type: 'ExhaustAsset', asset: self.id },
              ...resourceEffect(self.owner, self.id),
            ],
          },
        ],
  abilities: (_s, self, by) =>
    self.owner === by && !self.exhausted
      ? [
          {
            key: `${self.id}:resources`,
            label: 'ability.plaguebearer.briefcaseResources',
            actions: 0,
            provokes: false,
            costs: [{ type: 'ExhaustAsset', asset: self.id }],
            then: resourceEffect(by, self.id),
          },
        ]
      : [],
  effect: (_s, by, step, data) =>
    step === 'token'
      ? [
          { type: 'GainResources', investigator: by, amount: 3 },
          ...(['skull', 'tablet', 'cultist'].includes(String(data?.token))
            ? [
                specific('plaguebearer.briefcaseFlip', {
                  investigator: by,
                  asset: String(data?.asset),
                }),
              ]
            : []),
        ]
      : [],
})
on('plaguebearer.briefcaseFlip', (s, d) => {
  const by = String(d.investigator),
    id = String(d.asset)
  const assets = { ...s.assets }
  delete assets[id]
  return push(
    { ...clearOwner(s), assets },
    {
      type: 'RecordNote',
      note: 'plaguebearerReagent',
      value: JSON.stringify([...JSON.parse(s.campaignLog?.values.plaguebearerReagent ?? '[]'), by]),
    },
    {
      type: 'Story',
      entry: { title: 'story.plaguebearer.reagentTitle', body: 'story.plaguebearer.reagent' },
    },
    specific('plaguebearer.passBriefcase', { investigator: by }),
  )
})
on('plaguebearer.passBriefcase', (s, d) => {
  const eligible = activeInvestigators(s).filter(
    (i) =>
      i.id !== String(d.investigator) &&
      !(JSON.parse(s.campaignLog?.values.plaguebearerReagent ?? '[]') as string[]).includes(i.id),
  )
  return ask(
    s,
    String(d.investigator),
    [
      ...eligible.map((i) => ({
        label: 'choice.investigator',
        params: { name: i.name },
        then: [
          { type: 'AddStoryAsset' as const, investigator: i.id, code: C.briefcase },
          { type: 'PutAssetIntoPlay' as const, investigator: i.id, code: C.briefcase },
        ],
      })),
      { label: 'choice.skip', then: [] },
    ],
    'prompt.plaguebearer.briefcase',
  )
})
