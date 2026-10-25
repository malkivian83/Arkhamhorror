# 84 · El camino a Carcosa

## Estado actual

**Campaña completa: los 8 escenarios son jugables, con los Interludios I y II y el
epílogo** (décima entrega). Lola Hayes es jugable ([documento 86](86-investigadora-lola-hayes.md)).

| Escenario                      | Implementado                                                                            | Pendiente para jugar                                                                                                                    |
| ------------------------------ | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| I · Se cierra el telón         | Completo: preparación, actos, planes, Lugares, 7 conjuntos, resoluciones y narración    | —                                                                                                             |
| II · El último Rey             | Completo: preparación, Transeúntes, planes, acto, 5 conjuntos, R1–R3 e Interludio I      | —                                                                                                                                       |
| III · Ecos del pasado          | Completo: preparación al azar, Pasadizos, Sr. Peabody, 6 conjuntos, R1–R4 y recompensas   | —                                                                                                                                       |
| IV · El juramento inconfesable | Completo: preparación, recuerdos, Monstruos bajo el acto, Daniel, 6 conjuntos, R1–R3 e Interludio II | —                                                                                                                                       |
| V · El Fantasma de la Verdad   | Completo: sueños, Dudas/Convicciones, El organista, 6 conjuntos, Lugares de París y R1–R3 | —                                                                                                                                       |
| VI · La máscara pálida         | Completo: cuadrícula de Catacumbas, El hombre de la máscara pálida, Haruko, 4 conjuntos y R1–R2 | Ranuras de Caverna repleta de huesos (ver límites)
| VII · Surgen estrellas negras  | Completo: planes dobles, dos versiones al azar, abadía, Ashleigh, 7 conjuntos y R1–R3 | —
| VIII · Penumbrosa Carcosa      | Completo: tres versiones de Hastur, Historias en el reverso de los Lugares, Posesión, cordura en Carcosa, R1–R5 y epílogo | —

Las dependencias compartidas se enumeran más abajo.

## Primera entrega: base de campaña

Campaña original de ocho escenarios; no incluye las variantes de Regreso a
El camino a Carcosa. Registrada como `the-path-to-carcosa`, con orden oficial,
bolsas iniciales por dificultad y nombres EN/ES. Los interludios no ocupan un
puesto de escenario. La portada procede de la primera página del PDF aportado,
renderizada sin marcas de imprenta y revisada visualmente.

La vitrina indica que está en desarrollo y deshabilita el inicio. Las salas
online solo ofrecen campañas con primer escenario disponible. Ningún escenario
de Carcosa tiene todavía `build`: crear su registro desde la API de cartas no
permite jugarlo. No se importan ni habilitan cartas de jugador en esta entrega.

Fuentes consultadas:

- `docs-proyecto/reglas/AHLCG_El_camino_a_Carcosa_revisado.pdf`, 36 páginas:
  índice y conceptos en p. 2, preparación y prólogo en p. 3, primer escenario
  y resoluciones en pp. 4–6. Bolsas contrastadas visualmente con p. 3.
- Copia externa `D:/referencia/ArkhamHorror-main/backend/arkham-api/library/Arkham/`:
  `Campaign/Campaigns/ThePathToCarcosa.hs`,
  `Campaigns/ThePathToCarcosa/ChaosBag.hs` y
  `Scenario/Scenarios/ThePathToCarcosa/CurtainCall.hs` (preparación y símbolos).
  Solo consulta; implementación propia. El PDF prevalece sobre la referencia.

Las cuatro bolsas comienzan con tres calaveras, fallo automático y símbolo
arcano, sin sectarios, tablillas ni primigenios. Tamaños: 15/15/16/17. No se
reutiliza la bolsa de Hermanos de ceniza, cuyos símbolos son distintos.

## Segunda entrega: reglas de campaña y narración

Se registran las reglas de referencia y las resoluciones de Se cierra el telón,
sin añadir aún un `build`. Las pruebas usan una fixture genérica, no una partida
completa del escenario. Quedan implementados:

- Dudas, Convicciones y Persiguiendo al Extranjero, compartidos y persistentes
  en el registro; acumulación secuencial y empate explícito.
- Calaveras según horror y dificultad; sectario, tablilla y primigenio colocan
  horror en el Lugar o infligen horror al investigador si ya lo había. Las fichas
  de horror del Lugar se guardan en `scenarioMeta`, separadas del horror personal.
- Sin resolución, R1 y R2: notas, marcas, experiencia de Victoria y portador de
  la debilidad, incluso con todos los investigadores derrotados. La ausencia de
  resolución registra las derrotas del Extranjero; R1/R2 dan dos marcas.
- El hombre de la máscara pálida (03059): aparición en el Lugar más alejado de
  todos los investigadores, incluidos Lugares ocupados y decisión del jefe en
  empates; investigación con +2 al velo que sustituye el descubrimiento por su
  derrota; retorno al descarte de su portador y seguimiento de derrotas. La
  transferencia de portador al abandonar la campaña sigue pendiente.
- Resúmenes y datos de presentación EN/ES, con los dos escaneos oficiales de
  03059 revisados visualmente. La presentación de enemigos que son debilidades
  incluye sus valores de combate, evasión, salud, daño y horror.

El motor ahora consulta `EnemyBehavior.spawn` al resolver una debilidad Enemigo,
conservando su dueño. Antes solo permitía aparición enfrentada o el caso específico
del Lugar vacío más alejado. Se conserva ese comportamiento para las otras cartas.

Diferencia revisada: la referencia Haskell añade sospechas de la policía por robo
también en R2; el PDF ES p. 6 no lo ordena. Se sigue el PDF y solo R1 añade esa nota.

### Narración

Seis relatos oficiales EN/ES importados conservando el resto de las campañas:
prólogo, prólogo de Lola, introducción, sin resolución, R1 y R2. Las instrucciones
de juego se presentan como efectos, separadas de la narración. Se generan seis
MP3 **en español** con ElevenLabs y **Carmelo - Mature, Mysterious and Clear**,
voz `5egO01tkUjEzu7xSSE8M`, verificada contra la cuenta. La voz del generador de
Excelsior era Mario; no se ha reutilizado ni cambiado para esta campaña.

- Importación: `node scripts/import-carcosa-story.mjs [copia-de-referencia]`.
- Inspección sin consumo de créditos: `node scripts/generate-carcosa-audio.mjs --list`.
- Generación autorizada: `node scripts/generate-carcosa-audio.mjs --generate`.
- Reanudación por huella de entrada y archivo: conserva grabaciones coincidentes
  y rechaza sobrescribir otras. La clave permanece en `.env`, fuera de los archivos.
- Evidencia: [carcosa-narracion.json](evidencias/carcosa-narracion.json), voz,
  ajustes, caracteres, huellas de entrada/audio y tamaños. Se han verificado las
  tramas MPEG de los seis archivos (aprox. 14 min 47 s en total), sin tramas
  truncadas; esto no equivale a una revisión auditiva humana.

La narración de Lola queda preparada, pero no se activa esa investigadora. Los
audios están registrados por clave de historia; se ofrecerán al alcanzar esos
relatos cuando el escenario completo esté habilitado.

## Plan de la tercera entrega: completar Se cierra el telón

Plan previo a la tercera entrega, conservado como registro; ya está completado:

1. Datos de actos, planes, Lugares y encuentros con códigos oficiales y
   presentación EN/ES. Conjuntos: Se cierra el telón, Portentos malignos,
   Delirios, Apariciones, Secta del Signo Amarillo, Miedo impactante y Ratas.
2. Preparación: Teatro, Vestíbulo, Palcos y Bastidores en juego; investigadores
   en el Teatro, salvo Lola en Bastidores. Apartar al Emisario real, El hombre
   de la máscara pálida y las Puertas de vestíbulo y bastidores. Revisar las
   conexiones y las entradas de las Puertas con las cartas, no solo con el mapa.
3. Conectar el prólogo y la introducción ya preparados al escenario completo;
   variante de Lola pendiente de su disponibilidad real como investigadora.
4. Símbolos, revelaciones, capacidades de Lugares, actos y planes, incluida la
   persistencia del Emisario. Probar los efectos principales de cada carta.
5. Conectar los actos con las resoluciones ya implementadas y el efecto de robo
   en la taquilla con su metadato. En el acto 2, revisar la sustitución de la
   derrota del Extranjero por su traslado al Vestíbulo y su interacción con marcas.
6. Completar el cambio de portador si abandona la campaña y probar el traslado
   entre mazos reales. Los efectos de 03059 ya tienen pruebas dirigidas.
7. Pruebas de preparación con 1–4 investigadores y todas las dificultades,
   resoluciones y partidas completas; revisión visual representativa EN/ES.

### Criterios para habilitar el escenario I (cumplidos en la tercera entrega)

- [x] Construir un `ScenarioDefinition` completo con los conjuntos de encuentro,
      las cantidades, cartas apartadas, variantes y conexiones revisados.
- [x] Implementar y probar cada carta, las tres variantes del acto 2 y el ciclo
      de aparición, derrota y regreso del Emisario real.
- [x] Conectar el horror de los Lugares con los efectos y propagaciones del
      escenario, y mostrarlo en mesa; tenerlo guardado en metadatos no completa
      esas reglas ni su presentación.
- [x] Resolver los objetivos, la retirada y la derrota del grupo mediante el
      flujo real de actos y planes, llegando a las resoluciones existentes.
- [x] Completar la asignación y transferencia de la debilidad entre portadores,
      incluidos investigadores eliminados, y su persistencia entre partidas.
- [x] Integrar textos, referencia del escenario, imágenes y miniaturas EN/ES;
      conectar los seis audios existentes sin volver a generarlos.
- [x] Superar pruebas de preparación, variantes, efectos, resoluciones,
      guardado/reanudación y partidas completas con 1–4 investigadores y las
      cuatro dificultades. Revisar presentación y decisiones local/online.
- [x] Añadir el `build` en `the-path-to-carcosa/definition.ts` y actualizar la
      descripción de disponibilidad solo al completar lo anterior. Los otros
      siete escenarios seguirán pendientes hasta su propia implementación.

## Tercera entrega: Se cierra el telón jugable

Escenario completo en `the-path-to-carcosa/curtain-call.ts` y conjuntos de
encuentro reutilizables en `encounter-sets.ts` (Portentos malignos, Delirios,
Apariciones, Secta del Signo Amarillo, Miedo impactante y Ratas). Mazo de 32 cartas;
apartados el Extranjero, el Emisario real y las seis Puertas. Fuentes: guía ES pp. 4–6
y cartas; referencia Haskell (`CurtainCall.hs`, actos, planes y Lugares) solo como
contraste.

Motor (genérico, reutilizable por otras campañas):

- Horror y perdición en los Lugares (`Location.horror/doom`); la perdición cuenta
  para el plan y se retira al avanzarlo. Sustituye a los metadatos de la segunda entrega.
- Oculto: la traición va en secreto a la mano (`hidden`), se trata como zona de
  amenaza, cuenta para el tamaño de mano (×3 en Bastidores), solo su dueño ve y usa
  sus habilidades y solo la descarta su propio texto. En línea, los demás ven una
  carta oculta y el registro no revela cuál se robó.
- Restricciones continuas de traiciones: jugar/comprometer tipos, habilidades
  [fast] y moverse una vez por turno; coste adicional de acciones (Frozen in Fear);
  coste de cartas modificado por el escenario (Cabina de luces); `onReveal` de
  Lugares; `insteadOfDiscard` de enemigos (objetivo del acto 2); fichas añadidas
  solo para el escenario; traiciones que se descartan al dejar de cumplirse
  (Torres de Carcosa); `ForEachPointFailed` (Surgen estrellas negras).
- Campaña: `transferOnLeave` pasa 03059 a otro investigador si su portador muere o
  enloquece. Con un solo superviviente pasa directamente; con varios queda pendiente
  en el registro (`transfer:<código>`) y el grupo elige el heredero entre escenarios
  (`chooseTransferHeir`; en línea, el anfitrión). No se puede empezar el siguiente
  escenario hasta elegirlo.

Decisiones y diferencias revisadas:

- La copia del acto 2 se elige al azar en la preparación con la semilla; es
  equivalente a elegirla al avanzar (nadie la ve antes) y el mazo de actos muestra 3.
- El Extranjero derrotado en el acto 2 cuenta como derrota (Persiguiendo al
  Extranjero) y vuelve al Vestíbulo sin daño.
- Todos retirados o derrotados con alguno retirado en el acto 3: el grupo elige R1/R2
  («Huida del teatro»); todos derrotados: sin resolución.
- Palcos solo castiga la acción de movimiento (no los movimientos por efecto).
- La restricción de Languor sigue sin aplicarse a eventos jugados como reacción;
  corregirlo cambia una partida grabada de Queen of Ash (hallazgo aparte).

Presentación: catálogo oficial EN/ES (`scripts/import-carcosa-cards.mjs`, 36 cartas,
con dos erratas corregidas), 108 escaneos EN/ES con miniaturas
([evidencia](evidencias/imagenes-curtain-call.json)), códigos con letra (03047a–c,
03084a–d), fichas de horror/perdición en el mapa, nombre de la cara sin revelar de
las Puertas, referencia de símbolos y ayuda de fichas desde la carta oficial.
Revisión visual local: prólogo con audio, preparación, plan/acto, mapa y Puertas.

Validación: 123 pruebas de Carcosa (preparación 1–4 jugadores × 4 dificultades,
cada Lugar, acto, plan, variante y carta de encuentro, retirada con entradas reales,
guardado/reanudación y 160 partidas guiadas que recorren los tres actos y las tres
variantes). Batería completa: 3261 correctas, 19 omitidas y 1 fallo ajeno (Eureka,
por el cambio sin publicar de `SearchDeck.anyCard` del lote de cartas en curso).
Formato, tipos y compilación correctos; lint correcto salvo un aviso en
`grouped-import` (ajeno).

## Cuarta entrega: El Último Rey e Interludio I

Escenario en `the-path-to-carcosa/the-last-king.ts`; conjuntos El regalo de Hastur,
Podredumbre e impurezas, El Extranjero y Antiguos males añadidos a `encounter-sets.ts`.
Mazo de 22 cartas; apartados Dianne Devine y los cinco VIP Lunáticos. Fuentes: guía ES
pp. 7–9 (revisadas sobre la página renderizada) y textos de las cartas de la referencia
(`cards_{en,es}.json`, `TheLastKing.hs` y sus Lugares, solo como contraste).

- Transeúntes: apoyos sin dueño con pistas (1 + 1 por investigador), al azar en los cinco
  Lugares que no son el Recibidor. Negociar con su requisito, prueba y acciones; Un público
  difícil suma 1 acción por copia. Al tomar la última pista se les interroga (una vez por
  partida); las pistas retiradas por una Realidad repulsiva no cuentan como interrogatorio.
- Planes: el reverso del 1 hace aparecer a Dianne junto al Transeúnte con menos pistas y
  baraja los descartes. El 2 sustituye el avance por una Realidad repulsiva al azar
  (horror, pistas al Lugar y Enemigo Lunático en lugar del apoyo); sin ninguna, R3.
- Acto: las pistas de los eliminados van al acto; cada 2 dan 1 experiencia repartida lo más
  equitativamente posible (el jefe elige quién recibe el resto).
- Resoluciones: VIP interrogados y muertos en el registro (tachados en R3), cambio de
  fichas del caos en R2/R3 e Interludio I tras R1 con sus tres opciones.
- Motor (genérico): pistas sobre apoyos colocados y sobre el acto, traiciones junto al
  plan (`placement: agenda`, con velo global), sustitución del avance de un plan, enemigos
  que impiden tomar pistas en su Lugar o cuyos ataques no se cancelan, escenarios que
  omiten el robo de mantenimiento y reacción `afterParley`. Aparecer enfrentado ahora
  dispara "después de enfrentarse".

Diferencias revisadas: la fuente inglesa usa los nombres de la reedición (Possessed, Seer of
the Sign, Puppet of Hastur); el catálogo conserva los originales (Lunatic, Maniac, Young
Psychopath) como la guía, las imágenes y la fuente española. Dos erratas de la fuente ES
corregidas al importar. Límites "una vez por fase" del Salón de baile y la Sala de estar
como "una vez por ronda" (solo se negocia en la fase de investigación). La Danza del Rey
de Amarillo lleva al Lunático directamente a tu Lugar.

Validación: 68 pruebas nuevas (preparación 1–4 × 4 dificultades, cada Transeúnte, Lugar,
plan, enemigo y carta de encuentro, resoluciones e interludio, y 40 partidas aleatorias).
Formato, lint y tipos correctos.

Presentación: catálogo oficial EN/ES (78 cartas de Carcosa), 104 escaneos EN/ES con
miniaturas ([evidencia](evidencias/imagenes-the-last-king.json)) contrastados con los datos
(velo, pistas, valores de enemigos y umbrales), Constance Dumaine con caras `03076a`/`03076b`,
pistas sobre los Transeúntes y sobre el acto, traiciones junto al plan y referencia de
símbolos. Revisión visual local en ES/EN con una partida en curso. Sin audios: la narración
del escenario II se muestra como texto; `generate-carcosa-audio.mjs` aún solo cubre el I.

## Quinta entrega: Ecos del pasado

Escenario en `the-path-to-carcosa/echoes-of-the-past.ts`; cartas de jugador Sr. Peabody,
Broche de ónice negro (Debilidad) y El Manto Andrajoso en `echoes-assets.ts`; Las máscaras
de medianoche (solo sus 5 traiciones), Secta oscura y Puertas cerradas añadidas a
`encounter-sets.ts`. Mazo de 33 cartas menos los Buscadores que aparecen en la preparación.
Fuentes: guía ES pp. 10–12 (revisadas sobre la página renderizada), cartas de la referencia
y `EchoesOfThePast.hs` (Lugares y símbolos) como contraste.

- Preparación: 1 Lugar Sociedad Histórica de cada planta retirado al azar; Buscadores de
  Carcosa según jugadores; Información de Sebastien (1 pista por investigador en el
  Vestíbulo, solo si no está tachado) y 1 acción adicional en el primer turno si huyeron de
  la fiesta.
- Conexiones: el Vestíbulo y los Pasillos tranquilos conectan con su planta; las caras sin
  revelar conectan con el centro de su planta y las reveladas por sus símbolos. En el acto 3,
  los Pasadizos se conectan entre sí; el Sr. Peabody hace Pasadizo (y -1 velo) al Lugar que
  elija hasta que se prepare. Para los enemigos, la Biblioteca oculta es un Pasadizo.
- Planes: sin perdición en el Mitos; las pistas colocadas sobre enemigos pasan a perdición.
  El plan 2 trae al Juramentado poseído y a Sebastien Moreau (si no está entre los VIP
  muertos); el 3, R4. El Juramentado es inmune en los actos 1–2 y derrotarlo es R3.
- Resoluciones: R1/R2 al decidir en el acto 3, R3, R4 (también sin resolución); notas,
  Dudas/Convicciones, Broche obligatorio (R1) y Manto opcional (R3), Sebastien muerto y
  cambio de fichas.
- Motor (genérico): conexiones del escenario y adicionales solo para enemigos, omitir la
  perdición del Mitos, pistas que se vuelven perdición, "tu habilidad no puede
  modificarse", traiciones que impiden investigar, disparador al final del Mitos, coste de
  cartas modificado desde la mano y cordura modificada por un apoyo. Las conexiones se
  recalculan al avanzar acto o plan y al preparar cartas.

Diferencias revisadas: la referencia añade 2 primigenios en R4; la guía ES p. 12 dice 1
sectario, 1 tablilla y 1 primigenio, y se sigue la guía. Los umbrales de perdición son por
investigador (cartas impresas). El Museo histórico dice "no puede ser modificado" en las
cartas EN/ES impresas; la fuente decía "aumentado" (corregido al importar). La reacción de la
Biblioteca histórica se ofrece al terminar la prueba, ya descubierta la pista.

Validación: 60 pruebas nuevas (preparación 1–4 × 4 dificultades, conexiones, Pasadizos y
Sr. Peabody, cada Lugar, plan, acto, ficha, carta de encuentro y recompensa, resoluciones
y 40 partidas aleatorias). Presentación: catálogo EN/ES (111 cartas de Carcosa), 106
escaneos EN/ES con miniaturas ([evidencia](evidencias/imagenes-echoes-of-the-past.json))
contrastados con los datos; revisión visual local del acto 3.

## Sexta entrega: El juramento inconfesable e Interludio II

Escenario en `the-path-to-carcosa/the-unspeakable-oath.ts`; cartas de jugador Daniel
Chesterfield (aliado, 03182a) y Coraje (Información de Constance) en `oath-assets.ts`;
Habitantes de Carcosa y Agentes de Hastur añadidos a `encounter-sets.ts`. Mazo inicial de 23
cartas; 7 Monstruos y 7 Lunáticos apartados en montones, más Daniel (Enemigo) y Constance.
Fuentes: guía ES pp. 13–16 (revisadas sobre las páginas renderizadas), cartas de la
referencia y `TheUnspeakableOath.hs` como contraste.

- Preparación: 1 copia al azar de cada ala de los Pasillos; cada investigador elige en
  cuál empieza (nuevo `startingLocationChoices`). Ficha permanente -2/-3/-4/-5 según
  dificultad, anotada en el registro. Acto 2 v. I con el broche, v. II sin él. Introducción
  1 o 2 según el registro, la 3 y la Información de Constance (la carta superior del mazo
  pasa a ser un apoyo Coraje; si abandona el juego, se descarta la carta real).
- Lugares: Cocina, Jardín y Pasillo del sótano no se pueden entrar sin revelar en el acto 1;
  entrar en una Celda sin revelar cuesta 1 pista al que entra. Revelar el Pasillo del sótano
  pone en juego las 4 Celdas en huecos al azar; revelar la Celda de Daniel avanza el acto 2.
  Seis capacidades de "recuerdo" (en `scenarioMeta`, visibles en el registro de la mesa y en
  línea); con 4 avanza el acto 3. Patio, Comedor, Enfermería y ambas alas implementadas.
- Monstruos bajo el acto: al azar y sin mirar (`underAct`, oculto en línea); Su dominio los
  baraja en el mazo en su lugar. Los actos 2 v. I y 3 los devuelven al mazo; con 3 o más,
  el de menos [willpower] descarta hasta un Monstruo y lo roba.
- Fichas: calavera (difícil: revela otra, una vez por prueba), sectario y tablilla (velo
  básico) y primigenio (Monstruo bajo el acto o fallo automático elegido, nuevo
  `ForceSkillTestFailure`).
- Daniel: aliado con su daño forzado al recibir horror, cesión rápida y retirada del juego al
  salir; si su controlador se retira, sobrevive (Interludio II). Enemigo en la v. II;
  negociar con el Broche de ónice negro lo lleva a la zona de victoria.
- Encuentros: Camisa de fuerza (ocupa ranuras en la zona de amenaza), Regalo de la locura
  Piedad/Miseria (Ocultos), Las paredes se cierran (horror por punto de fallo o Monstruo),
  El Signo Amarillo (roba una Debilidad Locura), Glotón (no ataca tras cazar ni hace ataques
  de oportunidad), Paciente loco, Bestia de Aldebarán (todo el daño a una sola carta mientras
  quepa), Semilla de Hali y Byakhee chillador.
- Resoluciones: los derrotados quedan enloquecidos (nuevo `DriveDefeatedInsane`); R1 si
  todos fueron derrotados (sin Interludio II), R2/R3 al retirarse por el Jardín según se
  derribara a la enfermera. R2: 1 trauma físico. Constance muerta y cambio de fichas. El
  Broche pasa a otro investigador si su portador abandona la campaña.
- Interludio II: Daniel sobrevivió (+2 de experiencia), fue poseído o no sobrevivió; ignorar
  la advertencia (2 Dudas) o hacerle caso (2 Convicciones, +1 de experiencia y la regla de
  HASTUR, solo anotada).

Diferencias y límites: la app no permite elegir investigadores de sustitución en R1; si no
quedan investigadores, la campaña no puede continuar. La carta EN de las Celdas no tiene el
rasgo Manicomio Arkham (la traducción ES sí): se sigue la EN y el coste de 1 pista se
mantiene en todos los actos. El horror de "cuando atacas al Paciente loco" se recibe tras
revelar la ficha. El daño forzado de Daniel cuenta el horror que recibe el investigador.

Validación: 62 pruebas nuevas (preparación 1–4 × 4 dificultades, elección inicial,
Información de Constance, entradas bloqueadas y Celdas, actos 1–4, planes 1–3, fichas,
Lugares, Daniel, enemigos, traiciones, resoluciones, Interludio II, traspaso del broche y 40
partidas aleatorias). Presentación: catálogo EN/ES (146 cartas de Carcosa), 116 escaneos
EN/ES con miniaturas ([evidencia](evidencias/imagenes-the-unspeakable-oath.json)) y 13
narraciones nuevas con Carmelo (introducciones, Información de Constance, investigador
derrotado, R1–R3 e Interludio II).

## Séptima entrega: El Fantasma de la Verdad

Escenario en `the-path-to-carcosa/a-phantom-of-truth.ts` (con la Debilidad Alma perdida);
Byakhee (Byakhee veloz y Cazado por Byakhee) añadido a `encounter-sets.ts`, y la copia
03226 de Paralizado por el miedo con el mismo comportamiento que 01164. Fuentes: guía ES
pp. 17–21 (texto extraído del PDF), cartas de la referencia y `APhantomOfTruth.hs`
(símbolos y distribución) como contraste; umbrales comprobados en los escaneos.

- Introducción: Introducción 1 o 2 y los Sueños según el registro (Rey, reunión secreta,
  monstruos, policía, marcas de Persiguiendo al Extranjero). Sueño 1: Alma perdida en cada
  mazo y en el registro; Sueño 4: 1 trauma mental; Sueño 7: Paranoia (12101, la
  reimpresión de Básica 97) al investigador elegido; Sueño 10: decisión con Convicción
  (Sueño 11) o Duda (Sueño 12), que se aplica antes de fijar el acto 1 y las cartas
  retiradas. Información de Jordan: +3 recursos y empezar en Montparnasse.
- Preparación: Dudas ≥ Convicciones retira Soles gemelos y Sombra acechante (acto 1 v. I,
  Persiguiendo sombras); más Convicciones retira Surgen estrellas negras y Pista falsa
  (acto 1 v. II, Acechados por las sombras). Una copia al azar de Montmartre, Opéra Garnier
  y Le Marais.
- Planes: con más Convicciones, la perdición de otras cartas resta del umbral (nuevo
  `thresholdDoom`). Reversos 1–2: desenfrentarse, moverse si se quiere y El organista se
  aleja; Jordan Perry aparece en Montparnasse si no murió. Reverso 3: R3 con Dudas, o el
  reverso del acto 2 (R2 con la reunión secreta, si no R1).
- Actos: el acto 1 también avanza al final de la ronda con 3 o más de perdición en juego
  (2 horror a cada uno y El organista en el otro sitio). Persiguiendo sombras: pistas sobre
  El organista tras atacarlo con éxito (límite de grupo 1 por investigador y ronda) hasta 3
  por investigador. Acechados: [fast] 1 pista por investigador para perdición o evitar.
- El organista: no recibe daño ni puede ser derrotado; Envuelto en misterio se aleja (o se
  separa) al final de la fase de Enemigos; Lo desafié sin esperanza vuelve a cazar una vez
  por ronda y no ataca esa fase (nuevo `EnemySkipsAttacks`, y `huntedRound` se marca en
  todo movimiento por Cazador).
- Fichas: calavera (perdición en juego), sectario (Byakhee hacia el investigador más
  cercano), tablilla (cancela iconos y efectos de las cartas de habilidad, nuevo
  `CancelCommittedSkills`) y primigenio (recursos por punto de fallo).
- Lugares: los 13 con su capacidad: Opéra Garnier duplica iconos o valor base (nuevo
  `skillDoubling`), Père Lachaise y Le Marais impiden salir esa ronda (nuevo
  `cannotLeave`), Jardines de Luxemburgo conectan para los Byakhee (las conexiones de
  enemigo reciben el enemigo que se mueve), Gare d’Orsay, Notre-Dame, Montparnasse,
  Montmartre, Grand Guignol, Canal Saint-Martin y Le Marais.
- Encuentros: Byakhee sigiloso, Soles gemelos, Destino fatal, Acordes tortuosos (coste +1
  con el nuevo disparador `afterPlayCard`), Byakhee veloz y Cazado por Byakhee.
- Resoluciones: sin resolución y R1–R3 con sus notas, fichas, Jordan muerto, y R2 con 1
  trauma mental y 2 de experiencia adicional.

Diferencias y límites: el Sueño 5 (huevo de Pascua) no se muestra. El jugador que juega un
apoyo revelado de otro mazo en Montmartre lo controla y, al descartarlo, va a su propia pila.
Destino fatal resuelve el ataque desde los descartes como daño y horror sin enemigo en
juego. El sectario solo mueve Byakhee preparados (como Cazador). La regla de HASTUR del
Interludio II sigue solo anotada.

Validación: 58 pruebas nuevas (preparación 1–4 × 4 dificultades y variantes del registro,
Sueños, planes, actos, El organista, fichas, Lugares, encuentros, resoluciones y 40
partidas aleatorias). Presentación: catálogo EN/ES (177 cartas de Carcosa), 104 escaneos
EN/ES con miniaturas ([evidencia](evidencias/imagenes-a-phantom-of-truth.json)) y 20
narraciones nuevas con Carmelo (introducciones, Sueños, Despertar, Información de Jordan y
resoluciones).

## Octava entrega: La máscara pálida

Escenario en `the-path-to-carcosa/the-pallid-mask.ts`; Gules (Secuaz gul, Gul voraz,
Manos aferradoras) y Frío glacial (Frío de la cripta, Envuelto en niebla) de la caja básica
original añadidos a `encounter-sets.ts`. Fuentes: guía ES (texto extraído del PDF), cartas
de la referencia y escaneos (pistas por investigador de cada Catacumba, umbral del acto 2
y salud del Espectro de la muerte).

- Introducción: Introducción 1 (despertaron en las catacumbas, si no escaparon de la mirada
  del Fantasma o no encontraron a Nigel) o 2, e Información de Haruko si no murió (abre un
  pasadizo secreto: decisión opcional en la preparación).
- Preparación: Lugar inicial al azar o Puerta al Infierno; mazo de Catacumbas con la
  Tumba de sombras, el Pasadizo bloqueado y otras 3 en las 5 cartas inferiores. El afectado
  por El hombre de la máscara pálida (03059) lo pone aparte.
- Cuadrícula: posiciones `[x, y]` desde el Lugar inicial; cada Catacumba revelada coloca
  la carta superior del mazo arriba, abajo, a izquierda o derecha según la carta impresa, y
  los Lugares adyacentes quedan conectados. Las segundas copias usan el sufijo `~2` en el
  identificador (`printedCode` devuelve el código impreso para imágenes y textos).
- Coste de entrada: entrar en una Catacumba no revelada exige gastar en grupo tantas pistas
  como investigadores (salvo junto a Arcadas de piedra revelados); Túnel angosto pide antes
  Agilidad (3).
- Planes y actos: El Espectro de la muerte aparece en el Lugar inicial; el reverso del plan 2 inflige 1
  trauma físico y derrota a todos. La Tumba de sombras hace avanzar el acto; El hombre de la
  máscara pálida aparece en ella con +1 de salud por investigador y no puede ser derrotado
  allí por su capacidad. Derrotarlo lleva a Convicción ×2; dejarlo marcar Duda ×2 y retira
  el acto La salida de allí. R1 con todos en Puerta al Infierno; R2 con todos en el Pasadizo bloqueado.
- Fichas: calavera (distancia al Lugar inicial, máx. 5 en Fácil/Normal), sectario (−1 daño o
  ninguno durante un ataque; nuevo `AdjustAttackDamage`), tablilla (ataque de un Gul o Geist
  del Lugar) y primigenio (robar un Gul o Geist).
- Lugares: Cripta de la lámpara sepulcral investigada con Voluntad (nuevo `investigateSkill`), Túneles iluminados por velas (mirar la carta superior), Pozo de las almas, Estanques gélidos, Pasadizo bloqueado (2
  daño y atrapado) y el resto de capacidades impresas.
- Encuentros: Espectro de la muerte (reverso del plan 1), Guía de las catacumbas, Morador de cadáver, Ojos en las paredes, La sombra
  detrás de ti, El pozo abierto y los conjuntos de la caja básica.
- Resoluciones: sin resolución, R1 y R2 con sus notas, fichas (0/1/2 Convicciones o Dudas),
  Haruko muerta y 2 marcas en Persiguiendo al Extranjero en R2. Sin resolución se ofrece
  leer el Acto II de El Rey de Amarillo: +2 de experiencia y una Debilidad básica de Locura o
  Pacto al azar.

Diferencias y límites: Caverna repleta de huesos no reduce las ranuras de mano. Ojos en las
paredes no reparte el horror de forma equitativa. La salud extra de El hombre de la máscara
pálida se fija al aparecer.

Validación: 62 pruebas nuevas (preparación con y sin despertar, cuadrícula, coste de
entrada, planes, actos, fichas, Lugares, enemigos, traiciones, resoluciones y 40 partidas
aleatorias). Presentación: catálogo EN/ES (206 cartas de Carcosa), 92 escaneos EN/ES con
miniaturas ([evidencia](evidencias/imagenes-the-pallid-mask.json)), cuadrícula revisada en
escritorio y móvil y 6 narraciones nuevas con Carmelo (introducciones, Información de Haruko y
resoluciones).

## Novena entrega: Surgen estrellas negras

Escenario en `the-path-to-carcosa/black-stars-rise.ts`. Fuentes: guía ES pp. 25–27 (texto
extraído del PDF), cartas de la referencia y `BlackStarsRise.hs` con sus cartas como
contraste; umbrales, pistas por investigador y conexiones comprobados en los escaneos.

- Motor: dos mazos de Plan a la vez (`secondAgenda`, `secondAgendas` en la definición). La
  perdición en "el plan en curso" pide al jefe en qué plan colocarla; la de otras cartas
  cuenta para ambos umbrales; al avanzar un plan no se retira la del otro; si los dos
  umbrales se cumplen, el jefe elige cuál avanza y después se comprueba el otro. Nuevos
  `AdvanceSecondAgenda`, `RemoveDoom` por mazo, `afterDoomPlaced` con el mazo,
  `cannotDiscoverClues`, `onSuccessBelow` (tablilla en Difícil) y `DriveDefeatedInsane`
  con `all`. Un escenario puede empezar sin mazo de Acto si tiene dos de Plan; el guardado y
  la vista en línea (sin los planes siguientes) admiten el segundo mazo.
- Preparación: versión al azar (La inundación de abajo o El vórtice de arriba: planes 2a y
  2c, Capilla de san Auberto y Torre de la abadía), Coro gótico, Torre norte, Muro exterior y
  Escalones rotos al azar; ficha −3/−5/−6/−7 para el resto de la campaña; Debilidad básica
  aleatoria Locura, Pacto, Sectario o Detective para cada investigador. Información de
  Ashleigh: [fast] retirar 1 perdición de un plan (una vez por partida).
- Planes: [fast] 1 pista por investigador para 1 perdición en ese plan (recursos o cartas);
  reversos 1a/1c (Terror de la marea o Buscador de la grieta al mazo y Convicción/Duda según
  el plan 1 del otro mazo), "Mundos entrelazados" (Bestia de Aldebarán y Ashleigh Clarke,
  salvo si murió), "El camino a Carcosa" (el mazo se sustituye por el acto 3a o 3c; si era
  el primero, el otro pasa a ser el único) y planes 3 → R3. Antiguos males con oleada en
  2a/3a; Monstruos +1 de combate en 2c/3c.
- Actos 3a/3c: todos en la Capilla o en la Torre sin pistas → R1 o R2.
- Fichas: calavera (mayor perdición sobre un plan; total en Difícil), sectario (revela otra
  o fallo automático con perdición en el enemigo), tablilla (revela otra; perdición en cada
  plan si fallas, o si no superas por 1 en Difícil) y primigenio (robar un Byakhee).
- Lugares: Porte de l'Avancée, Grand Rue, ambas versiones de Muro exterior, Torre norte y
  Escalones rotos, Iglesia de la abadía (coste de entrada desde los Escalones, +2 velo y
  pone en juego la abadía), Coro gótico, Claustro (guía), Sala del caballero (llave con
  [agility]), Capilla y Torre (bloqueadas sin guía o llave, y sus restricciones de pistas).
- Encuentros: Terror de la marea, Buscador de la grieta, Inundación rompiente y Los mundos se fusionan.
- Resoluciones: R1 y R2 con su nota, fichas (2 sectario y 2 tablilla o primigenio) y Ashleigh
  muerta; sin resolución → R3: todos enloquecen y la campaña se pierde.

Diferencias y límites: el visor del mazo de Plan permite ver los reversos de los planes
siguientes, como en los demás escenarios, y con ellos la versión elegida. El repaso de
avances no muestra los del segundo mazo de Plan.

Validación: 72 pruebas nuevas (preparación, planes dobles, actos, resoluciones, fichas,
Lugares, encuentros, guardado y 40 partidas aleatorias). Presentación: catálogo EN/ES (238
cartas de Carcosa), 120 escaneos EN/ES con miniaturas
([evidencia](evidencias/imagenes-black-stars-rise.json)), segundo plan en la mesa revisado
en escritorio y móvil y 5 narraciones nuevas con Carmelo (introducción, Información de
Ashleigh y resoluciones).

## Décima entrega: Penumbrosa Carcosa y epílogo

Escenario en `the-path-to-carcosa/dim-carcosa.ts`. Fuentes: guía ES pp. 28–32 (texto
extraído del PDF), cartas de la referencia y `DimCarcosa.hs` con sus cartas como
contraste; pistas por investigador y estadísticas de Hastur y los enemigos comprobadas en
los escaneos.

- Motor: los investigadores no son derrotados por el horror en este escenario
  (`noHorrorDefeat`); nuevos `enemyWouldBeDefeated`, `cannotPlay`, `tokenOverride`,
  `testOptions` en traiciones (comprometer desde la mano), disparador `afterEnemyDamaged`
  y `KillInvestigators` para un investigador. La vista previa de una ficha respeta su
  fallo automático.
- Preparación: Introducción 1 o 2 y Lugar inicial según el camino abierto; versión del acto
  2 por las Dudas y Convicciones (empate con 6 o más: elige el jefe); una copia al azar de
  cada Lugar repetido (las demás, aparte); todos los Lugares revelados con sus pistas;
  perdición en el plan 1a por las marcas de Persiguiendo al Extranjero; horror directo
  igual a la mitad de la cordura; El hombre de la máscara pálida sale del mazo de su
  portador y queda aparte.
- Actos: En la Perdida Carcosa (2 pistas por investigador; el hombre aparece en el palacio),
  En busca del Extranjero v. I (el jefe gasta 3 acciones; La máscara pálida, −2 de cordura,
  y Hastur, El Rey harapiento), v. II (derrotado con su capacidad; Hastur, El Rey de
  Amarillo, junto al acto, sin Lugar: ataca a todos al empezar la fase de Enemigos y se
  agota con Voluntad) y v. III (derrotado con daño; Hastur, Señor de Carcosa) y El Rey
  harapiento ([fast] sin pistas en tu Lugar: retirar las pistas de los investigadores y
  dar la vuelta al Lugar; Hastur derrotado → R1, R2 o R3 según su versión).
- Historias del reverso de los 13 Lugares: daño a Hastur (agotarlo y desenfrentarlo), curar
  horror, daño a otro enemigo, pruebas, La caída (negarse o empujarla) y El final de Hastur
  ("conocéis el secreto"); las que sustituyen el Lugar ponen otra copia apartada con todo lo
  que había en él y sus pistas, y las demás ya no se pueden volver a girar. El palacio
  exige 5 de daño por investigador sobre Hastur.
- Planes: Hastur no puede ser derrotado (salvo en el plan 3 con el secreto); los planes 1 y
  2 avanzan con 3 y 5 de daño por investigador sobre él; +1/+2 de combate; reverso 1 (salir
  del trance con una prueba, 2 horror o desmayarse con 1 perdición), reverso 2 (Bestia de
  Aldebarán y descartes al mazo) y reverso 3 (R4 o R5 según las Convicciones y Dudas).
- Fichas, Lugares (sin Aliados, sin cartas Rápido, última pista con daño o acción), Hastur
  (presa, horror por encima de la cordura con 1 daño más, fichas convertidas en fallo
  automático sin cordura restante), Criatura salida de Demhe, Ser alado, Maldición funesta,
  Reino de la locura, El último acto y las tres Posesiones (Oculta; eliminado y muerto con
  más del doble de horror que de cordura).
- Resoluciones: R1–R3 con su trauma, 5 de experiencia adicional, investigadores poseídos y
  victoria; R4 y R5: todos enloquecen y se pierde la campaña. Epílogo tras la victoria (solo
  para los poseídos, si los hay). La web indica la campaña perdida en lugar de
  "Próximamente".

Diferencias y límites: El Rey de Amarillo se muestra como carta junto al acto con su daño;
su ataque se resuelve como horror que puede asignarse a los apoyos. "Cualquier
investigador" de La locura se enrosca se elige entre todos. El registro nombra las Historias
en inglés.

Validación: 71 pruebas nuevas (preparación, cordura, actos y versiones de Hastur, planes,
Historias, fichas, Lugares, encuentros, resoluciones, final de la campaña y 40 partidas
aleatorias). Presentación: catálogo EN/ES (285 cartas de Carcosa), 110 escaneos EN/ES con
miniaturas ([evidencia](evidencias/imagenes-dim-carcosa.json)), Hastur junto al acto
revisado en la mesa y 8 narraciones nuevas con Carmelo (introducciones, resoluciones y
epílogo).

## Dependencias posteriores

- Oculto: secreto por investigador en online, cuenta para tamaño de mano,
  restricciones de descarte, capacidades desde la mano y descarte de Encuentros
  (guía p. 2). Revisar el soporte existente antes de añadir mecanismos nuevos.
- Ramas de campaña: reutilizar los contadores de Dudas y Convicciones ya
  implementados; un empate no equivale a tener más de ninguno. Solo afectan a
  instrucciones explícitas.
- Cartas de Historia: lectura y efectos al resolverlas, sin confundirlas con
  apoyos ganados ni con el tipo genérico de entradas narrativas.
- Interludios I y II, cambios de bolsa que retiran símbolos, ramas según el
  registro, pérdida de investigadores y epílogo. La lista lineal de escenarios
  actual no implementa esas transiciones por sí sola.

## Continuación

Último bloque de implementación: `c524324`, publicado en `main`, con reglas
parciales y seis narraciones de Carmelo. PDF revisado publicado en `98c2f26`.
Analytics se publicó por separado en `7216a87`.

Validación completa de `c524324`: **3103 pruebas superadas, 19 omitidas, ningún
fallo; 450 archivos superados y 2 omitidos**. Comando:
`pnpm test --maxWorkers=4 --testTimeout=30000`, con acceso a los servidores TCP/SMTP
locales simulados. Formato, lint, tipos y compilación también se comprobaron sobre
la copia seleccionada para publicar; la compilación avisó de una fuente externa
y del tamaño de algunos chunks. Estos resultados no acreditan jugabilidad de
Carcosa: sus escenarios aún no tienen `build`.

Tercera entrega (Se cierra el telón jugable): publicada en `cf4511d`; las 108
imágenes se incorporaron al inventario general en `fda541f`. Revisión posterior sobre
`fda541f`: datos de Lugares, actos, planes, Emisario y 03059 contrastados con los
escaneos; formato, lint y tipos correctos; 3209 pruebas superadas y 19 omitidas. El
fallo de Eureka ya no aparece. Los 2 fallos de `apps/server/src/deploy.test.mjs` solo
se deben a ejecutar con Node 22 (el despliegue exige Node 24).

Narración de los escenarios II y III: 24 MP3 en español con Carmelo, la misma voz, modelo y
ajustes que el escenario I (introducciones, resoluciones, Interludio I, interrogatorios,
Realidades repulsivas e Información de Sebastien; unos 22 min 42 s). Tramas MPEG
verificadas sin errores; evidencia en [carcosa-narracion.json](evidencias/carcosa-narracion.json).
No equivale a una revisión auditiva humana. La generación necesita una cuenta de pago: las
gratuitas no pueden usar voces de biblioteca por la API.

Narración del escenario IV e Interludio II: 13 MP3 más con la misma voz y ajustes
(43 en total en la evidencia; unos 15 min 11 s más). Tramas MPEG verificadas sin errores.

Narración del escenario V: 20 MP3 más con la misma voz y ajustes (63 en total), incluidas
las resoluciones. Tramas MPEG verificadas sin errores.

Narración del escenario VI: 6 MP3 más con la misma voz y ajustes (69 en total).

Narración del escenario VII: 5 MP3 más con la misma voz y ajustes (74 en total).

Narración del escenario VIII y el epílogo: 8 MP3 más con la misma voz y ajustes (82 en
total).

Lola Hayes: prólogo y salida en los Bastidores conectados
([documento 86](86-investigadora-lola-hayes.md)).

## Revisión de la campaña completa

- Notas del registro: cada nota que lee un escenario la escribe otro anterior, también
  las de claves compuestas. La ficha −3 del Juramento llega por su preparación.
- `full-campaign.test.ts` encadena los ocho escenarios con decisiones al azar para
  equipos de 1 a 4 investigadores (Lola incluida) y resuelve traspasos y sustitutos.
- Carencia corregida: con todos enloquecidos (Juramento R1, por ejemplo) la campaña se
  daba por perdida. Según el reglamento ("Campaign Play") y la guía (p. 15), cada jugador
  cuyo investigador muere o enloquece elige otro aún no usado en la campaña, con un mazo
  de nivel 0 y sin experiencia; solo se pierde si no queda ninguno. `replaceInvestigator`
  lo añade al final de la lista (los que se fueron siguen visibles), y el Broche o el
  Hombre de la máscara pálida que seguían con quien se fue pasan al sustituto. La vista
  de campaña ofrece el mazo inicial o un mazo propio válido; los guardados admiten más
  de cuatro investigadores en la lista con un máximo de cuatro activos.
- En línea: entre escenarios, el jugador cuyo investigador se fue elige uno aún sin usar
  (acción `replace`, con mazo inicial o propio); el servidor valida el mazo con la misma
  regla y pasa a asociar a ese jugador con el nuevo investigador. La vista indica si
  falta algún sustituto o si la campaña se ha perdido.
- Auditoría contra la guía ES (pp. 3–33), escenario por escenario: preparación (conjuntos,
  cartas apartadas, Lugares, inicio, fichas añadidas por dificultad), introducciones y
  sueños, resoluciones (notas, Dudas y Convicciones, marcas del Extranjero, trauma,
  experiencia, fichas del caos) e interludios coinciden. Cada resolución tiene un camino
  en partida cubierto por pruebas; el juego al azar acaba casi siempre en la resolución
  de derrota de cada escenario, que es lo esperable. Todas las traiciones tienen
  comportamiento y todas las cartas, texto en EN/ES.
- Corregido en la auditoría: Surgen estrellas negras R3 y Penumbrosa Carcosa R4/R5
  ("los investigadores pierden la campaña") anotan `campaignLost`; con esa nota la
  campaña se da por perdida y no se ofrecen sustitutos.
- Sin aplicación digital: la regla de Hacer caso de la advertencia de Daniel (1 horror al
  pronunciar «Hastur» en voz alta) depende de la conversación en la mesa.

Para retomar en otro ordenador, actualizar `main`: el PDF ya está versionado en
`docs-proyecto/reglas/`. La aplicación de referencia sigue siendo una copia externa
que hay que tener disponible y cuya ruta puede cambiar. Los MP3 ya publicados no
requieren ElevenLabs para reproducirse; la clave de `.env` solo se necesita si se
generan narraciones nuevas y no debe subirse al repositorio.
