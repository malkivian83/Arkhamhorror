import {
  getInvestigator,
  playerCardBehavior,
  playerCardDef,
  registerPlayerCard,
  type Choice,
} from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'
import { assetsHere } from '../dunwich-pilot/helpers'
import approvals from './approvals.json'

export function registerResultSkill(code: string): void {
  const entry = approvals.cards.find((c) => c.code === code)
  if (!entry) throw new Error('Unreviewed result skill: ' + code)
  const family = entry.family
  registerPlayerCard({
    code,
    commitWithoutIcons: family === 'heart',
    afterCommittedTest: (_s, t, success, by) => {
      if (family === 'heart')
        return success
          ? []
          : [
              { type: 'DrawCards', investigator: t.investigator, amount: 2 },
              { type: 'GainResources', investigator: t.investigator, amount: 2 },
            ]
      if (!success) return []
      if (family === 'eureka')
        return [
          {
            type: 'SearchDeck',
            investigator: t.investigator,
            top: 3,
            traits: [],
            anyCard: true,
            drawFound: true,
            to: 'hand',
          },
        ]
      if (family === 'stunning')
        return t.kind.type === 'fight'
          ? [{ type: 'EvadeEnemy', enemy: t.kind.enemy, by: t.investigator }]
          : []
      if (family === 'enraptured' && t.kind.type !== 'investigate') return []
      return [
        {
          type: 'PlayerCardEffect',
          code,
          investigator: by,
          step: family === 'enraptured' ? 'uses' : 'ally',
        },
      ]
    },
    effect: (s, by, step) => {
      if (step === 'uses')
        return ask(
          by,
          Object.values(s.assets)
            .filter(
              (a) =>
                a.owner === by &&
                ['charge', 'charges', 'secret', 'secrets'].includes(
                  playerCardDef(a.code)?.uses?.type ?? '',
                ) &&
                a.uses < (playerCardBehavior(a.code)?.maxUses ?? Infinity),
            )
            .map((a) => ({
              label: 'choice.resultUses',
              target: { type: 'asset', id: a.id },
              params: { card: playerCardDef(a.code)!.name },
              then: [{ type: 'AddUses', asset: a.id, amount: 1 }],
            })),
        )
      if (step !== 'ally') return []
      const here = getInvestigator(s, by).location
      if (here === null) return []
      const placed = Object.values(s.placedAssets ?? {}).filter(
        (a) =>
          !a.faceDown &&
          (a.placement.type === 'location'
            ? a.placement.location
            : s.enemies[a.placement.enemy]?.location) === here,
      )
      const choices: Choice[] = []
      for (const a of [...assetsHere(s, by), ...placed]) {
        if (
          !playerCardDef(a.code)?.traits.includes('Ally') ||
          (!a.exhausted && a.damage === 0 && a.horror === 0)
        )
          continue
        const modes =
          family === 'presence-upgrade'
            ? ['both']
            : a.damage > 0 && a.horror > 0
              ? ['damage', 'horror']
              : a.horror > 0
                ? ['horror']
                : ['damage']
        for (const mode of modes)
          choices.push({
            label:
              mode === 'both'
                ? 'choice.resultAllyBoth'
                : mode === 'damage'
                  ? 'choice.resultAllyDamage'
                  : 'choice.resultAllyHorror',
            params: { card: playerCardDef(a.code)!.name },
            target: { type: 'owner' in a ? 'asset' : 'placed', id: a.id },
            then: [
              { type: 'ReadyAsset', asset: a.id },
              {
                type: 'HealAsset',
                asset: a.id,
                damage: mode === 'horror' ? 0 : 1,
                horror: mode === 'damage' ? 0 : 1,
              },
            ],
          })
      }
      return ask(by, choices)
    },
  })
}
