import { activeInvestigators, getInvestigator, registerEnemy, type GameState } from '@lcg/engine'
import { effectTest } from '../scenario-helpers'
import { C, damage, miasma, specific, terrorCount } from './helpers'
import { L } from './locations'

export const guarded = (s: GameState, location: string | null) =>
  Object.values(s.enemies).some(
    (e) => e.code === C.greyson && !e.exhausted && e.location === location,
  )
registerEnemy({
  code: C.greyson,
  abilities: (_s, self, by) => [
    {
      key: `${self.id}:parley`,
      label: 'ability.plaguebearer.greyson',
      actions: 1,
      provokes: false,
      parley: true,
      then: [
        effectTest(by, C.greyson, 'intellect', 4, {
          onSuccess: [{ type: 'EvadeEnemy', enemy: self.id, by }],
        }),
      ],
    },
  ],
})
registerEnemy({
  code: C.first,
  forced: (s, t, self) =>
    t.type === 'afterDealDamage' &&
    t.enemy === self.id &&
    miasma(getInvestigator(s, t.investigator).location)
      ? [damage(t.investigator, 0, 1)]
      : [],
})
registerEnemy({
  code: C.supplicant,
  attackModifier: (s, _self, by) =>
    terrorCount(s, by) > 0 ? { damage: 1, horror: 1 } : { damage: 0, horror: 0 },
})
registerEnemy({
  code: C.troubleshooter,
  forced: (s, t, self) =>
    t.type === 'afterEnemyAttack' && s.phase === 'enemy' && t.enemy === self.id
      ? [
          { type: 'DisengageEnemy', enemy: self.id },
          specific('plaguebearer.moveRelative', { investigator: t.investigator, safe: true }),
        ]
      : [],
})
registerEnemy({
  code: C.panicked,
  forced: (s, t, self) =>
    t.type === 'afterEnemyAttack' &&
    t.enemy === self.id &&
    s.enemyAttacks?.findLast(
      (a) => a.enemy === self.id && a.investigator === t.investigator && a.round === s.round,
    )?.opportunity
      ? [
          ...activeInvestigators(s)
            .filter((i) => i.location === self.location)
            .map((i) => damage(i.id)),
          { type: 'EvadeEnemy', enemy: self.id, by: t.investigator },
        ]
      : [],
})
registerEnemy({
  code: C.thrall,
  patrol: (s) => (s.locations[L.omega] ? [L.omega] : []),
  forced: (_s, t, self) =>
    t.type === 'enemyPhaseEnds' && miasma(self.location)
      ? [{ type: 'PlaceDoomOnEnemy', enemy: self.id, amount: 1 }]
      : [],
})
registerEnemy({
  code: C.devoted,
  patrol: (s) => (s.locations[L.omega] ? [L.omega] : []),
  forced: (_s, t, self) =>
    t.type === 'huntersMoveEnds' && miasma(self.location)
      ? [specific('plaguebearer.find', { code: C.thrall, location: self.location })]
      : [],
})
