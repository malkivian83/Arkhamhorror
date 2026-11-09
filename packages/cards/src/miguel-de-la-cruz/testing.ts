import {
  createGame,
  playerCardDef,
  type EnemyCard,
  type GameState,
  type Investigator,
  type LocationAttachment,
} from '@lcg/engine'
import { choose, ghoul, labels, testInvestigator, testScenario } from '@lcg/engine/testing'
import { starterInvestigator } from '../core-2026/player-cards'
import '../index'
import { MIGUEL } from './codes'

export * from './codes'

/** Miguel (and another investigator if `others`) in his action menu at Room A. */
export function makeGame(others = false, chaosBag: GameState['chaosBag'] = [0]): GameState {
  // His weaknesses stay out of the deck so that no enemy is drawn into the opening hand.
  const setup = starterInvestigator('miguel')
  let s = createGame({
    seed: 4,
    scenario: testScenario({ chaosBag }),
    investigators: [
      { ...setup, deck: setup.deck.filter((c) => !playerCardDef(c)?.weakness) },
      ...(others ? [testInvestigator('b')] : []),
    ],
  })
  for (let n = 0; n < 20 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++)
    s = choose(s, labels(s)[0]!)
  return s
}
export const miguel = (s: GameState) => s.investigators.find((i) => i.id === MIGUEL)!
export const withMiguel = (s: GameState, changes: Partial<Investigator>): GameState => ({
  ...s,
  investigators: s.investigators.map((i) => (i.id === MIGUEL ? { ...i, ...changes } : i)),
})
export const name = (code: string) => playerCardDef(code)!.name
/** An event of `owner` already attached to `location` (ready unless stated). */
export function attach(
  s: GameState,
  code: string,
  location: string,
  owner = 'a',
  changes: Partial<LocationAttachment> = {},
): GameState {
  const id = 'att-' + code + '-' + location
  return {
    ...s,
    locationAttachments: {
      ...s.locationAttachments,
      [id]: { id, code, owner, location, exhausted: false, ...changes },
    },
  }
}
export const attachmentsAt = (s: GameState, location: string) =>
  Object.values(s.locationAttachments ?? {}).filter((a) => a.location === location)
export const sturdy: EnemyCard = { ...ghoul, code: 'test-brute', name: 'Brute', health: 6 }
