// RR: Equipment Slots (restricted slots), Limit X per investigator.
import { playableCards } from '@lcg/engine'
import { expect, it } from 'vitest'
import { patch } from '../dunwich-pilot/testing'
import { game, holding, owned, put } from './testing'

it('holds two Science and/or Tool assets, but no other hand asset', () => {
  // Knife fills a regular hand; Flashlight (Tool) and Forensic Kit (Science, Tool) use the grant.
  let s = put(holding('11044', '01086', '01086', '01087'), '11036')
  expect(s.pending).toBeNull()
  expect(owned(s)).toEqual(['01086', '01086', '01087', '11036', '11044'])
  s = put(holding('11044', '01086', '01086', '01087', '11036'), '01087')
  expect(s.pending!.question.prompt).toBe('prompt.freeSlot')
  s = put(holding('11044', '01086', '01086'), '01086')
  expect(s.pending!.question.prompt).toBe('prompt.freeSlot')
})

it('is limited to one per investigator', () => {
  const s = patch({ hand: ['11044'], resources: 10 })(holding('11044'))
  expect(playableCards(s, 'a', false)).not.toContain('11044')
  expect(playableCards(patch({ hand: ['11044'], resources: 10 })(game()), 'a', false)).toContain(
    '11044',
  )
  expect(owned(put(holding('11044'), '11044'))).toEqual(['11044'])
})
