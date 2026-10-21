import { registerPlayerCard } from '@lcg/engine'
import { continuation } from '../dunwich-pilot/effects'
import approvals from './approvals.json'

// RR: Basic Actions, Skill Test Results. Bonuses depend on the action's origin,
// not the absence of an asset source (events and scenario effects also have tests).
export function registerBasicActionSkill(code: string): void {
  const family = approvals.cards.find((c) => c.code === code)?.family
  if (!family) throw new Error('Unreviewed basic action skill: ' + code)
  registerPlayerCard({
    code,
    additionalIcons: (_s, t) =>
      !t.basicAction || t.kind.type !== family
        ? {}
        : family === 'fight'
          ? { combat: 2 }
          : family === 'investigate'
            ? { intellect: 2 }
            : { agility: 2 },
    committedAttackDamage: (_s, t) =>
      family === 'fight' &&
      t.basicAction &&
      t.kind.type === 'fight' &&
      (t.modifiedSkill ?? 0) - t.difficulty >= 2
        ? 2
        : 0,
    committedInvestigationClues: (_s, t) =>
      family === 'investigate' &&
      t.basicAction &&
      t.kind.type === 'investigate' &&
      (t.modifiedSkill ?? 0) - t.difficulty >= 2
        ? 1
        : 0,
    afterCommittedTest: (_s, t, success, by) =>
      family === 'evade' &&
      t.basicAction &&
      t.kind.type === 'evade' &&
      success &&
      (t.modifiedSkill ?? 0) - t.difficulty >= 2
        ? [continuation('10076', by, 'evade', { enemy: t.kind.enemy })]
        : [],
  })
}
