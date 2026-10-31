import {
  getInvestigator,
  getLocation,
  playerCardBehavior,
  registerPlayerCard,
  type Message,
} from '@lcg/engine'
import { registerBasicAsset, type BasicAbility } from '../basic-abilities/register'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'

const attack = (
  modifier: number,
  extraDamage: number,
  actions = 1,
  key = '',
  cost: BasicAbility['cost'] = [],
): BasicAbility => ({
  action: 'fight',
  modifier,
  extraDamage,
  actions,
  key,
  cost,
  label: 'choice.toolAttack',
  params: {
    bonus: modifier >= 0 ? `+${modifier}` : String(modifier),
    damage: 1 + extraDamage,
    actions,
  },
})
export function registerCombat(code: string): boolean {
  if (code === '05115') {
    registerBasicAsset(code, [attack(2, 1, 1, '', ['use'])])
    return true
  }
  if (['08094', '08096'].includes(code)) {
    const high = code === '08096'
    registerBasicAsset(code, [
      attack(high ? 1 : -1, 1),
      attack(high ? 5 : 2, high ? 5 : 2, high ? 3 : 2, 'heavy'),
    ])
    return true
  }
  if (code === '05118') {
    registerBasicAsset(code, [attack(1, 0), attack(2, 1, 1, 'empowered', ['use'])])
    return true
  }
  if (code === '07021') {
    registerBasicAsset(code, [
      { action: 'investigate', actions: 0, shroud: 1, cost: ['exhaust', 'use'], key: 'fast' },
      { action: 'investigate', shroud: -2, cost: ['exhaust', 'use'] },
    ])
    const b = playerCardBehavior(code)!,
      abilities = b.abilities!
    registerPlayerCard({
      ...b,
      abilities: (s, a, by) =>
        abilities(s, a, by).flatMap((o) => {
          const i = getInvestigator(s, by),
            extra = getLocation(s, i.location!).investigateExtraActions ?? 0
          if (o.actions > 0) return [{ ...o, actions: o.actions + extra }]
          if (extra && (s.activeTurn !== by || i.actionsRemaining < extra)) return []
          const then = Array.from({ length: extra }).reduce<Message[]>(
            (then) => [{ type: 'SpendAdditionalAction', investigator: by, then }],
            [...(o.costs ?? []), ...o.then],
          )
          return [
            {
              ...o,
              label: 'choice.toolCipherFast',
              params: { ...o.params, n: extra },
              actions: 0,
              provokes: false,
              costs: [],
              then,
            },
          ]
        }),
    })
    return true
  }
  if (code === '07159') {
    registerBasicAsset(
      code,
      [0, 1].map(
        (n) =>
          ({
            action: 'fight',
            skills: ['combat', 'intellect', 'willpower'],
            cost: ['exhaust'],
            key: `doom${n}`,
            available: ({ self }) => !n || (self.doom ?? 0) < 3,
            modifier: ({ state, self }) => (self.doom ?? 0) + (state.doomBecomesDamage ? 0 : n),
            extraDamage: ({ state, self }) => (self.doom ?? 0) + (state.doomBecomesDamage ? 0 : n),
            extraCosts: ({ self }) =>
              n
                ? [{ type: 'PlaceDoomOnAsset', asset: self.id, amount: 1, checkAgenda: false }]
                : [],
            label: 'choice.toolTome',
            params: { doom: n },
          }) as BasicAbility,
      ),
    )
    return true
  }
  if (['07029', '11074'].includes(code)) {
    const high = code === '11074'
    registerBasicAsset(
      code,
      [
        {
          action: 'fight',
          skills: ['combat', 'willpower'],
          modifier: high ? 1 : 0,
          cost: ['exhaust'],
        },
        {
          action: 'evade',
          skills: ['agility', 'willpower'],
          modifier: high ? 1 : 0,
          cost: ['exhaust'],
        },
      ],
      () => ({
        noAttacksOfOpportunity: true,
        reactions: (_s, t, a) =>
          t.type === 'afterAssetEntersPlay' && t.asset === a.id
            ? [
                {
                  key: a.id + ':entry',
                  investigator: a.owner,
                  label: 'choice.toolEntry',
                  params: { card: cardName(code) },
                  then: [continuation(code, a.owner, high ? 'entry' : 'fight', { asset: a.id })],
                },
              ]
            : [],
        effect: (s, by, step, data) => {
          const a = s.assets[String(data.asset)]
          if (!a) return []
          if (step === 'entry')
            return ask(
              by,
              [
                ...Object.values(s.enemies)
                  .filter((e) => e.engagedWith === by)
                  .map((e) => ({
                    label: 'choice.toolDamage',
                    params: { n: 1, enemy: e.name },
                    then: [
                      { type: 'DamageEnemy' as const, enemy: e.id, amount: 1, by },
                      continuation(code, by, 'fight', data),
                    ],
                  })),
                { label: 'choice.skip', then: [continuation(code, by, 'fight', data)] },
              ],
              true,
            )
          if (step !== 'fight') return []
          const options = playerCardBehavior(code)!.abilities!(s, { ...a, exhausted: false }, by)
          return ask(
            by,
            options.map((o) => ({
              label: o.label,
              params: o.params!,
              ...(o.target ? { target: o.target } : {}),
              then: [
                {
                  type: 'UseAbility',
                  investigator: by,
                  key: o.key,
                  actions: 0,
                  provokes: false,
                  then: o.then,
                },
              ],
            })),
            true,
          )
        },
      }),
    )
    return true
  }
  return false
}
