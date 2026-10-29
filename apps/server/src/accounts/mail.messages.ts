// Catálogo de textos de los correos transaccionales, independiente del cliente web.
export const mailMessages = {
  es: {
    brand: 'Arkham Online LCG',
    account: 'Tu cuenta de investigador',
    greeting: 'Hola, {name}:',
    fallback: 'Si el botón no funciona, copia y pega este enlace en tu navegador:',
    footer: 'Correo automático de Arkham Online LCG.',
    verify: {
      subject: 'Verifica tu cuenta de Arkham',
      title: 'Tu próxima investigación empieza aquí',
      intro:
        'Confirma tu correo electrónico para activar tu cuenta y empezar a preparar tus partidas.',
      action: 'Verificar mi cuenta',
      expiry: 'Este enlace caduca en 24 horas y solo se puede utilizar una vez.',
      notice: 'Si no has creado una cuenta, puedes ignorar este correo.',
    },
    reset: {
      subject: 'Recupera tu cuenta de Arkham',
      title: 'Vuelve a tu investigación',
      intro:
        'Hemos recibido una solicitud para cambiar tu contraseña. Usa el siguiente enlace para elegir una nueva.',
      action: 'Cambiar mi contraseña',
      expiry: 'Este enlace caduca en 30 minutos y solo se puede utilizar una vez.',
      notice:
        'Si no has solicitado este cambio, ignora este correo. Tu contraseña seguirá siendo la misma.',
    },
  },
  en: {
    brand: 'Arkham Online LCG',
    account: 'Your investigator account',
    greeting: 'Hello, {name},',
    fallback: 'If the button does not work, copy and paste this link into your browser:',
    footer: 'Automated email from Arkham Online LCG.',
    verify: {
      subject: 'Verify your Arkham account',
      title: 'Your next investigation starts here',
      intro: 'Confirm your email address to activate your account and start preparing your games.',
      action: 'Verify my account',
      expiry: 'This link expires in 24 hours and can only be used once.',
      notice: 'If you did not create an account, you can ignore this email.',
    },
    reset: {
      subject: 'Reset your Arkham password',
      title: 'Return to your investigation',
      intro:
        'We received a request to change your password. Use the link below to choose a new one.',
      action: 'Change my password',
      expiry: 'This link expires in 30 minutes and can only be used once.',
      notice:
        'If you did not request this change, ignore this email. Your password will stay the same.',
    },
  },
} as const
