import { getInvestigator, registerPlayerCard, type Message, type SkillType } from '@lcg/engine'

const later = (then: Message[]): Message => ({ type: 'AfterCurrentSkillTest', then })
const backToHand = (investigator: string, code: string): Message =>
  later([{ type: 'DiscardToHand', investigator, code }])

/** Gains icons of each skill equal to your value in the other one (base skill values). */
export function registerSwapSkill(code: string, a: SkillType, b: SkillType): void {
  registerPlayerCard({
    code,
    additionalIcons: (s, _t, by) => {
      const skills = getInvestigator(s, by).skills
      return { [a]: skills[b], [b]: skills[a] }
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
      return { wild: Math.min(...others.map((k) => skills[k])) }
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
          s.investigators.some((i) => i.id === a.investigator && i.location === here),
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
