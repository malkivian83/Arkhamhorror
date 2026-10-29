import { approvedDefinition } from './approved.mjs'
/** Convert only the explicitly approved codes; frozen inventories and other batches stay intact. */
export function buildStarterDefinitions(inventory, source, approvals) {
  return approvals.cards.map((approval) => {
    if (approval.status !== 'verified') throw new Error('Unreviewed starter card: ' + approval.code)
    const raw = source.find((c) => c.code === approval.code)
    const card = inventory.find((c) => c.code === approval.code)
    if (!raw || !card || card.modelIssues.length)
      throw new Error('Unsupported starter card: ' + approval.code)
    const numeric = (key) => card.numbers[key]?.value
    if (card.classification === 'standard-candidate' && !raw.permanent) {
      const uses = raw.text?.match(/Uses \((\d+) (\w+)\)/)
      return {
        ...(raw.subname ? { subname: raw.subname } : {}),
        ...approvedDefinition(card, {
          ...approval,
          ...(uses ? { uses: { count: Number(uses[1]), type: uses[2] } } : {}),
          ...(raw.text?.startsWith('Fast.') ? { fast: true } : {}),
        }),
        ...(raw.deck_limit === 1 ? { deckLimit: 1 } : {}),
      }
    }
    // Primary signatures and investigators need the reviewed deckbuilding/weakness adapter.
    const basic = {
      ...(raw.subname ? { subname: raw.subname } : {}),
      code: card.code,
      name: card.name,
      type: card.type,
      class: card.factions[0],
      traits: card.traits,
      deckLimit: card.deckLimit,
      ...(card.flags.is_unique ? { unique: true } : {}),
      ...(card.subtype ? { weakness: card.subtype } : {}),
    }
    if (card.type === 'investigator')
      return {
        ...basic,
        health: numeric('health'),
        sanity: numeric('sanity'),
        skills: Object.fromEntries(
          ['willpower', 'intellect', 'combat', 'agility'].map((k) => [k, numeric('skill_' + k)]),
        ),
        deckSize: 30,
        deckOptions: card.deckbuilding.simpleOptions,
        signatures: card.deckbuilding.signatureGroups.map((g) => g.primary),
      }
    return {
      ...basic,
      ...(numeric('cost') !== undefined ? { cost: numeric('cost') } : {}),
      xp: numeric('xp') ?? 0,
      icons: Object.fromEntries(
        ['willpower', 'intellect', 'combat', 'agility', 'wild']
          .filter((k) => numeric('skill_' + k))
          .map((k) => [k, numeric('skill_' + k)]),
      ),
      slots: card.slots.slots,
      ...(numeric('health') !== undefined ? { health: numeric('health') } : {}),
      ...(numeric('sanity') !== undefined ? { sanity: numeric('sanity') } : {}),
    }
  })
}
