// RR Setup; FAQ 2.6, replacing an opening hand; cards beneath investigators are out of play.
import { investigatorBehavior, playerCardDef, scenarioBehavior } from './content'
import { getInvestigator, push, updateInvestigator } from './state'
import { nextInt } from './rng'
import type { GameState, Message, Choice } from './types'
export function handleBeneath(s: GameState, m: Message): GameState | undefined {
  if (m.type === 'StoreOpeningBeneath') {
    const i = getInvestigator(s, m.investigator),
      rule = investigatorBehavior(i.id)?.openingReplacement,
      at = i.hand.indexOf(m.code)
    if (!rule || at < 0 || (i.beneath ?? []).length >= rule.maximum || !rule.canStore(m.code))
      return s
    return updateInvestigator(s, i.id, (x) => ({
      ...x,
      hand: x.hand.filter((_, n) => n !== at),
      beneath: [...(x.beneath ?? []), m.code],
    }))
  }
  if (m.type === 'ChooseOpeningBeneath') {
    const i = getInvestigator(s, m.investigator),
      rule = investigatorBehavior(i.id)?.openingReplacement
    const cards =
      rule && (i.beneath ?? []).length < m.maximum ? [...new Set(i.hand)].filter(rule.canStore) : []
    if (!s.interactive || !cards.length)
      return push(s, { type: 'DiscardOpeningExcess', investigator: i.id, keep: m.keep })
    return push(s, {
      type: 'Ask',
      investigator: i.id,
      question: {
        kind: 'chooseOne',
        alwaysAsk: true,
        prompt: 'prompt.openingBeneath',
        choices: [
          ...cards.map((code) => ({
            label: 'choice.openingBeneath',
            params: { card: playerCardDef(code)?.name ?? code, n: (i.beneath ?? []).length },
            target: { type: 'hand' as const, code },
            then: [{ type: 'StoreOpeningBeneath' as const, investigator: i.id, code }, m],
          })),
          {
            label: 'choice.openingBeneathDone',
            then: [{ type: 'DiscardOpeningExcess', investigator: i.id, keep: m.keep }],
          },
        ],
      },
    })
  }
  if (m.type === 'DiscardOpeningExcess') {
    const i = getInvestigator(s, m.investigator)
    if (i.hand.length <= m.keep) return s
    const choices: Choice[] = [...new Set(i.hand)].map((code) => ({
      label: 'choice.openingDiscard',
      params: { card: playerCardDef(code)?.name ?? code, n: i.hand.length - m.keep },
      target: { type: 'hand', code },
      then: [
        { type: 'DiscardFromHand', investigator: i.id, card: code, deferHandReaction: true },
        m,
      ],
    }))
    if (!s.interactive) return push(s, ...choices[0]!.then)
    return push(s, {
      type: 'Ask',
      investigator: i.id,
      question: { kind: 'chooseOne', alwaysAsk: true, prompt: 'prompt.openingDiscard', choices },
    })
  }
  if (m.type === 'DrawInvestigatorBeneath') {
    const i = getInvestigator(s, m.investigator),
      card = i.beneath?.[m.index]
    if (!card || i.eliminated || scenarioBehavior(s.scenarioId)?.cannotDrawCards?.(s, i.id))
      return s
    return push(
      updateInvestigator(s, i.id, (x) => ({
        ...x,
        beneath: (x.beneath ?? []).filter((_, n) => n !== m.index),
        hand: [...x.hand, card],
      })),
      { type: 'Forced', trigger: { type: 'whenCardsDrawn', investigator: i.id, amount: 1 } },
      { type: 'Forced', trigger: { type: 'afterDrawCard', investigator: i.id, card } },
      { type: 'Forced', trigger: { type: 'afterCardsDrawn', investigator: i.id, amount: 1 } },
    )
  }
  if (m.type === 'RemoveRandomBeneath') {
    const i = getInvestigator(s, m.investigator),
      cards = i.beneath ?? []
    if (!cards.length) return push(s, ...m.otherwise)
    const [at, rng] = nextInt(s.rng, cards.length)
    return updateInvestigator({ ...s, rng }, i.id, (x) => ({
      ...x,
      beneath: (x.beneath ?? []).filter((_, n) => n !== at),
    }))
  }
  return undefined
}
