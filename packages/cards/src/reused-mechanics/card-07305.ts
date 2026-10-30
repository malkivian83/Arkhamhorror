import { getInvestigator, playerCardBehavior, type Choice } from '@lcg/engine'
import { registerBasicAsset } from '../basic-abilities/register'
import { ask, cardName } from '../dunwich-pilot/effects'
// RR: Uses; Fight; Reaction Abilities. .25 Automatic (2): the level 0 fight ability (+2 [combat]
// and +1 damage only against an exhausted enemy). [reaction] After you evade an enemy at your
// location: perform that fight without spending an action; its ammo cost is still paid. An
// evasion during a skill test defers the attack until that test ends (no nested tests).
const code = '07305'
registerBasicAsset(
  code,
  [
    {
      action: 'fight',
      cost: ['use'],
      modifier: (_ctx, enemy) => (enemy?.exhausted ? 2 : 0),
      extraDamage: (_ctx, enemy) => (enemy.exhausted ? 1 : 0),
    },
  ],
  () => ({
    reactions: (state, trigger, self) => {
      if (trigger.type !== 'afterEvade' || trigger.investigator !== self.owner) return []
      const here = getInvestigator(state, self.owner).location
      if (here === null || state.enemies[trigger.enemy]?.location !== here) return []
      const fights = (playerCardBehavior(code)?.abilities?.(state, self, self.owner) ?? []).map(
        (option): Choice => ({
          label: 'choice.enemy',
          params: { enemy: String(option.params?.enemy ?? '') },
          ...(option.target ? { target: option.target } : {}),
          then: [...(option.costs ?? []), ...option.then],
        }),
      )
      return fights.length
        ? [
            {
              key: self.id + ':free-fight',
              investigator: self.owner,
              label: 'ability.freeFightWith',
              params: { card: cardName(code) },
              then: state.skillTest
                ? [{ type: 'ModifySkillTest', after: ask(self.owner, fights, true) }]
                : ask(self.owner, fights, true),
            },
          ]
        : []
    },
  }),
)
