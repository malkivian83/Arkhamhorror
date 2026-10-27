/** Shared Dunwich encounters: Sorcery and Whippoorwills (02083–02084, 02090–02091). */
import {
  getInvestigator,
  registerEnemy,
  registerTreachery,
  type InvestigatorId,
  type Message,
  type Treachery,
} from '@lcg/engine'
import { copies, damage, effectTest, enemy, treachery } from '../scenario-helpers'
import { THE_BEYOND, THE_BEYOND_CODES } from './the-beyond'
import { BISHOPS_THRALLS, AGENTS_OF_YOG, REMAINING_CODES } from './remaining-encounters'

export const DUNWICH_SETS = {
  ...REMAINING_CODES,
  ...THE_BEYOND_CODES,
  visionsOfFuturesPast: '02083',
  beyondTheVeil: '02084',
  whippoorwill: '02090',
  eagerForDeath: '02091',
} as const

export const whippoorwill = enemy({
  code: DUNWICH_SETS.whippoorwill,
  name: 'Whippoorwill',
  traits: ['Creature'],
  fight: 2,
  health: 1,
  evade: 4,
  damage: 0,
  horror: 1,
  keywords: ['aloof', 'hunter'],
})

export const DUNWICH_ENCOUNTER_SETS = {
  bishopsThralls: BISHOPS_THRALLS,
  agentsOfYog: AGENTS_OF_YOG,
  theBeyond: THE_BEYOND,
  sorcery: [
    ...copies(
      treachery({
        code: DUNWICH_SETS.visionsOfFuturesPast,
        name: 'Visions of Futures Past',
        traits: ['Hex'],
        keywords: [],
      }),
      3,
    ),
    ...copies(
      treachery({
        code: DUNWICH_SETS.beyondTheVeil,
        name: 'Beyond the Veil',
        traits: ['Hex'],
        keywords: ['surge'],
      }),
      3,
    ),
  ],
  whippoorwills: [
    ...copies(whippoorwill, 3),
    ...copies(
      treachery({
        code: DUNWICH_SETS.eagerForDeath,
        name: 'Eager for Death',
        traits: ['Omen'],
        keywords: [],
      }),
      2,
    ),
  ],
}

registerTreachery({
  code: DUNWICH_SETS.visionsOfFuturesPast,
  revelation: (_state, investigator) => [
    effectTest(investigator, 'Visions of Futures Past', 'willpower', 5, {
      onFailEach: [{ type: 'MillDeck', investigator, amount: 1 }],
    }),
  ],
})

const veilDamage = (investigator: InvestigatorId, self: Treachery): Message[] => [
  damage(investigator, 10),
  { type: 'DiscardTreachery', treachery: self.id },
]

registerTreachery({
  code: DUNWICH_SETS.beyondTheVeil,
  revelation: (state, investigator, self) => {
    const duplicate = Object.values(state.treacheries).some(
      (t) =>
        t.id !== self.id &&
        t.code === self.code &&
        t.placement.type === 'threatArea' &&
        t.placement.investigator === investigator,
    )
    if (duplicate) return []
    return [
      {
        type: 'PlaceTreachery',
        treachery: self.id,
        placement: { type: 'threatArea', investigator },
      },
      ...(getInvestigator(state, investigator).deck.length === 0
        ? veilDamage(investigator, self)
        : []),
    ]
  },
  forced: (_state, trigger, self) =>
    trigger.type === 'deckEmptied' &&
    self.placement.type === 'threatArea' &&
    self.placement.investigator === trigger.investigator
      ? veilDamage(trigger.investigator, self)
      : [],
})

registerEnemy({ code: DUNWICH_SETS.whippoorwill, skillModifier: () => -1 })

registerTreachery({
  code: DUNWICH_SETS.eagerForDeath,
  revelation: (state, investigator) => [
    effectTest(
      investigator,
      'Eager for Death',
      'willpower',
      2 + getInvestigator(state, investigator).damage,
      {
        onFail: [damage(investigator, 0, 2)],
      },
    ),
  ],
})
