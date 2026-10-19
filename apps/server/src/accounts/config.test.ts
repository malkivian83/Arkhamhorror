import { expect, it } from 'vitest'
import { accountConfig } from './config'

const production = {
  NODE_ENV: 'production',
  DATABASE_URL: 'mysql://example:password@localhost/test',
  APP_ORIGIN: 'https://example.test',
  SMTP_URL: 'smtps://example.test:465',
  MAIL_FROM: 'info@example.test',
}
it('permite desplegar con correo antes de configurar Google y rechaza credenciales parciales', () => {
  expect(accountConfig(production)).toMatchObject({ production: true })
  expect(() => accountConfig({ ...production, GOOGLE_CLIENT_ID: 'partial' })).toThrow(
    'configured together',
  )
  expect(() => accountConfig({ ...production, GOOGLE_CLIENT_SECRET: 'partial' })).toThrow(
    'configured together',
  )
  expect(
    accountConfig({ ...production, GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret' }),
  ).toMatchObject({ googleClientId: 'id' })
})
it('mantiene HTTPS y correo obligatorios en producción', () => {
  expect(() => accountConfig({ ...production, APP_ORIGIN: 'http://example.test' })).toThrow('HTTPS')
  expect(() => accountConfig({ ...production, SMTP_URL: '' })).toThrow('SMTP_URL')
})
