// RR: Synergy, Limbo, Healing, Choose, Move and Attack of Opportunity.
import {
  allPlayerCardDefs,
  dispatch,
  getInvestigator,
  playableCards,
  playerCardDef,
  registerPlayerCards,
  registerScenario,
  registerEnemy,
  type GameState,
} from '@lcg/engine'
import { choose, during, spawnAt } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { holding } from '../basic-events/testing'
import { sturdy } from '../basic-abilities/testing'
import { me, patch, withAsset } from '../dunwich-pilot/testing'
import { controlledClassTypes } from '../synergy/classes'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard } from '../decks'
import './index'
const code = '08129'
const classes = ['rogue', 'guardian', 'seeker', 'mystic', 'survivor']
registerPlayerCards(
  classes.map((cls) => ({
    code: 'backup-' + cls,
    name: cls,
    class: cls,
    type: 'asset',
    traits: [],
    health: 3,
    sanity: 3,
  })),
)
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const labels = (s: GameState) => s.pending?.question.choices.map((c) => c.label) ?? []
const add = (s: GameState, cls: string) => withAsset(s, 'backup-' + cls)
const open = (cs: string[]) => cs.reduce(add, holding(code, { players: ['a', 'b'], enemy: null }))
const start = (s: GameState) =>
  choose(
    during(s, (x) => x),
    'action.play',
    { card: 'Call for Backup' },
  )
const select = (s: GameState, cls: string) => choose(s, 'choice.backup' + cls)
it('has no effect and is unplayable with no usable controlled class', () => {
  const s = open([])
  expect(playableCards(s, 'a', false)).not.toContain(code)
})
it('does not count the neutral resolving event, cards in hand or another owner', () => {
  let s = withAsset(open([]), 'backup-guardian', { owner: 'b' })
  s = patch({
    hand: [code, 'backup-seeker'],
    deck: ['backup-mystic'],
    discard: ['backup-survivor'],
  })(s)
  expect(controlledClassTypes(s, 'a')).toEqual([])
  expect(playableCards(s, 'a', false)).not.toContain(code)
})
it('pays one resource and action, discovers a clue and never repeats a class', () => {
  const before = open(['seeker'])
  let s = select(start(before), 'Seeker')
  s = select(s, 'Seeker')
  expect(me(s).resources).toBe(me(before).resources - 1)
  expect(me(s).actionsRemaining).toBe(me(before).actionsRemaining - 1)
  expect(me(s).clues).toBe(me(before).clues + 1)
  expect(me(s).discard).toContain(code)
  expect(labels(s)).not.toContain('choice.backupSeeker')
})
it('moves first, then recomputes the clue location and damage target including aloof enemies', () => {
  let s = open(['rogue', 'seeker', 'guardian'])
  s = during(s, (x) => x, spawnAt('B', { ...sturdy, keywords: ['aloof'] }, null))
  const e = Object.values(s.enemies)[0]!
  s = select(start(s), 'Rogue')
  s = choose(s, 'choice.pilotMove', { name: 'A', location: 'Room B' })
  expect(me(s).location).toBe('B')
  expect(labels(s)).not.toContain('choice.backupRogue')
  s = select(select(s, 'Seeker'), 'Seeker')
  expect(s.locations.B!.clues).toBe(0)
  s = choose(select(s, 'Guardian'), 'choice.enemy', { enemy: e.name })
  expect(s.enemies[e.id]!.damageTaken).toBe(1)
  expect(s.enemies[e.id]!.engagedWith).toBeNull()
})
it('permits any order and can stop without consuming remaining effects', () => {
  let s = patch({ damage: 2, horror: 2 })(open(['mystic', 'survivor']))
  s = choose(select(start(s), 'Survivor'), 'choice.healDamageOf', { name: 'A' })
  expect(me(s).damage).toBe(1)
  expect(labels(s)).toContain('choice.backupMystic')
  expect(labels(s)).not.toContain('choice.backupSurvivor')
  s = choose(s, 'choice.skip')
  expect(me(s).horror).toBe(2)
})
it('heals a remote investigator and another controller asset without range restrictions', () => {
  let s = patch({ location: 'C', horror: 2 }, 'b')(open(['mystic', 'survivor']))
  s = withAsset(s, 'backup-guardian', { owner: 'b', damage: 2 })
  s = choose(select(start(s), 'Mystic'), 'choice.healHorrorOf', { name: 'B' })
  expect(getInvestigator(s, 'b').horror).toBe(1)
  s = choose(select(s, 'Survivor'), 'choice.healDamageOf', { name: 'guardian' })
  expect(s.assets['backup-guardian']!.damage).toBe(1)
})
it('heals a face-up placed asset but excludes healthy and facedown cards and eliminated investigators', () => {
  let s = patch({ eliminated: true, damage: 2, horror: 2 }, 'b')(open(['mystic', 'survivor']))
  s = {
    ...s,
    placedAssets: {
      placed: {
        id: 'placed',
        code: 'backup-guardian',
        name: 'Placed',
        placement: { type: 'location', location: 'C' },
        exhausted: false,
        damage: 1,
        horror: 1,
      },
      hidden: {
        id: 'hidden',
        code: 'backup-guardian',
        name: 'Hidden',
        placement: { type: 'location', location: 'C' },
        faceDown: true,
        exhausted: false,
        damage: 1,
        horror: 1,
      },
    },
  }
  s = select(start(s), 'Mystic')
  expect(s.pending!.question.choices.map((c) => c.params?.name)).toEqual(['Placed'])
  s = choose(s, 'choice.healHorrorOf', { name: 'Placed' })
  s = choose(select(s, 'Survivor'), 'choice.healDamageOf', { name: 'Placed' })
  expect(s.placedAssets!.placed).toMatchObject({ damage: 0, horror: 0 })
})
it('preserves opportunity attacks and recomputes healing targets after their horror', () => {
  let s = holding(code, { players: ['a', 'b'], enemy: sturdy })
  s = add(add(s, 'guardian'), 'mystic')
  const before = me(s).damage
  s = start(s)
  while (
    s.pending?.question.prompt === 'prompt.assignDamage' ||
    s.pending?.question.prompt === 'prompt.assignHorror'
  )
    s = choose(s, 'choice.assignToInvestigator', { name: 'A' })
  expect(me(s).damage).toBeGreaterThan(before)
  expect(labels(s)).toContain('choice.backupMystic')
})
it('resumes a serialized multi-effect decision without repeating a used class', () => {
  let s = patch({ damage: 1, horror: 1 })(open(['mystic', 'survivor']))
  s = choose(select(start(s), 'Mystic'), 'choice.healHorrorOf', { name: 'A' })
  s = JSON.parse(JSON.stringify(s)) as GameState
  s = choose(select(s, 'Survivor'), 'choice.healDamageOf', { name: 'A' })
  expect(me(s)).toMatchObject({ damage: 0, horror: 0 })
  expect(labels(s)).not.toContain('choice.backupMystic')
})
it('rechecks current control rather than using a stale list between effects', () => {
  let s = patch({ damage: 1, horror: 1 })(open(['mystic', 'survivor']))
  s = select(start(s), 'Mystic')
  s = dispatch(clear(s), { type: 'DiscardAsset', asset: 'backup-survivor' })
  s = dispatch(clear(s), {
    type: 'PlayerCardEffect',
    code,
    investigator: 'a',
    step: 'choose',
    data: { used: 'mystic' },
  })
  expect(labels(s)).not.toContain('choice.backupSurvivor')
})
it('has one catalog/shop entry and starts in a legal upgraded deck', () => {
  expect(allPlayerCardDefs().filter((c) => c.code === code)).toHaveLength(1)
  expect(playerCardDef(code)!.xp).toBe(2)
  let c = newCampaign('brethren-of-ash', ['jenny'], 'easy')
  const id = c.investigators[0]!.id
  c.log.investigators[id]!.xp = 5
  expect(purchaseOptions(c, id).filter((o) => o.code === code)).toHaveLength(1)
  c = purchase(c, id, code, { remove: c.investigators[0]!.deck.find(isStandard)! })
  const i = startScenario(c, 3, false).investigators[0]!
  expect([...i.hand, ...i.deck, ...i.discard]).toContain(code)
})

it('excludes movement forbidden by the scenario and enemies immune to event damage', () => {
  registerScenario({ id: 'backup-blocked', canEnter: () => false, enemyImmune: () => true })
  let s = open(['rogue', 'guardian'])
  s = during(s, (x) => x, spawnAt('A', { ...sturdy, keywords: ['aloof'] }, null))
  s = { ...s, scenarioId: 'backup-blocked' }
  expect(playableCards(s, 'a', false)).not.toContain(code)
})
it('does not play if every enemy reduces this source damage to zero', () => {
  registerEnemy({ code: 'backup-protected', damageTaken: () => ({ amount: 0 }) })
  let s = open(['guardian'])
  s = during(
    s,
    (x) => x,
    spawnAt('A', { ...sturdy, code: 'backup-protected', keywords: ['aloof'] }, null),
  )
  expect(playableCards(s, 'a', false)).not.toContain(code)
})
