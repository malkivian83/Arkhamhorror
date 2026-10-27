import { getInvestigator, registerTreachery } from '@lcg/engine'
import { effectTest } from '../scenario-helpers'
import { horrorInPlay, museumSpecific } from './museum-helpers'
import { M } from './museum-codes'
registerTreachery({
  code: M.passage,
  revelation: (s, investigator) => [
    effectTest(
      investigator,
      'Passage into the Veil',
      'willpower',
      horrorInPlay(s)?.location === getInvestigator(s, investigator).location ? 5 : 3,
      {
        onFail: [
          {
            type: 'Ask',
            investigator,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.museum.passage',
              choices: [
                {
                  label: 'choice.museum.mill',
                  then: [{ type: 'MillDeck', investigator, amount: 5 }],
                },
                {
                  label: 'choice.museum.damage',
                  then: [
                    { type: 'TakeDamage', investigator, damage: 1, horror: 0, direct: true },
                    museumSpecific('museumAlliesDamage', { investigator }),
                  ],
                },
              ],
            },
          },
        ],
      },
    ),
  ],
})
