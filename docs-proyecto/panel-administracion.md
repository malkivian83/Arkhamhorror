# Panel de administración

La ruta `/admin` y sus API `/api/admin/*` requieren sesión verificada,
rol `admin` en `account_roles` y correo `malkivian@gmail.com`. El registro
público nunca concede el rol. Los menús de escritorio, móvil y partida
muestran el enlace únicamente para esa cuenta autorizada.

## Contenido

- Totales de usuarios, cuentas verificadas, sesiones activas y documentos
  guardados en la nube (incluidos archivados; excluidos borrados).
- Usuarios con búsqueda por nombre o correo, fecha de alta, verificación,
  rol, último inicio de sesión registrado y recuentos de sesiones y documentos.
- Accesos correctos con contraseña o Google y fallos de contraseña de cuentas
  existentes. No representa visitas anónimas ni fallos OAuth antes de identificar
  al usuario. El último acceso no equivale a la última visita a una página.
- Log de verificación y recuperación: pendiente, aceptado por SMTP o fallido.
  La aceptación SMTP no confirma entrega ni lectura. Un proceso interrumpido
  puede dejar un envío pendiente sin resultado confirmado.
- Indicadores de configuración de SMTP y Google, sin mostrar secretos ni
  afirmar que los proveedores estén disponibles.

Listados de 50 elementos con búsqueda y paginación. Las sesiones activas deben
seguir vigentes y haberse utilizado en los últimos siete días. El contador de
errores de correo cubre las últimas 24 horas. El panel es de consulta.

## Activación

Aplicar `pnpm --filter @lcg/server db:migrate` durante el despliegue antes de
arrancar la aplicación nueva. La migración `003_admin_activity.sql` añade el
registro de actividad sin alterar migraciones históricas.

La cuenta indicada debe estar aprovisionada mediante el mecanismo existente
`pnpm --filter @lcg/server admin:provision`, con `ADMIN_EMAIL`, `ADMIN_PASSWORD`
y, opcionalmente, `ADMIN_NAME` en el entorno privado. No guardar credenciales
en el repositorio. Si ya tiene rol administrador, no necesita aprovisionarse
otra vez. La migración no concede privilegios por coincidencia de correo.

El historial comienza con la activación: no reconstruye eventos anteriores.
Los registros conservan usuario, tipo, resultado y fecha; no incluyen IP,
contraseñas, tokens, texto del correo ni errores SMTP sin filtrar. Se eliminan
en cascada al borrar la cuenta. No se aplica todavía caducidad automática.

## Verificación

`dashboard.test.ts` cubre acceso anónimo, cuentas ordinarias, cuentas no
verificadas, administradores con otro correo, límites de paginación y búsqueda
parametrizada. `accounts.mysql.test.ts` verifica migraciones, permisos con
sesiones reales, revocación de rol, estadísticas, accesos y correos correctos
y fallidos. Requiere `MYSQL_TEST_URL` hacia una base aislada terminada en `_test`.
