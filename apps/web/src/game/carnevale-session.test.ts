import { expect, it } from 'vitest'
import {
  addCarnevale,
  finishScenario,
  newCampaign,
  startScenario,
  currentScenario,
} from '@lcg/cards'
import { session, decodeSession } from './session'
import { fallbackCards } from './fallbackCards'
import { markOf } from './undo'
import { messages } from '@lcg/i18n'

it('round-trips the Carnevale interlude and resumes the original campaign position', () => {
  let c = newCampaign('night-of-the-zealot', ['daniela'], 'standard')
  c = finishScenario(c, {
    ...startScenario(c, 1, false),
    outcome: { type: 'resolution', resolution: 1 },
  })
  const id = c.investigators[0]!.id
  c = {
    ...c,
    log: {
      ...c.log,
      investigators: { ...c.log.investigators, [id]: { ...c.log.investigators[id]!, xp: 5 } },
    },
  }
  const next = currentScenario(c)
  c = addCarnevale(c)
  const state = startScenario(c, 42)
  const saved = session(state, { base: state, inputs: [], marks: [markOf(state)] }, c)
  const loaded = decodeSession(JSON.stringify(saved))
  expect(loaded.campaign?.carnevaleAt).toBe(1)
  c = finishScenario(c, { ...state, outcome: { type: 'resolution', resolution: 2 } })
  expect(currentScenario(decodeSession(JSON.stringify(session(null, null, c))).campaign!)).toBe(
    next,
  )
})

it.each(['en', 'es'] as const)('provides offline names, rules and masked faces in %s', (locale) => {
  const cards = new Map(fallbackCards(locale).map((c) => [c.code, c]))
  for (let n = 1; n <= 37; n++) {
    const card = cards.get(`82${String(n).padStart(3, '0')}`)
    expect(card?.name).toBeTruthy()
    expect(card?.text || card?.flavor, card?.code).toBeTruthy()
  }
  for (const code of ['82017b', '82018b', '82019b', '82020b', '82021b'])
    expect(cards.get(code)?.name).toBe(cards.get('82017b')?.name)
  expect(messages[locale].campaign.names['carnevale-of-horrors']).toBeTruthy()
})
