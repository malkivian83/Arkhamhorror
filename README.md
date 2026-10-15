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
| `packages/i18n`   | Textos de interfaz en inglés y español                               |
| `apps/server`     | API HTTP + WebSocket (Fastify)                                       |
| `apps/web`        | Frontend (Vue 3 + Vite + Pinia + vue-i18n)                           |

## Requisitos

- Node.js 24 (ver `.nvmrc`)
- pnpm 12:
  ```bash
  npm install -g pnpm@12.11.2
  ```
- Docker (solo para la base de datos; aún no se usa)

## Puesta en marcha

```bash
pnpm install
```

```bash
pnpm dev
```

- Web: http://localhost:5173
- Servidor: http://localhost:3001/api/health

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
docker compose up -d db
```
