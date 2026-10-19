# 22 · Cuentas y bibliotecas privadas: implementación y despliegue

Fecha: 19 de octubre de 2026. Continúa el [informe de diseño](21-cuentas-y-guardado-en-servidor.md).

## Funciones implementadas

- Registro abierto, verificación de correo, reenvío, acceso y recuperación de contraseña.
- Google mediante OpenID Connect y vinculación explícita a cuentas existentes.
- Sesiones revocables con cookie HttpOnly, CSRF, comprobación de origen y límites de peticiones.
- Invitado separado de las cuentas; importación explícita de sus datos sin borrar los originales.
- Mazos y recompensas privados, múltiples campañas, nombre, archivo, exportación y eliminación.
- Guardados completos con historial y lecturas pendientes; cinco revisiones recuperables como otra aventura.
- Cola persistente en IndexedDB, copia de trabajo local, reintentos idempotentes y conflictos explícitos.
- Separación por cuenta y pestaña; exportación de pendientes de otras pestañas.
- Cierre de sesión con borrado local opcional; eliminación de cuenta confirmando contraseña.
- Español e inglés, móvil y controles de teclado.

El motor sigue en el navegador. El servidor valida estructura, contenido y versiones, pero no reproduce historiales arbitrarios en el bucle HTTP. La web sí verifica el historial al abrir una partida. No se certifican resultados competitivos.

## Organización y decisiones de implementación

| Ruta | Responsabilidad |
| --- | --- |
| `packages/saves` | Formato, validadores, historial y presentación de avances compartidos, sin Vue |
| `apps/server/src/accounts` | MySQL, acceso, Google, correo y API de biblioteca |
| `apps/server/migrations/001_accounts.sql` | Usuarios, sesiones, tokens, identidades, documentos, operaciones, revisiones y estados OAuth |
| `apps/web/src/account` | HTTP, almacenamiento por cuenta, IndexedDB y sincronización |
| `AccountView.vue` y `LibraryView.vue` | Cuenta y biblioteca |

Una tabla `documents` distingue `deck`, `campaign` y `rewards`, evitando tres implementaciones de persistencia. Cada documento tiene propietario, UUID y revisión. Las operaciones idempotentes y las revisiones históricas se confirman en la misma transacción InnoDB.

El cliente envía el identificador de cuenta esperado. Si otra pestaña cambia la cookie de usuario, el servidor rechaza el acceso hasta recargar. El perfil público recordado permite abrir copias locales sin conexión; no concede autorización remota.

## Desarrollo local

1. `pnpm install`.
2. Copiar `.env.example` a `.env` y elegir contraseñas propias para MySQL.
3. `docker compose up -d db mail`.
4. `pnpm --filter @lcg/server db:migrate`.
5. `pnpm dev`; abrir `http://localhost:5173`.
6. Consultar los correos de desarrollo en Mailpit, `http://localhost:8025`.

Los puertos de MySQL y Mailpit se publican solo en loopback. El servicio de desarrollo ya usa MySQL 8.4; el antiguo volumen PostgreSQL no se borra ni se reutiliza como MySQL.

Sin `DATABASE_URL`, sigue disponible el juego como invitado y se indica que las cuentas no están disponibles. Con MySQL pero sin SMTP, el envío falla explícitamente. No se imprimen tokens en los logs.

Las migraciones son un paso explícito de instalación. La API no ejecuta DDL durante las peticiones. `MIGRATION_DATABASE_URL` permite usar credenciales de migración distintas de las de ejecución.

## Base compartida entre local y el VPS

Para usar los mismos usuarios, mazos y campañas, configurar `DATABASE_URL` en el `.env` local con el host del VPS, el nombre de la base y su usuario. En el VPS se mantiene la misma base, aunque el host de conexión puede ser `127.0.0.1`. No ejecutar `docker compose up db` para este modo: crearía una instancia distinta. El backend local mantiene `APP_ORIGIN=http://localhost:5173` y el VPS usa el origen HTTPS público. Sus cookies de sesión son independientes, pero los documentos y cuentas son compartidos.

El puerto MySQL debe ser accesible desde el equipo local, directamente con acceso restringido a su IP o mediante un túnel SSH. El dominio de la web solo sirve como host de MySQL si resuelve directamente al servidor de bases de datos. `localhost` en Plesk identifica el propio VPS. La captura del proveedor utiliza MariaDB 10.11: las cuotas se calculan con `OCTET_LENGTH`, compatible también con MySQL, y la CI configura pruebas para ambos motores. MariaDB conserva JSON como texto validado ([documentación oficial](https://mariadb.com/docs/server/reference/data-types/string-data-types/json)).

## Administrador inicial

Definir `ADMIN_EMAIL`, `ADMIN_PASSWORD` y opcionalmente `ADMIN_NAME` en el `.env` privado. No se incluyen credenciales reales en semillas, migraciones ni ejemplos versionados. Después de las migraciones:

```bash
pnpm --filter @lcg/server db:migrate
pnpm --filter @lcg/server admin:provision
```

El segundo comando crea una cuenta verificada con contraseña Argon2id y rol `admin`. Si ya existe una cuenta normal con ese correo, conserva sus documentos, establece la contraseña indicada y revoca sesiones y enlaces pendientes al promoverla. Si ya es administradora, no restablece su contraseña. El registro público siempre produce cuentas normales: no acepta privilegios del navegador. El rol se obtiene de la base y se devuelve en acceso y perfil. Esto prepara la identidad administrativa; no añade todavía un panel de administración ni acceso a documentos ajenos.

La migración `002_account_roles.sql` añade los privilegios sin modificar la migración ya aplicada `001`. No ejecutar las pruebas contra la base compartida: `MYSQL_TEST_URL` debe seguir apuntando a una base aislada terminada en `_test` y queda vacío en la configuración local compartida.

## Configuración del VPS

| Variable | Uso |
| --- | --- |
| `NODE_ENV=production` | Requisitos de producción y cookies Secure |
| `DATABASE_URL` | Conexión MySQL de ejecución |
| `MIGRATION_DATABASE_URL` | Conexión opcional con permisos DDL |
| `APP_ORIGIN` | Origen exacto con HTTPS, sin ruta |
| `SERVER_HOST`, `SERVER_PORT` | Interfaz y puerto privados de Node |
| `SMTP_URL`, `MAIL_FROM` | Correo transaccional y remitente |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Cliente Google propio |
| `API_PROXY_TARGET` | Solo desarrollo: destino de la API para Vite |
| `MYSQL_TEST_URL` | Base de pruebas aislada, con nombre terminado en `_test` |

En producción se exige HTTPS y SMTP/remitente. Google es opcional mientras no se configure; sus dos credenciales deben proporcionarse juntas. Guardar secretos en el VPS, nunca en GitHub ni en capturas. Codificar los caracteres reservados en las contraseñas incluidas en URL.

El proxy inverso sirve `apps/web/dist`, resuelve las rutas SPA a `index.html` y reenvía `/api` a Fastify bajo el mismo origen. Configurar el límite HTTP de guardados en 20 MB y MySQL con paquetes de al menos 32 MB. La base permanece privada. Si está en otra máquina, configurar además el transporte y los accesos adecuados.

El workflow genera automáticamente `deploy` con el paquete completo para Plesk: raíz privada con API y herramientas, y `public/` con la web compilada. Node 24 y Passenger sirven API y rutas de la web bajo el mismo dominio. El script de despliegue instala las dependencias de producción con pnpm, aplica migraciones, provisiona el administrador y solicita el reinicio. La [guía del panel de Plesk](23-despliegue-plesk.md) describe la primera activación y las siguientes publicaciones sin SSH. Fastify confía en el proxy de loopback para obtener la IP real y aplicar los límites; si el proxy está en otra red, revisar esa lista explícitamente sin confiar en cualquier origen.

Publicación: copia recuperable, instalación con lockfile, comprobaciones, migración explícita, compilación, reinicio y pruebas de `/api/health`, `/api/ready`, correo y acceso. El volumen persistente no sustituye a una copia externa. Ante un fallo, recuperar el servicio anterior sin borrar los datos.

## Google y correo

Configurar un cliente OAuth web propio con retorno exacto:

```text
https://DOMINIO/api/auth/google/callback
```

Registrar también el retorno local de `APP_ORIGIN` si se prueba en desarrollo. Configurar consentimiento y usuarios de prueba mientras el cliente no esté publicado.

El flujo utiliza código de autorización, PKCE, `state`, `nonce` y validación del ID token con la librería de Google. Se identifica al usuario por el sujeto de Google. Una coincidencia de correo no une bibliotecas: se exige entrar primero por el método existente y vincular desde el perfil. Si Google no es autoridad sobre el correo, se envía nuestra verificación.

Las cuentas creadas solo con Google no reciben una contraseña artificial. Pueden establecerla mediante el correo de recuperación y usarla para confirmar la eliminación de cuenta. No se incluye todavía desvinculación de Google desde el perfil.

## Guardados, límites y operación

Cada aventura tiene UUID propio. Editar un mazo de la biblioteca no modifica una campaña empezada. La cola conserva el contenido e identificador de la petición hasta confirmación; los cambios posteriores forman otra operación. Los conflictos permiten conservar ambas versiones como documentos distintos.

Límites iniciales: 500 documentos activos y 150 MB de JSON por cuenta, incluyendo revisiones; paquetes individuales inferiores a 20 MB; cinco versiones recientes por campaña. El borrado conserva una tumba para evitar resurrecciones desde dispositivos atrasados, pero libera el paquete y sus revisiones. Las operaciones idempotentes conservan su registro para reconocer reintentos.

La copia local permite reintentar tras cortes, siempre que la aplicación pueda cargarse. No se añade una PWA. Al cerrar sesión se puede borrar el almacenamiento de la cuenta; conservarlo ayuda a recuperar trabajo, pero no protege frente a otra persona con acceso al perfil del navegador. IndexedDB no se cifra al cerrar sesión.

Antes de abrir al público: fijar retención y privacidad, programar limpieza de sesiones/tokens/estados OAuth vencidos, configurar copias externas y ensayar una restauración en el VPS. Después de restaurar, revocar las sesiones y tokens restaurados antes de reabrir el servicio. No borrar campañas por su fecha de último acceso.

## Verificación y configuración pendiente

CI incorpora un MySQL 8.4 real. Para pruebas locales, crear una base exclusivamente de pruebas y definir `MYSQL_TEST_URL` antes de `pnpm test`. La suite borra sus usuarios y rechaza nombres que no terminen en `_test`; no apuntarla nunca a datos reales.

Pruebas añadidas: verificación y caducidad, sesiones, CSRF, recuperación, aislamiento, concurrencia, idempotencia, revisiones, Google simulado, SMTP local y cola IndexedDB. Revisado en navegador: registro, enlace de verificación, acceso, campaña en MySQL y recuperación desde otra pestaña, y mazo visible en ambas.

El correo de la revisión manual usa un adaptador local de prueba. El transporte SMTP se prueba aparte contra un servidor local de la suite. Google se prueba con el proveedor simulado; esto no equivale a validar el cliente OAuth del propietario.

Pendiente externo: dominio y configuración del VPS/MySQL, SMTP real, cliente Google y políticas operativas. No se ha desplegado en el VPS ni probado Google o correo real del propietario.
