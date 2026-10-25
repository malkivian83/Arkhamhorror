import {
  createGame,
  enemyHasKeyword,
  registerScenario,
  type EncounterCard,
  type Enemy,
  type GameState,
} from '@lcg/engine'
import { testInvestigator, testScenario, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import {
  adjustAlarm,
  alarmOf,
  changeIcon,
  checkIcons,
  checkedIcons,
  halfAlarm,
  highestAlarm,
  swapIcons,
} from './check'
import {
  colorOf,
  formatIcon,
  iconOf,
  mostOfARank,
  parseIcon,
  sameSuit,
  sequential,
  totalValue,
  valueOf,
} from './icons'

const icons = (...texts: string[]) => texts.map(parseIcon)
const card = (code: string): EncounterCard => ({
  kind: 'treachery',
  code,
  name: code,
  keywords: [],
})

function table(deck: string[], discard: string[] = []): GameState {
  const s = throughSetup(
    createGame({
      seed: 3,
      scenario: testScenario(),
      investigators: [testInvestigator('a'), testInvestigator('b')],
    }),
  )
  return { ...s, encounterDeck: deck.map(card), encounterDiscard: discard.map(card) }
}

describe('Fortune and Folly: game icons', () => {
  it('reads the printed icon of each card', () => {
    expect(iconOf('88035a')).toEqual({ suit: '♣', rank: 'Q' })
    expect(iconOf('88035c')).toEqual({ suit: '♥', rank: 10 })
    expect(iconOf('88001')).toBeNull()
    expect(formatIcon(parseIcon('♦J'))).toBe('♦J')
    expect(() => parseIcon('★3')).toThrow()
  })

  it('values face cards at 10 and colours hearts and diamonds red', () => {
    expect(valueOf('K')).toBe(10)
    expect(valueOf(7)).toBe(7)
    expect(colorOf('♦')).toBe('red')
    expect(colorOf('♠')).toBe('black')
    expect(totalValue(icons('♠Q', '♥5', '♦J'))).toBe(25)
  })

  it('finds sequential values, a single suit and repeated ranks', () => {
    expect(sequential(icons('♠9', '♥J', '♦10'))).toBe(true)
    expect(sequential(icons('♠9', '♥Q'))).toBe(false)
    expect(sequential(icons('♠9', '♥9'))).toBe(false)
    expect(sameSuit(icons('♠9', '♠4'))).toBe(true)
    expect(sameSuit(icons('♠9', '♣4'))).toBe(false)
    expect(mostOfARank(icons('♠9', '♣9', '♥9', '♦4'))).toBe(3)
  })
})

describe('Fortune and Folly: checking game icons', () => {
  it('sets aside cards without an icon and replaces them', () => {
    const s = checkIcons(table(['88001', '88035a', '88036a', '88037a']), 2)
    expect(s.scenarioMeta?.['fof:checked']).toBe('♣Q,♥9')
    expect(s.encounterDeck.map((c) => c.code)).toEqual(['88037a'])
    expect(s.encounterDiscard.map((c) => c.code)).toEqual(['88001', '88035a', '88036a'])
  })

  it('reshuffles the discard pile without the cards already checked', () => {
    const s = checkIcons(table(['88035a'], ['88036a']), 2)
    expect(checkedIcons(s).map(formatIcon)).toEqual(['♣Q', '♥9'])
    expect(s.encounterDeck).toEqual([])
  })

  it('swaps chosen cards for new ones and lets the Grifter change an icon', () => {
    let s = checkIcons(table(['88035a', '88036a', '88037a', '88038a']), 2)
    s = swapIcons(s, [0])
    expect(checkedIcons(s).map(formatIcon)).toEqual(['♥9', '♥Q'])
    expect(s.encounterDiscard.map((c) => c.code)).toEqual(['88035a', '88036a', '88037a'])
    s = changeIcon(s, 1, parseIcon('♠4'))
    expect(checkedIcons(s).map(formatIcon)).toEqual(['♥9', '♠4'])
  })
})

describe('Fortune and Folly: alarm level', () => {
  it('starts at 1 and stays between 1 and 10', () => {
    let s = table([])
    expect(alarmOf(s, 'a')).toBe(1)
    let r = adjustAlarm(s, 'a', 12)
    expect(r.raised).toBe(9)
    s = r.state
    expect(alarmOf(s, 'a')).toBe(10)
    expect(halfAlarm(s, 'a')).toBe(5)
    r = adjustAlarm(s, 'a', -20)
    expect(alarmOf(r.state, 'a')).toBe(1)
    expect(r.raised).toBe(0)
    expect(highestAlarm(adjustAlarm(s, 'b', 2).state)).toBe(10)
    expect(highestAlarm(s, ['b'])).toBe(1)
  })
})

registerScenario({
  id: 'test-keyword',
  enemyKeyword: (_s, enemy, keyword) =>
    keyword === 'aloof' && enemy.code === 'lose' ? false : keyword === 'hunter' ? true : null,
})

describe('scenario keyword changes', () => {
  it('lets a scenario add or remove enemy keywords', () => {
    const s = { ...table([]), scenarioId: 'test-keyword' }
    const enemy = { code: 'lose', id: 'e', keywords: ['aloof'] } as unknown as Enemy
    expect(enemyHasKeyword(s, enemy, 'aloof')).toBe(false)
    expect(enemyHasKeyword(s, { ...enemy, code: 'keep' }, 'aloof')).toBe(true)
    expect(enemyHasKeyword(s, enemy, 'hunter')).toBe(true)
  })
})
