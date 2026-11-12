// RR: Reaction opportunities, Costs, Skill Tests.
import {
  getInvestigator,
  registerPlayerCard,
  type Asset,
  type GameState,
  type Message,
  type ReactionOption,
  type SkillTest,
  type PlayerCardBehavior,
} from '@lcg/engine'
import { cardName } from '../dunwich-pilot/effects'
export { ask, cardName, continuation } from '../dunwich-pilot/effects'
/** RR Peril: only the drawer may play cards, trigger abilities or commit during its revelation. */
function mayParticipate(s: GameState, by: string, test = s.skillTest): boolean {
  for (const source of [...(s.revelationContexts ?? [])].reverse()) {
    if (!s.treacheries[source]?.keywords.includes('peril')) continue
    const draw = s.queue.find((m) => m.type === 'AfterRevelation' && m.treachery === source)
    const drawer = draw?.type === 'AfterRevelation' ? draw.investigator : test?.investigator
    if (drawer) return drawer === by
  }
  return !test?.tags?.includes('peril') || test.investigator === by
}
export function registerAdvancedCard(b: PlayerCardBehavior): void {
  const { reactions, handReactions, testOptions, abilities, canCommit, ...rest } = b
  registerPlayerCard({
    ...rest,
    canCommit: (s, t, by) => mayParticipate(s, by, t) && (canCommit?.(s, t, by) ?? true),
    ...(reactions
      ? { reactions: (s, t, a) => (mayParticipate(s, a.owner) ? reactions(s, t, a) : []) }
      : {}),
    ...(handReactions
      ? { handReactions: (s, t, by) => (mayParticipate(s, by) ? handReactions(s, t, by) : []) }
      : {}),
    ...(testOptions
      ? { testOptions: (s, t, a) => (mayParticipate(s, a.owner, t) ? testOptions(s, t, a) : []) }
      : {}),
    ...(abilities
      ? { abilities: (s, a, by) => (mayParticipate(s, by) ? abilities(s, a, by) : []) }
      : {}),
  })
}
export const local = (s: GameState, t: SkillTest, by: string) => {
  const here = getInvestigator(s, by).location
  return here !== null && getInvestigator(s, t.investigator).location === here
}
export const exhaust = (a: Asset): Message => ({ type: 'ExhaustAsset', asset: a.id })
export const spend = (a: Asset): Message => ({ type: 'SpendUses', asset: a.id, amount: 1 })
export const option = (a: Asset, then: Message[], suffix = ''): ReactionOption => ({
  key: a.id + ':advanced' + suffix,
  investigator: a.owner,
  label: 'ability.advancedTest',
  params: { card: cardName(a.code) },
  target: { type: 'asset', id: a.id },
  then,
})
export const event = (code: string, by: string, effect: Message[]): ReactionOption[] => [
  {
    key: 'hand:' + code,
    investigator: by,
    label: 'ability.playCard',
    params: { card: cardName(code) },
    target: { type: 'hand', code },
    then: [{ type: 'PlayCard', code, investigator: by, effect }],
  },
]
