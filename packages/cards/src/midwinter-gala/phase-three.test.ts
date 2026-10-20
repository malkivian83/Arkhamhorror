import {
  applyInput,
  createGame,
  dispatch,
  scenarioBehavior,
  storyBehavior,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, testInvestigator } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import '../index'
import { finishScenario, newCampaign, startScenario } from '../campaign'
import {
  CODES,
  FACTION_CARDS,
  FACTIONS,
  GUEST_DEFS,
  LOCATIONS,
  SECOND_FLOOR,
  type Faction,
} from './cards'
import { midwinterGala, score } from './gala'
import { bloodlessMan, declan, jewel } from './helpers'

// AHC80 ES pp. 11–14, 19, 24; RR: "Story Cards", "Victory Display", "Experience".
// Directed acceptance tables, never counted as legal full-game victories.
function table(faction: Faction = 'foundation', players = 2, seed = 71): GameState {
  let s = createGame({
    seed,
    interactive: true,
    scenario: midwinterGala({ players, seed }),
    investigators: Array.from({ length: players }, (_, n) =>
      testInvestigator(String.fromCharCode(97 + n), { deck: Array(30).fill('12089') }),
    ),
  })
  for (let n = 0; s.pending && n < 40; n++) {
    if (s.pending.question.prompt === 'prompt.chooseAction') return s
    const choices = s.pending.question.choices
    const contact = choices.findIndex(
      (c) => c.label === `story.midwinterGala.contactChoice.${faction}`,
    )
    s = applyInput(s, { investigator: s.pending.investigator, choice: contact >= 0 ? contact : 0 })
  }
  throw new Error('Gala setup did not reach an action window')
}
function settle(s: GameState): GameState {
  for (let n = 0; s.pending && !s.outcome && n < 80; n++) {
    if (s.pending.question.prompt === 'prompt.chooseAction') return s
    const preferred = ['choice.revealToken', 'choice.applyResults', 'choice.skip']
      .map((label) => s.pending!.question.choices.findIndex((c) => c.label === label))
      .find((index) => index >= 0)
    s = applyInput(s, { investigator: s.pending.investigator, choice: preferred ?? 0 })
  }
  return s
}
const specific = (key: string): Message => ({ type: 'ScenarioSpecific', key })
function interlude(faction: Faction, players = 2, seed = 71) {
  return settle(during(table(faction, players, seed), (s) => s, specific('contactsAcquired')))
}
const points = (s: GameState, key: string) => score(s).tasks.find((t) => t.key === key)!.points

describe('Gala fase 3: los cinco interludios', () => {
  for (const faction of FACTIONS) {
    it.each([1, 2, 3, 4])(
      `${faction}: preparación y conservación de cartas con %i investigadores`,
      (players) => {
        const before = table(faction, players)
        const s = settle(during(before, (g) => g, specific('contactsAcquired')))
        const rival = s.scenarioMeta!.rival as Faction
        expect(Object.keys(s.stories!)).toEqual(
          expect.arrayContaining([FACTION_CARDS[faction].story, `${FACTION_CARDS[rival].story}b`]),
        )
        expect(
          SECOND_FLOOR.every((code) => !!s.locations[code] && !s.setAsideLocations?.[code]),
        ).toBe(true)
        expect(s.setAside.some((c) => c.code === CODES.jewelOfSarnath)).toBe(false)
        if (faction === 'foundation') {
          expect(declan(s)).toMatchObject({
            location: '71008',
            exhausted: true,
            health: 2 + 2 * players,
          })
          expect(jewel(s).placed).toMatchObject({
            damage: 0,
            placement: { type: 'enemy', enemy: bloodlessMan(s)!.id },
          })
          expect(jewel(s).placed!.doom ?? 0).toBe(0)
        } else if (faction === 'miskatonic') {
          const rightmost = SECOND_FLOOR.find((code) => s.locations[code]!.position![0] === 2)
          expect(declan(s)).toMatchObject({ location: rightmost, exhausted: false })
          expect(jewel(s).placed!.placement).toEqual({ type: 'enemy', enemy: declan(s)!.id })
        } else if (faction === 'syndicate') {
          const mysteries = SECOND_FLOOR.flatMap((code) => s.locations[code]!.beneath ?? [])
          expect(mysteries).toHaveLength(3)
          expect(mysteries.map((c) => c.code)).toEqual(expect.arrayContaining(['71051', '71052']))
          expect(s.encounterDeck).toHaveLength(before.encounterDeck.length)
          expect(jewel(s)).toEqual({})
          expect(declan(s)).toBeUndefined()
        } else if (faction === 'lodge') {
          const discarded = players === 1 ? 12 : players === 2 ? 6 : 0
          expect(s.encounterDiscard).toHaveLength(discarded)
          expect(s.encounterDeck.slice(-9).map((c) => c.code)).toEqual(
            expect.arrayContaining(['71051', '71052']),
          )
          expect(s.encounterDeck.length + s.encounterDiscard.length).toBe(
            before.encounterDeck.length + 3,
          )
        } else {
          // AHC80 ES p. 14: unlike Foundation, Kingsport does not exhaust Declan.
          expect(declan(s)).toMatchObject({ location: '71008', exhausted: false })
          expect(jewel(s).placed).toMatchObject({
            damage: players,
            doom: 1,
            placement: { type: 'enemy', enemy: declan(s)!.id },
          })
          expect(s.scenarioDecks!.guests).toHaveLength(5)
          expect(
            Object.values(s.placedAssets!).filter(
              (p) => p.placement.type === 'location' && p.placement.location === '71007',
            ),
          ).toHaveLength(1)
        }
      },
    )
  }
  it('Fundación coloca la Joya en la sala si El Exangüe ya no está', () => {
    const s = settle(
      during(
        table(),
        (g) => ({ ...g, enemies: {}, placedAssets: {} }),
        specific('contactsAcquired'),
      ),
    )
    expect(jewel(s).placed!.placement).toEqual({ type: 'location', location: '71008' })
  })
  it('las veinte parejas Aliado/Rival resuelven su carta e interludio sin duplicar la Joya', () => {
    const pairs = new Set<string>()
    for (const ally of FACTIONS) {
      for (
        let seed = 1;
        seed <= 150 && [...pairs].filter((p) => p.startsWith(ally + ':')).length < 4;
        seed++
      ) {
        const s = interlude(ally, 2, seed)
        pairs.add(`${ally}:${String(s.scenarioMeta!.rival)}`)
        const jewels = [
          ...s.encounterDeck,
          ...s.encounterDiscard,
          ...s.setAside,
          ...Object.values(s.locations).flatMap((l) => l.beneath ?? []),
          ...Object.values(s.placedAssets ?? {}),
          ...Object.values(s.assets),
        ].filter((c) => c.code === '71052')
        expect(jewels).toHaveLength(1)
      }
    }
    expect(pairs.size).toBe(20)
  })
})

describe('Gala fase 3: puntuación de las trece tareas', () => {
  it('distingue salas reveladas sin pistas, Invitados controlados y hechizados', () => {
    const base = table()
    const s = during(
      base,
      (g) => ({
        ...g,
        assets: {},
        placedAssets: {},
        locations: {
          ...g.locations,
          '71007': { ...g.locations['71007']!, revealed: true, clues: 0 },
          '71008': { ...g.locations['71008']!, revealed: false, clues: 0 },
        },
      }),
      { type: 'PutAssetIntoPlay', investigator: 'a', code: '71017' },
      {
        type: 'PlaceAsset',
        code: '71018',
        name: 'Callahan',
        placement: { type: 'location', location: '71007' },
        faceDown: true,
      },
    )
    expect(score(s).tasks).toHaveLength(13)
    expect(points(s, 'manorsWithNoClues')).toBe(1)
    expect(points(s, 'guestAssetsControlled')).toBe(1)
    expect(points(s, 'noSpellboundInPlay')).toBe(0)
  })
  it.each([0, 1, 2])('plan de índice %i y modos de dificultad', (agendaIndex) => {
    const s = { ...table(), agendaIndex }
    expect(points(s, 'agenda1Or2')).toBe(agendaIndex < 2 ? 5 : 0)
    for (const difficulty of ['easy', 'standard', 'hard', 'expert'] as const) {
      expect(points({ ...s, difficulty }, 'hardMode')).toBe(difficulty === 'hard' ? 3 : 0)
      expect(points({ ...s, difficulty }, 'expertMode')).toBe(difficulty === 'expert' ? 6 : 0)
    }
  })
  it('las caras y duplicados no multiplican las recompensas de victoria', () => {
    const base = table()
    const s = {
      ...base,
      victoryDisplay: [
        '71045',
        '71045b',
        '71046',
        '71046b',
        '71051',
        '71051',
        `${FACTION_CARDS[base.scenarioMeta!.rival as Faction].story}b`,
      ],
    }
    expect(points(s, 'bloodlessManInVictory')).toBe(4)
    expect(points(s, 'paleLanternInVictory')).toBe(3)
    expect(points(s, 'declanPearceInVictory')).toBe(3)
    expect(points(s, 'rivalInVictory')).toBe(4)
  })
  it.each([1, 2, 3, 4])(
    'daño y horror usan el tamaño inicial de %i investigadores y excluyen derrotas',
    (players) => {
      const base = table('foundation', players)
      const at = (n: number, eliminated = false, resigned = false): GameState => ({
        ...base,
        investigators: base.investigators.map((i, k) => ({
          ...i,
          damage: k ? 0 : n,
          horror: k ? 0 : n,
          eliminated: k ? false : eliminated,
          resigned,
        })),
      })
      for (const key of ['damageBonus', 'horrorBonus']) {
        expect(points(at(players * 2), key)).toBe(3)
        expect(points(at(players * 2 + 1), key)).toBe(0)
        expect(points(at(0, true), key)).toBe(0)
        expect(points(at(0, true, true), key)).toBe(3)
      }
    },
  )
  it('las cinco bonificaciones de facción respetan sus umbrales y topes', () => {
    const base = table()
    const faction = (ally: Faction): GameState => ({
      ...base,
      scenarioMeta: { ...base.scenarioMeta, ally },
    })
    expect(points({ ...faction('foundation'), enemies: {} }, 'factionBonus')).toBe(4)
    expect(points(faction('foundation'), 'factionBonus')).toBe(2)
    for (const [ally, field, divisor] of [
      ['miskatonic', 'hand', 4],
      ['syndicate', 'resources', 6],
    ] as const) {
      for (const n of [0, divisor - 1, divisor, 4 * divisor, 5 * divisor]) {
        const s = {
          ...faction(ally),
          investigators: base.investigators.map((i, k) => ({
            ...i,
            [field]: field === 'hand' ? Array(k ? 0 : n).fill('12089') : k ? 0 : n,
          })),
        }
        expect(points(s, 'factionBonus')).toBe(Math.min(4, Math.floor(n / divisor)))
      }
    }
    expect(
      points(
        {
          ...faction('lodge'),
          victoryDisplay: ['71054', '71054', '71055', '71056', '71057', '71051'],
        },
        'factionBonus',
      ),
    ).toBe(4)
    expect(
      points({ ...faction('lodge'), victoryDisplay: ['71054', '71054', '71051'] }, 'factionBonus'),
    ).toBe(2)
    for (const n of [0, 1, 3, 4, 6])
      expect(
        points(
          { ...faction('kingsport'), scenarioDecks: { guests: Array(n).fill('71017') } },
          'factionBonus',
        ),
      ).toBe(Math.max(0, 4 - n))
  })
})

describe('Gala fase 3: objetivos, finales y registro', () => {
  it.each(FACTIONS)('%s: objetivo de fin de ronda y secuencia R1 → facción → R7', (faction) => {
    const costs = { foundation: 4, miskatonic: 0, syndicate: 8, lodge: 10, kingsport: 6 }
    let s = during(
      interlude(faction),
      (g) => ({
        ...g,
        actIndex: 1,
        enemies: {},
        placedAssets: {},
        investigators: g.investigators.map((i) => ({ ...i, location: '71007', clues: 20 })),
      }),
      { type: 'PutAssetIntoPlay', investigator: 'a', code: '71052' },
    )
    const self = s.stories![FACTION_CARDS[faction].story]!
    const behavior = storyBehavior(self.code)!
    expect(behavior.forced!(s, { type: 'roundEnds' }, self)).not.toHaveLength(0)
    const blocked = { ...s, investigators: s.investigators.map((i) => ({ ...i, clues: 0 })) }
    if (costs[faction]) expect(behavior.forced!(blocked, { type: 'roundEnds' }, self)).toEqual([])
    s = during(s, (g) => g, ...behavior.forced!(s, { type: 'roundEnds' }, self))
    expect(s.pending!.question.choices[0]!.params!.n).toBe(costs[faction])
    s = choose(s, 'choice.gala.completeObjective')
    const bodies: string[] = []
    for (let n = 0; s.pending && !s.outcome && n < 60; n++) {
      if (s.pending.question.story) bodies.push(s.pending.question.story.body)
      s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
    }
    const resolution = FACTIONS.indexOf(faction) + 2
    expect(s.outcome).toEqual({ type: 'resolution', resolution })
    expect(bodies).toEqual([
      'story.midwinterGala.resolution1',
      `story.midwinterGala.resolution${resolution}`,
      'story.midwinterGala.resolution7',
    ])
    expect(s.scenarioMeta!.score).toBe(score(s).total)
    expect(s.experience).toHaveLength(2)
    expect(s.investigators.reduce((n, i) => n + i.clues, 0)).toBe(40 - costs[faction])
  })
  it('el resultado independiente conserva experiencia y trauma al cerrar la campaña', () => {
    const campaign = newCampaign('the-midwinter-gala', ['joe'], 'standard')
    const initial = startScenario(campaign, 13)
    const s = settle(
      dispatch(
        { ...initial, pending: null, queue: [] },
        { type: 'SufferTrauma', mental: 1 },
        { type: 'EndScenario', outcome: { type: 'noResolution' } },
      ),
    )
    expect(s.outcome).toEqual({ type: 'noResolution' })
    const finished = finishScenario(campaign, s)
    expect(finished.scenarioIndex).toBe(1)
    expect(finished.results[0]!.outcome).toEqual(s.outcome)
    expect(finished.results[0]!.experience).toEqual(s.experience)
    expect(finished.log.investigators['12004']!.mentalTrauma).toBe(1)
  })
  it.each([
    [9, 0],
    [10, 1],
    [19, 1],
    [20, 2],
    [29, 2],
    [30, 3],
    [39, 3],
    [40, 4],
    [49, 4],
    [50, 5],
  ])('%i puntos concede %i XP de bonificación', (total, bonus) => {
    const base = table()
    // Printed awards: agenda 5 + no spellbound 4 + Bloodless 4 + Lantern 3
    // + Declan 3 + Rival 4 = 23; rooms and distinct Guests supply unit points.
    const awards = total > 28
    const units = total - (awards ? 23 : 0)
    const rooms = Math.min(8, units)
    const usedGuests = GUEST_DEFS.slice(0, units - rooms)
    const g = during(
      base,
      (s) => ({ ...s, assets: {}, placedAssets: {} }),
      ...usedGuests.map((d): Message => ({
        type: 'PutAssetIntoPlay',
        code: d.code,
        investigator: 'a',
      })),
      ...(!awards
        ? [
            {
              type: 'PlaceAsset' as const,
              code: '71043',
              name: 'Claire Wilson',
              faceDown: true,
              placement: { type: 'location' as const, location: '71007' },
            },
          ]
        : []),
    )
    const rival = FACTION_CARDS[base.scenarioMeta!.rival as Faction].story
    const s = {
      ...g,
      agendaIndex: awards ? 0 : 2,
      scenarioMeta: { ...g.scenarioMeta, ally: 'lodge' },
      victoryDisplay: awards ? ['71045b', '71046', '71051', `${rival}b`] : [],
      investigators: g.investigators.map((i) => ({ ...i, damage: 3, horror: 3 })),
      locations: Object.fromEntries(
        Object.values(LOCATIONS).map((l, n) => [l.id, { ...l, revealed: n < rooms, clues: 0 }]),
      ),
    }
    expect(score(s).total).toBe(total)
    const messages = scenarioBehavior(s.scenarioId)!.resolution!(s, { type: 'noResolution' })
    expect(messages.find((m) => m.type === 'EarnExperience')).toMatchObject({
      amount: bonus,
      victory: true,
    })
  })
})
