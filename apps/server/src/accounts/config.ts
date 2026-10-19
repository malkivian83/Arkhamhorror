export interface AccountConfig {
  databaseUrl: string
  origin: string
  production: boolean
  smtpUrl?: string
  mailFrom?: string
  googleClientId?: string
  googleClientSecret?: string
}

export function accountConfig(env = process.env): AccountConfig | undefined {
  if (!env.DATABASE_URL) return undefined
  const origin = new URL(env.APP_ORIGIN ?? 'http://localhost:5173').origin
  const production = env.NODE_ENV === 'production'
  if (production && (!origin.startsWith('https://') || !env.SMTP_URL || !env.MAIL_FROM))
    throw new Error('Production accounts require HTTPS, SMTP_URL and MAIL_FROM')
  if (!!env.GOOGLE_CLIENT_ID !== !!env.GOOGLE_CLIENT_SECRET)
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together')
  return {
    databaseUrl: env.DATABASE_URL,
    origin,
    production,
    ...(env.SMTP_URL ? { smtpUrl: env.SMTP_URL } : {}),
    ...(env.MAIL_FROM ? { mailFrom: env.MAIL_FROM } : {}),
    ...(env.GOOGLE_CLIENT_ID ? { googleClientId: env.GOOGLE_CLIENT_ID } : {}),
    ...(env.GOOGLE_CLIENT_SECRET ? { googleClientSecret: env.GOOGLE_CLIENT_SECRET } : {}),
  }
}
