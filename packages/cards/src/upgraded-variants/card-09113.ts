// RR: Fight; Chaos Tokens (ST.4); "either (choose one)" resolved once per attack.
import { playerCardDef } from '@lcg/engine'
import { registerBasicAsset } from '../basic-abilities/register'
const code = '09113'
registerBasicAsset(code, [{ action: 'fight', modifier: 2, extraDamage: 1 }], () => ({
  onTokenRevealed: (s, token, self) => {
    const use = self.id + ':bat'
    if (!['skull', 'autoFail'].includes(String(token)) || s.skillTest?.abilityCounts?.[use])
      return []
    const card = playerCardDef(code)!.name
    return [
      {
        type: 'Ask',
        investigator: self.owner,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseEffect',
          choices: [
            {
              label: 'choice.returnToHand',
              params: { card },
              then: [
                {
                  type: 'ModifySkillTest',
                  use,
                  after: [{ type: 'ReturnAssetToHand', asset: self.id }],
                },
              ],
            },
            {
              label: 'choice.discardForDamage',
              params: { card },
              then: [
                {
                  type: 'ModifySkillTest',
                  use,
                  extraDamage: 1,
                  after: [{ type: 'DiscardAsset', asset: self.id }],
                },
              ],
            },
          ],
        },
      },
    ]
  },
}))
