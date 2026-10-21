import {
  availableAbilities,
  playerCardDef,
  registerPlayerCard,
  registerTreachery,
} from '@lcg/engine'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard, starterDeckList, validateDeck } from '../decks'
import { game, me, hand, patch, withAsset } from '../dunwich-pilot/testing'
import approvals from './approvals.json'
const zero = { willpower: 0, intellect: 0, combat: 0, agility: 0 }
registerTreachery({
  code: 'combat-attachment',
  revelation: () => [],
  attachedEnemy: { health: 1, loses: ['retaliate'] },
})
registerPlayerCard({
  code: 'ammo-refund-observer',
  reactions: (s, t, a) =>
    t.type === 'whenEnemyAttacks' && t.investigator === a.owner && s.assets['60505']?.uses === 2
      ? [
          {
            key: a.id + ':refund',
            investigator: a.owner,
            label: 'ability.gainResource',
            then: [{ type: 'GainResources', investigator: a.owner, amount: 1 }],
          },
        ]
      : [],
})
export function verifyCombatTool(code: string): void {
  const entry = approvals.cards.find((c) => c.code === code)!,
    family = entry.family
  describe(code + ' / ' + family, () => {
    it('uses its own combat value, damage, uses and action cost', () => {
      const def = playerCardDef(code)!
      let s = during(
        game(['a', 'b']),
        (s) =>
          withAsset(
            patch({ hand: [], skills: { ...zero, combat: family === 'bow' ? 0 : 7, agility: 7 } })(
              s,
            ),
            code,
          ),
        spawnAt(
          'A',
          { ...ghoul, fight: 5, health: family === 'garrote' ? 1 : 10 },
          family === 'springfield' ? 'b' : 'a',
        ),
      )
      s = choose(
        s,
        family === 'bar' ? 'ability.combatAmmo' : 'ability.fightWith',
        family === 'bar' ? { n: 3 } : {},
      )
      if (family === 'garrote') {
        expect(Object.values(s.enemies)).toHaveLength(0)
        expect(s.assets[code]!.exhausted).toBe(true)
      } else
        expect(Object.values(s.enemies)[0]!.damageTaken).toBe(
          ['springfield', 'bow', 'bar'].includes(family) ? 3 : 2,
        )
      expect(s.assets[code]!.uses).toBe(
        (def.uses?.count ?? 0) - (def.uses ? (family === 'bar' ? 3 : 1) : 0),
      )
      expect(me(s).actionsRemaining).toBe(family === 'garrote' ? 3 : 2)
      expect(me(s).damage + me(s).horror).toBe(0)
    })
    it('pays the printed cost and enters play with the printed uses', () => {
      const def = playerCardDef(code)!,
        s = choose(hand(game(), code), 'action.play', { card: def.name })
      expect(Object.values(s.assets).find((a) => a.code === code)!.uses).toBe(def.uses?.count ?? 0)
      expect(me(s).resources).toBe(10 - def.cost!)
      expect(me(s).actionsRemaining).toBe(2)
    })
    if ('uses' in entry)
      it('does not offer an attack with no ammunition', () => {
        const s = during(
          game(['a', 'b']),
          (s) => withAsset(s, code, { uses: 0 }),
          spawnAt('A', { ...ghoul, health: 10 }, 'b'),
        )
        expect(
          availableAbilities(s, 'a').some(
            (a) => a.label === 'ability.fightWith' || a.label === 'ability.combatAmmo',
          ),
        ).toBe(false)
      })
    if (family === 'safe-pistol')
      it('ignores retaliation for its own attack but not a later basic attack', () => {
        let s = during(
          game(),
          (s) => withAsset(patch({ hand: [], skills: zero })(s), code),
          spawnAt('A', { ...ghoul, fight: 6, health: 10, keywords: ['retaliate'] }, 'a'),
        )
        s = choose(s, 'ability.fightWith')
        expect(me(s).damage).toBe(0)
        s = choose(s, 'action.fight')
        expect(me(s).damage).toBe(1)
        expect(me(s).horror).toBe(1)
      })
    if (family === 'springfield') {
      it('excludes enemies engaged with its controller, including ready Massive enemies', () => {
        const normal = during(game(), (s) => withAsset(s, code), spawnAt('A', ghoul, 'a'))
        expect(availableAbilities(normal, 'a').some((a) => a.label === 'ability.fightWith')).toBe(
          false,
        )
        const massive = during(
          game(),
          (s) => withAsset(s, code),
          spawnAt('A', { ...ghoul, keywords: ['massive'] }),
        )
        expect(availableAbilities(massive, 'a').some((a) => a.label === 'ability.fightWith')).toBe(
          false,
        )
      })
      it('deals its attack damage to the other investigator on failure', () => {
        let s = during(
          game(['a', 'b']),
          (s) => withAsset(patch({ hand: [], skills: zero })(s), code),
          spawnAt('A', { ...ghoul, fight: 5, health: 10 }, 'b'),
        )
        s = choose(s, 'ability.fightWith')
        expect(s.investigators[1]!.damage).toBe(3)
      })
    }
    if (family === 'bow')
      it('reloads as an action that provokes and cannot exceed one ammunition', () => {
        let s = during(
          game(),
          (s) => withAsset(patch({ hand: [] })(s), code),
          spawnAt('A', { ...ghoul, health: 10 }, 'a'),
        )
        s = choose(s, 'ability.fightWith')
        expect(s.assets[code]!.uses).toBe(0)
        s = choose(s, 'ability.combatReload')
        expect(s.assets[code]!.uses).toBe(1)
        expect(me(s).actionsRemaining).toBe(1)
        expect(me(s).damage + me(s).horror).toBe(2)
        expect(availableAbilities(s, 'a').some((a) => a.label === 'ability.combatReload')).toBe(
          false,
        )
        s = during(s, (s) => s, { type: 'AddUses', asset: code, amount: 10 })
        expect(s.assets[code]!.uses).toBe(1)
      })
    if (family === 'bar')
      it('spends one to five ammunition with matching combat and damage', () => {
        let s = during(
          game(),
          (s) => withAsset(patch({ hand: [], skills: zero })(s), code),
          spawnAt('A', { ...ghoul, fight: 5, health: 20 }, 'a'),
        )
        const initial = availableAbilities(s, 'a').filter((a) => a.label === 'ability.combatAmmo')
        expect(initial.map((a) => a.params?.n)).toEqual([1, 2, 3, 4, 5])
        s = choose(s, 'ability.combatAmmo', { n: 5 })
        expect(Object.values(s.enemies)[0]!.damageTaken).toBe(5)
        expect(s.assets[code]!.uses).toBe(3)
        expect(
          availableAbilities(s, 'a')
            .filter((a) => a.label === 'ability.combatAmmo')
            .map((a) => a.params?.n),
        ).toEqual([1, 2, 3])
      })
    if (family === 'derringer')
      it('refunds a failed attack before retaliation and not a successful one', () => {
        let s = during(
          game(),
          (s) =>
            withAsset(
              withAsset(patch({ hand: [], skills: zero })(s), code),
              'ammo-refund-observer',
            ),
          spawnAt('A', { ...ghoul, fight: 6, health: 10, keywords: ['retaliate'] }, 'a'),
        )
        s = choose(s, 'ability.fightWith')
        s = choose(s, 'ability.gainResource')
        expect(s.assets[code]!.uses).toBe(2)
        expect(me(s).resources).toBe(6)
        expect(me(s).damage).toBe(1)
      })
    if (family === 'knuckles') {
      it('grants retaliation only for this attack and does not duplicate a printed keyword', () => {
        let s = during(
          game(),
          (s) => withAsset(patch({ hand: [], skills: zero })(s), code),
          spawnAt('A', { ...ghoul, fight: 6, health: 10 }, 'a'),
        )
        s = choose(s, 'ability.fightWith')
        expect(me(s).damage).toBe(1)
        expect(Object.values(s.enemies)[0]!.keywords).not.toContain('retaliate')
        s = choose(s, 'action.fight')
        expect(me(s).damage).toBe(1)
        let printed = during(
          game(),
          (s) => withAsset(patch({ hand: [], skills: zero })(s), code),
          spawnAt('A', { ...ghoul, fight: 6, health: 10, keywords: ['retaliate'] }, 'a'),
        )
        printed = choose(printed, 'ability.fightWith')
        expect(me(printed).damage).toBe(1)
      })
      it('respects effects that remove retaliation', () => {
        let s = during(
          game(),
          (s) => withAsset(patch({ hand: [], skills: zero })(s), code),
          spawnAt('A', { ...ghoul, fight: 6, health: 10 }, 'a'),
        )
        const enemy = Object.values(s.enemies)[0]!
        s = during(s, (s) => ({
          ...s,
          treacheries: {
            ...s.treacheries,
            attached: {
              id: 'attached',
              kind: 'treachery',
              code: 'combat-attachment',
              name: 'Synthetic attachment',
              keywords: [],
              placement: { type: 'enemy', enemy: enemy.id },
            },
          },
        }))
        s = choose(s, 'ability.fightWith')
        expect(me(s).damage + me(s).horror).toBe(0)
      })
    }
    if (family === 'garrote')
      it('checks remaining health including attached modifiers, exhaustion and active turn', () => {
        let s = during(
          game(['a', 'b']),
          (s) => withAsset(s, code),
          spawnAt('A', { ...ghoul, health: 1 }, 'a'),
        )
        const enemy = Object.values(s.enemies)[0]!
        s = during(s, (s) => ({
          ...s,
          treacheries: {
            ...s.treacheries,
            attached: {
              id: 'attached',
              kind: 'treachery',
              code: 'combat-attachment',
              name: 'Synthetic attachment',
              keywords: [],
              placement: { type: 'enemy', enemy: enemy.id },
            },
          },
        }))
        expect(availableAbilities(s, 'a').some((a) => a.label === 'ability.fightWith')).toBe(false)
        s = during(s, (s) => ({
          ...s,
          enemies: { ...s.enemies, [enemy.id]: { ...s.enemies[enemy.id]!, damageTaken: 1 } },
        }))
        expect(availableAbilities(s, 'a').some((a) => a.label === 'ability.fightWith')).toBe(true)
        expect(
          availableAbilities({ ...s, activeTurn: 'b' }, 'a').some(
            (a) => a.label === 'ability.fightWith',
          ),
        ).toBe(false)
        expect(
          availableAbilities(
            { ...s, assets: { ...s.assets, [code]: { ...s.assets[code]!, exhausted: true } } },
            'a',
          ).some((a) => a.label === 'ability.fightWith'),
        ).toBe(false)
      })
    it('enters a legal deck or experience purchase and survives real scenario setup', () => {
      const def = playerCardDef(code)!,
        investigator =
          def.class === 'guardian'
            ? 'daniela'
            : def.class === 'rogue'
              ? 'trish'
              : def.class === 'mystic'
                ? 'dexter'
                : def.class === 'survivor'
                  ? 'isabelle'
                  : 'joe'
      let campaign
      if ((def.xp ?? 0) > 0) {
        campaign = newCampaign('brethren-of-ash', [investigator], 'easy')
        const id = campaign.investigators[0]!.id
        campaign.log.investigators[id]!.xp = def.xp!
        const option = purchaseOptions(campaign, id).find((o) => o.code === code)!
        expect(option).toBeDefined()
        const remove = campaign.investigators[0]!.deck.find(isStandard)!
        campaign = purchase(campaign, id, code, option.replaces ? { upgrade: true } : { remove })
        expect(campaign.log.investigators[id]!.xp).toBe(0)
      } else {
        const deck = starterDeckList(investigator, 'classic', 'Classic'),
          same = deck.cards.findIndex((c) => playerCardDef(c)?.name === def.name)
        deck.cards.splice(same >= 0 ? same : deck.cards.findIndex(isStandard), 1, code)
        expect(validateDeck(deck).problems).toEqual([])
        campaign = newCampaign(
          'brethren-of-ash',
          [{ investigator: deck.investigator, cards: deck.cards }],
          'easy',
        )
      }
      const i = startScenario(campaign, 3, false).investigators[0]!
      expect([...i.hand, ...i.deck, ...i.discard]).toContain(code)
    })
  })
}
