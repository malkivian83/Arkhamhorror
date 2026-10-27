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

Siguiente bloque: Actividad extracurricular (páginas 4–5). No debe habilitarse la
campaña hasta resolver la preparación, encuentros, actos, planes y resoluciones
del primer escenario. También queda pendiente habilitar La casa siempre gana
para que ambas elecciones iniciales sean jugables.

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
