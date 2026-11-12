// RR: Mythos 1.4, Replacement Effects, Additional Costs, Seal; A Watchful Peace (3).
import { registerPlayerCard } from '@lcg/engine'
import { cardName } from '../dunwich-pilot/effects'
import { returnBless, sealedBless } from '../sealed-tokens/cards'
const code = '07269'
registerPlayerCard({
  code,
  canPlay: () => false,
  handReactions: (s, t, by) =>
    t.type === 'whenMythosEncounterStepBegins' &&
    s.queue.some((m) => m.type === 'MythosEncounterStep') &&
    s.chaosBag.filter((token) => token === 'bless').length + sealedBless(s).length >= 5
      ? [
          {
            key: 'hand:' + code,
            investigator: by,
            label: 'ability.playCard',
            params: { card: cardName(code) },
            target: { type: 'hand', code },
            then: [
              {
                type: 'PlayCard',
                investigator: by,
                code,
                effect: [{ type: 'SkipMythosEncounterStep' }],
              },
            ],
          },
        ]
      : [],
  additionalPlayCosts: (s, by) => returnBless(s, by, code, 5),
  effect: (s, by, step, data) =>
    step === 'returnBless' ? returnBless(s, by, code, Number(data.left)) : [],
})
