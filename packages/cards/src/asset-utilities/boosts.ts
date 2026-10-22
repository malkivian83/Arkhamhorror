import {
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  type Message,
  type SkillType,
} from '@lcg/engine'
import { boost, cardName, resources } from './register'

const spend = (investigator: string, amount: number): Message => ({
  type: 'SpendResources',
  investigator,
  amount,
})

// Streetwise and Scrapper: spend resources for a bonus to one of two skills, only when the
// test uses that skill. Each activation can repeat while resources remain.
for (const [code, skills, cost, amount] of [
  ['60311', ['intellect', 'agility'], 2, 2],
  ['60511', ['combat', 'agility'], 1, 1],
] as const)
  registerPlayerCard({
    code,
    testOptions: (state, test, self) =>
      (skills as readonly SkillType[]).includes(test.skill) &&
      test.investigator === self.owner &&
      resources(state, self.owner) >= cost
        ? [
            boost(
              self,
              test.skill,
              'ability.spendForSkill',
              { skill: test.skill, n: cost },
              [spend(self.owner, cost)],
              amount,
            ),
          ]
        : [],
  })

// High Roller (2): spend 3 resources and exhaust: +2; if the test succeeds, gain 3.
registerPlayerCard({
  code: '04156',
  testOptions: (state, test, self) =>
    !self.exhausted && test.investigator === self.owner && resources(state, self.owner) >= 3
      ? [
          boost(
            self,
            'roll',
            'ability.highRoller',
            {},
            [spend(self.owner, 3), { type: 'ExhaustAsset', asset: self.id }],
            2,
            [
              {
                type: 'ModifySkillTest',
                onSuccess: [{ type: 'GainResources', investigator: self.owner, amount: 3 }],
              },
            ],
          ),
        ]
      : [],
})

// Cornered (2): discard 1 card from your hand for +2, once per test.
registerPlayerCard({
  code: '04160',
  testOptions: (state, test, self) => {
    const hand = getInvestigator(state, self.owner).hand
    if (test.investigator !== self.owner || hand.length === 0) return []
    if (test.abilityCounts?.[`${self.id}:cornered`]) return []
    return [
      boost(
        self,
        'cornered',
        'ability.cornered',
        {},
        [
          { type: 'ChooseDiscardFromHand', investigator: self.owner, amount: 1 },
          { type: 'ModifySkillTest', use: `${self.id}:cornered` },
        ],
        2,
      ),
    ]
  },
})

// Well Connected (0): exhaust for +1 per 5 resources you have. Limit 1 per investigator.
registerPlayerCard({
  code: '05028',
  limitTitle: true,
  testOptions: (state, test, self) => {
    const amount = Math.floor(resources(state, self.owner) / 5)
    return !self.exhausted && test.investigator === self.owner && amount > 0
      ? [
          boost(
            self,
            'connected',
            'ability.exhaustForBonus',
            {},
            [{ type: 'ExhaustAsset', asset: self.id }],
            amount,
          ),
        ]
      : []
  },
})

// Quick Study (2): place 1 of your clues on your location and exhaust: +3.
registerPlayerCard({
  code: '04154',
  testOptions: (state, test, self) => {
    const me = getInvestigator(state, self.owner)
    return !self.exhausted && test.investigator === self.owner && me.clues > 0 && me.location
      ? [
          boost(
            self,
            'study',
            'ability.quickStudy',
            {},
            [
              { type: 'PlaceCluesOnLocation', investigator: self.owner, amount: 1 },
              { type: 'ExhaustAsset', asset: self.id },
            ],
            3,
          ),
        ]
      : []
  },
})

// Well Prepared (2): exhaust and choose an asset you control: +X, its matching skill icons.
registerPlayerCard({
  code: '04151',
  testOptions: (state, test, self) => {
    if (self.exhausted || test.investigator !== self.owner) return []
    return Object.values(state.assets)
      .filter((a) => a.owner === self.owner)
      .flatMap((a) => {
        const icons = playerCardDef(a.code)?.icons ?? {}
        const amount = (icons[test.skill] ?? 0) + (icons.wild ?? 0)
        return amount > 0
          ? [
              boost(
                self,
                `prepared:${a.id}`,
                'ability.wellPrepared',
                { asset: cardName(a.code) },
                [{ type: 'ExhaustAsset', asset: self.id }],
                amount,
              ),
            ]
          : []
      })
  },
})

// Police Dog (0, 1): during an attack or investigation at your location, exhaust: the
// performing investigator gets +1 (+2).
for (const [code, amount] of [
  ['60156', 1],
  ['60170', 2],
] as const)
  registerPlayerCard({
    code,
    helpsOtherTests: true,
    testOptions: (state, test, self) => {
      const here = getInvestigator(state, self.owner).location
      return !self.exhausted &&
        (test.kind.type === 'fight' || test.kind.type === 'investigate') &&
        here !== null &&
        getInvestigator(state, test.investigator).location === here
        ? [
            boost(
              self,
              'dog',
              'ability.exhaustForBonus',
              {},
              [{ type: 'ExhaustAsset', asset: self.id }],
              amount,
            ),
          ]
        : []
    },
  })
