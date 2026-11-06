import {
  activeInvestigators,
  distancesFrom,
  getInvestigator,
  playerCardDef,
  registerEnemy,
  registerTreachery,
  type Choice,
  type Message,
  type TreacheryBehavior,
} from '@lcg/engine'
import { assetsWithHealthAt, effectTest } from '../scenario-helpers'
import { attached, iceMessage } from './ice-and-death'
import { SKITTERING, shelter } from './ice-and-death-cards'

const discard = (treachery: string): Message => ({ type: 'DiscardTreachery', treachery })
const place = (treachery: string, location: string): Message => ({
  type: 'PlaceTreachery',
  treachery,
  placement: { type: 'location', location },
})
const damage = (investigator: string, amount: number, horror = 0): Message => ({
  type: 'TakeDamage',
  investigator,
  damage: amount,
  horror,
})
const nearby: TreacheryBehavior['revelation'] = (state, investigator, self) => {
  const here = getInvestigator(state, investigator).location
  if (!here) return []
  const distances = distancesFrom(state, here)
  const candidates = Object.values(state.locations).filter(
    ({ id, clues }) =>
      distances.has(id) &&
      !attached(state, id, self.code).length &&
      (self.code !== '08712' || clues > 0),
  )
  const nearest = Math.min(...candidates.map(({ id }) => distances.get(id)!))
  return [
    {
      type: 'Ask',
      investigator,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.chooseLocation',
        choices: candidates
          .filter(({ id }) => distances.get(id) === nearest)
          .map(({ id, name }) => ({
            label: 'choice.edgeOfTheEarth.attach',
            params: { name },
            target: { type: 'location', id },
            then: [place(self.id, id)],
          })),
      },
    },
  ]
}
const here: TreacheryBehavior['revelation'] = (state, investigator, self) => {
  const location = getInvestigator(state, investigator).location
  return location ? [place(self.id, location)] : []
}
const expires: NonNullable<TreacheryBehavior['forced']> = (_state, trigger, self) =>
  trigger.type === 'roundEnds' ? [discard(self.id)] : []

registerTreachery({
  code: '08516',
  revelation: (state, investigator, self) => {
    const difficulty = shelter(getInvestigator(state, investigator).location)
    return [
      effectTest(investigator, self.code, 'willpower', difficulty, {
        onFail: [iceMessage('apeirophobia', { investigator })],
      }),
    ]
  },
})
registerTreachery({
  code: '08517',
  revelation: (_state, investigator, self) => [
    {
      type: 'PlaceTreachery',
      treachery: self.id,
      placement: { type: 'threatArea', investigator },
    },
  ],
  beforeMove: (state, self, move) =>
    self.placement.type === 'threatArea' &&
    self.placement.investigator === move.investigator &&
    attached(state, getInvestigator(state, move.investigator).location).length
      ? [{ type: 'SpendAdditionalAction', investigator: move.investigator, then: [move] }]
      : null,
  forced: (_state, trigger, self) =>
    trigger.type === 'turnEnds' &&
    self.placement.type === 'threatArea' &&
    trigger.investigator === self.placement.investigator
      ? [
          effectTest(trigger.investigator, self.code, 'agility', 2, {
            onSuccess: [discard(self.id)],
          }),
        ]
      : [],
})
// Bruma afín: solo se descarta al final de la ronda en que su Obligado se resolvió (ficha).
registerTreachery({
  code: '08691',
  revelation: nearby,
  forced: (state, trigger, self) => (self.tokens ? expires(state, trigger, self) : []),
})
registerTreachery({ code: '08692', revelation: nearby, forced: expires })
registerTreachery({
  code: '08693',
  revelation: here,
  forced: expires,
  skillModifier: (state, self, test) =>
    self.placement.type === 'location' &&
    getInvestigator(state, test.investigator).location === self.placement.location
      ? -1
      : 0,
})
registerTreachery({
  code: '08694',
  revelation: here,
  forced: (state, trigger, self) => {
    if (
      trigger.type === 'turnEnds' &&
      self.placement.type === 'location' &&
      getInvestigator(state, trigger.investigator).location === self.placement.location
    ) {
      return [
        {
          type: 'TakeDamage',
          investigator: trigger.investigator,
          damage: 1,
          horror: 0,
          direct: true,
        },
        ...assetsWithHealthAt(state, self.placement.location)
          .filter(({ owner }) => owner === trigger.investigator)
          .map(({ id }): Message => ({ type: 'DamageAsset', asset: id, damage: 1, horror: 0 })),
      ]
    }
    return expires(state, trigger, self)
  },
})
for (const [code, skill] of [
  ['08698', 'agility'],
  ['08713', 'willpower'],
] as const) {
  registerTreachery({
    code,
    revelation: (_state, investigator) => [
      effectTest(investigator, code, skill, 3, {
        onFail: [skill === 'agility' ? damage(investigator, 2) : damage(investigator, 0, 2)],
      }),
    ],
  })
}
registerTreachery({
  code: '08699',
  revelation: nearby,
  beforeMove: (state, self, move) =>
    self.placement.type === 'location' &&
    !move.encounterEffect &&
    (move.location === self.placement.location ||
      getInvestigator(state, move.investigator).location === self.placement.location)
      ? [
          effectTest(move.investigator, self.code, 'agility', 2, {
            onSuccess: [move],
            onFail: [damage(move.investigator, 1, 1), discard(self.id)],
          }),
        ]
      : null,
})
registerTreachery({
  code: '08712',
  revelation: nearby,
  forced: (state, trigger, self) =>
    trigger.type === 'afterDiscoverClues' &&
    self.placement.type === 'location' &&
    trigger.location === self.placement.location
      ? [
          ...getInvestigator(state, trigger.investigator)
            .hand.filter((code) => !playerCardDef(code)?.weakness)
            .map((card): Message => ({
              type: 'DiscardFromHand',
              investigator: trigger.investigator,
              card,
            })),
          discard(self.id),
        ]
      : [],
})

registerEnemy({
  code: SKITTERING,
  forced: (state, trigger, self) =>
    trigger.type === 'enemyDefeated' && trigger.enemy.id === self.id && trigger.by
      ? state.tekeliliDeck?.length
        ? [iceMessage('tekelili', { investigator: trigger.by, amount: 1 })]
        : [{ type: 'AttackWithoutLocation', card: self, investigator: trigger.by }]
      : [],
})
registerEnemy({
  code: '08689',
  onAttack: (state, _self, investigator) =>
    state.tekeliliDeck?.length ? [iceMessage('shuffleTekelili', { investigator, amount: 2 })] : [],
  attackModifier: (state) => {
    const missing = Math.max(0, 2 - (state.tekeliliDeck?.length ?? 0))
    return { damage: missing, horror: missing }
  },
})
registerEnemy({
  code: '08690',
  forced: (state, trigger, self) => {
    if (trigger.type !== 'enemyPhaseEnds' || self.exhausted) return []
    const counts = new Map<string, number>()
    for (const { location } of activeInvestigators(state))
      if (location) counts.set(location, (counts.get(location) ?? 0) + 1)
    const highest = Math.max(...counts.values())
    const current = distancesFrom(state, self.location, self)
    const targets = [...counts].filter(
      ([location, count]) => count === highest && current.has(location),
    )
    const distance = Math.min(...targets.map(([location]) => current.get(location)!))
    const steps = new Set<string>()
    for (const [target] of targets) {
      if (current.get(target) !== distance || distance === 0) continue
      const path = distancesFrom(state, target, self)
      for (const neighbor of state.locations[self.location]?.connections ?? [])
        if (path.get(neighbor) === distance - 1) steps.add(neighbor)
    }
    const apply = iceMessage('phantasm', { enemy: self.id })
    const investigator = activeInvestigators(state)[0]
    const choices = [...steps].map((location): Choice => ({
      label: 'choice.edgeOfTheEarth.phantasm',
      params: { name: state.locations[location]!.name },
      target: { type: 'location', id: location },
      then: [{ type: 'MoveEnemy', enemy: self.id, location }, apply],
    }))
    return choices.length && investigator
      ? [
          {
            type: 'Ask',
            investigator: investigator.id,
            question: { kind: 'chooseOne', prompt: 'prompt.chooseLocation', choices },
          },
        ]
      : [apply]
  },
})
