// RR: Setup, Free Triggered Abilities, Limits, Elder Sign, Deckbuilding.
import {
  availableAbilities,
  cardAllowed,
  dispatch,
  investigatorBehavior,
  playableCards,
  playerCardDef,
  playRestriction,
  type GameState,
} from '@lcg/engine'
import { choose, labels } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { clear, lola, LOLA, makeGame, withLola } from './testing'

it('starts with her printed statistics and her four signature copies', () => {
  const i = lola(makeGame())
  expect(i.skills).toEqual({ willpower: 3, intellect: 3, combat: 3, agility: 3 })
  expect([i.health, i.sanity]).toEqual([6, 6])
  expect(playerCardDef(LOLA)!.signatures).toEqual(['03018', '03018', '03019', '03019'])
})

it('chooses a role after drawing her opening hand', () => {
  const s = dispatch(clear(makeGame()), { type: 'FinishMulligan', investigator: LOLA, count: 0 })
  expect(s.pending?.question.prompt).toBe('prompt.lola.role')
  expect(labels(s)).toEqual([
    'choice.lola.role.survivor',
    'choice.lola.role.guardian',
    'choice.lola.role.seeker',
    'choice.lola.role.rogue',
    'choice.lola.role.mystic',
    'choice.lola.role.neutral',
  ])
  expect(lola(choose(s, 'choice.lola.role.seeker')).role).toBe('seeker')
})

it('can only play, commit or use cards that are Neutral or of her role', () => {
  const s = withLola(clear(makeGame()), {
    role: 'guardian',
    resources: 10,
    hand: ['12019', '12034', '12087'],
  })
  expect(cardAllowed(s, LOLA, '12019')).toBe(true) // M1911, Guardián
  expect(cardAllowed(s, LOLA, '12034')).toBe(false) // Lupa, Buscador
  expect(cardAllowed(s, LOLA, '12087')).toBe(true) // Fedora, neutral
  expect(playRestriction(s, LOLA, '12034')).toEqual({ key: 'unplayable.role' })
  const playable = (state: GameState) => playableCards(state, LOLA, false)
  expect(playable(s)).toEqual(expect.arrayContaining(['12019', '12087']))
  expect(playable(s)).not.toContain('12034')
  // Con el papel neutral solo le quedan las neutrales.
  expect(playable(withLola(s, { role: 'neutral' }))).toEqual(['12087'])
})

it('cannot trigger abilities on her assets that are not of her role', () => {
  let s = withLola(clear(makeGame()), { role: 'guardian' })
  const own = () => availableAbilities(s, LOLA).map((a) => a.key)
  const before = own().length
  // Kit de huellas dactilares (Buscador): sin su capacidad mientras su papel es Guardián.
  s = dispatch(s, { type: 'PutAssetIntoPlay', investigator: LOLA, code: '12031' })
  expect(own()).toHaveLength(before)
  s = withLola(s, { role: 'seeker' })
  expect(own().length).toBeGreaterThan(before)
})

it('[fast]: switch role once per round', () => {
  const s = withLola(clear(makeGame()), { role: 'guardian' })
  const [option] = investigatorBehavior(LOLA)!.fastOptions!(s, lola(s))
  expect(option).toMatchObject({ label: 'ability.lola.switchRole', limit: { per: 'round' } })
  const asked = dispatch(s, option!.then[0]!)
  expect(labels(asked)).not.toContain('choice.lola.role.guardian')
  expect(lola(choose(asked, 'choice.lola.role.mystic')).role).toBe('mystic')
})

it('elder sign: +2 and she may switch roles', () => {
  const s = withLola(makeGame(), { role: 'rogue' })
  const effect = investigatorBehavior(LOLA)!.elderSign!(s, lola(s))
  expect(effect.modifier).toBe(2)
  const asked = dispatch(clear(s), effect.immediate![0]!)
  expect(labels(asked)).toContain('choice.lola.keepRole')
  expect(lola(choose(asked, 'choice.lola.keepRole')).role).toBe('rogue')
})

it('only commits cards of her role (or Neutral) to skill tests', () => {
  const s = dispatch(
    withLola(clear(makeGame(false, [0])), {
      role: 'guardian',
      hand: ['12025', '12039', '12090'],
    }),
    {
      type: 'BeginSkillTest',
      investigator: LOLA,
      skill: 'combat',
      difficulty: 2,
      kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
    },
  )
  const commits = s.pending!.question.choices.filter((c) => c.label === 'choice.commit')
  const cards = commits.map((c) => c.target?.type === 'hand' && c.target.code)
  expect(cards).toContain('12025') // Golpe brutal (Guardián)
  expect(cards).not.toContain('12039') // Deducción (Buscador)
})
