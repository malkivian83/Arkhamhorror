import {
  canEnter,
  getInvestigator,
  placedLocation,
  registerPlayerCard,
  registerPlayerCards,
  type AbilityOption,
  type GameState,
  type Message,
  type SkillType,
} from '@lcg/engine'
import { C } from './codes'

export const MASKS = [C.pantalone, C.medico, C.bauta, C.volto]
const masks: [string, string, SkillType][] = [
  [C.pantalone, 'Pantalone', 'intellect'],
  [C.medico, 'Medico Della Peste', 'willpower'],
  [C.bauta, 'Bauta', 'combat'],
  [C.volto, 'Gilded Volto', 'agility'],
]
registerPlayerCards([
  ...masks.map(([code, name, skill]) => ({
    code,
    name,
    type: 'asset' as const,
    class: 'neutral',
    cost: 1,
    traits: ['Item', 'Mask'],
    slots: [],
    story: true,
    icons: { [skill]: 1, wild: 1 },
  })),
  {
    code: C.abbess,
    name: 'Abbess Allegria Di Biase',
    type: 'asset',
    class: 'neutral',
    cost: 4,
    unique: true,
    traits: ['Ally', 'Believer'],
    slots: ['ally'],
    health: 2,
    sanity: 2,
    story: true,
    icons: { willpower: 1, intellect: 1, wild: 1 },
  },
])
for (const [code, , skill] of masks)
  registerPlayerCard({
    code,
    limitTrait: 'Mask',
    reactions: (s, t, a) => {
      if (
        t.type === 'afterSkillTestInitiated' &&
        t.investigator === a.owner &&
        s.skillTest?.skill !== skill
      )
        return [
          {
            key: `${a.id}:skill`,
            investigator: a.owner,
            label: `ability.carnevale.maskSkill.${skill}`,
            then: [
              { type: 'DiscardAsset', asset: a.id },
              { type: 'ModifySkillTest', skill },
            ],
          },
        ]
      if (t.type !== 'afterAssetEntersPlay' || t.asset !== a.id) return []
      const me = getInvestigator(s, a.owner)
      let then: Message[]
      if (code === C.bauta) then = [{ type: 'GainResources', investigator: a.owner, amount: 2 }]
      else if (code === C.pantalone)
        then = [{ type: 'DrawCards', investigator: a.owner, amount: 2 }]
      else if (code === C.volto) then = [{ type: 'NextAssetFast', investigator: a.owner }]
      else {
        const choices = (
          [
            ['damage', me.damage],
            ['horror', me.horror],
          ] as const
        )
          .filter(([, n]) => n > 0)
          .map(([kind]) => ({
            label: `choice.carnevale.heal${kind}`,
            then: [
              {
                type: 'Heal' as const,
                investigator: a.owner,
                damage: kind === 'damage' ? 1 : 0,
                horror: kind === 'horror' ? 1 : 0,
              },
            ],
          }))
        if (!choices.length) return []
        then = [
          {
            type: 'Ask',
            investigator: a.owner,
            question: { kind: 'chooseOne', prompt: 'prompt.carnevale.heal', choices },
          },
        ]
      }
      return [
        { key: `${a.id}:enter`, investigator: a.owner, label: 'ability.carnevale.maskEnter', then },
      ]
    },
  })

function abbessMoves(
  s: GameState,
  id: string,
  location: string | null,
  exhausted: boolean,
  investigator: string,
): AbilityOption[] {
  const me = getInvestigator(s, investigator)
  if (!location || !me.location || exhausted) return []
  const destinations =
    me.location === location
      ? (s.locations[location]?.connections ?? [])
      : s.locations[me.location]?.connections.includes(location)
        ? [location]
        : []
  return destinations
    .filter((to) => canEnter(s, investigator, to))
    .map((to) => ({
      key: `${id}:move`,
      label: 'ability.carnevale.abbess',
      params: { location: s.locations[to]!.name },
      actions: 0,
      provokes: false,
      then: [
        { type: 'ExhaustAsset', asset: id },
        { type: 'MoveTo', investigator, location: to },
      ],
    }))
}
registerPlayerCard({
  code: C.abbess,
  placedFastOptions: (s, a) =>
    s.investigators
      .filter((i) => !i.eliminated)
      .flatMap((i) =>
        abbessMoves(s, a.id, placedLocation(s, a), a.exhausted, i.id).map((o) => ({
          ...o,
          investigator: i.id,
          target: { type: 'placed' as const, id: a.id },
        })),
      ),
  fastOptions: (s, a) =>
    s.investigators
      .filter((i) => !i.eliminated)
      .flatMap((i) =>
        abbessMoves(s, a.id, getInvestigator(s, a.owner).location, a.exhausted, i.id).map((o) => ({
          ...o,
          investigator: i.id,
        })),
      ),
})
