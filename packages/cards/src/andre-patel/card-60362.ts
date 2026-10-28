import { registerPlayerCard } from '@lcg/engine'
import { MARCUS_SENGSTACKE, MARCUS_SENGSTACKE_2 } from './codes'

// RR: Upkeep Phase, Forced Abilities, Damage and Horror (assets). Marcus Sengstacke (both
// levels, which differ only in cost and sanity): you gain 1 additional resource during the
// upkeep phase. Forced: after you fail a skill test, deal 1 horror to him.
for (const code of [MARCUS_SENGSTACKE, MARCUS_SENGSTACKE_2])
  registerPlayerCard({
    code,
    upkeepResources: 1,
    forced: (_state, trigger, self) =>
      trigger.type === 'afterSkillTest' && !trigger.succeeded && trigger.investigator === self.owner
        ? [{ type: 'DamageAsset', asset: self.id, damage: 0, horror: 1 }]
        : [],
  })
