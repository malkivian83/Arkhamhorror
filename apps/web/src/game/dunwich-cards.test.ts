import { existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { DUNWICH_ENCOUNTER_SETS } from '@lcg/cards'
import { playerCardDef } from '@lcg/engine'
import { dunwichCards } from '@lcg/i18n'
import { expect, it } from 'vitest'
import images from '../../../../docs-proyecto/evidencias/imagenes-dunwich.json'
import manifest from './cardImageManifest.json'
import { fallbackCards } from './fallbackCards'

it.each(['en', 'es'] as const)(
  'presents the reviewed Dunwich encounters once in %s with official text and local art',
  (locale) => {
    const codes = ['02083', '02084', '02090', '02091', '02100', '02101', '02102']
    const catalog = fallbackCards(locale)
    expect(
      [
        ...new Set(
          Object.values(DUNWICH_ENCOUNTER_SETS)
            .flat()
            .map((c) => c.code),
        ),
      ].sort(),
    ).toEqual(codes)
    expect(Object.keys(dunwichCards[locale])).toEqual(codes)
    for (const code of codes) {
      const matches = catalog.filter((c) => c.code === code)
      expect(matches).toHaveLength(1)
      expect(matches[0]).toMatchObject({
        name: dunwichCards[locale][code]!.name,
        text: dunwichCards[locale][code]!.text,
        type_code: code === '02090' ? 'enemy' : 'treachery',
      })
      expect(playerCardDef(code)).toBeUndefined()
      const path = (manifest[locale] as Record<string, string>)[code]!
      const bytes = readFileSync(fileURLToPath(new URL(`../../public${path}`, import.meta.url)))
      const evidence = images.files.find((file) => file.language === locale && file.art === code)!
      expect(bytes.length).toBe(evidence.bytes)
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(evidence.sha256)
      expect(
        existsSync(
          fileURLToPath(
            new URL(
              `../../public/local-assets/cards/${locale}/thumbs/${code}.webp`,
              import.meta.url,
            ),
          ),
        ),
      ).toBe(true)
    }
  },
)
