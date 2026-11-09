// RR: Triggered Abilities, Healing, Uses, Weaknesses, Researched, Encounter Deck, Limits.
import {
  getInvestigator,
  getLocation,
  playerCardDef,
  registerInvestigator,
  registerPlayerCard,
  registerTreachery,
  type Choice,
  type EncounterCard,
  type GameState,
  type Message,
} from '@lcg/engine'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'

export const CAROLYN = '60251'
export const EXPERIMENTAL_PSYCHOLOGY = '60252'
export const UNBROKEN_WEB = '60253'
export const LETHAL_CURIOSITY = '60254'
export const PRIVATE_PRACTICE = '60257'
export const TYPEWRITER = '60272'
export const WORDS_OF_BAST = '60279'
const PHARAOHS_NOTE = 'you have unearthed the secrets of the Pharaohs'

const isAlly = (code: string) => playerCardDef(code)?.traits.includes('Ally') ?? false
const here = (s: GameState, by: string) => {
  const location = getInvestigator(s, by).location
  return location === null
    ? []
    : s.investigators.filter((i) => !i.eliminated && i.location === location)
}

/** "Heal 1 horror from an investigator (or [[Ally]] asset) at your location", healed by `by`. */
function healChoices(s: GameState, by: string, allies: boolean): Choice[] {
  const people = here(s, by)
  return [
    ...people
      .filter((i) => i.horror > 0)
      .map((i): Choice => ({
        label: 'choice.healHorrorOf',
        params: { name: i.name },
        target: { type: 'investigator', id: i.id },
        then: [{ type: 'Heal', investigator: i.id, damage: 0, horror: 1, healer: by }],
      })),
    ...(allies
      ? Object.values(s.assets)
          .filter((a) => a.horror > 0 && isAlly(a.code) && people.some((i) => i.id === a.owner))
          .map((a): Choice => ({
            label: 'choice.healHorrorOf',
            params: { name: cardName(a.code) },
            target: { type: 'asset', id: a.id },
            then: [{ type: 'HealAsset', asset: a.id, damage: 0, horror: 1, healer: by }],
          }))
      : []),
  ]
}

/** Top encounter cards revealed by Words of Bast (3 for each secret spent). */
const revealed = (s: GameState, count: number): EncounterCard[] => s.encounterDeck.slice(0, count)
const discardable = (card: EncounterCard) =>
  !(card.keywords as string[]).includes('peril') && !(card.traits ?? []).includes('Elite')

export function registerCarolynCard(code: string): void {
  if (code === CAROLYN) {
    registerInvestigator({
      code,
      reactions: (s, t, self) => {
        if (
          t.type !== 'afterHorrorHealed' ||
          t.healer !== self.id ||
          (t.target.type === 'asset' && !isAlly(t.target.code)) ||
          self.location === null ||
          getLocation(s, self.location).clues === 0
        )
          return []
        return [
          {
            key: 'carolyn',
            investigator: self.id,
            label: 'ability.carolynClue',
            limit: { per: 'round' },
            then: [{ type: 'DiscoverClues', investigator: self.id, amount: 1 }],
          },
        ]
      },
      // The heal does not depend on the result of the test.
      elderSign: (_s, self) => ({
        modifier: 1,
        immediate: [continuation(code, self.id, 'elderSign')],
      }),
    })
    registerPlayerCard({
      code,
      effect: (s, by, step) => (step === 'elderSign' ? ask(by, healChoices(s, by, false)) : []),
    })
    return
  }
  if (code === EXPERIMENTAL_PSYCHOLOGY) {
    registerPlayerCard({
      code,
      abilities: (_s, a, by) =>
        by !== a.owner
          ? []
          : [
              {
                key: a.id + ':test',
                label: 'ability.experimentalPsychologyTest',
                actions: 1,
                provokes: true,
                then: [
                  {
                    type: 'BeginSkillTest',
                    investigator: by,
                    skill: 'intellect',
                    difficulty: 2,
                    source: a.id,
                    kind: {
                      type: 'effect',
                      source: cardName(code),
                      onSuccess: [continuation(code, by, 'heal')],
                      onFail: [],
                      onFailEach: [],
                    },
                  },
                ],
              },
            ],
      reactions: (s, t, a) =>
        t.type === 'afterHorrorHealed' &&
        t.healer === a.owner &&
        t.target.type === 'investigator' &&
        !a.exhausted &&
        !getInvestigator(s, t.target.id).eliminated
          ? [
              {
                key: a.id + ':bonus',
                investigator: a.owner,
                label: 'ability.experimentalPsychologyBonus',
                params: { name: getInvestigator(s, t.target.id).name },
                then: [
                  { type: 'ExhaustAsset', asset: a.id },
                  { type: 'NextTestBonus', investigator: t.target.id, amount: 2, thisRound: true },
                ],
              },
            ]
          : [],
      effect: (s, by, step) => (step === 'heal' ? ask(by, healChoices(s, by, true)) : []),
    })
    return
  }
  if (code === UNBROKEN_WEB) {
    registerTreachery({
      code,
      tokenKind: 'horror',
      revelation: (_s, by, t) => [
        {
          type: 'PlaceTreachery',
          treachery: t.id,
          placement: { type: 'threatArea', investigator: by },
        },
      ],
      reactions: (_s, t, self) =>
        t.type === 'whenWouldDiscoverClues' &&
        self.placement.type === 'threatArea' &&
        self.placement.investigator === t.investigator
          ? [
              {
                key: self.id + ':web',
                investigator: t.investigator,
                label: 'ability.unbrokenWeb',
                params: { n: t.amount },
                // Horror on the web is kept as its tokens; 4 or more discard it.
                then: [
                  {
                    type: 'AddTreacheryTokens',
                    treachery: self.id,
                    amount: t.amount,
                    discardAt: 4,
                  },
                ],
              },
            ]
          : [],
      whenGameEnds: (_s, self) => {
        const owner =
          self.owner ??
          (self.placement.type === 'threatArea' ? self.placement.investigator : undefined)
        return owner ? [{ type: 'EarnExperience', investigator: owner, amount: -2 }] : []
      },
    })
    return
  }
  if (code === LETHAL_CURIOSITY) {
    registerTreachery({
      code,
      revelation: (_s, by) => [
        {
          type: 'BeginSkillTest',
          investigator: by,
          skill: 'willpower',
          difficulty: 4,
          kind: {
            type: 'effect',
            source: cardName(code),
            onSuccess: [],
            onFail: [],
            onFailEach: [
              {
                type: 'Ask',
                investigator: by,
                question: {
                  kind: 'chooseOne',
                  prompt: 'prompt.chooseEffect',
                  choices: [
                    {
                      label: 'choice.takeDamage',
                      params: { n: 1 },
                      then: [{ type: 'TakeDamage', investigator: by, damage: 1, horror: 0 }],
                    },
                    {
                      label: 'choice.placeClue',
                      requires: { type: 'hasClues', investigator: by },
                      then: [{ type: 'PlaceCluesOnLocation', investigator: by, amount: 1 }],
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    })
    return
  }
  if (code === PRIVATE_PRACTICE) {
    registerPlayerCard({
      code,
      limitTitle: true,
      reactions: (_s, t, a) =>
        t.type === 'afterHorrorHealed' && t.healer === a.owner && !a.exhausted
          ? [
              {
                key: a.id + ':practice',
                investigator: a.owner,
                label: 'ability.privatePractice',
                then: [
                  { type: 'ExhaustAsset', asset: a.id },
                  { type: 'GainResources', investigator: a.owner, amount: 1 },
                ],
              },
            ]
          : [],
    })
    return
  }
  if (code === TYPEWRITER) {
    registerPlayerCard({ code, discardWhenEmpty: true, lendsUses: { traits: ['Tome'] } })
    return
  }
  if (code === WORDS_OF_BAST) {
    registerPlayerCard({
      code,
      requiredResearch: PHARAOHS_NOTE,
      abilities: (s, a, by) =>
        by !== a.owner || !s.encounterDeck.length
          ? []
          : [1, 2]
              .filter((n) => a.uses >= n)
              .map((n) => ({
                key: a.id + ':bast:' + n,
                label: 'ability.wordsOfBast',
                params: { n, count: 3 * n },
                actions: 1,
                provokes: true,
                costs: [
                  { type: 'TakeDamage', investigator: by, damage: 0, horror: 1 },
                  { type: 'SpendUses', asset: a.id, amount: n },
                ],
                then: [continuation(code, by, 'reveal', { count: 3 * n })],
              })),
      effect: (s, by, step, data) => {
        const count = Math.min(Number(data.count ?? 0), s.encounterDeck.length)
        if (!count) return []
        const cards = revealed(s, count)
        if (step === 'reveal') {
          const seen: Message = {
            type: 'Log',
            key: 'choice.divinationSeen',
            params: { cards: cards.map((c) => c.name).join(', ') },
          }
          const eligible = cards
            .map((card, index) => ({ card, index }))
            .filter(({ card }) => discardable(card))
          if (!eligible.length) return [seen, continuation(code, by, 'order', { count, order: '' })]
          return [
            seen,
            ...ask(
              by,
              eligible.map(({ card, index }) => ({
                label: 'choice.pharaohsDiscard',
                params: { card: card.name },
                then: [continuation(code, by, 'order', { count, discard: index, order: '' })],
              })),
              eligible.length > 1,
            ),
          ]
        }
        if (step !== 'order') return []
        const discard = data.discard === undefined ? -1 : Number(data.discard)
        const selected = String(data.order ?? '')
          .split(',')
          .filter(Boolean)
          .map(Number)
        const rest = cards.map((_, i) => i).filter((i) => i !== discard && !selected.includes(i))
        if (!rest.length)
          return discard < 0
            ? [{ type: 'ReorderDeck', count, order: selected, to: 'top' }]
            : [
                { type: 'ReorderDeck', count, order: [discard, ...selected], to: 'top' },
                { type: 'DiscardTopEncounter', investigator: by },
              ]
        return ask(
          by,
          rest.map((i) => ({
            label: 'choice.divinationNext',
            params: { card: cards[i]!.name, n: selected.length + 1 },
            then: [
              continuation(code, by, 'order', {
                count,
                ...(discard < 0 ? {} : { discard }),
                order: [...selected, i].join(','),
              }),
            ],
          })),
          rest.length > 1,
        )
      },
    })
    return
  }
  throw new Error('Unreviewed Carolyn Fern card: ' + code)
}
