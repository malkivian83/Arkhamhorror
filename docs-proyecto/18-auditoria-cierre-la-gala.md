# Auditoría de cierre: La gala del ecuador del invierno

18/10/2026. Base de código: `939dbb31ae8989e59f6f5ef31a4a5eb6b80b8e5a`,
etiqueta `brethren-of-ash-local-v1.0.0`.

**Dictamen actualizado el 20/10/2026: La Gala es jugable, tiene las fases 1–3
completadas y siete victorias completas reproducibles en normal.** G17 queda
cerrado: una victoria por cada una de las cinco facciones y dos equipos de dos
investigadores. Quedan la aceptación visual de fase 4 y la publicación estable
de fase 5 para cumplir el cierre aplicado a Brethren.

**Los 21 trabajos de auditoría están cerrados dentro de sus contratos.** Se
verifican los contratos principales de los 62 códigos y caras, respaldo EN/ES,
interludios, puntuación, persistencia especial y victorias completas. Esto no
certifica todas las interacciones ni la interfaz. La tabla de hallazgos conserva
el diagnóstico inicial; los apartados de entrega, la matriz y la sección
«Fase 4: victorias completas» registran la aceptación actual.

## Alcance y método

Juego local, uno a cuatro investigadores, EN/ES. Se compararon preparación,
planes, actos, facciones, Invitados, encuentros, puntuación y salidas de cartas
con el código de la referencia local. No se utilizó su servicio online ni se
introdujo multijugador. El modo historia secundaria dentro de otra campaña queda
fuera de este primer cierre del escenario independiente.

La [matriz de 62 códigos base](18-matriz-la-gala.csv) incluye las cartas con dos
caras en la misma fila. Desde la fase 3, cada fila enlaza pruebas ejecutadas del
efecto principal y respaldo EN/ES; las caras de Líderes rivales, Historia Rival,
Lámpara y Exangüe se incluyen en esa aceptación. Esto no certifica cada interacción
posible ni convierte las mesas dirigidas en partidas completas.

La evidencia inicial se conserva sin modificar en
[auditoria-gala.json](evidencias/auditoria-gala.json). También se conservan
[gala-fase-1.json](evidencias/gala-fase-1.json) y
[gala-fase-2.json](evidencias/gala-fase-2.json). La comprobación de preparación y
derrota pasiva con las reglas actuales escribe
[gala-fase-3-recorridos.json](evidencias/gala-fase-3-recorridos.json), sin
sobrescribir esas fotografías históricas ni la matriz de aceptación:

```powershell
node scripts/audit-gala.mjs --phase-three
```

El script lee catorce archivos de referencia para conservar sus SHA-256. La copia
de `D:\referencia\ArkhamHorror-main` no tiene metadatos Git disponibles; no se le
atribuye una revisión remota inventada. Las conclusiones de lectura se apoyan en
los manejadores locales indicados más abajo. El script de auditoría no pertenece
a la suite de regresión: documenta defectos de la base y debe revisarse cuando
se corrijan, en lugar de mantener esos defectos como comportamiento esperado.

## Lo que sí se ha verificado

| Área                             | Evidencia                                                                                                                                                                                                                      | Límite                                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Preparación                      | **320 casos**: 20 parejas ordenadas Aliado/Rival × 4 dificultades × 4 tamaños de equipo. Se comprueban seis Invitados distribuidos dos por sala, seis en el mazo, Líder aliado, 23 encuentros y tamaño de bolsa.               | No prueba todas las permutaciones de salas ni el efecto de cada carta.                                                 |
| Partidas legales                 | **40 recorridos**, cinco facciones × cuatro dificultades × uno/dos investigadores, **1.602 decisiones**; estado terminal en todos.                                                                                             | Política pasiva que termina turnos: **los 40 son sin resolución**, no victorias.                                       |
| Victorias completas (20/10/2026) | **Siete grabaciones, 1.041 decisiones** en normal: una por facción y dos equipos de dos investigadores. `gala-playthrough.test.ts` reproduce preparaciones, mazos válidos, decisiones, finales, registro, guardado y deshacer. | Recorridos automáticos del motor; no acreditan aceptación visual, juego en todas las dificultades ni cada interacción. |
| Persistencia                     | Se validan las 40 sesiones completas con mesa/campaña/historial y se reproducen sus entradas, comparando el hash del estado completo.                                                                                          | No acredita cada ventana de Joya, hechizo, Rival o resolución victoriosa.                                              |
| Reglas dirigidas                 | Siete sondas G01–G07 reproducen diferencias de la base.                                                                                                                                                                        | Usan mesas preparadas para aislar reglas; no son recorridos legales completos.                                         |
| Base anterior                    | Las pruebas generales conservan el cierre de Brethren y las pruebas existentes de La Gala.                                                                                                                                     | La prueba aleatoria anterior solo exigía un final o una decisión pendiente; no certificaba acabar ganando.             |

Las bolsas y el desglose principal de trece tareas de puntuación coinciden por
lectura con la referencia. Hay que probar umbrales, duplicados y zonas después
de eliminar investigadores antes de dar por cerrado ese cálculo.

## Trabajos para cerrar el escenario

P1 afecta reglas, resultados o información de la partida. P2 completa elecciones
y aceptación. «Sonda» significa reproducción ejecutada; «lectura» señala una
diferencia localizada que necesita su regresión al implementarla.

| ID  | Prioridad / evidencia   | Diferencia y condición de aceptación                                                                                                                                                                                                                                                                                                            |
| --- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G01 | P1 · sonda              | `fightAt` marca el combate de Callahan, Nova y Sarah como provocador. Nova recibe un ataque antes de agotarse. Combatir debe evitar el ataque de oportunidad y pagar agotamiento/recursos como costes. Probar enemigo preparado, agotado y Masivo.                                                                                              |
| G02 | P1 · sonda + referencia | Sala de la Lámpara descubre pista solo si aciertas y limita por ronda. La referencia descubre una pista al activar la habilidad también al errar y usa límite por turno. Probar acierto, fallo, mazo vacío y segundo turno en la misma ronda.                                                                                                   |
| G03 | P1 · sonda              | Dormitorio tiene un identificador que contiene el turno, pero **carece de `limit`** y provoca ataques. Añadir el límite real por turno y la excepción de combate; probar ataque remoto y daño adicional con pista.                                                                                                                              |
| G04 | P1 · sonda              | Prudence vuelve a mirar las cuatro primeras tras descartar: aparece la quinta carta original como segunda elección. Mantener el conjunto de cuatro visto inicialmente y permitir reordenar las restantes, sin ampliar la búsqueda.                                                                                                              |
| G05 | P1 · sonda + lectura    | Faltan la reacción de Callahan tras habilidad de acción de Aliado/Arma, ignorar ataques de oportunidad de Humanoides con Delores y la segunda habilidad de Olney para comprometer la carta superior. El documento 14 restringía Delores a no Élite: la referencia consultada no contiene esa restricción. Contrastar la carta al implementarla. |
| G06 | P1 · sonda + datos      | Rookie Cop carece de Oleada. La cara silenciosa de El Exangüe tiene `victory: 1`, aunque la referencia solo da Victoria a la cara desatada. Revisar tanto definición como enemigo creado en preparación y la transición entre caras.                                                                                                            |
| G07 | P1 · sonda              | `EliminateInvestigator` filtra sus apoyos directamente. Un Invitado controlado desaparece sin quedar hechizado; también se omiten las salidas especiales de Joya/Lámpara. Tramitar esas salidas conservando la localización anterior y evitar reacciones recursivas.                                                                            |
| G08 | P1 · lectura            | `enterHorror` cobra al entrar siempre; la Sala de la Lámpara de referencia aplica el coste al entrar sin revelar. Probar primera entrada, reentrada y movimiento por efecto; revisar la misma semántica en los demás Lugares Privados.                                                                                                          |
| G09 | P2 · lectura            | Baile agota los dos primeros Invitados del estado. Pedir al jugador qué Invitados agotar y conservar la elección al guardar; comprobar los requisitos con uno/dos disponibles contra el texto de carta.                                                                                                                                         |
| G10 | P2 · lectura            | Archibald encuentra automáticamente el primer enemigo de las nueve cartas. Ofrecer la elección entre enemigos encontrados y resolver su robo normal antes de agotarlo; comprobar ausencia de objetivos.                                                                                                                                         |
| G11 | P2 · lectura            | Lucas toma automáticamente el primer Objeto, no ofrece jugar un Tomo y presenta destinos de Herramienta sin filtrar pistas. Permitir elegir Objeto, aplicar sus rasgos y pagar el Tomo; ofrecer solo destinos válidos.                                                                                                                          |
| G12 | P1 · lectura            | Gug y Bestia lunar no imponen la asignación prioritaria de horror/daño a Invitados. Añadir estrategia de asignación y probar capacidad restante, varios Invitados y hechizo por derrota.                                                                                                                                                        |
| G13 | P1 · lectura            | Emboscada y Atrapado usan `comeForYou`, que teletransporta al enemigo. Resolver desplazamiento por conexiones, interacciones en el camino y desempates del más cercano mediante elección.                                                                                                                                                       |
| G14 | P2 · lectura            | Puerta secreta escoge el primer Lugar empatado por investigadores. Preguntar el destino entre todos los empatados admisibles y comprobar salida bloqueada, retirada de la traición y movilidad por efectos.                                                                                                                                     |
| G15 | P1 · lectura            | La pista para mirar Misterio del Sindicato y el recurso de Archibald siguen dentro de `then`; Mya también agota dentro del efecto. Mover costes al canal previo a ataques de oportunidad y probar que el pago no se repite.                                                                                                                     |
| G16 | P1 · lectura            | `pushed`, `shuffleIn` y `shuffleEncounter` usan fórmulas de ronda/tamaño en lugar del RNG del motor; Pushed inserta sin barajar todo el mazo. Unificar con `shuffle`/RNG, mantener repetibilidad y verificar permanentes/apoyos de historia no elegibles.                                                                                       |
| G17 | P2 · aceptación         | Faltan victorias completas de las cinco facciones, sus interludios y objetivos. Probar R1 narrativa → R2–R6 de facción → R7 narrativa de puntuación, umbrales de XP y registro final. R7 no es un séptimo resultado terminal del modelo actual; rechazarlo en el importador no demuestra un fallo por sí solo.                                  |
| G18 | P2 · lectura            | El respaldo local de cartas recorre los tres escenarios de Brethren; solo recoge las cartas de jugador registradas de Gala. Añadir datos/resúmenes EN/ES de los 62 códigos y caras, y probar fallo de red, cambio de idioma y recursos ausentes.                                                                                                |
| G19 | P1 · lectura            | Las opciones para nombrar carta/rasgo se construyen a partir del mazo y descarte actuales. Revelan información sobre contenido oculto. Ofrecer un catálogo independiente de la composición u orden secreto; no exponer cartas mirando el estado interno.                                                                                        |
| G20 | P1 · lectura            | El robo rápido de Misterios del Sindicato se limita a tu Lugar. La referencia permite elegir entre los Lugares revelados elegibles con cartas debajo, durante tu turno. Probar otro Lugar, varias cartas y el umbral por investigador.                                                                                                          |
| G21 | P2 · lectura            | Órdenes violentas solo permite la acción al investigador amenazado. La referencia no limita esa acción al propietario; el motor ya admite habilidades de traiciones de otro investigador en tu Lugar. Permitir ayuda desde el mismo Lugar y mantener el forzado solo para su dueño.                                                             |

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

| Área                     | Archivos relativos de referencia                                                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preparación/puntuación   | `Scenario/Scenarios/TheMidwinterGala.hs`                                                                                                                                        |
| Planes/actos             | `Agenda/Cards/TheMidwinterGala/` y `Act/Cards/TheMidwinterGala/`                                                                                                                |
| Sala y dormitorio        | `Location/Cards/TheMidwinterGala/LanternChamber.hs`, `BedroomTheMidwinterGala.hs`                                                                                               |
| Habilidades de Invitados | `Asset/Assets/SpecialAgentCallahan.hs`, `DeloresGadling.hs`, `ThomasOlney.hs`, `PrudenceDouglas.hs`, `ArchibaldHudson.hs`, `LucasTetlow.hs`, `NovaMalone.hs`, `SarahVanShaw.hs` |
| Daño prioritario         | `Enemy/Cards/TheMidwinterGala/EnragedGug.hs`, `AbhorrentMoonBeast.hs`                                                                                                           |
| Sindicato                | `Story/Cards/TheMidwinterGala/TheSyndicateAllied.hs`                                                                                                                            |
| Traiciones reutilizadas  | `Treachery/Cards/ReturnToTheDunwichLegacy/SecretDoors/SecretDoor.hs`, `ErraticFear/ViolentCommands.hs`, `Treachery/Cards/TheDunwichLegacy/TheBeyond/PushedIntoTheBeyond.hs`     |

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

Las fases 1–3 y las siete victorias legales de fase 4 están completadas dentro
de sus alcances. El siguiente bloque es la aceptación visual de fase 4. La ampliación de contenido
debe conservar la etiqueta de Brethren como referencia de regresión.

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

| Trabajo cerrado | Comportamiento corregido                                                                                                                                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G01             | Callahan, Nova y Sarah combaten sin ataques de oportunidad. Agotamiento y recursos se pagan antes de resolver la habilidad.                                                                                                              |
| G03             | Dormitorio permite un uso por turno, incluso si se reponen acciones. Un turno adicional en la misma ronda abre un uso nuevo. Conserva el ataque remoto y el daño adicional por pista.                                                    |
| G06             | Rookie Cop tiene Oleada al robarlo, después de aparecer. Aparecer por efecto no activa esa palabra clave. La cara silenciosa de El Exangüe carece de Victoria; la desatada mantiene Victoria 1.                                          |
| G07             | La eliminación y la retirada resuelven las salidas especiales antes de perder la localización: Invitados hechizados, Líder retirado, Lámpara colocada y Joya barajada. También funciona con el último investigador, sin duplicar cartas. |
| G08             | El horror se paga solo al entrar sin revelar, tanto por acción como por efecto. Se paga antes del desplazamiento y del ataque de oportunidad; una reentrada no vuelve a cobrarlo.                                                        |
| G12             | Gug prioriza horror y Bestia lunar daño sobre Invitados con capacidad restante. Al agotarse esa capacidad vuelven a estar disponibles los otros destinos de asignación.                                                                  |
| G13             | Emboscada y Atrapado mueven paso a paso por conexiones, con ventanas intermedias. Se eligen monstruos y caminos mínimos empatados; no se teletransporta ni se ataca sin alcanzar al investigador.                                        |
| G15             | Archibald, Mya y el pago de pistas del Sindicato pagan sus costes antes del ataque y una sola vez.                                                                                                                                       |
| G16             | Los tres barajados usan el RNG del motor y se reproducen exactamente. Pushed baraja el mazo completo, descarta tres y aplica su horror; no permite permanentes ni apoyos de historia.                                                    |

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

## Fase 2: habilidades y decisiones

Base anterior: `5a655e6`. Se contrastaron los manejadores de referencia de
Callahan, Delores, Olney, Prudence, Lucas, Archibald, Baile, Sala de la Lámpara,
Sindicato, Puerta secreta y Órdenes violentas. Sus SHA-256 se conservan en
[gala-fase-2.json](evidencias/gala-fase-2.json).

| Trabajo corregido | Comportamiento                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G02, G19          | La Sala descubre una pista al activar, aciertes o no y aun con mazo vacío. Límite real por turno. Nombres y rasgos proceden del catálogo público implementado y no del mazo/descarte secreto ni del Rival elegido.                                                                                                                                                                                                                       |
| G04               | Prudence descarta hasta dos no Élite entre las cuatro cartas originales y permite ordenar las restantes desde arriba. Nunca muestra la quinta por descartar una de las cuatro.                                                                                                                                                                                                                                                           |
| G05               | Callahan puede agotarse tras una habilidad de acción de Aliado/Arma para infligir un daño no de ataque aquí, sin ofrecer enemigos inmunes. Delores evita ataques de oportunidad de Humanoides, incluidos Élite; no evita ataques normales. Olney descarta la carta superior propia y la compromete si es válida, también a la prueba de otro investigador de su Lugar. Respeta iconos, límite de ayuda, tipos bloqueados y William Bain. |
| G09               | Baile permite elegir entre Invitados preparados controlados o colocados. Agota al primero y luego al segundo; cura únicamente si hay pareja. Con uno solo lo agota sin curar, siguiendo la secuencia del manejador de referencia.                                                                                                                                                                                                        |
| G10               | Archibald permite elegir enemigo entre nueve, resuelve el robo normal con aparición/Oleada y agota la instancia recién aparecida. Baraja también sin enemigo y no concede recursos en ese caso.                                                                                                                                                                                                                                          |
| G11               | Lucas permite elegir Objeto, usa el robo normal, concede los beneficios de Reliquia/Tomo/Herramienta, permite pagar o rechazar el Tomo sin acción y solo ofrece Lugares conectados con pistas. Dead Ends cancela la búsqueda.                                                                                                                                                                                                            |
| G14               | Puerta secreta pregunta en empates y bloquea tanto el movimiento básico como el movimiento por efecto hasta retirarla.                                                                                                                                                                                                                                                                                                                   |
| G20               | El Sindicato permite robar la carta elegida de cualquier Lugar revelado elegible con cartas debajo y hasta una pista por investigador. Mirar pagando pistas muestra todas las cartas bajo tu Lugar.                                                                                                                                                                                                                                      |
| G21               | Otro investigador en el mismo Lugar puede resolver la acción de Órdenes violentas. El forzado de final de turno sigue correspondiendo al amenazado.                                                                                                                                                                                                                                                                                      |

Pruebas dirigidas: [phase-two.test.ts](../packages/cards/src/midwinter-gala/phase-two.test.ts).
Persistencia: [gala-phase-two-session.test.ts](../apps/web/src/game/gala-phase-two-session.test.ts)
comprueba guardado, reproducción del estado completo y deshacer cada decisión de
Prudence, Archibald, Lucas, Baile, Misterios y Olney usando cartas registradas.
Son mesas preparadas para aislar ventanas; no se cuentan como victorias legales.

La auditoría repetida mantiene **320 preparaciones y 40 derrotas legales**,
ahora con **1.700 decisiones**, guardado y reproducción completa. Las siete
sondas iniciales están corregidas. Esto no certifica victorias ni las 62 cartas.

Las nuevas mesas de Gala usan **`scenarioRulesVersion: 3`**. Se rechazan las
mesas anteriores, incluida la revisión 2, conservando el archivo original para
exportarlo. Debe empezarse una mesa nueva de Gala. Brethren conserva su revisión
y sus guardados; la nueva ventana de Callahan solo se encola cuando hay un
observador que la utiliza.

## Imágenes almacenadas por nuestra aplicación

El usuario exige que las cartas se almacenen y sirvan desde nuestra web. Las
imágenes se importan en `apps/web/public/local-assets/cards/`, con un manifiesto
local; las peticiones de imagen durante la partida usan rutas de nuestro origen.
La versión española disponible tiene prioridad y puede caer a la inglesa local
y a la plantilla traducida si falta el archivo. No se enlazan imágenes externas
durante la partida ni se cambia la partida al cambiar el idioma.

La copia de referencia contiene 353 imágenes de recursos, pero no las cartas
`10128`, `12017` o `71008` ni una carpeta local de cartas españolas. Su
`frontend/src/digests/es.json` aporta 3.557 rutas; está desactualizado para los
códigos nuevos. [imagenes-espanolas.json](evidencias/imagenes-espanolas.json)
registra 508 peticiones HEAD: 238 recursos españoles de nuestro contenido
responden como imagen. Los 124 candidatos de Gala (62 códigos y reversos) no
están disponibles en español. `10128` también está disponible y se incluye
por petición del usuario.

[sync-card-images.mjs](../scripts/sync-card-images.mjs) realiza la importación
previa a la compilación. [imagenes-locales.json](evidencias/imagenes-locales.json)
inventaría los archivos copiados, tamaños, SHA-256 y ausencias. Las cartas que
no tienen imagen siguen disponibles mediante su presentación de texto; el
respaldo mecánico completo de Gala se cierra en G18.

Entrega de imágenes: **566 archivos locales** (239 ES y 327 EN), **96.649.419
bytes**. Incluye `10128` y todas las caras principales de las cartas registradas,
más los 62 códigos base de Gala. Hay 183 candidatos sin archivo remoto, todos
reversos que no estaban disponibles; no se presentan como imágenes descargadas.
Las huellas de los 566 archivos se verifican con:

```powershell
node scripts/verify-card-images.mjs
```

CI ejecuta esa comprobación y la prueba de cobertura del manifiesto. El
compilado incluye los archivos sin acudir a servicios externos para imágenes.
[interfaz-imagenes-locales.json](evidencias/interfaz-imagenes-locales.json)
registra 32 imágenes visibles cargadas, cero externas y cero fallos en la mesa
de Aguante. Se activó la carta en evasión: +2 Agilidad y un recurso gastado.
Se leyó también el escaneo local de Baile para comprobar «agotar dos; después
curar», coherente con la secuencia de la referencia.

Validación de entrega: **560 pruebas en 40 archivos**, tipos de los seis
proyectos, lint, formato, compilación y comprobación de integridad de imágenes.
JavaScript de la web: 687,26 kB (205,52 kB comprimido), más los archivos estáticos
de cartas. Se conservan los avisos conocidos de fuente y tamaño del bundle.
La aceptación física de teléfono sigue diferida por decisión del usuario.

## Fase 3 completada: contratos de contenido y persistencia

Entrega del 19/10/2026. Evidencia reproducible:
[gala-fase-3.json](evidencias/gala-fase-3.json), con **348 pruebas en nueve
archivos**, contratos principales asociados a los **62 códigos base**, respaldo
EN/ES y **17 casos de persistencia** (ventanas especiales y finales). La
[matriz](18-matriz-la-gala.csv) identifica las pruebas de cada fila. El recuento
incluye las regresiones anteriores de fases 1–2; no se presenta como 348 pruebas
nuevas ni como una enumeración de todas las interacciones.

```powershell
node scripts/audit-gala-content.mjs
node scripts/audit-gala.mjs --phase-three
```

El primer script ejecuta las pruebas, exige un contrato principal y respaldo en
ambos idiomas por código, actualiza la matriz y registra las huellas de los dos
PDF y 74 archivos de referencia. El segundo vuelve a ejecutar **320
preparaciones y 40 derrotas legales**, con **1.700 decisiones**, guardado y
reproducción del estado completo. No son victorias. Las pruebas generales y los
controles de CI se verifican por separado; este acta no certifica el VPS.

### Fuentes y correcciones nuevas

Se consultó el reglamento español `AHC80_Rulebook_ES.pdf`: reglas de Invitados y
hechizado (pp. 3–4), preparación e interludios (pp. 11–14), resoluciones y XP
(pp. 15–19) y las trece tareas de puntuación (p. 24). La FAQ v2.5A (p. 23) no
recoge erratas de Gala. Se contrastaron los manejadores de cartas y el escenario
de la referencia local; sus huellas permiten identificar la copia consultada.

| Hallazgo nuevo          | Corrección y regresión                                                                                                                                                                                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Interludio de Kingsport | Declan entra **preparado**. La p. 14 del PDF no ordena agotarlo; la referencia local sí lo hacía. Se sigue el PDF, con cuatro pruebas para 1–4 investigadores. Fundación mantiene su agotamiento explícito.                                                                       |
| Usos de Invitados       | Miranda entra con 3 suministros, Prudence con 3 presagios y Raymond con 4 verdades. Los usos, incluso cero, se conservan al hechizar, volver boca arriba y tomar control. Antes faltaban sus usos iniciales y podían reponerse al cambiar de zona.                                |
| Carl Sanford            | Reacciona a la cancelación con Raymond o Ward of Protection. La Traición se obtiene desde descartes una sola vez y pasa a victoria sin duplicarse. Oleada sigue resolviéndose; rechazar la reacción conserva el descarte.                                                         |
| Recompensa R1           | Cada investigador puede conservar un Invitado de una cara controlado por cualquiera. No se ofrecen Líderes ni se concede dos veces la misma carta. Se registra como Apoyo de historia, separado del tamaño del mazo. La puntuación se calcula antes de retirar estas recompensas. |
| Registro final          | La puntuación se conserva en el resultado de la aventura y aparece en la pantalla de campaña. Guardar una aventura terminada conserva puntuación, XP, traumas y recompensas; se rechaza una puntuación importada inválida.                                                        |

### Cobertura de aceptación

- [phase-three.test.ts](../packages/cards/src/midwinter-gala/phase-three.test.ts):
  cinco interludios con 1–4 investigadores, veinte parejas de facciones, trece
  tareas de puntuación, umbrales 9/10 a 49/50 de XP y finales dirigidos
  R1 → R2–R6 → R7. R7 sigue siendo una lectura de puntuación, no un resultado terminal.
- [content-acceptance.test.ts](../packages/cards/src/midwinter-gala/content-acceptance.test.ts):
  contratos adicionales de Invitados, caras Rival, Lugares, planes, enemigos y
  traiciones, incluidos límites, costes, éxito y fallo de las ramas indicadas.
- [carl-sanford.test.ts](../packages/cards/src/midwinter-gala/carl-sanford.test.ts):
  cancelación, Oleada, ausencia de duplicados, usos iniciales y conservación de fichas.
- [gala-phase-three-session.test.ts](../apps/web/src/game/gala-phase-three-session.test.ts):
  guardar/reanudar, reproducción y deshacer cada decisión de negociación,
  hechizado, recuperación, Joya controlada/vinculada/bajo cartas/al salir,
  Lámpara al romperse o salir, Rival, Carl, recompensa R1 y los cinco finales.
  Emplea investigadores y cartas registrados en mesas dirigidas.
- [gala-fallback.test.ts](../apps/web/src/game/gala-fallback.test.ts):
  datos y resúmenes propios para 62 códigos EN/ES, doce pares de caras mecánicas,
  reversos de planes/actos/Lugares, fallo de red, JSON inválido, datos parciales,
  imagen ausente y respuesta ES tardía después de cambiar a EN. Los resúmenes
  locales no son una transcripción íntegra del texto oficial.

**G18 quedó cerrado dentro de ese contrato de respaldo.** La aceptación visual
de esos recursos sigue siendo una puerta de fase 4. Al terminar la fase 3, G17
seguía abierto por las victorias legales completas; se cierra con las siete
grabaciones de la fase 4 documentadas más abajo. Las mesas dirigidas de fase 3
siguen siendo evidencia de reglas y persistencia, distinta de esas partidas.

### Compatibilidad y siguiente bloque

Las mesas nuevas de Gala usan **`scenarioRulesVersion: 4`**. Se rechazan las
revisiones anteriores, incluida la 3, conservando el archivo original para
exportarlo; es necesario empezar una mesa nueva. Brethren conserva su revisión
y sus guardados. Los resultados de aventuras terminadas sin el nuevo campo
opcional de puntuación siguen siendo legibles; no se inventa retrospectivamente
una puntuación ausente.

Tras las siete victorias completas, queda la **aceptación visual de fase 4**:
comprobación visible EN/ES en escritorio y 390×640, incluidos avisos,
ampliaciones, recompensas y puntuación final. Después queda
la fase 5 de publicación estable. El teléfono físico permanece diferido y jugar
Gala como historia secundaria dentro de otra campaña sigue fuera de este cierre.

### Verificación general de esta entrega

[Acta de verificación](evidencias/gala-fase-3-verificacion.json): **871 pruebas
aprobadas en 56 archivos**, con 15 pruebas MySQL omitidas porque no se configuró
una base aislada mediante `MYSQL_TEST_URL`. Se ejecutó la suite con dos
trabajadores para evitar el timeout por carga de la prueba de rutas web; las
pruebas SMTP requieren sockets locales y se verificaron fuera del aislamiento.
Tipos de los siete proyectos, lint, formato y compilación correctos.
Se comprobaron las 566 imágenes y 566 miniaturas, los enlaces locales de la
documentación modificada y la ausencia de errores de espacios en el diff.
Permanecen los avisos conocidos de fuente y tamaño del bundle.

Esta verificación corresponde al árbol de trabajo compartido, incluidos los
cambios de interfaz presentes durante la ejecución. No es un acta de aceptación
visual de Gala ni una CI publicada. No se han creado commits, push ni PR.

## Fase 4: victorias completas (20/10/2026)

**G17 cerrado.** Se conservan siete partidas completas en dificultad normal
(`standard`), una por facción y dos equipos distintos de dos investigadores.
Las grabaciones contienen campaña inicial, semilla, entradas, transcripción de
decisiones, resolución y registro final. Las 1.041 decisiones se vuelven a aplicar
desde `startScenario`, sin modificar el estado ni la bolsa para forzar éxitos.

| Facción aliada       | Investigadores (códigos) | Semilla | Decisiones | Final | Grabación                                                  |
| -------------------- | ------------------------ | ------- | ---------- | ----- | ---------------------------------------------------------- |
| Fundación            | 12004                    | 136     | 89         | R2    | [Fundación](evidencias/gala-foundation-136.json)           |
| Miskatonic           | 12007                    | 4       | 121        | R3    | [Miskatonic individual](evidencias/gala-miskatonic-4.json) |
| Sindicato            | 12007                    | 19      | 110        | R4    | [Sindicato](evidencias/gala-syndicate-19.json)             |
| Logia                | 12007                    | 57      | 151        | R5    | [Logia](evidencias/gala-lodge-57.json)                     |
| Kingsport            | 12004                    | 130     | 113        | R6    | [Kingsport](evidencias/gala-kingsport-130.json)            |
| Miskatonic, equipo 1 | 12004 y 12007            | 121     | 246        | R3    | [Primer equipo](evidencias/gala-miskatonic-121.json)       |
| Miskatonic, equipo 2 | 12007 y 12010            | 131     | 211        | R3    | [Segundo equipo](evidencias/gala-miskatonic-131.json)      |

La regresión [gala-playthrough.test.ts](../apps/web/src/game/gala-playthrough.test.ts)
comprueba en cada partida:

- Campaña recreada mediante `newCampaign` y mazos sin problemas de validación.
- Investigador que decide, pregunta, opción y parámetros de cada entrada.
- Resolución de facción esperada, registro final, segundo acto y objetivo de la Joya.
- Resultado con puntuación al cerrar la aventura mediante `finishScenario`.
- Guardado y carga del estado completo en el avance de acto, preguntas propias
  de Gala y final; deshacer paso, acción, turno y ronda cuando hay destino
  disponible, y volver a reproducir hasta el mismo estado.
- Conservación de la campaña terminada al serializar y cargar.

Para reproducir las siete partidas sin generar nuevas grabaciones:

```powershell
pnpm exec vitest run apps/web/src/game/gala-playthrough.test.ts
```

El generador exploratorio [play-gala.mjs](../scripts/play-gala.mjs) busca
recorridos usando elecciones del motor y semillas; no forma parte de la suite
de regresión ni representa una partida humana o una aceptación de interfaz.
Por ejemplo, `node scripts/play-gala.mjs miskatonic 4 1 trish` vuelve a generar
la grabación individual de Miskatonic. La regresión usa los JSON conservados,
no depende de que la estrategia del generador siga encontrando victorias.

### Lo que sigue pendiente

- Recorridos visibles EN/ES en escritorio y 390×640: interludios, avisos de
  avance, ampliaciones, elecciones, recompensas y puntuación final.
- Comprobación del despliegue y publicación estable propia de Gala después
  de esa aceptación. Subir las regresiones no cierra estas dos puertas.
- El teléfono físico continúa diferido y el modo historia secundaria dentro
  de otra campaña permanece fuera del alcance.

Las siete victorias no prueban todas las dificultades, todas las parejas
Aliado/Rival ni todas las interacciones de las 62 cartas. Las preparaciones,
derrotas y mesas dirigidas anteriores complementan esta evidencia y conservan
sus límites originales.

### Verificación de esta entrega

Se validó una copia temporal de `main` con únicamente los archivos de esta
entrega, sin incorporar los cambios del motor y de CI de otra sesión activa.
Formato, lint, tipos de los siete proyectos y build correctos. La suite completa
aprueba **889 pruebas en 58 archivos**; se omiten 15 pruebas MySQL al no configurar
`MYSQL_TEST_URL` (un archivo omitido). Incluye las siete regresiones nuevas.
Las pruebas SMTP se ejecutaron con acceso a sockets locales.

Se comprobó además el comando de generación de Miskatonic, los enlaces locales
de los documentos actualizados, las 62 filas únicas de la matriz y las 1.041
entradas con sus transcripciones. Permanecen los avisos conocidos de fuente y
tamaño del bundle. Esta comprobación local no acredita la CI remota, el
despliegue ni la aceptación visual pendiente.
