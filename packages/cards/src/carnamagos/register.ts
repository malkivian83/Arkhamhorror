import { resolvedFaces } from '../chaos-allies/common'
import { mayParticipate } from '../advanced-tests/common'
// RR: Bonded, Chaos Tokens, Attach To, Cannot, Enemy Defeat, End of Round.
import {
  immuneToPlayerCards,
  registerTreachery,
  setAsideCards,
  type Asset,
  type ChaosToken,
  type Choice,
  type GameState,
  type Message,
} from '@lcg/engine'
import {
  ask,
  cardName,
  continuation,
  fast,
  registerPlayerCard,
  startTokens,
  nextToken,
  type Data,
} from '../chaos-allies/common'

const ROTS = ['10086', '10087', '10088', '10089', '10090']
const available = (s: GameState, by: string) =>
  ROTS.filter((c) => setAsideCards(s, by, c, true).length)
const targets = (s: GameState) =>
  Object.values(s.enemies).filter((e) => !e.traits?.includes('Elite') && !immuneToPlayerCards(e))
const attach = (by: string, code: string, enemy: string): Message => ({
  type: 'AttachPlayerCardToEnemy',
  investigator: by,
  code,
  enemy,
  fromSetAside: true,
})
const options = (code: string, s: GameState, a: Asset) =>
  a.exhausted || s.chaosBag.length === 0 || !mayParticipate(s, a.owner)
    ? []
    : targets(s).map((e) => ({
        ...fast(
          a,
          [
            { type: 'ExhaustAsset', asset: a.id },
            startTokens(code, a.owner, { enemy: e.id, countsDuringTest: true }),
          ],
          e.id,
        ),
        label: 'ability.carnamagos',
        params: { card: cardName(code), enemy: e.name },
        target: { type: 'enemy' as const, id: e.id },
      }))
export function registerCarnamagos(code: string): void {
  if (ROTS.includes(code)) {
    registerPlayerCard({ code, canPlay: () => false })
    registerTreachery({
      code,
      revelation: () => [],
      setAsideWhenEnemyLeaves: true,
      ...(code === '10086' ? { attachedEnemyCannotAttack: true } : {}),
      ...(code === '10088' ? { attachedEnemy: { fight: -1, evade: -1 } } : {}),
      ...(code === '10090' ? { attachedEnemyCannotMove: true } : {}),
      ...(code === '10087'
        ? {
            whenAttachedEnemyDefeated: (_s, self, enemy) =>
              self.owner
                ? ([
                    {
                      type: 'GainResources',
                      investigator: self.owner,
                      amount: Math.min(5, enemy.health),
                    },
                  ] as Message[])
                : [],
          }
        : {}),
      ...(code === '10089'
        ? {
            forced: (s, t, self) => {
              if (
                t.type !== 'roundEnds' ||
                self.placement.type !== 'enemy' ||
                !s.enemies[self.placement.enemy]
              )
                return []
              return [
                {
                  type: 'DamageEnemy',
                  enemy: self.placement.enemy,
                  amount: 1,
                  by: self.owner,
                  source: { code },
                },
              ] as Message[]
            },
          }
        : {}),
    })
    return
  }
  if (!['10085', '10098'].includes(code)) throw Error('Unknown Carnamagos card ' + code)
  registerPlayerCard({
    code,
    abilities: (s, a, by) => (by === a.owner ? options(code, s, a) : []),
    fastOptions: (s, a) => options(code, s, a).map((o) => ({ ...o, investigator: a.owner })),
    effect: (s, by, step, d: Data): Message[] => {
      if (step === 'draw')
        return s.chaosBag.length
          ? [nextToken(code, by, d)]
          : [{ type: 'ReturnHeldChaosTokens', group: String(d.group) }]
      if (step === 'token') {
        const seen = [
          ...(JSON.parse(String(d.faces)) as (ChaosToken | null)[]),
          ...resolvedFaces(d),
        ]
        const next = {
          draws: Number(d.draws ?? 0) + 1,
          enemy: d.enemy!,
          countsDuringTest: true,
          group: d.group!,
          faces: JSON.stringify(seen),
        }
        return [
          ...(Number(d.draws ?? 0) + 1 < 5 && s.chaosBag.length > 0
            ? [nextToken(code, by, next)]
            : [
                { type: 'ReturnHeldChaosTokens' as const, group: String(d.group) },
                continuation(code, by, 'rot', {
                  enemy: String(d.enemy),
                  left:
                    code === '10085'
                      ? Number(seen.includes('curse'))
                      : seen.filter((t) => t === 'curse').length,
                }),
              ]),
        ]
      }
      if (step !== 'rot' || !Number(d.left) || !targets(s).some((e) => e.id === d.enemy)) return []
      const cards = available(s, by)
      if (!cards.length) return []
      if (code === '10085')
        return [
          { type: 'RandomChoice', choices: cards.map((c) => [attach(by, c, String(d.enemy))]) },
        ]
      const choices: Choice[] = cards.map((c) => ({
        label: 'choice.card',
        params: { card: cardName(c) },
        target: { type: 'hand', code: c },
        then: [
          attach(by, c, String(d.enemy)),
          continuation(code, by, 'rot', { enemy: String(d.enemy), left: Number(d.left) - 1 }),
        ],
      }))
      return ask(by, [...choices, { label: 'choice.done', then: [] }], true)
    },
  })
}
