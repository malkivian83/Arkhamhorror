# 24 · Importación masiva de cartas de jugador

> Estado posterior: [piloto completo de 24 cartas](27-cierre-piloto-cartas-jugador.md).
> Este documento conserva el informe de su etapa inicial.

20/10/2026. Propuesta de trabajo basada en el estado local de Arkham Online,
la copia de estudio `D:\referencia\ArkhamHorror-main` y las fuentes de ArkhamDB
enlazadas en este documento. **Este documento describe el diseño completo;
el estado de implementación se indica en la actualización siguiente.**

**Avance del 20/10/2026:** ya se ha ejecutado el primer inventario y se ha creado
el importador para análisis y lotes de datos. Ver el
[resultado y los comandos disponibles](25-primer-inventario-cartas-jugador.md).
El [primer lote jugable](26-primer-lote-jugable-cartas-jugador.md) incorpora siete
cartas revisadas. El resto de este documento conserva el diseño completo y los
trabajos pendientes para ampliar el catálogo.

## 1. Recomendación

Adoptar un proceso mixto: **ArkhamDB como fuente de catálogo y traducciones;
el programa de referencia como guía de comportamientos y casos difíciles;
nuestro motor como implementación propia, probada por lotes.**

Conviene importar masivamente el inventario para conocer la cobertura y preparar
el trabajo, pero habilitar para jugar únicamente las cartas verificadas. Tener
nombre, imagen y coste no demuestra que funcionen sus efectos, sus restricciones
de construcción o sus mejoras con experiencia.

El primer resultado debe ser una ejecución de análisis que no altere las cartas
existentes: inventario por expansión, diferencias, problemas de conversión y
dependencias del motor. Después, un piloto que reproduzca los 104 registros de la
caja básica de 2026 y un lote pequeño de una expansión adicional.

## 2. Qué tenemos realmente

### 2.1. Proyecto propio

| Pieza existente                                                                                         | Estado observado                                                                                       | Consecuencia para la importación                                                                                   |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| [`scripts/import-core-2026.mjs`](../scripts/import-core-2026.mjs)                                       | Consulta el paquete `core_2026`, filtra `position < 105` y escribe un JSON                             | Es un punto de partida, pero el filtro solo sirve para esa caja; no generalizarlo                                  |
| [`data/core-2026.json`](../packages/cards/src/data/core-2026.json)                                      | 104 registros: 5 investigadores, 51 apoyos, 24 eventos, 14 habilidades, 8 traiciones y 2 enemigos      | El inventario de jugador incluye debilidades de tipos distintos; no basta con elegir apoyos, eventos y habilidades |
| [`core-2026/player-cards.ts`](../packages/cards/src/core-2026/player-cards.ts)                          | Registra datos y completa a mano tamaño, clases permitidas y exclusivas de cinco investigadores        | Hay que sustituir las suposiciones de caja y posición por relaciones explícitas                                    |
| [`PlayerCardDef`](../packages/engine/src/types.ts)                                                      | Modelo mecánico con una clase, coste numérico, ranuras, iconos y construcción sencilla por clase/nivel | No expresa fielmente todo el catálogo; los casos no representables deben quedar pendientes                         |
| [`content.ts`](../packages/engine/src/content.ts)                                                       | Registros separados para datos y comportamientos; `registerPlayerCards` sobrescribe el mismo código    | La importación debe detectar colisiones antes del registro; no confiar en que este las rechace                     |
| [`decks.ts`](../packages/cards/src/decks.ts)                                                            | Importa mazos de ArkhamDB, valida construcción y devuelve códigos desconocidos por separado            | Importar un mazo no importa las definiciones ni implementa sus efectos                                             |
| [`campaign.ts`](../packages/cards/src/campaign.ts)                                                      | `isImplemented` comprueba si hay comportamiento registrado                                             | La presencia de un manejador no certifica cobertura completa de una carta                                          |
| [`localized.ts`](../apps/web/src/game/localized.ts)                                                     | Respaldo local y consultas ES a dos paquetes de ArkhamDB, con caché de 24 horas                        | La localización actual no cubre automáticamente nuevas expansiones                                                 |
| [`cards.ts`](../apps/web/src/game/cards.ts) y [`sync-card-images.mjs`](../scripts/sync-card-images.mjs) | Imágenes mediante manifiesto local; sincronización previa a publicar                                   | Ampliar el inventario de imágenes por separado del de datos y reglas                                               |

Estos recuentos describen el JSON de la caja básica, **no todo el contenido
registrado por las campañas**. Se obtuvieron leyendo los archivos locales, sin
ejecutar una importación.

Otros acoplamientos que hay que revisar antes de ampliar el catálogo:

- `investigatorCards`, el conjunto de exclusivas y la selección de debilidad
  aleatoria parten de `playerCards`, ligado a la caja básica.
- `cardPool` combina esa lista y el registro global, pero un dato nuevo puede
  llegar a ofrecerse aunque su efecto no esté listo. `validateDeck` informa de
  cartas sin implementación como aviso; no las añade a `problems`.
- El límite de copias se agrupa actualmente por nombre. Traducir nombres o
  mezclar ediciones exige una identidad de título estable.
- La detección del importador de `Fast`, usos y signo arcano usa expresiones
  regulares. No interpreta condiciones, ventanas de reacción ni efectos
  especiales; un signo arcano no numérico no debe convertirse en un `0` válido.
- Hay dos modelos diferentes: `CardDefinition` en `packages/cards/src/index.ts`
  y `PlayerCardDef` en el motor. La ruta jugable actual usa el segundo. El
  adaptador masivo debe definir expresamente cuál genera.
- La presentación de imágenes y miniaturas acepta actualmente cinco dígitos y
  un reverso `b`. Los códigos extendidos necesitan adaptar esa ruta.

### 2.2. Programa de referencia

La copia local permite estudiar tres capas complementarias, sin trasladar su
código al repositorio:

| Capa                             | Rutas relativas a la referencia                                                                                         | Qué estudiar                                                                   |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Datos auxiliares                 | `backend/arkham-api/data/cards.json`                                                                                    | Forma de los datos y diferencias de inventario                                 |
| Definiciones mecánicas           | `backend/arkham-api/library/Arkham/{Asset,Event,Skill,Investigator,Treachery,Enemy}/Cards.hs` y subdirectorios `Cards/` | Códigos, versiones, requisitos y agrupación por producto                       |
| Comportamiento                   | `Arkham/Asset/Assets/`, `Arkham/Event/Events/`, etc., dentro de la misma biblioteca                                     | Costes, elecciones, reacciones, modificadores y excepciones                    |
| Identidad e importación de mazos | `Arkham/Card/CardDef.hs` y `Arkham/Decklist.hs`                                                                         | Ediciones alternativas, erratas, tabúes, personalizaciones y mazos adicionales |

El `cards.json` inspeccionado contiene **815 registros**: 353 apoyos, 214 eventos,
70 habilidades, 44 investigadores, 50 traiciones, 20 enemigos, 62 historias y 2
lugares. No es una lista limpia de cartas de jugador ni el inventario completo
del programa. Contar módulos tampoco equivale a contar cartas: puede haber
definiciones compartidas, reimpresiones y contenido casero.

Caso concreto: la definición de Machete agrupa `01020`, `01520` y `12020`, pero su
módulo de comportamiento distingue la edición de 2026 y contempla una elección
de agotamiento. **Compartir familia de carta no autoriza a compartir un efecto
sin comprobar la edición.** Esta observación procede de
`Arkham/Asset/Cards/NightOfTheZealot.hs` y `Arkham/Asset/Assets/Machete.hs`.

Por ello la referencia sirve para elaborar contratos de comportamiento y una
matriz de cobertura. Su JSON no debe convertirse en nuestra fuente maestra ni
sus módulos en una traducción automática de Haskell a TypeScript.

## 3. Opciones y elección

| Opción                                                         | Ventaja                                                                 | Límite principal                                                                                             | Uso propuesto                                             |
| -------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| A. Generalizar la API pública de ArkhamDB                      | Ya usamos ese formato; permite consultar catálogo o paquetes            | Depende del servicio y requiere guardar una instantánea reproducible                                         | **Fuente inicial recomendada para el piloto**             |
| B. Leer los JSON de datos de ArkhamDB en una revisión Git fija | Cambios revisables y entrada reproducible sin volver a consultar la API | Hay que reconstruir relaciones y combinar traducciones; no asumir que tiene exactamente el formato de la API | Adaptador alternativo para mantenimiento y análisis       |
| C. Extraer el inventario desde la referencia                   | Permite comparar cobertura y localizar comportamientos                  | Datos parciales, estructura propia y condiciones de reutilización del proyecto                               | Auditoría de diferencias y estudio funcional              |
| D. Introducción manual o CSV                                   | Útil para excepciones y prioridades                                     | Lenta y propensa a divergencias a escala                                                                     | Correcciones propias justificadas y matriz de trabajo     |
| E. Extraer páginas HTML de ArkhamDB                            | Facilita revisar una carta a mano                                       | Más frágil que sus fuentes estructuradas y añade peticiones innecesarias                                     | Consulta visual; descartar como importador principal      |
| F. Generar todas las reglas desde el texto con IA              | Puede ayudar a redactar borradores y detectar familias                  | No garantiza temporización, interacciones ni fidelidad; requiere revisión y pruebas                          | Asistencia a la implementación, sin activación automática |

Se recomienda **A + C + D** al principio: entrada estructurada de ArkhamDB,
contraste funcional con la referencia y excepciones propias documentadas.
Diseñar una entrada común para añadir B si necesitamos fijar datos por commit.
No hace falta introducir una base de datos de cartas en MySQL para este trabajo:
los datos mecánicos pueden seguir versionados en archivos del paquete `cards`.

El repositorio de datos al que remite el proyecto de ArkhamDB es
[`Kamalisk/arkhamdb-json-data`](https://github.com/Kamalisk/arkhamdb-json-data),
con paquetes, esquemas y traducciones. Mantener separados el adaptador de API y
el de archivos. [Instalación de ArkhamDB](https://github.com/Kamalisk/arkhamdb),
[traducciones ES](https://github.com/Kamalisk/arkhamdb-json-data/tree/master/translations/es).

## 4. Fuentes y alcance de la consulta

La [API pública](https://arkhamdb.com/api/) no necesita credenciales de aplicación
para el catálogo; la documentación diferencia ese acceso del de OAuth. Pide
respetar la caché HTTP. No se necesita acceder a cuentas ni mazos privados para
preparar este importador.

Rutas recogidas en la [documentación de la API](https://arkhamdb.com/api/doc):

| Ruta                                                     | Finalidad                                                 |
| -------------------------------------------------------- | --------------------------------------------------------- |
| `https://arkhamdb.com/api/public/packs/`                 | Identificar paquetes                                      |
| `https://arkhamdb.com/api/public/cards/`                 | Catálogo; por defecto devuelve cartas de jugador          |
| `https://arkhamdb.com/api/public/cards/?encounter=1`     | Ampliar la auditoría a encuentros y posibles dependencias |
| `https://arkhamdb.com/api/public/cards/{pack_code}.json` | Procesar y repetir un paquete concreto                    |
| `https://arkhamdb.com/api/public/card/{code}`            | Comprobar una excepción                                   |

El dominio español sirve datos localizados. La
[respuesta de `01001`](https://es.arkhamdb.com/api/public/card/01001)
permite comprobar `text` en español junto a `real_text` en inglés, además de
opciones de construcción y requisitos estructurados. Esto **no acredita una
traducción española completa** del catálogo. Hay que medirla por campo y carta.

Alcance de la verificación de este informe: lectura web de la documentación,
esquema, repositorios citados y ejemplo español; inspección local del proyecto y
la referencia. Los intentos de consulta directa desde Node fallaron con
`fetch failed`. No se ha descargado el catálogo completo ni verificado su
recuento vigente, sus cabeceras reales o el funcionamiento de todos los endpoints
en el entorno de ejecución. Esa comprobación pertenece al primer hito.

### Alcance funcional propuesto

Incluir en el inventario investigadores, apoyos, eventos, habilidades,
debilidades básicas y exclusivas; registrar también vínculos con cartas enlazadas,
recompensas y reemplazos. Separar:

- Cartas elegibles normalmente al construir un mazo.
- Exclusivas y debilidades exigidas por un investigador.
- Cartas que solo se incorporan por campaña, vínculo o efecto.
- Versiones alternativas, paralelas y productos con reglas diferentes.

Dejar el contenido casero fuera del primer lote salvo elección expresa posterior.
La expansión del catálogo no implica importar masivamente encuentros, campañas
ni escenarios; sus dependencias se recogerán en el inventario y se programarán por separado.

No filtrar por nombre, idioma, prefijo numérico o posición. La inclusión debe
resultar de metadatos, relaciones y una lista explícita de productos aceptados.
Una debilidad enemigo no es un encuentro normal por el mero hecho de ser enemigo.

## 5. Contrato de datos y conversiones

Conservar una instantánea de entrada y generar un modelo propio intermedio. Solo
un adaptador validado debe producir `PlayerCardDef` para el motor. Si falta un
concepto en este último, se conserva en el inventario y se bloquea su activación;
no se elimina ni se convierte en una regla aproximada.

| Información de origen             | Regla propuesta                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Código y paquete                  | Código como cadena íntegra, con ceros y sufijos; guardar producto y posición sin derivarlos del código       |
| Nombre y traducción               | Identidad y nombre canónico separados de presentación EN/ES; nunca usar la traducción como clave de reglas   |
| Clase                             | Conservar todas las facciones; no reducir una carta multiclase a la primera                                  |
| Tipo y subtipo                    | Separar tipo físico, debilidad, recompensa, exclusiva y disponibilidad para construcción                     |
| Coste y valores especiales        | Distinguir número, ausencia, guion y valor simbólico antes de convertir al motor                             |
| Iconos, rasgos y ranuras          | Usar identificadores canónicos; preservar multiplicidad y denunciar ranuras o iconos no soportados           |
| Requisitos de investigador        | Mantener alternativas, cantidades y condiciones; no suponer que las exclusivas son las posiciones siguientes |
| Relaciones y caras                | Distinguir reimpresión, alternativa y reverso; conservar el código original del mazo                         |
| Límite de copias y palabras clave | Preservar el dato; exigir implementación para aplicar sus efectos                                            |

El [esquema de cartas de ArkhamDB](https://raw.githubusercontent.com/Kamalisk/arkhamdb-json-data/master/schema/card_schema.json)
sirve para validar campos y relaciones de la entrada de archivos. El adaptador
de API debe tener su propio contrato de respuesta; no asumir equivalencia total.

El [README de datos](https://raw.githubusercontent.com/Kamalisk/arkhamdb-json-data/master/README.md)
documenta valores numéricos especiales: `null` para guion, `-2` para X, `-3` para
asterisco y `-4` para interrogación. Deben decodificarse antes de cualquier
cálculo. También describe etiquetas que ayudan con construcción especial; no
sustituyen un intérprete de reglas de mazo.

### Identidad: título, edición y reglas

Propuesta de cuatro referencias diferentes:

- `printingCode`: código exacto recibido, conservado en mazos y guardados.
- `titleId`: agrupación de título para límites de copias, independiente del idioma.
- `rulesId`: versión mecánica verificada; puede variar dentro del mismo título.
- `rulesRevision` y, cuando se implemente, `tabooId`: revisión de reglas y opción
  de tabú utilizada por la partida.

Los nombres son orientativos y aún no existen. La relación entre ediciones debe
ser explícita, revisable y sin ciclos. Conservar un código desconocido como
pendiente; no reemplazarlo por otra edición basándose en el título.

Para aplicar correcciones propias, usar un archivo separado con código, campo,
valor anterior esperado, corrección, motivo, fuente y prueba. Si la fuente cambia
el valor anterior, detener esa corrección para revisarla. Regenerar no debe
sobrescribir código de comportamiento ni correcciones manuales.

### Reglas que requieren ampliación del motor

Priorizar según los lotes reales, sin intentar soportar todo antes del piloto:

- Construcción por rasgos, usos o etiquetas, cupos, elecciones, prohibiciones,
  cartas multiclase y requisitos alternativos de exclusivas.
- Costes variables, costes adicionales, restricciones al jugar y múltiples usos.
- Permanente, Excepcional, Miríada, Vinculada y personalización, con sus efectos
  en preparación, copias, zonas y experiencia.
- Investigadores paralelos, reemplazos y mazos adicionales.
- Tabúes y erratas como políticas versionadas, sin reescribir la carta impresa.

Por ejemplo, importar el dato de Permanente no basta: actualmente `isPermanent`
consulta el comportamiento registrado. Los efectos sin acciones en mesa también
necesitan validación de construcción o preparación, aunque no requieran un
manejador complejo durante la ronda.

## 6. Proceso reproducible de importación

Los pasos siguientes describen herramientas que hay que construir. **No son
comandos disponibles actualmente.**

1. **Fijar el lote.** Idiomas EN/ES, paquetes elegidos, política de ediciones,
   fecha de consulta y versiones de esquema e importador. Guardar un identificador
   de ejecución y una revisión o huella de la referencia de estudio.
2. **Obtener entradas.** Una descarga global para el inventario o consultas por
   paquete para el piloto, evitando peticiones por carta. Registrar URL completa,
   idioma, fecha, estado HTTP, cabeceras de caché disponibles y SHA-256 del cuerpo;
   usar commit si la fuente es Git. Respetar `max-age` y `Last-Modified`; usar ETag
   si el servidor lo proporciona. Reutilizar la instantánea en respuestas 304.
3. **Validar y clasificar.** JSON válido, código único, tipos y relaciones
   consistentes. Conservar lo desconocido en cuarentena con un motivo. Medir
   registros originales, incluidos, excluidos y pendientes sin perder ninguno.
4. **Normalizar.** Unir localizaciones por código y campo; mantener metadatos
   mecánicos canónicos. Aplicar únicamente correcciones explícitas. Separar
   textos, imágenes y datos del motor.
5. **Contrastar.** Comparar con el catálogo propio y el inventario de referencia:
   presentes en ambos, solo en una fuente, variantes y diferencias mecánicas.
   La referencia orienta la revisión, pero no gana automáticamente un conflicto.
6. **Simular.** Informe de altas, cambios, bajas propuestas, conflictos y bloqueos.
   No borrar códigos ausentes ni modificar archivos publicados. Un fallo de red
   o un catálogo vacío nunca significa que deban eliminarse todas las cartas.
7. **Generar en una carpeta temporal.** Salidas ordenadas por código, sin fechas
   variables en los archivos deterministas; las fechas van en el manifiesto de
   ejecución. Misma entrada, mismo resultado. Reanudar descargas por huella y
   lotes terminados; los fallos no marcan el conjunto como completado.
8. **Verificar y promover el lote.** Revisar diferencias, validar datos y correr
   pruebas de las cartas habilitadas. Solo entonces reemplazar conjuntamente el
   catálogo y su manifiesto. Un error debe conservar el lote anterior íntegro.
9. **Publicar una versión coherente.** Catálogo, capacidades, traducciones,
   imágenes autorizadas y motor deben corresponder a la misma versión. Antes de
   cualquier push, ejecutar la CI indicada en `AGENTS.md`; los commits y el push
   solo se harán cuando la persona usuaria los pida.

Usar tiempos de espera, reintentos limitados con espera creciente y respeto de
`Retry-After` cuando exista. Una concurrencia inicial baja, por ejemplo dos
peticiones, es una decisión nuestra y no un límite publicado de ArkhamDB.

### Archivos propuestos

| Ubicación orientativa                 | Contenido                                                          | Tratamiento                                                                  |
| ------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Caché externa al repositorio          | Instantáneas de API o revisión de datos                            | No servir al navegador ni incorporar automáticamente al control de versiones |
| `packages/cards/src/data/<pack>.json` | Datos normalizados admitidos por el modelo                         | Generados y revisables; definir el alcance permitido según las convenciones  |
| `packages/cards/src/catalog/`         | Identidades, relaciones y capacidades por código                   | Nuevos archivos propios; sin lógica copiada                                  |
| `packages/cards/src/<pack>/`          | Comportamiento propio y pruebas                                    | Editados a mano; nunca sobrescritos por el generador                         |
| Recursos EN/ES de presentación        | Nombre localizado, resumen propio y estado de traducción           | Ruta definitiva a decidir al integrar la presentación                        |
| Manifiesto de ejecución               | Procedencia, huellas, conteos, esquema y resultado de cada lote    | Sin credenciales ni cuerpos completos de respuestas                          |
| Matriz de cobertura                   | Código, producto, estado, reglas pendientes, pruebas y referencias | Fuente de trabajo para priorizar                                             |

No ejecutar `import-core-2026.mjs` ni `sync-card-images.mjs` como si ya fueran este
proceso: actualmente escriben sus destinos y no ofrecen la simulación propuesta.

## 7. Catálogo visible y cartas habilitadas

Separar estado de datos y estado de capacidades; una carta puede tener datos
correctos y faltar su regla de construcción. Propuesta de estados de trabajo:

| Estado                     | Qué acredita                                                           | Disponibilidad propuesta                                |
| -------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------- |
| Inventariada               | Se conoce el código y su procedencia                                   | Informe de cobertura                                    |
| Datos validados            | Conversión completa sin pérdidas mecánicas conocidas                   | Consulta de catálogo, indicando las limitaciones        |
| Implementación parcial     | Algunas capacidades tienen código y pruebas                            | Desarrollo, sin habilitación normal para jugar          |
| Verificada para el alcance | Construcción, preparación y efectos cubiertos; dependencias soportadas | Constructor y comienzo de partida dentro de ese alcance |

Guardar capacidades separadas: construcción, preparación, juego, mejoras y
presentación EN/ES. La disponibilidad es la conjunción de las capacidades
necesarias para el uso solicitado. Una carta solo de construcción puede estar
verificada sin reacciones durante la ronda.

Esta política supone un **cambio pendiente** respecto al aviso actual de
`unimplemented`. Aplicarla tanto al constructor como a compra con experiencia,
importación de mazos y comienzo de campaña. Un mazo importado debe conservar sus
códigos y cantidades, informar de desconocidas o pendientes y bloquear el inicio
cuando corresponda; no descartar cartas silenciosamente ni guardar una lista
recortada como si fuera equivalente a la original.

Versionar el catálogo en los guardados. Una actualización no debe cambiar las
reglas de una partida iniciada sin una migración explícita. El retorno al lote
anterior necesita conservar también las definiciones que esa partida utiliza;
si una partida requiere una versión ausente, explicar la incompatibilidad.

## 8. Imágenes, idiomas y material de referencia

Mantener las imágenes en el flujo local existente. La sincronización futura debe
recibir el inventario del lote, registrar idioma, cara, origen y huella, respetar
las excepciones de orientación y regenerar las miniaturas del
[documento 20](20-miniaturas-mano.md). No descargar toda la colección al arrancar
una partida ni asumir que la imagen siempre es `{code}.jpg`: la respuesta
inspeccionada de ArkhamDB también expone rutas PNG.

Medir por separado nombre, texto/resumen, reverso e imagen en cada idioma. El
respaldo ES → EN debe quedar indicado; la falta de traducción no debe alterar
rasgos, identidad o reglas. La falta de imagen puede usar la carta renderizada
si su información es suficiente; no impide por sí sola verificar sus mecánicas.

Aplicar las [convenciones](06-convenciones.md) y el
[documento 02](02-aspectos-legales.md) al seleccionar material versionable. La
[página de la API](https://arkhamdb.com/api/) atribuye los textos a FFG; la
disponibilidad técnica no resuelve su redistribución. Esta propuesta no cambia
la política del repositorio ni incorpora código, textos oficiales o imágenes.
Usar resúmenes propios y recursos con permiso cuando corresponda; el inventario
de descarga debe distinguir consulta interna y material publicable. La existencia
de scripts históricos o archivos locales no amplía por sí misma esa política.

## 9. Plan de ejecución y aceptación

### Fase 0 · Inventario y análisis sin escritura

Confirmar acceso a API EN/ES desde el entorno real. Fijar paquetes y obtener una
instantánea externa; generar la matriz por código y el contraste con la
referencia. Calcular cuántas cartas tienen datos completos, traducción, imagen,
comportamiento local y requisitos no soportados, sin confundir esos indicadores.

**Aceptación:** todos los registros tienen destino o motivo de exclusión;
relaciones rotas y diferencias aparecen en el informe; ningún archivo de cartas,
mazo o guardado cambia.

### Fase 1 · Importador general y piloto de datos

Crear contratos de entrada, normalizador, correcciones, simulación y generación
determinista. Reproducir la caja básica actual y explicar cada diferencia; no
tomar la salida del importador antiguo como verdad si contiene una omisión.

**Aceptación:** segundo pase sin cambios de datos; duplicados y valores no
representables rechazados o aislados; una interrupción conserva el lote anterior.

### Fase 2 · Un lote jugable pequeño

Seleccionar aproximadamente 20–30 códigos según dependencias compartidas, no por
orden de colección. Se propone empezar por cartas de nivel 0 compatibles con los
cinco investigadores actuales y efectos que ya tengan primitivas fiables.
Incluir en el piloto de conversión casos difíciles, aunque queden bloqueados.

Estudiar cada contrato con reglas y referencia, implementar desde cero y probar.
Añadir después un investigador con su conjunto completo de exclusivas y
debilidades, cuando estén soportadas sus reglas de construcción y preparación.

**Aceptación:** mazo construido e importado sin pérdida de códigos; las cartas
pendientes impiden el inicio; cartas verificadas funcionan en preparación,
ronda y mejora; interfaz EN/ES revisada.

### Fase 3 · Ampliación por familias y paquetes

Reutilizar primitivas y pruebas para combate, investigación, evasión, robo,
recursos y modificadores; abordar después reacciones y mecánicas que requieran
ampliaciones. Publicar lotes con dependencias cerradas, incluyendo exclusivas,
debilidades, vinculadas y versiones de mejora cuando correspondan.

**Aceptación:** cada carta activada enlaza contrato y prueba; matriz actualizada
por producto; regresión de la caja básica y campañas existentes en verde.

### Fase 4 · Mantenimiento

Comparar nuevas instantáneas mediante informes de cambios. Una errata, tabú,
reimpresión o traducción nueva inicia revisión del alcance afectado; no modifica
automáticamente partidas en curso. Conservar la última versión válida y su
manifiesto para recuperar una importación fallida.

El coste principal estará en las capacidades nuevas del motor y sus
interacciones. No estimar el trabajo multiplicando el número de cartas por un
tiempo fijo, ni prometer una fecha para todo el catálogo antes del inventario.

### Pruebas mínimas del futuro importador

- Duplicado de código, exclusivas alternativas, debilidad enemigo y recompensa
  no seleccionable como carta ordinaria.
- Costes `0`, ausente, `null`, X y otros símbolos; multiclase, multiplicidad de
  ranuras y concepto no soportado que debe permanecer bloqueado.
- Falta de traducción por campo, cara enlazada y código con sufijo; edición con
  el mismo título y comportamiento diferente, como Machete.
- Red caída, respuesta vacía o inválida, caché 304, reintento y reanudación;
  simulación sin escritura, regeneración idéntica y promoción sin lote parcial.
- Importación de un mazo con códigos desconocidos o no jugables sin pérdida de
  cantidades; exclusivas y tamaño correctos; partida existente tras actualizar
  o volver al catálogo anterior.

Cada regla de carta tendrá pruebas del efecto principal, sus restricciones y
casos negativos relevantes, citando las reglas como establecen las convenciones.
Antes de subir implementación: `pnpm format:check`, `pnpm lint`,
`pnpm typecheck`, `pnpm test` y `pnpm build` si se toca web o servidor.

## 10. Decisiones propuestas y pendientes

Quedan propuestos el enfoque mixto, la separación entre inventario y cartas
jugables, los archivos versionados para los datos mecánicos y la activación por
lotes probados. No se cambia todavía ninguna regla de disponibilidad del producto.

El siguiente trabajo concreto es **la fase 0**, con un informe que permita elegir
el primer paquete adicional. Antes de activar ese lote habrá que fijar:

1. Productos incluidos y prioridad de investigadores frente a cartas generales.
2. Política inicial de ediciones y tabúes; se propone empezar sin tabú opcional
   y sin convertir ediciones automáticamente.
3. Material EN/ES e imágenes que se puede incorporar según las convenciones.
4. Capacidades nuevas necesarias y presupuesto de pruebas del primer lote.

No es necesario resolver todo el catálogo para empezar el inventario. La matriz
debe hacer visibles estas decisiones y evitar que una descarga masiva se
confunda con la incorporación masiva de cartas plenamente jugables.
