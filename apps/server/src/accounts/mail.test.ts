import { createServer } from 'node:net'
import { expect, it } from 'vitest'
import { mailer } from './mail'

it('rejects a silent SMTP server before the browser gives up on registration', async () => {
  const sockets = new Set<import('node:net').Socket>()
  const server = createServer((socket) => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
    // Accept TCP but never send the SMTP greeting.
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('No SMTP port')
    const started = Date.now()
    await expect(
      mailer({
        databaseUrl: '',
        origin: 'http://localhost',
        production: false,
        smtpUrl: `smtp://127.0.0.1:${address.port}`,
        mailFrom: 'noreply@example.test',
      })({ to: 'test@example.test', subject: 'Test', text: 'Test' }),
    ).rejects.toMatchObject({ code: 'ETIMEDOUT' })
    expect(Date.now() - started).toBeLessThan(10000)
  } finally {
    for (const socket of sockets) socket.destroy()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}, 12000)

it('envía correo mediante SMTP y falla explícitamente si no hay transporte configurado', async () => {
  let received = '',
    inData = false
  const server = createServer((socket) => {
    socket.write('220 local-test ESMTP\r\n')
    let pending = ''
    socket.on('data', (bytes) => {
      pending += bytes.toString()
      let end: number
      while ((end = pending.indexOf('\r\n')) >= 0) {
        const line = pending.slice(0, end)
        pending = pending.slice(end + 2)
        if (inData) {
          if (line === '.') {
            inData = false
            socket.write('250 received\r\n')
          } else received += `${line}\n`
        } else if (line.startsWith('EHLO')) socket.write('250 local-test\r\n')
        else if (line.startsWith('DATA')) {
          inData = true
          socket.write('354 send message\r\n')
        } else if (line.startsWith('QUIT')) {
          socket.end('221 bye\r\n')
        } else socket.write('250 ok\r\n')
      }
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('No SMTP port')
    const config = {
      databaseUrl: '',
      origin: 'http://localhost',
      production: false,
      smtpUrl: `smtp://127.0.0.1:${address.port}`,
      mailFrom: 'Arkham <noreply@example.test>',
    }
    await mailer(config)({
      to: 'test@example.test',
      subject: 'Verify account',
      text: 'Open the verification link.',
    })
    expect(received).toContain('To: test@example.test')
    expect(received).toContain('Open the verification link.')
    await expect(
      mailer({ databaseUrl: '', origin: 'http://localhost', production: false })({
        to: 'test@example.test',
        subject: 'Test',
        text: 'Test',
      }),
    ).rejects.toThrow('mail_unavailable')
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
  }
})
