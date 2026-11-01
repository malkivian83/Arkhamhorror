// RR: Play, Printed Cost, Search, Reveal Outside Tests, Then, Defeat, Clues.
import {
  registerPlayerCard,
  playerCardDef,
  playerCardBehavior,
  getInvestigator,
  getLocation,
  stuckInPlay,
  enemyBehavior,
  scenarioBehavior,
  type GameState,
  type Message,
  type Choice,
} from '@lcg/engine'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'
import { near, ownTurn, play, reaction, symbols } from './helpers'
const localAssets = (s: GameState, by: string) =>
  Object.values(s.assets).filter((a) => near(s, by).some((i) => i.id === a.owner))
const secretAssets = (s: GameState, by: string) =>
  localAssets(s, by).filter(
    (a) =>
      ['secret', 'secrets'].includes(playerCardDef(a.code)?.uses?.type ?? '') &&
      a.uses < (playerCardBehavior(a.code)?.maxUses ?? Infinity),
  )
const spellRelics = (s: GameState, by: string) =>
  localAssets(s, by).filter((a) =>
    playerCardDef(a.code)?.traits.some((t) => t === 'Spell' || t === 'Relic'),
  )
const allies = (s: GameState, by: string) =>
  Object.values(s.assets).filter(
    (a) => a.owner === by && playerCardDef(a.code)?.traits.includes('Ally') && !stuckInPlay(s, a),
  )
export function registerEvents(code: string): boolean {
  if (['04149', '10032'].includes(code)) {
    registerPlayerCard({
      code,
      canPlay: (s, by) => ownTurn(s, by) && (getInvestigator(s, by).actionsTaken ?? 0) === 0,
      play: (s, by) => [
        {
          type: 'Heal',
          investigator: by,
          damage:
            (code === '10032' ? 2 : 1) +
            (getInvestigator(s, by).drewTreacheryRound === s.round ? 1 : 0),
          horror: 0,
        },
        { type: 'DrawCards', investigator: by, amount: 1 },
      ],
    })
    return true
  }
  if (code === '01084') {
    registerPlayerCard({
      code,
      canPlay: () => false,
      playWhenFailing: true,
      play: (_s, by) => [
        { type: 'BoostSkillTest', amount: 2 },
        { type: 'DrawCards', investigator: by, amount: 1 },
      ],
    })
    return true
  }
  if (['03197', '60429'].includes(code)) {
    registerPlayerCard({
      code,
      canPlay: (s, by) => spellRelics(s, by).length > 0,
      play: (s, by) =>
        ask(
          by,
          spellRelics(s, by).map((a) => ({
            label: 'choice.recoveryTarget',
            params: { name: cardName(a.code) },
            target: { type: 'asset', id: a.id },
            then: [
              {
                type: 'RevealTokenOutsideTest',
                investigator: by,
                then: {
                  type: 'PlayerCardEffect',
                  code,
                  investigator: by,
                  step: 'recharge',
                  data: { asset: a.id },
                },
              },
            ],
          })),
          true,
        ),
      effect: (s, _by, step, data) => {
        if (step !== 'recharge') return []
        const a = s.assets[String(data.asset)]
        if (!a) return []
        const bad = symbols.includes(String(data.token))
        if (code === '03197' && bad) return [{ type: 'DiscardAsset', asset: a.id }]
        return ['charge', 'charges'].includes(playerCardDef(a.code)?.uses?.type ?? '')
          ? [{ type: 'AddUses', asset: a.id, amount: code === '03197' ? 3 : bad ? 1 : 4 }]
          : []
      },
    })
    return true
  }
  if (['08026', '60423'].includes(code)) {
    registerPlayerCard({
      code,
      handReactions: (s, t, by) => {
        if (t.type !== 'whenEnemyAttacks' || !near(s, by).some((i) => i.id === t.investigator))
          return []
        const e = s.enemies[t.enemy]
        if (!e || enemyBehavior(e.code)?.attacksCannotBeCanceled) return []
        const effect: Message[] =
          code === '08026'
            ? [
                {
                  type: 'BeginSkillTest',
                  investigator: by,
                  skill: 'agility',
                  difficulty: 1,
                  kind: {
                    type: 'effect',
                    source: cardName(code),
                    onSuccess: [{ type: 'DamageEnemy', enemy: e.id, amount: 1, by }],
                    onFail: [],
                    onFailEach: [],
                  },
                },
              ]
            : [
                {
                  type: 'RevealTokenOutsideTest',
                  investigator: by,
                  then: {
                    type: 'PlayerCardEffect',
                    code,
                    investigator: by,
                    step: 'gaze',
                    data: {
                      enemy: e.id,
                      damage:
                        e.damage +
                        (scenarioBehavior(s.scenarioId)?.enemyDamageModifier?.(s, e) ?? 0),
                      horror:
                        e.horror +
                        (scenarioBehavior(s.scenarioId)?.enemyHorrorModifier?.(s, e) ?? 0),
                    },
                  },
                },
              ]
        return [
          reaction(code, by, code, [
            play(code, by, [{ type: 'CancelEnemyAttack', enemy: e.id }, ...effect]),
          ]),
        ]
      },
      effect: (s, by, step, data) =>
        step === 'gaze' && symbols.includes(String(data.token)) && s.enemies[String(data.enemy)]
          ? ask(
              by,
              [
                ...new Set([Math.max(0, Number(data.damage)), Math.max(0, Number(data.horror))]),
              ].map((n) => ({
                label: 'choice.recoveryDamage',
                params: { n, enemy: s.enemies[String(data.enemy)]!.name },
                then: [{ type: 'DamageEnemy', enemy: String(data.enemy), amount: n, by }],
              })),
              true,
            )
          : [],
    })
    return true
  }
  if (code === '03158') {
    registerPlayerCard({
      code,
      canPlay: (s, by) => allies(s, by).length > 0,
      play: (s, by) =>
        ask(
          by,
          allies(s, by).map((a) => ({
            label: 'choice.recoveryReturn',
            params: { card: cardName(a.code) },
            then: [
              { type: 'ReturnAssetToHand', asset: a.id },
              {
                type: 'SearchDeck',
                investigator: by,
                top: 9,
                traits: ['Ally'],
                to: 'play',
                discount: playerCardDef(a.code)?.cost ?? 0,
                optional: true,
              },
            ],
          })),
          true,
        ),
    })
    return true
  }
  if (code === '05275') {
    registerPlayerCard({
      code,
      noAttacksOfOpportunity: true,
      play: (_s, by) => [
        { type: 'DiscoverClues', investigator: by, amount: 3 },
        continuation(code, by, 'share'),
      ],
      effect: (s, by, step) => {
        if (step !== 'share') return []
        const me = getInvestigator(s, by),
          finish: Message[] = [
            { type: 'SufferTrauma', investigator: by, mental: 1 },
            { type: 'DefeatInvestigator', investigator: by },
          ]
        const choices: Choice[] = []
        for (let n = 1; n <= me.clues; n++) {
          for (const i of s.investigators.filter((i) => !i.eliminated && i.id !== by))
            choices.push({
              label: 'choice.recoveryGive',
              params: { n, name: i.name },
              then: [
                {
                  type: 'MoveClues',
                  from: { type: 'investigator', id: by },
                  to: { type: 'investigator', id: i.id },
                  amount: n,
                },
                ...finish,
              ],
            })
          for (const l of Object.values(s.locations))
            choices.push({
              label: 'choice.recoveryLocation',
              params: { n, location: l.name },
              then: [
                {
                  type: 'MoveClues',
                  from: { type: 'investigator', id: by },
                  to: { type: 'location', id: l.id },
                  amount: n,
                },
                ...finish,
              ],
            })
        }
        return ask(by, [...choices, { label: 'choice.skip', then: finish }], true)
      },
    })
    return true
  }
  if (code === '53003') {
    registerPlayerCard({
      code,
      canPlay: (s, by) => secretAssets(s, by).length > 0,
      play: (s, by) => [
        continuation(code, by, 'secrets', {
          left:
            getInvestigator(s, by).location !== null &&
            getLocation(s, getInvestigator(s, by).location!).clues > 0
              ? 3
              : 2,
        }),
      ],
      effect: (s, by, step, data) =>
        step === 'secrets' && Number(data.left) > 0
          ? ask(
              by,
              secretAssets(s, by).map((a) => ({
                label: 'choice.recoveryTarget',
                params: { name: cardName(a.code) },
                target: { type: 'asset', id: a.id },
                then: [
                  { type: 'AddUses', asset: a.id, amount: 1 },
                  continuation(code, by, 'secrets', { left: Number(data.left) - 1 }),
                ],
              })),
              true,
            )
          : [],
    })
    return true
  }
  if (code === '09078') {
    const enemies = (s: GameState, by: string) =>
      Object.values(s.enemies).filter(
        (e) => e.location === getInvestigator(s, by).location && e.exhausted,
      )
    registerPlayerCard({
      code,
      canPlay: (s, by) => ownTurn(s, by) && enemies(s, by).length > 0,
      play: (s, by) => [
        continuation(code, by, 'clean', {
          remaining: JSON.stringify(enemies(s, by).map((e) => e.id)),
          used: '',
        }),
      ],
      effect: (s, by, step, data) => {
        if (step !== 'clean') return []
        const ids = (JSON.parse(String(data.remaining)) as string[]).filter((id) => s.enemies[id]),
          used = String(data.used)
        if (!ids.length || used.length >= 4) return []
        const choices: Choice[] = []
        for (const id of ids) {
          const e = s.enemies[id]!,
            next = (k: string) =>
              continuation(code, by, 'clean', {
                remaining: JSON.stringify(ids.filter((x) => x !== id)),
                used: used + k,
              })
          if (!used.includes('r'))
            choices.push({
              label: 'choice.recoveryCleanResources',
              params: { enemy: e.name },
              then: [{ type: 'GainResources', investigator: by, amount: 2 }, next('r')],
            })
          if (!used.includes('d'))
            choices.push({
              label: 'choice.recoveryCleanDamage',
              params: { enemy: e.name },
              then: [{ type: 'DamageEnemy', enemy: id, amount: 2, by }, next('d')],
            })
          if (!used.includes('c'))
            choices.push({
              label: 'choice.recoveryCleanClue',
              params: { enemy: e.name },
              then: [{ type: 'DiscoverClues', investigator: by, amount: 1 }, next('c')],
            })
          if (!used.includes('h'))
            choices.push({
              label: 'choice.recoveryCleanDraw',
              params: { enemy: e.name },
              then: [{ type: 'DrawCards', investigator: by, amount: 1 }, next('h')],
            })
        }
        return ask(by, choices, true)
      },
    })
    return true
  }
  return false
}
