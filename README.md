# Plataforma LCG

Plataforma web propia para jugar a Arkham Horror: El Juego de Cartas.
Proyecto no oficial de aficionados, sin afiliación con Fantasy Flight Games.

La planificación y las decisiones están en [docs-proyecto/](docs-proyecto/README.md).

## Estructura

| Carpeta           | Contenido                                                            |
| ----------------- | -------------------------------------------------------------------- |
| `packages/engine` | Motor de reglas puro y determinista (sin E/S, RNG con semilla)       |
| `packages/cards`  | Definiciones de cartas (datos EN/ES y, más adelante, comportamiento) |
| `packages/shared` | Tipos del protocolo cliente/servidor                                 |
| `packages/saves`  | Formato y validación compartida de guardados                         |
| `packages/i18n`   | Textos de interfaz en inglés y español                               |
| `apps/server`     | API HTTP + WebSocket (Fastify)                                       |
| `apps/web`        | Mesa de juego (Vue 3 + Vite + Pinia + vue-i18n)                      |

## Requisitos

- Node.js 24 (ver `.nvmrc`)
- pnpm 12:
  ```bash
  npm install -g pnpm@12.11.2
  ```
- Docker para MySQL y el buzón de correo de desarrollo (opcional para jugar como invitado)

## Puesta en marcha

```bash
pnpm install
```

```bash
pnpm dev
```

- Web: http://localhost:5173
- Servidor: http://localhost:3001/api/health

## Jugar

Con `pnpm dev`, abre http://localhost:5173, elige de 1 a 4 investigadores y la
dificultad, y empieza "Spreading Flames". Las imágenes de las cartas se cargan
de ArkhamDB mientras juegas. La partida se guarda en el navegador.

Para regenerar los datos de las cartas de jugador:

```bash
node scripts/import-core-2026.mjs
```

## Comprobaciones (las mismas que la CI)

```bash
pnpm format:check
```

```bash
pnpm lint
```

```bash
pnpm typecheck
```

```bash
pnpm test
```

```bash
pnpm build
```

## Base de datos

```bash
cp .env.example .env
```

```bash
docker compose up -d db mail
```

```bash
pnpm --filter @lcg/server db:migrate
```

El registro, Google y las bibliotecas privadas se configuran siguiendo la
[guía de cuentas y MySQL](docs-proyecto/22-implementacion-cuentas-mysql.md).
La web conserva el modo invitado cuando no se configura el servicio de cuentas.

Para publicar web y API desde el panel, seguir la
[guía de despliegue completo en Plesk, sin SSH](docs-proyecto/23-despliegue-plesk.md).
