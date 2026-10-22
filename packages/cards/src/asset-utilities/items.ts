import {
  engagedEnemies,
  getInvestigator,
  getLocation,
  playerCardDef,
  registerPlayerCard,
  type AbilityOption,
  type Message,
} from '@lcg/engine'
import { reaction } from '../core-2026/cards'
import { cardName, fast } from './register'

// Offering Bowl: fast, spend 1 offering and exhaust: take 1 damage and gain 2 resources.
registerPlayerCard({
  code: '60456',
  discardWhenEmpty: true,
  abilities: (_state, self, investigator) =>
    self.exhausted || self.uses < 1
      ? []
      : [
          fast(
            self,
            'bowl',
            'ability.offeringBowl',
            {},
            [
              { type: 'SpendUses', asset: self.id, amount: 1 },
              { type: 'ExhaustAsset', asset: self.id },
            ],
            [
              { type: 'TakeDamage', investigator, damage: 1, horror: 0 },
              { type: 'GainResources', investigator, amount: 2 },
            ],
          ),
        ],
})

// Canteen (2): fast, spend 1 supply and exhaust: heal 2 horror.
registerPlayerCard({
  code: '60573',
  abilities: (state, self, investigator) =>
    self.exhausted || self.uses < 1 || getInvestigator(state, investigator).horror < 1
      ? []
      : [
          fast(
            self,
            'canteen',
            'ability.healHorror',
            { n: 2 },
            [
              { type: 'SpendUses', asset: self.id, amount: 1 },
              { type: 'ExhaustAsset', asset: self.id },
            ],
            [{ type: 'Heal', investigator, damage: 0, horror: 2 }],
          ),
        ],
})

// Scroll of Prophecies: action, spend 1 secret: an investigator at your location draws 3
// cards, then discards 1 card from their hand.
registerPlayerCard({
  code: '06116',
  abilities: (state, self, investigator) => {
    const here = getInvestigator(state, investigator).location
    if (self.uses < 1 || here === null) return []
    return state.investigators
      .filter((i) => !i.eliminated && i.location === here)
      .map((i): AbilityOption => ({
        key: `${self.id}:scroll:${i.id}`,
        label: 'ability.scrollOfProphecies',
        params: { card: cardName(self.code), name: i.name },
        actions: 1,
        provokes: true,
        costs: [{ type: 'SpendUses', asset: self.id, amount: 1 }],
        then: [
          { type: 'DrawCards', investigator: i.id, amount: 3 },
          { type: 'ChooseDiscardFromHand', investigator: i.id, amount: 1 },
        ],
      }))
  },
})

// Feed the Mind: action, exhaust and spend 1 secret: test intellect (1); draw 1 card per
// point you succeed by, up to 3.
registerPlayerCard({
  code: '60209',
  abilities: (_state, self, investigator) =>
    self.exhausted || self.uses < 1
      ? []
      : [
          {
            key: `${self.id}:feed`,
            label: 'ability.feedTheMind',
            params: { card: cardName(self.code) },
            actions: 1,
            provokes: true,
            costs: [
              { type: 'ExhaustAsset', asset: self.id },
              { type: 'SpendUses', asset: self.id, amount: 1 },
            ],
            then: [
              {
                type: 'BeginSkillTest',
                investigator,
                skill: 'intellect',
                difficulty: 1,
                source: self.id,
                kind: {
                  type: 'effect',
                  source: cardName(self.code),
                  onSuccess: [1, 2, 3].map((atLeast): Message => ({
                    type: 'IfTestResult',
                    atLeast,
                    then: [{ type: 'DrawCards', investigator, amount: 1 }],
                  })),
                  onFail: [],
                  onFailEach: [],
                },
              },
            ],
          },
        ],
})

// Book of Shadows: level 3 adds an arcane slot; action, exhaust (level 1: and spend 1
// resource): add 1 charge to a Spell asset you control.
for (const [codes, paid] of [
  [['01070', '01570'], false],
  [['03154'], true],
] as const)
  for (const code of codes)
    registerPlayerCard({
      code,
      ...(paid ? {} : { extraSlots: { arcane: 1 } }),
      abilities: (state, self, investigator) =>
        self.exhausted || (paid && getInvestigator(state, investigator).resources < 1)
          ? []
          : Object.values(state.assets)
              .filter(
                (a) => a.owner === investigator && playerCardDef(a.code)?.traits.includes('Spell'),
              )
              .map((a): AbilityOption => ({
                key: `${self.id}:charge:${a.id}`,
                label: 'ability.addCharge',
                params: { card: cardName(self.code), asset: cardName(a.code) },
                target: { type: 'asset', id: a.id },
                actions: 1,
                provokes: true,
                costs: [
                  { type: 'ExhaustAsset', asset: self.id },
                  ...(paid ? [{ type: 'SpendResources' as const, investigator, amount: 1 }] : []),
                ],
                then: [{ type: 'AddUses', asset: a.id, amount: 1 }],
              })),
    })

// Pathfinder (1): fast during your turn, if no enemy is engaged with you, exhaust: move to a
// connecting location.
registerPlayerCard({
  code: '02108',
  abilities: (state, self, investigator) =>
    self.exhausted ||
    state.activeTurn !== investigator ||
    engagedEnemies(state, investigator).length
      ? []
      : [
          fast(
            self,
            'path',
            'ability.moveWithCard',
            {},
            [{ type: 'ExhaustAsset', asset: self.id }],
            [{ type: 'ChooseMove', investigator }],
          ),
        ],
})

// Loner: limit 1 per investigator; fast during your turn, exhaust: move to an empty
// connecting location.
registerPlayerCard({
  code: '60557',
  limitTitle: true,
  abilities: (state, self, investigator) => {
    const here = getInvestigator(state, investigator).location
    if (self.exhausted || state.activeTurn !== investigator || here === null) return []
    return getLocation(state, here)
      .connections.filter(
        (id) =>
          state.locations[id] &&
          !state.investigators.some((i) => !i.eliminated && i.location === id),
      )
      .map((id) =>
        fast(
          self,
          `loner:${id}`,
          'ability.moveTo',
          { location: getLocation(state, id).name },
          [{ type: 'ExhaustAsset', asset: self.id }],
          [{ type: 'MoveTo', investigator, location: id }],
          { type: 'location', id },
        ),
      )
  },
})

// Esoteric Atlas (2): action, spend 1 secret: move to a revealed location up to 3
// connections away.
registerPlayerCard({
  code: '60222',
  abilities: (_state, self, investigator) =>
    self.uses < 1
      ? []
      : [
          {
            key: `${self.id}:atlas`,
            label: 'ability.moveWithCard',
            params: { card: cardName(self.code) },
            actions: 1,
            provokes: true,
            costs: [{ type: 'SpendUses', asset: self.id, amount: 1 }],
            then: [{ type: 'ChooseMove', investigator, revealedOnly: true, range: 3 }],
          },
        ],
})

// Research Librarian: after it enters play, search your deck for a Tome asset, add it to
// your hand and shuffle.
for (const code of ['01032', '01532'])
  registerPlayerCard({
    code,
    reactions: (_s, trigger, self) =>
      trigger.type === 'afterAssetEntersPlay' && trigger.asset === self.id
        ? [
            reaction(self, 'ability.searchDeck', [
              {
                type: 'SearchDeck',
                investigator: self.owner,
                traits: ['Tome'],
                to: 'hand',
                optional: true,
              },
            ]),
          ]
        : [],
  })

// Venturer: fast, spend 1 supply and exhaust: place 1 supply or ammo on an asset controlled
// by an investigator at your location (one that uses supplies or ammo).
registerPlayerCard({
  code: '04018',
  abilities: (state, self, investigator) => {
    const here = getInvestigator(state, investigator).location
    if (self.exhausted || self.uses < 1 || here === null) return []
    return Object.values(state.assets)
      .filter((a) => {
        const type = playerCardDef(a.code)?.uses?.type
        return (
          a.id !== self.id &&
          ['ammo', 'supply', 'supplies'].includes(type ?? '') &&
          getInvestigator(state, a.owner).location === here
        )
      })
      .map((a) =>
        fast(
          self,
          `supply:${a.id}`,
          'ability.placeUse',
          { asset: cardName(a.code) },
          [
            { type: 'SpendUses', asset: self.id, amount: 1 },
            { type: 'ExhaustAsset', asset: self.id },
          ],
          [{ type: 'AddUses', asset: a.id, amount: 1 }],
          { type: 'asset', id: a.id },
        ),
      )
  },
})
