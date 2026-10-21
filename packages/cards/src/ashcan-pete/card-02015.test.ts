// RR: Revelation, Cannot, Upkeep, Activate.
import { assetsCannotReady, availableAbilities, dispatch, investigatorBehavior } from '@lcg/engine'
import { expect, it } from 'vitest'
import { withAsset } from '../dunwich-pilot/testing'
import { clear, duke, makeGame, PETE } from './testing'

it('exhausts every owned asset, blocks all ready effects and leaves other owners unaffected', () => {
  let s = withAsset(makeGame(), '01087', { id: 'foreign', owner: 'other', exhausted: true })
  s = dispatch(clear(s), { type: 'ResolveWeakness', investigator: PETE, code: '02015' })
  expect(duke(s).exhausted).toBe(true)
  expect(assetsCannotReady(s, PETE)).toBe(true)
  s = dispatch(clear(s), { type: 'ReadyAsset', asset: duke(s).id })
  expect(duke(s).exhausted).toBe(true)
  const effect = investigatorBehavior(PETE)!.elderSign!(s, s.investigators[0]!)
  s = dispatch(s, ...(effect.immediate ?? []), { type: 'ReadyAll' })
  expect(duke(s).exhausted).toBe(true)
  expect(s.assets.foreign!.exhausted).toBe(false)
  expect(investigatorBehavior(PETE)!.fastOptions!(s, s.investigators[0]!)).toHaveLength(0)
})

it('costs two actions to discard and then permits readying again', () => {
  let s = dispatch(clear(makeGame()), {
    type: 'ResolveWeakness',
    investigator: PETE,
    code: '02015',
  })
  const ability = availableAbilities(s, PETE).find((a) => a.label === 'ability.discardTreachery')!
  const before = s.investigators[0]!.actionsRemaining
  s = dispatch(
    clear(s),
    { type: 'UseAbility', investigator: PETE, ...ability },
    { type: 'ReadyAsset', asset: duke(s).id },
  )
  expect(s.investigators[0]!.actionsRemaining).toBe(before - 2)
  expect(assetsCannotReady(s, PETE)).toBe(false)
  expect(duke(s).exhausted).toBe(false)
  expect(s.investigators[0]!.discard).toContain('02015')
})
