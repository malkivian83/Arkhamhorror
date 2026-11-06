import {
  applyInput,
  createGame,
  emptyCampaignLog,
  type CampaignLog,
  type GameState,
} from '@lcg/engine'
import { choose, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { deadByDawn } from './dead-by-dawn'

export function dawnGame({
  players = 1,
  notes = [] as string[],
  values = {} as Record<string, string>,
  storyAssets = {} as Record<string, string[]>,
  difficulty = 'standard' as const,
  answers = [] as string[],
} = {}): GameState {
  const ids = ['a', 'b', 'c', 'd'].slice(0, players)
  const base = emptyCampaignLog(ids)
  const log: CampaignLog = {
    ...base,
    notes,
    values,
    investigators: Object.fromEntries(
      Object.entries(base.investigators).map(([id, r]) => [
        id,
        { ...r, storyAssets: storyAssets[id] ?? [] },
      ]),
    ),
  }
  let s = throughSetup(
    createGame({
      seed: 7,
      difficulty,
      interactive: true,
      campaignLog: log,
      scenario: deadByDawn({ difficulty, log }),
      investigators: ids.map((id) => testInvestigator(id)),
    }),
  )
  const queue = [...answers]
  for (let n = 0; n < 40 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++) {
    const wanted = queue[0]
    if (
      wanted &&
      s.pending.question.choices.some((c) => c.label === wanted || c.params?.name === wanted)
    ) {
      queue.shift()
      const index = s.pending.question.choices.findIndex(
        (c) => c.label === wanted || c.params?.name === wanted,
      )
      s = applyInput(s, { investigator: s.pending.investigator, choice: index })
    } else if (s.pending.question.choices.some((c) => c.label === 'choice.skip'))
      s = choose(s, 'choice.skip')
    else s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
  }
  return s
}
