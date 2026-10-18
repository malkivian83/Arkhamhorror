import type { Choice, ChoiceTarget, GameState } from '@lcg/engine'

/** Presentation-only association: old saves keep their original engine choices. */
export function choiceTarget(state: GameState, choice: Choice): ChoiceTarget | undefined {
  if (choice.target) return choice.target
  if (state.pending?.question.prompt !== 'prompt.commitCards') return
  const ability = choice.then.find((message) => message.type === 'UseAbility')
  if (!ability || ability.type !== 'UseAbility') return
  const asset = Object.values(state.assets).find((a) => ability.key.startsWith(`${a.id}:`))
  return asset ? { type: 'asset', id: asset.id } : undefined
}
