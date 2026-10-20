# 06 · Convenciones de desarrollo

## Repositorio

- Remoto: `https://github.com/malkivian83/Arkhamhorror.git` (privado), rama principal `main`.
- **Prohibido** subir código, imágenes o textos copiados del proyecto original
  o de FFG. El código de referencia vive fuera del repositorio.
- Los PDF de reglas van en `reglas/` y están ignorados por git.
- Secretos solo en `.env` (ignorado); se documentan en `.env.example` sin valores.

## Ramas y commits

- Se sube siempre directamente a `main`, sin ramas de trabajo ni pull requests.
- Commits pequeños, mensaje en imperativo ("Añadir prueba de habilidad").
- Antes de subir, las comprobaciones de la CI en verde: lo que llega a `main`
  se despliega solo.
- Reglas para agentes de IA: [AGENTS.md](../AGENTS.md).

## Código

- TypeScript `strict`; ESLint + Prettier.
- El paquete `engine` no importa nada de red, disco, fecha ni `Math.random`.
- Nombres de código en inglés (coinciden con el *Rules Reference* en inglés);
  documentación y comentarios largos pueden ir en español.
- Un fichero por carta con comportamiento; los datos de cartas en JSON.

## Tests

- Toda regla implementada lleva al menos un test, citando la sección del
  *Rules Reference* (p. ej. `// RR: "Skill Tests", paso ST.4`).
- Toda carta con comportamiento lleva un test de su efecto principal.
- Los errores de reglas encontrados jugando se reproducen primero con un test.

## Idiomas

- Solo **inglés (`en`)** y **español (`es`)**.
- Ningún texto visible al usuario escrito directamente en el código: siempre
  clave i18n.
- Terminología española: la de la edición oficial en castellano (tomarla de los
  PDF en español), recogida en un glosario `docs/glosario.md` cuando empiece el
  desarrollo.
