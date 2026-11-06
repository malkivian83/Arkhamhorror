/** Newest first. Add translated copy under app.changelog when publishing an update. */
export const changelog = [
  {
    id: 'fatal-mirage-preparation',
    date: '2026-11-06',
    title: 'app.changelog.fatalMirage.title',
    items: ['app.changelog.fatalMirage.rules', 'app.changelog.fatalMirage.audio'],
  },
  {
    id: 'plaguebearer-dawn-and-chorus',
    date: '2026-11-06',
    title: 'app.changelog.plaguebearer.title',
    items: [
      'app.changelog.plaguebearer.dawn',
      'app.changelog.plaguebearer.chorus',
      'app.changelog.plaguebearer.interludes',
      'app.changelog.plaguebearer.allied',
      'app.changelog.plaguebearer.fixes',
    ],
  },
  {
    id: 'carnevale-playable',
    date: '2026-10-30',
    title: 'app.changelog.carnevale.title',
    items: [
      'app.changelog.carnevale.scenario',
      'app.changelog.carnevale.sideStory',
      'app.changelog.carnevale.rewards',
      'app.changelog.carnevale.presentation',
    ],
  },
  {
    id: 'nathaniel-harvey-and-dunwich-rules',
    date: '2026-10-29',
    title: 'app.changelog.startersAndRules.title',
    items: [
      'app.changelog.startersAndRules.decks',
      'app.changelog.startersAndRules.cards',
      'app.changelog.startersAndRules.museum',
      'app.changelog.startersAndRules.encounters',
    ],
  },
  {
    id: 'dunwich-complete',
    date: '2026-10-28',
    title: 'app.changelog.dunwich.title',
    items: [
      'app.changelog.dunwich.campaign',
      'app.changelog.dunwich.audio',
      'app.changelog.dunwich.saves',
    ],
  },
  {
    id: 'scenario-improvements',
    date: '2026-10-28',
    title: 'app.changelog.improvements.title',
    items: ['app.changelog.improvements.carcosa', 'app.changelog.improvements.choices'],
  },
] as const
