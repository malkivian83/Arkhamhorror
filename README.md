# Arkham Online

Plataforma web propia para jugar a Arkham Horror: El Juego de Cartas.
Proyecto no oficial de aficionados, sin afiliación con Fantasy Flight Games.

La planificación y las decisiones están en [docs-proyecto/](docs-proyecto/README.md).

Estado revisado el 19/10/2026:

- **Brethren of Ash:** los tres escenarios completos, con cierre técnico para juego local de 1–4 investigadores. Pendiente la comprobación en teléfono físico.
- **La gala del ecuador del invierno:** fases 1–3 completadas: contratos principales de 62 cartas, respaldo EN/ES y persistencia especial. Pendientes victorias por las cinco facciones, aceptación visual y cierre estable.
- **Plataforma:** cuentas, bibliotecas privadas y sincronización con MySQL implementadas; paquete de web y API para Plesk disponible. La aceptación operativa de producción se documenta por separado.

El detalle y el siguiente bloque de trabajo están en la [hoja de ruta](docs-proyecto/05-hoja-de-ruta.md).

## Estructura

| Carpeta           | Contenido                                                      |
| ----------------- | -------------------------------------------------------------- |
| `packages/engine` | Motor de reglas puro y determinista (sin E/S, RNG con semilla) |
| `packages/cards`  | Cartas, comportamientos, investigadores, campañas y escenarios |
| `packages/shared` | Tipos del protocolo cliente/servidor                           |
| `packages/saves`  | Formato y validación compartida de guardados                   |
| `packages/i18n`   | Textos de interfaz en inglés y español                         |
| `apps/server`     | API HTTP + WebSocket (Fastify)                                 |
| `apps/web`        | Mesa de juego (Vue 3 + Vite + Pinia + vue-i18n)                |

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

Con `pnpm dev`, abre http://localhost:5173, elige la campaña Brethren of Ash o el
escenario independiente La Gala, de 1 a 4 investigadores y la dificultad.
Las imágenes de las cartas se sirven desde los archivos incluidos en nuestra web.
El modo invitado guarda en el navegador; con una cuenta y la API configurada,
la biblioteca privada permite sincronizar mazos y campañas entre dispositivos.
El motor de juego se ejecuta en el navegador; no hay multijugador online.

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
