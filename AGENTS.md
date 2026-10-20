# Instrucciones para agentes de IA

Este archivo lo leen Codex, Claude Code y otros agentes. Las convenciones
generales del proyecto están en
[docs-proyecto/06-convenciones.md](docs-proyecto/06-convenciones.md).

## Siempre a `main`

Los cambios se suben siempre directamente a `main`, sin ramas de trabajo ni PR.

- **Trabaja en `main`.** Haz los commits ahí y súbelos con `git push origin main`.
- **Trae lo último antes de empezar y antes de subir** (`git pull --rebase`).
- **No crees ramas**, ni locales ni remotas. Para explorar o probar, usa el
  árbol de trabajo local o una carpeta temporal.
- **Pasa las comprobaciones de la CI antes de subir.** Todo lo que llega a
  `main` se despliega solo cuando pasa la CI, así que antes de cada push
  ejecuta `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` y,
  si tocas la web o el servidor, `pnpm build`.

## Rama `deploy`

`deploy` la genera el workflow `.github/workflows/deploy.yml` con la web
construida, y de ella tira Plesk. **No la toques**: ni commits a mano, ni
merges, ni la borres, ni la uses como base de otra rama.

## Commits y push

- No hagas commit ni push sin que la persona usuaria lo pida.
