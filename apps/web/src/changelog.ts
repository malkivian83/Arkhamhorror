/** Newest first. Add translated copy under app.changelog when publishing an update. */
export const changelog = [
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
