// RR: Chaos Bag (outside skill tests), Cancel, Revelation, Seal, Bonded, Fight.
import {
  attackBlocked,
  enemiesAt,
  fightEnemies,
  getInvestigator,
  immuneToPlayerCards,
  playerCardDef,
  setAsideCards,
  type ChaosToken,
  type Choice,
  type GameState,
  type Message,
} from '@lcg/engine'
import {
  ask,
  cardName,
  continuation,
  event,
  here,
  nextToken,
  registerPlayerCard,
  startTokens,
  take,
  type Data,
} from './common'

const targets = (s: GameState, by: string) =>
  here(s, by)
    ? enemiesAt(s, here(s, by)!).filter(
        (e) =>
          !e.hasNoStats &&
          !immuneToPlayerCards(e) &&
          getInvestigator(s, by).etherealRound !== s.round,
      )
    : []
const faces = (d: Data) => JSON.parse(String(d.faces ?? '[]')) as ChaosToken[]
const afterTokens = (
  code: string,
  s: GameState,
  by: string,
  d: Data,
  seen: ChaosToken[],
): Message[] => {
  const back: Message = { type: 'ReturnHeldChaosTokens', group: String(d.group) }
  if (code === '07031')
    return [
      back,
      ...(seen.some((t) => t === 'bless' || t === 'elderSign')
        ? [
            {
              type: 'CancelEncounterDraw' as const,
              draw: String(d.draw),
              destination: 'discard' as const,
            },
          ]
        : []),
    ]
  if (code === '07155')
    return [
      back,
      continuation(code, by, 'damage', {
        left: 1 + seen.filter((t) => t === 'curse' || t === 'autoFail').length,
      }),
    ]
  if (!seen.some((t) => ['curse', 'autoFail', 'bless', 'elderSign'].includes(String(t))))
    return [back]
  return [
    back,
    continuation(code, by, 'reward', { harm: seen.some((t) => t === 'curse' || t === 'autoFail') }),
  ]
}

export function registerChaosEvents(code: string): boolean {
  if (code === '10105') {
    registerPlayerCard({
      code,
      canPlay: () => false,
      removeAfterPlay: true,
      handReactions: (s, t, by) => {
        if (t.type !== 'skillTestEnded' || !here(s, by) || here(s, by) !== here(s, t.investigator))
          return []
        const n = (face: ChaosToken) => t.revealedTokens?.filter((x) => x === face).length ?? 0
        const cards = [
          ...(n('curse') >= 2 ? ['10107'] : []),
          ...(n('bless') >= 2 ? ['10106'] : []),
        ].filter((c) => setAsideCards(s, by, c, true).length)
        return cards.length
          ? event(
              code,
              by,
              cards.map((c) => take(by, c, 'play')),
            )
          : []
      },
    })
    return true
  }
  if (code === '07031' || code === '07155' || code === '07162') {
    registerPlayerCard({
      code,
      ...(code === '07031'
        ? {
            canPlay: () => false,
            handReactions: (s: GameState, t: import('@lcg/engine').Trigger, by: string) => {
              if (t.type !== 'whenEncounterDrawn') return []
              const draw = s.queue.find(
                (m) => m.type === 'ResolveEncounterCard' && m.draw?.id === t.draw,
              )
              if (
                draw?.type !== 'ResolveEncounterCard' ||
                draw.card.kind !== 'treachery' ||
                playerCardDef(draw.card.code)?.weakness ||
                !s.chaosBag.length ||
                (draw.card.keywords.includes('peril') && draw.investigator !== by) ||
                !here(s, by) ||
                here(s, by) !== here(s, draw.investigator)
              )
                return []
              return event(code, by, [startTokens(code, by, { draw: t.draw })])
            },
          }
        : {
            noAttacksOfOpportunity: true,
            canPlay: (s: GameState, by: string) =>
              s.chaosBag.length > 0 && (code !== '07155' || targets(s, by).length > 0),
            play: (_s: GameState, by: string) => [startTokens(code, by)],
          }),
      effect: (s, by, step, d) => {
        if (step === 'damage') {
          const left = Number(d.left)
          return left > 0
            ? ask(
                by,
                targets(s, by).map((e) => ({
                  label: 'choice.enemy',
                  params: { enemy: e.name },
                  target: { type: 'enemy' as const, id: e.id },
                  then: [
                    { type: 'DamageEnemy' as const, by, enemy: e.id, amount: 1, source: { code } },
                    continuation(code, by, 'damage', { left: left - 1 }),
                  ],
                })),
                true,
              )
            : []
        }
        if (step === 'reward') {
          if (d.harm)
            return ask(
              by,
              targets(s, by).map((e) => ({
                label: 'choice.enemy',
                params: { enemy: e.name },
                target: { type: 'enemy' as const, id: e.id },
                then: [
                  { type: 'DamageEnemy' as const, by, enemy: e.id, amount: 2, source: { code } },
                ],
              })),
              true,
            )
          const choices: Choice[] = s.investigators
            .filter((i) => !i.eliminated && i.location === here(s, by) && i.damage > 0)
            .map((i) => ({
              label: 'choice.bonded.healDamage',
              params: { card: i.name },
              target: { type: 'investigator', id: i.id },
              then: [{ type: 'Heal', investigator: i.id, damage: 2, horror: 0, healer: by }],
            }))
          choices.push(
            ...Object.values(s.assets)
              .filter(
                (a) =>
                  a.damage > 0 &&
                  playerCardDef(a.code)?.traits.includes('Ally') &&
                  here(s, a.owner) === here(s, by),
              )
              .map((a) => ({
                label: 'choice.bonded.healDamage',
                params: { card: cardName(a.code) },
                target: { type: 'asset' as const, id: a.id },
                then: [
                  { type: 'HealAsset' as const, asset: a.id, damage: 2, horror: 0, healer: by },
                ],
              })),
          )
          return ask(by, choices, true)
        }
        const previous = faces(d)
        if (step === 'draw')
          return s.chaosBag.length
            ? [nextToken(code, by, d)]
            : afterTokens(code, s, by, d, previous)
        if (step !== 'token') return []
        const face = d.token as ChaosToken,
          seen = [...previous, face]
        const stored: Message = {
          type: 'StoreHeldChaosTokens',
          group: String(d.group),
          tokens: [
            d.physical as ChaosToken,
            ...(JSON.parse(String(d.ignored ?? '[]')) as ChaosToken[]),
          ],
        }
        const done =
          code === '07162'
            ? ['curse', 'autoFail', 'bless', 'elderSign'].includes(String(face))
            : seen.length >= (code === '07031' ? 5 : 7)
        return [
          stored,
          ...(done || !s.chaosBag.length
            ? afterTokens(code, s, by, d, seen)
            : [nextToken(code, by, { ...d, faces: JSON.stringify(seen) })]),
        ]
      },
    })
    return true
  }
  if (code === '07153') {
    const eligible = (s: GameState, by: string) =>
      fightEnemies(s, by).filter(
        (e) =>
          !attackBlocked(s, by, e, code) &&
          (e.engagedWith !== null || !e.keywords.includes('aloof')),
      )
    const holder = (by: string) => ({ type: 'event' as const, code, by })
    registerPlayerCard({
      code,
      fightAction: true,
      noAttacksOfOpportunity: true,
      canPlay: (s, by) => eligible(s, by).length > 0,
      play: (s, by) =>
        ask(
          by,
          eligible(s, by).map((e) => ({
            label: 'choice.enemy',
            params: { enemy: e.name },
            target: { type: 'enemy' as const, id: e.id },
            then: ask(
              by,
              (['combat', 'willpower'] as const).flatMap((skill) =>
                Array.from(
                  { length: 1 + Math.min(3, s.chaosBag.filter((t) => t === 'bless').length) },
                  (_, n) => ({
                    label:
                      skill === 'combat' ? 'choice.chaosSmiteCombat' : 'choice.chaosSmiteWillpower',
                    params: { n },
                    then: [
                      ...Array.from({ length: n }, (): Message => ({
                        type: 'SealToken',
                        investigator: by,
                        code,
                        token: 'bless',
                        holder: holder(by),
                      })),
                      {
                        type: 'BeginSkillTest' as const,
                        investigator: by,
                        skill,
                        modifier: n,
                        difficulty: e.fight,
                        kind: {
                          type: 'fight' as const,
                          enemy: e.id,
                          extraDamage: n,
                          onDefeat: [
                            {
                              type: 'ReleaseSealedTokens' as const,
                              holder: holder(by),
                              toPool: true,
                            },
                          ],
                        },
                        afterEnd: [{ type: 'ReleaseSealedTokens' as const, holder: holder(by) }],
                      },
                    ],
                  }),
                ),
              ),
              true,
            ),
          })),
          true,
        ),
    })
    return true
  }
  return false
}
