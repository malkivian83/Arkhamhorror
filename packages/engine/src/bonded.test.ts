// RR: Bonded (FAQ v1.7) and Set Aside; player cards kept out of play per investigator.
import { expect, it } from 'vitest'
import { bondedCardsFor, setAsideCards } from './bonded'
import { registerPlayerCard, registerPlayerCards } from './content'
import { dispatch } from './engine'
import { newTestGame } from './testing'
import type { GameState, PlayerCardDef } from './types'

const card = (code: string, extra: Partial<PlayerCardDef> = {}): PlayerCardDef => ({
  code,
  name: code,
  type: 'asset',
  class: 'neutral',
  traits: [],
  cost: 0,
  ...extra,
})
registerPlayerCards([
  card('bond-summoner', { bonded: [{ code: 'bond-event', count: 3 }] }),
  card('bond-upgrade', { xp: 3, bonded: [{ code: 'bond-event', count: 3 }] }),
  card('bond-event', { type: 'event', bondedCard: true }),
  card('bond-leaver', { bonded: [{ code: 'bond-event', count: 3 }] }),
  card('bond-skill', { type: 'skill', bondedCard: true }),
])
registerPlayerCard({ code: 'bond-leaver', setsAsideBondedOnLeave: true })
registerPlayerCard({ code: 'bond-skill', setAsideInsteadOfDiscard: true })

const start = (deck: string[]) =>
  newTestGame({ investigator: { deck: [...deck, 'filler-1', 'filler-2'] } })
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const me = (s: GameState) => s.investigators[0]!

it('sets aside the product count once, even with several summoners or a bonded card listed', () => {
  expect(bondedCardsFor(['bond-summoner', 'bond-summoner', 'bond-upgrade'])).toEqual([
    'bond-event',
    'bond-event',
    'bond-event',
  ])
  const s = start(['bond-summoner', 'bond-event'])
  expect(me(s).outOfPlay).toEqual(['bond-event', 'bond-event', 'bond-event'])
  expect([...me(s).deck, ...me(s).hand]).not.toContain('bond-event')
  expect(start(['filler-0']).investigators[0]!.outOfPlay).toBeUndefined()
})

it('takes only available copies to hand or deck; only bonded cards when searching bonded', () => {
  let s = clear(start(['bond-summoner']))
  s = { ...s, investigators: [{ ...me(s), hand: [], outOfPlay: ['bond-event', 'x-aside'] }] }
  s = dispatch(s, {
    type: 'TakeSetAside',
    investigator: me(s).id,
    code: 'bond-event',
    count: 3,
    to: 'hand',
    bonded: true,
  })
  expect(me(s).hand).toEqual(['bond-event'])
  expect(setAsideCards(s, me(s).id, undefined, true)).toEqual([])
  s = dispatch(s, {
    type: 'TakeSetAside',
    investigator: me(s).id,
    code: 'x-aside',
    count: 1,
    to: 'deck',
    bonded: true,
  })
  expect(me(s).outOfPlay).toEqual(['x-aside'])
})

it('sets bonded cards aside when the summoner leaves play, and redirects set-aside skills', () => {
  let s = clear(start(['bond-leaver']))
  s = {
    ...s,
    investigators: [{ ...me(s), hand: ['bond-event', 'bond-skill'], outOfPlay: [] }],
    assets: {
      l: {
        id: 'l',
        code: 'bond-leaver',
        owner: me(s).id,
        exhausted: false,
        damage: 0,
        horror: 0,
        uses: 0,
      },
    },
  }
  s = dispatch(s, { type: 'DiscardAsset', asset: 'l' })
  expect(me(s).outOfPlay).toEqual(['bond-event'])
  s = dispatch(s, { type: 'DiscardFromHand', investigator: me(s).id, card: 'bond-skill' })
  expect(me(s).discard).toEqual(['bond-leaver'])
  expect(me(s).outOfPlay).toEqual(['bond-event', 'bond-skill'])
})
