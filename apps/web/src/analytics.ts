import type { Router } from 'vue-router'

export const MEASUREMENT_ID = 'G-V6TQC85VWV'
const CONSENT_KEY = 'analytics-consent-v1'
type Consent = 'accepted' | 'rejected'
type AnalyticsWindow = Window & {
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
  'ga-disable-G-V6TQC85VWV'?: boolean
}

export function readAnalyticsConsent(): Consent | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY)
    return value === 'accepted' || value === 'rejected' ? value : null
  } catch {
    return null
  }
}

/** Basic consent: no Google script or requests before acceptance. */
export function createAnalytics(router: Router, enabled: boolean) {
  let consent = readAnalyticsConsent()
  let initialized = false
  const target = window as AnalyticsWindow
  const denied = {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  }
  function pageView() {
    if (!enabled || consent !== 'accepted') return
    if (!router.currentRoute.value.matched.length) return
    // Route templates omit room/deck IDs, queries and account verification tokens.
    const path = router.currentRoute.value.matched.at(-1)?.path ?? '/'
    target.gtag?.('event', 'page_view', {
      page_location: `${window.location.origin}${path}`,
      page_title: String(router.currentRoute.value.name ?? 'page'),
      page_referrer: '',
    })
  }
  function activate() {
    if (!enabled) return
    target[`ga-disable-${MEASUREMENT_ID}`] = false
    if (!initialized) {
      target.dataLayer = target.dataLayer || []
      target.gtag = function () {
        // gtag.js expects an Arguments object in the data layer.
        // eslint-disable-next-line prefer-rest-params
        target.dataLayer!.push(arguments)
      }
      target.gtag('consent', 'default', denied)
      target.gtag('consent', 'update', { ...denied, analytics_storage: 'granted' })
      target.gtag('js', new Date())
      target.gtag('config', MEASUREMENT_ID, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        page_location: window.location.origin,
        page_referrer: '',
      })
      const script = document.createElement('script')
      script.async = true
      script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`
      document.head.appendChild(script)
      initialized = true
    } else {
      target.gtag?.('consent', 'update', { ...denied, analytics_storage: 'granted' })
    }
    pageView()
  }
  function choose(value: Consent) {
    consent = value
    try {
      localStorage.setItem(CONSENT_KEY, value)
    } catch {
      // Keep the choice for this page when storage is unavailable.
    }
    if (value === 'accepted') activate()
    else if (enabled) {
      target[`ga-disable-${MEASUREMENT_ID}`] = true
      // The GA disable flag blocks collection without sending consent pings.
    }
  }
  const stop = router.afterEach((_to, _from, failure) => {
    if (!failure) pageView()
  })
  if (consent === 'accepted') activate()
  return { choose, stop }
}
