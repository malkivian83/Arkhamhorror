import {
  getInvestigator,
  registerPlayerCard,
  skillValueFor,
  type Message,
  type SkillType,
} from '@lcg/engine'

const later = (then: Message[]): Message => ({ type: 'AfterCurrentSkillTest', then })
const backToHand = (investigator: string, code: string): Message =>
  later([{ type: 'DiscardToHand', investigator, code }])

/** RR Modifiers: use current attributes, without committed icons or token modifiers. */
export function registerSwapSkill(code: string, a: SkillType, b: SkillType): void {
  registerPlayerCard({
    code,
    additionalIcons: (s, t, by, zone = 'hand') => {
      if (zone !== 'hand' && zone !== 'committed') return {}
      return { [a]: skillValueFor(s, by, b, t.kind), [b]: skillValueFor(s, by, a, t.kind) }
    },
  })
}

/** Savant: [wild] icons equal to your lowest skill other than the tested one. */
export function registerSavant(code: string): void {
  registerPlayerCard({
    code,
    additionalIcons: (s, t, by) => {
      const skills = getInvestigator(s, by).skills
      const others = (Object.keys(skills) as SkillType[]).filter((k) => k !== t.skill)
      return { wild: Math.min(...others.map((k) => skillValueFor(s, by, k, t.kind))) }
    },
  })
}

/** Indomitable: +3 [wild] if an enemy attacked an investigator at this location this round. */
export function registerIndomitable(code: string): void {
  registerPlayerCard({
    code,
    additionalIcons: (s, t) => {
      const here = getInvestigator(s, t.investigator).location
      const attacked = (s.enemyAttacks ?? []).some(
        (a) =>
          a.round === s.round &&
          (a.location !== undefined
            ? a.location !== null && a.location === here
            : s.investigators.some((i) => i.id === a.investigator && i.location === here)),
      )
      return attacked ? { wild: 3 } : {}
    },
  })
}

/** Calculated Risk: own test on your turn; [wild] per action this turn; then end your turn. */
export function registerCalculatedRisk(code: string): void {
  registerPlayerCard({
    code,
    canCommit: (s, t, by) => t.investigator === by && s.activeTurn === by,
    additionalIcons: (s, _t, by) => ({ wild: getInvestigator(s, by).actionsTaken ?? 0 }),
    afterCommittedTest: (_s, _t, _success, by) => [later([{ type: 'EndTurn', investigator: by }])],
  })
}

/** Opportunist: own test only; succeeding by `by` or more returns it to hand. */
export function registerOpportunist(code: string, atLeast: number): void {
  registerPlayerCard({
    code,
    canCommit: (_s, t, by) => t.investigator === by,
    afterCommittedTest: (_s, _t, success, by) =>
      success ? [{ type: 'IfTestResult', atLeast, then: [backToHand(by, code)] }] : [],
  })
}

/** Unexpected Courage (2): returns to hand if the test fails. */
export function registerUnexpectedCourage(code: string): void {
  registerPlayerCard({
    code,
    afterCommittedTest: (_s, _t, success, by) => (success ? [] : [backToHand(by, code)]),
  })
}

/** On the Brink: if the test fails, every other committed card returns to its owner's hand. */
export function registerOnTheBrink(code: string): void {
  registerPlayerCard({
    code,
    afterCommittedTest: (_s, _t, success) =>
      success ? [] : [{ type: 'ReturnCommittedToHand', except: code }],
  })
}
