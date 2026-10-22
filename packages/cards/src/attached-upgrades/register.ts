import { playerCardDef, registerPlayerCard, type GameState } from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'

export function registerUpgrade(code: string, trait: string) {
  const targets = (s: GameState, by: string) =>
    Object.values(s.assets).filter(
      (a) => a.owner === by && playerCardDef(a.code)?.traits.includes(trait),
    )
  registerPlayerCard({
    code,
    ...(code === '04019'
      ? { attachedVitals: { health: 1, sanity: 1 } }
      : { attachedResolvingSkills: 1 }),
    // RR: Fast, Play Restrictions, Attach To. The host must be controlled by you.
    canPlay: (s, by) => s.activeTurn === by && targets(s, by).length > 0,
    play: (s, by) =>
      ask(
        by,
        targets(s, by).map((a) => ({
          label: 'choice.attachUpgrade',
          params: { card: playerCardDef(a.code)!.name },
          target: { type: 'asset', id: a.id },
          then: [{ type: 'AttachEventToAsset', asset: a.id, investigator: by, code, trait }],
        })),
      ),
  })
}
