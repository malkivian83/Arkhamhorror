/** Convert only explicitly reviewed records; importing an inventory never calls this. */
export function approvedDefinition(card, approval) {
  if (approval.code !== card.code || approval.status !== 'verified')
    throw new Error(`Card is not approved: ${card.code}`)
  const mementoSubtitles = { '08114': 'From a Former Life', '08115': 'From a Future Life' }
  const reviewedMemento =
    approval.adapter === 'reviewed-memento-v1' &&
    Object.hasOwn(mementoSubtitles, card.code) &&
    mementoSubtitles[card.code] === approval.subname &&
    card.factions.join(',') === 'rogue,survivor'
  const reviewedDualFaction =
    reviewedMemento ||
    (approval.adapter === 'reviewed-dual-faction-v1' &&
      ((['08105', '08107'].includes(card.code) && card.factions.join(',') === 'seeker,survivor') ||
        (card.code === '05119' && card.factions.join(',') === 'survivor,seeker') ||
        (card.code === '05116' && card.factions.join(',') === 'seeker,mystic') ||
        (card.code === '05117' && card.factions.join(',') === 'rogue,survivor') ||
        (['08090', '08091', '08092', '08093'].includes(card.code) &&
          card.factions.join(',') === 'guardian,mystic') ||
        (['08101', '08103'].includes(card.code) && card.factions.join(',') === 'seeker,mystic') ||
        (['08108', '08110', '08109', '08111'].includes(card.code) &&
          card.factions.join(',') === 'rogue,mystic') ||
        (['08083', '08086'].includes(card.code) && card.factions.join(',') === 'guardian,seeker') ||
        (card.code === '05115' && card.factions.join(',') === 'guardian,rogue') ||
        (['08094', '08096', '08095'].includes(card.code) &&
          card.factions.join(',') === 'guardian,survivor') ||
        (['08117', '08119'].includes(card.code) && card.factions.join(',') === 'mystic,survivor') ||
        (card.code === '05118' && card.factions.join(',') === 'mystic,guardian') ||
        (card.code === '08112' && card.factions.join(',') === 'rogue,survivor')))
  const reviewedCustomizable =
    approval.adapter === 'reviewed-shotcaster-v1' && card.code === '09119'
  const talentFactions = {
    '08120': 'guardian,mystic,survivor',
    '08121': 'guardian,seeker,mystic',
    '08122': 'guardian,rogue,survivor',
    '08123': 'seeker,rogue,survivor',
    '08124': 'seeker,rogue,mystic',
  }
  const reviewedTalent =
    approval.adapter === 'reviewed-talent-factions-v1' &&
    talentFactions[card.code] === card.factions.join(',')
  const reviewedTarot =
    approval.adapter === 'reviewed-tarot-v1' &&
    (['05023', '05027', '05031', '05035', '05039', '54003', '54005'].includes(card.code) ||
      { 54001: 'guardian:3', 54009: 'survivor:3', 54011: 'neutral:3' }[card.code] ===
        card.factions.join(',') + ':' + card.numbers.xp?.value) &&
    card.slots.unknown.join(',') === 'Tarot' &&
    card.slots.slots.length === 0
  const reviewedDiscovery =
    approval.adapter === 'reviewed-myriad-v1' &&
    card.code === '06034' &&
    card.flags.myriad &&
    card.deckLimit === 3 &&
    card.factions.join(',') === 'survivor' &&
    card.numbers.cost?.kind === 'symbol' &&
    card.numbers.cost.value === 'X'
  const reviewedChance =
    approval.adapter === 'reviewed-chance-x-v1' &&
    card.code === '03238' &&
    card.factions.join(',') === 'survivor' &&
    card.numbers.cost?.kind === 'symbol' &&
    card.numbers.cost.value === 'X'
  const reviewedCostX = reviewedDiscovery || reviewedChance
  if (
    card.modelIssues.some(
      (issue) =>
        !((reviewedDualFaction || reviewedTalent) && issue === 'unsupported-factions') &&
        !(reviewedCustomizable && issue === 'customization') &&
        !(reviewedTarot && issue === 'unsupported-slots') &&
        !(reviewedCostX && issue === 'symbolic-number'),
    ) ||
    (!reviewedDualFaction && !reviewedTalent && card.factions.length !== 1) ||
    (!reviewedTarot && card.slots.unknown.length)
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
  const reviewedDefeatExile =
    approval.adapter === 'reviewed-exile-defeat-v1' && card.code === '05236'
  const reviewedProtectionExile =
    approval.adapter === 'reviewed-protection-exile-v1' &&
    ['02114', '03156', '03157', '08080'].includes(card.code)
  // Stroke of Luck: exiled as the cost of its reaction (lot 135).
  const reviewedTokenExile = approval.adapter === 'reviewed-token-exile-v1' && card.code === '02271'
  // Covenants: Permanent, deck limit 1, at most 1 Covenant per deck (lot 135).
  const reviewedCovenant =
    approval.adapter === 'reviewed-covenant-permanent-v1' &&
    ['07110', '07113', '07116', '07120', '07122'].includes(card.code) &&
    card.flags.permanent &&
    card.deckLimit === 1 &&
    card.traits.includes('Covenant')
  const reviewedBorrowedTime =
    approval.adapter === 'reviewed-borrowed-time-v1' && card.code === '04308'
  // Reviewed Exceptional assets (The Black Fan, The Red Clock): deck limit 1.
  const reviewedExceptional =
    approval.adapter === 'reviewed-exceptional-v1' &&
    ['08057', '08058', '08053', '07224', '02230', '07307', '07225'].includes(card.code) &&
    card.flags.exceptional &&
    card.deckLimit === 1 &&
    (!['02230', '07307', '07225'].includes(card.code) ||
      card.numbers.xp?.value === { '02230': 2, '07307': 3, '07225': 2 }[card.code]) &&
    card.factions.join(',') === 'rogue'
  const reviewedDarkHorse =
    approval.adapter === 'reviewed-dark-horse-v1' &&
    card.code === '10127' &&
    card.flags.permanent &&
    card.deckLimit === 1 &&
    card.factions.join(',') === 'survivor' &&
    card.type === 'asset' &&
    card.numbers.xp?.kind === 'number' &&
    card.numbers.xp.value === 5
  const fieldKeywords =
    approval.adapter === 'reviewed-field-keywords-v1' &&
    card.type === 'asset' &&
    card.numbers.xp?.kind === 'number' &&
    ((['60478', '11030'].includes(card.code) &&
      card.flags.permanent &&
      !card.flags.exceptional &&
      card.deckLimit === 1 &&
      card.factions.join(',') === (card.code === '60478' ? 'mystic' : 'guardian') &&
      card.numbers.xp.value === (card.code === '60478' ? 4 : 3)) ||
      (card.code === '60474' &&
        card.flags.exceptional &&
        card.deckLimit === 1 &&
        !card.flags.permanent &&
        card.factions.join(',') === 'mystic' &&
        card.numbers.xp.value === 3))
  const economyKeywords =
    approval.adapter === 'reviewed-economy-keywords-v1' &&
    card.type === 'asset' &&
    card.flags.permanent &&
    card.deckLimit === 1 &&
    card.numbers.xp?.kind === 'number' &&
    ((card.code === '53010' &&
      card.factions.join(',') === 'survivor' &&
      card.numbers.xp.value === 3 &&
      card.flags.exceptional) ||
      (card.code === '08019' &&
        card.factions.join(',') === 'guardian' &&
        card.numbers.xp.value === 0 &&
        !card.flags.exceptional))
  const myriadFactions = {
    11039: 'seeker',
    '06241': 'mystic',
    '06242': 'mystic',
    '06243': 'mystic',
    11031: 'guardian',
    11042: 'seeker',
    '06199': 'rogue',
    '06245': 'survivor',
    '06034': 'survivor',
    '06026': 'rogue',
    '06323': 'guardian',
    11090: 'survivor',
    11096: 'neutral',
    11070: 'mystic',
  }
  const reviewedMyriad =
    approval.adapter === 'reviewed-myriad-v1' &&
    Object.hasOwn(myriadFactions, card.code) &&
    card.flags.myriad &&
    card.deckLimit === (['06241', '06242', '06243'].includes(card.code) ? 1 : 3) &&
    (!['06241', '06242', '06243', '11039'].includes(card.code) ||
      (card.numbers.xp?.value === (card.code === '11039' ? 0 : 2) &&
        card.slots.slots.join(',') === 'arcane' &&
        (card.code === '11039' ||
          approval.subname ===
            { '06241': 'Stamina', '06242': 'Alacrity', '06243': 'Acuity' }[card.code]))) &&
    card.factions.join(',') === myriadFactions[card.code]
  if (
    (card.flags.permanent &&
      !permanentReprint &&
      !creationPermanent &&
      !talentPermanent &&
      !reviewedDarkHorse &&
      !fieldKeywords &&
      !economyKeywords &&
      !reviewedCovenant) ||
    ['exceptional', 'myriad', 'exile'].some(
      (key) =>
        card.flags[key] &&
        !(
          key === 'exile' &&
          (reviewedDefeatExile || reviewedProtectionExile || reviewedTokenExile)
        ) &&
        !(
          key === 'exceptional' &&
          (reviewedBorrowedTime || fieldKeywords || economyKeywords || reviewedExceptional)
        ) &&
        !(key === 'myriad' && reviewedMyriad),
    )
  )
    throw new Error(`Keyword requires a dedicated adapter: ${card.code}`)
  const numeric = (key) => {
    const number = card.numbers[key]
    if (!number || number.kind === 'absent') return undefined
    if (number.kind !== 'number') throw new Error(`Unsupported ${key}: ${card.code}`)
    return number.value
  }
  const cost = reviewedCostX ? 0 : numeric('cost'),
    health = numeric('health'),
    sanity = numeric('sanity')
  return {
    code: card.code,
    name: card.name,
    // Reviewed subtitle distinguishing same-level versions absent from the frozen inventory.
    ...(approval.subname ? { subname: approval.subname } : {}),
    type: card.type,
    class: card.factions[0],
    ...(reviewedDualFaction || reviewedTalent ? { classes: card.factions } : {}),
    ...(creationPermanent ? { deckLimit: 1 } : {}),
    ...(reviewedBorrowedTime || reviewedExceptional ? { exceptional: true, deckLimit: 1 } : {}),
    ...(reviewedDarkHorse || reviewedCovenant ? { deckLimit: 1 } : {}),
    ...(fieldKeywords && card.flags.permanent ? { deckLimit: 1 } : {}),
    ...(fieldKeywords && card.flags.exceptional ? { exceptional: true, deckLimit: 1 } : {}),
    ...(economyKeywords
      ? { deckLimit: 1, ...(card.flags.exceptional ? { exceptional: true } : {}) }
      : {}),
    ...(reviewedMemento ? { deckLimit: 1 } : {}),
    ...(reviewedMyriad ? { myriad: true, deckLimit: card.deckLimit } : {}),
    traits: card.traits,
    ...(card.flags.is_unique ? { unique: true } : {}),
    ...(cost !== undefined ? { cost } : {}),
    ...(reviewedCostX ? { printedCostX: true } : {}),
    xp: numeric('xp') ?? 0,
    icons: Object.fromEntries(
      ['willpower', 'intellect', 'combat', 'agility', 'wild']
        .map((key) => [key, numeric(`skill_${key}`)])
        .filter(([, value]) => value !== undefined && value !== 0),
    ),
    slots: reviewedTarot ? ['tarot'] : card.slots.slots,
    ...(health !== undefined ? { health } : {}),
    ...(sanity !== undefined ? { sanity } : {}),
    ...(approval.uses ? { uses: approval.uses } : {}),
    ...(approval.fast ? { fast: true } : {}),
    ...(approval.commitLimit ? { commitLimit: approval.commitLimit } : {}),
  }
}
