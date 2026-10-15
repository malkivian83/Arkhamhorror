# 01 · Informe técnico del programa original

Análisis de la copia local de `halogenandtoast/ArkhamHorror` (octubre 2026), hoy en `E:\referencia\ArkhamHorror`, fuera del repositorio. Las
rutas de este informe son relativas a esa carpeta.

## 1. Qué es

Implementación web, multijugador (hasta 4 jugadores) y "fiel a las reglas" de
Arkham Horror LCG. Incluye todas las cartas de jugador anteriores a 2026,
las campañas principales y sus "Return to", historias paralelas, escenarios
desafío, importación de mazos desde ArkhamDB y arkham.build, cartas caseras
(homebrew), eventos multijugador "épicos", lecturas de tarot y, además, un
segundo juego: Arkham Horror 3ª edición (el juego de tablero).

## 2. Cifras

| Elemento | Tamaño |
|---|---|
| Ficheros en total (sin `.git`) | ~12.500 (293 MB) |
| Backend Haskell (`backend/arkham-api/library`) | ~9.000 módulos, **~570.000 líneas** |
| Tests backend | ~410 ficheros |
| Frontend Vue (`frontend/src`) | ~225 componentes `.vue` + ~230 `.ts` |
| Datos de cartas (`backend/arkham-api/data/cards.json`) | 1,5 MB (formato ArkhamDB) |
| Imágenes en el repo | 39 MB (iconos, fichas, fondos); las **cartas** vienen de un CDN externo |
| Migraciones SQL | 40 (Sqitch) |

Módulos de cartas implementados (aprox., un fichero por carta):

| Tipo | Ficheros | Tipo | Ficheros |
|---|---|---|---|
| Location | 1.462 | Act | 513 |
| Asset | 1.210 | Agenda | 462 |
| Treachery | 1.040 | Skill | 179 |
| Enemy | 942 | Scenario | 165 |
| Event | 548 | Investigator | 110 |
| Campaigns | 104 | | |

## 3. Arquitectura general

```
Navegador (Vue 3 + Pinia + vue-i18n)
   │  HTTP JSON  /api/v1/...        WebSocket (partida en tiempo real)
   ▼
Nginx ──► arkham-api (Haskell, Yesod/Warp, puerto 3002)
              │   motor de reglas (librería Arkham.*)
              ├─► PostgreSQL (partidas, pasos/undo, usuarios, mazos)
              ├─► Redis (opcional, pub/sub entre réplicas)
              └─► S3 / CDN (imágenes, archivado de partidas antiguas)
```

### 3.1 Backend (`backend/`)

| Paquete | Función |
|---|---|
| `arkham-api` | Servidor web **y** motor de reglas del LCG. Yesod + Persistent/Esqueleto + Postgres |
| `cards-discover` | Generador de código: recorre los ficheros de cartas y genera los registros/re-exports |
| `validate` | Validación de datos de cartas |
| `ah3e` | Motor del juego de tablero 3ª edición (independiente, ~95 módulos) |

Toolchain: Stack, GHC 9.14.1 (nightly), ~25 extensiones de lenguaje por defecto
(GADTs, DataKinds, TypeFamilies…). Compilar en frío necesita **5–9 GB de RAM**
(comentarios en `backend/stack.yaml`).

### 3.2 El motor de reglas (lo más valioso conceptualmente)

Es un **intérprete de mensajes**:

1. **Estado del juego** (`Arkham/Game.hs`, 7.500 líneas): un registro con todas
   las entidades (investigadores, localizaciones, enemigos, cartas en juego,
   bolsa del caos, acto/plan, fase, cola de mensajes…).
2. **Mensajes** (`Arkham/Message.hs`, ~3.150 líneas): un tipo algebraico enorme
   con todo lo que puede ocurrir (`Move`, `TakeDamage`, `BeginSkillTest`,
   `UseThisAbility`…).
3. **Cola** (`Arkham/Queue.hs`): los mensajes se encolan; el bucle principal
   (`Arkham/Game/Runner.hs`, 4.700 líneas) saca uno y se lo pasa a **todas** las
   entidades.
4. **Cada carta es un tipo** con tres comportamientos (ver
   `Arkham/Asset/Assets/Machete.hs` como ejemplo típico de ~60 líneas):
   - `HasAbilities`: qué habilidades ofrece y con qué coste/criterio.
   - `HasModifiersFor`: modificadores continuos que aplica a otros.
   - `RunMessage`: cómo reacciona a cada mensaje (puede encolar más).
5. **Ventanas de tiempo** (`Window`): puntos donde se ofrecen reacciones
   (`[reaction]`, `[free]`, "forced") según el *Rules Reference*.
6. **Matchers** (`Arkham/Matcher/*`, ~14.000 líneas): un DSL para describir
   "cualquier enemigo enfrentado contigo", "una localización con pistas"…
7. **Preguntas** (`Question`): cuando el motor necesita una decisión, se detiene y
   envía al cliente las opciones; la respuesta del jugador reanuda la cola.
8. **Deshacer**: cada paso guarda un *diff* JSON del estado (`arkham_steps`), lo
   que permite deshacer acción, turno, fase, ronda o escenario.

Definición de cartas: cada tipo tiene un módulo `Cards.hs` con `CardDef`
(coste, iconos, rasgos…) y un módulo por carta con su comportamiento. El texto y
los datos estáticos vienen de `cards.json` (formato ArkhamDB).

### 3.3 Frontend (`frontend/`)

Vue 3 + Vite + TypeScript + Pinia + vue-router + vue-i18n + axios; GSAP/Lottie
para animaciones. El cliente **no conoce las reglas**: pinta el estado JSON que
recibe y devuelve la opción elegida. Tiene además: constructor de mazos,
editor de cartas personalizadas, modo depuración, registro de partida narrado,
chat, espectador y un *harness* de pruebas visuales.

Las imágenes de cartas se resuelven contra `https://assets.arkhamhorror.app`
(`src/stores/site_settings.ts`, `src/arkham/helpers.ts`).

### 3.4 Otros directorios

| Directorio | Contenido |
|---|---|
| `frontend-3ed/` | Frontend del juego de tablero 3ª ed. |
| `migrations/` + `setup.sql` | Esquema Postgres (Sqitch) |
| `terraform/`, `infra/` | Despliegue en DigitalOcean Kubernetes |
| `.github/workflows` | CI: build Haskell, hadolint, build offline |
| `offline/` | Empaquetado autocontenido sin Docker |
| `mcp/` | Servidor MCP (Python) para que una IA cree cartas personalizadas; incluye extractos del *Rules Reference* en Markdown |
| `docs/` | Documentación interna (log de partida, archivado, homebrew, OAuth…) |

## 4. Puntos fuertes

- Motor muy completo y fiel a las reglas, con un modelo (mensajes + ventanas +
  modificadores + matchers) que **encaja muy bien con el juego**.
- Cliente "tonto": todas las reglas viven en el servidor → no se puede hacer
  trampa y el cliente es sencillo de sustituir.
- Deshacer granular, espectadores, reconexión.
- Gran cobertura de contenido.

## 5. Puntos débiles / riesgos

- **Sin licencia** (ver [02](02-aspectos-legales.md)): no podemos reutilizarlo libremente.
- **Haskell avanzado**: curva de aprendizaje alta, pocos desarrolladores,
  compilaciones lentas y con mucha memoria; GHC nightly.
- **Tamaño**: 570k líneas son inmanejables para un equipo pequeño.
- **Almacenamiento**: guardar un diff de estado por paso hizo que la tabla de
  pasos ocupe 94 de 98 GB en producción (`docs/step-storage.md`).
- Mucho alcance accesorio (3ª edición, eventos épicos, MCP, tarot, homebrew
  publicado, archivado S3, 13 idiomas) que complica el núcleo.
- Dependencia de servicios de terceros (CDN propio, ArkhamDB, arkham.build,
  Bugsnag, Mailtrap, DigitalOcean).

## 6. Conclusión

El valor reutilizable **no es el código** (por licencia, lenguaje y tamaño), sino
el **diseño del motor** y el conocimiento de los casos difíciles de las reglas.
Recomendación: construir un motor propio desde cero inspirado en ese modelo
(ver [04](04-arquitectura-propuesta.md)), empezando por un alcance pequeño.
