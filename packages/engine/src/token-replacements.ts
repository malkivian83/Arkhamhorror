// RR/FAQ: simultaneous reveal replacements are declared before drawing, nested choices
// retain their own restrictions, and only the final chosen token resolves.
import { nextInt } from './rng'
import type { ChaosToken, GameState, TokenRevealReplacement, TokenRevealTree } from './types'

export function replacementLeaves(plan: TokenRevealReplacement, path: number[] = []): number[][] {
  return Array.from({ length: Math.max(1, plan.reveal) }, (_, n) =>
    plan.nested?.[n] ? replacementLeaves(plan.nested[n]!, [...path, n]) : [[...path, n]],
  ).flat()
}
export function attachReplacement(
  plan: TokenRevealReplacement,
  path: number[],
  replacement: TokenRevealReplacement,
): TokenRevealReplacement {
  const [at, ...rest] = path
  if (at === undefined || at < 0 || at >= Math.max(1, plan.reveal)) return plan
  const previous = plan.nested?.[at]
  return {
    ...plan,
    nested: {
      ...plan.nested,
      [at]: rest.length && previous ? attachReplacement(previous, rest, replacement) : replacement,
    },
  }
}
export function drawReplacementTree(state: GameState, plan: TokenRevealReplacement) {
  let bag = state.chaosBag.slice(),
    rng = state.rng
  const draw = (): ChaosToken | undefined => {
    if (!bag.length) return undefined
    const [at, next] = nextInt(rng, bag.length)
    const token = bag[at]!
    rng = next
    bag = bag.filter((_, n) => n !== at)
    return token
  }
  const build = (p: TokenRevealReplacement): TokenRevealTree => {
    const children: TokenRevealTree[] = [],
      ignored: ChaosToken[] = []
    for (let n = 0; n < Math.max(1, p.reveal); n++) {
      if (p.nested?.[n]) {
        children.push(build(p.nested[n]!))
        continue
      }
      let token = draw()
      if (n === 0 && p.untilSymbol)
        while (typeof token === 'number') {
          ignored.push(token)
          token = draw()
        }
      if (token !== undefined) children.push({ token })
    }
    return {
      children,
      ignored,
      ...(p.resolve ? { resolve: p.resolve } : {}),
      ...(p.prefer ? { prefer: p.prefer } : {}),
    }
  }
  const tree = build(plan)
  return { tree, chaosBag: bag, rng }
}
/** Tokens represented by a chosen logical reveal, including any nested replacement. */
export function chosenTreeTokens(tree: TokenRevealTree): ChaosToken[] {
  if ('token' in tree) return [tree.token]
  const selected = tree.selectedMany ?? (tree.selected === undefined ? [] : [tree.selected])
  if (selected.length < Math.min(tree.resolve ?? 1, tree.children.length)) return []
  return selected.flatMap((n) => (tree.children[n] ? chosenTreeTokens(tree.children[n]!) : []))
}
export const chosenTreeToken = (tree: TokenRevealTree): ChaosToken | undefined =>
  chosenTreeTokens(tree)[0]
export function nextTreeChoice(
  tree: TokenRevealTree,
  path: number[] = [],
):
  | { path: number[]; choices: { token: ChaosToken; tokens: ChaosToken[]; index: number }[] }
  | undefined {
  if ('token' in tree) return undefined
  const selected = tree.selectedMany ?? (tree.selected === undefined ? [] : [tree.selected])
  if (selected.length >= Math.min(tree.resolve ?? 1, tree.children.length)) return undefined
  for (const [n, child] of tree.children.entries()) {
    const next = nextTreeChoice(child, [...path, n])
    if (next) return next
  }
  const all = tree.children.flatMap((child, index) => {
    const tokens = chosenTreeTokens(child)
    return tokens.length && !selected.includes(index) ? [{ token: tokens[0]!, tokens, index }] : []
  })
  const preferred = all.filter((c) => c.tokens.some((t) => tree.prefer?.includes(t)))
  return all.length ? { path, choices: preferred.length ? preferred : all } : undefined
}
export function chooseTree(tree: TokenRevealTree, path: number[], index: number): TokenRevealTree {
  if ('token' in tree) return tree
  const [at, ...rest] = path
  return at === undefined
    ? (tree.resolve ?? 1) > 1
      ? { ...tree, selectedMany: [...(tree.selectedMany ?? []), index] }
      : { ...tree, selected: index }
    : {
        ...tree,
        children: tree.children.map((c, n) => (n === at ? chooseTree(c, rest, index) : c)),
      }
}
export function treeTokens(tree: TokenRevealTree): ChaosToken[] {
  return 'token' in tree ? [tree.token] : [...tree.ignored, ...tree.children.flatMap(treeTokens)]
}
