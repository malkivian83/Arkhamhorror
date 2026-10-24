# 84 · El camino a Carcosa

## Estado actual

**1 de 8 escenarios jugables: I · Se cierra el telón** (tercera entrega,
publicada en `cf4511d`). La campaña ya se puede empezar en local y en línea; al terminar
el escenario I no hay un segundo escenario disponible. Los escenarios II–VIII siguen
sin `build`.

| Escenario                      | Implementado                                                                            | Pendiente para jugar                                                                                                                    |
| ------------------------------ | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| I · Se cierra el telón         | Completo: preparación, actos, planes, Lugares, 7 conjuntos, resoluciones y narración    | Lola Hayes (no jugable aún)                                                                                                             |
| II · El último Rey             | Nombre y posición en la campaña                                                         | Implementación íntegra y transición al interludio I                                                                                     |
| III · Ecos del pasado          | Nombre y posición en la campaña                                                         | Implementación íntegra y lectura del registro previo                                                                                    |
| IV · El juramento inconfesable | Nombre y posición en la campaña                                                         | Implementación íntegra y transición al interludio II                                                                                    |
| V · El Fantasma de la Verdad   | Nombre y posición en la campaña                                                         | Implementación íntegra y variantes según el registro                                                                                    |
| VI · La máscara pálida         | Nombre y posición en la campaña                                                         | Implementación íntegra                                                                                                                  |
| VII · Surgen estrellas negras  | Nombre y posición en la campaña                                                         | Implementación íntegra y sus ramas                                                                                                      |
| VIII · Penumbrosa Carcosa      | Nombre y posición en la campaña                                                         | Implementación íntegra, final de campaña y epílogo                                                                                      |

Los interludios, el epílogo y las narraciones de los escenarios II–VIII tampoco
están implementados. Las dependencias compartidas se enumeran más abajo; no se
ha auditado todavía cada carta de esos siete escenarios.

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

Siguiente bloque: escenario II (El último Rey) e interludio I, reutilizando Oculto,
los contadores y los conjuntos de encuentro ya implementados. Pendiente del I:
Lola Hayes. La elección del nuevo portador de 03059 ya es manual.

Para retomar en otro ordenador, actualizar `main`: el PDF ya está versionado en
`docs-proyecto/reglas/`. La aplicación de referencia sigue siendo una copia externa
que hay que tener disponible y cuya ruta puede cambiar. Los MP3 ya publicados no
requieren ElevenLabs para reproducirse; la clave de `.env` solo se necesita si se
generan narraciones nuevas y no debe subirse al repositorio.
