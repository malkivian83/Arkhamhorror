import { registerPlayerCard, type GameState } from '@lcg/engine'
import { CODEX_OF_AGES } from './codes'

const sealedHere = (state: GameState, id: string) =>
  (state.sealed ?? []).some((e) => e.holder?.type === 'asset' && e.holder.id === id)

// RR: Seal, Modifiers, Triggered Abilities. The Codex of Ages enters play with the
// [elder_sign] token sealed on it; +1 [willpower] while a token is sealed here. When you
// would reveal a chaos token from the bag, you may discard it to resolve that token instead.
registerPlayerCard({
  code: CODEX_OF_AGES,
  // RR Seal: the keyword is a cost; without the [elder_sign] in the bag it cannot be played.
  canPlay: (state) => state.chaosBag.includes('elderSign'),
  forced: (_state, trigger, self) =>
    trigger.type === 'afterAssetEntersPlay' && trigger.asset === self.id
      ? [
          {
            type: 'SealToken',
            investigator: self.owner,
            code: CODEX_OF_AGES,
            token: 'elderSign',
            holder: { type: 'asset', id: self.id },
          },
        ]
      : [],
  skillModifier: (state, self, test) =>
    test.skill === 'willpower' && sealedHere(state, self.id) ? 1 : 0,
  resolveSealedInstead: true,
})
