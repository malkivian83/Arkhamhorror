import { distancesFrom, registerLocation, type AbilityOption, type Message } from '@lcg/engine'
import { effectTest } from '../scenario-helpers'
import {
  canPay,
  GATE,
  heartAction,
  heartAsk,
  heartMessage,
  meta,
  ownedSeals,
  SEALS,
  seals,
  sealSkill,
  type Seal,
} from './heart-common'
import { heartPlayers as perInvestigator } from './heart-common'

registerLocation({
  code: GATE,
  abilities: (s, _l, by) =>
    s.scenarioId.endsWith('part-1')
      ? [
          ...ownedSeals(s, by)
            .filter((t) => t.active)
            .map((t) =>
              heartAction(
                by,
                'placeSeal',
                [heartMessage('placeSeal', { investigator: by, seal: t.seal })],
                { seal: t.seal },
              ),
            ),
          {
            ...heartAction(by, 'resign', [{ type: 'Resign', investigator: by }]),
            label: 'ability.resign',
            provokes: false,
          },
        ]
      : [],
})

for (let n = 0; n < 5; n++) {
  const code = String(8664 + n).padStart(5, '0'),
    seal = SEALS[n]!
  registerLocation({
    code,
    onReveal: (s) =>
      meta(s, 'seal:' + seal) === undefined
        ? [heartMessage('putSeal', { seal, holder: 'l:' + code })]
        : [],
    abilities: (s, _l, by) => {
      const t = seals(s).find((t) => t.seal === seal && t.holder === 'l:' + code),
        cost = perInvestigator(s)
      if (!t || !canPay(s, by, cost, n === 4 ? 3 * cost : 0)) return []
      const pay = heartMessage('pay', {
        investigator: by,
        seal,
        next: 'acquire',
        clues: cost,
        resources: n === 4 ? 3 * cost : 0,
      })
      const then: Message[] =
        n < 4
          ? [
              effectTest(by, code, sealSkill[n]!, 2, {
                onSuccess: heartAsk(by, 'heartTakeSeal', [
                  { label: 'choice.edgeOfTheEarth.heartYes', then: [pay] },
                  { label: 'choice.skip', then: [] },
                ]),
              }),
            ]
          : [pay]
      return [heartAction(by, 'takeSeal', then, { seal })]
    },
  })
}
const activation: [string, Seal, (typeof sealSkill)[number] | null][] = [
  ['08650', 'a', 'combat'],
  ['08651', 'c', 'willpower'],
  ['08652', 'b', 'intellect'],
  ['08653', 'd', 'agility'],
  ['08654', 'e', null],
]
for (const [code, seal, skill] of activation)
  registerLocation({
    code,
    abilities: (s, _l, by) => {
      const t = ownedSeals(s, by).find((t) => t.seal === seal && !t.active),
        cost = perInvestigator(s)
      if (!t || !canPay(s, by, cost, 0, skill ? 0 : 2 * cost)) return []
      const pay = heartMessage('pay', {
        investigator: by,
        seal,
        next: 'activate',
        clues: cost,
        cards: skill ? 0 : 2 * cost,
        location: code,
      })
      return [
        heartAction(
          by,
          'activateSeal',
          skill
            ? [
                effectTest(by, code, skill, 3, {
                  onSuccess: heartAsk(by, 'heartActivateSeal', [
                    { label: 'choice.edgeOfTheEarth.heartYes', then: [pay] },
                    { label: 'choice.skip', then: [] },
                  ]),
                }),
              ]
            : [pay],
          { seal },
        ),
      ]
    },
  })
registerLocation({
  code: '08656',
  abilities: (s, self, by) =>
    Object.values(s.locations)
      .filter((l) => l.id !== self.id && l.id.startsWith('08656') && l.revealed)
      .map((l) => {
        const distance = distancesFrom(s, self.id).get(l.id)
        const option = heartAction(
          by,
          'corridor',
          [
            effectTest(by, '08656', 'agility', distance ?? 999, {
              onSuccess: [{ type: 'MoveTo', investigator: by, location: l.id }],
            }),
          ],
          { location: l.name },
          0,
        )
        return { ...option, key: self.id + ':corridor', limit: { per: 'round' } } as AbilityOption
      }),
})
for (const seal of SEALS)
  registerLocation({
    code: String(8674 + SEALS.indexOf(seal)).padStart(5, '0'),
    abilities: (s, self, by) =>
      ownedSeals(s, by).some((t) => t.seal === seal && t.active)
        ? [
            heartAction(
              by,
              'unleash',
              [heartMessage('unleash', { investigator: by, seal, location: self.id })],
              { seal },
              0,
            ),
          ]
        : [],
  })
