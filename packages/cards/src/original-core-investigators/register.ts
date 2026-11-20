// RR: Triggered Abilities, Additional Actions, Moving Horror, Weaknesses, Skill Tests.
import {
  getInvestigator,
  getLocation,
  playerCardDef,
  registerInvestigator,
  registerPlayerCard,
  registerTreachery,
  type Message,
  type GameState,
  type Investigator,
  type ReactionOption,
} from '@lcg/engine'
import { registerBasicAsset } from '../basic-abilities/register'
import { event, option } from '../advanced-tests/common'
const locationClues = (s: GameState, i: Investigator) =>
  i.location ? getLocation(s, i.location).clues : 0
const ownedTomes = (s: GameState, by: string) =>
  Object.values(s.assets).filter(
    (a) => a.owner === by && playerCardDef(a.code)?.traits.includes('Tome'),
  ).length
const threat = (id: string, by: string): Message => ({
  type: 'PlaceTreachery',
  treachery: id,
  placement: { type: 'threatArea', investigator: by },
})
export function registerOriginalCore(code: string): void {
  if (code === '01001') {
    registerInvestigator({
      code,
      elderSign: (s, i) => ({ modifier: locationClues(s, i) }),
      reactions: (s, t, i) =>
        t.type === 'enemyDefeated' && t.by === i.id && locationClues(s, i) > 0
          ? [
              {
                key: code,
                investigator: i.id,
                label: 'ability.originalRoland',
                limit: { per: 'round' },
                then: [{ type: 'DiscoverClues', investigator: i.id, amount: 1 }],
              },
            ]
          : [],
    })
    return
  }
  if (code === '01002') {
    registerInvestigator({
      code,
      traitAction: { trait: 'Tome', abilitiesOnly: true, active: () => true },
      elderSign: (_s, i) => ({
        modifier: 0,
        onSuccess: [{ type: 'PlayerCardEffect', code, investigator: i.id, step: 'elderSign' }],
      }),
    })
    registerPlayerCard({
      code,
      effect: (s, by, step) =>
        step === 'elderSign'
          ? [{ type: 'DrawCards', investigator: by, amount: ownedTomes(s, by) }]
          : [],
    })
    return
  }
  if (code === '01003') {
    registerInvestigator({
      code,
      fastOptions: (s, i) =>
        s.activeTurn === i.id && i.resources >= 2
          ? [
              {
                key: code,
                investigator: i.id,
                label: 'ability.originalSkids',
                limit: { per: 'turn' },
                then: [
                  { type: 'SpendResources', investigator: i.id, amount: 2 },
                  { type: 'GainActions', investigator: i.id, amount: 1 },
                ],
              },
            ]
          : [],
      elderSign: (_s, i) => ({
        modifier: 2,
        onSuccess: [{ type: 'GainResources', investigator: i.id, amount: 2 }],
      }),
    })
    return
  }
  if (code === '01004') {
    registerInvestigator({
      code,
      elderSign: (_s, i) => ({ modifier: i.horror }),
      reactions: (s, t, i): ReactionOption[] =>
        t.type === 'afterHorrorPlaced' &&
        t.investigator === i.id &&
        t.amount > 0 &&
        Object.values(s.enemies).some((e) => e.location === i.location)
          ? [
              {
                key: code,
                investigator: i.id,
                label: 'ability.originalAgnes',
                limit: { per: 'phase' },
                then: [{ type: 'ChooseEnemyToDamage', investigator: i.id, amount: 1 }],
              },
            ]
          : [],
    })
    return
  }
  if (code === '01006') {
    registerBasicAsset(code, [
      {
        action: 'fight',
        cost: ['use'],
        modifier: ({ state, self }) =>
          locationClues(state, getInvestigator(state, self.owner)) > 0 ? 3 : 1,
        extraDamage: 1,
      },
    ])
    return
  }
  if (code === '01007') {
    registerTreachery({
      code,
      tokenKind: 'clue',
      revelation: (_s, by, t) => [
        threat(t.id, by),
        { type: 'AddTreacheryTokens', treachery: t.id, amount: 3 },
      ],
      reactions: (_s, t, self) =>
        t.type === 'whenWouldDiscoverClues' &&
        self.owner === t.investigator &&
        (self.tokens ?? 0) > 0
          ? [
              {
                key: self.id,
                investigator: t.investigator,
                label: 'ability.originalCoverUp',
                params: { n: Math.min(t.amount, self.tokens ?? 0) },
                then: [
                  {
                    type: 'AddTreacheryTokens',
                    treachery: self.id,
                    amount: -Math.min(t.amount, self.tokens ?? 0),
                  },
                ],
              },
            ]
          : [],
      whenGameEnds: (_s, t) =>
        t.owner && (t.tokens ?? 0) > 0
          ? [{ type: 'SufferTrauma', investigator: t.owner, mental: 1 }]
          : [],
    })
    return
  }
  if (code === '01008') {
    registerPlayerCard({ code, restrictedSlots: [{ slot: 'hand', count: 2, trait: 'Tome' }] })
    return
  }
  if (code === '01009') {
    registerPlayerCard({
      code,
      revelation: (_s, by) => [
        { type: 'PutAssetIntoPlay', investigator: by, code },
        { type: 'PlayerCardEffect', code, investigator: by, step: 'initialize' },
      ],
      cannotLeavePlay: (_s, a) => a.horror > 0,
      forced: (_s, t, a) =>
        t.type === 'whenRevealChaosToken' && t.investigator === a.owner && t.token === 'elderSign'
          ? [{ type: 'TreatRevealedTokenAs', token: 'autoFail' }]
          : [],
      abilities: (_s, a, by) =>
        by === a.owner && a.horror > 0
          ? [
              {
                key: a.id + ':move',
                label: 'ability.originalNecronomicon',
                actions: 1,
                provokes: true,
                then: [
                  {
                    type: 'MoveDamage',
                    from: { type: 'asset', id: a.id },
                    to: { type: 'investigator', id: by },
                    kind: 'horror',
                  },
                  {
                    type: 'PlayerCardEffect',
                    code,
                    investigator: by,
                    step: 'check',
                    data: { asset: a.id },
                  },
                ],
              },
            ]
          : [],
      effect: (s, by, step, d) => {
        const a = Object.values(s.assets).find(
          (a) => a.code === code && a.owner === by && (step === 'initialize' || a.id === d.asset),
        )
        return !a
          ? []
          : step === 'initialize'
            ? [{ type: 'DamageAsset', asset: a.id, damage: 0, horror: 3 }]
            : step === 'check' && a.horror === 0
              ? [{ type: 'DiscardAsset', asset: a.id }]
              : []
      },
    })
    return
  }
  if (code === '01010') {
    const protect = (by: string): Message[] => [
      { type: 'ProtectFromAttacks', investigator: by, nonElite: true, untilRoundEnd: true },
    ]
    registerPlayerCard({
      code,
      canPlay: () => false,
      handReactions: (_s, t, by) =>
        t.type === 'turnBegins' && t.investigator === by ? event(code, by, protect(by)) : [],
      play: (_s, by) => protect(by),
    })
    return
  }
  if (code === '01011') {
    registerTreachery({
      code,
      tokenKind: 'resource',
      revelation: (_s, by, t) => [threat(t.id, by)],
      abilities: (s, t, by) =>
        by === t.owner && getInvestigator(s, by).resources > 0
          ? [
              {
                key: t.id + ':pay',
                label: 'ability.originalHospitalDebts',
                actions: 0,
                provokes: false,
                limit: { per: 'round', max: 2 },
                then: [
                  { type: 'SpendResources', investigator: by, amount: 1 },
                  { type: 'AddTreacheryTokens', treachery: t.id, amount: 1 },
                ],
              },
            ]
          : [],
      whenGameEnds: (_s, t) =>
        t.owner && (t.tokens ?? 0) < 6
          ? [{ type: 'EarnExperience', investigator: t.owner, amount: -2 }]
          : [],
    })
    return
  }
  if (code === '01012') {
    registerPlayerCard({
      code,
      reactions: (_s, t, a) =>
        t.type === 'afterPlayCard' &&
        t.investigator === a.owner &&
        playerCardDef(t.code)?.traits.includes('Spell')
          ? [option(a, [{ type: 'DrawCards', investigator: a.owner, amount: 1 }])]
          : [],
    })
    return
  }
  if (code === '01013') {
    registerPlayerCard({
      code,
      play: () => [{ type: 'PlaceDoom', amount: 1 }, { type: 'CheckAgenda' }],
      handForced: (_s, t, by) =>
        t.type === 'turnEnds' && t.investigator === by
          ? [{ type: 'TakeDamage', investigator: by, damage: 0, horror: 2 }]
          : [],
    })
    return
  }
  throw Error('Unreviewed investigator card ' + code)
}
