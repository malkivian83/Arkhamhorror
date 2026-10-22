import {
  enemiesAt,
  getInvestigator,
  getLocation,
  investigatorsAt,
  registerPlayerCard,
  type Message,
} from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'

// RR: Damage, Simultaneous effects, Defeat. Enemy damage is placed first with
// its defeat deferred, investigators take theirs, then enemy defeats are checked.
function blast(s: Parameters<typeof getInvestigator>[0], by: string, location: string) {
  const enemies = enemiesAt(s, location)
  return [
    ...enemies.map((e): Message => ({
      type: 'DamageEnemy',
      enemy: e.id,
      amount: 3,
      by,
      deferDefeat: true,
    })),
    ...investigatorsAt(s, location).map((i): Message => ({
      type: 'TakeDamage',
      investigator: i.id,
      damage: 3,
      horror: 0,
    })),
    ...enemies.map((e): Message => ({ type: 'CheckEnemyDefeat', enemy: e.id, by })),
  ]
}

registerPlayerCard({
  code: '01024',
  canPlay: (s, by) => getInvestigator(s, by).location !== null,
  play: (s, by) => {
    const here = getInvestigator(s, by).location
    if (here === null) return []
    return ask(
      by,
      [here, ...getLocation(s, here).connections.filter((id) => s.locations[id])].map((id) => ({
        label: 'choice.dynamiteLocation',
        params: { location: s.locations[id]!.name },
        target: { type: 'location' as const, id },
        then: blast(s, by, id),
      })),
      true,
    )
  },
})
