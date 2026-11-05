import { activeInvestigators, push, registerPlayerCard, registerPlayerCards } from '@lcg/engine'
import { C, ask, on, specific } from './helpers'

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
  abilities: (s, self, by) =>
    self.owner === by && !self.exhausted && s.activeTurn === by
      ? [
          {
            key: `${self.id}:resources`,
            label: 'ability.plaguebearer.briefcaseResources',
            actions: 0,
            provokes: false,
            costs: [{ type: 'ExhaustAsset', asset: self.id }],
            then: [
              {
                type: 'RevealTokenOutsideTest',
                investigator: by,
                then: {
                  type: 'PlayerCardEffect',
                  code: C.briefcase,
                  investigator: by,
                  step: 'token',
                  data: { asset: self.id },
                },
              },
            ],
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
    { ...s, assets },
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
        then: [{ type: 'PutAssetIntoPlay' as const, investigator: i.id, code: C.briefcase }],
      })),
      { label: 'choice.skip', then: [] },
    ],
    'prompt.plaguebearer.briefcase',
  )
})
