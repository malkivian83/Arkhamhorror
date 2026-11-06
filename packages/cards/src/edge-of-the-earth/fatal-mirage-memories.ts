import {
  expeditionPartners,
  getInvestigator,
  investigatorsAt,
  leadInvestigator,
  push,
  registerEnemy,
  type Enemy,
  type ExpeditionPartner,
  type GameState,
  type Message,
  type Trigger,
} from '@lcg/engine'
import { enemy } from '../scenario-helpers'
import { PRISON_OF_MEMORIES } from './fatal-mirage-map'
import { readMirageBack } from './fatal-mirage-story'
import { iceCanAddFrost } from './ice-and-death-locations'

const memories = [
  {
    location: '08570',
    partner: '08717',
    note: 'edgeOfTheEarthSinhaConfrontedHerDemons',
    card: enemy({
      code: '08576',
      name: 'Memory of a Lost Patient',
      fight: 3,
      health: 4,
      evade: 4,
      damage: 1,
      horror: 1,
      keywords: ['retaliate'],
    }),
  },
  {
    location: '08569',
    partner: '08714',
    note: 'edgeOfTheEarthDyerConfrontedHisDemons',
    card: enemy({
      code: '08579',
      name: 'Memory of a Regretful Voyage',
      fight: 2,
      health: 5,
      evade: 5,
      damage: 0,
      horror: 1,
      keywords: ['retaliate'],
    }),
  },
  {
    location: '08568',
    partner: '08715',
    note: 'edgeOfTheEarthDanforthConfrontedHisDemons',
    card: enemy({
      code: '08580',
      name: 'Memory of an Unspeakable Evil',
      fight: 4,
      health: 3,
      evade: 4,
      damage: 0,
      horror: 2,
      keywords: ['alert', 'retaliate'],
    }),
  },
  {
    location: '08574',
    partner: '08719',
    note: 'edgeOfTheEarthClaypoolConfrontedHisDemons',
    card: enemy({
      code: '08581',
      name: 'Memory of a Terrible Discovery',
      fight: 3,
      health: 4,
      evade: 3,
      damage: 1,
      horror: 1,
      keywords: ['alert'],
    }),
  },
  {
    location: '08572',
    partner: '08718',
    note: 'edgeOfTheEarthEllsworthConfrontedHisDemons',
    card: enemy({
      code: '08582',
      name: 'Memory of an Alien Transformation',
      fight: 3,
      health: 4,
      evade: 5,
      damage: 1,
      horror: 1,
      keywords: ['alert'],
    }),
  },
  {
    location: '08567',
    partner: '08716',
    note: 'edgeOfTheEarthEliyahConfrontedHisDemons',
    card: enemy({
      code: '08575',
      name: 'Memory of a Hunt Gone Awry',
      fight: 5,
      health: 3,
      evade: 2,
      damage: 1,
      horror: 1,
      keywords: ['alert', 'retaliate'],
    }),
  },
  {
    location: '08566',
    partner: '08722',
    note: 'edgeOfTheEarthTakadaConfrontedHerDemons',
    card: enemy({
      code: '08577',
      name: 'Memory of a Missing Father',
      fight: 3,
      health: 4,
      evade: 4,
      damage: 1,
      horror: 1,
      keywords: ['retaliate'],
    }),
  },
  {
    location: '08573',
    partner: '08721',
    note: 'edgeOfTheEarthCookieConfrontedHisDemons',
    card: enemy({
      code: '08578',
      name: 'Memory of a Ravaged Country',
      fight: 5,
      health: 3,
      evade: 3,
      damage: 2,
      horror: 1,
      keywords: ['retaliate'],
    }),
  },
  {
    location: '08571',
    partner: '08720',
    note: 'edgeOfTheEarthKenslerConfrontedHerDemons',
    card: enemy({
      code: '08583',
      name: 'Memory of an Unrequited Love',
      fight: 4,
      health: 3,
      evade: 3,
      damage: 1,
      horror: 1,
      keywords: ['alert'],
    }),
  },
] as const

export const isMirageMemory = (code: string): boolean =>
  memories.some(({ card }) => card.code === code)

function advanceChoice(state: GameState): Message[] {
  const lead = leadInvestigator(state)
  return lead
    ? [
        {
          type: 'Ask',
          investigator: lead.id,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.chooseEffect',
            choices: [
              { label: 'choice.edgeOfTheEarth.mirageAdvance', then: [{ type: 'AdvanceAct' }] },
              { label: 'choice.edgeOfTheEarth.mirageContinue', then: [] },
            ],
          },
        },
      ]
    : []
}

export function revealMirageMemory(state: GameState, origin: string, code: string) {
  const memory = memories.find(({ card, location }) => card.code === code && origin === location)
  if (!memory) return state
  const status = state.campaignLog?.expedition?.partners[memory.partner]?.status
  if (status !== 'eliminated') {
    return push(state, {
      type: 'SpawnEnemy',
      card: {
        ...memory.card,
        healthPerInvestigator: true,
        encounterBack: false,
        prey: {
          type: 'mostAssets',
          code: status === 'resolute' ? expeditionPartners[memory.partner] : memory.partner,
        },
        traits: ['Monster', 'Eidolon', 'Elite'],
        victory: 0,
      },
      location: origin,
      engageWith: null,
    })
  }
  return push(
    { ...state, victoryDisplay: [...state.victoryDisplay, origin + 'b'] },
    ...investigatorsAt(state, origin).map(({ id }): Message => ({
      type: 'MoveTo',
      investigator: id,
      location: PRISON_OF_MEMORIES,
    })),
    ...Object.values(state.enemies)
      .filter(
        (foe) => foe.location === origin && (!foe.engagedWith || foe.keywords.includes('massive')),
      )
      .map(({ id }): Message => ({ type: 'MoveEnemy', enemy: id, location: PRISON_OF_MEMORIES })),
    { type: 'RemoveLocation', location: origin },
    ...advanceChoice(state),
  )
}

export function resolveMirageMemory(state: GameState, code: string): GameState {
  const memory = memories.find(({ card }) => card.code === code)
  if (!memory || !state.victoryDisplay.includes(code)) return state
  const partner: ExpeditionPartner = memory.partner
  const eligible = state.campaignLog?.expedition?.partners[partner]?.status !== 'eliminated'
  const assets = Object.fromEntries(
    Object.entries(state.assets).map(([id, asset]) => [
      id,
      eligible && asset.expeditionPartner === partner
        ? { ...asset, code: expeditionPartners[partner] }
        : asset,
    ]),
  )
  return push(
    {
      ...state,
      assets,
      victoryDisplay: state.victoryDisplay.map((entry) => (entry === code ? code + 'b' : entry)),
    },
    readMirageBack(code),
    { type: 'RecordNote', note: memory.note },
    { type: 'SetExpeditionPartnerStatus', partner, status: 'resolute' },
    ...advanceChoice(state),
  )
}

const damageFrom: Record<string, (state: GameState, trigger: Trigger, self: Enemy) => number> = {
  '08576': (state, trigger, self) =>
    trigger.type === 'afterDamageHealed' &&
    self.exhausted &&
    getInvestigator(state, trigger.investigator).location === self.location
      ? trigger.amount
      : 0,
  '08579': (state, trigger, self) =>
    trigger.type === 'afterCardsDrawn' &&
    self.exhausted &&
    getInvestigator(state, trigger.investigator).location === self.location
      ? trigger.amount
      : 0,
  '08582': (state, trigger, self) =>
    trigger.type === 'enemyExhausted' &&
    trigger.enemy === self.id &&
    Object.values(state.treacheries).some(
      ({ placement }) => placement.type === 'location' && placement.location === self.location,
    )
      ? 4
      : 0,
  '08575': (_state, trigger, self) =>
    trigger.type === 'afterSkillTest' &&
    trigger.kind === 'evade' &&
    trigger.enemy === self.id &&
    trigger.succeeded &&
    trigger.margin >= 3
      ? 3
      : 0,
  '08577': (state, trigger, self) =>
    trigger.type === 'afterGainResources' &&
    self.exhausted &&
    getInvestigator(state, trigger.investigator).location === self.location
      ? 1
      : 0,
  '08578': (_state, trigger, self) =>
    trigger.type === 'afterEnemyAttack' && trigger.enemy === self.id ? 1 : 0,
  '08583': (_state, trigger, self) =>
    trigger.type === 'afterDiscoverClues' && trigger.location === self.location
      ? (trigger.amount ?? 0)
      : 0,
}

for (const { card } of memories) {
  registerEnemy({
    code: card.code,
    abilities: (state, self, investigator) => {
      const tekelili = card.code === '08580' && (state.tekeliliDeck?.length ?? 0) >= 3
      const frost = card.code === '08581' && iceCanAddFrost(state)
      if (!tekelili && !frost) return []
      return [
        {
          key: self.id + ':memoryParley',
          label: tekelili
            ? 'ability.edgeOfTheEarth.mirageParleyTekelili'
            : 'ability.edgeOfTheEarth.mirageParleyFrost',
          actions: tekelili ? 2 : 1,
          provokes: false,
          parley: true,
          costs: [
            tekelili
              ? { type: 'ShuffleTekeliliIntoDeck', investigator, amount: 3 }
              : { type: 'AddChaosTokens', tokens: ['frost'] },
          ],
          then: [
            { type: 'DamageEnemy', enemy: self.id, by: investigator, amount: tekelili ? 3 : 4 },
          ],
        },
      ]
    },
    forced: (_state, trigger, self) =>
      trigger.type === 'enemyDefeated' && trigger.enemy.id === self.id
        ? [{ type: 'ScenarioSpecific', key: 'resolveMirageMemory', data: { code: card.code } }]
        : [],
    reactions: (state, trigger, self) => {
      const amount = damageFrom[card.code]?.(state, trigger, self) ?? 0
      if (amount <= 0) return []
      const investigators =
        'investigator' in trigger
          ? [trigger.investigator]
          : investigatorsAt(state, self.location).map(({ id }) => id)
      return investigators.map((investigator) => ({
        key: self.id + ':memoryDamage',
        label: 'choice.edgeOfTheEarth.mirageMemoryDamage',
        params: { name: self.name, amount },
        target: { type: 'enemy', id: self.id },
        investigator,
        then: [{ type: 'DamageEnemy', enemy: self.id, by: investigator, amount }],
      }))
    },
  })
}
