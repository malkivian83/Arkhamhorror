// Tests read both languages synchronously; the app downloads only the active one (O1).
import * as en from '@lcg/i18n/en'
import * as es from '@lcg/i18n/es'
import { provideLocaleData } from './game/localeData'
import { i18n } from './i18n'

provideLocaleData('en', en)
provideLocaleData('es', es)
i18n.global.setLocaleMessage('en', en.messages)
i18n.global.setLocaleMessage('es', es.messages)
