import {
  distancesFrom,
  getInvestigator,
  push,
  registerEnemy,
  registerTreachery,
  shuffle,
  type GameState,
  type Message,
} from '@lcg/engine'
import { effectTest } from '../scenario-helpers'
import { ask, damage, lead, on, specific } from './helpers'
import { N, spreadingCodes } from './night-data'
import { miasmasAt } from './night-helpers'

function farthest(s: GameState, by: string, eligible: (id: string) => boolean) {
  const from = getInvestigator(s, by).location
  if (!from) return []
  const distance = distancesFrom(s, from)
  const ids = Object.keys(s.locations).filter((id) => eligible(id) && distance.has(id))
  const max = Math.max(-1, ...ids.map((id) => distance.get(id)!))
  return ids.filter((id) => distance.get(id) === max)
}
for (const code of spreadingCodes)
  registerTreachery({
    code,
    revelation: (s, by, self) => {
      const ids = farthest(s, by, (id) => s.locations[id]!.clues > 0 && !miasmasAt(s, id).length)
      if (!ids.length) return []
      if (ids.length === 1)
        return [
          {
            type: 'PlaceTreachery',
            treachery: self.id,
            placement: { type: 'location', location: ids[0]! },
          },
        ]
      return [
        {
          type: 'Ask',
          investigator: by,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.chooseLocation',
            choices: ids.map((id) => ({
              label: 'choice.location',
              params: { location: s.locations[id]!.name },
              target: { type: 'location', id },
              then: [
                {
                  type: 'PlaceTreachery',
                  treachery: self.id,
                  placement: { type: 'location', location: id },
                },
              ],
            })),
          },
        },
      ]
    },
    forced: (s, t, self) => {
      if (
        t.type !== 'turnBegins' ||
        self.placement.type !== 'location' ||
        getInvestigator(s, t.investigator).location !== self.placement.location
      )
        return []
      const n = self.clues ?? 0
      if (!n) return []
      if (code === N.cackling) return [damage(t.investigator, n)]
      if (code === N.whispering) return [damage(t.investigator, 0, n)]
      return code === N.echoing
        ? [{ type: 'LoseResources', investigator: t.investigator, amount: n }]
        : [
            {
              type: 'ChooseDiscardFromHand',
              investigator: t.investigator,
              amount: Math.min(n, getInvestigator(s, t.investigator).hand.length),
            },
          ]
    },
    abilities: (_s, self, by) => [
      {
        key: `${self.id}:clear`,
        label: 'ability.plaguebearer.night.clearMiasma',
        actions: 1,
        provokes: true,
        then: [
          effectTest(
            by,
            code,
            (
              {
                [N.cackling]: 'agility',
                [N.echoing]: 'willpower',
                [N.hissing]: 'combat',
                [N.whispering]: 'intellect',
              } as const
            )[code],
            3,
            {
              onSuccess: [specific('night.clearMiasma', { investigator: by, treachery: self.id })],
            },
          ),
        ],
      },
    ],
  })
on('night.clearMiasma', (s, d) => {
  const id = String(d.treachery),
    by = String(d.investigator),
    t = s.treacheries[id]
  return !t
    ? s
    : ask(s, by, [
        ...((t.clues ?? 0) > 0
          ? [
              {
                label: 'choice.plaguebearer.night.takeClue',
                then: [
                  {
                    type: 'MoveClues' as const,
                    from: { type: 'treachery' as const, id },
                    to: { type: 'investigator' as const, id: by },
                    amount: 1,
                  },
                ],
              },
            ]
          : []),
        {
          label: 'choice.plaguebearer.night.discardMiasma',
          then: [{ type: 'DiscardTreachery', treachery: id }],
        },
      ])
})
registerTreachery({
  code: N.outburst,
  revelation: (s, by) => {
    const cards = Object.values(s.treacheries).filter((t) =>
      spreadingCodes.includes(t.code as (typeof spreadingCodes)[number]),
    )
    if (!cards.some((t) => (t.clues ?? 0) > 0))
      return [specific('night.findSpreading', { investigator: by })]
    return cards
      .filter((t) => (t.clues ?? 0) > 0)
      .map((t): Message => ({
        type: 'MoveClues',
        from: { type: 'treachery', id: t.id },
        to: { type: 'pool' },
        amount: 1,
      }))
  },
})
on('night.findSpreading', (s, d) =>
  ask(
    s,
    String(d.investigator),
    [
      ...new Set(
        [...s.encounterDeck, ...s.encounterDiscard]
          .filter((c) => spreadingCodes.includes(c.code as (typeof spreadingCodes)[number]))
          .map((c) => c.code),
      ),
    ].map((code) => ({
      label: 'choice.card',
      params: {
        card: [...s.encounterDeck, ...s.encounterDiscard].find((c) => c.code === code)!.name,
      },
      then: [specific('night.drawSpreading', { investigator: String(d.investigator), code })],
    })),
  ),
)
on('night.drawSpreading', (s, d) => {
  const code = String(d.code),
    at = s.encounterDeck.findIndex((c) => c.code === code),
    discardAt = s.encounterDiscard.findIndex((c) => c.code === code)
  const card = at >= 0 ? s.encounterDeck[at] : s.encounterDiscard[discardAt]
  const [encounterDeck, rng] = shuffle(
    s.encounterDeck.filter((_, n) => n !== at),
    s.rng,
  )
  const next = {
    ...s,
    rng,
    encounterDeck,
    encounterDiscard: s.encounterDiscard.filter((_, n) => at >= 0 || n !== discardAt),
  }
  return card
    ? push(next, {
        type: 'ResolveEncounterCard',
        investigator: String(d.investigator),
        card,
        fromEncounterDeck: at >= 0,
      })
    : next
})
for (const code of [N.ghoul, N.contagion])
  registerEnemy({
    code,
    ...(code === N.contagion
      ? {
          spawn: (s: GameState, by: string) =>
            farthest(
              s,
              by,
              (id) => !(s.locations[id]!.resources ?? 0) && !(s.locations[id]!.horror ?? 0),
            ),
        }
      : {}),
    forced: (s, t, self) => {
      if (t.type === 'enemyDefeated' && t.enemy.id === self.id && t.by)
        return [{ type: 'GainClues', investigator: t.by, amount: t.enemy.clues ?? 0 }]
      if (
        code === N.ghoul &&
        ((t.type === 'afterEngage' && t.enemy === self.id) ||
          (t.type === 'afterEnemyAttack' && t.enemy === self.id))
      )
        return [
          {
            type: 'MoveClues',
            from: { type: 'investigator', id: t.investigator },
            to: { type: 'enemy', id: self.id },
            amount: 1,
          },
        ]
      if (code === N.contagion && t.type === 'roundEnds')
        return [
          {
            type: 'MoveClues',
            from: { type: 'location', id: self.location },
            to: { type: 'enemy', id: self.id },
            amount: 1,
          },
        ]
      return []
    },
  })
registerEnemy({
  code: N.victim,
  forced: (s, t, self) =>
    t.type === 'afterEngage' && t.enemy === self.id
      ? s.phase === 'investigation' &&
        s.activeTurn === t.investigator &&
        getInvestigator(s, t.investigator).actionsRemaining > 0
        ? [{ type: 'LoseActions', investigator: t.investigator, amount: 1 }]
        : [
            {
              type: 'EnemyAttack',
              enemy: self.id,
              investigator: t.investigator,
              exhaustAfter: false,
            },
          ]
      : [],
})
registerEnemy({
  code: N.pustule,
  forced: (s, t, self) => {
    if (t.type !== 'afterEnemyDamaged' || t.enemy !== self.id || t.amount < 2) return []
    const dist = distancesFrom(s, self.location),
      eligible = Object.values(s.locations).filter(
        (l) => !(l.resources ?? 0) && !(l.horror ?? 0) && dist.has(l.id),
      )
    const nearest = Math.min(...eligible.map((l) => dist.get(l.id)!))
    const ids = eligible.filter((l) => dist.get(l.id) === nearest && l.clues > 0).map((l) => l.id)
    if (!ids.length) return []
    return [
      {
        type: 'Ask',
        investigator: lead(s),
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseLocation',
          choices: ids.map((id) => ({
            label: 'choice.location',
            params: { location: s.locations[id]!.name },
            then: [
              {
                type: 'MoveClues',
                from: { type: 'location', id },
                to: { type: 'pool' },
                amount: 1,
              },
            ],
          })),
        },
      },
    ]
  },
})
