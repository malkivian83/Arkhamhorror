// RR: Triggered Abilities, Equipment Slots, Uses, As If, Move, Fight, Lasting Effects.
import {
  attackBlocked,
  canAffordEntry,
  canEnter,
  enemiesAt,
  fightEnemies,
  enemyBarredFrom,
  enemyHasKeyword,
  getLocation,
  immuneToPlayerCards,
  leavingBlocked,
  moveBlocked,
  shroudOf,
  turnActionTiming,
  usesLenders,
  type AbilityOption,
  type Asset,
  type GameState,
  type Message,
} from '@lcg/engine'
import {
  ask,
  continuation,
  exhaust,
  fast,
  here,
  neighbors,
  option,
  owned,
  registerPlayerCard,
  spend,
  walk,
} from './common'

const canMoveTo = (s: GameState, by: string, to: string) =>
  here(s, by) &&
  !leavingBlocked(s, here(s, by)!) &&
  !moveBlocked(s, by) &&
  canEnter(s, by, to) &&
  canAffordEntry(s, to, by)
const selectableEnemies = (s: GameState, by: string, code: string) =>
  here(s, by)
    ? fightEnemies(s, by).filter(
        (e) =>
          !attackBlocked(s, by, e, code) &&
          (e.engagedWith !== null ||
            e.keywords.includes('massive') ||
            !enemyHasKeyword(s, e, 'aloof')),
      )
    : []

export function registerMovementAsset(code: string): boolean {
  if (code === '08045') {
    const away = (s: GameState, a: Asset) => here(s, a.owner) !== a.form
    registerPlayerCard({
      code,
      skillModifier: (s, a, t) =>
        away(s, a) && (t.skill === 'intellect' || t.skill === 'agility') ? 1 : 0,
      ignoresOpportunityAttacks: (s, a) => away(s, a),
      reactions: (s, t, a) =>
        t.type === 'afterAssetEntersPlay' && t.asset === a.id
          ? [
              option(
                a,
                ask(
                  a.owner,
                  Object.values(s.locations)
                    .filter((l) => l.revealed)
                    .map((l) => ({
                      label: 'choice.location',
                      params: { location: l.name },
                      target: { type: 'location', id: l.id },
                      then: [{ type: 'SetAssetForm', asset: a.id, form: l.id }],
                    })),
                  true,
                ),
              ),
            ]
          : [],
      abilities: (s, a) =>
        a.form && s.locations[a.form]
          ? s.investigators
              .filter(
                (i) =>
                  !i.eliminated &&
                  i.location &&
                  i.location !== a.form &&
                  canMoveTo(s, i.id, a.form!),
              )
              .map((i) => ({
                key: a.id + ':locus:' + i.id,
                label: 'choice.movementLocus',
                params: { name: i.name, location: getLocation(s, a.form!).name },
                actions: 1,
                provokes: true,
                then: [{ type: 'MoveTo', investigator: i.id, location: a.form! }],
              }))
          : [],
    })
    return true
  }
  if (code === '08097') {
    const looking = (s: GameState, a: Asset): AbilityOption[] =>
      a.exhausted || !here(s, a.owner)
        ? []
        : getLocation(s, here(s, a.owner)!)
            .connections.filter((id) => s.locations[id] && !s.locations[id]!.revealed)
            .map((id) => ({
              ...fast(
                a,
                [
                  exhaust(a),
                  ...ask(
                    a.owner,
                    [{ label: 'choice.continue', previewCard: id.replace(/~\d+$/, ''), then: [] }],
                    true,
                  ),
                ],
                ':look:' + id,
              ),
              label: 'choice.movementLook',
              params: { location: getLocation(s, id).name },
            }))
    registerPlayerCard({
      code,
      fastOptions: (s, a) => looking(s, a).map((o) => ({ ...o, investigator: a.owner })),
      abilities: (s, a) => [
        ...looking(s, a),
        ...(here(s, a.owner)
          ? getLocation(s, here(s, a.owner)!)
              .connections.filter((id) => s.locations[id]?.revealed)
              .map((id) => ({
                key: a.id + ':investigate:' + id,
                label: 'choice.movementInvestigate',
                params: { location: getLocation(s, id).name },
                actions: 1,
                actionKind: 'investigate' as const,
                provokes: true,
                target: { type: 'location' as const, id },
                then: [
                  {
                    type: 'AsIfAt' as const,
                    investigator: a.owner,
                    location: id,
                    then: [
                      {
                        type: 'BeginSkillTest' as const,
                        investigator: a.owner,
                        source: a.id,
                        skill: 'intellect' as const,
                        difficulty: shroudOf(s, id),
                        kind: { type: 'investigate' as const, location: id },
                      },
                    ],
                  },
                ],
              }))
          : []),
      ],
    })
    return true
  }
  if (code === '08099') {
    registerPlayerCard({
      code,
      skillModifier: (_s, _a, t) => (t.skill === 'intellect' || t.skill === 'agility' ? 1 : 0),
      reactions: (s, t, a) => {
        const at = here(s, a.owner)
        if (
          t.type !== 'afterMove' ||
          t.investigator !== a.owner ||
          !at ||
          a.exhausted ||
          turnActionTiming(s, a.owner) === null
        )
          return []
        const choices = getLocation(s, at)
          .connections.filter((id) => !!s.locations[id])
          .flatMap((other) => [
            ...[
              { from: at, to: other },
              { from: other, to: at },
            ].flatMap(({ from, to }) => [
              ...(getLocation(s, from).clues > 0
                ? [
                    {
                      label: 'choice.movementTransferClue',
                      params: { from: getLocation(s, from).name, to: getLocation(s, to).name },
                      then: [
                        {
                          type: 'MoveClues' as const,
                          from: { type: 'location' as const, id: from },
                          to: { type: 'location' as const, id: to },
                          amount: 1,
                        },
                      ],
                    },
                  ]
                : []),
              ...enemiesAt(s, from)
                .filter(
                  (e) =>
                    !e.traits?.includes('Elite') &&
                    !immuneToPlayerCards(e) &&
                    !enemyBarredFrom(s, e, to),
                )
                .map((e) => ({
                  label: 'choice.movementTransferEnemy',
                  params: { enemy: e.name, location: getLocation(s, to).name },
                  target: { type: 'enemy' as const, id: e.id },
                  then: [{ type: 'MoveEnemy' as const, enemy: e.id, location: to }],
                })),
            ]),
          ])
        return choices.length ? [option(a, [exhaust(a), ...ask(a.owner, choices, true)])] : []
      },
    })
    return true
  }
  if (code === '11109') {
    registerPlayerCard({
      code,
      requiredInvestigatorTraits: ['Believer', 'Chosen', 'Cultist'],
      reactions: (s, t, a) =>
        t.type === 'whenEnterLocation' &&
        t.investigator === a.owner &&
        !a.exhausted &&
        enemiesAt(s, t.location).some(
          (e) => !e.traits?.includes('Elite') && !immuneToPlayerCards(e),
        )
          ? [
              option(a, [
                exhaust(a),
                ...enemiesAt(s, t.location)
                  .filter((e) => !e.traits?.includes('Elite') && !immuneToPlayerCards(e))
                  .map((e) => ({
                    type: 'AddEnemyModifier' as const,
                    enemy: e.id,
                    modifier: {
                      source: code,
                      until: 'round' as const,
                      cannotEngage: a.owner,
                      cannotDamageBy: a.owner,
                    },
                  })),
              ]),
            ]
          : [],
    })
    return true
  }
  if (code === '08118') {
    registerPlayerCard({
      code,
      fightAction: true,
      abilities: (s, a) => {
        const at = here(s, a.owner)
        if (!at || a.exhausted) return []
        const remote =
          a.uses + usesLenders(s, a).reduce((n, l) => n + l.uses, 0) > 0
            ? Object.values(s.enemies).filter(
                (e) =>
                  getLocation(s, at).connections.includes(e.location) &&
                  !e.traits?.includes('Elite') &&
                  !attackBlocked(s, a.owner, e, code),
              )
            : []
        return [
          ...selectableEnemies(s, a.owner, code).map((e) => ({ e, remote: false })),
          ...remote.map((e) => ({ e, remote: true })),
        ].flatMap(({ e, remote }) =>
          (['willpower', 'agility'] as const).map((skill) => ({
            key: a.id + ':bow:' + e.id + ':' + skill,
            label:
              skill === 'willpower' ? 'choice.movementBowWillpower' : 'choice.movementBowAgility',
            params: { enemy: e.name },
            target: { type: 'enemy' as const, id: e.id },
            actions: 1,
            actionKind: 'fight' as const,
            provokes: false,
            then: [
              exhaust(a),
              ...(remote ? [spend(a)] : []),
              {
                type: 'BeginSkillTest' as const,
                investigator: a.owner,
                source: a.id,
                skill,
                modifier: 1,
                difficulty: e.fight,
                ...(remote
                  ? { ignoredEnemyKeywords: ['aloof', 'retaliate'] as ('aloof' | 'retaliate')[] }
                  : {}),
                kind: { type: 'fight' as const, enemy: e.id, extraDamage: 1 },
              },
            ],
          })),
        )
      },
    })
    return true
  }
  if (code === '08127') {
    registerPlayerCard({
      code,
      sharedSlot: { key: code, size: 2 },
      abilities: (s, a) =>
        !owned(s, a.owner).some((d) => d.code === code && !d.exhausted)
          ? []
          : [
              ...(neighbors(s, a.owner).length
                ? [
                    {
                      key: a.id + ':dogsMove',
                      label: 'ability.movementDogsMove',
                      actions: 1,
                      actionKind: 'move' as const,
                      provokes: true,
                      then: [
                        continuation(code, a.owner, 'dogs', {
                          host: a.id,
                          mode: 'move',
                          selected: '[]',
                        }),
                      ],
                    },
                  ]
                : []),
              ...(selectableEnemies(s, a.owner, code).length
                ? [
                    {
                      key: a.id + ':dogsFight',
                      label: 'ability.movementDogsFight',
                      actions: 1,
                      actionKind: 'fight' as const,
                      provokes: false,
                      then: [
                        continuation(code, a.owner, 'dogs', {
                          host: a.id,
                          mode: 'fight',
                          selected: '[]',
                        }),
                      ],
                    },
                  ]
                : []),
            ],
      effect: (s, by, step, d) => {
        if (step === 'walk') return walk(s, by, code, d)
        const selected = JSON.parse(String(d.selected)) as string[]
        const next = (step: string, selected: string[]): Message =>
          continuation(code, by, step, { ...d, selected: JSON.stringify(selected) })
        if (step === 'dogs')
          return ask(
            by,
            [
              ...owned(s, by)
                .filter((a) => a.code === code && !a.exhausted && !selected.includes(a.id))
                .map((a) => ({
                  label: 'choice.movementDog',
                  params: { n: selected.length + 1 },
                  target: { type: 'asset' as const, id: a.id },
                  then: [next('dogs', [...selected, a.id])],
                })),
              ...(selected.length
                ? [{ label: 'choice.continue', then: [next('dogsPay', selected)] }]
                : []),
            ],
            true,
          )
        if (
          step !== 'dogsPay' ||
          !selected.length ||
          selected.some(
            (id) => !s.assets[id] || s.assets[id]!.owner !== by || s.assets[id]!.exhausted,
          )
        )
          return []
        const pay: Message[] = selected.map((asset) => ({ type: 'ExhaustAsset', asset }))
        if (d.mode === 'move')
          return [...pay, continuation(code, by, 'walk', { left: selected.length })]
        return ask(
          by,
          selectableEnemies(s, by, code).map((e) => ({
            label: 'choice.enemy',
            params: { enemy: e.name },
            target: { type: 'enemy', id: e.id },
            then: [
              ...pay,
              {
                type: 'BeginSkillTest',
                investigator: by,
                source: String(d.host),
                skill: 'combat',
                difficulty: e.fight,
                modifier: selected.length,
                kind: { type: 'fight', enemy: e.id, extraDamage: selected.length - 1 },
              },
            ],
          })),
          true,
        )
      },
    })
    return true
  }
  return false
}
