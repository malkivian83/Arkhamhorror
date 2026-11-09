// RR: Attach To, Limits, Triggered Abilities, "As if...", Immune, Fight, Evade, Investigate,
// Additional Actions, Elusive, Hunter, Prey, Retaliate, Weakness.
import {
  attackBlocked,
  distancesFrom,
  enemiesAt,
  enemyHasKeyword,
  getInvestigator,
  getLocation,
  immuneToPlayerCards,
  investigatorsAt,
  playerCardBehavior,
  playerCardDef,
  registerEnemy,
  registerInvestigator,
  registerPlayerCard,
  shroudOf,
  type Choice,
  type Enemy,
  type GameState,
  type InvestigatorId,
  type LocationAttachment,
  type Message,
  type PlayerCardBehavior,
  type ReactionOption,
  type SkillType,
} from '@lcg/engine'
import { mayChoose } from '../core-2026/player-cards'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'
import { destinations } from '../spell-field-tools/common'
import { rebindCard } from '../reprints-wave-2/register'
import { registerGuerrillaTactics } from '../reused-mechanics/card-60564'
import '../reactive-support/card-01075'
import {
  BLOOD_DRINKER,
  DECOY_TRAP,
  FELINE_HYBRID,
  GLASSING,
  GUERRILLA_TACTICS_2,
  HIDDEN_SHELTER,
  KNAPSACK,
  LIE_IN_WAIT,
  MAKESHIFT_BOMB,
  MIGUEL,
  RABBITS_FOOT,
  ROPE_TRAP,
  STALK_PREY,
} from './codes'

const attachments = (s: GameState, location: string) =>
  Object.values(s.locationAttachments ?? {}).filter((a) => a.location === location)

/** RR Attach To: the "Limit 1 Trap per location" / "Limit 1 per location" check. */
function canAttach(s: GameState, code: string, location: string): boolean {
  const here = attachments(s, location)
  return code === HIDDEN_SHELTER
    ? !here.some((a) => playerCardDef(a.code)?.name === playerCardDef(code)?.name)
    : !here.some((a) => playerCardDef(a.code)?.traits.includes('Trap'))
}

/** A ready Knapsack may still resolve the attachment at a connecting location. */
const knapsackReady = (s: GameState, by: InvestigatorId) =>
  Object.values(s.assets).some((a) => a.owner === by && a.code === KNAPSACK && !a.exhausted)

/** "Attach to your location." Played normally; the event leaves the discard pile when attached. */
function attachBehavior(code: string): Pick<PlayerCardBehavior, 'canPlay' | 'play'> {
  return {
    canPlay: (s, by) => {
      const here = getInvestigator(s, by).location
      return here !== null && (canAttach(s, code, here) || knapsackReady(s, by))
    },
    play: (s, by) => {
      const here = getInvestigator(s, by).location
      return here === null
        ? []
        : [
            {
              type: 'AttachEventToLocation',
              investigator: by,
              code,
              location: here,
              ...(code === HIDDEN_SHELTER ? { limitTitle: true } : { limitTrait: 'Trap' }),
            },
          ]
    },
  }
}

/** The enemy that just entered the attached location, if player card effects may affect it. */
function entering(s: GameState, location: string, enemyId: string): Enemy | null {
  const enemy = s.enemies[enemyId]
  return enemy && enemy.location === location && !immuneToPlayerCards(enemy) ? enemy : null
}

const trapOption = (
  self: LocationAttachment,
  label: string,
  params: Record<string, string>,
  then: Message[],
): ReactionOption => ({
  key: self.id + ':trap',
  investigator: self.owner,
  label,
  params: { card: cardName(self.code), ...params },
  then,
})

const skillChoices = (
  by: InvestigatorId,
  skills: SkillType[],
  difficulty: number,
  test: (skill: SkillType) => Message,
): Message[] => [
  {
    type: 'Ask',
    investigator: by,
    question: {
      kind: 'chooseOne',
      prompt: 'prompt.chooseSkill',
      choices: skills.map((skill) => ({
        label: `choice.test.${skill}`,
        params: { difficulty },
        then: [test(skill)],
      })),
    },
  },
]

const discard = (self: LocationAttachment): Message => ({
  type: 'DiscardLocationAttachment',
  attachment: self.id,
})
const exhaust = (self: LocationAttachment): Message => ({
  type: 'ExhaustLocationAttachment',
  attachment: self.id,
})

/** "Move once toward" a location: connecting locations one step closer to it. */
function stepsToward(s: GameState, by: InvestigatorId, target: string): string[] {
  const here = getInvestigator(s, by).location
  if (here === null || here === target) return []
  const distances = distancesFrom(s, target)
  const current = distances.get(here)
  if (current === undefined) return []
  return destinations(s, by).filter((l) => distances.get(l) === current - 1)
}

/** Same card text as the implemented printing: its behavior bound to this code. */
function registerReprint(code: string, source: string): void {
  const behavior = playerCardBehavior(source)
  if (!behavior) throw new Error('Reprint without source behavior: ' + code)
  const bound = Object.fromEntries(
    Object.entries(behavior).map(([key, value]) => [
      key,
      typeof value === 'function'
        ? (...args: unknown[]) =>
            rebindCard((value as (...a: unknown[]) => unknown)(...args), source, code)
        : value,
    ]),
  ) as unknown as PlayerCardBehavior
  registerPlayerCard({ ...bound, code })
}

export function registerMiguelCard(code: string): void {
  if (code === MIGUEL) {
    registerInvestigator({
      code,
      // "You may take an additional action during your turn, which may only be used to play
      // an event." It is spent before the ordinary actions on an event.
      traitAction: { cardType: 'event', active: () => true },
      elderSign: (s, self) => ({
        modifier: 1,
        immediate: ask(
          self.id,
          [
            { label: 'choice.skip', then: [] },
            ...[...new Set(getInvestigator(s, self.id).discard)]
              .filter((c) =>
                (playerCardDef(c)?.traits ?? []).some((t) => t === 'Trick' || t === 'Trap'),
              )
              .map((c): Choice => ({
                label: 'choice.takeCard',
                params: { card: cardName(c) },
                then: [{ type: 'DiscardToHand', investigator: self.id, code: c }],
              })),
          ].filter((_, n, all) => all.length > 1 || n > 0),
          true,
        ),
      }),
    })
    return
  }
  if (code === KNAPSACK) {
    registerPlayerCard({
      code,
      reactions: (s, t, a) =>
        t.type === 'afterPlayCard' &&
        t.investigator === a.owner &&
        !a.exhausted &&
        playerCardDef(t.code)?.type === 'event' &&
        s.queue.some(
          (m) => m.type === 'ResolvePlayedCard' && m.investigator === a.owner && m.code === t.code,
        )
          ? [
              {
                key: a.id + ':knapsack',
                investigator: a.owner,
                label: 'ability.miguelsKnapsack',
                params: { card: cardName(t.code) },
                then: [
                  { type: 'ExhaustAsset', asset: a.id },
                  continuation(code, a.owner, 'choice', { event: t.code }),
                ],
              },
            ]
          : [],
      effect: (s, by, step, data) => {
        if (step !== 'choice') return []
        const event = String(data.event)
        const here = getInvestigator(s, by).location
        const connecting =
          here === null ? [] : getLocation(s, here).connections.filter((l) => s.locations[l])
        return ask(
          by,
          [
            ...connecting.map((location): Choice => ({
              label: 'choice.knapsackPlayAt',
              params: { card: cardName(event), location: getLocation(s, location).name },
              target: { type: 'location', id: location },
              then: [{ type: 'PlayEventAt', investigator: by, code: event, location }],
            })),
            {
              label: 'choice.knapsackDraw',
              then: [{ type: 'DrawCards', investigator: by, amount: 1 }],
            },
          ],
          true,
        )
      },
    })
    return
  }
  if (code === FELINE_HYBRID) {
    registerPlayerCard({
      code,
      enemy: {
        kind: 'enemy',
        code,
        name: cardName(code),
        fight: 3,
        health: 2,
        evade: 3,
        damage: 1,
        horror: 1,
        keywords: ['elusive', 'hunter'],
        traits: ['Creature', 'Mutated'],
        prey: { type: 'only', investigator: MIGUEL },
      },
    })
    registerEnemy({ code, immuneToPlayerCards: true })
    return
  }
  if (code === BLOOD_DRINKER) {
    registerPlayerCard({
      code,
      enemy: {
        kind: 'enemy',
        code,
        name: cardName(code),
        fight: 2,
        health: 3,
        evade: 4,
        damage: 1,
        horror: 1,
        keywords: ['hunter', 'retaliate'],
        traits: ['Humanoid', 'Monster'],
      },
    })
    registerEnemy({
      code,
      forced: (_s, t, self) =>
        t.type === 'afterEnemyAttack' && t.enemy === self.id && self.damageTaken > 0
          ? [{ type: 'HealEnemy', enemy: self.id, amount: 1 }]
          : [],
    })
    return
  }
  if (code === RABBITS_FOOT) {
    registerReprint(code, '01075')
    return
  }
  if (code === DECOY_TRAP) {
    registerPlayerCard({
      code,
      ...attachBehavior(code),
      locationAttachmentReactions: (s, t, self) => {
        if (t.type !== 'enemyEntersLocation' || t.location !== self.location || self.exhausted)
          return []
        const enemy = entering(s, self.location, t.enemy)
        if (!enemy || enemy.cannotBeEvaded) return []
        return [
          trapOption(self, 'ability.decoyTrap', { enemy: enemy.name }, [
            exhaust(self),
            ...skillChoices(self.owner, ['intellect', 'agility'], enemy.evade, (skill) => ({
              type: 'BeginSkillTest',
              investigator: self.owner,
              skill,
              difficulty: enemy.evade,
              modifier: 1,
              effectSource: code,
              tags: ['trap'],
              kind: {
                type: 'evade',
                enemy: enemy.id,
                onSuccess: [continuation(code, self.owner, 'move', { attachment: self.id })],
              },
            })),
          ]),
        ]
      },
      effect: (s, by, step, data) => {
        const self = s.locationAttachments?.[String(data.attachment)]
        if (step !== 'move' || !self) return []
        return [
          mayChoose(
            by,
            'choice.decoyTrapMove',
            { card: cardName(code), location: getLocation(s, self.location).name },
            [
              discard(self),
              ...(getInvestigator(s, by).location === self.location
                ? []
                : [{ type: 'MoveTo' as const, investigator: by, location: self.location }]),
            ],
          ),
        ]
      },
    })
    return
  }
  if (code === GLASSING) {
    registerPlayerCard({
      code,
      ...attachBehavior(code),
      locationAttachmentReactions: (s, t, self) => {
        if (t.type !== 'enemyEntersLocation' || t.location !== self.location || self.exhausted)
          return []
        // Glassing does not affect the entering enemy, so its immunity does not matter.
        if (s.enemies[t.enemy]?.location !== self.location) return []
        const difficulty = shroudOf(s, self.location)
        return [
          trapOption(self, 'ability.glassing', { location: getLocation(s, self.location).name }, [
            exhaust(self),
            ...skillChoices(self.owner, ['intellect', 'agility'], difficulty, (skill) => ({
              type: 'BeginSkillTest',
              investigator: self.owner,
              skill,
              difficulty,
              modifier: 1,
              effectSource: code,
              tags: ['trap'],
              kind: {
                type: 'investigate',
                location: self.location,
                onSuccess: [continuation(code, self.owner, 'clue', { attachment: self.id })],
              },
            })),
          ]),
        ]
      },
      effect: (s, by, step, data) => {
        const self = s.locationAttachments?.[String(data.attachment)]
        if (step !== 'clue' || !self || (s.locations[self.location]?.clues ?? 0) < 1) return []
        return [
          mayChoose(
            by,
            'choice.glassingClue',
            { card: cardName(code), location: getLocation(s, self.location).name },
            [
              discard(self),
              { type: 'DiscoverClues', investigator: by, amount: 1, location: self.location },
            ],
          ),
        ]
      },
    })
    return
  }
  if (code === LIE_IN_WAIT) {
    registerPlayerCard({
      code,
      ...attachBehavior(code),
      locationAttachmentReactions: (s, t, self) => {
        // "If you succeed, you may discard Lie in Wait for this attack to deal +1 damage."
        if (t.type === 'whenWouldSucceed') {
          const test = s.skillTest
          return test?.kind.type === 'fight' &&
            test.investigator === self.owner &&
            test.effectSource === code &&
            test.tags?.includes('attachment:' + self.id)
            ? [
                {
                  key: self.id + ':damage',
                  investigator: self.owner,
                  label: 'ability.lieInWaitDamage',
                  params: { card: cardName(code) },
                  then: [discard(self), { type: 'ModifySkillTest', extraDamage: 1 }],
                },
              ]
            : []
        }
        if (t.type !== 'enemyEntersLocation' || t.location !== self.location || self.exhausted)
          return []
        const enemy = entering(s, self.location, t.enemy)
        if (
          !enemy ||
          attackBlocked(s, self.owner, enemy, code) ||
          (enemy.engagedWith === null && enemyHasKeyword(s, enemy, 'aloof'))
        )
          return []
        return [
          trapOption(self, 'ability.lieInWait', { enemy: enemy.name }, [
            exhaust(self),
            ...skillChoices(self.owner, ['combat', 'agility'], enemy.fight, (skill) => ({
              type: 'BeginSkillTest',
              investigator: self.owner,
              skill,
              difficulty: enemy.fight,
              modifier: 1,
              effectSource: code,
              tags: ['trap', 'tactic', 'attachment:' + self.id],
              kind: { type: 'fight', enemy: enemy.id },
            })),
          ]),
        ]
      },
    })
    return
  }
  if (code === ROPE_TRAP) {
    registerPlayerCard({
      code,
      ...attachBehavior(code),
      // "When an enemy enters": the engine's entry window opens as it enters the location.
      locationAttachmentReactions: (s, t, self) => {
        if (t.type !== 'enemyEntersLocation' || t.location !== self.location || self.exhausted)
          return []
        const enemy = entering(s, self.location, t.enemy)
        if (!enemy) return []
        return [
          trapOption(self, 'ability.ropeTrap', { enemy: enemy.name }, [
            exhaust(self),
            {
              type: 'DamageEnemy',
              enemy: enemy.id,
              amount: 1,
              by: self.owner,
              source: { code },
            },
            {
              type: 'RevealTokenOutsideTest',
              investigator: self.owner,
              then: {
                type: 'PlayerCardEffect',
                code,
                investigator: self.owner,
                step: 'token',
                data: { attachment: self.id },
              },
            },
          ]),
        ]
      },
      effect: (s, _by, step, data) => {
        const self = s.locationAttachments?.[String(data.attachment)]
        return step === 'token' && self && ['skull', 'autoFail'].includes(String(data.token))
          ? [discard(self)]
          : []
      },
    })
    return
  }
  if (code === MAKESHIFT_BOMB) {
    registerPlayerCard({
      code,
      ...attachBehavior(code),
      locationAttachmentReactions: (s, t, self) => {
        const entered =
          (t.type === 'enemyEntersLocation' &&
            t.location === self.location &&
            s.enemies[t.enemy]?.location === self.location) ||
          (t.type === 'afterMove' &&
            t.from !== self.location &&
            getInvestigator(s, t.investigator).location === self.location)
        if (!entered) return []
        // RR: Damage, Simultaneous effects. Enemy defeats are checked after every card is dealt.
        const enemies = enemiesAt(s, self.location).filter((e) => !immuneToPlayerCards(e))
        return [
          {
            key: self.id + ':bomb',
            investigator: self.owner,
            label: 'ability.makeshiftBomb',
            params: { card: cardName(code), location: getLocation(s, self.location).name },
            then: [
              discard(self),
              ...enemies.map((e): Message => ({
                type: 'DamageEnemy',
                enemy: e.id,
                amount: 3,
                by: self.owner,
                source: { code },
                deferDefeat: true,
              })),
              ...investigatorsAt(s, self.location).map((i): Message => ({
                type: 'TakeDamage',
                investigator: i.id,
                damage: 3,
                horror: 0,
                source: cardName(code),
              })),
              ...enemies.map((e): Message => ({
                type: 'CheckEnemyDefeat',
                enemy: e.id,
                by: self.owner,
              })),
            ],
          },
        ]
      },
    })
    return
  }
  if (code === HIDDEN_SHELTER) {
    registerPlayerCard({
      code,
      ...attachBehavior(code),
      locationAttachmentReactions: (s, t, self) =>
        t.type === 'roundEnds' && investigatorsAt(s, self.location).length > 0
          ? [
              {
                key: self.id + ':shelter',
                investigator: self.owner,
                label: 'ability.hiddenShelter',
                params: { card: cardName(code), location: getLocation(s, self.location).name },
                then: investigatorsAt(s, self.location).map((i) =>
                  continuation(code, self.owner, 'benefit', { investigator: i.id }),
                ),
              },
            ]
          : [],
      locationAttachmentForced: (s, t, self) =>
        t.type === 'enemyEntersLocation' &&
        t.location === self.location &&
        s.enemies[t.enemy]?.location === self.location
          ? [discard(self)]
          : [],
      effect: (s, _by, step, data) => {
        const who = s.investigators.find((i) => i.id === data.investigator)
        if (step !== 'benefit' || !who || who.eliminated) return []
        const choices: Choice[] = [
          {
            label: 'choice.shelterDraw',
            then: [{ type: 'DrawCards', investigator: who.id, amount: 1 }],
          },
          {
            label: 'choice.shelterResource',
            then: [{ type: 'GainResources', investigator: who.id, amount: 1 }],
          },
          ...(who.damage > 0
            ? [
                {
                  label: 'choice.shelterDamage',
                  then: [{ type: 'Heal' as const, investigator: who.id, damage: 1, horror: 0 }],
                },
              ]
            : []),
          ...(who.horror > 0
            ? [
                {
                  label: 'choice.shelterHorror',
                  then: [{ type: 'Heal' as const, investigator: who.id, damage: 0, horror: 1 }],
                },
              ]
            : []),
          { label: 'choice.skip', then: [] },
        ]
        return [
          {
            type: 'Ask',
            investigator: who.id,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.hiddenShelter',
              promptParams: { name: who.name },
              choices,
            },
          },
        ]
      },
    })
    return
  }
  if (code === STALK_PREY) {
    registerPlayerCard({
      code,
      canPlay: (s, by) => getInvestigator(s, by).location !== null,
      play: (s, by) => [
        { type: 'SearchTopEncounterForEnemy', investigator: by, top: 9 },
        continuation(code, by, 'after', { known: Object.keys(s.enemies).join(',') }),
      ],
      effect: (s, by, step, data) => {
        if (step === 'after') {
          const known = new Set(String(data.known).split(','))
          const drawn = Object.values(s.enemies).find((e) => !known.has(e.id))
          return [
            { type: 'DrawCards', investigator: by, amount: 1 },
            { type: 'DiscoverClues', investigator: by, amount: 1 },
            ...(drawn ? [continuation(code, by, 'move', { enemy: drawn.id })] : []),
          ]
        }
        const enemy = s.enemies[String(data.enemy)]
        if (step !== 'move' || !enemy || enemy.location === getInvestigator(s, by).location)
          return []
        const steps = stepsToward(s, by, enemy.location)
        return steps.length
          ? [
              {
                type: 'Ask',
                investigator: by,
                question: {
                  kind: 'chooseOne',
                  prompt: 'prompt.optional',
                  choices: [
                    ...steps.map((location): Choice => ({
                      label: 'choice.pilotMove',
                      params: {
                        name: getInvestigator(s, by).name,
                        location: getLocation(s, location).name,
                      },
                      target: { type: 'location', id: location },
                      then: [{ type: 'MoveTo', investigator: by, location }],
                    })),
                    { label: 'choice.skip', then: [] },
                  ],
                },
              },
            ]
          : []
      },
    })
    return
  }
  if (code === GUERRILLA_TACTICS_2) {
    registerGuerrillaTactics(code, 2, 1)
    return
  }
  throw new Error('Unreviewed Miguel card: ' + code)
}
