# 84 · El camino a Carcosa

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

## Siguiente entrega: completar Se cierra el telón

Implementar el escenario completo antes de habilitarlo:

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

Validación de la primera entrega: 46 pruebas dirigidas correctas (base de Carcosa,
campaña existente, paridad i18n, presentación SSR EN/ES y referencias de los
escenarios jugables). Comprobación de tipos de todo el proyecto, ESLint y
Prettier de las rutas editadas, `git diff --check` y compilación de la web
correctos. La compilación avisa de una fuente externa que se resolverá en
ejecución y del tamaño de algunos chunks. No se ha ejecutado la suite completa.

Segunda entrega: 122 pruebas dirigidas correctas, incluidas 30 de reglas de
Carcosa, regresión de campaña y motor, presentación EN/ES y huellas de los seis
audios. Tras corregir la clave del siguiente escenario se repiten sus 32 pruebas
afectadas (reglas e i18n), correctas. Tipos de todo el proyecto y compilación web
final correctos (con los avisos de fuente y tamaño indicados arriba). ESLint y
Prettier de las rutas editadas y `git diff --check`, correctos. No se ha ejecutado
la suite completa. Se mantienen los cambios concurrentes ajenos.

Base: `aebcf84` en `main`. El pull de la primera entrega fue correcto; en la segunda
lo impiden los cambios locales propios y concurrentes, que no se han apartado.
Publicación de Carcosa y de la sesión de Analytics autorizada el 23/10/2026;
se separan los cambios de los otros trabajos activos. Próximo grupo:
actos, planes, Lugares y encuentros del escenario I según la lista anterior.
Resto de escenarios e interludios pendientes; la campaña aún no es jugable.
