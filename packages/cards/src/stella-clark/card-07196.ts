import { registerPlayerCard, type ChaosToken, type GameState } from '@lcg/engine'
import { continuation } from '../dunwich-pilot/effects'
import { UNRELENTING } from './codes'

const DRAWS: ChaosToken[] = [1, 0, 'elderSign']
const sealedHere = (state: GameState, by: string) =>
  (state.sealed ?? []).filter(
    (e) => e.holder?.type === 'committed' && e.holder.code === UNRELENTING && e.holder.by === by,
  )

// RR: Seal, Max 1 committed per test. Unrelenting (1): after you commit it, search the chaos
// bag for up to 3 non-[auto_fail] tokens of your choice and seal them on it. If all 3 sealed
// tokens are "+1", "0", [bless] and/or [elder_sign], draw 2 cards. Release them after this test
// ends (the engine has no [bless] tokens yet).
registerPlayerCard({
  code: UNRELENTING,
  onCommit: (_state, by) => [continuation(UNRELENTING, by, 'seal', { left: 3 })],
  effect: (state, by, step, data) => {
    const left = Number(data.left)
    const sealed = sealedHere(state, by)
    const done =
      sealed.length === 3 && sealed.every((e) => DRAWS.includes(e.token))
        ? [{ type: 'DrawCards' as const, investigator: by, amount: 2 }]
        : []
    if (step !== 'seal') return []
    const faces = [...new Set(state.chaosBag.filter((t) => t !== 'autoFail'))]
    if (left < 1 || faces.length === 0 || !state.skillTest) return done
    return [
      {
        type: 'Ask',
        investigator: by,
        question: {
          kind: 'chooseOne',
          alwaysAsk: true,
          prompt: 'prompt.unrelenting',
          promptParams: { n: left },
          choices: [
            ...faces.map((token) => ({
              label: 'choice.sealToken',
              params: { token: String(token) },
              then: [
                {
                  type: 'SealToken' as const,
                  investigator: by,
                  code: UNRELENTING,
                  token,
                  holder: { type: 'committed' as const, code: UNRELENTING, by },
                },
                continuation(UNRELENTING, by, 'seal', { left: left - 1 }),
              ],
            })),
            { label: 'choice.doneSealing', then: done },
          ],
        },
      },
    ]
  },
})
