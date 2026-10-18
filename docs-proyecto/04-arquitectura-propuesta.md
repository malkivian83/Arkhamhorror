# 04 · Arquitectura propuesta

Propuesta para un programa propio, escrito desde cero, que reutiliza **ideas**
del original (motor de mensajes, ventanas, modificadores, cliente sin reglas)
pero no su código. Stack decidido: TypeScript (ver [07](07-dudas-abiertas.md)).

## 1. Stack (implantado en el esqueleto, 2026-10-15)

| Capa | Elección | Por qué |
|---|---|---|
| Lenguaje | **TypeScript 6.0** en todo el proyecto (7.0 aún no lo soporta typescript-eslint) | Un solo lenguaje, tipos compartidos cliente/servidor, mucha gente lo conoce, compila en segundos |
| Monorepo | pnpm 12 workspaces, Node 24 | Paquetes separados con dependencias claras |
| Motor | Paquete TS puro, sin dependencias de E/S (lo vigila una regla de ESLint) | Testeable, determinista, ejecutable en servidor y (para pruebas) en navegador |
| Servidor | Node.js + Fastify 5 + `@fastify/websocket`, ejecutado con `tsx` | Ligero; HTTP para lobby/mazos, WS para la partida |
| Base de datos | PostgreSQL 17 (ORM por decidir al implementar la persistencia) | Relacional para usuarios/mazos, JSONB para partidas |
| Frontend | Vue 3 + Vite 8 + Pinia + vue-router + vue-i18n | Mismo ecosistema que el original (conocido y probado para este juego) |
| Calidad | ESLint + Prettier + Vitest; Playwright más adelante | |
| CI | GitHub Actions: format, lint, typecheck, test, build | |
| Despliegue | Docker Compose en un VPS | Suficiente para un grupo de jugadores |

## 2. Estructura del repositorio

```
/
├─ packages/
│  ├─ engine/        @lcg/engine  Motor de reglas puro (estado, mensajes, ventanas, preguntas)
│  ├─ cards/         @lcg/cards   Definiciones de cartas: datos + comportamiento
│  ├─ shared/        @lcg/shared  Tipos del protocolo cliente/servidor
│  └─ i18n/          @lcg/i18n    Textos de interfaz EN/ES
├─ apps/
│  ├─ server/        @lcg/server  API HTTP + WebSocket + persistencia
│  └─ web/           @lcg/web     Frontend Vue
├─ data/cards/       (futuro) Datos estáticos de cartas por set (en, es)
└─ docs-proyecto/    Documentación (estos .md)
   └─ reglas/        PDFs de reglas, guías y FAQ
```

Los paquetes exportan directamente su código fuente TypeScript (`exports:
./src/index.ts`); Vite y `tsx` lo compilan al vuelo, así que no hay paso de
compilación entre paquetes.

## 3. El motor

### 3.1 Principios

- **Función pura**: `aplicar(estado, entrada) → { estado, pregunta | fin }`.
- **Determinista**: el RNG (barajar, bolsa del caos) usa una semilla guardada
  en el estado.
- **Serializable**: todo el estado es JSON plano.
- **Las reglas viven solo aquí**: el cliente nunca decide nada.

### 3.2 Conceptos

| Concepto | Descripción |
|---|---|
| `GameState` | Investigadores, localizaciones, enemigos, cartas en juego/mano/mazo/descarte, bolsa del caos, acto/plan, fase, ronda, cola, RNG |
| `Message` | Unión discriminada de todo lo que puede ocurrir (`MoveTo`, `DealDamage`, `BeginSkillTest`, `RevealChaosToken`…) |
| Cola | Pila LIFO de mensajes; cada manejador puede insertar mensajes nuevos delante |
| Entidad / carta | Objeto con `abilities()`, `modifiers()` y `handle(message)` |
| `Window` | Momento de tiempo ("después de entrar en una localización", "cuando vayas a recibir daño") donde se ofrecen reacciones y efectos forzados |
| Modifier | Efecto continuo calculado bajo demanda (+1 combate, no puede moverse…) |
| Matcher | Selectores componibles: `enemy.engagedWith(you).and(enemy.hasTrait('Monster'))` |
| `Question` | Petición de decisión al jugador: elegir una opción, elegir objetivo, confirmar, repartir daño… |
| Skill test | Máquina de estados propia siguiendo el diagrama de pruebas de habilidad del *Rules Reference* |

### 3.3 Ciclo

```
entrada del jugador ──► motor.aplicar()
                          ├─ procesa mensajes de la cola
                          │    └─ cada carta/entidad reacciona y encola más
                          ├─ abre ventanas → reacciones / forzados
                          └─ se detiene al necesitar una decisión → Question
servidor guarda la entrada, difunde el nuevo estado (vista por jugador)
```

### 3.4 Cartas

Cada carta = **datos** + **comportamiento**:

```jsonc
// data/cards/core/01020.json  (datos, EN + ES)
{ "code": "01020", "type": "asset", "class": "guardian", "cost": 3,
  "slots": ["hand"], "icons": { "combat": 1 }, "traits": ["Item", "Weapon", "Melee"],
  "name": { "en": "...", "es": "..." }, "text": { "en": "...", "es": "..." } }
```

```ts
// packages/cards/src/core/01020.ts  (comportamiento)
export default defineAsset('01020', {
  abilities: (self) => [fightAbility(self, { modifiers: [skill('combat', +1)] })],
  modifiers: (self, game) => /* +1 daño si es el único enemigo enfrentado */ [],
});
```

La mayoría de cartas deberían poder expresarse con **plantillas declarativas**;
las raras, con código. El texto de las cartas lo introducimos nosotros (o se
importa de una fuente con permiso) en EN y ES.

## 4. Servidor

- **HTTP**: registro/login (contraseña con argon2, sesión con cookie httpOnly),
  mazos, crear/unirse a partida, lobby.
- **WebSocket por partida**: el cliente envía `{ answer }`; el servidor aplica,
  persiste y envía a cada jugador **su vista** del estado (sin mano ajena ni
  orden del mazo).
- Una sola instancia al principio; nada de Redis.

## 5. Persistencia (event sourcing)

| Tabla | Contenido |
|---|---|
| `users` | Cuenta, idioma preferido (`en`/`es`) |
| `decks` | Lista de cartas, investigador, origen (importado/manual) |
| `games` | Escenario/campaña, semilla, versión del motor, configuración, estado |
| `game_inputs` | `(game_id, seq, player, answer)` — decisiones de los jugadores |
| `game_snapshots` | Estado completo cada N entradas, para cargar rápido |
| `campaigns` | Registro de campaña entre escenarios |

Deshacer = reconstruir desde la última instantánea hasta `seq - k`.
La versión del motor se guarda para no romper partidas antiguas al actualizar.

## 6. Frontend

- Vistas: login, lobby, constructor de mazos, mesa de juego, registro de campaña.
- La mesa pinta el estado recibido y muestra la `Question` actual como botones
  o elementos seleccionables.
- **Cartas renderizadas por plantilla** (marco + texto + iconos) en lugar de
  escaneos; imagen real opcional si el usuario la tiene en local.
- i18n con vue-i18n: solo `en` y `es`.

## 7. Idiomas

- Interfaz: ficheros `en.json` y `es.json`.
- Cartas: campos `name`/`text`/`flavor` con claves `en` y `es`.
- El log de partida se genera con claves i18n + parámetros, no con texto fijo.
