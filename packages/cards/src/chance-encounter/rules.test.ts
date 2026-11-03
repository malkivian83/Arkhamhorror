// RR: Put into Play, Ownership and Control, Delayed Effects, Signature Cards, X.
import { expect, it } from 'vitest'
import { dispatch, playerCardBehavior, type GameState } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'
import './index'
const start = (code = '02270') =>
  patch({ hand: [code], resources: 10, deck: ['01088', '01089', '01090'], discard: [] })(
    patch(
      { discard: ['01018'], location: 'C' },
      'b',
    )({ ...game(['a', 'b']), pending: null, queue: [] }),
  )
const play = (s: GameState, code = '02270', x?: number) =>
  dispatch(s, { type: 'PlayCard', investigator: 'a', code, ...(x !== undefined ? { x } : {}) })
const assets = (s: GameState) => Object.values(s.assets)
it('level 0 borrows a distant investigator’s ally, discards only that instance at round end, and returns it to its owner', () => {
  let s = play(start())
  const ally = assets(s)[0]!
  expect(ally).toMatchObject({
    code: '01018',
    owner: 'a',
    originalOwner: 'b',
    damage: 0,
    horror: 0,
  })
  expect(s.investigators[1]!.discard).toEqual([])
  expect(me(s).resources).toBe(9)
  s = dispatch(JSON.parse(JSON.stringify(s)) as GameState, { type: 'EndOfRound' })
  expect(assets(s)).toEqual([])
  expect(s.investigators[1]!.discard).toEqual(['01018'])
  expect(s.endOfRound).toEqual([])
})
it('a replacement copy is not discarded by the temporary ally’s old delayed effect', () => {
  let s = play(start())
  const id = assets(s)[0]!.id
  s = dispatch(s, { type: 'ReturnAssetToHand', asset: id })
  s = dispatch(s, { type: 'PutAssetIntoPlay', investigator: 'b', code: '01018', fromHand: true })
  const next = assets(s)[0]!.id
  expect(next).not.toBe(id)
  s = dispatch(s, { type: 'EndOfRound' })
  expect(s.assets[next]).toBeDefined()
})
it('level 2 pays the ally’s printed cost, ignores distance, and retains the ally across rounds', () => {
  let s = play(start('03238'), '03238', 4)
  const id = assets(s)[0]!.id
  expect(me(s).resources).toBe(6)
  expect(s.endOfRound).toBeUndefined()
  s = dispatch(s, { type: 'EndOfRound' })
  expect(s.assets[id]).toMatchObject({ code: '01018', originalOwner: 'b' })
})
it('level 2 only offers X values belonging to eligible allies, including low-cost allies', () => {
  const s = patch({ discard: ['01076', '01018', '01093'] }, 'b')(start('03238'))
  expect(playerCardBehavior('03238')!.xOptions!(s, 'a').sort()).toEqual([1, 4])
  expect(playerCardBehavior('03238')!.play!(s, 'a', 3)).toEqual([])
  const zero = play(s, '03238', 1)
  expect(me(zero).resources).toBe(9)
  expect(assets(zero)[0]!.code).toBe('01076')
})
it('puts allies into play with their entry reactions, without triggering after-play reactions', () => {
  let s = patch({ discard: ['02020'] }, 'b')(start())
  s = play(s)
  const option = s.pending?.question.choices.find((c) => c.label !== 'choice.skip')
  expect(option).toBeDefined()
  s = choose(s, option!.label, option!.params ?? {})
  expect(me(s).hand).toHaveLength(2)
})
it.each(['02270', '03238'])(
  '%s excludes unique allies already in play, weaknesses, non-allies and foreign signatures',
  (code) => {
    for (const discard of [['01093'], ['02015'], ['02014']]) {
      const s = patch({ discard }, 'b')(start(code))
      expect(playerCardBehavior(code)!.canPlay!(s, 'a')).toBe(false)
    }
    const s = withAsset(patch({ discard: ['01033'] }, 'b')(start(code)), '01033')
    expect(playerCardBehavior(code)!.canPlay!(s, 'a')).toBe(false)
  },
)
it('Pete can recover his own Duke while another investigator cannot control him', () => {
  const s = start()
  const pete = {
    ...s,
    investigators: s.investigators.map((i) =>
      i.id === 'a' ? { ...i, id: '02005', discard: ['02014'] } : { ...i, discard: [] },
    ),
  }
  expect(playerCardBehavior('02270')!.canPlay!(pete, '02005')).toBe(true)
})
it('leaves the discard intact if entry is invalid or the chosen copy has disappeared', () => {
  let s = withAsset(patch({ discard: ['01033'] }, 'b')(start()), '01033')
  s = dispatch(s, { type: 'PutAssetIntoPlay', investigator: 'a', code: '01033', fromDiscard: 'b' })
  expect(s.investigators[1]!.discard).toEqual(['01033'])
  const empty = dispatch(start(), {
    type: 'PutAssetIntoPlay',
    investigator: 'a',
    code: '01033',
    fromDiscard: 'a',
  })
  expect(assets(empty)).toEqual([])
})
