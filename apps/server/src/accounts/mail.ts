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
  const transport = config.smtpUrl ? nodemailer.createTransport(config.smtpUrl) : undefined
  return async (mail) => {
    if (!transport || !config.mailFrom) throw new Error('mail_unavailable')
    await transport.sendMail({ ...mail, from: config.mailFrom })
  }
}
