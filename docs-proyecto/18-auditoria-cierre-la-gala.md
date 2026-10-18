# Auditoría de cierre: La gala del ecuador del invierno

18/10/2026. Base de código: `939dbb31ae8989e59f6f5ef31a4a5eb6b80b8e5a`,
etiqueta `brethren-of-ash-local-v1.0.0`.

**Dictamen: La Gala está integrada y puede jugarse, pero todavía no cumple el
criterio de cierre aplicado a Brethren.** Hay diferencias de reglas confirmadas,
elecciones sustituidas por decisiones automáticas y falta aceptación de victorias
por las cinco facciones. No conviene presentarla como contenido terminado.

**Actualización de fase 1:** corregidos G01, G03, G06, G07, G08, G12, G13,
G15 y G16. Son **9 de los 21 trabajos**; quedan 12 y la aceptación de las
fases posteriores. La tabla inferior conserva el diagnóstico inicial; esta
actualización y el apartado de fase 1 identifican qué defectos ya no están.

## Alcance y método

Juego local, uno a cuatro investigadores, EN/ES. Se compararon preparación,
planes, actos, facciones, Invitados, encuentros, puntuación y salidas de cartas
con el código de la referencia local. No se utilizó su servicio online ni se
introdujo multijugador. El modo historia secundaria dentro de otra campaña queda
fuera de este primer cierre del escenario independiente.

La [matriz de 62 códigos base](18-matriz-la-gala.csv) incluye también las cartas
con dos caras en la misma fila. «Presente» indica que existe una definición;
no equivale a un contrato de reglas aprobado. Las caras de Líderes rivales,
Historia Rival, Lámpara y Exangüe deben probarse individualmente al cerrar cada fila.

La evidencia inicial se conserva sin modificar en
[auditoria-gala.json](evidencias/auditoria-gala.json). El script evoluciona con
las correcciones y ahora escribe una comprobación separada en
[gala-fase-1.json](evidencias/gala-fase-1.json), sin sobrescribir esa fotografía
histórica:

```powershell
node scripts/audit-gala.mjs
```

El script lee cinco archivos de referencia para conservar sus SHA-256. La copia
de `D:\referencia\ArkhamHorror-main` no tiene metadatos Git disponibles; no se le
atribuye una revisión remota inventada. Las conclusiones de lectura se apoyan en
los manejadores locales indicados más abajo. El script de auditoría no pertenece
a la suite de regresión: documenta defectos de la base y debe revisarse cuando
se corrijan, en lugar de mantener esos defectos como comportamiento esperado.

## Lo que sí se ha verificado

| Área | Evidencia | Límite |
|---|---|---|
| Preparación | **320 casos**: 20 parejas ordenadas Aliado/Rival × 4 dificultades × 4 tamaños de equipo. Se comprueban seis Invitados distribuidos dos por sala, seis en el mazo, Líder aliado, 23 encuentros y tamaño de bolsa. | No prueba todas las permutaciones de salas ni el efecto de cada carta. |
| Partidas legales | **40 recorridos**, cinco facciones × cuatro dificultades × uno/dos investigadores, **1.602 decisiones**; estado terminal en todos. | Política pasiva que termina turnos: **los 40 son sin resolución**, no victorias. |
| Persistencia | Se validan las 40 sesiones completas con mesa/campaña/historial y se reproducen sus entradas, comparando el hash del estado completo. | No acredita cada ventana de Joya, hechizo, Rival o resolución victoriosa. |
| Reglas dirigidas | Siete sondas G01–G07 reproducen diferencias de la base. | Usan mesas preparadas para aislar reglas; no son recorridos legales completos. |
| Base anterior | Las pruebas generales conservan el cierre de Brethren y las pruebas existentes de La Gala. | La prueba aleatoria anterior solo exigía un final o una decisión pendiente; no certificaba acabar ganando. |

Las bolsas y el desglose principal de trece tareas de puntuación coinciden por
lectura con la referencia. Hay que probar umbrales, duplicados y zonas después
de eliminar investigadores antes de dar por cerrado ese cálculo.

## Trabajos para cerrar el escenario

P1 afecta reglas, resultados o información de la partida. P2 completa elecciones
y aceptación. «Sonda» significa reproducción ejecutada; «lectura» señala una
diferencia localizada que necesita su regresión al implementarla.

| ID | Prioridad / evidencia | Diferencia y condición de aceptación |
|---|---|---|
| G01 | P1 · sonda | `fightAt` marca el combate de Callahan, Nova y Sarah como provocador. Nova recibe un ataque antes de agotarse. Combatir debe evitar el ataque de oportunidad y pagar agotamiento/recursos como costes. Probar enemigo preparado, agotado y Masivo. |
| G02 | P1 · sonda + referencia | Sala de la Lámpara descubre pista solo si aciertas y limita por ronda. La referencia descubre una pista al activar la habilidad también al errar y usa límite por turno. Probar acierto, fallo, mazo vacío y segundo turno en la misma ronda. |
| G03 | P1 · sonda | Dormitorio tiene un identificador que contiene el turno, pero **carece de `limit`** y provoca ataques. Añadir el límite real por turno y la excepción de combate; probar ataque remoto y daño adicional con pista. |
| G04 | P1 · sonda | Prudence vuelve a mirar las cuatro primeras tras descartar: aparece la quinta carta original como segunda elección. Mantener el conjunto de cuatro visto inicialmente y permitir reordenar las restantes, sin ampliar la búsqueda. |
| G05 | P1 · sonda + lectura | Faltan la reacción de Callahan tras habilidad de acción de Aliado/Arma, ignorar ataques de oportunidad de Humanoides con Delores y la segunda habilidad de Olney para comprometer la carta superior. El documento 14 restringía Delores a no Élite: la referencia consultada no contiene esa restricción. Contrastar la carta al implementarla. |
| G06 | P1 · sonda + datos | Rookie Cop carece de Oleada. La cara silenciosa de El Exangüe tiene `victory: 1`, aunque la referencia solo da Victoria a la cara desatada. Revisar tanto definición como enemigo creado en preparación y la transición entre caras. |
| G07 | P1 · sonda | `EliminateInvestigator` filtra sus apoyos directamente. Un Invitado controlado desaparece sin quedar hechizado; también se omiten las salidas especiales de Joya/Lámpara. Tramitar esas salidas conservando la localización anterior y evitar reacciones recursivas. |
| G08 | P1 · lectura | `enterHorror` cobra al entrar siempre; la Sala de la Lámpara de referencia aplica el coste al entrar sin revelar. Probar primera entrada, reentrada y movimiento por efecto; revisar la misma semántica en los demás Lugares Privados. |
| G09 | P2 · lectura | Baile agota los dos primeros Invitados del estado. Pedir al jugador qué Invitados agotar y conservar la elección al guardar; comprobar los requisitos con uno/dos disponibles contra el texto de carta. |
| G10 | P2 · lectura | Archibald encuentra automáticamente el primer enemigo de las nueve cartas. Ofrecer la elección entre enemigos encontrados y resolver su robo normal antes de agotarlo; comprobar ausencia de objetivos. |
| G11 | P2 · lectura | Lucas toma automáticamente el primer Objeto, no ofrece jugar un Tomo y presenta destinos de Herramienta sin filtrar pistas. Permitir elegir Objeto, aplicar sus rasgos y pagar el Tomo; ofrecer solo destinos válidos. |
| G12 | P1 · lectura | Gug y Bestia lunar no imponen la asignación prioritaria de horror/daño a Invitados. Añadir estrategia de asignación y probar capacidad restante, varios Invitados y hechizo por derrota. |
| G13 | P1 · lectura | Emboscada y Atrapado usan `comeForYou`, que teletransporta al enemigo. Resolver desplazamiento por conexiones, interacciones en el camino y desempates del más cercano mediante elección. |
| G14 | P2 · lectura | Puerta secreta escoge el primer Lugar empatado por investigadores. Preguntar el destino entre todos los empatados admisibles y comprobar salida bloqueada, retirada de la traición y movilidad por efectos. |
| G15 | P1 · lectura | La pista para mirar Misterio del Sindicato y el recurso de Archibald siguen dentro de `then`; Mya también agota dentro del efecto. Mover costes al canal previo a ataques de oportunidad y probar que el pago no se repite. |
| G16 | P1 · lectura | `pushed`, `shuffleIn` y `shuffleEncounter` usan fórmulas de ronda/tamaño en lugar del RNG del motor; Pushed inserta sin barajar todo el mazo. Unificar con `shuffle`/RNG, mantener repetibilidad y verificar permanentes/apoyos de historia no elegibles. |
| G17 | P2 · aceptación | Faltan victorias completas de las cinco facciones, sus interludios y objetivos. Probar R1 narrativa → R2–R6 de facción → R7 narrativa de puntuación, umbrales de XP y registro final. R7 no es un séptimo resultado terminal del modelo actual; rechazarlo en el importador no demuestra un fallo por sí solo. |
| G18 | P2 · lectura | El respaldo local de cartas recorre los tres escenarios de Brethren; solo recoge las cartas de jugador registradas de Gala. Añadir datos/resúmenes EN/ES de los 62 códigos y caras, y probar fallo de red, cambio de idioma y recursos ausentes. |
| G19 | P1 · lectura | Las opciones para nombrar carta/rasgo se construyen a partir del mazo y descarte actuales. Revelan información sobre contenido oculto. Ofrecer un catálogo independiente de la composición u orden secreto; no exponer cartas mirando el estado interno. |
| G20 | P1 · lectura | El robo rápido de Misterios del Sindicato se limita a tu Lugar. La referencia permite elegir entre los Lugares revelados elegibles con cartas debajo, durante tu turno. Probar otro Lugar, varias cartas y el umbral por investigador. |
| G21 | P2 · lectura | Órdenes violentas solo permite la acción al investigador amenazado. La referencia no limita esa acción al propietario; el motor ya admite habilidades de traiciones de otro investigador en tu Lugar. Permitir ayuda desde el mismo Lugar y mantener el forzado solo para su dueño. |

Los puntos G17 y G18 son trabajos de aceptación y de respaldo, no una afirmación
de que todos sus caminos estén rotos. El resto no se considera arreglado por
haberlo documentado.

## Fuentes para implementar sin perder el comportamiento

En nuestro código:

- [gala.ts](../packages/cards/src/midwinter-gala/gala.ts): preparación, salas, planes, actos, bolsas y puntuación.
- [guests.ts](../packages/cards/src/midwinter-gala/guests.ts): G01, G04, G05, G10, G11, G15, G16 y G19.
- [encounter.ts](../packages/cards/src/midwinter-gala/encounter.ts): G12–G14, G16 y G21.
- [stories.ts](../packages/cards/src/midwinter-gala/stories.ts): objetivos y Misterios.
- [cards.ts](../packages/cards/src/midwinter-gala/cards.ts): cifras, rasgos y caras.
- [handlers.ts](../packages/engine/src/handlers.ts): movimiento, asignación, eliminación y costes.
- [fallbackCards.ts](../apps/web/src/game/fallbackCards.ts): respaldo sin red.

La raíz de los manejadores de referencia es
`D:\referencia\ArkhamHorror-main\backend\arkham-api\library\Arkham`:

| Área | Archivos relativos de referencia |
|---|---|
| Preparación/puntuación | `Scenario/Scenarios/TheMidwinterGala.hs` |
| Planes/actos | `Agenda/Cards/TheMidwinterGala/` y `Act/Cards/TheMidwinterGala/` |
| Sala y dormitorio | `Location/Cards/TheMidwinterGala/LanternChamber.hs`, `BedroomTheMidwinterGala.hs` |
| Habilidades de Invitados | `Asset/Assets/SpecialAgentCallahan.hs`, `DeloresGadling.hs`, `ThomasOlney.hs`, `PrudenceDouglas.hs`, `ArchibaldHudson.hs`, `LucasTetlow.hs`, `NovaMalone.hs`, `SarahVanShaw.hs` |
| Daño prioritario | `Enemy/Cards/TheMidwinterGala/EnragedGug.hs`, `AbhorrentMoonBeast.hs` |
| Sindicato | `Story/Cards/TheMidwinterGala/TheSyndicateAllied.hs` |
| Traiciones reutilizadas | `Treachery/Cards/ReturnToTheDunwichLegacy/SecretDoors/SecretDoor.hs`, `ErraticFear/ViolentCommands.hs`, `Treachery/Cards/TheDunwichLegacy/TheBeyond/PushedIntoTheBeyond.hs` |

Se trata de evidencia de implementación de referencia. Ante discrepancia con
texto de carta o errata, comprobar esa regla antes de reproducir una decisión
del programa original.

## Fases y puertas de cierre

1. **Reglas transversales.** G01, G03, G06–G08, G12, G13, G15 y G16. Añadir
   regresiones por cada corrección, incluidas eliminación, costes y Masivo.
   Deben seguir pasando las dos campañas en normal de Brethren.
2. **Habilidades y decisiones.** G02, G04, G05, G09–G11, G14, G19–G21.
   Terminar cada carta con elecciones válidas y sin revelar información oculta.
3. **Contenido y persistencia.** Cerrar las 62 filas de la matriz y sus reversos;
   ejecutar los cinco interludios, las 20 parejas de facciones y las trece tareas
   de puntuación, incluyendo umbrales de XP. Guardar/reanudar y deshacer en
   negociación, hechizo, Joya en enemigo/controlada/bajo cartas, Rival y finales.
4. **Partidas e interfaz.** Al menos una victoria legal completa por facción,
   dos equipos en normal y derrota por plan. Conservar grabaciones y comprobar
   recorridos visibles EN/ES, ampliaciones y avisos de avance, también a 390×640.
   La prueba en teléfono físico permanece diferida por decisión del usuario,
   que no dispone de uno; no bloquea estas tareas de código y escritorio.
5. **Publicación.** CI completa, auditoría actualizada con pruebas concretas,
   documentación de límites y etiqueta estable propia de Gala. No marcar una
   facción cerrada solo porque alcance un estado terminal sin resolución.

Tras completar la fase 1, el siguiente bloque de implementación es la fase 2. La ampliación
de contenido debe apoyarse en esta auditoría y conservar la etiqueta de Brethren
como referencia de regresión.

## Controles de la entrega inicial de auditoría

Las correcciones de presentación solicitadas durante la auditoría no alteran
reglas de Gala. La suite completa supera **466 pruebas en 35 archivos**; tipos
web, lint, formato y build correctos. Las siete sondas de auditoría son
comprobaciones separadas y no se suman a esas 466 pruebas. El build contiene
653,72 kB de JavaScript (199,67 kB comprimido). Se validaron los 62 códigos de la
matriz y los enlaces locales de los documentos 17 y 18.

## Fase 1 completada: reglas transversales

Base anterior a los cambios: `f476627` (`brethren-of-ash-local-v1.0.1`). El
siguiente bloque de implementación es la **fase 2: habilidades y decisiones**.

| Trabajo cerrado | Comportamiento corregido |
|---|---|
| G01 | Callahan, Nova y Sarah combaten sin ataques de oportunidad. Agotamiento y recursos se pagan antes de resolver la habilidad. |
| G03 | Dormitorio permite un uso por turno, incluso si se reponen acciones. Un turno adicional en la misma ronda abre un uso nuevo. Conserva el ataque remoto y el daño adicional por pista. |
| G06 | Rookie Cop tiene Oleada al robarlo, después de aparecer. Aparecer por efecto no activa esa palabra clave. La cara silenciosa de El Exangüe carece de Victoria; la desatada mantiene Victoria 1. |
| G07 | La eliminación y la retirada resuelven las salidas especiales antes de perder la localización: Invitados hechizados, Líder retirado, Lámpara colocada y Joya barajada. También funciona con el último investigador, sin duplicar cartas. |
| G08 | El horror se paga solo al entrar sin revelar, tanto por acción como por efecto. Se paga antes del desplazamiento y del ataque de oportunidad; una reentrada no vuelve a cobrarlo. |
| G12 | Gug prioriza horror y Bestia lunar daño sobre Invitados con capacidad restante. Al agotarse esa capacidad vuelven a estar disponibles los otros destinos de asignación. |
| G13 | Emboscada y Atrapado mueven paso a paso por conexiones, con ventanas intermedias. Se eligen monstruos y caminos mínimos empatados; no se teletransporta ni se ataca sin alcanzar al investigador. |
| G15 | Archibald, Mya y el pago de pistas del Sindicato pagan sus costes antes del ataque y una sola vez. |
| G16 | Los tres barajados usan el RNG del motor y se reproducen exactamente. Pushed baraja el mazo completo, descarta tres y aplica su horror; no permite permanentes ni apoyos de historia. |

### Pruebas y límites

- [phase-one.test.ts](../packages/cards/src/midwinter-gala/phase-one.test.ts):
  **38 regresiones** de las reglas anteriores, con mesas dirigidas.
- [gala-phase-one-session.test.ts](../apps/web/src/game/gala-phase-one-session.test.ts):
  guardado, reproducción y deshacer del límite por turno y de la asignación
  obligatoria, con investigadores y cartas registrados.
- [session.test.ts](../apps/web/src/game/session.test.ts): dos pruebas nuevas
  de compatibilidad por escenario y conservación del archivo anterior.
- [gala-fase-1.json](evidencias/gala-fase-1.json): se repiten las **320
  preparaciones** y los **40 recorridos legales de derrota**, ahora con **1.697
  decisiones**, validando guardado y reproducción de su estado completo.
  Las sondas G01, G03, G06 y G07 pasan a corregidas; G02, G04 y G05 siguen pendientes.

Suite completa: **508 pruebas en 37 archivos**, incluidos los recorridos
enlazados de Brethren. Tipos de los seis proyectos, lint, formato y compilación
web correctos. JavaScript: 655,59 kB, 200,04 kB comprimido; se mantienen los avisos
conocidos de fuente y tamaño. Las simulaciones pasivas no acreditan victorias
de Gala ni sustituyen la aceptación visual de las fases posteriores.

### Compatibilidad de partidas

Las partidas nuevas de Gala llevan `scenarioRulesVersion: 2`. Una mesa anterior
sin esa revisión se identifica como incompatible antes de reproducir su
historial; el archivo original se conserva. **No se convierte automáticamente
una partida activa de Gala anterior a estas reglas.** Es necesario comenzar una
nueva mesa con esta versión. La revisión global de formato y la compatibilidad
de Brethren se mantienen; las pruebas conservan sus guardados y recorridos.
