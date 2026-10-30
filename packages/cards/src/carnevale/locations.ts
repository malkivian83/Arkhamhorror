import {
  canAffordEntry,
  canEnter,
  getInvestigator,
  registerLocation,
  type GameState,
  type Message,
  type ReactionOption,
  type Trigger,
} from '@lcg/engine'
import { C } from './setup'
import { around, ring } from './topology'

for (const [code, effect] of [
  [C.rialto, (investigator: string): Message => ({ type: 'LoseActions', investigator, amount: 1 })],
  [
    C.sighs,
    (investigator: string): Message => ({ type: 'TakeDamage', investigator, damage: 0, horror: 1 }),
  ],
  [
    C.accademia,
    (investigator: string): Message => ({ type: 'LoseResources', investigator, amount: 2 }),
  ],
] as const) {
  registerLocation({
    code,
    forced: (_s, trigger, self) =>
      self.revealed && trigger.type === 'afterMove' && trigger.from === self.id
        ? [effect(trigger.investigator)]
        : [],
  })
}

registerLocation({
  code: C.streets,
  abilities: (s, self, investigator) => {
    const to = around(ring(s), self.id)
    if (!to || !s.locations[to] || !canEnter(s, investigator, to) || !canAffordEntry(s, to))
      return []
    return [
      {
        key: `${C.streets}:move`,
        label: 'ability.carnevale.streets',
        actions: 0,
        provokes: false,
        then: [{ type: 'MoveTo', investigator, location: to }],
      },
    ]
  },
})

registerLocation({
  code: C.garden,
  abilities: (s, _self, investigator) => {
    const me = getInvestigator(s, investigator)
    return me.resources >= 2 && me.horror > 0
      ? [
          {
            key: `${C.garden}:heal`,
            label: 'ability.carnevale.garden',
            actions: 2,
            provokes: true,
            limit: { per: 'game' },
            costs: [{ type: 'LoseResources', investigator, amount: 2 }],
            then: [{ type: 'Heal', investigator, damage: 0, horror: 2 }],
          },
        ]
      : []
  },
})

registerLocation({
  code: C.square,
  abilities: (s, self, investigator) => {
    const previous = around(ring(s), self.id, -1)
    return Object.values(s.enemies)
      .filter((e) => e.location === previous && !e.traits?.includes('Elite') && !e.cannotBeEvaded)
      .map((e) => ({
        key: `${C.square}:evade`,
        label: 'ability.carnevale.square',
        params: { enemy: e.name },
        actions: 1,
        provokes: true,
        limit: { per: 'turn' as const, group: true },
        target: { type: 'enemy' as const, id: e.id },
        then: [{ type: 'EvadeEnemy' as const, by: investigator, enemy: e.id }],
      }))
  },
})

/** Las capacidades de entrada del Canal y el Guardián son opcionales. */
export function locationReactions(state: GameState, trigger: Trigger): ReactionOption[] {
  if (trigger.type !== 'afterMove') return []
  const me = getInvestigator(state, trigger.investigator)
  if (me.eliminated || !me.location || !state.locations[me.location]?.revealed) return []
  const canal = me.location === C.canal
  if (!canal && me.location !== C.guardian) return []
  return [
    {
      key: `${me.location}:enter`,
      investigator: me.id,
      label: canal ? 'ability.carnevale.canal' : 'ability.carnevale.guardian',
      target: { type: 'location', id: me.location },
      then: canal
        ? [{ type: 'PlaceCluesOnLocationFromPool', location: me.location, amount: 1 }]
        : [{ type: 'DrawCards', investigator: me.id, amount: 1 }],
    },
  ]
}
