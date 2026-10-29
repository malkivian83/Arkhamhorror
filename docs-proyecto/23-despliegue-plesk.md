# 23 · Despliegue completo desde Plesk, sin SSH

El workflow publica una aplicación Node.js completa en `deploy`. `public/` contiene la web compilada; el resto contiene la API, sus migraciones y las herramientas de instalación. No modificar ni subir commits manualmente a `deploy`.

## CI por alcance y reutilización del paquete

`scripts/ci/plan.mjs` compara todo el rango de un push, o el merge base de una PR.
Cuenta también eliminaciones y ambos lados de un renombrado. Si falta historial,
hay una ruta desconocida o cambia configuración común, ejecuta los controles completos.
La selección aparece en el resumen de la ejecución de GitHub Actions.

| Cambio                                                                       | Controles seleccionados                                                                                                                            |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Changelog, traducciones JSON o estilos CSS/SCSS                              | Formato/lint de archivos editados y pruebas de idiomas; sin SQL ni suite de reglas.                                                                |
| Código de la web                                                             | Formato/lint y pruebas de la web.                                                                                                                  |
| Cartas o evidencias                                                          | Pruebas de cartas, importación y consumidores (web, guardados y servidor), tipos e imágenes. Se conserva este alcance por los registros dinámicos. |
| Servidor o migraciones                                                       | Pruebas del servidor y consumidores, tipos, MySQL y verificación de instalación.                                                                   |
| Motor, contratos, guardados, dependencias, instalación o configuración común | Formato/lint, tipos y suite completos, imágenes, MySQL y verificación de instalación.                                                              |

Los cambios combinados suman sus controles. MariaDB se añade solo en PR que
necesiten SQL; las pruebas SQL incluyen cuentas y salas. Los cambios exclusivamente
documentales siguen sin lanzar CI, excepto las evidencias utilizadas por las pruebas.

Cada CI compila una sola vez la web (incluidos sus tipos) y genera el paquete Plesk
con el SHA del commit. Guarda `plesk-<sha>` durante siete días como un tar comprimido,
conservando archivos ocultos y permisos. Las comprobaciones SQL instalan y verifican
una copia de ese mismo paquete; nunca alteran el artefacto publicado.

Deploy solo descarga el artefacto de una CI correcta de un push propio a `main`,
comprueba la revisión de `deploy-info.json` y lo publica. No recompila ni instala
dependencias en GitHub; la instalación de producción sigue correspondiendo a Plesk.
Para un despliegue manual hay que indicar el ID de una CI correcta de `main` con
artefacto disponible. Si ha caducado, vuelve a ejecutar esa CI antes de desplegar:
no se sustituye silenciosamente por una compilación nueva sin validar.

## Primera activación en el panel

1. En **Git > Configuración**, cambiar temporalmente el modo a **Manual** para preparar el cambio de estructura. La web actual puede seguir sirviendo desde su carpeta anterior.
2. Crear una carpeta **`arkham-app`** desde el administrador de archivos. Será la raíz privada de la aplicación, fuera de la carpeta pública actual.
3. En **Git**, mantener la rama **`deploy`** y cambiar la **ruta de acceso al servidor** a **`/arkham-app`**. Cuando GitHub haya publicado el paquete completo, hacer **Pull ahora** y **Desplegar ahora**. Si se utiliza el ZIP entregado antes de publicar el workflow, subirlo y extraer su contenido directamente dentro de `arkham-app`; `app.cjs`, `package.json`, `tools` y `public` deben quedar en ese nivel.
4. Subir el archivo privado de producción como **`/arkham-app/.env`**. Nunca colocarlo dentro de `public`. La conexión de base en el VPS utiliza `127.0.0.1`, el usuario/base de Plesk y su contraseña. Mantener `NODE_ENV=production`, `APP_ORIGIN=https://arkham-online.es`, SMTP y las credenciales iniciales del administrador. Google es opcional hasta disponer de sus dos credenciales; el botón permanece oculto si ambas están vacías.
5. En **Dominios > arkham-online.es > Node.js**, seleccionar:

   | Campo                 | Valor                    |
   | --------------------- | ------------------------ |
   | Versión de Node.js    | **24**                   |
   | Modo                  | **Production**           |
   | Raíz de la aplicación | **`/arkham-app`**        |
   | Raíz de documentos    | **`/arkham-app/public`** |
   | Archivo de inicio     | **`app.cjs`**            |

   Plesk exige que la raíz de documentos sea una subcarpeta de la aplicación ([documentación oficial](https://docs.plesk.com/en-US/obsidian/administrator-guide/website-management/nodejs-support.76652/)). Este cambio garantiza que HTTP solo exponga los archivos públicos. La API y las rutas de Vue funcionan bajo el mismo dominio a través de Passenger.

6. En **Node.js > Ejecutar script**, ejecutar **`deploy:plesk`**. No es necesario pulsar **NPM install**: nuestro instalador utiliza pnpm para las dependencias de este monorepositorio.
7. Si termina correctamente, activar Node.js y pulsar **Reiniciar aplicación** la primera vez. Abrir `/api/health`, `/api/ready` y `/account` en el dominio. Los dos primeros deben devolver `{"status":"ok"}` (health incluye además la versión). Acceder con el administrador configurado. El script no envía correos; el registro y la recuperación los envían al solicitarlos.

## Despliegues siguientes

Después de verificar la primera instalación, activar en **Git** el modo **Automático** y habilitar las acciones adicionales con esta única línea:

```bash
/opt/plesk/node/24/bin/node tools/deploy-plesk.mjs
```

La orden se ejecuta desde la carpeta de despliegue. Si Plesk instala Node 24 en otra ubicación, utilizar la ruta que muestre el panel para esa versión.

El script usa la ruta del propio Node para localizar npm, descarga la versión exacta de pnpm fijada por el proyecto en la caché del usuario e instala las dependencias de producción con el lockfile. No necesita sudo, SSH, pnpm global ni modificaciones del PATH del sistema. A continuación aplica las migraciones numeradas y crea o promueve el administrador. Si ya existe un administrador, puede omitirse su contraseña inicial del `.env`; repetir el alta no cambia su contraseña actual.

Solo después de completar esos pasos escribe `tmp/restart.txt`, el mecanismo de reinicio de Passenger ([documentación oficial](https://www.phusionpassenger.com/docs/references/config_reference/nginx/#passenger_restart_dir)). Ante un fallo, el script devuelve un error y no solicita el reinicio. El mensaje indica qué falta sin imprimir contraseñas ni tokens. No se revierte automáticamente una migración aplicada: mantener las copias de seguridad de la base y usar migraciones compatibles con la versión anterior.

`tmp/deploy.lock` evita ejecuciones simultáneas. Si se interrumpe el proceso por la fuerza, comprobar que ya no se está ejecutando antes de eliminar ese archivo desde el administrador de archivos y repetir el script.

## Comprobaciones y límites

- **pnpm no encontrado:** la acción debe invocar Node con su ruta absoluta y nuestro script, no un comando `pnpm` suelto.
- **Falta `public/index.html`:** se ha desplegado el paquete antiguo o una carpeta incorrecta. Revisar que estén `app.cjs`, `tools` y `public` juntos.
- **Sin permiso de conexión MySQL:** comprobar usuario, contraseña, base y permisos en Plesk. Desde el VPS se usa `127.0.0.1`; que el puerto no sea accesible desde Internet no impide esa conexión local.
- **Error al instalar paquetes:** el usuario de la suscripción necesita acceso HTTPS al registro npm y permiso de escritura en la aplicación y su caché. Si no aparece Node.js 24 con npm en el panel, debe habilitarlo el proveedor o administrador de Plesk.
- **Web responde pero `/api` devuelve HTML:** eliminar las reglas antiguas de SPA que reescriban `/api` a `index.html`, tanto en `public/.htaccess` como en directivas adicionales de nginx si las hubiera. Las rutas las gestiona Node/Passenger. Comprobar además que Node.js está habilitado, `app.cjs` es el archivo de inicio y la raíz de documentos termina en `/public`.
- **Dominio preferido y origen:** la dirección final del navegador debe coincidir exactamente con `APP_ORIGIN`. Si Plesk redirige a `www.arkham-online.es`, usar ese origen en el `.env` o cambiar el dominio preferido a la variante sin `www`. Reiniciar la aplicación después de editar el `.env`.
- **Credenciales Google incompletas:** rellenar ambas o dejar ambas vacías. Su retorno será `https://arkham-online.es/api/auth/google/callback`.

El paquete excluye `.env`, pruebas, cachés y archivos locales. Las pruebas de base de datos solo usan bases aisladas terminadas en `_test`. Para construir un ZIP local se utiliza `pnpm build:plesk` y se comprime el contenido de `dist/plesk`. La carpeta de salida debe estar vacía antes de una nueva construcción.
