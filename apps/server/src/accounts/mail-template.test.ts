import { describe, expect, it } from 'vitest'
import { accountEmail } from './mail-template'
import { mailMessages } from './mail.messages'

const options = {
  to: 'investigator@example.test',
  name: 'Agnes',
  origin: 'https://arkham.example.test',
  link: 'https://arkham.example.test/account#action=verify&token=secret-token',
}

describe('plantilla de correos de cuenta', () => {
  it.each([
    ['es', 'verify'],
    ['en', 'verify'],
    ['es', 'reset'],
    ['en', 'reset'],
  ] as const)('genera HTML y texto equivalentes para %s / %s', (locale, purpose) => {
    const link = options.link.replace('action=verify', `action=${purpose}`)
    const mail = accountEmail({ ...options, link, locale, purpose })
    const copy = mailMessages[locale][purpose]
    expect(mail.to).toBe(options.to)
    expect(mail.subject).toBe(copy.subject)
    expect(mail.html).toContain(`<html lang="${locale}">`)
    for (const value of [
      copy.title,
      copy.intro,
      copy.action,
      copy.expiry,
      copy.notice,
      options.name,
    ]) {
      expect(mail.text).toContain(value)
      expect(mail.html).toContain(value)
    }
    expect(mail.text.match(/^https?:\/\/\S+$/m)?.[0]).toBe(link)
    const encodedLink = link.replaceAll('&', '&amp;')
    expect(mail.html?.split(`href="${encodedLink}"`)).toHaveLength(3)
    expect(mail.html).toContain(`${options.origin}/local-assets/home/arkham-online-lcg.webp`)
    expect(mail.html).toContain('bgcolor="#19191d"')
    expect(mail.html).toContain('max-width:600px')
  })

  it('escapa nombres y enlaces sin alterar la versión de texto ni el token', () => {
    const name = '<img src=x onerror="alert(1)"> & \'Agnes\' $&'
    const mail = accountEmail({ ...options, name, locale: 'es', purpose: 'verify' })
    expect(mail.html).not.toContain(name)
    expect(mail.html).toContain(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;Agnes&#39; $&amp;',
    )
    expect(mail.text).toContain(`Hola, ${name}:`)
    expect(mail.text).toContain(options.link)
    const injectedLink = `${options.link}"><script>alert(1)</script>`
    const injected = accountEmail({
      ...options,
      link: injectedLink,
      locale: 'en',
      purpose: 'reset',
    })
    expect(injected.html).not.toContain('<script>')
    expect(injected.html).toContain('&quot;&gt;&lt;script&gt;')
  })

  it('usa español como alternativa y rechaza protocolos no web', () => {
    expect(accountEmail({ ...options, locale: 'fr', purpose: 'verify' }).html).toContain(
      'lang="es"',
    )
    for (const field of ['link', 'origin']) {
      expect(() =>
        accountEmail({
          ...options,
          [field]: 'javascript:alert(1)',
          locale: 'es',
          purpose: 'reset',
        }),
      ).toThrow('invalid_mail_url')
    }
  })
})
