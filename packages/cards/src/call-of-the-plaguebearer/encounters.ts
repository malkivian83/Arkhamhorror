import {
  activeInvestigators,
  getInvestigator,
  push,
  registerTreachery,
  type Message,
  type ScenarioBehavior,
} from '@lcg/engine'
import { effectTest } from '../scenario-helpers'
import { C, ask, damage, miasma, on, specific } from './helpers'

const discard = (id: string): Message => ({ type: 'DiscardTreachery', treachery: id })
for (const code of [C.hands, C.skin, C.another])
  registerTreachery({
    code,
    revelation: (_s, by, self) => [
      {
        type: 'PlaceTreachery',
        treachery: self.id,
        placement: { type: 'threatArea', investigator: by },
      },
    ],
    abilities: (s, self, by) => {
      if (self.placement.type !== 'threatArea') return []
      if (code === C.hands && self.placement.investigator !== by) return []
      if (code === C.another) return []
      if (code === C.hands && s.activeTurn !== by) return []
      return [
        {
          key: `${self.id}:discard`,
          label: code === C.hands ? 'ability.plaguebearer.hands' : 'ability.plaguebearer.skin',
          actions: code === C.hands ? 0 : 2,
          provokes: code !== C.hands,
          ...(code === C.hands ? { costs: [damage(by, 2), discard(self.id)] } : {}),
          then:
            code === C.hands
              ? [{ type: 'GainActions' as const, investigator: by, amount: 1 }]
              : [discard(self.id)],
        },
      ]
    },
    forced: (s, t, self) => {
      if (self.placement.type !== 'threatArea') return []
      const by = self.placement.investigator
      if (code === C.hands && t.type === 'turnEnds' && t.investigator === by)
        return [damage(by, 0, 1)]
      if (
        code === C.skin &&
        t.type === 'afterSkillTest' &&
        t.investigator === by &&
        t.succeeded &&
        (t.kind === 'fight' || t.kind === 'investigate')
      )
        return [{ type: 'DiscardRandomFromHand', investigator: by, amount: 1 }]
      if (code === C.another) {
        if (t.type === 'afterMove' && t.investigator === by)
          return [{ type: 'LoseResources', investigator: by, amount: 1 }]
        if (t.type === 'turnEnds' && t.investigator === by)
          return [specific('plaguebearer.another', { investigator: by, treachery: self.id })]
      }
      return []
    },
  })
on('plaguebearer.another', (s, d) => {
  const by = String(d.investigator),
    id = String(d.treachery)
  const test = effectTest(by, C.another, 'willpower', 3, { onSuccess: [discard(id)] })
  return miasma(getInvestigator(s, by).location)
    ? ask(
        s,
        by,
        [
          { label: 'choice.plaguebearer.horror', then: [damage(by, 0, 1), discard(id)] },
          { label: 'choice.plaguebearer.test', then: [test] },
        ],
        'prompt.plaguebearer.another',
      )
    : push(s, test)
})
for (const [code, skill, safe] of [
  [C.suppression, 'agility', true],
  [C.urge, 'willpower', false],
] as const)
  registerTreachery({
    code,
    revelation: (_s, by) => [
      effectTest(by, code, skill, 4, {
        onFail: [specific('plaguebearer.moveRelative', { investigator: by, safe })],
      }),
    ],
  })
registerTreachery({
  code: C.evidence,
  revelation: (s, by, self) => {
    const location = getInvestigator(s, by).location
    return location
      ? [{ type: 'PlaceTreachery', treachery: self.id, placement: { type: 'location', location } }]
      : []
  },
  beforeMove: (s, self, move) => {
    if (
      self.placement.type !== 'location' ||
      getInvestigator(s, move.investigator).location !== self.placement.location
    )
      return null
    const location = self.placement.location
    return [
      discard(self.id),
      ...activeInvestigators(s)
        .filter((i) => i.location === location)
        .map((i) => damage(i.id, 3)),
      ...Object.values(s.enemies)
        .filter((e) => e.location === location)
        .map((e) => ({ type: 'DamageEnemy' as const, enemy: e.id, amount: 3 })),
      move,
    ]
  },
  abilities: (_s, self, by) => [
    {
      key: `${self.id}:discard`,
      label: 'ability.plaguebearer.evidence',
      actions: 1,
      provokes: true,
      then: [effectTest(by, C.evidence, 'agility', 3, { onSuccess: [discard(self.id)] })],
    },
  ],
})
export const encounterReactions: NonNullable<ScenarioBehavior['reactions']> = (s, t) => {
  const test = s.skillTest
  if (
    t.type !== 'whenRevealChaosToken' ||
    test?.kind.type !== 'effect' ||
    test.kind.source !== C.evidence
  )
    return []
  return [
    {
      key: 'plaguebearer:evidence:auto',
      investigator: t.investigator,
      label: 'ability.plaguebearer.evidenceAuto',
      then: [
        { type: 'CancelRevealedToken', redraw: false },
        { type: 'AutoSucceedSkillTest' },
        { type: 'EndTurn', investigator: t.investigator },
      ],
    },
  ]
}
