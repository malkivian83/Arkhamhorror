# 03 · Cambios necesarios para una versión propia

Inventario de todo lo que, en el código original, está ligado a su autor, a su
infraestructura o a terceros. Sirve en dos casos:

- Si seguimos la **opción A** (reimplementación, recomendada): es la lista de
  cosas que **no** debemos replicar o que tenemos que resolver por nuestra cuenta.
- Si conseguimos licencia (**opción B**) y partimos de su código: es la lista de
  cambios a aplicar.

## 1. Marca e identidad (≈26 ficheros con `halogenandtoast`, ≈31 con `arkhamhorror.app`)

| Dónde | Qué |
|---|---|
| `README.md`, `install.sh`, `upgrade.sh`, `Makefile` | URLs a su GitHub y scripts de instalación remotos |
| `docker-compose.yml` | Imagen `halogenandtoast/arkham-horror:latest` |
| `frontend/src/views/About.vue`, `frontend/src/locales/*/base.json` | Créditos, enlaces, nombre |
| `frontend/src/arkham/views/Game.vue`, `frontend-3ed/src/game/BugTools.vue` | Envío de bugs a su repositorio |
| `.github/ISSUE_TEMPLATE/*` | Plantillas apuntando a su proyecto |
| `frontend/package.json` (`"name": "arkhamhorror"`), `favicon.ico`, títulos | Nombre del producto |
| `terraform/variables.tf`, `migrations/sqitch.plan` | Nombres y dominio |

## 2. Servicios externos a sustituir o eliminar

| Servicio | Uso | Dónde | Acción |
|---|---|---|---|
| `assets.arkhamhorror.app` (CDN) | Imágenes de cartas | `frontend/src/stores/site_settings.ts`, `frontend/src/arkham/helpers.ts`, `prod.nginxconf` | **Eliminar.** Imágenes propias o renderizado de cartas por texto |
| ArkhamDB | Importar mazos, enlaces, datos | ~240 ficheros mencionan `arkhamdb.com` (mayoría datos) | Mantener solo importación de mazo por URL/ID si sus condiciones lo permiten |
| arkham.build | OAuth + importación de mazos | `config/settings.yml`, `ArkhamBuild/`, `docs/arkham-build-oauth.md` | Fuera del alcance inicial |
| Bugsnag | Errores | `package.yaml`, settings | Sustituir por logs propios / Sentry self-hosted (opcional) |
| Mailtrap | Correo (reset de contraseña) | settings | Sustituir por SMTP propio |
| DigitalOcean (K8s, Spaces/S3) | Hosting, archivado | `terraform/`, `infra/`, `digital-ocean.crt` | Eliminar; definir nuestro hosting |
| Redis | Pub/sub entre réplicas | settings | Innecesario con una sola instancia |

## 3. Secretos que **nunca** deben reutilizarse

| Fichero / valor | Motivo |
|---|---|
| `backend/arkham-api/config/client_session_key.aes` | Clave de sesión real del proyecto original |
| `jwt-secret` por defecto en `config/settings.yml` | Valor conocido públicamente |
| `backend/arkham-api/digital-ocean.crt` | Certificado de su base de datos gestionada |
| `frontend-3ed/.env.development` | Configuración de su entorno |
| Cualquier `ARKHAM_BUILD_CLIENT_*`, `MAINTENANCE_TOKEN`, tokens Bugsnag/Mailtrap | Credenciales suyas |

Todo secreto propio se genera nuevo y va en variables de entorno, nunca en git.

## 4. Alcance a recortar (no aporta al núcleo)

| Elemento | Dónde | Motivo |
|---|---|---|
| Arkham Horror 3ª edición (juego de tablero) | `backend/ah3e`, `frontend-3ed`, `ThirdEdition/`, `docs/third-edition.md` | Es otro juego |
| Idiomas distintos de EN/ES | `frontend/src/locales/{de,fr,it,ko,zh,zh-cn}`, `public/cards_{de,fr,it,ja,ko,pl,po,ru,uk,zh,zh-cn}.json`, scripts `import-*-cards` | Decisión del propietario: solo inglés y español |
| Eventos épicos multijugador | `Arkham/Epic`, `Api/Arkham/Epic.hs`, rutas `/events` | Complejidad alta, poco uso |
| Servidor MCP | `mcp/` | Herramienta de IA para cartas personalizadas |
| Cartas personalizadas publicadas/compartidas | rutas `custom-card-sets`, `published-card-sets` | Fase posterior |
| Homebrew de terceros | `frontend/homebrew/*` | Contenido de otros autores con sus propios derechos |
| Archivado S3, métricas, admin avanzado | `Api/Arkham/Archive.hs`, rutas `/admin/*` | Fase posterior |
| Tarot, logros | `Arkham/Tarot.hs`, `Achievement` | Fase posterior |
| Build offline, Nix, Emacs/Vim | `offline/`, `flake.*`, `shell.nix`, `.dir-locals.el`, `.vim/` | Herramientas personales del autor |

## 5. Mejoras técnicas que conviene hacer (sea cual sea la opción)

1. **Persistencia por eventos**: guardar semilla + configuración inicial + lista
   de decisiones de jugadores, y reconstruir por *replay* con instantáneas cada N
   pasos, en lugar de un diff de estado por paso (su tabla llegó a 94 GB).
2. **Motor puro y determinista**: sin E/S, RNG con semilla → tests y replays
   reproducibles.
3. **Datos de cartas propios**: un formato nuestro (JSON/YAML) con texto EN y ES,
   validado por esquema, en lugar de depender de `cards.json` de ArkhamDB.
4. **Tests por escenario de reglas** escritos a partir del *Rules Reference*
   (los PDF son clave aquí).
5. **Alcance incremental**: empezar por la caja básica y crecer.
6. Lenguaje y herramientas con más desarrolladores disponibles y compilación
   rápida (ver [04](04-arquitectura-propuesta.md)).
