import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { edgeOfTheEarthCards } from '@lcg/i18n/es'
import { expect, it } from 'vitest'
import evidence from '../../../../docs-proyecto/evidencias/edge-of-the-earth-cartas-narracion.json'
import { cardNarration } from './cardNarration'

it('offers Spanish narration on the opening act and agenda of each Ice and Death part', () => {
  for (const code of ['08518', '08521', '08523', '08526', '08544', '08546']) {
    expect(cardNarration(code, false, 'es')).toBe(`/local-assets/cards/audio/es/${code}-front.mp3`)
  }
})

it('serves each recorded face with its own text and the campaign voice', () => {
  expect(evidence.voiceId).toBe('hyKxCTlAqtnW188CgltM')
  const narrativeFaces = Object.entries(edgeOfTheEarthCards)
    .filter(([, card]) => ['agenda', 'act'].includes(card.typeCode))
    .flatMap(([code, card]) => [
      ...(card.flavor?.trim() ? [`${code}:front`] : []),
      ...(card.backFlavor?.trim() ? [`${code}:back`] : []),
    ])
  expect(evidence.files.map(({ code, side }) => `${code}:${side}`).sort()).toEqual(
    narrativeFaces.sort(),
  )
  for (const entry of evidence.files) {
    const back = entry.side === 'back'
    const card = edgeOfTheEarthCards[entry.code]!
    expect(entry.text).toBe(card[back ? 'backFlavor' : 'flavor'])
    const path = cardNarration(entry.code, back, 'es')
    expect(path).toBe(`/local-assets/cards/audio/es/${entry.file}`)
    expect(cardNarration(entry.code, back, 'en')).toBeNull()
    const audio = readFileSync(new URL(`../../public${path}`, import.meta.url))
    expect(createHash('sha256').update(audio).digest('hex')).toBe(entry.sha256)
  }
})
