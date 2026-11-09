// RR: Fight, Skill Tests, Dealing Damage, Enemy Attacks.
import { enemiesAt, getInvestigator, type Message } from '@lcg/engine'
import { registerBasicEvent } from '../basic-events/register'
import { continuation } from '../dunwich-pilot/effects'
import { BEND_BLOOD } from './codes'

/** "id:damageTaken" pairs: the enemies dealt damage are those whose damage grew. */
const snapshot = (pairs: (readonly [string, number])[]) =>
  pairs.map(([id, n]) => `${id}:${n}`).join(',')
const parse = (text: string) =>
  text
    .split(',')
    .filter(Boolean)
    .map((pair) => {
      const at = pair.lastIndexOf(':')
      return [pair.slice(0, at), Number(pair.slice(at + 1))] as const
    })

// Bend Blood: Fight ([willpower]). You get +3 [willpower] and deal +1 damage for this attack. If
// you succeed, deal 1 damage to each other enemy at your location. Each enemy dealt damage by
// Bend Blood cannot attack you for the remainder of the round.
registerBasicEvent(
  BEND_BLOOD,
  {
    action: 'fight',
    skill: 'willpower',
    modifier: 3,
    extraDamage: 1,
    tags: ['spell', 'cursed'],
    onSuccess: ({ investigator }, enemy) => [
      continuation(BEND_BLOOD, investigator, 'others', {
        target: snapshot([[enemy!.id, enemy!.damageTaken]]),
      }),
    ],
  },
  {
    effect: (s, by, step, data) => {
      const here = getInvestigator(s, by).location
      if (step === 'others') {
        const [target] = parse(String(data.target))
        const others = here === null ? [] : enemiesAt(s, here).filter((e) => e.id !== target?.[0])
        return [
          ...others.map((e): Message => ({
            type: 'DamageEnemy',
            enemy: e.id,
            amount: 1,
            by,
            source: { code: BEND_BLOOD },
          })),
          continuation(BEND_BLOOD, by, 'spare', {
            damaged: snapshot([
              ...parse(String(data.target)),
              ...others.map((e): [string, number] => [e.id, e.damageTaken]),
            ]),
          }),
        ]
      }
      if (step !== 'spare') return []
      return parse(String(data.damaged))
        .filter(([id, before]) => (s.enemies[id]?.damageTaken ?? before) > before)
        .map(([id]): Message => ({ type: 'SpareInvestigator', enemy: id, investigator: by }))
    },
  },
)
