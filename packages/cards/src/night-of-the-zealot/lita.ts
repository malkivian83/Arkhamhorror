import { getInvestigator, registerPlayerCard, registerPlayerCards } from '@lcg/engine'
import { effectTest } from '../scenario-helpers'

export const LITA_CHANTLER = '01117'
registerPlayerCards([
  {
    code: LITA_CHANTLER,
    name: 'Lita Chantler',
    story: true,
    unique: true,
    type: 'asset',
    class: 'neutral',
    traits: ['Ally'],
    cost: 0,
    slots: ['ally'],
    health: 3,
    sanity: 3,
  },
])

// El aura y la reacción solo existen mientras un jugador la controla.
// RR: "Constant Abilities", "Reaction Triggered Abilities", ST.6–7.
registerPlayerCard({
  code: LITA_CHANTLER,
  skillAura: (state, self, test) =>
    test.skill === 'combat' &&
    getInvestigator(state, self.owner).location !== null &&
    getInvestigator(state, self.owner).location ===
      getInvestigator(state, test.investigator).location
      ? 1
      : 0,
  reactions: (state, trigger, self) => {
    if (
      trigger.type !== 'afterSkillTest' ||
      trigger.kind !== 'fight' ||
      !trigger.succeeded ||
      !trigger.enemy
    )
      return []
    const target = state.enemies[trigger.enemy]
    const here = getInvestigator(state, self.owner).location
    if (
      here === null ||
      getInvestigator(state, trigger.investigator).location !== here ||
      !target?.traits?.includes('Monster')
    )
      return []
    return [
      {
        key: `${self.id}:monster-damage`,
        investigator: self.owner,
        label: 'ability.zealot.litaDamage',
        target: { type: 'asset', id: self.id },
        then: [{ type: 'ModifySkillTest', extraDamage: 1 }],
      },
    ]
  },
  placedAbilities: (_state, self, investigator) => [
    {
      key: `${self.id}:parley`,
      label: 'ability.zealot.parleyLita',
      actions: 1,
      provokes: false,
      parley: true,
      target: { type: 'placed', id: self.id },
      then: [
        {
          ...effectTest(investigator, 'Lita Chantler', 'intellect', 4, {
            onSuccess: [{ type: 'TakeControlOfPlaced', placed: self.id, investigator }],
          }),
          tags: ['parley'],
        },
      ],
    },
  ],
})
