/** Convert only explicitly reviewed records; importing an inventory never calls this. */
export function approvedDefinition(card, approval) {
  if (approval.code !== card.code || approval.status !== 'verified')
    throw new Error(`Card is not approved: ${card.code}`)
  if (card.modelIssues.length || card.factions.length !== 1 || card.slots.unknown.length)
    throw new Error(`Unsupported card model: ${card.code}`)
  if (
    card.classification !== 'standard-candidate' ||
    !['asset', 'event', 'skill'].includes(card.type)
  )
    throw new Error(`Unsupported pool eligibility: ${card.code}`)
  if (['permanent', 'exceptional', 'myriad', 'exile'].some((key) => card.flags[key]))
    throw new Error(`Keyword requires a dedicated adapter: ${card.code}`)
  const numeric = (key) => {
    const number = card.numbers[key]
    if (!number || number.kind === 'absent') return undefined
    if (number.kind !== 'number') throw new Error(`Unsupported ${key}: ${card.code}`)
    return number.value
  }
  const cost = numeric('cost'),
    health = numeric('health'),
    sanity = numeric('sanity')
  return {
    code: card.code,
    name: card.name,
    type: card.type,
    class: card.factions[0],
    traits: card.traits,
    ...(card.flags.is_unique ? { unique: true } : {}),
    ...(cost !== undefined ? { cost } : {}),
    xp: numeric('xp') ?? 0,
    icons: Object.fromEntries(
      ['willpower', 'intellect', 'combat', 'agility', 'wild']
        .map((key) => [key, numeric(`skill_${key}`)])
        .filter(([, value]) => value !== undefined && value !== 0),
    ),
    slots: card.slots.slots,
    ...(health !== undefined ? { health } : {}),
    ...(sanity !== undefined ? { sanity } : {}),
    ...(approval.uses ? { uses: approval.uses } : {}),
    ...(approval.fast ? { fast: true } : {}),
    ...(approval.commitLimit ? { commitLimit: approval.commitLimit } : {}),
  }
}
