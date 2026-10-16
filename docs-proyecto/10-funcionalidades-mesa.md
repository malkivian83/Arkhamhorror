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
| Zona del investigador con pestañas | `Player`, `PlayerTabs` | ✅ |
| Fichas redondas de recursos, pistas, daño y horror | `Resources` | ✅ |
| Mano jugable resaltada; apoyos en juego; zona de amenaza | `HandCard`, `Asset` | ✅ |
| Cartas agotadas giradas | `Card` | ✅ |
| Ampliar carta al pasar el ratón + texto traducido al lado | `CardImage`, `CardDetailsModal` | ✅ |
| Ver la pila de descartes (encuentros y jugador) | `EncounterDiscard`, `CardListView` | ⬜ |
| Zona de victoria visible | `VictoryDisplay` | 🟡 solo contador |
| Cartas debajo de otras / pilas | `CardsUnderIndicator`, `StackIndicator` | ⬜ |
| Menú de habilidades sobre cada carta | `AbilitiesMenu`, `AbilityButton` | 🟡 menú al hacer clic si hay varias opciones |

## Prueba de habilidad

| Funcionalidad | Referencia | Estado |
|---|---|---|
| Panel con pasos ST.1–ST.8 | `SkillTest.vue` | ✅ |
| Carta origen contra investigador, valor contra dificultad | `SkillTest.vue` | ✅ |
| Comprometer cartas desde la mano y verlas en el panel | `CommittedSkills` | ✅ (falta que comprometan otros investigadores) |
| Revelar ficha haciendo clic en la bolsa | `ChaosBag` | ✅ |
| Bolsa con el modificador de cada ficha y probabilidad | `ChaosBagWindow` | ✅ |
| Resultado y "aplicar resultados" | `SkillTest.vue` | ✅ |
| Animación de la ficha revelada | `ChaosTokenMorph` | ⬜ |
| "Saltar disparadores" (ocultar ventanas sin efecto) | `SkillTest.vue` | ⬜ (no hay aún ventanas de reacción) |

## Preguntas, historia y animaciones

| Funcionalidad | Referencia | Estado |
|---|---|---|
| Opciones sobre la mesa y botones laterales | `Question`, `QuestionChoices` | ✅ |
| Ventana modal para elecciones largas (repartir, elegir cartas, ordenar) | `ChoiceModal`, `PutBackInAnyOrder` | ⬜ |
| Textos de historia: introducción, resoluciones, códex | `StoryEntry`, `StoryQuestion`, `CodexEntry` | ⬜ |
| Carta robada destacada (encuentro revelándose) | `Draw`, `DrawSpotlight` | 🟡 se muestra en el panel lateral |
| Avisos (toasts) | `vue-toastification` | ⬜ |

## Registro, deshacer y herramientas

| Funcionalidad | Referencia | Estado |
|---|---|---|
| Registro de partida con secciones por ronda/fase | `GameLog`, `LogGroupBlock` | ✅ básico |
| Iconos y enlaces a cartas en el registro | `LogIcons`, `LogPart` | ⬜ |
| Chat en el registro | `GameLog` ("Say something…") | ⬜ (con multijugador) |
| Deshacer: acción, turno, fase, ronda, escenario | `HistoryPanel`, menú "Undo" | ⬜ (el motor lo permite: semilla + decisiones) |
| Atajos de teclado (robar, recurso, terminar turno, deshacer…) | `Game.vue` | ⬜ |
| Exportar registro / partida | `ExportLogDialog` | ⬜ |
| Herramientas de depuración | `debug/*` | ⬜ |
| Reportar fallo | "File Bug" | ✖ (sin servidor propio de incidencias aún) |

## Campaña, mazos y multijugador

| Funcionalidad | Referencia | Estado |
|---|---|---|
| Registro de campaña (notas, trauma, experiencia) | `CampaignLog*` | ⬜ |
| Pasar al siguiente escenario | `Campaign`, `ContinueCampaign` | ⬜ |
| Mejorar el mazo con experiencia | `UpgradeDeck`, `XpBreakdown` | ⬜ |
| Mazos: crear, listar, importar de ArkhamDB | `NewDeck`, `DeckList`, `ArkhamDbDeck` | ⬜ (hoy, mazos iniciales) |
| Multijugador en línea: sala, unirse, ocupar asiento, espectador | `MultiplayerLobby`, `ClaimSeat`, `JoinGame` | ⬜ |
| Repetición de partidas | `ReplayGame` | ⬜ |
| Logros, tarot, cartas propias, mercado | varios | ✖ |

## Orden propuesto

1. **Deshacer** (acción/turno/ronda) y **atajos de teclado**.
2. **Textos de historia** (introducción y resoluciones del escenario) y **modal** de elecciones.
3. **Ver descartes** y **zona de victoria**; carta robada destacada; animación de ficha.
4. **Resto de cartas de jugador**, habilidades de investigador y debilidades.
5. **Campaña** (registro, experiencia, mejoras) y los escenarios II y III.
6. **Mazos** propios e importación.
7. **Multijugador en línea** con el servidor.
