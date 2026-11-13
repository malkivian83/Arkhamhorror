// Campaign guide pp. 2–60: integration of the complete route, not a simulation of deck strategy.
// Intermediate fixtures represent completed objectives; individual card tests cover their costs.
import { expect, it } from 'vitest'
import { applyInput, availableAbilities, dispatch, type GameState, type Message } from '@lcg/engine'
import {
  applyRestfulNightVisit,
  campaignCanContinue,
  campaignDefinition,
  canPlayNext,
  currentScenario,
  completeRestfulNight,
  disappearance,
  expeditionAttack,
  finishScenario,
  newCampaign,
  resolveDisappearance,
  resolveExpeditionAttack,
  restfulNight,
  startScenario,
} from '@lcg/cards'
import { decodeSession, session } from '@lcg/saves'
import es from '../../../../packages/i18n/src/edge-of-the-earth.es.json'
import en from '../../../../packages/i18n/src/edge-of-the-earth.en.json'

const clean = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const send = (s: GameState, ...messages: Message[]) => dispatch(clean(s), ...messages)
const dictionaries = [es.story, en.story] as Record<string, { body: string }>[]

it.each([
  {
    difficulty: 'easy',
    players: 1,
    search: false,
    fight: false,
    mirage: false,
    skipHeart: true,
    immediate: false,
    collapse: true,
  },
  {
    difficulty: 'standard',
    players: 2,
    search: true,
    fight: false,
    mirage: true,
    skipHeart: false,
    immediate: true,
    collapse: true,
  },
  {
    difficulty: 'hard',
    players: 3,
    search: false,
    fight: true,
    mirage: true,
    skipHeart: false,
    immediate: false,
    collapse: false,
  },
  {
    difficulty: 'expert',
    players: 4,
    search: true,
    fight: true,
    mirage: true,
    skipHeart: false,
    immediate: true,
    collapse: true,
  },
] as const)(
  'traverses the campaign and reloads each checkpoint ($difficulty, $players players)',
  (route) => {
    const stories: string[] = []
    function settle(initial: GameState) {
      let s = initial
      for (let n = 0; n < 200 && s.pending; n++) {
        const q = s.pending.question
        if (['prompt.chooseAction', 'prompt.chooseNextInvestigator'].includes(q.prompt)) return s
        const body = q.story?.body
        if (body?.startsWith('story.edgeOfTheEarth.')) {
          const part = body.split('.')[2]!
          for (const dictionary of dictionaries) expect(dictionary[part]?.body, body).toBeTruthy()
          stories.push(part)
        }
        const preferred =
          q.prompt === 'prompt.edgeOfTheEarth.partner'
            ? 'choice.edgeOfTheEarth.noPartner'
            : q.prompt === 'prompt.edgeOfTheEarth.heartChoosePart'
              ? `choice.edgeOfTheEarth.${route.skipHeart ? 'heartSkip' : 'heartStudy'}`
              : q.prompt === 'prompt.edgeOfTheEarth.heartCheckpoint'
                ? `choice.edgeOfTheEarth.${route.immediate ? 'heartContinue' : 'heartRest'}`
                : q.prompt === 'prompt.edgeOfTheEarth.heartLastAgenda'
                  ? 'choice.edgeOfTheEarth.heartTekelili'
                  : undefined
        // Part II obliges the group to bring the surviving counterpart of a missing partner.
        const choice = preferred
          ? Math.max(
              0,
              q.choices.findIndex((c) => c.label === preferred),
            )
          : 0
        expect(choice, q.prompt).toBeGreaterThanOrEqual(0)
        s = applyInput(s, { investigator: s.pending.investigator, choice })
      }
      expect(s.pending).toBeNull()
      return s
    }
    let campaign = newCampaign(
      'edge-of-the-earth',
      ['joe', 'daniela', 'trish', 'marie'].slice(0, route.players),
      route.difficulty,
    )
    const reload = () => {
      const restored = decodeSession(JSON.stringify(session(null, null, campaign))).campaign!
      expect(restored).toEqual(campaign)
      campaign = restored
    }
    let mirages = 0,
      played = 0
    for (let step = 0; step < 30 && currentScenario(campaign) !== null; step++) {
      if (disappearance(campaign)) {
        const choice =
          route.search && disappearance(campaign)!.choices.includes('search') ? 'search' : 'leave'
        campaign = resolveDisappearance(campaign, choice)
        reload()
        continue
      }
      if (expeditionAttack(campaign)) {
        campaign = resolveExpeditionAttack(campaign, route.fight ? 'fight' : 'flee')
        reload()
        continue
      }
      if (restfulNight(campaign)) {
        const night = restfulNight(campaign)!
        while (!restfulNight(campaign)!.canContinue) {
          const option = restfulNight(campaign)!.options[0]!
          for (const part of option.stories)
            for (const dictionary of dictionaries) expect(dictionary[part]?.body, part).toBeTruthy()
          campaign = applyRestfulNightVisit(campaign, {
            partner: option.partner,
            ...(option.effect === 'memorial'
              ? { decline: true }
              : {
                  ...(option.targets[0] ? { target: option.targets[0] } : {}),
                  ...(option.effect === 'removeWeaknesses'
                    ? {
                        weaknesses: campaign.log.investigators[
                          option.targets[0]!.id
                        ]!.storyAssets.filter((c) => /^0872[3-9]$/.test(c)).slice(0, 5),
                      }
                    : {}),
                }),
          })
          reload()
        }
        campaign = completeRestfulNight(
          campaign,
          route.mirage && night.offersMirage ? 'mirage' : 'peaks',
        )
        reload()
        continue
      }
      expect(canPlayNext(campaign), currentScenario(campaign)!).toBe(true)
      let s = settle(startScenario(campaign, 100 + step))
      if (!s.outcome) {
        const inDecks = s.investigators
          .flatMap((i) => [...i.deck, ...i.hand, ...i.discard])
          .filter((code) => /^0872[3-9]$/.test(code)).length
        const resolving = Object.values(s.treacheries).filter((t) =>
          /^0872[3-9]$/.test(t.code),
        ).length
        expect((s.tekeliliDeck?.length ?? 0) + inDecks + resolving, s.scenarioId).toBe(16)
      }
      const id = s.scenarioId,
        actor = s.investigators[0]!.id
      played++
      if (!s.outcome) {
        if (id === 'ice-and-death-part-1') {
          // Establish a cleared camp through the actual act ability.
          s = send(s, { type: 'RevealLocation', location: '08503' })
          s = {
            ...s,
            locations: { ...s.locations, '08503': { ...s.locations['08503']!, clues: 0 } },
            investigators: s.investigators.map((i) => ({
              ...i,
              location: '08503',
              actionsRemaining: 3,
            })),
          }
          const camp = availableAbilities(s, actor).find((a) => a.key === 'ice-and-death-camp')!
          expect(camp).toBeDefined()
          s = settle(send(s, ...camp.then))
        } else if (id === 'ice-and-death-part-2') {
          s = settle(
            send(
              s,
              ...s.investigators.map((i): Message => ({ type: 'Resign', investigator: i.id })),
            ),
          )
        } else if (id === 'ice-and-death-part-3') {
          // Final agenda is a legal way to leave part III and must retain its trauma.
          s = settle(send({ ...s, agendaIndex: 1 }, { type: 'AdvanceAgenda' }))
        } else if (id === 'edge-of-the-earth-fatal-mirage') {
          mirages++
          expect(s.agendas[0]!.code).toBe(String(8549 + mirages).padStart(5, '0'))
          s = settle(
            send(
              s,
              ...s.investigators.map((i): Message => ({ type: 'Resign', investigator: i.id })),
            ),
          )
          expect(s.campaignLog!.values.edgeOfTheEarthMirageVisits).toBe(String(mirages))
        } else if (
          id === 'edge-of-the-earth-forbidden-peaks' ||
          id === 'edge-of-the-earth-city-of-the-elder-things'
        ) {
          s = settle(send(s, { type: 'AdvanceAgenda' }))
          s = settle(send(s, { type: 'AdvanceAgenda' }))
        } else if (id === 'edge-of-the-earth-heart-of-madness-part-1') {
          for (let n = 0; n < 3; n++) s = settle(send(s, { type: 'AdvanceAgenda' }))
          expect(s.campaignLog!.values.edgeOfTheEarthHeartCheckpoint).toBe(
            route.immediate ? 'immediate' : 'rest',
          )
        } else if (id === 'edge-of-the-earth-heart-of-madness-part-2') {
          if (route.collapse) {
            for (const loc of Object.values(s.locations).filter((l) => /^0867[4-8]$/.test(l.id))) {
              s = send(s, { type: 'RevealLocation', location: loc.id })
              // Result of a successful weapon attack; the pylon's health scales with the group.
              s = send(s, {
                type: 'DamageEnemy',
                enemy: 'heart-pylon:' + loc.id,
                amount: loc.clueValue * route.players,
                by: actor,
                source: { attack: true },
              })
            }
          } else {
            const location = s.investigators[0]!.location!
            for (let n = 0; n < 15; n++)
              s = send(s, { type: 'SpawnSetAsideEnemy', code: '08679', location })
            s = send(
              s,
              ...Object.keys(s.enemies).map((enemy): Message => ({ type: 'ExhaustEnemy', enemy })),
            )
          }
          s = settle(send(s, { type: 'Forced', trigger: { type: 'roundEnds' } }))
          expect(s.acts[0]!.code).toBe('08681')
          for (const i of s.investigators)
            for (const destination of ['08683', '08684', '08685', '08686']) {
              const from = s.investigators.find((p) => p.id === i.id)!.location!
              s = send(s, { type: 'DiscoverClues', investigator: i.id, location: from, amount: 1 })
              s = settle(send(s, { type: 'MoveTo', investigator: i.id, location: destination }))
            }
          expect(s.outcome).toEqual({ type: 'resolution', resolution: route.collapse ? 2 : 3 })
        } else throw new Error('Unreviewed route: ' + id)
      }
      expect(s.outcome, id).not.toBeNull()
      campaign = finishScenario(campaign, s)
      reload()
    }
    expect(campaign.log.notes).not.toContain('campaignLost')
    expect(campaignCanContinue(campaign)).toBe(false)
    expect(campaign.scenarioIndex).toBe(campaignDefinition(campaign.id).scenarios.length)
    expect(campaign.results.filter((r) => !r.skipped)).toHaveLength(
      played - Number(route.skipHeart),
    )
    expect(mirages).toBe(route.mirage ? 3 : 0)
    expect(stories).toContain('heartTwoIntro1')
    expect(stories).toContain(route.collapse ? 'heartTwoResolution2' : 'heartTwoResolution3')
    expect(campaign.log.values.edgeOfTheEarthSurvivors).toBeTruthy()
  },
)
