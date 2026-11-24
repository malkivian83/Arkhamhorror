import type { GameState } from '@lcg/engine'

/** Scenario reference cards: front = easy/standard, back = hard/expert. */
const references: Record<string, { code: string; name: string }> = {
  'late-risers': { code: '78001', name: 'Late Risers' },
  'night-on-the-town': { code: '78019', name: 'Night on the Town' },
  'dead-by-dawn': { code: '78047', name: 'Dead by Dawn' },
  'mourning-chorus': { code: '78083', name: 'Mourning Chorus' },
  'high-noon-descent': { code: '78111', name: 'High Noon Descent' },
  'the-afternoon-war': { code: '78151', name: 'The Afternoon War' },
  'death-at-sundown': { code: '78181', name: 'Death at Sundown' },
  'the-midnight-hour': { code: '78213', name: 'The Midnight Hour' },
  'carnevale-of-horrors': { code: '82001', name: 'Carnevale of Horrors' },
  'lost-in-time-and-space': { code: '02311', name: 'Lost in Time and Space' },
  'where-doom-awaits': { code: '02274', name: 'Where Doom Awaits' },
  'undimensioned-and-unseen': { code: '02236', name: 'Undimensioned and Unseen' },
  'blood-on-the-altar': { code: '02195', name: 'Blood on the Altar' },
  'the-essex-county-express': { code: '02159', name: 'Essex County Express' },
  'the-miskatonic-museum': { code: '02118', name: 'The Miskatonic Museum' },
  'the-house-always-wins': { code: '02062', name: 'The House Always Wins' },
  'extracurricular-activity': { code: '02041', name: 'Extracurricular Activity' },
  'the-midnight-masks': { code: '01120', name: 'The Midnight Masks' },
  'the-devourer-below': { code: '01142', name: 'The Devourer Below' },
  'ice-and-death-part-1': { code: '08501', name: 'Ice and Death' },
  'hemlock-vale-welcome': { code: '10704', name: 'The Vale' },
  // La primera tarde es un preludio sin tarjeta propia: usa la del Valle.
  'hemlock-vale-first-evening': { code: '10704', name: 'The Vale' },
  'hemlock-vale-dawn-second-day': { code: '10704', name: 'The Vale' },
  'hemlock-vale-hemlock-house': { code: '10523', name: 'Hemlock House' },
  'hemlock-vale-silent-heath': { code: '10549', name: 'The Silent Heath' },
  'hemlock-vale-lost-sister': { code: '10569', name: 'The Lost Sister' },
  'hemlock-vale-thing-in-the-depths': { code: '10588', name: 'The Thing in the Depths' },
  'hemlock-vale-twisted-hollow': { code: '10605', name: 'The Twisted Hollow' },
  'ice-and-death-part-2': { code: '08501', name: 'Ice and Death' },
  'ice-and-death-part-3': { code: '08501', name: 'Ice and Death' },
  'edge-of-the-earth-fatal-mirage': { code: '08549', name: 'Fatal Mirage' },
  'edge-of-the-earth-forbidden-peaks': { code: '08596', name: 'To the Forbidden Peaks' },
  'edge-of-the-earth-city-of-the-elder-things': { code: '08621', name: 'City of the Elder Things' },
  'edge-of-the-earth-heart-of-madness-part-1': { code: '08648', name: 'The Heart of Madness' },
  'edge-of-the-earth-heart-of-madness-part-2': { code: '08648', name: 'The Heart of Madness' },
  'the-gathering': { code: '01104', name: 'The Gathering' },
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
  'fortune-and-folly-part-1': { code: '88001', name: 'Fortune and Folly' },
  'fortune-and-folly-part-2': { code: '88001', name: 'Fortune and Folly' },
}

/**
 * Escrito en la roca tiene una carta por par de dificultades (10501 Fácil/Normal, 10502
 * Difícil/Experto) con el acto 1 en el anverso y el acto 2 en el reverso.
 */
const BY_ACT: Record<string, { easy: string; hard: string; name: string }> = {
  'hemlock-vale-written-in-rock': { easy: '10501', hard: '10502', name: 'Written in Rock' },
}

export function scenarioReference(
  state: Pick<GameState, 'scenarioId' | 'difficulty'> & { actIndex?: number },
) {
  const hard = state.difficulty === 'hard' || state.difficulty === 'expert'
  const byAct = BY_ACT[state.scenarioId]
  if (byAct)
    return {
      code: hard ? byAct.hard : byAct.easy,
      name: byAct.name,
      back: (state.actIndex ?? 0) > 0,
    }
  const card = references[state.scenarioId]
  return card
    ? { ...card, back: state.difficulty === 'hard' || state.difficulty === 'expert' }
    : null
}
