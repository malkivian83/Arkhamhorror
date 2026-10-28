import { enemiesAt, getInvestigator, registerPlayerCard, registerPlayerCards } from '@lcg/engine'
import { U } from './unseen-codes'
registerPlayerCards([
  {
    code: U.formula,
    name: 'Esoteric Formula',
    type: 'asset',
    class: 'neutral',
    cost: 0,
    story: true,
    traits: ['Spell'],
  },
])
registerPlayerCard({
  code: U.formula,
  effectSkillModifier: (s, t) =>
    t.kind.type === 'fight' ? 2 * (s.enemies[t.kind.enemy]?.clues ?? 0) : 0,
  abilities: (s, a, i) =>
    enemiesAt(s, getInvestigator(s, i).location!)
      .filter((e) => e.traits?.includes('Abomination'))
      .map((e) => ({
        key: `${a.id}:fight:${e.id}`,
        label: 'ability.unseen.formula',
        params: { enemy: e.name, clues: e.clues ?? 0, damage: e.damageTaken },
        target: { type: 'enemy', id: e.id },
        actions: 1,
        provokes: false,
        actionKind: 'fight',
        then: [
          {
            type: 'BeginSkillTest',
            investigator: i,
            skill: 'willpower',
            difficulty: e.fight,
            source: a.id,
            effectSource: U.formula,
            kind: { type: 'fight', enemy: e.id, extraDamage: 0 },
          },
        ],
      })),
})
