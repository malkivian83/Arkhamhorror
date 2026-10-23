import nodemailer from 'nodemailer'
import type { AccountConfig } from './config'

export interface AccountMail {
  to: string
  subject: string
  text: string
}
export type SendMail = (mail: AccountMail) => Promise<void>
export function mailer(config: AccountConfig): SendMail {
  // Missing mail never prints live account tokens to application logs.
  const url = config.smtpUrl ? new URL(config.smtpUrl) : undefined
  // Bound stalled SMTP phases so a missing greeting does not outlive the HTTP client.
  for (const option of ['connectionTimeout', 'greetingTimeout', 'socketTimeout', 'dnsTimeout'])
    url?.searchParams.set(option, '5000')
  const transport = url ? nodemailer.createTransport(url.href) : undefined
  return async (mail) => {
    if (!transport || !config.mailFrom) throw new Error('mail_unavailable')
    await transport.sendMail({ ...mail, from: config.mailFrom })
  }
}
