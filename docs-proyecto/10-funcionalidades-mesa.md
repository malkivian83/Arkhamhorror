# 10 · Funcionalidades de la mesa (comparación con el proyecto de referencia)

Objetivo del propietario: que la mesa se comporte de forma similar al proyecto
de referencia "en casi todo". Este documento enumera lo que hace la referencia
(revisado en `E:\referencia\ArkhamHorror\frontend\src\arkham`) y el estado en
nuestro proyecto. Se reimplementa con código propio; no se copia.

Leyenda: ✅ hecho · 🟡 parcial · ⬜ pendiente · ✖ fuera de alcance por ahora.

## Mesa y zonas

| Funcionalidad | Referencia | Estado |
|---|---|---|
| Plan, acto, mazo y descarte de encuentros arriba | `Scenario.vue`, `Agenda`, `Act`, `EncounterDeck` | ✅ |
| Mapa de localizaciones con conexiones | `Location`, `LocationCell`, `Connections` | ✅ |
| Fichas de pistas/perdición sobre las cartas | `Token`, `TokenPool` | 🟡 pistas sí; perdición en cartas no |
| Investigadores, enemigos y traiciones vinculadas en cada localización | `Location`, `Enemy`, `Treachery` | ✅ |
| Minis de investigador sobre el mapa, que se deslizan al moverse | `Location` (`investigator-mini-mover`) | ✅ recortadas del retrato de la carta oficial (no hay imágenes públicas de las minis) y animadas con View Transitions |
| Zona del investigador con pestañas | `Player`, `PlayerTabs` | ✅ |
| Fichas redondas de recursos, pistas, daño y horror | `Resources` | ✅ |
| Mano jugable resaltada; apoyos en juego; zona de amenaza | `HandCard`, `Asset` | ✅ |
| Cartas agotadas giradas | `Card` | ✅ |
| Ampliar carta al pasar el ratón + texto traducido al lado | `CardImage`, `CardDetailsModal` | ✅ |
| Ver la pila de descartes (encuentros y jugador) | `EncounterDiscard`, `CardListView` | ✅ clic en el descarte de encuentros o en el del investigador abre todas las cartas; mazos con el reverso oficial (copia local) |
| Zona de victoria visible | `VictoryDisplay` | ✅ pila con la última carta y contador; clic para verlas todas |
| Cartas debajo de otras / pilas | `CardsUnderIndicator`, `StackIndicator` | ⬜ |
| Menú de habilidades sobre cada carta | `AbilitiesMenu`, `AbilityButton` | ✅ menú al hacer clic con botones como los de la referencia (acción básica, coste, nombre y color de la habilidad); moverse, jugar y elegir objetivo van directos |

## Prueba de habilidad

| Funcionalidad | Referencia | Estado |
|---|---|---|
| Panel con pasos ST.1–ST.8 | `SkillTest.vue` | ✅ |
| Carta origen contra investigador, valor contra dificultad | `SkillTest.vue` | ✅ |
| Comprometer cartas desde la mano y verlas en el panel | `CommittedSkills` | ✅ (también otros investigadores de la misma localización, 1 carta cada uno) |
| Revelar ficha haciendo clic en la bolsa | `ChaosBag` | ✅ |
| Bolsa con el modificador de cada ficha y probabilidad | `ChaosBagWindow` | ✅ |
| Resultado y "aplicar resultados" | `SkillTest.vue` | ✅ |
| Animación de la ficha revelada | `ChaosTokenMorph` | ✅ la ficha sube de la bolsa girando (sin animación si el sistema pide movimiento reducido) |
| "Saltar disparadores" (ocultar ventanas sin efecto) | `SkillTest.vue` | ⬜ (ya hay ventanas de reacción; falta la opción de saltarlas) |

## Preguntas, historia y animaciones

| Funcionalidad | Referencia | Estado |
|---|---|---|
| Opciones sobre la mesa y botones laterales | `Question`, `QuestionChoices` | ✅ |
| Ventana modal para elecciones largas (repartir, elegir cartas, ordenar) | `ChoiceModal`, `PutBackInAnyOrder` | 🟡 ventana central para las elecciones que no se hacen sobre la mesa, con la carta que se resuelve y minimizable; falta ordenar cartas |
| Textos de historia: prólogo, introducción, preparación, resoluciones, códex | `StoryEntry`, `StoryQuestion`, `CodexEntry` | ✅ los tres escenarios, con efectos de campaña y decisiones; resúmenes propios y textos oficiales en local (ver abajo), con botón para alternar |
| Inicio de partida: elegir jefe y mulligan | `ChooseLeadInvestigator`, `InvestigatorMulligan` | ✅ el jefe se elige al empezar; el mulligan se hace sobre la mano (cartas resaltadas) con "Quedarme con esta mano" / "Robar N cartas nuevas y terminar" |
| Carta robada destacada (encuentro revelándose) | `Draw`, `DrawSpotlight` | ✅ la carta se da la vuelta en grande en el centro y espera a "De acuerdo" (Intro/Esc); si hay varias, en cola |
| Avisos (toasts) | `vue-toastification` | ⬜ |

## Registro, deshacer y herramientas

| Funcionalidad | Referencia | Estado |
|---|---|---|
| Registro de partida con secciones por ronda/fase | `GameLog`, `LogGroupBlock` | ✅ básico |
| Iconos y enlaces a cartas en el registro | `LogIcons`, `LogPart` | ⬜ |
| Chat en el registro | `GameLog` ("Say something…") | ⬜ (con multijugador) |
| Deshacer: acción, turno, fase, ronda, escenario | `HistoryPanel`, menú "Undo" | ✅ paso, acción, turno y ronda (se repiten las decisiones desde el estado inicial; sobrevive a recargar) |
| Atajos de teclado (robar, recurso, terminar turno, deshacer…) | `Game.vue` | ✅ D, R, E, 1–9, Intro, U, Ctrl+Z, Ctrl+⇧+Z |
| Exportar registro / partida | `ExportLogDialog` | ⬜ |
| Herramientas de depuración | `debug/*` | ⬜ |
| Reportar fallo | "File Bug" | ✖ (sin servidor propio de incidencias aún) |

## Campaña, mazos y multijugador

| Funcionalidad | Referencia | Estado |
|---|---|---|
| Registro de campaña (notas, trauma, experiencia) | `CampaignLog*` | ✅ pantalla de campaña con escenarios, notas, bolsa del caos, experiencia, trauma, muertos/enloquecidos y apoyos de historia |
| Pasar al siguiente escenario | `Campaign`, `ContinueCampaign` | ✅ se guarda el resultado y se prepara el siguiente con trauma, bolsa, apoyos de historia y debilidades ganadas; campaña completa (ganada o perdida) |
| Mejorar el mazo con experiencia | `UpgradeDeck`, `XpBreakdown` | ✅ comprar y mejorar cartas según las opciones de cada investigador (las 22 cartas de nivel 1–5 implementadas) |
| Mazos: crear, listar, importar de ArkhamDB | `NewDeck`, `DeckList`, `ArkhamDbDeck` | ✅ pantalla «Mazos»: crear (vacío o desde el inicial), editar con el catálogo permitido y validación, importar de ArkhamDB y elegir mazo al empezar la campaña |
| Multijugador en línea: sala, unirse, ocupar asiento, espectador | `MultiplayerLobby`, `ClaimSeat`, `JoinGame` | ⬜ |
| Repetición de partidas | `ReplayGame` | ⬜ |
| Logros, tarot, cartas propias, mercado | varios | ✖ |

## Orden propuesto

1. **Deshacer** (acción/turno/ronda) y **atajos de teclado**.
2. **Textos de historia** (introducción y resoluciones del escenario) y **modal** de elecciones.
3. **Ver descartes** y **zona de victoria**; carta robada destacada; animación de ficha.
4. ✅ **Resto de cartas de jugador**, habilidades de investigador y debilidades (ver más abajo).
5. **Campaña** (registro, experiencia, mejoras) y los escenarios II y III.
   - 5a ✅ Registro de campaña, experiencia y trauma, pantalla entre escenarios y compra de cartas.
   - 5b ✅ Las 22 cartas de nivel 1–5 (ver "Cartas de nivel 1–5" más abajo).
   - 5c ✅ Escenario II: Smoke and Mirrors (códex, sospechosos, esquivo): ver [11-smoke-and-mirrors.md](11-smoke-and-mirrors.md).
   - 5d ✅ Escenario III: Queen of Ash: ver [12-queen-of-ash.md](12-queen-of-ash.md).
6. ✅ **Mazos** propios e importación (ver "Mazos propios" más abajo).
7. **Multijugador en línea** con el servidor.

## Textos de historia oficiales (opcional, solo en local)

Los textos de la guía de campaña son de Fantasy Flight Games, así que el
repositorio solo lleva **resúmenes propios**. Para ver los textos oficiales en
tu equipo:

```bash
node scripts/import-story-texts.mjs E:/referencia/ArkhamHorror
```

genera `apps/web/public/local-assets/story/en.json` (carpeta que git ignora) con el
prólogo, las introducciones, los pasos de preparación, los códex y las resoluciones
de Brethren of Ash. En español, la mesa muestra el texto oficial en inglés si no hay
traducción, con un botón para pasar al resumen propio. También se puede escribir a
mano un `es.json` con la clave del cuerpo y el texto (párrafos separados por una
línea en blanco; "» " marca una instrucción, "• " un punto de lista, `*negrita*` y
`_cursiva_`):

```json
{
  "story.spreadingFlames.intro": "Primer párrafo…\n\nSegundo párrafo…",
  "story.spreadingFlames.resolution1": "…"
}
```

Las claves son las de los textos de historia de los ficheros de idioma (`story.*`). Los textos que estén en el fichero sustituyen al resumen y la
mesa deja de mostrar la nota de "resumen propio".

## Cartas de jugador (paso 4)

Implementadas todas las cartas de los cinco mazos iniciales de la caja de 2026,
con sus investigadores y debilidades:

- **Reacciones**: ventana general en el motor (`Reactions`) que pregunta a cada
  investigador por las reacciones posibles de su investigador, sus apoyos y los
  eventos de su mano que se juegan "después de…" (Lesson Learned, Gather Intel,
  "Look what I found!", Ward of Protection).
- **Investigadores**: habilidad y efecto del signo arcano de Daniela, Joe, Trish
  (acción adicional de evitar), Dexter e Isabelle (comprometer desde el descarte).
- **Durante la prueba**: talentos de "gasta 1 recurso: +1/+2" y Timely
  Intervention (tras revelar la ficha).
- **Debilidades**: van en el mazo, se apartan de la mano inicial y se resuelven al
  robarlas (traiciones en la zona de amenaza, Black Chamber Operative enfrentado,
  The Necronomicon bloquea tus apoyos, Dead Ends cancela búsquedas).
- **Hand-Crank Flashlight**: tras investigar con éxito puede descartarse para
  bajar 1 el velo de la localización hasta el final de la ronda (se ve en el mapa).
- **Comprometer a la prueba de otro**: cada otro investigador en la misma
  localización puede comprometer 1 carta (reglamento 2026).
- **Pendiente**: los efectos de campaña de las debilidades (trauma, experiencia),
  que llegarán con la campaña (paso 5).

## Cartas de nivel 1–5 (paso 5b)

Las 22 cartas que se compran con experiencia, en `packages/cards/src/core-2026/upgrades.ts`.
Mecánicas nuevas del motor que han hecho falta:

- **Permanentes** (Studious, Another Day, Another Dollar, Charisma, Relic Hunter):
  empiezan en juego fuera del mazo y dan cartas iniciales, recursos o ranuras extra.
- **Cancelar un ataque** (Counterattack): ventana "cuando un enemigo ataca" antes de
  resolver el ataque.
- **Revelar 2 fichas y elegir una** (Mask of Silenus); **superar la prueba por 0**
  (Scrape By); **devolver a la mano las cartas comprometidas** (On the Brink).
- **Ataques**: "si este ataque derrota al enemigo" (Decisive Strike, Meat Cleaver),
  daño extra por margen de éxito y daño por margen de fallo (Winchester Model 12),
  habilidades de 2 acciones (Sledgehammer).
- **Buscar cualquier carta** y robar también las debilidades (Mysterious Grimoire);
  **mirar las primeras y robar varias** (Unbridled Knowledge); **moverse hasta 2
  conexiones** (Out of Sight); **repetir una investigación** (Old Compass).

Simplificación: Unbridled Knowledge deja en el fondo del mazo, en el mismo orden,
las cartas que no se roban (la carta deja elegir orden y arriba o abajo).

## Mazos propios (paso 6)

En `packages/cards/src/decks.ts` (lógica) y la pantalla `apps/web/src/views/DecksView.vue`:

- **Validación** según el reglamento ("Deck Customization"): 30 cartas sin contar
  exclusivas ni debilidades, opciones de construcción del investigador (clase y
  nivel máximo), como mucho 2 copias por título, exclusivas obligatorias y no las de
  otro investigador, y solo nivel 0 al empezar una campaña. Avisa de las cartas que
  aún no tienen efecto en el motor.
- **Debilidad básica**: si el mazo no tiene ninguna, se añade una al azar al empezar
  la campaña (los mazos iniciales ya traen la suya).
- **Importar de ArkhamDB** por enlace o número, como mazo publicado o privado
  compartido (su API permite llamarla desde el navegador). Las cartas que no son de
  esta caja se quitan y se avisa; luego se completa el mazo en el editor.
- Los mazos se guardan en el navegador (`lcg:decks`); con cuentas de usuario
  pasarán al servidor.
- Al empezar una campaña, cada investigador juega con su mazo inicial o con uno de
  sus mazos propios válidos.

