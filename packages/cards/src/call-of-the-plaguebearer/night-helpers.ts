import {
  getInvestigator,
  playerCardDef,
  push,
  type GameState,
  type Message,
  type SkillTest,
} from '@lcg/engine'
import { NPCS, TOWN, spreadingCodes } from './night-data'
import { on, specific } from './helpers'

export const isDefend = (test: SkillTest | null | undefined) =>
  !!test?.tags?.includes('plaguebearer:defend')
export const fixedDefend = (test: SkillTest | null | undefined) =>
  isDefend(test) && test?.kind.type === 'effect' && test.kind.source !== '78034'
export function defendValue(s: GameState, test: SkillTest): number | undefined {
  if (!fixedDefend(test) || test.kind.type !== 'effect') return undefined
  const source = test.kind.source
  const npc = NPCS.find((n) => n.code === source)
  if (!npc) return undefined
  const i = getInvestigator(s, test.investigator)
  const assets = Object.values(s.assets).filter((a) => a.owner === i.id)
  switch (npc.metric) {
    case 'hand':
      return i.hand.length
    case 'resources':
      return i.resources
    case 'skills':
      return i.discard.filter((c) => playerCardDef(c)?.type === 'skill').length
    case 'events':
      return i.discard.filter((c) => playerCardDef(c)?.type === 'event').length
    case 'assets':
      return assets.length
    case 'ally':
    case 'nonAlly':
      return Math.max(
        0,
        ...assets
          .filter((a) => playerCardDef(a.code)?.traits.includes('Ally') === (npc.metric === 'ally'))
          .map((a) => Math.max(0, playerCardDef(a.code)?.cost ?? 0)),
      )
  }
}
export const miasmasAt = (s: GameState, id: string) =>
  Object.values(s.treacheries).filter(
    (t) =>
      spreadingCodes.includes(t.code as (typeof spreadingCodes)[number]) &&
      t.placement.type === 'location' &&
      t.placement.location === id,
  )
export const townSettled = (s: GameState) =>
  Object.values(s.locations).every((l) => (l.resources ?? 0) > 0 || (l.horror ?? 0) > 0)
export const townStory = (npc: string, success: boolean): Message => ({
  type: 'Story',
  entry: {
    title: `story.plaguebearer.night.npc.${npc}.title`,
    body: `story.plaguebearer.night.npc.${npc}.${success ? 'saved' : 'lost'}`,
  },
})

on('night.defended', (s, d) => {
  const npc = String(d.npc),
    row = TOWN.find((r) => r.npc === npc)!,
    l = s.locations[row.id]
  if (!l || (l.resources ?? 0) > 0) return s
  const next = {
    ...s,
    locations: { ...s.locations, [l.id]: { ...l, resources: 1 } },
    victoryDisplay: [...s.victoryDisplay, npc],
    victoryPoints: (s.victoryPoints ?? 0) + 1,
  }
  return push(
    next,
    ...Object.values(s.placedAssets ?? {})
      .filter((a) => a.code === npc)
      .map((a): Message => ({ type: 'RemovePlacedAsset', placed: a.id })),
    townStory(npc, true),
    { type: 'CheckActObjective' },
  )
})
on('night.ruin', (s, d) => {
  const row = TOWN.find((r) => r.id === String(d.location))!
  if (!row || s.locations[row.ruin] || (s.locations[row.id]?.resources ?? 0) > 0) return s
  const moves: Message[] = [
    ...Object.values(s.placedAssets ?? {})
      .filter((a) => a.placement.type === 'location' && a.placement.location === row.id)
      .map((a): Message => ({ type: 'RemovePlacedAsset', placed: a.id })),
    ...Object.values(s.treacheries)
      .filter((t) => t.placement.type === 'location' && t.placement.location === row.id)
      .map((t): Message => ({ type: 'DiscardTreachery', treachery: t.id })),
    { type: 'PutLocationIntoPlay', location: row.ruin },
    { type: 'PlaceLocationTokens', location: row.ruin, horror: 1 },
    ...s.investigators
      .filter((i) => !i.eliminated && i.location === row.id)
      .map((i): Message => ({ type: 'MoveTo', investigator: i.id, location: row.ruin })),
    ...Object.values(s.enemies)
      .filter((e) => e.location === row.id)
      .map((e): Message => ({ type: 'MoveEnemy', enemy: e.id, location: row.ruin })),
    ...(s.locations[row.id] ? [{ type: 'RemoveLocation' as const, location: row.id }] : []),
    { type: 'CheckActObjective' },
  ]
  return push(s, townStory(row.npc, false), ...moves)
})
on('night.roundLocation', (s, d) => {
  const id = String(d.location),
    l = s.locations[id]
  if (!l) return s
  const attached = miasmasAt(s, id)
  const messages: Message[] = []
  if (!l.clues && !(l.resources ?? 0) && !(l.horror ?? 0) && !(l.doom ?? 0)) {
    if (TOWN.some((r) => r.id === id))
      messages.push(
        { type: 'RevealLocation', location: id },
        specific('night.ruin', { location: id }),
      )
  } else if (attached.length && l.clues > 0)
    messages.push({
      type: 'MoveClues',
      from: { type: 'location', id },
      to: { type: 'treachery', id: attached[0]!.id },
      amount: 1,
    })
  return push(s, ...messages)
})
on('night.help', (s, d) =>
  s.skillTest
    ? {
        ...s,
        skillTest: {
          ...s.skillTest,
          difficulty: Math.max(0, s.skillTest.difficulty - Number(d.amount)),
        },
      }
    : s,
)
on('night.recordTown', (s, d) =>
  !s.campaignLog
    ? s
    : {
        ...s,
        campaignLog: {
          ...s.campaignLog,
          values: { ...s.campaignLog.values, [`plaguebearerTown${d.location}`]: String(d.status) },
        },
      },
)
on('night.setup', (s, d) =>
  push(
    s,
    ...Object.keys(s.locations).map((location): Message => ({
      type: 'PlaceCluesOnLocationFromPool',
      location,
      amount: 4,
    })),
    specific('night.ruin', { location: String(d.lost) }),
  ),
)
