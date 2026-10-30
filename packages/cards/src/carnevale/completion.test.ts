import { describe, expect, it } from 'vitest'
import {
  allCampaigns,
  newCampaign,
  addCarnevale,
  canAddCarnevale,
  startScenario,
  finishScenario,
  currentScenario,
} from '../index'
import {
  applyInput,
  dispatch,
  emptyCampaignLog,
  playerCardBehavior,
  playerCardDef,
  playableCards,
} from '@lcg/engine'
import { choose, labels } from '@lcg/engine/testing'
import { C, CARNEVALE } from './codes'
import { game, emit } from './testing'
import { specific } from './helpers'
import { playRandomlyToEnd } from '../scenario-testing'

function read(s: ReturnType<typeof game>) {
  for (
    let n = 0;
    n < 100 && s.pending && ['prompt.story', 'prompt.reaction'].includes(s.pending.question.prompt);
    n++
  )
    s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
  while (s.pending && labels(s).length === 1 && labels(s)[0] === 'choice.continue')
    s = choose(s, 'choice.continue')
  return s
}
describe('Carnevale delivery (scenario guide: resolutions and side stories)', () => {
  it.each([1, 2, 4])(
    'completes three seeded games with %i investigators through the public campaign flow',
    (players) => {
      for (const seed of [11, 37, 83]) {
        const campaign = newCampaign(
          CARNEVALE,
          ['daniela', 'joe', 'trish', 'isabelle'].slice(0, players),
          'standard',
        )
        const state = playRandomlyToEnd(startScenario(campaign, seed), seed)
        const finished = finishScenario(campaign, state)
        expect(currentScenario(finished)).toBeNull()
        expect(finished.results).toHaveLength(1)
        expect(finished.log.notes.some((note) => note.startsWith('carnevale'))).toBe(true)
      }
    },
  )
  it.each([1, 2])(
    'finishes resolution %i after XP, its campaign note and optional rewards',
    (resolution) => {
      let s = game()
      s = read(
        dispatch(
          {
            ...s,
            interactive: true,
            pending: null,
            queue: [],
            victoryPoints: 3,
            campaignLog: {
              ...emptyCampaignLog([]),
              investigators: {
                a: { xp: 2, physicalTrauma: 0, mentalTrauma: 0, storyAssets: [] },
              },
            },
          },
          { type: 'EndScenario', outcome: { type: 'resolution', resolution } },
        ),
      )
      expect(s.outcome).toBeNull()
      expect(s.campaignLog?.investigators.a!.xp).toBe(5)
      expect(s.campaignLog?.notes).toContain(`carnevaleresolution${resolution}`)
      s = read(choose(s, 'choice.skip'))
      expect(s.outcome).toEqual({ type: 'resolution', resolution })
    },
  )
  it('lets another investigator move to the placed Abbess, exhausts her and respects direction', () => {
    let s = game(2)
    const abbess = Object.values(s.placedAssets!).find((a) => a.code === C.abbess)!
    const previous = Object.values(s.locations).find((l) => l.connections.includes(C.basilica))!.id
    s = {
      ...s,
      investigators: s.investigators.map((i) => ({
        ...i,
        location: i.id === 'b' ? previous : C.basilica,
      })),
    }
    const options = playerCardBehavior(C.abbess)!.placedFastOptions!(s, abbess)
    const move = options.find((o) => o.investigator === 'b')!
    s = dispatch({ ...s, pending: null, queue: [] }, ...move.then)
    expect(s.investigators.find((i) => i.id === 'b')!.location).toBe(C.basilica)
    expect(s.placedAssets![abbess.id]!.exhausted).toBe(true)
    expect(
      playerCardBehavior(C.abbess)!.placedFastOptions!(s, s.placedAssets![abbess.id]!),
    ).toEqual([])
    s = dispatch({ ...s, pending: null, queue: [] }, { type: 'ReadyAll' })
    expect(s.placedAssets![abbess.id]!.exhausted).toBe(false)
    expect(
      playerCardBehavior(C.abbess)!.placedFastOptions!(s, s.placedAssets![abbess.id]!).length,
    ).toBeGreaterThan(0)
  })
  it.each([C.bauta, C.pantalone, C.medico, C.volto])(
    'resolves the distinct enters-play reward of %s',
    (code) => {
      let s = game()
      s = { ...s, investigators: s.investigators.map((i) => ({ ...i, damage: 1, horror: 0 })) }
      s = emit(s, { type: 'PutAssetIntoPlay', code, investigator: 'a' })
      const a = Object.values(s.assets).find((a) => a.code === code)!
      const before = s.investigators[0]!
      const option = playerCardBehavior(code)!.reactions!(
        s,
        { type: 'afterAssetEntersPlay', investigator: 'a', asset: a.id },
        a,
      )[0]!
      s = dispatch({ ...s, pending: null, queue: [] }, ...option.then)
      if (code === C.medico && s.pending) s = choose(s, 'choice.carnevale.healdamage')
      const after = s.investigators[0]!
      if (code === C.bauta) expect(after.resources).toBe(before.resources + 2)
      if (code === C.pantalone) expect(after.hand.length).toBe(before.hand.length + 2)
      if (code === C.medico) expect(after.damage).toBe(0)
      if (code === C.volto) expect(after.nextAssetFast).toBe(true)
    },
  )
  it('registers a playable standalone and all five rewards', () => {
    expect(allCampaigns().find((c) => c.id === CARNEVALE)?.scenarios[0]?.build).toBeTypeOf(
      'function',
    )
    for (const code of [C.abbess, C.pantalone, C.bauta, C.medico, C.volto]) {
      expect(playerCardDef(code)?.story).toBe(true)
      expect(playerCardBehavior(code)).toBeDefined()
    }
    expect(startScenario(newCampaign(CARNEVALE, ['daniela'], 'standard'), 1).scenarioId).toBe(
      CARNEVALE,
    )
  })
  it('inserts once for 3 XP per investigator and resumes the original campaign with rewards', () => {
    let c = newCampaign('night-of-the-zealot', ['daniela'], 'standard')
    c = {
      ...c,
      scenarioIndex: 1,
      log: {
        ...c.log,
        investigators: Object.fromEntries(
          Object.entries(c.log.investigators).map(([id, r]) => [id, { ...r, xp: 5 }]),
        ),
      },
    }
    const original = currentScenario(c)
    expect(canAddCarnevale(c)).toBe(true)
    c = addCarnevale(c)
    expect(canAddCarnevale(c)).toBe(false)
    const s = startScenario(c, 42, false)
    expect(s.chaosBag).not.toContain(-6)
    expect(Object.values(c.log.investigators)[0]!.xp).toBe(2)
    const id = s.investigators[0]!.id
    const log = s.campaignLog!
    const finished = finishScenario(c, {
      ...s,
      campaignLog: {
        ...log,
        investigators: {
          ...log.investigators,
          [id]: {
            ...log.investigators[id]!,
            xp: 4,
            physicalTrauma: 1,
            storyAssets: [C.pantalone],
          },
        },
      },
      outcome: { type: 'resolution', resolution: 1 },
    })
    expect(currentScenario(finished)).toBe(original)
    expect(finished.carnevaleAt).toBe(1)
    expect(finished.log.investigators[id]).toMatchObject({
      xp: 4,
      physicalTrauma: 1,
      storyAssets: [C.pantalone],
    })
  })
  it('transfers a rescued innocent before rewards when all investigators are defeated', () => {
    let s = game()
    s = {
      ...s,
      campaignLog: {
        ...emptyCampaignLog([]),
        investigators: { a: { xp: 0, physicalTrauma: 0, mentalTrauma: 0, storyAssets: [] } },
      },
      scenarioDecks: {
        ...s.scenarioDecks,
        carnevaleRescued: ['82021'],
        carnevaleSacrificed: ['82021'],
      },
    }
    s = read(
      dispatch(
        { ...s, interactive: true, pending: null, queue: [] },
        { type: 'EndScenario', outcome: { type: 'noResolution' } },
      ),
    )
    expect(s.scenarioDecks?.carnevaleRescued).toHaveLength(0)
    s = read(choose(s, 'choice.skip'))
    expect(s.campaignLog?.investigators.a!.storyAssets).toHaveLength(1)
    expect(playerCardDef(s.campaignLog!.investigators.a!.storyAssets[0]!)?.weakness).toBe(
      'basicweakness',
    )
  })
  it('offers distinct masks in player order and the Abbess only for three rescues', () => {
    let s = game(2)
    s = {
      ...s,
      campaignLog: {
        ...emptyCampaignLog([]),
        investigators: Object.fromEntries(
          ['a', 'b'].map((id) => [
            id,
            { xp: 0, physicalTrauma: 0, mentalTrauma: 0, storyAssets: [] },
          ]),
        ),
      },
      scenarioDecks: { carnevaleRescued: ['82021', '82021', '82021'] },
    }
    s = emit(s, specific('carnevaleRewards'))
    s = choose(s, 'choice.carnevale.mask', { card: 'Bauta' })
    expect(s.pending?.investigator).toBe('b')
    expect(s.pending?.question.choices.some((c) => c.params?.card === 'Bauta')).toBe(false)
    s = read(choose(s, 'choice.skip'))
    s = choose(s, 'choice.investigator', { name: 'B' })
    expect(s.campaignLog?.investigators.b!.storyAssets).toContain(C.abbess)
  })
  it.each([
    [C.bauta, 'combat'],
    [C.medico, 'willpower'],
    [C.pantalone, 'intellect'],
    [C.volto, 'agility'],
  ] as const)('replaces a test with %s and discards the mask', (code, skill) => {
    let s = emit(game(), { type: 'PutAssetIntoPlay', investigator: 'a', code })
    if (s.pending?.question.prompt === 'prompt.reaction') s = choose(s, 'choice.skip')
    const asset = Object.values(s.assets).find((a) => a.code === code)!
    s = {
      ...s,
      skillTest: {
        investigator: 'a',
        skill: skill === 'combat' ? 'agility' : 'combat',
        difficulty: 2,
        baseModifier: 0,
        kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
        committed: [],
        tokens: [],
        tokenModifier: 0,
        autoFail: false,
        tokenOnFail: [],
        tokenOnFailBy: [],
        modifiedSkill: null,
        succeeded: null,
      },
    }
    const reaction = playerCardBehavior(code)!.reactions!(
      s,
      { type: 'afterSkillTestInitiated', investigator: 'a' },
      asset,
    )[0]!
    s = dispatch({ ...s, pending: null, queue: [] }, ...reaction.then)
    expect(s.skillTest?.skill).toBe(skill)
    expect(s.assets[asset.id]).toBeUndefined()
    expect(s.investigators[0]!.discard).toContain(code)
  })
  it('Volto permits only the next asset to be fast and expires at turn end', () => {
    let s = game()
    s = {
      ...s,
      investigators: s.investigators.map((i) => ({
        ...i,
        resources: 10,
        hand: ['01016', '01021'],
      })),
    }
    s = emit(s, { type: 'NextAssetFast', investigator: 'a' })
    expect(playableCards(s, 'a', true)).toContain('01016')
    s = emit(s, { type: 'PlayCard', investigator: 'a', code: '01016' })
    expect(s.investigators[0]!.nextAssetFast).toBeUndefined()
    s = emit(
      s,
      { type: 'NextAssetFast', investigator: 'a' },
      { type: 'EndTurn', investigator: 'a' },
    )
    expect(s.investigators[0]!.nextAssetFast).toBeUndefined()
  })
})
