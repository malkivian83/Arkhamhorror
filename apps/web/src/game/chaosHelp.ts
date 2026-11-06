import type { ChaosToken, GameState } from '@lcg/engine'
import type { CatalogCard } from '@lcg/i18n'
import { localeData } from './localeData'

type Translate = (key: string, params?: Record<string, string | number>) => string
export function chaosHelp(
  state: Pick<GameState, 'scenarioId' | 'difficulty'>,
  token: ChaosToken,
  locale: string,
  t: Translate,
): string {
  if (typeof token === 'number')
    return t('chaosHelp.numeric', { value: token > 0 ? `+${token}` : token })
  if (token === 'autoFail' || token === 'elderSign' || token === 'frost')
    return t(`chaosHelp.${token}`)
  const hard = state.difficulty === 'hard' || state.difficulty === 'expert'
  // Tarjetas de referencia con texto oficial en el catálogo local.
  const official: Record<string, CatalogCard | undefined> = {
    'carnevale-of-horrors': localeData(locale).carnevaleCards['82001'],
    'lost-in-time-and-space': localeData(locale).dunwichCards['02311'],
    'where-doom-awaits': localeData(locale).dunwichCards['02274'],
    'undimensioned-and-unseen': localeData(locale).dunwichCards['02236'],
    'blood-on-the-altar': localeData(locale).dunwichCards['02195'],
    'the-essex-county-express': localeData(locale).dunwichCards['02159'],
    'the-miskatonic-museum': localeData(locale).dunwichCards['02118'],
    'the-house-always-wins': localeData(locale).dunwichCards['02062'],
    'extracurricular-activity': localeData(locale).dunwichCards['02041'],
    'the-midnight-masks': localeData(locale).zealotCards['01120'],
    'the-devourer-below': localeData(locale).zealotCards['01142'],
    'the-gathering': localeData(locale).zealotCards['01104'],
    'ice-and-death-part-1': localeData(locale).edgeOfTheEarthCards['08501'],
    'ice-and-death-part-2': localeData(locale).edgeOfTheEarthCards['08501'],
    'ice-and-death-part-3': localeData(locale).edgeOfTheEarthCards['08501'],
    'murder-at-the-excelsior-hotel': localeData(locale).excelsiorCards['84001'],
    'late-risers': localeData(locale).plaguebearerCards['78001'],
    'night-on-the-town': localeData(locale).plaguebearerCards['78019'],
    'dead-by-dawn': localeData(locale).plaguebearerCards['78047'],
    'mourning-chorus': localeData(locale).plaguebearerCards['78083'],
    'curtain-call': localeData(locale).carcosaCards['03043'],
    'the-last-king': localeData(locale).carcosaCards['03061'],
    'echoes-of-the-past': localeData(locale).carcosaCards['03120'],
    'the-unspeakable-oath': localeData(locale).carcosaCards['03159'],
    'a-phantom-of-truth': localeData(locale).carcosaCards['03200'],
    'the-pallid-mask': localeData(locale).carcosaCards['03240'],
    'black-stars-rise': localeData(locale).carcosaCards['03274'],
    'dim-carcosa': localeData(locale).carcosaCards['03316'],
    'fortune-and-folly-part-1': localeData(locale).fortuneCards['88001'],
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
