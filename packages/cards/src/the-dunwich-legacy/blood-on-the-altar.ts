import {
  activeInvestigators,
  getInvestigator,
  leadInvestigator,
  playerCardDef,
  push,
  registerAct,
  registerAgenda,
  registerLocation,
  registerScenario,
  shuffle,
  type CampaignLog,
  type Difficulty,
  type EncounterCard,
  type GameState,
  type LocationCard,
  type Message,
  type ScenarioDefinition,
} from '@lcg/engine'
import {
  earnExperience,
  endScenario,
  noteEffect,
  recordNote,
  resolution,
  storyEntries,
} from '../scenario-helpers'
import { ENCOUNTER_SETS } from '../the-path-to-carcosa/encounter-sets'
import { DUNWICH_CHAOS_BAGS } from './campaign'
import { DUNWICH_ENCOUNTER_SETS } from './encounter-sets'
import { HOUSE_SETS, huntedDownSpecific, thugBlocksResources } from './house-encounters'
import { H, HN } from './house-codes'
import { EA, DUNWICH_NOTES as N } from './extracurricular-codes'
import { M } from './museum-codes'
import { TN } from './essex-codes'
import { storyReward } from './house-assets'
import { B, BN, BLOOD_ON_THE_ALTAR } from './altar-codes'
import { altarList, altarSpecific as specific } from './altar-helpers'
import { ALTAR_ENCOUNTERS, DUNWICH_COUNTRY, NIGHTGAUNTS, altarTreachery } from './altar-encounters'
import { silasBishop } from './silas-bishop'
export { B, BN, BLOOD_ON_THE_ALTAR } from './altar-codes'
export { ALTAR_ENCOUNTERS, DUNWICH_COUNTRY, NIGHTGAUNTS } from './altar-encounters'
const entry = storyEntries('altar')
const groups = [
  [B.brookHorror, B.brookAlone],
  [B.ruinsEvade, B.ruinsDoom],
  [B.storePoor, B.storeItems],
  [B.churchEnemy, B.churchResources],
  [B.houseEvents, B.houseNightgaunt],
  [B.schoolSkills, B.schoolClues],
]
const positions: Record<string, [number, number]> = {
  cross: [0, 0],
  square: [-2, 1],
  triangle: [-2, -1],
  circle: [0, 2],
  diamond: [0, -2],
  wave: [2, -1],
  moon: [2, 1],
}
const room = (
  id: string,
  name: string,
  shroud: number,
  clues: number,
  symbol: string,
  connectsTo: string[],
  victory?: number,
): LocationCard => ({
  id,
  name,
  shroud,
  clueValue: clues,
  cluesPerInvestigator: true,
  connections: [],
  symbol,
  connectsTo,
  position: positions[symbol]!,
  ...(victory ? { victory } : {}),
})
export const ALTAR_LOCATIONS = {
  commons: room(B.commons, 'Village Commons', 3, 0, 'cross', ['square', 'circle', 'moon']),
  brookHorror: room(B.brookHorror, "Bishop's Brook", 3, 2, 'square', [
    'cross',
    'circle',
    'triangle',
  ]),
  brookAlone: room(B.brookAlone, "Bishop's Brook", 3, 2, 'square', ['cross', 'circle', 'triangle']),
  ruinsEvade: room(B.ruinsEvade, 'Burned Ruins', 3, 3, 'triangle', ['square', 'diamond']),
  ruinsDoom: room(B.ruinsDoom, 'Burned Ruins', 2, 3, 'triangle', ['square', 'diamond']),
  storePoor: room(B.storePoor, "Osborn's General Store", 2, 1, 'circle', ['moon', 'square']),
  storeItems: room(B.storeItems, "Osborn's General Store", 3, 1, 'circle', ['moon', 'square']),
  churchEnemy: room(B.churchEnemy, 'Congregational Church', 1, 1, 'diamond', [
    'cross',
    'triangle',
    'wave',
  ]),
  churchResources: room(B.churchResources, 'Congregational Church', 2, 1, 'diamond', [
    'cross',
    'triangle',
    'wave',
  ]),
  houseEvents: room(B.houseEvents, 'House in the Reeds', 2, 1, 'wave', ['diamond', 'moon']),
  houseNightgaunt: room(B.houseNightgaunt, 'House in the Reeds', 1, 1, 'wave', ['diamond', 'moon']),
  schoolSkills: room(B.schoolSkills, 'Schoolhouse', 4, 1, 'moon', ['cross', 'wave', 'circle']),
  schoolClues: room(B.schoolClues, 'Schoolhouse', 4, 1, 'moon', ['cross', 'wave', 'circle']),
  chamber: {
    id: B.chamber,
    name: 'The Hidden Chamber',
    shroud: 3,
    clueValue: 0,
    cluesPerInvestigator: false,
    connections: [],
    victory: 2,
    position: [4, 0],
  },
} satisfies Record<string, LocationCard>
const at = (s: GameState, i: string) => getInvestigator(s, i).location
const pool = (s: GameState) => altarList(s, 'altarPotential')
const owned = (s: GameState, code: string) =>
  Object.values(s.campaignLog?.investigators ?? {}).some((r) => r.storyAssets.includes(code))
const characters = [H.armitage, EA.rice, H.morgan, B.zebulon, B.earl]
export function bloodOnTheAltar({
  difficulty = 'standard',
  log,
}: { difficulty?: Difficulty; log?: CampaignLog } = {}): ScenarioDefinition {
  return {
    id: BLOOD_ON_THE_ALTAR,
    intro: entry('intro'),
    setupInstructions: entry('setup'),
    locations: [ALTAR_LOCATIONS.commons],
    setAsideLocations: Object.values(ALTAR_LOCATIONS).filter((l) => l.id !== B.commons),
    startingLocation: B.commons,
    agendas: [
      { code: B.disappearances, name: 'Strange Disappearances', doomThreshold: 6 },
      { code: B.hunger, name: 'The Old Ones Hunger', doomThreshold: 6 },
      { code: B.feed, name: 'Feed the Beast', doomThreshold: 7 },
    ],
    acts: [
      {
        code: B.searching,
        name: 'Searching for Answers',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
      {
        code: B.beast,
        name: 'The Chamber of the Beast',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: [
      ...ALTAR_ENCOUNTERS,
      ...DUNWICH_COUNTRY,
      ...DUNWICH_ENCOUNTER_SETS.whippoorwills,
      ...NIGHTGAUNTS,
      ...ENCOUNTER_SETS.ancientEvils,
      ...(log?.notes.includes(HN.obannion) ? HOUSE_SETS.naomi : []),
    ],
    setAside: [silasBishop],
    chaosBag: [...DUNWICH_CHAOS_BAGS[difficulty]],
    tokenValues: {},
    setup: [
      specific('altarSetup', { standalone: !log }),
      ...(log?.notes.includes(TN.delayed) ? [{ type: 'PlaceDoom' as const, amount: 1 }] : []),
    ],
  }
}
registerScenario({
  id: BLOOD_ON_THE_ALTAR,
  canEnter: (s, i, _from, to) =>
    !(to === B.chamber && s.scenarioMeta?.altarUnlocked !== 1) &&
    !(to === B.brookAlone && activeInvestigators(s).some((a) => a.id !== i && a.location === to)),
  cannotPlay: (s, i, c) => at(s, i) === B.houseEvents && playerCardDef(c)?.type === 'event',
  cannotCommit: (s, i, c) =>
    at(s, i) === B.schoolSkills && !!c && playerCardDef(c)?.type === 'skill',
  cannotDiscoverClues: (_s, _i, l, investigating) => l === B.schoolClues && investigating !== true,
  cannotGainResources: (s, i) => at(s, i) === B.storePoor || thugBlocksResources(s, i),
  actionAllowed: (s, i, k) =>
    !(k === 'resource' && (at(s, i) === B.storePoor || thugBlocksResources(s, i))),
  enemyHorrorModifier: (_s, e) => (e.location === B.brookHorror ? 1 : 0),
  enemyStat: (_s, e, k) => (e.location === B.ruinsEvade && k === 'evade' ? 1 : 0),
  forced: (s, t) =>
    t.type === 'enemyDefeated' && t.enemy.code === B.silas
      ? [{ type: 'EndScenario', outcome: resolution(1) }]
      : t.type === 'afterSkillTest' &&
          !t.succeeded &&
          t.kind === 'investigate' &&
          t.location === B.ruinsDoom
        ? [specific('altarFlipClue')]
        : [],
  tokenEffect: (s, t, i) => {
    const hard = s.difficulty === 'hard' || s.difficulty === 'expert',
      empty = Object.keys(s.locations).filter((l) => !s.scenarioMeta?.[`altarUnder:${l}`]).length
    return t === 'skull'
      ? { modifier: -(hard ? empty : Math.min(4, empty)) }
      : t === 'cultist'
        ? {
            modifier: hard ? -4 : -2,
            onFail: [{ type: 'PlaceCluesOnLocationFromPool', location: at(s, i)!, amount: 1 }],
          }
        : t === 'tablet'
          ? {
              modifier: hard ? -3 : -2,
              ...(hard || at(s, i) === B.chamber ? { revealAnother: true } : {}),
            }
          : t === 'elderThing'
            ? {
                modifier: -3,
                ...(hard
                  ? { immediate: [{ type: 'PlaceDoom' as const, amount: 1 }] }
                  : { onFail: [{ type: 'PlaceDoom' as const, amount: 1 }] }),
              }
            : { modifier: 0 }
  },
  resolution: (s, o) => [
    specific('altarFinish', { resolution: o.type === 'resolution' ? o.resolution : 0 }),
  ],
  specific: (s, key, data) => {
    const investigator = String(
      data.investigator ?? s.activeTurn ?? leadInvestigator(s)?.id ?? s.investigators[0]!.id,
    )
    const hunted = huntedDownSpecific(s, key, data, investigator)
    if (hunted) return hunted
    if (key === 'altarSetup') {
      let rng = s.rng
      const picked: string[] = []
      for (const pair of groups) {
        const [v, r] = shuffle(pair, rng)
        rng = r
        picked.push(v[0]!)
      }
      const [remaining, r] = shuffle(picked, rng)
      rng = r
      const selected = remaining.slice(0, 5),
        notes = s.campaignLog?.notes ?? [],
        potential = [
          B.zebulon,
          B.earl,
          ...(data.standalone
            ? [H.armitage, EA.rice, H.morgan]
            : [
                ...(notes.includes(HN.armitageKidnapped) ? [H.armitage] : []),
                ...(notes.includes(N.riceKidnapped) ? [EA.rice] : []),
                ...(notes.includes(HN.morganKidnapped) ? [H.morgan] : []),
              ]),
        ]
      const [under, r2] = shuffle<EncounterCard>(
          [
            altarTreachery(B.chamber, 'The Hidden Chamber'),
            altarTreachery(B.key, 'Key to the Chamber'),
            ...s.encounterDeck.slice(0, 3),
          ],
          rng,
        ),
        meta: Record<string, string | number> = {
          ...s.scenarioMeta,
          altarPotential: potential.join(','),
        }
      selected.forEach((l, n) => {
        meta[`altarUnder:${l}`] = JSON.stringify(under[n])
      })
      return push(
        { ...s, rng: r2, encounterDeck: s.encounterDeck.slice(3), scenarioMeta: meta },
        ...selected.map((location): Message => ({ type: 'PutLocationIntoPlay', location })),
      )
    }
    if (key === 'altarUnder') {
      const location = String(data.location),
        encoded = s.scenarioMeta?.[`altarUnder:${location}`]
      if (!encoded || s.locations[location]?.clues !== 0 || at(s, investigator) !== location)
        return s
      const meta = { ...s.scenarioMeta }
      delete meta[`altarUnder:${location}`]
      const next = { ...s, scenarioMeta: meta },
        card = JSON.parse(String(encoded)) as EncounterCard
      if (card.code === B.chamber)
        return push(
          { ...next, scenarioMeta: { ...meta, altarChamberSource: location } },
          {
            type: 'PutLocationIntoPlay',
            location: B.chamber,
            ...(typeof data.investigator === 'string' ? { investigator: data.investigator } : {}),
          },
          { type: 'ConnectLocations', a: location, b: B.chamber },
          { type: 'RevealLocation', location: B.chamber, investigator },
        )
      return push(next, { type: 'ResolveEncounterCard', investigator, card })
    }
    if (key === 'altarKey') {
      const treacheries = { ...s.treacheries }
      delete treacheries[String(data.treachery)]
      return push({ ...s, treacheries }, { type: 'PutAssetIntoPlay', investigator, code: B.key })
    }
    if (key === 'altarUnlock') {
      const a = s.assets[String(data.asset)]
      if (!a || !s.locations[at(s, a.owner) ?? '']?.connections.includes(B.chamber)) return s
      const assets = { ...s.assets }
      delete assets[a.id]
      return { ...s, assets, scenarioMeta: { ...s.scenarioMeta, altarUnlocked: 1 } }
    }
    if (key === 'altarGather') {
      const clues =
        Object.values(s.locations).reduce((n, l) => n + l.clues, 0) +
        s.investigators.reduce((n, i) => n + i.clues, 0)
      return push(
        {
          ...s,
          locations: Object.fromEntries(
            Object.entries(s.locations).map(([id, l]) => [
              id,
              { ...l, clues: id === B.chamber ? clues : 0 },
            ]),
          ),
          investigators: s.investigators.map((i) => ({ ...i, clues: 0 })),
        },
        { type: 'SpawnEnemy', card: silasBishop, location: B.chamber, engageWith: null },
      )
    }
    if (key === 'altarSacrifice') {
      const potential = pool(s)
      if (potential.length < Number(data.minimum ?? 1)) return s
      const [cards, rng] = shuffle(potential, s.rng),
        [chosen, ...rest] = cards
      return {
        ...s,
        rng,
        scenarioMeta: {
          ...s.scenarioMeta,
          altarPotential: rest.join(','),
          altarSacrificed: [...altarList(s, 'altarSacrificed'), chosen!].join(','),
        },
      }
    }
    if (key === 'altarKidnap') {
      const allies = Object.values(s.assets).filter(
        (a) => a.owner === investigator && playerCardDef(a.code)?.traits.includes('Ally'),
      )
      if (!allies.length)
        return push(
          s,
          { type: 'TakeDamage', investigator, damage: 2, horror: 0 },
          { type: 'DiscardTreachery', treachery: String(data.treachery) },
        )
      return push(s, {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.altar.ally',
          choices: allies.map((a) => ({
            label: 'choice.asset',
            params: { asset: playerCardDef(a.code)?.name ?? a.code },
            then: [
              specific('altarAddSacrifice', { asset: a.id }),
              {
                type: 'PlaceTreachery',
                treachery: String(data.treachery),
                placement: { type: 'agenda', code: s.agendas[s.agendaIndex]!.code! },
              },
            ],
          })),
        },
      })
    }
    if (key === 'altarAddSacrifice') {
      const a = s.assets[String(data.asset)]
      if (!a) return s
      const assets = { ...s.assets }
      delete assets[a.id]
      return {
        ...s,
        assets,
        scenarioMeta: { ...s.scenarioMeta, altarPotential: [...pool(s), a.code].join(',') },
      }
    }
    if (key === 'altarFlipClue') {
      const l = s.locations[B.ruinsDoom]
      if (!l?.clues) return s
      return {
        ...s,
        locations: {
          ...s.locations,
          [l.id]: { ...l, clues: l.clues - 1, doom: (l.doom ?? 0) + 1 },
        },
      }
    }
    if (key === 'altarSearchEnemy') {
      const trait = String(data.trait),
        // Grimoire p. 46: references to the replaced Nightgaunt apply to Bat Horror.
        options = s.encounterDeck.filter(
          (c) =>
            c.kind === 'enemy' &&
            (trait === 'Nightgaunt' && s.scenarioMeta?.chapterTwoEncounters === 1
              ? c.code === CHAPTER_TWO.batHorror
              : c.traits?.includes(trait)),
        )
      if (!options.length) {
        const [encounterDeck, rng] = shuffle(s.encounterDeck, s.rng)
        return { ...s, encounterDeck, rng }
      }
      return push(s, {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseEnemy',
          choices: [...new Map(options.map((c) => [c.code, c])).values()].map((c) => ({
            label: 'choice.enemy',
            params: { enemy: c.name },
            then: [specific('altarSpawnFound', { code: c.code })],
          })),
        },
      })
    }
    if (key === 'altarSpawnFound') {
      const n = s.encounterDeck.findIndex((c) => c.code === data.code),
        c = s.encounterDeck[n]
      if (!c || c.kind !== 'enemy') return s
      const [encounterDeck, rng] = shuffle(
        s.encounterDeck.filter((_, i) => i !== n),
        s.rng,
      )
      return push(
        { ...s, encounterDeck, rng },
        { type: 'SpawnEnemy', card: c, location: B.commons, engageWith: null },
      )
    }
    if (key === 'altarFinish') {
      const n = Number(data.resolution),
        sacrificed = [...altarList(s, 'altarSacrificed'), ...(n === 0 ? pool(s) : [])].filter(
          (c) => playerCardDef(c)?.unique,
        ),
        removed = [...new Set([...(s.campaignLog?.removedCards ?? []), ...sacrificed])]
      let next = s
      const log = s.campaignLog
      if (log)
        next = {
          ...s,
          campaignLog: {
            ...log,
            removedCards: removed,
            values: {
              ...log.values,
              [BN.sacrificed]: [
                ...new Set([
                  ...(log.values[BN.sacrificed] ?? '').split(',').filter(Boolean),
                  ...sacrificed,
                ]),
              ].join(','),
            },
            investigators: Object.fromEntries(
              Object.entries(log.investigators).map(([id, r]) => [
                id,
                { ...r, storyAssets: r.storyAssets.filter((c) => !removed.includes(c)) },
              ]),
            ),
          },
        }
      const note = n === 0 ? BN.ritual : n === 1 ? BN.killed : n === 2 ? BN.restored : BN.banished
      return push(
        next,
        recordNote(note),
        ...sacrificed
          .filter((c) => characters.includes(c as typeof H.armitage))
          .map((c) => recordNote(`dunwichSacrificed${c}`)),
        specific('altarStolenBook'),
        {
          type: 'Story',
          entry: entry(n === 0 ? 'noResolution' : `resolution${n}`, [
            noteEffect(note),
            { key: 'story.effect.experience', params: { bonus: 2 } },
          ]),
        },
        earnExperience(2, true),
        ...(n === 0
          ? []
          : [
              { type: 'Story' as const, entry: entry('survivors') },
              ...characters.map((code) => specific('altarSurvivor', { code })),
            ]),
        endScenario(n ? resolution(n) : { type: 'noResolution' }),
      )
    }
    if (key === 'altarStolenBook') {
      if (!s.campaignLog) return s
      let stolen = false
      const investigators = { ...s.campaignLog.investigators }
      for (const i of s.investigators)
        if (
          i.eliminated &&
          !i.resigned &&
          investigators[i.id]?.storyAssets.includes(M.necronomicon)
        ) {
          stolen = true
          investigators[i.id] = {
            ...investigators[i.id]!,
            storyAssets: investigators[i.id]!.storyAssets.filter((c) => c !== M.necronomicon),
          }
        }
      return stolen
        ? push(
            { ...s, campaignLog: { ...s.campaignLog, investigators } },
            recordNote(TN.necronomiconStolen),
          )
        : s
    }
    if (key === 'altarSurvivor') {
      const code = String(data.code)
      if ((s.campaignLog?.values[BN.sacrificed] ?? '').split(',').includes(code)) return s
      const survivorList = [
          ...new Set([
            ...(s.campaignLog?.values[BN.survivors] ?? '').split(',').filter(Boolean),
            code,
          ]),
        ],
        next = s.campaignLog
          ? {
              ...s,
              campaignLog: {
                ...s.campaignLog,
                values: { ...s.campaignLog.values, [BN.survivors]: survivorList.join(',') },
              },
            }
          : s
      return push(
        next,
        recordNote(`dunwichSurvived${code}`),
        { type: 'Story', entry: entry(`survivor${code}`) },
        ...(!owned(s, code) ? [storyReward(s, code, entry('reward'))] : []),
        ...(characters.slice(0, 3).includes(code as typeof H.armitage) && !owned(s, B.powder)
          ? [storyReward(s, B.powder, entry('powderReward'))]
          : []),
      )
    }
    return s
  },
})
registerAct({
  code: B.searching,
  objectiveMet: (s) => activeInvestigators(s).some((i) => i.location === B.chamber),
  onAdvance: (s) => [
    ...Object.values(s.locations)
      .filter((l) => !l.revealed)
      .map((l): Message => ({ type: 'RevealLocation', location: l.id })),
    specific('altarGather'),
  ],
})
registerAct({
  code: B.beast,
  objectiveMet: (s) => !!s.locations[B.chamber] && s.locations[B.chamber]!.clues === 0,
  onAdvance: (s) => [
    {
      type: 'EndScenario',
      outcome: resolution(Object.values(s.assets).some((a) => a.code === M.necronomicon) ? 2 : 3),
    },
  ],
})
registerAgenda({
  code: B.disappearances,
  onAdvance: () => [specific('altarSacrifice', { minimum: 3 })],
})
registerAgenda({ code: B.hunger, onAdvance: () => [specific('altarSacrifice', { minimum: 2 })] })
registerAgenda({
  code: B.feed,
  onAdvance: (s) => [
    ...activeInvestigators(s).map((i): Message => ({ type: 'Resign', investigator: i.id })),
  ],
})
registerLocation({
  code: B.commons,
  abilities: (_s, _l, i) => [
    {
      key: 'altar:resign',
      label: 'action.resign',
      actions: 1,
      provokes: false,
      then: [{ type: 'Resign', investigator: i }],
    },
  ],
})
for (const code of groups.flat())
  registerLocation({
    code,
    abilities: (s, l, i) => [
      ...(l.revealed && l.clues === 0 && s.scenarioMeta?.[`altarUnder:${l.id}`]
        ? [
            {
              key: `${l.id}:under`,
              label: 'ability.altar.under',
              actions: 0,
              provokes: false,
              then: [specific('altarUnder', { location: l.id, investigator: i })],
            },
          ]
        : []),
      ...(code === B.storeItems && getInvestigator(s, i).resources >= 1
        ? [
            {
              key: 'altar:item',
              label: 'ability.altar.item',
              actions: 1,
              provokes: true,
              costs: [{ type: 'SpendResources' as const, investigator: i, amount: 1 }],
              then: [
                {
                  type: 'SearchDeck' as const,
                  investigator: i,
                  top: 3,
                  traits: ['Item'],
                  anyType: true,
                  to: 'hand' as const,
                  optional: true,
                },
              ],
            },
          ]
        : []),
      ...(code === B.churchResources &&
      getInvestigator(s, i).hand.some((card) => !playerCardDef(card)?.weakness)
        ? [
            {
              key: 'altar:resources',
              label: 'ability.altar.resources',
              actions: 1,
              provokes: true,
              costs: [{ type: 'ChooseDiscardFromHand' as const, investigator: i, amount: 1 }],
              then: [{ type: 'GainResources' as const, investigator: i, amount: 2 }],
            },
          ]
        : []),
    ],
    ...(code === B.churchEnemy || code === B.houseNightgaunt
      ? {
          onReveal: (_s: GameState, _l: unknown, i?: string) => [
            specific('altarSearchEnemy', {
              trait: code === B.churchEnemy ? 'Humanoid' : 'Nightgaunt',
              ...(i ? { investigator: i } : {}),
            }),
          ],
        }
      : {}),
  })
import { CODES as CHAPTER_TWO } from '../brethren-of-ash/smoke-and-mirrors'
