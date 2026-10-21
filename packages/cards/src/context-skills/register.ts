import { engagedEnemies, getInvestigator, playerCardDef, registerPlayerCard } from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'
import approvals from './approvals.json'

export function registerContextSkill(code: string): void {
  const entry = approvals.cards.find((c) => c.code === code)
  if (!entry) throw new Error('Unreviewed context skill: ' + code)
  const family = entry.family
  registerPlayerCard({
    code,
    canCommit: (s, t, by) => {
      if (family === 'street') return t.investigator === by
      if (family === 'engaged') return engagedEnemies(s, by).length > 0
      if (family === 'marksman') {
        const asset = t.source ? s.assets[t.source] : undefined
        return (
          !!asset &&
          asset.owner === by &&
          !!playerCardDef(asset.code)?.traits.some(
            (trait) => trait === 'Firearm' || trait === 'Ranged',
          )
        )
      }
      return true
    },
    additionalIcons: (s, t, by) => {
      if (family === 'street')
        return { wild: Math.min(3, Math.floor(getInvestigator(s, by).resources / 3)) }
      if (family === 'engaged') {
        const n = engagedEnemies(s, by).length
        return { willpower: n, combat: n, agility: n }
      }
      const asset = t.source ? s.assets[t.source] : undefined
      return family === 'armed' &&
        asset?.owner === by &&
        playerCardDef(asset.code)?.traits.includes('Item')
        ? { wild: 2 }
        : {}
    },
    onCommit: (s) =>
      family === 'door' || family === 'door-upgrade'
        ? [
            {
              type: 'GainResources',
              investigator: s.skillTest!.investigator,
              amount: family === 'door' ? 2 : 4,
            },
          ]
        : [],
    afterCommittedTest: (_s, t, success, by) => {
      if (family === 'blood' && success)
        return [{ type: 'TakeDamage', investigator: by, damage: 1, horror: 0, direct: true }]
      if (family === 'guidance' && success)
        return [{ type: 'Heal', investigator: t.investigator, damage: 1, horror: 0 }]
      if ((family === 'door' || family === 'door-upgrade') && !success)
        return [
          {
            type: 'LoseResources',
            investigator: t.investigator,
            amount: family === 'door' ? 2 : 4,
          },
        ]
      if (family === 'recover' && success)
        return [{ type: 'PlayerCardEffect', code, investigator: by, step: 'recover' }]
      return []
    },
    effect: (s, by, step) =>
      step === 'recover'
        ? ask(
            by,
            [...new Set(getInvestigator(s, by).discard)]
              .filter((c) => {
                const d = playerCardDef(c)
                return d?.class === 'survivor' && (d.type === 'asset' || d.type === 'event')
              })
              .map((c) => ({
                label: 'choice.reactiveRecover',
                params: { card: playerCardDef(c)!.name },
                then: [{ type: 'DiscardToHand', investigator: by, code: c }],
              })),
          )
        : [],
  })
}
