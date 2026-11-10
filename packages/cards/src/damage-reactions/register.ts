// RR: Enemy Attacks, Damage and Horror, Defeat, Triggered Abilities.
import {
  assetVitals,
  enemiesAt,
  findEnemy,
  getInvestigator,
  immuneToPlayerCards,
  registerPlayerCard,
  scenarioBehavior,
  stuckInPlay,
  type Message,
} from '@lcg/engine'
import { cardName } from '../dunwich-pilot/effects'

export function registerAquinnah(code: string, mayRedirectToAttacker: boolean): void {
  registerPlayerCard({
    code,
    reactions: (s, t, asset) => {
      if (
        t.type !== 'whenEnemyAttacks' ||
        t.investigator !== asset.owner ||
        asset.exhausted ||
        asset.horror >= (assetVitals(asset, s).sanity ?? 0) ||
        s.canceledAttack === t.enemy
      )
        return []
      const attacker = findEnemy(s, t.enemy) ?? s.attackSourcesWithoutLocation?.[t.enemy]
      const location = getInvestigator(s, asset.owner).location
      const attack = s.queue.find(
        (m): m is Extract<Message, { type: 'ResolveEnemyAttack' }> =>
          m.type === 'ResolveEnemyAttack' && m.enemy === t.enemy && m.investigator === asset.owner,
      )
      if (
        !attacker ||
        location === null ||
        !attack ||
        attack.redirectDamage ||
        (attack.damageTo && attack.damageTo !== asset.owner) ||
        attacker.damage +
          (attack.modifier?.damage ?? 0) +
          (scenarioBehavior(s.scenarioId)?.enemyDamageModifier?.(s, attacker) ?? 0) <=
          0
      )
        return []
      return enemiesAt(s, location)
        .filter(
          (enemy) =>
            !enemy.hasNoStats &&
            !immuneToPlayerCards(enemy) &&
            (mayRedirectToAttacker || enemy.id !== attacker.id),
        )
        .map((enemy) => ({
          key: asset.id,
          investigator: asset.owner,
          label: 'ability.aquinnahRedirect',
          params: { card: cardName(code), enemy: enemy.name },
          target: { type: 'enemy', id: enemy.id },
          then: [
            { type: 'ExhaustAsset', asset: asset.id },
            { type: 'DamageAsset', asset: asset.id, damage: 0, horror: 1 },
            {
              type: 'RedirectAttackDamageToEnemy',
              attacker: attacker.id,
              target: enemy.id,
              investigator: asset.owner,
              card: code,
            },
          ],
        }))
    },
  })
}

export function registerStHubertsKey(code: string): void {
  registerPlayerCard({
    code,
    ownerVitals: { sanity: -2 },
    skillModifier: (_s, _asset, t) => (t.skill === 'willpower' || t.skill === 'intellect' ? 1 : 0),
    reactions: (s, t, asset) =>
      t.type === 'whenWouldBeDefeated' &&
      t.investigator === asset.owner &&
      t.byHorror &&
      !stuckInPlay(s, asset)
        ? [
            {
              key: asset.id,
              investigator: asset.owner,
              label: 'ability.hubertKey',
              params: { card: cardName(code) },
              target: { type: 'asset', id: asset.id },
              then: [
                { type: 'DiscardAsset', asset: asset.id },
                { type: 'Heal', investigator: asset.owner, damage: 0, horror: 2 },
              ],
            },
          ]
        : [],
  })
}

export function registerArmorOfArdennes(code: string): void {
  registerPlayerCard({
    code,
    reactions: (_s, t, asset) =>
      t.type === 'whenDamageAssignedToAsset' && t.asset === asset.id && !asset.exhausted
        ? [
            {
              key: asset.id,
              investigator: asset.owner,
              label: 'ability.ardennesArmor',
              params: { card: cardName(code) },
              target: { type: 'asset', id: asset.id },
              then: [
                { type: 'ExhaustAsset', asset: asset.id },
                { type: 'CancelAssignedAssetDamage', asset: asset.id },
              ],
            },
          ]
        : [],
  })
}
