import { availableActions, createGame, skillTestValue, type ScenarioDefinition } from '@lcg/engine'
import { during, keep, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import '../index'
import { theMiskatonicMuseum, M } from './the-miskatonic-museum'
import { museumSpecific } from './museum-helpers'
import { bloodOnTheAltar, B } from './blood-on-the-altar'
import { undimensionedAndUnseen } from './undimensioned-and-unseen'
import { whereDoomAwaits } from './where-doom-awaits'
import { theHouseAlwaysWins } from './the-house-always-wins'
import { avianThrall, thug, HOUSE_SETS } from './house-encounters'
import { H } from './house-codes'

function game(scenario: ScenarioDefinition) {
  return throughSetup(
    createGame({
      seed: 11,
      interactive: true,
      scenario: { ...scenario, setup: [], chaosBag: [0] },
      investigators: [testInvestigator('a', { health: 30, sanity: 30 })],
    }),
  )
}

// Printed cards 02119b/02120b; RR: Agenda Deck, Search.
it.each([0, 1])('shuffles the discard with a live Horror on museum agenda %i', (agendaIndex) => {
  let s = during(
    game(theMiskatonicMuseum()),
    keep,
    museumSpecific('museumSpawn', { location: M.halls }),
  )
  const discarded = s.encounterDeck.find((c) => c.code !== M.horror)!
  s = during(
    s,
    (x) => ({
      ...x,
      agendaIndex,
      encounterDeck: x.encounterDeck.filter((c) => c !== discarded),
      encounterDiscard: [discarded],
    }),
    { type: 'AdvanceAgenda' },
  )
  expect(s.encounterDiscard).toHaveLength(0)
  expect(s.encounterDeck).toContainEqual(discarded)
  expect(Object.values(s.enemies)[0]?.doom).toBe(1)
})

// Printed card 02138; RR: Skill Tests, Modifiers.
it.each(['intellect', 'willpower', 'agility'] as const)(
  'Harold only boosts intellect: %s',
  (skill) => {
    const s = during(
      game(theMiskatonicMuseum()),
      keep,
      { type: 'PutAssetIntoPlay', investigator: 'a', code: M.harold },
      {
        type: 'BeginSkillTest',
        investigator: 'a',
        skill,
        difficulty: 3,
        kind: { type: 'investigate', location: M.entrance },
      },
    )
    expect(skillTestValue(s).total).toBe(
      s.investigators[0]!.skills[skill] + (skill === 'intellect' ? 2 : 0),
    )
  },
)

// Printed card 02094; RR: Fight, Modifiers. All three consumers of Beast-thralls.
it.each(
  [theHouseAlwaysWins(), undimensionedAndUnseen(), whereDoomAwaits()].flatMap((scenario) =>
    [
      { source: '01016', difficulty: 2 },
      { source: '01060', difficulty: 2 },
      { source: '06201', difficulty: 5 },
      { source: H.morgan, difficulty: 5 },
    ].map((test) => ({ ...test, scenario, id: scenario.id })),
  ),
)(
  'applies Avian Thrall weapon modifiers in $id with $source',
  ({ scenario, source, difficulty }) => {
    let s = game(scenario)
    s = during(s, keep, {
      type: 'SpawnEnemy',
      card: avianThrall,
      location: s.investigators[0]!.location!,
      engageWith: 'a',
    })
    const enemy = Object.values(s.enemies)[0]!.id
    s = during(s, keep, {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'combat',
      source,
      difficulty: 5,
      kind: { type: 'fight', enemy, extraDamage: 0 },
    })
    expect(s.skillTest?.difficulty).toBe(difficulty)
  },
)

// Printed card 02097; RR: Cannot. Naomi's Crew is also used in Blood on the Altar.
it('blocks both resource actions and effect gains with an engaged thug in Blood', () => {
  let s = game(bloodOnTheAltar())
  s = during(s, keep, { type: 'SpawnEnemy', card: thug, location: B.commons, engageWith: 'a' })
  expect(availableActions(s, 'a').some((a) => a.kind === 'resource')).toBe(false)
  const resources = s.investigators[0]!.resources
  s = during(s, keep, { type: 'GainResources', investigator: 'a', amount: 2 })
  expect(s.investigators[0]!.resources).toBe(resources)
})

// Printed card 02099; RR: Move, Enemy Attacks.
it('Hunted Down moves and attacks with Naomi criminals in Blood', () => {
  let s = game(bloodOnTheAltar())
  s = during(
    s,
    keep,
    { type: 'PutLocationIntoPlay', location: B.brookHorror },
    { type: 'SpawnEnemy', card: thug, location: B.brookHorror, engageWith: null },
    {
      type: 'ResolveEncounterCard',
      investigator: 'a',
      card: HOUSE_SETS.naomi.find((c) => c.code === H.hunted)!,
    },
  )
  expect(Object.values(s.enemies)[0]?.location).toBe(B.commons)
  expect(s.investigators[0]!.damage).toBe(2)
})
