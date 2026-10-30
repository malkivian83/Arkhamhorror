import {
  activeInvestigators,
  getInvestigator,
  leadInvestigator,
  push,
  registerEnemy,
  shuffle,
} from '@lcg/engine'
import { C } from './codes'
import { balefulReveler } from './data'
import { investigatorsAt, onSpecific, specific } from './helpers'
import { across, around, ring } from './topology'

registerEnemy({
  code: C.sentinel,
  spawn: (s, by) => {
    const location = getInvestigator(s, by).location
    const opposite = location ? across(ring(s), location) : null
    return opposite && s.locations[opposite] ? [opposite] : []
  },
})
registerEnemy({
  code: C.reveler,
  spawn: (s) => {
    const start = leadInvestigator(s)?.location
    if (!start) return []
    for (let n = 1; n <= 8; n++) {
      const l = around(ring(s), start, -n)
      if (l && s.locations[l] && !investigatorsAt(s, l).length) return [l]
    }
    return []
  },
  forced: (s, t, self) => {
    if (
      t.type !== 'afterHunterMove' ||
      t.enemy !== self.id ||
      s.scenarioMeta?.carnevaleRevelerRound === s.round
    )
      return []
    return [
      { type: 'SetScenarioMeta', key: 'carnevaleRevelerRound', value: s.round },
      specific('carnevaleRevelerToken', { enemy: self.id }),
    ]
  },
})
onSpecific('carnevaleRevelerToken', (s, data) => {
  const players = activeInvestigators(s)
  const chooser = leadInvestigator(s)
  if (!chooser) return s
  return push(s, {
    type: 'Ask',
    investigator: chooser.id,
    question: {
      kind: 'chooseOne',
      prompt: 'prompt.carnevale.revealWho',
      choices: players.map((i) => ({
        label: 'choice.investigator',
        params: { name: i.name },
        then: [
          {
            type: 'RevealTokenOutsideTest' as const,
            investigator: i.id,
            then: specific('carnevaleRevelerContinue', data),
          },
        ],
      })),
    },
  })
})
onSpecific('carnevaleRevelerContinue', (s, data) =>
  typeof data.token !== 'number' &&
  ['skull', 'cultist', 'tablet', 'elderThing', 'autoFail'].includes(String(data.token))
    ? push(s, { type: 'MoveHuntingEnemy', enemy: String(data.enemy) })
    : s,
)

registerEnemy({
  code: C.cnidathqua,
  fightFromAnywhere: true,
  assignFirst: { damage: C.innocent, horror: C.innocent },
  forced: (_s, t, self) =>
    t.type === 'afterSkillTest' && t.kind === 'fight' && t.enemy === self.id && !t.succeeded
      ? [specific('carnevaleFindAppendage', { investigator: t.investigator })]
      : [],
})
registerEnemy({
  code: C.appendage,
  forced: (_s, t, self) =>
    t.type === 'afterEnemyAttack' && t.enemy === self.id
      ? [{ type: 'DiscardRandomFromHand', investigator: t.investigator, amount: 1 }]
      : [],
})

onSpecific('carnevaleFindAppendage', (s, data) => {
  const by = String(data.investigator)
  const zones = (['encounterDeck', 'encounterDiscard'] as const).filter((zone) =>
    s[zone].some((c) => c.code === C.appendage),
  )
  if (!zones.length) {
    const [encounterDeck, rng] = shuffle(s.encounterDeck, s.rng)
    return { ...s, encounterDeck, rng }
  }
  return push(s, {
    type: 'Ask',
    investigator: by,
    question: {
      kind: 'chooseOne',
      prompt: 'prompt.carnevale.appendageSearch',
      choices: zones.map((zone) => ({
        label:
          zone === 'encounterDeck'
            ? 'choice.carnevale.searchDeck'
            : 'choice.carnevale.searchDiscard',
        then: [specific('carnevaleTakeAppendage', { investigator: by, zone })],
      })),
    },
  })
})
onSpecific('carnevaleTakeAppendage', (s, data) => {
  const zone = data.zone === 'encounterDiscard' ? 'encounterDiscard' : 'encounterDeck'
  const index = s[zone].findIndex((c) => c.code === C.appendage)
  const card = s[zone][index]
  if (!card) return s
  const next = { ...s, [zone]: s[zone].filter((_, i) => i !== index) }
  const [encounterDeck, rng] = shuffle(next.encounterDeck, next.rng)
  const by = String(data.investigator),
    location = getInvestigator(s, by).location
  return card.kind === 'enemy' && location
    ? push({ ...next, encounterDeck, rng }, { type: 'SpawnEnemy', card, location, engageWith: by })
    : s
})

/** Defeat windows also run after the defeated enemy has left state.enemies. */
export const enemyDefeatEffects: NonNullable<import('@lcg/engine').ScenarioBehavior['forced']> = (
  s,
  t,
) => {
  if (t.type !== 'enemyDefeated') return []
  if (t.enemy.code === C.cnidathqua)
    return [{ type: 'EndScenario', outcome: { type: 'resolution', resolution: 2 } }]
  const boss = Object.values(s.enemies).find((e) => e.code === C.cnidathqua)
  return t.enemy.code === C.appendage && boss
    ? [{ type: 'DamageEnemy', enemy: boss.id, amount: 1 }]
    : []
}

onSpecific('carnevaleReleaseReveler', (s) => {
  const index = s.setAside.findIndex((c) => c.code === C.reveler)
  const by = leadInvestigator(s)?.id
  return index < 0 || !by
    ? s
    : push(
        { ...s, setAside: s.setAside.filter((_, i) => i !== index) },
        { type: 'ResolveEncounterCard', investigator: by, card: balefulReveler },
      )
})
