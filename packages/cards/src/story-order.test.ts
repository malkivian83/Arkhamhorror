import { describe, expect, it } from 'vitest'
import { allCampaigns, compareStories, storyGroup } from './index'

const ordered = () =>
  allCampaigns()
    .sort((a, b) => compareStories(a, b, (c) => c.id, 'es'))
    .map((c) => c.id)

describe('orden del selector de historias', () => {
  it('muestra campañas oficiales y luego independientes por fecha de publicación, y al final las fanmade', () => {
    expect(ordered()).toEqual([
      'night-of-the-zealot',
      'the-dunwich-legacy',
      'the-path-to-carcosa',
      'edge-of-the-earth',
      'carnevale-of-horrors',
      'murder-at-the-excelsior-hotel',
      'fortune-and-folly',
      'the-midwinter-gala',
      'brethren-of-ash',
      'call-of-the-plaguebearer',
    ])
  })

  it('da fecha de publicación a todo el contenido oficial y separa el fanmade', () => {
    for (const campaign of allCampaigns()) {
      if (storyGroup(campaign) === 'fanmade') expect(campaign.release).toBeUndefined()
      else expect(campaign.release, campaign.id).toBeTypeOf('number')
    }
  })
})
