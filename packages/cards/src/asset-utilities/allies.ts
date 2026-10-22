import { getInvestigator, playerCardDef, registerPlayerCard, type Message } from '@lcg/engine'
import { reaction } from '../core-2026/cards'
import { cardName, elite, enemiesHere, fast, resources, skillBonus } from './register'

const hit = (enemy: string, by: string): Message => ({
  type: 'DamageEnemy',
  enemy,
  amount: 1,
  by,
})

// Beat Cop (0): +1 combat; fast, discard it: 1 damage to an enemy at your location.
// Beat Cop (2): +1 combat; fast, exhaust it and deal 1 damage to it: the same.
for (const [codes, level] of [
  [['01018', '01518'], 0],
  [['01028', '01528'], 2],
] as const)
  for (const code of codes)
    registerPlayerCard({
      code,
      skillModifier: skillBonus('combat'),
      abilities: (state, self, investigator) =>
        level === 2 && self.exhausted
          ? []
          : enemiesHere(state, investigator).map((e) =>
              fast(
                self,
                `cop:${e.id}`,
                level === 0 ? 'ability.discardToDamage' : 'ability.exhaustToDamage',
                { enemy: e.name },
                level === 0
                  ? [{ type: 'DiscardAsset', asset: self.id }]
                  : [
                      { type: 'ExhaustAsset', asset: self.id },
                      { type: 'DamageAsset', asset: self.id, damage: 1, horror: 0 },
                    ],
                [hit(e.id, investigator)],
                { type: 'enemy', id: e.id },
              ),
            ),
    })

// Hired Muscle (1) and Treasure Hunter (1): +1 to a skill; at the end of the round (after
// upkeep), pay 1 resource or discard it.
for (const [code, skill] of [
  ['02027', 'combat'],
  ['04025', 'intellect'],
] as const)
  registerPlayerCard({
    code,
    skillModifier: skillBonus(skill),
    forced: (state, trigger, self) =>
      trigger.type !== 'roundEnds'
        ? []
        : resources(state, self.owner) < 1
          ? [{ type: 'DiscardAsset', asset: self.id }]
          : [
              {
                type: 'Ask',
                investigator: self.owner,
                question: {
                  kind: 'chooseOne',
                  prompt: 'prompt.upkeepCost',
                  promptParams: { card: cardName(code) },
                  alwaysAsk: true,
                  choices: [
                    {
                      label: 'choice.payResource',
                      then: [{ type: 'SpendResources', investigator: self.owner, amount: 1 }],
                    },
                    {
                      label: 'choice.discard',
                      params: { card: cardName(code) },
                      then: [{ type: 'DiscardAsset', asset: self.id }],
                    },
                  ],
                },
              },
            ],
  })

// Field Agent (2): +1 intellect; fast, exhaust it and deal 1 horror to it: discover 1 clue.
registerPlayerCard({
  code: '09033',
  skillModifier: skillBonus('intellect'),
  abilities: (_state, self, investigator) =>
    self.exhausted
      ? []
      : [
          fast(
            self,
            'clue',
            'ability.discoverClue',
            {},
            [
              { type: 'ExhaustAsset', asset: self.id },
              { type: 'DamageAsset', asset: self.id, damage: 0, horror: 1 },
            ],
            [{ type: 'DiscoverClues', investigator, amount: 1 }],
          ),
        ],
})

// Stray Cat: fast, discard it: automatically evade a non-Elite enemy at your location.
for (const code of ['01076', '01576'])
  registerPlayerCard({
    code,
    abilities: (state, self, investigator) =>
      enemiesHere(state, investigator)
        .filter((e) => !elite(e.traits))
        .map((e) =>
          fast(
            self,
            `cat:${e.id}`,
            'ability.discardToEvade',
            { enemy: e.name },
            [{ type: 'DiscardAsset', asset: self.id }],
            [{ type: 'EvadeEnemy', enemy: e.id, by: investigator }],
            { type: 'enemy', id: e.id },
          ),
        ),
  })

// Mysterious Raven: fast, discard it and take 1 horror: discover 1 clue at your location.
registerPlayerCard({
  code: '60509',
  abilities: (state, self, investigator) =>
    getInvestigator(state, investigator).location === null
      ? []
      : [
          fast(
            self,
            'raven',
            'ability.ravenClue',
            {},
            [
              { type: 'DiscardAsset', asset: self.id },
              { type: 'TakeDamage', investigator, damage: 0, horror: 1 },
            ],
            [{ type: 'DiscoverClues', investigator, amount: 1 }],
          ),
        ],
})

// Guard Dog: when an enemy attack deals damage to it, deal 1 damage to the attacking enemy.
for (const code of ['01021', '01521'])
  registerPlayerCard({
    code,
    reactions: (state, trigger, self) =>
      trigger.type === 'afterDamageAssigned' &&
      trigger.enemy &&
      state.enemies[trigger.enemy] &&
      trigger.dealt.some((d) => d.asset === self.id && d.damage > 0)
        ? [
            reaction(self, 'ability.guardDog', [hit(trigger.enemy, self.owner)], {
              enemy: state.enemies[trigger.enemy]!.name,
            }),
          ]
        : [],
  })

// Psychology Student: after you play it, heal 2 horror from an investigator or an Ally
// asset at your location.
registerPlayerCard({
  code: '60258',
  reactions: (state, trigger, self) => {
    if (trigger.type !== 'afterPlayAsset' || trigger.asset !== self.id) return []
    const here = getInvestigator(state, self.owner).location
    const people = state.investigators.filter(
      (i) => !i.eliminated && i.location === here && i.horror > 0,
    )
    const allies = Object.values(state.assets).filter(
      (a) =>
        a.horror > 0 &&
        getInvestigator(state, a.owner).location === here &&
        (playerCardDef(a.code)?.traits ?? []).includes('Ally'),
    )
    return [
      ...people.map((i) =>
        reaction(
          self,
          'ability.healHorrorOf',
          [{ type: 'Heal', investigator: i.id, damage: 0, horror: 2 }],
          { name: i.name },
          `:${i.id}`,
        ),
      ),
      ...allies.map((a) =>
        reaction(
          self,
          'ability.healHorrorOf',
          [{ type: 'HealAsset', asset: a.id, damage: 0, horror: 2 }],
          { name: cardName(a.code) },
          `:${a.id}`,
        ),
      ),
    ]
  },
})
