import './index'
import {
  availableAbilities,
  dispatch,
  playerCardDef,
  playableCards,
  skillTestValue,
  type GameState,
} from '@lcg/engine'
import { choose, during, spawnAt, ghoul } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'

const sturdy = { ...ghoul, health: 10 }
const prepared = () =>
  during({ ...game(), interactive: true }, (s) =>
    withAsset(withAsset(patch({ hand: ['60163', '60163'] })(s), '01016'), '12020'),
  )
const play = (s: GameState) => choose(s, 'action.playFast', { card: 'Iron Sights' })
const sight = (s: GameState) => choose(s, 'ability.ironSights', { card: '.45 Automatic' })
const fight = (s: GameState, card = '.45 Automatic') => choose(s, 'ability.fightWith', { card })
const finish = (s: GameState) =>
  choose(choose({ ...s, chaosBag: [0] }, 'choice.revealToken'), 'choice.applyResults')
const ironSights = (s: GameState) =>
  availableAbilities(s, 'a').filter((a) => a.key.endsWith(':60163'))
// RR: Attachments, Exhaust, Attacks of Opportunity, Fight.
describe('Iron Sights', () => {
  it('attaches only to your own Firearm on your turn, at level 0 and cost 1', () => {
    const s = play(prepared())
    expect(playerCardDef('60163')).toMatchObject({ xp: 0, cost: 1, fast: true })
    expect(me(s).resources).toBe(4)
    expect(s.assets['01016']!.upgrades).toEqual([{ code: '60163', owner: 'a' }])
    expect(playableCards({ ...s, activeTurn: 'b' }, 'a', true)).not.toContain('60163')
    expect(playableCards(withAsset(s, '01016', { owner: 'b' }), 'a', true)).not.toContain('60163')
  })
  it('spends an action without provoking, exhausts and boosts the next fight with the host', () => {
    let s = during(play(prepared()), (x) => x, spawnAt('A', sturdy, 'a'))
    const health = me(s).damage
    s = sight(s)
    expect(me(s).actionsRemaining).toBe(2)
    expect(me(s).damage).toBe(health)
    expect(s.assets['01016']!.upgrades![0]!.exhausted).toBe(true)
    expect(ironSights(s)).toHaveLength(0)
    s = fight(s)
    // Base 3 combat, +1 from .45 Automatic, +3 from Iron Sights.
    expect(skillTestValue(s).total).toBe(7)
    s = finish(s)
    expect(s.assets['01016']!.nextFightBonus).toBeUndefined()
    expect(skillTestValue(fight(s)).total).toBe(4)
  })
  it('stacks two copies but does not boost another weapon', () => {
    let s = during(play(play(prepared())), (x) => x, spawnAt('A', sturdy, 'a'))
    s = sight(s)
    s = choose(s, 'ability.ironSights', { card: '.45 Automatic' })
    expect(skillTestValue(fight(s, 'Machete')).total).toBe(4)
    expect(skillTestValue(fight(s)).total).toBe(10)
  })
  it('expires at the end of the turn and readies in the upkeep phase', () => {
    let s = sight(play(prepared()))
    s = dispatch({ ...s, pending: null, queue: [] }, { type: 'EndTurn', investigator: 'a' })
    expect(s.assets['01016']!.nextFightBonus).toBeUndefined()
    expect(s.assets['01016']!.upgrades![0]!.exhausted).toBe(true)
    s = dispatch({ ...s, pending: null, queue: [] }, { type: 'ReadyAll' })
    expect(s.assets['01016']!.upgrades![0]!.exhausted).toBeUndefined()
  })
})
