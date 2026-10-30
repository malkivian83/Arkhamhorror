import { playerCardDef, registerPlayerCard, type Message } from '@lcg/engine'
// RR: Fast; ST.6 "when you would succeed". Daring Maneuver: +2 skill value for this test
// (level 2: +3 and draw 1 card). Played from hand in the window before success is confirmed.
export function registerDaringManeuver(code: string, amount: number, draw: boolean): void {
  registerPlayerCard({
    code,
    canPlay: () => false,
    handReactions: (state, trigger, investigator) =>
      trigger.type === 'whenWouldSucceed' &&
      trigger.investigator === investigator &&
      state.skillTest?.investigator === investigator
        ? [
            {
              key: 'hand:' + code,
              investigator,
              label: 'ability.playCard',
              params: { card: playerCardDef(code)!.name },
              target: { type: 'hand', code },
              then: [
                {
                  type: 'PlayCard',
                  investigator,
                  code,
                  effect: [
                    { type: 'BoostSkillTest', amount },
                    ...(draw ? [{ type: 'DrawCards', investigator, amount: 1 } as Message] : []),
                  ],
                },
              ],
            },
          ]
        : [],
  })
}
