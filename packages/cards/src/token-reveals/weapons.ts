// RR: Fight, Damage (simultaneous), Uses, Automatic Failure, Skill Tests ST.4.
import {
  attackBlocked,
  attackDamage,
  engagedEnemies,
  enemiesAt,
  investigatorsAt,
  registerPlayerCard,
  type DamageSource,
  type GameState,
  type Message,
} from '@lcg/engine'
import { registerBasicAsset, ifTokens } from '../basic-abilities/register'
import { registerBasicEvent } from '../basic-events/register'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'
import { SYMBOLS } from './reveals'

/** Damage added to this attack beyond its standard 1 ("any additional damage"). */
const additional = (s: GameState) =>
  s.skillTest ? Math.max(0, attackDamage(s, s.skillTest) - 1) : 0
const source = (code: string, traits: string[]): DamageSource => ({ code, attack: true, traits })

/**
 * "Instead of its standard damage, this attack deals N damage to each enemy (and each other
 * investigator) at the attacked enemy's location (any additional damage is dealt to the
 * attacked enemy)" (FAQ: Storm of Spirits, Mk 1 Grenades). Simultaneous: defeats are
 * checked after every enemy and investigator has taken its damage.
 */
function areaDamage(
  s: GameState,
  by: string,
  data: Record<string, string | number | boolean>,
  amount: number,
  from: DamageSource,
  others: boolean,
): Message[] {
  const location = String(data.location),
    attacked = String(data.enemy),
    extra = additional(s)
  const enemies = enemiesAt(s, location)
  return [
    ...enemies.map((e): Message => ({
      type: 'DamageEnemy',
      enemy: e.id,
      amount: amount + (e.id === attacked ? extra : 0),
      by,
      source: from,
      deferDefeat: true,
    })),
    ...(others
      ? investigatorsAt(s, location)
          .filter((i) => i.id !== by)
          .map((i): Message => ({
            type: 'TakeDamage',
            investigator: i.id,
            damage: amount,
            horror: 0,
          }))
      : []),
    ...enemies.map((e): Message => ({ type: 'CheckEnemyDefeat', enemy: e.id, by })),
  ]
}

export function registerAreaWeapon(code: string): boolean {
  // Storm of Spirits (0, 3): willpower attack (+2 at level 3); success deals 2 (3) damage
  // to each enemy at the attacked enemy's location; a symbol deals 1 (2) damage to each
  // investigator there, success or not (errata: "the attacked enemy's location").
  if (code === '03153' || code === '52008') {
    const upgraded = code === '52008'
    registerBasicEvent(
      code,
      {
        action: 'fight',
        skill: 'willpower',
        modifier: upgraded ? 2 : 0,
        tags: ['spell'],
        fight: { noDamage: true },
        onSuccess: ({ investigator }, enemy) => [
          continuation(code, investigator, 'storm', {
            enemy: enemy!.id,
            location: enemy!.location,
          }),
        ],
        after: ({ investigator }, enemy) => [
          ifTokens(SYMBOLS, [
            continuation(code, investigator, 'burn', { location: enemy!.location }),
          ]),
        ],
      },
      {
        effect: (s, by, step, data) => {
          const amount = upgraded ? 3 : 2
          if (step === 'storm')
            return areaDamage(s, by, data!, amount, source(code, ['Spell']), false)
          return investigatorsAt(s, String(data!.location)).map((i): Message => ({
            type: 'TakeDamage',
            investigator: i.id,
            damage: upgraded ? 2 : 1,
            horror: 0,
          }))
        },
      },
    )
    return true
  }
  // Mk 1 Grenades: spend 1 supply, +2 [combat]; success deals 2 damage to each enemy and
  // each other investigator at the attacked enemy's location. Discarded without supplies.
  if (code === '05273') {
    registerBasicAsset(
      code,
      [
        {
          action: 'fight',
          cost: ['use'],
          modifier: 2,
          fight: { noDamage: true },
          onSuccess: ({ investigator }, enemy) => [
            continuation(code, investigator, 'blast', {
              enemy: enemy!.id,
              location: enemy!.location,
            }),
          ],
        },
      ],
      () => ({
        discardWhenEmpty: true,
        effect: (s, by, _step, data) =>
          areaDamage(s, by, data!, 2, source(code, ['Item', 'Weapon', 'Ranged']), true),
      }),
    )
    return true
  }
  // Old Hunting Rifle: spend 1 ammo, +3 [combat], +2 damage. A resolved skull or auto-fail
  // jams it: the attack automatically fails and only "[action]: clear the jam" can be used.
  if (code === '04273') {
    registerBasicAsset(
      code,
      [
        {
          action: 'fight',
          cost: ['use'],
          modifier: 3,
          extraDamage: 2,
          available: ({ self }) => self.form !== 'jammed',
        },
      ],
      () => ({
        onTokenRevealed: (s, token, self) =>
          s.skillTest?.kind.type === 'fight' && (token === 'skull' || token === 'autoFail')
            ? [
                { type: 'ForceSkillTestFailure' },
                { type: 'SetAssetForm', asset: self.id, form: 'jammed' },
              ]
            : [],
      }),
      (_code, { self }) =>
        self.form === 'jammed'
          ? [
              {
                key: `${self.id}:unjam`,
                label: 'ability.clearJam',
                params: { card: cardName(code) },
                actions: 1,
                provokes: true,
                costs: [],
                then: [{ type: 'SetAssetForm', asset: self.id, form: 'ready' }],
              },
            ]
          : [],
    )
    return true
  }
  // Flamethrower: spend 1 ammo; the target must be the engaged enemy with the highest fight;
  // +4 [combat]; success lets you assign up to 4 damage (plus any additional damage) among
  // the enemies engaged with you, instead of the standard damage.
  if (code === '04305') {
    const from = source(code, ['Item', 'Weapon', 'Firearm'])
    registerPlayerCard({
      code,
      abilities: (s, self, by) => {
        if (self.uses < 1) return []
        const engaged = engagedEnemies(s, by)
        const highest = Math.max(...engaged.map((e) => e.fight))
        return engaged
          .filter((e) => e.fight === highest && !attackBlocked(s, by, e, code))
          .map((e) => ({
            key: `${self.id}:fight:${e.id}`,
            label: 'ability.fightWith',
            params: { card: cardName(code), enemy: e.name },
            actions: 1,
            actionKind: 'fight' as const,
            target: { type: 'enemy' as const, id: e.id },
            provokes: false,
            costs: [{ type: 'SpendUses' as const, asset: self.id, amount: 1 }],
            then: [
              {
                type: 'BeginSkillTest' as const,
                investigator: by,
                skill: 'combat' as const,
                difficulty: e.fight,
                modifier: 4,
                source: self.id,
                kind: {
                  type: 'fight' as const,
                  enemy: e.id,
                  noDamage: true,
                  onSuccess: [continuation(code, by, 'assign', { assigned: '{}' })],
                },
              },
            ],
          }))
      },
      effect: (s, by, _step, data) => {
        const assigned = JSON.parse(String(data!.assigned)) as Record<string, number>
        const left = data!.left === undefined ? 4 + additional(s) : Number(data!.left)
        const apply = (): Message[] => [
          ...Object.entries(assigned).map(([enemy, amount]): Message => ({
            type: 'DamageEnemy',
            enemy,
            amount,
            by,
            source: from,
            deferDefeat: true,
          })),
          ...Object.keys(assigned).map((enemy): Message => ({
            type: 'CheckEnemyDefeat',
            enemy,
            by,
          })),
        ]
        const engaged = engagedEnemies(s, by)
        if (left <= 0 || !engaged.length) return apply()
        return ask(
          by,
          [
            ...engaged.map((e) => ({
              label: 'choice.flameAssign',
              params: { enemy: e.name, n: left },
              target: { type: 'enemy' as const, id: e.id },
              then: [
                continuation(code, by, 'assign', {
                  assigned: JSON.stringify({ ...assigned, [e.id]: (assigned[e.id] ?? 0) + 1 }),
                  left: left - 1,
                }),
              ],
            })),
            { label: 'choice.flameDone', then: apply() },
          ],
          true,
        )
      },
    })
    return true
  }
  return false
}
