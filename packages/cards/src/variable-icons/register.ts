import { effectiveVitals, getInvestigator, playerCardDef, registerPlayerCard } from '@lcg/engine'
import approvals from './approvals.json'

export function registerVariableIcons(code: string): void {
  const entry = approvals.cards.find((c) => c.code === code)
  if (!entry) throw new Error('Unreviewed variable skill: ' + code)
  registerPlayerCard({
    code,
    ...(entry.family === 'rise'
      ? {
          canCommit: (s, t, by) =>
            by === t.investigator &&
            t.difficulty > (t.baseSkill ?? getInvestigator(s, by).skills[t.skill]),
        }
      : {}),
    additionalIcons: (s, t, by) => {
      const i = getInvestigator(s, by)
      const assets = Object.values(s.assets).filter((a) => a.owner === by)
      const tier = (n: number, low: number, high: number) => (n >= high ? 2 : n >= low ? 1 : 0)
      switch (entry.family) {
        case 'steadfast': {
          const v = effectiveVitals(s, i)
          const n = tier(v.health + v.sanity - i.damage - i.horror, 5, 10)
          return { willpower: n, combat: n }
        }
        case 'curiosity': {
          const n = tier(i.hand.length, 4, 7)
          return { willpower: n, intellect: n }
        }
        case 'cunning': {
          const n = tier(i.resources, 5, 10)
          return { intellect: n, agility: n }
        }
        case 'prophesy': {
          const doom =
            s.doom +
            [
              ...s.investigators,
              ...Object.values(s.assets),
              ...Object.values(s.placedAssets ?? {}),
              ...Object.values(s.enemies),
            ].reduce((sum, c) => sum + (c.doom ?? 0), 0)
          return { wild: tier(doom, 3, 6) }
        }
        case 'able': {
          const items = assets.filter((a) => playerCardDef(a.code)?.traits.includes('Item')).length
          const n = items <= 1 ? 2 : items <= 2 ? 1 : 0
          return { combat: n, agility: n }
        }
        case 'leadership':
          return by !== t.investigator ? { willpower: 1, wild: 1 } : {}
        case 'rise':
          return {
            wild: Math.min(3, Math.max(0, t.difficulty - (t.baseSkill ?? i.skills[t.skill]))),
          }
        case 'funded':
          return {
            wild: tier(
              assets.filter((a) =>
                playerCardDef(a.code)?.traits.some(
                  (trait) => trait === 'Science' || trait === 'Tool',
                ),
              ).length,
              1,
              3,
            ),
          }
        case 'dressed':
          return t.tags?.includes('parley') ? { wild: 3 } : {}
        case 'rough':
          return { wild: Math.ceil(i.damage / 2) }
        default:
          throw new Error('Unsupported variable skill: ' + entry.family)
      }
    },
  })
}
