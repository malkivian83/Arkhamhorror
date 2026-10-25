import type { GameState } from '@lcg/engine'

/** Scenario reference cards: front = easy/standard, back = hard/expert. */
const references: Record<string, { code: string; name: string }> = {
  'spreading-flames': { code: '12105', name: 'Spreading Flames' },
  'smoke-and-mirrors': { code: '12133', name: 'Smoke and Mirrors' },
  'queen-of-ash': { code: '12168', name: 'Queen of Ash' },
  'the-midwinter-gala': { code: '71001', name: 'The Midwinter Gala' },
  'murder-at-the-excelsior-hotel': { code: '84001', name: 'Murder at the Excelsior Hotel' },
  'curtain-call': { code: '03043', name: 'Curtain Call' },
  'the-last-king': { code: '03061', name: 'The Last King' },
  'echoes-of-the-past': { code: '03120', name: 'Echoes of the Past' },
  'the-unspeakable-oath': { code: '03159', name: 'The Unspeakable Oath' },
  'a-phantom-of-truth': { code: '03200', name: 'A Phantom of Truth' },
  'the-pallid-mask': { code: '03240', name: 'The Pallid Mask' },
  'black-stars-rise': { code: '03274', name: 'Black Stars Rise' },
  'dim-carcosa': { code: '03316', name: 'Dim Carcosa' },
}

export function scenarioReference(state: Pick<GameState, 'scenarioId' | 'difficulty'>) {
  const card = references[state.scenarioId]
  return card
    ? { ...card, back: state.difficulty === 'hard' || state.difficulty === 'expert' }
    : null
}
