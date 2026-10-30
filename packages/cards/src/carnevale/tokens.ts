import {
  distancesFrom,
  getInvestigator,
  placedLocation,
  push,
  type Message,
  type ScenarioBehavior,
} from '@lcg/engine'
import { C } from './codes'
import { onSpecific, rescued, sacrificed, specific } from './helpers'

export const tokenEffect: NonNullable<ScenarioBehavior['tokenEffect']> = (
  s,
  token,
  investigator,
) => {
  const hard = s.difficulty === 'hard' || s.difficulty === 'expert'
  if (token === 'skull')
    return { modifier: -2 - sacrificed(s).length - (hard ? rescued(s).length : 0) }
  if (token === 'cultist')
    return {
      modifier: 0,
      revealAnother: true,
      onFail: [{ type: 'DrawEncounterCard', investigator }],
    }
  if (token === 'tablet')
    return {
      modifier: hard ? -4 : -3,
      ...(hard
        ? { immediate: [specific('carnevaleTablet', { investigator })] }
        : { onFail: [specific('carnevaleTablet', { investigator })] }),
    }
  const boss = Object.values(s.enemies).find((e) => e.code === C.cnidathqua)
  return {
    modifier: hard ? -6 : -4,
    onFail: boss
      ? [
          {
            type: 'EnemyAttack',
            enemy: boss.id,
            investigator,
            exhaustAfter: false,
            evenIfExhausted: true,
          },
        ]
      : [],
  }
}
onSpecific('carnevaleTablet', (s, data) => {
  const investigator = String(data.investigator),
    from = getInvestigator(s, investigator).location
  if (!from) return s
  const distances = distancesFrom(s, from)
  const candidates = [
    ...Object.values(s.assets)
      .filter((a) => a.code === C.innocent)
      .map((a) => ({ id: a.id, placed: false, location: getInvestigator(s, a.owner).location })),
    ...Object.values(s.placedAssets ?? {})
      .filter((p) => p.code === C.innocent)
      .map((p) => ({ id: p.id, placed: true, location: placedLocation(s, p) })),
  ].filter((a) => a.location && distances.has(a.location))
  const nearest = Math.min(...candidates.map((a) => distances.get(a.location!)!))
  const targets = candidates.filter((a) => distances.get(a.location!) === nearest)
  if (!targets.length) return s
  return push(s, {
    type: 'Ask',
    investigator,
    question: {
      kind: 'chooseOne',
      prompt: 'prompt.carnevale.tablet',
      choices: targets.flatMap((a) =>
        (['damage', 'horror'] as const).map((kind) => ({
          label:
            kind === 'damage'
              ? 'choice.carnevale.innocentDamage'
              : 'choice.carnevale.innocentHorror',
          target: { type: a.placed ? ('placed' as const) : ('asset' as const), id: a.id },
          then: [
            a.placed
              ? {
                  type: 'DamagePlacedAsset',
                  placed: a.id,
                  damage: kind === 'damage' ? 1 : 0,
                  horror: kind === 'horror' ? 1 : 0,
                }
              : {
                  type: 'DamageAsset',
                  asset: a.id,
                  damage: kind === 'damage' ? 1 : 0,
                  horror: kind === 'horror' ? 1 : 0,
                },
          ] as Message[],
        })),
      ),
    },
  })
})
