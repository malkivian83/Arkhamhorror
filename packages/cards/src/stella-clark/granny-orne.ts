import { getInvestigator, registerPlayerCard, type Asset, type GameState } from '@lcg/engine'
import { GRANNY_ORNE, GRANNY_ORNE_3 } from './codes'

/** The investigator whose test would fail is at Granny Orne's location. */
function tester(state: GameState, self: Asset, investigator: string) {
  const here = getInvestigator(state, self.owner).location
  const performer = getInvestigator(state, investigator)
  return here !== null && performer.location === here && !self.exhausted ? performer : null
}

// RR: Triggered Abilities ("when … would fail", ST.6), Skill Test Results. Granny Orne: you
// get +1 [willpower]. [reaction] When an investigator at your location would fail a skill
// test, exhaust her: that investigator fails by either 1 less or 1 more.
registerPlayerCard({
  code: GRANNY_ORNE,
  skillModifier: (_s, _a, t) => (t.skill === 'willpower' ? 1 : 0),
  reactions: (state, trigger, self) => {
    if (trigger.type !== 'whenWouldFail') return []
    const performer = tester(state, self, trigger.investigator)
    if (!performer) return []
    return [
      {
        key: self.id + ':failBy',
        investigator: self.owner,
        label: 'ability.grannyOrne',
        params: { name: performer.name },
        then: [
          { type: 'ExhaustAsset', asset: self.id },
          {
            type: 'Ask',
            investigator: self.owner,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.grannyOrne',
              choices: [
                { label: 'choice.failByLess', then: [{ type: 'ModifyFailBy', amount: -1 }] },
                { label: 'choice.failByMore', then: [{ type: 'ModifyFailBy', amount: 1 }] },
              ],
            },
          },
        ],
      },
    ]
  },
})

// Granny Orne (3): you get +1 [willpower] and +1 [intellect]. [reaction] When an investigator
// at your location would fail a skill test, exhaust her: that investigator gets either +1 or
// -1 skill value for that test (an automatic failure keeps a value of 0, so it cannot help).
registerPlayerCard({
  code: GRANNY_ORNE_3,
  skillModifier: (_s, _a, t) => (t.skill === 'willpower' || t.skill === 'intellect' ? 1 : 0),
  reactions: (state, trigger, self) => {
    if (trigger.type !== 'whenWouldFail' || state.skillTest?.autoFail) return []
    const performer = tester(state, self, trigger.investigator)
    if (!performer) return []
    return [
      {
        key: self.id + ':value',
        investigator: self.owner,
        label: 'ability.grannyOrne3',
        params: { name: performer.name },
        then: [
          { type: 'ExhaustAsset', asset: self.id },
          {
            type: 'Ask',
            investigator: self.owner,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.grannyOrne3',
              choices: [
                { label: 'choice.skillValuePlus', then: [{ type: 'BoostSkillTest', amount: 1 }] },
                { label: 'choice.skillValueMinus', then: [{ type: 'BoostSkillTest', amount: -1 }] },
              ],
            },
          },
        ],
      },
    ]
  },
})
