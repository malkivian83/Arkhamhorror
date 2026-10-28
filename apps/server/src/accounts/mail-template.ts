import type { AccountMail } from './mail'
import { mailMessages } from './mail.messages'

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return entities[character]!
  })

interface EmailTemplate {
  locale: 'es' | 'en'
  origin: string
  title: string
  greeting: string
  intro: string
  action: string
  link: string
  expiry: string
  notice: string
}

/** Diseño compartido: colores de site.css, tablas y estilos inline para clientes de correo. */
export function renderEmailTemplate(content: EmailTemplate): Pick<AccountMail, 'html' | 'text'> {
  const messages = mailMessages[content.locale]
  // Solo se permiten enlaces web, también cuando se reutiliza la plantilla con otros mensajes.
  for (const value of [content.origin, content.link]) {
    if (!['https:', 'http:'].includes(new URL(value).protocol)) throw new Error('invalid_mail_url')
  }
  const safe = Object.fromEntries(
    Object.entries(content).map(([key, value]) => [key, escapeHtml(value)]),
  ) as Record<keyof EmailTemplate, string>
  const logo = escapeHtml(new URL('/local-assets/home/arkham-online-lcg.webp', content.origin).href)
  return {
    text: [
      messages.brand,
      content.title,
      content.greeting,
      content.intro,
      `${content.action}:\n${content.link}`,
      content.expiry,
      content.notice,
      messages.footer,
    ].join('\n\n'),
    html: `<!doctype html>
<html lang="${safe.locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${safe.title}</title></head>
<body style="margin:0;padding:0;background-color:#19191d;color:#f4efe7;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${safe.intro}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#19191d">
    <tr><td align="center" style="padding:32px 12px;">
      <!--[if mso]><table role="presentation" width="600" align="center"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
        <tr><td align="center" bgcolor="#121216" style="padding:28px 24px;border:1px solid #4a4347;border-bottom:3px solid #aa6b39;border-radius:10px 10px 0 0;">
          <a href="${safe.origin}" style="color:#f4efe7;text-decoration:none;"><img src="${logo}" width="280" alt="${messages.brand}" style="display:block;width:100%;max-width:280px;height:auto;border:0;color:#f4efe7;font-family:Georgia,serif;font-size:24px;"></a>
        </td></tr>
        <tr><td bgcolor="#25252b" style="padding:32px 24px;border:1px solid #4a4347;border-top:0;border-radius:0 0 10px 10px;">
          <p style="margin:0 0 16px;color:#e5aa8d;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">${messages.account}</p>
          <h1 style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.3;color:#f4efe7;">${safe.title}</h1>
          <p style="margin:0 0 12px;font-size:16px;line-height:1.6;">${safe.greeting}</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#d0c7c1;">${safe.intro}</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td bgcolor="#f1d6a0" style="border:1px solid #aa6b39;border-radius:4px;mso-padding-alt:16px 24px;">
            <a href="${safe.link}" style="display:inline-block;padding:16px 24px;border-radius:4px;background-color:#f1d6a0;color:#302014;font-size:16px;font-weight:bold;text-decoration:none;">${safe.action}</a>
          </td></tr></table>
          <p style="margin:20px 0 28px;font-size:14px;line-height:1.6;color:#c3bbb4;">${safe.expiry}</p>
          <p style="margin:0 0 8px;padding-top:24px;border-top:1px solid #4a4347;font-size:13px;line-height:1.6;color:#c3bbb4;">${messages.fallback}</p>
          <p style="margin:0 0 24px;font-size:13px;line-height:1.6;word-break:break-all;overflow-wrap:anywhere;"><a href="${safe.link}" style="color:#e5aa8d;word-break:break-all;">${safe.link}</a></p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#c3bbb4;">${safe.notice}</p>
        </td></tr>
        <tr><td align="center" style="padding:24px 16px;color:#a39b95;font-size:12px;line-height:1.6;">${messages.footer}</td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>`,
  }
}

export function accountEmail(options: {
  to: string
  name: string
  locale: string
  purpose: 'verify' | 'reset'
  origin: string
  link: string
}): AccountMail {
  const locale = options.locale === 'en' ? 'en' : 'es'
  const messages = mailMessages[locale]
  const copy = messages[options.purpose]
  return {
    to: options.to,
    subject: copy.subject,
    ...renderEmailTemplate({
      ...copy,
      locale,
      origin: options.origin,
      link: options.link,
      greeting: messages.greeting.replace('{name}', () => options.name),
    }),
  }
}
