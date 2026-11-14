import { nextInt, playerCardDef, push, type GameState, type Message } from '@lcg/engine'
import { basicWeaknessPool } from '../decks'
import { ask, lead, on, specific } from './helpers'

/** Interludio IV · Lección de historia (guía ES p. 15 / EN p. 18): las tres preguntas. */
export const HISTORY_QUESTIONS = {
  portals: 'plaguebearerVisionOfPortals',
  first: 'plaguebearerKillingWords',
  baalshandor: 'plaguebearerCrypticRiddle',
} as const
type Question = keyof typeof HISTORY_QUESTIONS
const ASKED = 'history:asked'

const story = (key: string, effects: { key: string }[] = []) => ({
  title: 'story.plaguebearer.history.title',
  body: `story.plaguebearer.history.${key}`,
  effects,
})
const asked = (s: GameState): Question[] =>
  String(s.scenarioMeta?.[ASKED] ?? '')
    .split(',')
    .filter((q): q is Question => q in HISTORY_QUESTIONS)

/**
 * Both resolutions of High Noon Descent lead here. The lead asks the Lurker at the Threshold
 * one question or more; each box read after the first costs every investigator a random
 * basic Madness or Pact weakness for the rest of the campaign.
 */
export function historyLesson(end: Message): Message[] {
  return [
    { type: 'Story', entry: story('lesson1') },
    specific('history.ask'),
    specific('history.finish'),
    end,
  ]
}

on('history.ask', (s) => {
  const done = asked(s)
  const remaining = (Object.keys(HISTORY_QUESTIONS) as Question[]).filter(
    (question) => !done.includes(question),
  )
  if (!remaining.length) return s
  return ask(
    s,
    lead(s),
    [
      ...remaining.map((question) => ({
        label: `choice.plaguebearer.history.${question}`,
        then: [
          {
            type: 'Story',
            entry: story(question, [{ key: `story.plaguebearer.history.${question}Effect` }]),
          } as Message,
          { type: 'RecordNote', note: HISTORY_QUESTIONS[question] } as Message,
          specific('history.record', { question }),
          specific('history.ask'),
        ],
      })),
      // "You may ask of him any one question": a single box is free, so stopping is optional.
      ...(done.length ? [{ label: 'choice.plaguebearer.history.enough', then: [] }] : []),
    ],
    done.length ? 'prompt.plaguebearer.history.more' : 'prompt.plaguebearer.history.ask',
  )
})

on('history.record', (s, d) => ({
  ...s,
  scenarioMeta: { ...s.scenarioMeta, [ASKED]: [...asked(s), String(d.question)].join(',') },
}))

on('history.finish', (s) => {
  const extra = Math.max(0, asked(s).length - 1)
  const lesson: Message = { type: 'Story', entry: story('lesson2') }
  if (!extra) return push(s, lesson)
  // A random basic Madness or Pact weakness from the collection per extra box and investigator.
  const pool = basicWeaknessPool().filter((code) =>
    playerCardDef(code)?.traits.some((trait) => trait === 'Madness' || trait === 'Pact'),
  )
  if (!pool.length) return push(s, lesson)
  let available = [...pool]
  let rng = s.rng
  const added: Message[] = []
  for (const investigator of s.investigators) {
    for (let n = 0; n < extra; n++) {
      if (!available.length) available = [...pool]
      const [index, after] = nextInt(rng, available.length)
      rng = after
      const [code] = available.splice(index, 1)
      added.push({ type: 'AddStoryAsset', investigator: investigator.id, code: code! })
    }
  }
  return push({ ...s, rng }, lesson, ...added)
})
