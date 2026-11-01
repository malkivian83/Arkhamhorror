import {
  getInvestigator,
  type GameState,
  type Message,
  type ReactionOption,
  type SkillTest,
} from '@lcg/engine'
import { cardName } from '../dunwich-pilot/effects'
export const near = (s: GameState, by: string) => {
  const here = getInvestigator(s, by).location
  return here === null ? [] : s.investigators.filter((i) => !i.eliminated && i.location === here)
}
export const ownTurn = (s: GameState, by: string) =>
  s.phase === 'investigation' &&
  (s.immediateActions?.[0]
    ? s.immediateActions[0].endedTurn
      ? null
      : s.immediateActions[0].activeTurn
    : s.activeTurn) === by
export const margin = (t: SkillTest) => Math.max(0, (t.modifiedSkill ?? 0) - t.difficulty)
export const onTreachery = (t: SkillTest) =>
  !!t.tags?.includes('treachery') && !t.source && !t.effectSource
export const reaction = (
  key: string,
  by: string,
  code: string,
  then: Message[],
): ReactionOption => ({
  key,
  investigator: by,
  label: 'choice.recoveryUse',
  params: { card: cardName(code) },
  then,
})
export const play = (code: string, by: string, effect: Message[]): Message => ({
  type: 'PlayCard',
  investigator: by,
  code,
  effect,
})
export const symbols = ['skull', 'cultist', 'tablet', 'elderThing', 'autoFail']
