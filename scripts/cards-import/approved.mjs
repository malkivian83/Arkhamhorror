/** Convert only explicitly reviewed records; importing an inventory never calls this. */
export function approvedDefinition(card, approval) {
  if (approval.code !== card.code || approval.status !== 'verified')
    throw new Error(`Card is not approved: ${card.code}`)
  const reviewedDualFaction =
    approval.adapter === 'reviewed-dual-faction-v1' &&
    card.code === '08105' &&
    card.factions.join(',') === 'seeker,survivor'
  if (
    card.modelIssues.some((issue) => !reviewedDualFaction || issue !== 'unsupported-factions') ||
    (!reviewedDualFaction && card.factions.length !== 1) ||
    card.slots.unknown.length
  )
    throw new Error(`Unsupported card model: ${card.code}`)
  if (
    card.classification !== 'standard-candidate' ||
    !['asset', 'event', 'skill'].includes(card.type)
  )
    throw new Error(`Unsupported pool eligibility: ${card.code}`)
  const creationPermanent =
    card.flags.permanent &&
    approval.adapter === 'reviewed-creation-permanent-v1' &&
    ['08071', '08125'].includes(card.code) &&
    card.deckLimit === 1
  const permanentReprint =
    card.flags.permanent &&
    approval.adapter === 'equivalent-permanent-v1' &&
    /^[0-9]{5}$/.test(approval.behaviorSource ?? '') &&
    /^[a-f0-9]{64}$/.test(approval.equivalenceSha256 ?? '')
  const talentPermanent =
    card.flags.permanent &&
    approval.adapter === 'reviewed-talent-permanent-v1' &&
    ['02185', '02187', '02189', '02191', '02193'].includes(card.code) &&
    card.deckLimit === 2
  if (
    (card.flags.permanent && !permanentReprint && !creationPermanent && !talentPermanent) ||
    ['exceptional', 'myriad', 'exile'].some((key) => card.flags[key])
  )
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
    ...(reviewedDualFaction ? { classes: card.factions } : {}),
    ...(creationPermanent ? { deckLimit: 1 } : {}),
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
