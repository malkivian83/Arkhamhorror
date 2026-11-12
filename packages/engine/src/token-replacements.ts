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
    return { children, ignored, ...(p.prefer ? { prefer: p.prefer } : {}) }
  }
  const tree = build(plan)
  return { tree, chaosBag: bag, rng }
}
export function chosenTreeToken(tree: TokenRevealTree): ChaosToken | undefined {
  if ('token' in tree) return tree.token
  return tree.selected === undefined
    ? undefined
    : tree.children[tree.selected] && chosenTreeToken(tree.children[tree.selected]!)
}
export function nextTreeChoice(
  tree: TokenRevealTree,
  path: number[] = [],
): { path: number[]; choices: { token: ChaosToken; index: number }[] } | undefined {
  if ('token' in tree || tree.selected !== undefined) return undefined
  for (const [n, child] of tree.children.entries()) {
    const next = nextTreeChoice(child, [...path, n])
    if (next) return next
  }
  const all = tree.children.flatMap((child, index) => {
    const token = chosenTreeToken(child)
    return token === undefined ? [] : [{ token, index }]
  })
  const preferred = all.filter((c) => tree.prefer?.includes(c.token))
  return all.length ? { path, choices: preferred.length ? preferred : all } : undefined
}
export function chooseTree(tree: TokenRevealTree, path: number[], index: number): TokenRevealTree {
  if ('token' in tree) return tree
  const [at, ...rest] = path
  return at === undefined
    ? { ...tree, selected: index }
    : {
        ...tree,
        children: tree.children.map((c, n) => (n === at ? chooseTree(c, rest, index) : c)),
      }
}
export function treeTokens(tree: TokenRevealTree): ChaosToken[] {
  return 'token' in tree ? [tree.token] : [...tree.ignored, ...tree.children.flatMap(treeTokens)]
}
