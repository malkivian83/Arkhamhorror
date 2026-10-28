import type { ChaosToken, GameState } from '@lcg/engine'
import {
  carcosaCards,
  excelsiorCards,
  fortuneCards,
  zealotCards,
  dunwichCards,
  type CatalogCard,
} from '@lcg/i18n'

type Translate = (key: string, params?: Record<string, string | number>) => string
export function chaosHelp(
  state: Pick<GameState, 'scenarioId' | 'difficulty'>,
  token: ChaosToken,
  locale: string,
  t: Translate,
): string {
  if (typeof token === 'number')
    return t('chaosHelp.numeric', { value: token > 0 ? `+${token}` : token })
  if (token === 'autoFail' || token === 'elderSign') return t(`chaosHelp.${token}`)
  const hard = state.difficulty === 'hard' || state.difficulty === 'expert'
  // Tarjetas de referencia con texto oficial en el catálogo local.
  const official: Record<string, CatalogCard | undefined> = {
    'lost-in-time-and-space': dunwichCards[locale === 'es' ? 'es' : 'en']['02311'],
    'where-doom-awaits': dunwichCards[locale === 'es' ? 'es' : 'en']['02274'],
    'undimensioned-and-unseen': dunwichCards[locale === 'es' ? 'es' : 'en']['02236'],
    'blood-on-the-altar': dunwichCards[locale === 'es' ? 'es' : 'en']['02195'],
    'the-essex-county-express': dunwichCards[locale === 'es' ? 'es' : 'en']['02159'],
    'the-miskatonic-museum': dunwichCards[locale === 'es' ? 'es' : 'en']['02118'],
    'the-house-always-wins': dunwichCards[locale === 'es' ? 'es' : 'en']['02062'],
    'extracurricular-activity': dunwichCards[locale === 'es' ? 'es' : 'en']['02041'],
    'the-midnight-masks': zealotCards[locale === 'es' ? 'es' : 'en']['01120'],
    'the-devourer-below': zealotCards[locale === 'es' ? 'es' : 'en']['01142'],
    'the-gathering': zealotCards[locale === 'es' ? 'es' : 'en']['01104'],
    'murder-at-the-excelsior-hotel': excelsiorCards[locale === 'es' ? 'es' : 'en']['84001'],
    'curtain-call': carcosaCards[locale === 'es' ? 'es' : 'en']['03043'],
    'the-last-king': carcosaCards[locale === 'es' ? 'es' : 'en']['03061'],
    'echoes-of-the-past': carcosaCards[locale === 'es' ? 'es' : 'en']['03120'],
    'the-unspeakable-oath': carcosaCards[locale === 'es' ? 'es' : 'en']['03159'],
    'a-phantom-of-truth': carcosaCards[locale === 'es' ? 'es' : 'en']['03200'],
    'the-pallid-mask': carcosaCards[locale === 'es' ? 'es' : 'en']['03240'],
    'black-stars-rise': carcosaCards[locale === 'es' ? 'es' : 'en']['03274'],
    'dim-carcosa': carcosaCards[locale === 'es' ? 'es' : 'en']['03316'],
    'fortune-and-folly-part-1': fortuneCards[locale === 'es' ? 'es' : 'en']['88001'],
  }
  const card = official[state.scenarioId]
  if (card) {
    const tag = token === 'elderThing' ? 'elder_thing' : token
    // Una línea puede agrupar varios símbolos: "[cultist] [tablet] [elder_thing]: -4…".
    const symbols = /^(?:\[[a-z_]+\]\s*)+:?/
    const line = (hard ? card.backText : card.text)
      ?.split('\n')
      .find((line) => symbols.exec(line)?.[0].includes(`[${tag}]`))
    if (line)
      return line
        .replace(symbols, '')
        .replace(/\[\[|\]\]/g, '')
        .replace(/<\/?[a-z]+>/g, '')
        .trim()
  }
  const modifiers: Record<string, Record<string, [number, number]>> = {
    'spreading-flames': { tablet: [-1, -2], elderThing: [-3, -4] },
    'smoke-and-mirrors': { cultist: [-1, -3], tablet: [-3, -4] },
    'queen-of-ash': { cultist: [-2, -3], elderThing: [-3, -5] },
    'the-midwinter-gala': { tablet: [-2, -3], elderThing: [-3, -4] },
  }
  const symbols: Record<string, string[]> = {
    'spreading-flames': ['skull', 'tablet', 'elderThing'],
    'smoke-and-mirrors': ['skull', 'cultist', 'tablet', 'elderThing'],
    'queen-of-ash': ['skull', 'cultist', 'tablet', 'elderThing'],
    'the-midwinter-gala': ['skull', 'cultist', 'tablet', 'elderThing'],
  }
  if (!symbols[state.scenarioId]?.includes(token)) return t('chaosHelp.reference')
  return t(`chaosHelp.rules.${state.scenarioId}.${token}`, {
    modifier: modifiers[state.scenarioId]?.[token]?.[hard ? 1 : 0] ?? 0,
    extra: hard
      ? t(state.scenarioId === 'smoke-and-mirrors' ? 'chaosHelp.extraTwo' : 'chaosHelp.extraOne')
      : '',
    multiple: hard ? t('chaosHelp.double') : '',
    margin: hard ? '' : t('chaosHelp.margin'),
    condition: t(hard ? 'chaosHelp.queenHard' : 'chaosHelp.queenStandard'),
    privateValue: hard ? -5 : -4,
    guests: t(hard ? 'chaosHelp.storyAssets' : 'chaosHelp.guests'),
  })
}
