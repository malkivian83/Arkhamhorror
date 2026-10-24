import {
  previewToken,
  skillTestValue,
  successChance,
  shroudOf,
  type GameState,
  type Choice,
  type SkillTest,
} from '@lcg/engine'
import type { OnlineTableStats, OnlineTable, OnlineChoice } from '@lcg/shared'

function pick<T, K extends keyof T>(value: T, keys: readonly K[]): Pick<T, K> {
  return Object.fromEntries(keys.map((key) => [key, value[key]])) as Pick<T, K>
}
function entities<T, R>(values: Record<string, T>, project: (value: T) => R): Record<string, R> {
  return Object.fromEntries(Object.entries(values).map(([id, value]) => [id, project(value)]))
}

const publicLogParams: Record<string, string[]> = {
  'log.round': ['round'],
  'log.phase': ['phase'],
  'log.mulligan': ['name', 'n'],
  'log.encounter': ['name', 'card', 'code'],
  'log.lead': ['name'],
  'log.play': ['name', 'card'],
  'log.clues': ['name', 'amount'],
  'log.damage': ['name', 'damage', 'horror'],
  'log.testSuccess': ['name', 'skill', 'value', 'difficulty', 'tokens'],
  'log.testFailure': ['name', 'skill', 'value', 'difficulty', 'tokens'],
  'log.agendaAdvanced': ['name'],
  'log.actAdvanced': ['name'],
  'log.eliminated': ['name'],
  'log.resigned': ['name'],
  'log.end': ['outcome'],
  'log.enemyDefeated': ['enemy'],
  'log.enemyToVictory': ['enemy'],
  'log.enemyRemoved': ['enemy'],
  ...Object.fromEntries(
    ['draw', 'resource', 'investigate', 'move', 'fight', 'evade', 'engage'].map((action) => [
      `log.action.${action}`,
      ['name', 'location', 'enemy'],
    ]),
  ),
}
function publicLog(g: GameState, mine: string | undefined): GameState['log'] {
  const myName = g.investigators.find((i) => i.id === mine)?.name
  return g.log.flatMap((entry) => {
    const keys =
      publicLogParams[entry.key] ?? (entry.key.startsWith('log.step.') ? ['name'] : undefined)
    if (!keys) return []
    // Oculto: los demás saben que alguien roba una carta, no cuál.
    if (entry.params?.hidden && entry.params.name !== myName)
      return [
        {
          key: entry.key,
          round: entry.round,
          params: { name: entry.params.name ?? '', card: '?' },
        },
      ]
    return [
      {
        key: entry.key,
        round: entry.round,
        params: Object.fromEntries(
          Object.entries(entry.params ?? {}).filter(([key]) => keys.includes(key)),
        ),
      },
    ]
  })
}

function choiceView(g: GameState, choice: Choice): OnlineChoice {
  const ability = choice.then.find((m) => m.type === 'UseAbility')
  const asset =
    ability?.type === 'UseAbility'
      ? Object.values(g.assets).find((a) => ability.key.startsWith(`${a.id}:`))
      : undefined
  return {
    ...pick(choice, ['label', 'params', 'display', 'target']),
    ...(!choice.target && asset ? { target: { type: 'asset' as const, id: asset.id } } : {}),
    ...(!choice.display && ability ? { display: { kind: 'ability' as const, actions: 0 } } : {}),
  }
}

function testView(test: SkillTest | null): SkillTest | null {
  if (!test) return null
  const kind = test.kind
  return {
    ...pick(test, [
      'investigator',
      'skill',
      'difficulty',
      'baseModifier',
      'baseSkill',
      'source',
      'effectSource',
      'tokens',
      'tokenModifier',
      'autoFail',
      'modifiedSkill',
      'succeeded',
      'commitRule',
    ]),
    committed: test.committed.map((c) => pick(c, ['code', 'by', 'fromDiscard'])),
    kind:
      kind.type === 'investigate'
        ? { type: kind.type, location: kind.location }
        : kind.type === 'effect'
          ? { type: kind.type, source: kind.source, onSuccess: [], onFail: [], onFailEach: [] }
          : { type: kind.type, enemy: kind.enemy },
    tokenOnFail: [],
    tokenOnFailBy: [],
  }
}

/** Presentation snapshot, never a resumable engine save. All hidden piles/messages are synthetic.
 * Explicit allowlists mean new engine fields cannot silently become public.
 */
export function tableView(g: GameState, mine: string | undefined): OnlineTable {
  const q = g.pending?.question
  const ownsQuestion = g.pending?.investigator === mine
  return {
    ...pick(g, [
      'engineVersion',
      'scenarioId',
      'difficulty',
      'round',
      'phase',
      'phaseStep',
      'startingInvestigatorCount',
      'agendaIndex',
      'actIndex',
      'actClues',
      'doom',
      'activeTurn',
    ]),
    interactive: true,
    rng: 0,
    nextId: 0,
    queue: [],
    setAside: [],
    setAsideLocations: {},
    abilityUses: [],
    surgePending: false,
    investigators: g.investigators.map((i) => ({
      ...pick(i, [
        'id',
        'name',
        'skills',
        'health',
        'sanity',
        'elderSignModifier',
        'damage',
        'horror',
        'resources',
        'clues',
        'location',
        'actionsRemaining',
        'turnTaken',
        'eliminated',
        'resigned',
        'doom',
        'extraEvade',
        'extraMove',
        'actionsTaken',
      ]),
      hand: i.id === mine ? [...i.hand] : [],
      deck: Array<string>(i.deck.length).fill(''),
      discard: [...i.discard],
    })),
    locations: entities(g.locations, (l) => ({
      ...pick(l, [
        'id',
        'position',
        'connections',
        'extraConnections',
        'revealed',
        'clues',
        'symbol',
        'connectsTo',
        'unrevealed',
        'enterCost',
        'enterHorror',
        'unrevealedName',
        'horror',
        'doom',
      ]),
      // Sin revelar, solo el nombre de su cara visible (Puerta del vestíbulo).
      name: l.revealed ? l.name : (l.unrevealedName ?? l.name),
      shroud: l.revealed ? l.shroud : 0,
      clueValue: l.revealed ? l.clueValue : 0,
      cluesPerInvestigator: l.revealed && l.cluesPerInvestigator,
      beneath: Array.from({ length: l.beneath?.length ?? 0 }, () => ({
        kind: 'treachery' as const,
        code: '',
        name: '',
        keywords: [],
      })),
      ...(l.revealed ? pick(l, ['victory', 'investigateExtraActions', 'shroudModifier']) : {}),
    })),
    enemies: entities(g.enemies, (e) =>
      pick(e, [
        'id',
        'kind',
        'code',
        'name',
        'traits',
        'prey',
        'fight',
        'health',
        'maxHealth',
        'evade',
        'damage',
        'horror',
        'keywords',
        'victory',
        'damageTaken',
        'location',
        'engagedWith',
        'exhausted',
        'owner',
        'doom',
        'clues',
        'leads',
      ]),
    ),
    assets: entities(g.assets, (a) => ({
      ...pick(a, [
        'id',
        'code',
        'owner',
        'exhausted',
        'damage',
        'horror',
        'uses',
        'doom',
        'noSlot',
        'clues',
      ]),
      ...(a.upgrades
        ? { upgrades: a.upgrades.map((u) => pick(u, ['code', 'owner', 'exhausted'])) }
        : {}),
    })),
    placedAssets: entities(g.placedAssets ?? {}, (a) => ({
      ...pick(a, [
        'id',
        'placement',
        'faceDown',
        'exhausted',
        'damage',
        'horror',
        'doom',
        'uses',
        'clues',
      ]),
      code: a.faceDown ? '' : a.code,
      name: a.faceDown ? '' : a.name,
    })),
    treacheries: entities(g.treacheries, (t) => {
      // Oculto: solo su investigador sabe qué carta tiene en la mano.
      const secret =
        t.hidden && !(t.placement.type === 'threatArea' && t.placement.investigator === mine)
      return secret
        ? {
            ...pick(t, ['id', 'kind', 'placement', 'hidden']),
            code: '',
            name: '',
            keywords: [],
          }
        : pick(t, [
            'id',
            'kind',
            'code',
            'name',
            'traits',
            'keywords',
            'placement',
            'owner',
            'canceled',
            'tokens',
            'clues',
            'horror',
            'hidden',
          ])
    }),
    stories: entities(g.stories ?? {}, (s) => pick(s, ['code', 'name', 'clues'])),
    ...(g.campaignLog
      ? {
          campaignLog: {
            ...pick(g.campaignLog, ['notes', 'crossedOut', 'values', 'chaosTokens']),
            investigators: {},
          },
        }
      : {}),
    scenarioMeta: Object.fromEntries(
      [
        'cleanedUpTheBlood',
        'hidTheBody',
        'tidiedUpTheRoom',
        'policeOnYourSide',
        'policeDontBelieveYou',
      ]
        .filter((key) => g.scenarioMeta?.[key] === 1)
        .map((key) => [key, 1]),
    ),
    agendas: g.agendas
      .slice(0, g.agendaIndex + 1)
      .map((a) => pick(a, ['code', 'name', 'doomThreshold'])),
    acts: g.acts
      .slice(0, g.actIndex + 1)
      .map((a) =>
        pick(a, [
          'code',
          'name',
          'clueThreshold',
          'cluesPerInvestigator',
          'advanceTiming',
          'cluesAtLocation',
        ]),
      ),
    // Counts are represented by anonymous backs for the existing table components.
    encounterDeck: Array.from({ length: g.encounterDeck.length }, () => ({
      kind: 'treachery',
      code: '',
      name: '',
      keywords: [],
    })),
    encounterDiscard: g.encounterDiscard.map((c) =>
      c.kind === 'treachery'
        ? pick(c, ['kind', 'code', 'name', 'keywords'])
        : pick(c, [
            'kind',
            'code',
            'name',
            'fight',
            'health',
            'evade',
            'damage',
            'horror',
            'keywords',
          ]),
    ),
    victoryDisplay: [...g.victoryDisplay],
    chaosBag: [...g.chaosBag],
    tokenValues: { ...g.tokenValues },
    // New log kinds/parameters need review before being visible to other players.
    log: publicLog(g, mine),
    skillTest: testView(g.skillTest),
    pending:
      g.pending && q
        ? {
            investigator: g.pending.investigator,
            question: ownsQuestion
              ? {
                  kind: 'chooseOne',
                  ...pick(q, ['prompt', 'promptParams', 'mulligan']),
                  ...(q.story
                    ? {
                        story: {
                          title: q.story.title,
                          body: q.story.body,
                          effects: q.story.effects?.map((e) => pick(e, ['key', 'params'])) ?? [],
                        },
                      }
                    : {}),
                  choices: q.choices.map((c) => choiceView(g, c)),
                }
              : {
                  kind: 'chooseOne',
                  prompt: 'game.waitingFor',
                  promptParams: {
                    name: g.investigators.find((i) => i.id === g.pending!.investigator)?.name ?? '',
                  },
                  choices: [],
                },
          }
        : null,
    outcome:
      g.outcome?.type === 'resolution'
        ? { type: 'resolution', resolution: g.outcome.resolution }
        : g.outcome
          ? { type: 'noResolution' }
          : null,
  }
}

/** Compute display values against the real state, not the redacted snapshot. */
export function tableStats(g: GameState): OnlineTableStats {
  return {
    agendaCount: g.agendas.length,
    actCount: g.acts.length,
    committing: g.pending?.question.prompt === 'prompt.commitCards',
    shroud: Object.fromEntries(
      Object.values(g.locations)
        .filter((l) => l.revealed)
        .map((l) => [l.id, shroudOf(g, l.id)]),
    ),
    value: skillTestValue(g),
    odds: successChance(g),
    bag: g.chaosBag.map((token) => ({
      token,
      effect: pick(previewToken(g, token), ['modifier', 'autoFail', 'revealAnother']),
    })),
  }
}
