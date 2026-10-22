import { approvedDefinition } from './approved.mjs'

/**
 * Reviewed exception for ArkhamDB decklist 1179: original Jenny Barnes, her
 * original signatures (no parallel or replacement variants) and the three
 * standard cards of that list that were still missing.
 */
export function approvedJennyDefinitions(inventory, approvals) {
  return approvals.cards.map((approval) => {
    const c = inventory.cards.find((c) => c.code === approval.code)
    if (!c) throw new Error('Missing Jenny source: ' + approval.code)
    if (c.classification === 'standard-candidate') return approvedDefinition(c, approval)
    if (approval.status !== 'verified' || c.pack !== 'dwl')
      throw new Error('Unreviewed Jenny signature: ' + c.code)
    const d = {
      code: c.code,
      name: c.name,
      type: c.type,
      class: c.factions[0],
      traits: c.traits,
      deckLimit: c.deckLimit,
    }
    for (const k of ['health', 'sanity', 'cost'])
      if (c.numbers[k]?.kind === 'number') d[k] = c.numbers[k].value
    if (c.flags.is_unique) d.unique = true
    if (c.type === 'investigator') {
      const groups = c.deckbuilding.signatureGroups
      Object.assign(d, {
        skills: Object.fromEntries(
          ['willpower', 'intellect', 'combat', 'agility'].map((k) => [
            k,
            c.numbers['skill_' + k].value,
          ]),
        ),
        deckSize: c.deckbuilding.size,
        deckOptions: [{ classes: ['rogue', 'neutral'], maxLevel: 5 }],
        offClassLevelZeroLimit: 5,
        signatures: groups.map((g) => g.primary),
      })
    }
    if (c.type === 'asset') {
      // Cost X: the engine asks for X; the printed uses start at zero and take X.
      if (c.numbers.cost?.kind !== 'symbol' || approval.adapter !== 'reviewed-cost-x-v1')
        throw new Error('Unexpected Jenny asset cost: ' + c.code)
      Object.assign(d, {
        icons: Object.fromEntries(
          ['willpower', 'intellect', 'combat', 'agility', 'wild']
            .map((k) => [k, c.numbers['skill_' + k]])
            .filter(([, n]) => n?.kind === 'number' && n.value)
            .map(([k, n]) => [k, n.value]),
        ),
        slots: c.slots.slots,
        uses: approval.uses,
      })
    }
    if (c.type === 'treachery') d.weakness = c.subtype
    return d
  })
}
