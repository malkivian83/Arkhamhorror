# Instrucciones para agentes de IA

Este archivo lo leen Codex, Claude Code y otros agentes. Las convenciones
generales del proyecto están en
[docs-proyecto/06-convenciones.md](docs-proyecto/06-convenciones.md).

## Ramas: las mínimas

El repositorio debe tener solo `main`, `deploy` y las ramas con una PR abierta.

- **Antes de crear una rama**, mira si ya hay una PR abierta para esa tarea
  (`gh pr list`). Si existe, trabaja en su rama.
- **Una rama por tarea, no por paso.** Las correcciones, los ajustes tras una
  revisión y los arreglos de CI van en la misma rama y la misma PR.
- **No crees ramas para explorar o probar.** Para eso usa el árbol de trabajo
  local o una carpeta temporal, sin subirlas a GitHub.
- **No subas una rama sin abrir su PR.** Cada rama remota debe tener una PR
  abierta; si no va a tenerla, no la subas.
- **Al fusionar la PR, borra la rama** remota y la local
  (`gh pr merge --delete-branch`).
- **Si una rama ya está fusionada en `main`**, bórrala en vez de reutilizarla.
  Lo está si `git rev-list --count origin/main..<rama>` da 0. La siguiente
  tarea parte de `main` actualizado.
- Nombres: `feat/…`, `fix/…`, `docs/…`, `chore/…`, cortos y en minúsculas.

## Rama `deploy`

`deploy` la genera el workflow `.github/workflows/deploy.yml` con la web
construida, y de ella tira Plesk. **No la toques**: ni commits a mano, ni
merges, ni la borres, ni la uses como base de otra rama.

## Commits y push

- No hagas commit, push ni PR sin que la persona usuaria lo pida.
- Todo lo que llega a `main` se despliega solo cuando pasa la CI, así que no
  hagas push directo a `main`: usa siempre una PR.
