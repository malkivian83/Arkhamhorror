// RR: Customizable, Uses, Initiating abilities, Skill Tests. Telescanner FAQ (17 March 2023).
import { dispatch, playerCardBehavior, type GameState, type SkillType } from '@lcg/engine'
import { choose, ghoul, labels, spawnAt } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { clear, makeGame, withStella, stella, STELLA, through } from '../stella-clark/testing'
import './index'

const CODE = '09119'
const asset = (s: GameState) => Object.values(s.assets).find((a) => a.code === CODE)!
function ready(sheet: Record<string, number>, form: string) {
  let s = withStella(clear(makeGame(false, [0])), {
    hand: [],
    resources: 8,
    customizations: { [CODE]: sheet },
  })
  s = dispatch(s, { type: 'PutAssetIntoPlay', investigator: STELLA, code: CODE })
  if (s.pending) s = choose(s, `customization.${form}`)
  return clear(s)
}
function manifest(s: GameState) {
  const a = asset(s)
  const ability = playerCardBehavior(CODE)!.abilities!(s, a, STELLA).find((a) =>
    a.key.endsWith(':manifest'),
  )!
  expect(ability.actions).toBe(1)
  return dispatch(clear(s), ...(ability.costs ?? []), ...ability.then)
}

it('incomplete upgrades unlock no form; six aether require all four Link boxes', () => {
  const s = ready({ railshooter: 1, aethericLink: 3 }, 'railshooter')
  expect(asset(s).uses).toBe(4)
  expect(playerCardBehavior(CODE)!.abilities!(s, asset(s), STELLA)).toEqual([])
  expect(asset(ready({ railshooter: 2, aethericLink: 4 }, 'railshooter')).uses).toBe(6)
})

it('changing unlocked forms exhausts the asset; Manifest still works while exhausted', () => {
  let s = ready({ railshooter: 2, telescanner: 2 }, 'railshooter')
  const option = playerCardBehavior(CODE)!.abilities!(s, asset(s), STELLA).find((a) =>
    a.key.endsWith(':form'),
  )!
  s = dispatch(s, ...(option.costs ?? []), ...option.then)
  s = choose(s, 'customization.telescanner')
  expect(asset(s).exhausted).toBe(true)
  expect(playerCardBehavior(CODE)!.abilities!(s, asset(s), STELLA).map((a) => a.key)).toEqual([
    asset(s).id + ':manifest',
  ])
})

it.each(['willpower', 'intellect', 'combat', 'agility'])(
  'Railshooter can fight with %s and the last aether still resolves',
  (skill) => {
    let s = ready({ railshooter: 2, empoweredConfiguration: 4 }, 'railshooter')
    s = dispatch(s, spawnAt('A', { ...ghoul, health: 10 }, STELLA))
    const enemy = Object.keys(s.enemies)[0]!
    const id = asset(s).id
    s = { ...s, assets: { ...s.assets, [id]: { ...asset(s), uses: 1 } } }
    s = manifest(s)
    s = choose(s, 'choice.enemy')
    s = choose(s, `skill.${skill}`)
    s = through(s, 'choice.revealToken')
    expect(s.assets[id]).toBeUndefined()
    expect(stella(s).discard).toContain(CODE)
    expect(s.enemies[enemy]!.damageTaken).toBe(2)
    expect(s.log.findLast((e) => e.key === 'log.testSuccess')?.params?.value).toBe(
      stella(s).skills[skill as SkillType] + 2,
    )
  },
)

it('Telescanner sends its clue elsewhere but Deduction still discovers locally', () => {
  let s = ready({ telescanner: 2 }, 'telescanner')
  s = withStella(s, { hand: ['01039'] })
  s = { ...s, locations: { ...s.locations, B: { ...s.locations.B!, revealed: true, clues: 1 } } }
  const local = s.locations.A!.clues
  s = manifest(s)
  s = choose(s, 'skill.intellect')
  s = choose(s, 'choice.commit', { card: 'Deduction' })
  if (labels(s).includes('choice.revealToken')) s = choose(s, 'choice.revealToken')
  s = choose(s, 'choice.discoverAt', { location: 'Room B' })
  s = through(s)
  expect(stella(s).clues).toBe(2)
  expect(s.locations.A!.clues).toBe(local - 1)
  expect(s.locations.B!.clues).toBe(0)
})

it.each(['Before', 'After'])('Translocator moves a non-Elite enemy %s its attempt', (when) => {
  let s = ready({ translocator: 2 }, 'translocator')
  s = dispatch(s, spawnAt('A', ghoul, STELLA))
  const enemy = Object.keys(s.enemies)[0]!
  s = manifest(s)
  s = choose(s, 'choice.enemy')
  s = choose(s, 'skill.agility')
  s = choose(s, `choice.shotcaster${when}`)
  if (labels(s).includes('choice.revealToken')) s = choose(s, 'choice.revealToken')
  s = choose(s, 'choice.shotcasterMoveEnemy')
  s = through(s, 'choice.revealToken')
  expect(s.enemies[enemy]!.location).toBe('B')
  expect(s.enemies[enemy]!.exhausted).toBe(true)
})

it('Realitycollapser removes a valid treachery and excludes weaknesses and Elite attachments', () => {
  let s = ready({ realitycollapser: 2 }, 'realitycollapser')
  s = dispatch(s, spawnAt('A', { ...ghoul, traits: ['Elite'] }, STELLA))
  const elite = Object.keys(s.enemies)[0]!
  s = {
    ...s,
    treacheries: {
      target: {
        id: 'target',
        code: 'test-curse',
        kind: 'treachery',
        name: 'Curse',
        keywords: [],
        placement: { type: 'threatArea', investigator: STELLA },
      },
      weakness: {
        id: 'weakness',
        code: '60504',
        kind: 'treachery',
        name: 'Weakness',
        owner: STELLA,
        keywords: [],
        placement: { type: 'threatArea', investigator: STELLA },
      },
      attached: {
        id: 'attached',
        code: 'test-attached',
        kind: 'treachery',
        name: 'Attached',
        keywords: [],
        placement: { type: 'enemy', enemy: elite },
      },
    },
  }
  s = manifest(s)
  s = choose(s, 'skill.agility')
  expect(s.pending!.question.choices).toHaveLength(1)
  s = choose(s, 'choice.groupedTreachery', { card: 'Curse' })
  s = through(s)
  expect(s.treacheries.target).toBeUndefined()
  expect(s.treacheries.weakness).toBeDefined()
  expect(s.treacheries.attached).toBeDefined()
})

it('Matterweaver plays a chosen asset without paying its resource cost', () => {
  let s = withStella(ready({ matterweaver: 2 }, 'matterweaver'), { hand: ['60505'], resources: 0 })
  s = manifest(s)
  s = choose(s, 'choice.card', { card: '.18 Derringer' })
  s = through(choose(s, 'skill.agility'), 'choice.revealToken')
  expect(stella(s).resources).toBe(0)
  expect(stella(s).hand).toEqual([])
  expect(Object.values(s.assets).some((a) => a.code === '60505')).toBe(true)
})

it('Matterweaver failure keeps the chosen card in hand and still spends the aether', () => {
  let s = withStella(ready({ matterweaver: 2 }, 'matterweaver'), { hand: ['60505'], resources: 0 })
  s = { ...s, chaosBag: ['autoFail'] }
  s = manifest(s)
  s = choose(s, 'choice.card', { card: '.18 Derringer' })
  s = through(choose(s, 'skill.agility'), 'choice.revealToken')
  expect(stella(s).hand).toContain('60505')
  expect(stella(s).resources).toBe(0)
  expect(asset(s).uses).toBe(3)
  expect(Object.values(s.assets).some((a) => a.code === '60505')).toBe(false)
})

it('Scavenging can replay Shotcaster discarded by its last aether during that investigation', () => {
  let s = ready({ telescanner: 2, empoweredConfiguration: 4 }, 'telescanner')
  s = dispatch(s, { type: 'PutAssetIntoPlay', investigator: STELLA, code: '06332' })
  const old = asset(s).id
  s = { ...s, assets: { ...s.assets, [old]: { ...asset(s), uses: 1 } } }
  s = manifest(s)
  s = choose(s, 'skill.agility')
  s = choose(s, 'ability.scavenging2')
  s = choose(s, 'choice.card', { card: 'Hyperphysical Shotcaster' })
  s = choose(s, 'choice.playFromDiscard')
  s = choose(s, 'customization.telescanner')
  s = through(s)
  expect(s.assets[old]).toBeUndefined()
  expect(asset(s).id).not.toBe(old)
  expect(asset(s).uses).toBe(4)
  expect(asset(s).customization).toEqual({ telescanner: 2, empoweredConfiguration: 4 })
  expect(stella(s).resources).toBe(4)
})
