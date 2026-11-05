import {
  getInvestigator,
  registerScenario,
  type Difficulty,
  type GameState,
  type Message,
  type ScenarioDefinition,
} from '@lcg/engine'
import { ENCOUNTER_SETS } from '../the-path-to-carcosa/encounter-sets'
import { endScenario, recordNote } from '../scenario-helpers'
import { PLAGUEBEARER_CHAOS_BAGS } from './campaign'
import { C, damage, run, specific } from './helpers'
import { first, greyson, sharedDeck, supplicant, troubleshooter } from './data'
import { guarded } from './enemies'
import { L, lateRisersLocations } from './locations'
import { locationReactions } from './location-rules'
import { encounterReactions } from './encounters'
import { lateRisersSpecific, lateRisersTokenEffect } from './tokens'
import './plot'
import './briefcase'

export const LATE_RISERS = 'late-risers'
export function lateRisers({
  difficulty = 'standard',
}: { difficulty?: Difficulty } = {}): ScenarioDefinition {
  const locations = lateRisersLocations()
  return {
    id: LATE_RISERS,
    intro: { title: 'story.plaguebearer.introTitle', body: 'story.plaguebearer.intro' },
    setupInstructions: { title: 'story.plaguebearer.setupTitle', body: 'story.plaguebearer.setup' },
    locations: locations.filter((l) => l.id === L.morgue || l.id === L.omega),
    setAsideLocations: locations.filter((l) => l.id !== L.morgue && l.id !== L.omega),
    startingLocation: L.morgue,
    agendas: C.agendas.map((code, index) => ({
      code,
      name: ['Blocked In', 'Frantic Search', 'There’s No Way Out'][index]!,
      doomThreshold: [5, 5, 7][index]!,
    })),
    acts: C.acts.map((code, index) => ({
      code,
      name: ['No Better Ideas', 'Climb the Barricades', 'Scylla and Charybdis'][index]!,
      clueThreshold: 0,
      cluesPerInvestigator: false,
      advanceTiming: 'objective',
    })),
    encounterDeck: [...sharedDeck(), ...ENCOUNTER_SETS.strikingFear],
    setAside: [
      greyson,
      first,
      { ...troubleshooter },
      { ...troubleshooter },
      { ...supplicant },
      { ...supplicant },
    ],
    chaosBag: [...PLAGUEBEARER_CHAOS_BAGS[difficulty]],
    tokenValues: { skull: 0, cultist: -3, tablet: -2, elderThing: 0 },
    setup: [
      specific('plaguebearer.initBarricade', { location: L.omega, amount: 1 }),
      specific('plaguebearer.hidden', { index: 0 }),
    ],
  }
}
function resolution(
  s: GameState,
  outcome: Parameters<NonNullable<import('@lcg/engine').ScenarioBehavior['resolution']>>[1],
): Message[] {
  const n =
    outcome.type === 'noResolution'
      ? s.investigators.some((i) => i.resigned)
        ? 2
        : 1
      : outcome.resolution
  const notes =
    n === 1
      ? ['plaguebearerContained']
      : n === 2
        ? [
            'plaguebearerMotel',
            ...(s.victoryDisplay.includes(C.greyson) ? ['plaguebearerFirstClaimed'] : []),
          ]
        : ['plaguebearerMotel', 'plaguebearerRespect']
  return [
    {
      type: 'Story',
      entry: {
        title: `story.plaguebearer.resolution${n}Title`,
        body: `story.plaguebearer.resolution${n}`,
      },
    },
    { type: 'EarnExperience', amount: 0, victory: true },
    ...notes.map((note) => recordNote(note)),
    ...(s.campaignLog?.notes.includes('plaguebearerFire')
      ? [recordNote('plaguebearerCollection')]
      : []),
    ...Object.values(s.assets)
      .filter((a) => a.code === C.briefcase)
      .map((a) => ({ type: 'AddStoryAsset' as const, investigator: a.owner, code: C.briefcase })),
    endScenario({ type: 'resolution', resolution: n }),
  ]
}
registerScenario({
  id: LATE_RISERS,
  rulesVersion: 1,
  simultaneousAssetAssignment: true,
  sequentialEnemyMovement: true,
  tokenEffect: lateRisersTokenEffect,
  specific: (s, key, d) => run(lateRisersSpecific(s, key, d), key, d),
  resolution,
  canEnter: (s, _by, _from, to) => (s.locations[to]?.resources ?? 0) === 0,
  cannotLeave: (s, by) => guarded(s, getInvestigator(s, by).location),
  cannotMoveEnemy: (s, e) => guarded(s, e.location),
  enemyStat: (s, e, stat) =>
    e.location === L.lobby && s.locations[L.lobby]?.revealed
      ? -Math.min(1, Math.max(0, e[stat] - 1))
      : 0,
  assetLeavesPlay: (_s, asset) =>
    asset.code === C.briefcase
      ? [{ type: 'ExileCard', investigator: asset.owner, asset: asset.id, code: C.briefcase }]
      : null,
  reactions: (s, t) => [...locationReactions(s, t), ...encounterReactions(s, t)],
  forced: (s, t) => {
    if (
      t.type === 'afterSkillTest' &&
      !t.succeeded &&
      t.margin <= -2 &&
      s.skillTest?.kind.type === 'effect'
    ) {
      const code = s.skillTest.kind.source
      if (code === C.suppression || code === C.urge)
        return [damage(t.investigator, code === C.suppression ? 2 : 0, code === C.urge ? 2 : 0)]
    }
    return []
  },
})
