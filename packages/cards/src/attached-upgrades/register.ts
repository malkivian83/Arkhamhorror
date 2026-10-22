import {
  playerCardDef,
  registerPlayerCard,
  type GameState,
  type Message,
  type PlayerCardBehavior,
} from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'

interface UpgradeOptions {
  behavior?: Pick<
    PlayerCardBehavior,
    | 'attachedVitals'
    | 'attachedResolvingSkills'
    | 'attachedAttackSkill'
    | 'attachedMonsterDamage'
    | 'attachedAbilities'
    | 'attachedSlotReduction'
    | 'afterHostDiscarded'
    | 'afterHostExhausted'
    | 'effect'
  >
  /** Host controlled by any investigator at your location instead of by you. */
  atLocation?: boolean
  limitPerAsset?: boolean
  /** Ammo placed on the host after attaching. */
  ammo?: number
}

export function registerUpgrade(
  code: string,
  traits: string | string[],
  options: UpgradeOptions = {},
) {
  const allowed = [traits].flat()
  const hostTrait = (assetCode: string) =>
    allowed.find((t) => playerCardDef(assetCode)?.traits.includes(t))
  const { atLocation = false, limitPerAsset = false, ammo = 0 } = options
  const targets = (s: GameState, by: string) => {
    const here = s.investigators.find((i) => i.id === by)?.location ?? null
    return Object.values(s.assets).filter((a) => {
      const controller = s.investigators.find((i) => i.id === a.owner)
      return (
        controller &&
        (atLocation
          ? !controller.eliminated && here !== null && controller.location === here
          : a.owner === by) &&
        !(limitPerAsset && a.upgrades?.some((u) => u.code === code)) &&
        hostTrait(a.code) !== undefined
      )
    })
  }
  registerPlayerCard({
    code,
    ...(options.behavior ?? {}),
    // RR: Fast, Play Restrictions, Attach To. By default the host must be controlled by you.
    canPlay: (s, by) => s.activeTurn === by && targets(s, by).length > 0,
    play: (s, by) =>
      ask(
        by,
        targets(s, by).map((a) => ({
          label: 'choice.attachUpgrade',
          params: { card: playerCardDef(a.code)!.name },
          target: { type: 'asset', id: a.id },
          then: [
            {
              type: 'AttachEventToAsset',
              asset: a.id,
              investigator: by,
              code,
              trait: hostTrait(a.code)!,
              ...(atLocation ? { atLocation } : {}),
              ...(limitPerAsset ? { limitPerAsset } : {}),
            },
            // RR: Uses. Tokens of another type would not be spendable by the host.
            ...(ammo && playerCardDef(a.code)?.uses?.type === 'ammo'
              ? [{ type: 'AddUses', asset: a.id, amount: ammo } as Message]
              : []),
          ],
        })),
      ),
  })
}
