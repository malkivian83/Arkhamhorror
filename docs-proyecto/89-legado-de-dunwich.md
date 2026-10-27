# 89 · El legado de Dunwich

## Narración

La persona usuaria ha elegido la voz **Nico** para los audios de Dunwich,
tanto de historia como de cartas. Primer audio generado: prólogo completo de la
página 3 de la guía revisada, sin las instrucciones de elección. Disponible en
español desde la selección de campaña; no se ofrece como audio inglés.

Voz: `iXa2i9eYvgmNMRQRCwqO` (Nico - Calm, Rhythmic and Alluring), identificada en
[el catálogo público](https://json2video.com/ai-voices/elevenlabs/voices/iXa2i9eYvgmNMRQRCwqO/).
La clave permite generar directamente aunque carece de `voices_read`; ese permiso
no bloquea la generación cuando se conoce el identificador.

Generador reanudable: `node scripts/generate-dunwich-audio.mjs --generate --key-stdin`.
Sin `--generate`, muestra el inventario local. Transcripción, ajustes y huellas:
`evidencias/dunwich-nico-narracion.json`. La clave no se guarda en archivos.

## Primer bloque: estructura de campaña

Se registra la campaña original con sus ocho escenarios y las bolsas del caos
de las cuatro dificultades de la guía revisada, página 2. Incluyen dos calaveras
y un sectario; no se reutiliza la bolsa de Carcosa. Los nombres y el estado de
desarrollo se presentan en español e inglés.

Ningún escenario está habilitado para jugar. Las pruebas verifican el registro,
las bolsas y el bloqueo de los ocho escenarios para grupos de uno a cuatro
investigadores.

Validación: nueve pruebas dirigidas de campaña y dos de coherencia EN/ES
superadas; comprobación de tipos de `@lcg/cards` superada. Sin validación de
navegador, conforme a las instrucciones del repositorio.

## Continuación

Segundo bloque: prólogo resumido EN/ES y elección del orden de los dos primeros
escenarios (guía, página 3). La elección se guarda en `log.values.openingScenario`;
los guardados anteriores conservan el orden del índice. El orden elegido se usa
al avanzar y al mostrar el progreso, sin modificar la definición compartida.
La portada usa provisionalmente la ilustración general disponible.

Validación del segundo bloque: 24 pruebas de campaña, ocho de la tienda de
partida, dos de coherencia de idiomas y dos de renderizado EN/ES superadas.
Tipos de los paquetes y la web, lint de los archivos afectados y formato correctos.
La revisión visual queda pendiente para la persona usuaria.

## Tercer bloque: primeros encuentros compartidos

Implementados Hechicería y Chotacabras: cuatro códigos de encuentro (02083,
02084, 02090 y 02091), once copias en sus conjuntos y ninguna carta de jugador.
Incluye descartes por margen de fallo, límite de Al otro lado del velo por
investigador con Oleada también en duplicados, daño inmediato al agotarse el
mazo, penalizadores acumulables de los Chotacabras y dificultad según el daño
para Ávidos de muerte.

El motor emite `deckEmptied` cuando sale la última carta por robo, descarte o
búsqueda, antes de resolver el siguiente mensaje. Descartar cartas hasta agotar
el mazo no lo baraja ni inflige por sí solo horror; robar posteriormente con el
mazo vacío conserva la regla habitual de barajar y recibir horror.

Catálogo oficial EN/ES, ocho imágenes y ocho miniaturas nuevas, con inventarios
y huellas conservados. Se inspeccionaron dos escaneos representativos sin abrir
el navegador. Importadores: `scripts/import-dunwich-cards.mjs` y
`scripts/import-dunwich-images.mjs`; miniaturas con el generador existente y
`--codes 02083 02084 02090 02091`.

Validación dirigida: 27 pruebas de Dunwich, 77 del motor, cinco de presentación
y audio, dos de idiomas y 47 regresiones de robo y búsqueda superadas; tipos,
lint y formato correctos. El tercer bloque permanece local, separado del bloque
inicial publicado.

## Cuarto bloque: El Más Allá

Se añaden Empujado al otro lado, Terror del otro lado y Barrera arcana
(02100–02102), dos copias de cada carta. Total local revisado: siete códigos
de encuentro y diecisiete copias entre Hechicería, Chotacabras y El Más Allá.

- Empujado devuelve el apoyo elegido al mazo de su propietario original,
  descarta las tres primeras cartas del investigador que robó la traición y
  comprueba si salió una copia para infligir horror. No permite elegir apoyos
  de historia, permanentes ni apoyos que no puedan abandonar el juego. Sin un
  apoyo elegible se descartan igualmente las cartas: la conjunción no dice
  «después» ni condiciona ese descarte a barajar un apoyo.
- Terror obliga a elegir tipos distintos y descartar esos tipos de las manos
  de todos los investigadores, incluidas debilidades alcanzadas por el descarte
  obligatorio. Cuenta las copias robadas por fase, incluso si se cancela su
  revelación, y conserva ese contador al guardar.
- Barrera exige la prueba al entrar o salir, con opción de cancelar el movimiento
  o descartar cinco cartas tras fallar. Cada copia exige su propio coste. Cancelar
  conserva la carta y la acción gastada; un movimiento posterior vuelve a probar.

Las reglas se contrastan con el texto oficial EN/ES y las entradas de propiedad,
efectos, costes y cancelación del reglamento. Se conserva la interpretación del
texto de [Empujado al otro lado](https://arkhamdb.com/card/02100), aunque el código
externo de referencia no ejecuta el descarte cuando no puede elegirse un apoyo.

El motor incorpora costes de movimiento por traición, efectos al robar anteriores
a la posible cancelación de la revelación, devolución de un apoyo al mazo de su
propietario y descarte de mazo con comprobación condicional. Se añaden catálogo
EN/ES, seis escaneos y seis miniaturas a los inventarios existentes.

Validación: catorce pruebas nuevas de El Más Allá, 27 anteriores de Dunwich,
77 del motor, 186 regresiones de escenarios con movimientos y descartes,
cuatro de presentación EN/ES y dos de idiomas superadas; tipos correctos.
Todo el cuarto bloque permanece local y la campaña sigue sin habilitarse.

## Resumen de continuación

Último commit publicado: `58da154` (estructura, elección inicial y prólogo con
Nico), con formato, lint, tipos, pruebas y compilación verificados antes de subir.
Bloques locales: Hechicería, Chotacabras y El Más Allá revisados y probados.

Siguiente grupo: Esclavos de Bishop y Agentes de Yog-Sothoth;
Antiguos males y Puertas cerradas ya tienen comportamiento reutilizable.
Después, preparación, Lugares, actos, planes y resoluciones de Actividad
extracurricular (guía, páginas 4–5). No debe habilitarse hasta completar ese
comportamiento. También queda pendiente La casa siempre gana para que ambas
elecciones iniciales sean jugables. No hay bloqueos externos pendientes.

Después quedan La casa siempre gana, El destino de Armitage, los seis escenarios
restantes, Los supervivientes y el epílogo, con su registro y consecuencias.
No se incluyen contenidos de Regreso a El legado de Dunwich.

Subida autorizada por la persona usuaria para este bloque y continuación.

Validación global del bloque inicial: formato, lint y tipos correctos. La suite
completa ejecutó 4329 pruebas (19 omitidas). Se corrigió la comprobación de
Carcosa para permitir otras campañas pendientes en el selector; pasó su repetición.
Las comprobaciones de audios anteriores y autorización del panel agotaron cinco
segundos bajo carga y pasaron al repetirlas con un límite de treinta segundos,
sin cambiar su código. Lint mantiene un aviso previo en `SiteHeader.vue`.
